#![no_std]
use soroban_sdk::{
    contract, contractclient, contractimpl, contracttype, symbol_short, Address, BytesN, Env, Vec, Val,
};

#[contractclient(name = "TreatmentEscrowClient")]
pub trait TreatmentEscrowInterface {
    fn initialize(
        env: Env,
        patient: Address,
        hospital: Address,
        insurer: Option<Address>,
        arbiter: Address,
        amount: i128,
        token: Address,
    );
    fn get_status(env: Env) -> u32;
}

#[contracttype]
pub enum FactoryKey {
    Admin,
    WasmHash,
    Escrows,
}

#[contract]
pub struct EscrowFactory;

#[contractimpl]
impl EscrowFactory {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&FactoryKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&FactoryKey::Admin, &admin);
        env.storage().instance().set(&FactoryKey::Escrows, &Vec::<Address>::new(&env));
    }

    pub fn set_escrow_wasm(env: Env, wasm_hash: BytesN<32>) {
        let admin: Address = env.storage().instance().get(&FactoryKey::Admin).expect("not initialized");
        admin.require_auth();

        env.storage().instance().set(&FactoryKey::WasmHash, &wasm_hash);
    }

    pub fn create_escrow(
        env: Env,
        patient: Address,
        hospital: Address,
        insurer: Option<Address>,
        arbiter: Address,
        amount: i128,
        token: Address,
        salt: BytesN<32>,
    ) -> Address {
        // Patient auth is required to deploy
        patient.require_auth();

        let wasm_hash: BytesN<32> = env
            .storage()
            .instance()
            .get(&FactoryKey::WasmHash)
            .expect("escrow WASM hash not set");

        // Deploy TreatmentEscrow contract using deploy_v2 with empty constructor args
        let escrow_address = env
            .deployer()
            .with_current_contract(salt)
            .deploy_v2(wasm_hash, Vec::<Val>::new(&env));

        // Initialize TreatmentEscrow
        let client = TreatmentEscrowClient::new(&env, &escrow_address);
        client.initialize(&patient, &hospital, &insurer, &arbiter, &amount, &token);

        // Save deployed contract in factory list
        let mut escrows: Vec<Address> = env
            .storage()
            .instance()
            .get(&FactoryKey::Escrows)
            .unwrap_or_else(|| Vec::new(&env));
        escrows.push_back(escrow_address.clone());
        env.storage().instance().set(&FactoryKey::Escrows, &escrows);

        // Emit creation event
        env.events().publish(
            (symbol_short!("created"), patient, hospital),
            escrow_address.clone(),
        );

        escrow_address
    }

    pub fn get_escrows(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&FactoryKey::Escrows)
            .unwrap_or_else(|| Vec::new(&env))
    }

    pub fn get_escrow_status(env: Env, escrow_address: Address) -> u32 {
        let client = TreatmentEscrowClient::new(&env, &escrow_address);
        client.get_status()
    }
}

#[cfg(test)]
mod test;


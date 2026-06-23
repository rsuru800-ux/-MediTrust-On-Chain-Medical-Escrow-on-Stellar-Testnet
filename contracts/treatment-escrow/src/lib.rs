#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol,
};

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum EscrowStatus {
    Pending = 0,
    Funded = 1,
    Released = 2,
    Refunded = 3,
    Disputed = 4,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EscrowDetails {
    pub patient: Address,
    pub hospital: Address,
    pub insurer: Option<Address>,
    pub arbiter: Address,
    pub amount: i128,
    pub released_total: i128,
    pub status: EscrowStatus,
    pub token: Address,
}

#[contracttype]
pub enum DataKey {
    Initialized,
    Patient,
    Hospital,
    Insurer,
    Arbiter,
    Amount,
    ReleasedTotal,
    Status,
    Token,
}

#[contract]
pub struct TreatmentEscrow;

#[contractimpl]
impl TreatmentEscrow {
    pub fn initialize(
        env: Env,
        patient: Address,
        hospital: Address,
        insurer: Option<Address>,
        arbiter: Address,
        amount: i128,
        token: Address,
    ) {
        if env.storage().instance().has(&DataKey::Initialized) {
            panic!("already initialized");
        }
        if amount <= 0 {
            panic!("amount must be positive");
        }

        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::Patient, &patient);
        env.storage().instance().set(&DataKey::Hospital, &hospital);
        env.storage().instance().set(&DataKey::Insurer, &insurer);
        env.storage().instance().set(&DataKey::Arbiter, &arbiter);
        env.storage().instance().set(&DataKey::Amount, &amount);
        env.storage().instance().set(&DataKey::ReleasedTotal, &0i128);
        env.storage().instance().set(&DataKey::Status, &EscrowStatus::Pending);
        env.storage().instance().set(&DataKey::Token, &token);

        // Emit creation event
        env.events().publish(
            (symbol_short!("created"), patient.clone(), hospital.clone()),
            amount,
        );
    }

    pub fn deposit(env: Env) {
        let status: EscrowStatus = env.storage().instance().get(&DataKey::Status).unwrap();
        if status != EscrowStatus::Pending {
            panic!("must be pending to deposit");
        }

        let patient: Address = env.storage().instance().get(&DataKey::Patient).unwrap();
        patient.require_auth();

        let amount: i128 = env.storage().instance().get(&DataKey::Amount).unwrap();
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();

        // Transfer funds from patient to contract
        let client = soroban_sdk::token::Client::new(&env, &token);
        client.transfer(&patient, &env.current_contract_address(), &amount);

        env.storage().instance().set(&DataKey::Status, &EscrowStatus::Funded);

        // Emit deposited event
        env.events().publish(
            (symbol_short!("deposited"), patient),
            amount,
        );
    }

    pub fn partial_release(env: Env, release_amount: i128) {
        let status: EscrowStatus = env.storage().instance().get(&DataKey::Status).unwrap();
        if status != EscrowStatus::Funded {
            panic!("must be funded to release");
        }

        let hospital: Address = env.storage().instance().get(&DataKey::Hospital).unwrap();
        hospital.require_auth();

        if release_amount <= 0 {
            panic!("release amount must be positive");
        }

        let amount: i128 = env.storage().instance().get(&DataKey::Amount).unwrap();
        let mut released_total: i128 = env.storage().instance().get(&DataKey::ReleasedTotal).unwrap();

        if released_total + release_amount > amount {
            panic!("release amount exceeds escrow balance");
        }

        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();

        // Transfer partial funds to hospital
        let client = soroban_sdk::token::Client::new(&env, &token);
        client.transfer(&env.current_contract_address(), &hospital, &release_amount);

        released_total += release_amount;
        env.storage().instance().set(&DataKey::ReleasedTotal, &released_total);

        if released_total == amount {
            env.storage().instance().set(&DataKey::Status, &EscrowStatus::Released);
        }

        // Emit released event
        env.events().publish(
            (symbol_short!("released"), hospital, Symbol::new(&env, "partial")),
            release_amount,
        );
    }

    pub fn release(env: Env) {
        let status: EscrowStatus = env.storage().instance().get(&DataKey::Status).unwrap();
        if status != EscrowStatus::Funded {
            panic!("must be funded to release");
        }

        let hospital: Address = env.storage().instance().get(&DataKey::Hospital).unwrap();
        hospital.require_auth();

        let amount: i128 = env.storage().instance().get(&DataKey::Amount).unwrap();
        let released_total: i128 = env.storage().instance().get(&DataKey::ReleasedTotal).unwrap();
        let remaining = amount - released_total;

        if remaining > 0 {
            let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
            let client = soroban_sdk::token::Client::new(&env, &token);
            client.transfer(&env.current_contract_address(), &hospital, &remaining);
        }

        env.storage().instance().set(&DataKey::ReleasedTotal, &amount);
        env.storage().instance().set(&DataKey::Status, &EscrowStatus::Released);

        // Emit released event
        env.events().publish(
            (symbol_short!("released"), hospital, Symbol::new(&env, "full")),
            remaining,
        );
    }

    pub fn refund(env: Env) {
        let status: EscrowStatus = env.storage().instance().get(&DataKey::Status).unwrap();
        if status != EscrowStatus::Funded {
            panic!("must be funded to refund");
        }

        let patient: Address = env.storage().instance().get(&DataKey::Patient).unwrap();
        patient.require_auth();

        let amount: i128 = env.storage().instance().get(&DataKey::Amount).unwrap();
        let released_total: i128 = env.storage().instance().get(&DataKey::ReleasedTotal).unwrap();
        let remaining = amount - released_total;

        if remaining > 0 {
            let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
            let client = soroban_sdk::token::Client::new(&env, &token);
            client.transfer(&env.current_contract_address(), &patient, &remaining);
        }

        env.storage().instance().set(&DataKey::Status, &EscrowStatus::Refunded);

        // Emit refunded event
        env.events().publish(
            (symbol_short!("refunded"), patient),
            remaining,
        );
    }

    pub fn dispute(env: Env, caller: Address) {
        let status: EscrowStatus = env.storage().instance().get(&DataKey::Status).unwrap();
        if status != EscrowStatus::Funded {
            panic!("must be funded to dispute");
        }

        caller.require_auth();

        let patient: Address = env.storage().instance().get(&DataKey::Patient).unwrap();
        let hospital: Address = env.storage().instance().get(&DataKey::Hospital).unwrap();

        if caller != patient && caller != hospital {
            panic!("only patient or hospital can dispute");
        }

        env.storage().instance().set(&DataKey::Status, &EscrowStatus::Disputed);

        // Emit disputed event
        env.events().publish(
            (symbol_short!("disputed"), caller),
            status as u32,
        );
    }

    pub fn resolve_dispute(env: Env, release_to_hospital: bool) {
        let status: EscrowStatus = env.storage().instance().get(&DataKey::Status).unwrap();
        if status != EscrowStatus::Disputed {
            panic!("must be disputed to resolve");
        }

        let arbiter: Address = env.storage().instance().get(&DataKey::Arbiter).unwrap();
        arbiter.require_auth();

        let amount: i128 = env.storage().instance().get(&DataKey::Amount).unwrap();
        let released_total: i128 = env.storage().instance().get(&DataKey::ReleasedTotal).unwrap();
        let remaining = amount - released_total;

        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let client = soroban_sdk::token::Client::new(&env, &token);

        if remaining > 0 {
            if release_to_hospital {
                let hospital: Address = env.storage().instance().get(&DataKey::Hospital).unwrap();
                client.transfer(&env.current_contract_address(), &hospital, &remaining);
                env.storage().instance().set(&DataKey::Status, &EscrowStatus::Released);
            } else {
                let patient: Address = env.storage().instance().get(&DataKey::Patient).unwrap();
                client.transfer(&env.current_contract_address(), &patient, &remaining);
                env.storage().instance().set(&DataKey::Status, &EscrowStatus::Refunded);
            }
        }

        env.storage().instance().set(&DataKey::ReleasedTotal, &amount);

        // Emit resolved event
        env.events().publish(
            (symbol_short!("resolved"), arbiter),
            release_to_hospital,
        );
    }

    pub fn get_status(env: Env) -> EscrowStatus {
        env.storage().instance().get(&DataKey::Status).unwrap_or(EscrowStatus::Pending)
    }

    pub fn get_details(env: Env) -> EscrowDetails {
        let patient = env.storage().instance().get(&DataKey::Patient).unwrap();
        let hospital = env.storage().instance().get(&DataKey::Hospital).unwrap();
        let insurer = env.storage().instance().get(&DataKey::Insurer).unwrap_or(Option::None);
        let arbiter = env.storage().instance().get(&DataKey::Arbiter).unwrap();
        let amount = env.storage().instance().get(&DataKey::Amount).unwrap();
        let released_total = env.storage().instance().get(&DataKey::ReleasedTotal).unwrap();
        let status = env.storage().instance().get(&DataKey::Status).unwrap();
        let token = env.storage().instance().get(&DataKey::Token).unwrap();

        EscrowDetails {
            patient,
            hospital,
            insurer,
            arbiter,
            amount,
            released_total,
            status,
            token,
        }
    }
}

#[cfg(test)]
mod test;


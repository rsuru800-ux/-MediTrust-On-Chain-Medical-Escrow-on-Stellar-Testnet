#![cfg(test)]
use super::*;
use soroban_sdk::{
    testutils::{Address as _, BytesN as _},
    Address, BytesN, Env,
};

mod treatment_escrow {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/treatment_escrow.wasm"
    );
}

#[test]
fn test_factory_deployment_and_cross_contract_call() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let patient = Address::generate(&env);
    let hospital = Address::generate(&env);
    let insurer = Option::Some(Address::generate(&env));
    let arbiter = Address::generate(&env);
    let amount = 1000i128;

    let token_admin = Address::generate(&env);
    let token_address = env.register_stellar_asset_contract(token_admin);

    // Register factory
    let factory_id = env.register_contract(None, EscrowFactory);
    let factory_client = EscrowFactoryClient::new(&env, &factory_id);

    factory_client.initialize(&admin);

    // Install TreatmentEscrow WASM
    let wasm_hash = env.deployer().upload_contract_wasm(treatment_escrow::WASM);

    factory_client.set_escrow_wasm(&wasm_hash);

    let salt = BytesN::from_array(&env, &[1; 32]);
    let escrow_address = factory_client.create_escrow(
        &patient,
        &hospital,
        &insurer,
        &arbiter,
        &amount,
        &token_address,
        &salt,
    );

    // Verify escrows list
    let escrows = factory_client.get_escrows();
    assert_eq!(escrows.len(), 1);
    assert_eq!(escrows.get(0).unwrap(), escrow_address);

    // Verify status cross-contract (0 = Pending)
    let status = factory_client.get_escrow_status(&escrow_address);
    assert_eq!(status, 0); // 0 corresponds to EscrowStatus::Pending
}

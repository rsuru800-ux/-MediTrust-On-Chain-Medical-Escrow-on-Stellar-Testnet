#![cfg(test)]
use super::*;
use soroban_sdk::{
    testutils::{Address as _, Events},
    token, Address, Env, IntoVal,
};

fn setup_test_env(env: &Env) -> (Address, Address, Option<Address>, Address, Address, Address, TreatmentEscrowClient<'static>) {
    let patient = Address::generate(env);
    let hospital = Address::generate(env);
    let insurer = Option::Some(Address::generate(env));
    let arbiter = Address::generate(env);

    let token_admin = Address::generate(env);
    let token_address = env.register_stellar_asset_contract(token_admin);
    
    let contract_id = env.register_contract(None, TreatmentEscrow);
    let client = TreatmentEscrowClient::new(env, &contract_id);

    (patient, hospital, insurer, arbiter, token_address, contract_id, client)
}

#[test]
fn test_escrow_full_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let (patient, hospital, insurer, arbiter, token_address, contract_id, client) = setup_test_env(&env);
    let amount = 1000i128;

    let token_client = token::StellarAssetClient::new(&env, &token_address);
    token_client.mint(&patient, &amount);

    client.initialize(&patient, &hospital, &insurer, &arbiter, &amount, &token_address);

    assert_eq!(client.get_status(), EscrowStatus::Pending);

    // Deposit
    client.deposit();
    assert_eq!(client.get_status(), EscrowStatus::Funded);
    assert_eq!(token::Client::new(&env, &token_address).balance(&contract_id), amount);

    // Partial Release
    client.partial_release(&300i128);
    assert_eq!(client.get_status(), EscrowStatus::Funded);
    assert_eq!(token::Client::new(&env, &token_address).balance(&hospital), 300i128);

    // Full Release
    client.release();
    assert_eq!(client.get_status(), EscrowStatus::Released);
    assert_eq!(token::Client::new(&env, &token_address).balance(&hospital), amount);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_cannot_initialize_twice() {
    let env = Env::default();
    env.mock_all_auths();

    let (patient, hospital, insurer, arbiter, token_address, _, client) = setup_test_env(&env);
    let amount = 1000i128;

    client.initialize(&patient, &hospital, &insurer, &arbiter, &amount, &token_address);
    client.initialize(&patient, &hospital, &insurer, &arbiter, &amount, &token_address);
}

#[test]
#[should_panic(expected = "must be pending to deposit")]
fn test_cannot_deposit_twice() {
    let env = Env::default();
    env.mock_all_auths();

    let (patient, hospital, insurer, arbiter, token_address, _, client) = setup_test_env(&env);
    let amount = 1000i128;

    let token_client = token::StellarAssetClient::new(&env, &token_address);
    token_client.mint(&patient, &(amount * 2));

    client.initialize(&patient, &hospital, &insurer, &arbiter, &amount, &token_address);
    client.deposit();
    client.deposit(); // Should panic
}

#[test]
fn test_refund_path() {
    let env = Env::default();
    env.mock_all_auths();

    let (patient, hospital, insurer, arbiter, token_address, contract_id, client) = setup_test_env(&env);
    let amount = 1000i128;

    let token_client = token::StellarAssetClient::new(&env, &token_address);
    token_client.mint(&patient, &amount);

    client.initialize(&patient, &hospital, &insurer, &arbiter, &amount, &token_address);
    client.deposit();

    // Partial release first
    client.partial_release(&200i128);
    assert_eq!(token::Client::new(&env, &token_address).balance(&hospital), 200i128);

    // Patient refunds remaining
    client.refund();
    assert_eq!(client.get_status(), EscrowStatus::Refunded);
    assert_eq!(token::Client::new(&env, &token_address).balance(&patient), 800i128);
    assert_eq!(token::Client::new(&env, &token_address).balance(&contract_id), 0);
}

#[test]
fn test_dispute_resolved_to_hospital() {
    let env = Env::default();
    env.mock_all_auths();

    let (patient, hospital, insurer, arbiter, token_address, contract_id, client) = setup_test_env(&env);
    let amount = 1000i128;

    let token_client = token::StellarAssetClient::new(&env, &token_address);
    token_client.mint(&patient, &amount);

    client.initialize(&patient, &hospital, &insurer, &arbiter, &amount, &token_address);
    client.deposit();

    // Dispute
    client.dispute(&patient);
    assert_eq!(client.get_status(), EscrowStatus::Disputed);

    // Arbiter resolves to Hospital
    client.resolve_dispute(&true);
    assert_eq!(client.get_status(), EscrowStatus::Released);
    assert_eq!(token::Client::new(&env, &token_address).balance(&hospital), 1000i128);
    assert_eq!(token::Client::new(&env, &token_address).balance(&contract_id), 0);
}

#[test]
fn test_dispute_resolved_to_patient() {
    let env = Env::default();
    env.mock_all_auths();

    let (patient, hospital, insurer, arbiter, token_address, contract_id, client) = setup_test_env(&env);
    let amount = 1000i128;

    let token_client = token::StellarAssetClient::new(&env, &token_address);
    token_client.mint(&patient, &amount);

    client.initialize(&patient, &hospital, &insurer, &arbiter, &amount, &token_address);
    client.deposit();

    // Dispute
    client.dispute(&hospital);
    assert_eq!(client.get_status(), EscrowStatus::Disputed);

    // Arbiter resolves to Patient
    client.resolve_dispute(&false);
    assert_eq!(client.get_status(), EscrowStatus::Refunded);
    assert_eq!(token::Client::new(&env, &token_address).balance(&patient), 1000i128);
    assert_eq!(token::Client::new(&env, &token_address).balance(&contract_id), 0);
}

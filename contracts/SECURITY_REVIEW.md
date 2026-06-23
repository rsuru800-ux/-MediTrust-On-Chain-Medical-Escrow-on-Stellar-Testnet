# MediTrust Smart Contract Security Review

This document summarizes the security checks and design patterns implemented in the MediTrust smart contracts.

## 1. Authentication and Authorization (`require_auth`)

- **Patient Authorization:**
  - `TreatmentEscrow::deposit` explicitly enforces `patient.require_auth()`, ensuring that only the designated patient can authorize a deposit from their balance.
  - `TreatmentEscrow::refund` explicitly enforces `patient.require_auth()`, preventing malicious entities from claiming refunds on behalf of the patient.
- **Hospital Authorization:**
  - `TreatmentEscrow::partial_release` and `TreatmentEscrow::release` enforce `hospital.require_auth()`, verifying that only the hospital can trigger payment payouts to its address.
- **Arbiter Authorization:**
  - `TreatmentEscrow::resolve_dispute` enforces `arbiter.require_auth()`, preventing patients or hospitals from settling disputes themselves without mediation.
- **Dispute Authorization:**
  - `TreatmentEscrow::dispute` verifies that the initiator is either the patient or the hospital by checking `has_auth` and asserting `require_auth` for the caller. Non-parties cannot lock the contract.

## 2. State & Lifecycle Safeguards

- **Double Initializations:** Both `TreatmentEscrow` and `EscrowFactory` check if they are already initialized (`has(&DataKey::Initialized)` / `has(&FactoryKey::Admin)`) and panic on duplicate calls.
- **Strict Transitions:**
  - `deposit` requires status to be `Pending`.
  - `partial_release`, `release`, `refund`, and `dispute` require status to be `Funded`.
  - `resolve_dispute` requires status to be `Disputed`.
- **Escrow Freeze:** Once disputed, the status transitions to `Disputed`, and no normal release, partial release, or refund can occur until resolved by the arbiter.

## 3. Boundary & Math Integrity

- **Positive Value Checks:** `initialize` requires `amount > 0`. `partial_release` requires `release_amount > 0`.
- **Underflow/Overflow Check:**
  - `partial_release` verifies that `released_total + release_amount <= amount` to ensure the contract cannot release more than the funded deposit.
  - Remaining funds calculation `remaining = amount - released_total` cannot underflow because of the assertion above.
  - Instance storage is updated only after successful token transfers.

## 4. Reentrancy Protection
Soroban's runtime executes execution environments in separate call stacks, and the state updates are committed after execution completes. In MediTrust, state updates (`released_total`, `status`) are done before finalizing/completing the function, mitigating standard CEI (Checks-Effects-Interactions) reentrancy vulnerabilities.

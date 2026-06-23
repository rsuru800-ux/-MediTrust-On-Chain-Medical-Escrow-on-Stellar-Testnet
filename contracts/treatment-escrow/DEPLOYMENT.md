# MediTrust Smart Contracts Deployment Details

This document records the official deployment details for the MediTrust smart contracts on the Stellar Testnet.

## Deployment Environment
- **Network:** Stellar Testnet
- **Horizon URL:** `https://horizon-testnet.stellar.org`
- **Soroban RPC URL:** `https://soroban-testnet.stellar.org`
- **Network Passphrase:** `Test SDF Network ; September 2015`
- **Deployer Identity (local):** `deployer`
- **Deployer Address:** `GCYLF54XLAH4DFONTJEDZYLILFLCRJRH3DIP2INGOJR2XFBGEYSJLIQ5`

## Contract Identifiers

### 1. `TreatmentEscrow` WASM
- **WASM Hash:** `94c2aa2046471e6d19f6334ac4c80306f105a3c269f7c50eb59f54093f90514d`
- **Installation Tx:** `1c325b89b1084cfe3ef79afaef1b39a24be15bc03fbce0a59243ef03339ad12e`
- **Explorer Link:** [Stellar Expert Installation Tx](https://stellar.expert/explorer/testnet/tx/1c325b89b1084cfe3ef79afaef1b39a24be15bc03fbce0a59243ef03339ad12e)

### 2. `EscrowFactory` Contract
- **Contract ID:** `CAUCNUPYKUHM5OTSR4KJWYP4CFBWUTO5GKBQJY26UOXBUGEF6CAIIABM`
- **Deployment Tx:** `f4aacb0e0699d3ee1f4dfa94dd6510bb6332eb47f70f428ebfbd44000b59ef0e`
- **Explorer Link:** [Stellar Expert Deployment Tx](https://stellar.expert/explorer/testnet/tx/f4aacb0e0699d3ee1f4dfa94dd6510bb6332eb47f70f428ebfbd44000b59ef0e)

---

## Deployment Commands Run

1. **Fund Deployer Wallet:**
   ```bash
   stellar keys fund deployer --network testnet
   ```

2. **Build Contracts:**
   ```bash
   stellar contract build
   ```

3. **Install/Upload `TreatmentEscrow` WASM:**
   ```bash
   stellar contract install --wasm target/wasm32v1-none/release/treatment_escrow.wasm --network testnet --source-account deployer
   ```
   *Output Hash:* `94c2aa2046471e6d19f6334ac4c80306f105a3c269f7c50eb59f54093f90514d`

4. **Deploy `EscrowFactory` Instance:**
   ```bash
   stellar contract deploy --wasm target/wasm32v1-none/release/escrow_factory.wasm --network testnet --source-account deployer
   ```
   *Output Contract ID:* `CAUCNUPYKUHM5OTSR4KJWYP4CFBWUTO5GKBQJY26UOXBUGEF6CAIIABM`

5. **Initialize `EscrowFactory`:**
   ```bash
   stellar contract invoke --id CAUCNUPYKUHM5OTSR4KJWYP4CFBWUTO5GKBQJY26UOXBUGEF6CAIIABM --network testnet --source-account deployer -- initialize --admin GCYLF54XLAH4DFONTJEDZYLILFLCRJRH3DIP2INGOJR2XFBGEYSJLIQ5
   ```

6. **Register `TreatmentEscrow` WASM in Factory:**
   ```bash
   stellar contract invoke --id CAUCNUPYKUHM5OTSR4KJWYP4CFBWUTO5GKBQJY26UOXBUGEF6CAIIABM --network testnet --source-account deployer -- set_escrow_wasm --wasm_hash 94c2aa2046471e6d19f6334ac4c80306f105a3c269f7c50eb59f54093f90514d
   ```

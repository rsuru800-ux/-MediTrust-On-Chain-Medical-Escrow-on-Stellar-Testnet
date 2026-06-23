# MediTrust User Onboarding Guide

Welcome to MediTrust! This guide will help you set up your Stellar Testnet wallet, fund it using Friendbot, and prepare for escrow transactions as a patient, hospital admin, or arbiter.

---

## 1. Prerequisites: Install a Wallet Extension

MediTrust integrates with the **Stellar Wallets Kit**, which supports multiple wallets. We highly recommend using **Freighter** (developed by the Stellar Development Foundation).

### Installing Freighter
1. Visit the official website: [Freighter Wallet](https://www.freighter.app/).
2. Download and install the browser extension for Chrome, Firefox, Brave, or Edge.
3. Follow the prompts in the extension to create a new wallet.
4. **IMPORTANT**: Securely write down and store your 12-word recovery seed phrase. Anyone with this phrase can access your funds.

---

## 2. Configure Freighter Wallet for Testnet

Since MediTrust is currently running on the Stellar Testnet:
1. Open the Freighter extension in your browser.
2. Click the gear icon (**Settings**) in the bottom right corner.
3. Click on **Preferences**.
4. In the **Network** dropdown, switch from **Public** (Mainnet) to **Testnet**.
5. Save settings. Your wallet addresses will now show balances and transactions for Stellar Testnet.

---

## 3. Fund Your Testnet Account (Friendbot)

Unlike Mainnet, Stellar Testnet provides a free service called **Friendbot** to credit newly created accounts with 10,000 testnet XLM.

### Option A: Automatically inside MediTrust
1. Open the MediTrust application.
2. Click **Connect Wallet** and select Freighter.
3. Once connected, look at your **Balance Card**.
4. If your balance is `0` or the account is inactive, click the **"Fund via Friendbot"** button.
5. Wait a few seconds. The application will request Friendbot to active your account and credit 10,000 XLM.

### Option B: Manually via Stellar Laboratory
1. Copy your public address from Freighter (starts with `G...`).
2. Go to the [Stellar Laboratory Friendbot](https://laboratory.stellar.org/#account-creator?network=testnet).
3. Paste your public address into the **"Public Key"** field.
4. Click **"Get test network lumens"**.
5. You will see a success message, and your wallet balance will show 10,000 XLM.

---

## 4. Role-Specific Guides

### For Patients
- **Connect Wallet**: Click the Connect Wallet button on the top right to start.
- **Browse Escrows**: Go to the Dashboard to see your active medical bill escrows.
- **Deposit Funds**: When a doctor issues a Treatment Escrow, navigate to the escrow panel, check the bill amount, and click **"Deposit Escrow Funds"** to lock the amount on-chain.
- **File a Dispute**: If you feel the treatment was incomplete or did not match the agreed terms, click the **"Raise Dispute"** button before the hospital releases the funds.

### For Hospital Admins
- **Create Escrow**: Go to the Dashboard, fill out the patient's address, arbiter address, insurer address (optional), the bill amount, and click **"Deploy Treatment Escrow"**.
- **Request Payout**: Once the medical treatment is complete, navigate to the escrow panel and select **"Release Payout"** (or request the patient to release) to withdraw the locked XLM.
- **Request Partial Release**: If the treatment is ongoing, negotiate and request a partial payout (e.g., 50% on completion of Phase 1).

### For Arbiters (MediTrust Dispute Resolvers)
- **Review Disputes**: When a patient triggers a dispute, the escrow status changes to `Disputed`.
- **Review Evidence**: Gather details from both the patient and hospital.
- **Resolve Dispute**: Click **"Resolve Dispute"** and execute a payout split (e.g., 70% back to patient, 30% to hospital, or any ratio totalling 100%) to settle the contract on-chain.

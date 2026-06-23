# MediTrust Privacy & Analytics Disclosure

MediTrust is built on principles of decentralized ownership, patient sovereignty, and local-first data privacy. This disclosure explains how data is handled by the MediTrust application.

---

## 1. On-Chain Public Ledger Data

Because MediTrust utilizes the public Stellar Testnet blockchain, certain transaction records are inherently public, immutable, and permanent.

### What is written to the blockchain:
- **Public Keys**: The Stellar public addresses of the Patient, Hospital, Insurer (optional), and Arbiter.
- **Escrow Contracts**: Deployed escrow contract IDs and WASM hashes.
- **Financial Details**: The amount of XLM deposited, released, or refunded.
- **Contract State**: The status transitions of the escrow (e.g., `Pending`, `Funded`, `Released`, `Refunded`, `Disputed`).
- **Timestamps**: Block confirmation times for contract actions.

> [!WARNING]
> Do not store personally identifiable information (PII) such as patient names, medical records, diagnosis codes, or physical addresses in any smart contract fields or transaction memo fields. All data written on-chain can be scanned by any public ledger explorer.

---

## 2. Local-First Client Analytics & Logging

MediTrust implements a lightweight, privacy-preserving local telemetry system for troubleshooting and auditing. 

- **No Remote Servers**: None of your usage statistics, wallet addresses, or error logs are uploaded to any external server or third-party analytical service (such as Google Analytics or Mixpanel).
- **LocalStorage Storage**: Action logs and error reports are kept strictly in your browser's local cache (`localStorage`).
- **Telemetry Event Types**:
  - Wallet connection statuses (success, failure, provider chosen).
  - Transaction submission parameters (contract method called, status, error messages).
  - Feedback widget submissions.
- **Log Expiration**: You can clear all client-side telemetry logs at any time by clearing your browser cache or using the browser DevTools (under `Application` -> `Local Storage`).

---

## 3. Decentralized Credentials

MediTrust does not store your private keys or seed phrases:
- All transactions are signed directly within your chosen wallet browser extension (Freighter, xBull, etc.).
- The extension passes only the signed transaction back to the application to be broadcasted to Stellar Horizon.
- MediTrust never asks for, receives, or has access to your private credentials.

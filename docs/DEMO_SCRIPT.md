# MediTrust 3-5 Minute Demo Script

This script outlines a step-by-step presentation showing the core capabilities of the MediTrust medical bill escrow application on Stellar Testnet.

---

## Preparation (Before starting)
1. Open the browser with the **Freighter** extension installed and set to **Testnet**.
2. Open the MediTrust application in your browser.
3. Have 3 public keys handy:
   - **Patient Address** (your current connected Freighter address).
   - **Hospital Address** (can be another testnet account address).
   - **Arbiter Address** (can be a third testnet account address).

---

## Segment 1: Wallet Connection & Account Onboarding (1 Minute)

1. **Welcome & Context**:
   - *Script*: "Welcome to MediTrust, the first on-chain medical bill escrow system on Stellar. Today, we'll demonstrate how patients, hospitals, and arbiters secure medical payments. I will start by connecting my patient wallet."
2. **Connect Wallet**:
   - Action: Click the **Connect Wallet** button on the top right. Select **Freighter**. Approve the connection request in the Freighter modal.
3. **Show Balance Card & Friendbot**:
   - Action: Point out the glassmorphic **Balance Card**.
   - *Script*: "Once connected, we instantly fetch my XLM balance from Horizon. If this is a fresh account, I can click 'Fund via Friendbot' to claim 10,000 testnet lumens, activating our account instantly."
   - Action: (Optional) Click the **Fund via Friendbot** button and watch the balance refresh.

---

## Segment 2: Escrow Creation & Funding (1 Minute)

1. **Deploy Escrow**:
   - Action: Scroll down to the **Create Escrow** form on the Dashboard.
   - Fill in:
     - **Patient Address**: (Autofilled with your connected wallet address).
     - **Hospital Address**: (Paste Hospital address).
     - **Arbiter Address**: (Paste Arbiter address).
     - **Amount (XLM)**: `100`
     - **Salt**: `12345` (optional random number to ensure unique contract deployment).
   - Click **Deploy Treatment Escrow**.
2. **Sign Contract deployment**:
   - Action: Approve the transaction in the Freighter window. Wait 5-10 seconds for the factory to deploy the clone on-chain.
   - *Script*: "The EscrowFactory has compiled and deployed a new instance of our TreatmentEscrow contract specifically for this treatment. We can view the transaction details using the explorer link."
3. **Deposit Funds**:
   - Action: Click on the newly created Escrow Card to open the **Escrow Panel**.
   - Click the **Deposit Escrow Funds** action button. Approve the signature.
   - *Script*: "Now, as the patient, I deposit the 100 XLM into the treatment escrow. These funds are locked securely in the contract and cannot be accessed until treatment is verified or a dispute is resolved."

---

## Segment 3: Payout Releases & Partial Release (1 Minute)

1. **Demonstrate Partial Release**:
   - Action: Scroll to the **Actions** menu inside the Escrow Panel.
   - Click **Release Partial Payout**. Enter `30` XLM.
   - Click **Confirm** on the safety modal and approve the Freighter transaction.
   - *Script*: "In long-term care plans, we support milestone-based releases. The patient or hospital can trigger a partial payout. We've just released 30 XLM to the hospital, and the balance automatically updates."
2. **Observe Real-time Event Feed**:
   - Action: Scroll to the bottom to the **Live Activity Timeline**.
   - *Script*: "Notice our event subscriber fetched the `Released` event from the Soroban RPC stream instantly, updating our dashboard timeline without a page reload."

---

## Segment 4: Dispute Raising & Resolution (1 Minute)

1. **Trigger Dispute**:
   - Action: Click **Raise Dispute** in the Actions list. Confirm the action in the safety popup and sign.
   - *Script*: "If a disagreement occurs—for example, if the hospital does not complete the treatment—the patient can raise a dispute. The escrow status instantly updates to `Disputed`, locking all remaining funds from simple release."
2. **Arbiter Resolution**:
   - Action: (Log in as Arbiter or trigger the Arbiter resolve method).
   - Click **Resolve Dispute**. Enter the split:
     - **Refund Patient**: `40` XLM
     - **Payout Hospital**: `30` XLM (making up the remaining 70 XLM in escrow).
   - Click **Submit Resolution** and approve transaction.
   - *Script*: "The Arbiter reviews the case, sets a fair split, and resolves the dispute. The remaining funds are disbursed automatically, and the escrow closes with status `Refunded`/`Resolved`."

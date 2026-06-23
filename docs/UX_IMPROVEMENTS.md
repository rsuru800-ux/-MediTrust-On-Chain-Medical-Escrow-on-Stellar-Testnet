# MediTrust UX/UI Friction Improvements

To deliver a premium, production-ready product, we conducted a UX friction audit and implemented several UI enhancements. Below is a detailed breakdown of the friction points identified and the specific solutions implemented.

---

## 1. Input Validation and Real-time Feedback
* **Friction**: Users typing invalid Stellar addresses (e.g., typos, invalid checksums) or negative/excessive amounts faced confusing smart contract VM panics or silent failures after transaction submission.
* **Solution**:
  - Implemented client-side cryptographic format validation (`isValidStellarAddress` checks key starts with `G` or `C`, and length is exactly 56 characters).
  - Implemented boundary validations for payment amounts (value must be greater than `0` and less than the user's current XLM balance minus transaction fees).
  - Validation errors are displayed inline with red warnings below inputs, disabling the primary submission buttons.

---

## 2. Transaction Pending, Success, and Error States
* **Friction**: submitting transactions to Soroban RPC takes between 4 to 8 seconds. If the UI does not show progress, users double-click buttons, refresh the page, or assume the app has frozen.
* **Solution**:
  - Implemented loading overlays and spinner animations for all buttons (`isSubmitting` status).
  - Replaced native alerts with non-blocking toast notifications and explicit success cards.
  - Implemented structured error translation: raw RPC failures are parsed into human-friendly explanations (e.g., "Transaction failed because the account has insufficient XLM for fees", "Freighter connection refused by user").

---

## 3. Irreversible Action Confirmals
* **Friction**: Actions like *Depositing funds*, *Releasing payouts*, and *Raising disputes* lock or distribute funds permanently. Clicking these accidentally would cause irreversible financial issues.
* **Solution**:
  - Integrated custom confirmation modals for all critical escrow actions.
  - The modal displays the specific consequences of the action (e.g., "This will release 100 XLM from escrow to Hospital G... and close the escrow contract. This action cannot be undone.").
  - Requires the user to explicitly click a secondary "Confirm Action" button.

---

## 4. Skeleton States and Page-Load UX
* **Friction**: Waiting for Horizon or Soroban RPC to fetch balances or active escrows creates a jarring layout shift when data finally loads.
* **Solution**:
  - Developed unified `<Skeleton>` loading state cards.
  - While fetching balances and active escrows, placeholder cards with pulse animations are rendered to preserve the screen layout.

---

## 5. Event-Driven Activity Log
* **Friction**: Users had to manually refresh the page to see if an escrow state has changed after their transaction was confirmed.
* **Solution**:
  - Integrated a live Soroban event subscriber using `getEvents`.
  - Subscribes to the contract ID, fetches the logs every few seconds with exponential backoff if the RPC fails, and appends changes to a scrollable Activity Log timeline instantly.

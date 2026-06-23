# MediTrust User Feedback Log

This log is used to capture feedback from patients, hospital administrators, and arbiters during testing. It helps prioritize product refinements, bug fixes, and feature requests.

## Feedback Log Table

| Date | User Role | Feedback Category | Comments | Status | Target Release |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 2026-06-20 | Patient | UI/UX | "The Friendbot funding button is helpful, but I wish it automatically activated when my account is empty." | Completed | `v1.0.0` |
| 2026-06-21 | Hospital Admin | Feature Request | "Would be great if we could see a total summary of all pending vs. released funds across all escrows on the dashboard." | Planned | `v1.1.0` |
| 2026-06-22 | Patient | Error Handling | "When I rejected the transaction in Freighter, the app showed a raw JS error. Can it be more user-friendly?" | Completed | `v1.0.0` |
| 2026-06-22 | Arbiter | UI/UX | "When entering the split for resolving disputes, it would be nice to have a slider that sums up to 100% automatically." | Planned | `v1.2.0` |
| 2026-06-22 | Insurer | Integration | "Need standard webhooks or email alerts when an escrow is funded so we can trigger our internal reimbursement checks." | Investigating | `v2.0.0` |

---

## Feedback Capture Template

To add new feedback entries, use the following structure:

```markdown
### [YYYY-MM-DD] - [User Role] - [Feedback Category]
- **Source**: [e.g., Direct interview, App feedback widget, Github issue]
- **Feedback**: [Detailed explanation of user friction or feature request]
- **Action Plan**: [Technical or design resolution steps]
- **Status**: [Investigating / Planned / In Progress / Completed]
- **Target Version**: [e.g., v1.1.0]
```

---

## Rise In Submission Feedback Log

| User | Date | Feedback Summary | Action Taken |
| :--- | :--- | :--- | :--- |
| `[EXAMPLE — replace with real entries]` Patient (GCYLF...) | 2026-06-22 | "App threw error on invalid public key in treatment escrow creation" | Replaced invalid dummy key with valid Stellar address. |
| Patient | 2026-06-22 | "Confused on whether a transaction is irreversible" | Added confirmation modal step to all irreversible contract actions. |


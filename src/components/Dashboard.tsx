import React, { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';
import { getEscrows, createEscrow, getEscrowStatus } from '../lib/escrowFactory.ts';
import { ESCROW_FACTORY_CONTRACT_ID } from '../config/stellar.ts';
import { isValidAddressOrContract } from '../utils/validation.ts';
import { mapToAppError, AppError } from '../utils/errors.ts';
import { trackEvent, trackError } from '../utils/analytics.ts';
import { EscrowPanel } from './EscrowPanel.tsx';
import { SkeletonCard } from './Skeleton.tsx';

interface DashboardProps {
  senderPublicKey: string;
  signTransaction: (txXdr: string) => Promise<{ signedTxXdr: string }>;
  onBalanceRefresh: () => Promise<void>;
}

interface EscrowSummary {
  address: string;
  status: number | null;
  isLoading: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  senderPublicKey,
  signTransaction,
  onBalanceRefresh,
}) => {
  // Escrow Registry
  const [escrows, setEscrows] = useState<EscrowSummary[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Selected Escrow Panel
  const [selectedEscrow, setSelectedEscrow] = useState<string | null>(null);

  // Form Fields
  const [patient, setPatient] = useState(senderPublicKey);
  const [hospital, setHospital] = useState('');
  const [insurer, setInsurer] = useState('');
  const [arbiter, setArbiter] = useState('GCYLF54XLAH4DFONTJEDZYLILFLCRJRH3DIP2INGOJR2XFBGEYSJLIQ5'); // default to CLI address for easy demo
  const [amount, setAmount] = useState('');

  // Creation Operations
  const [createStatus, setCreateStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [createError, setCreateError] = useState<AppError | null>(null);
  const [newEscrowAddress, setNewEscrowAddress] = useState<string | null>(null);

  const loadEscrowList = async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const addresses = await getEscrows(ESCROW_FACTORY_CONTRACT_ID);
      const summaries: EscrowSummary[] = addresses.map((addr) => ({
        address: addr,
        status: null,
        isLoading: true,
      }));
      setEscrows(summaries);
      
      // Fetch statuses in background
      addresses.forEach(async (addr, idx) => {
        try {
          const status = await getEscrowStatus(ESCROW_FACTORY_CONTRACT_ID, addr);
          setEscrows((prev) => {
            const updated = [...prev];
            if (updated[idx]) {
              updated[idx] = { ...updated[idx], status, isLoading: false };
            }
            return updated;
          });
        } catch (err) {
          setEscrows((prev) => {
            const updated = [...prev];
            if (updated[idx]) {
              updated[idx] = { ...updated[idx], isLoading: false };
            }
            return updated;
          });
        }
      });
    } catch (e: any) {
      setListError('Failed to retrieve registered escrows from Factory contract.');
      trackError(e, 'Load escrows list');
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadEscrowList();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateStatus('pending');
    setNewEscrowAddress(null);
    trackEvent('escrow_create_started');

    // 1. Validations
    if (!isValidAddressOrContract(patient)) {
      setCreateError({ code: 'INVALID_ADDRESS', message: 'Patient address must be a valid G... public key or C... contract ID.' });
      setCreateStatus('error');
      return;
    }
    if (!isValidAddressOrContract(hospital)) {
      setCreateError({ code: 'INVALID_ADDRESS', message: 'Hospital address must be a valid G... public key or C... contract ID.' });
      setCreateStatus('error');
      return;
    }
    if (insurer && !isValidAddressOrContract(insurer)) {
      setCreateError({ code: 'INVALID_ADDRESS', message: 'Insurer address must be a valid G... public key or C... contract ID.' });
      setCreateStatus('error');
      return;
    }
    if (!isValidAddressOrContract(arbiter)) {
      setCreateError({ code: 'INVALID_ADDRESS', message: 'Arbiter address must be a valid G... public key or C... contract ID.' });
      setCreateStatus('error');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setCreateError({ code: 'INVALID_AMOUNT', message: 'Amount must be a positive number.' });
      setCreateStatus('error');
      return;
    }

    try {
      // 2. Submit contract call
      const escrowAddr = await createEscrow({
        factoryContractId: ESCROW_FACTORY_CONTRACT_ID,
        patientAddress: patient,
        hospitalAddress: hospital,
        insurerAddress: insurer || undefined,
        arbiterAddress: arbiter,
        amount,
        senderPublicKey,
        signTransaction,
      });

      setNewEscrowAddress(escrowAddr);
      setCreateStatus('success');
      setHospital('');
      setInsurer('');
      setAmount('');
      trackEvent('escrow_create_success', { escrowAddr });

      // Refresh list and balance
      await loadEscrowList();
      await onBalanceRefresh();
    } catch (err: any) {
      const appErr = mapToAppError(err);
      setCreateError(appErr);
      setCreateStatus('error');
      trackError(appErr, 'Escrow creation submission error');
    }
  };

  const getStatusText = (status: number | null) => {
    if (status === null) return 'Loading...';
    switch (status) {
      case 0: return 'PENDING DEPOSIT';
      case 1: return 'FUNDED';
      case 2: return 'COMPLETED';
      case 3: return 'REFUNDED';
      case 4: return 'DISPUTED';
      default: return 'ACTIVE';
    }
  };

  return (
    <div className={styles.container}>
      {selectedEscrow ? (
        <div>
          <button className={styles.backBtn} onClick={() => setSelectedEscrow(null)}>
            ← Back to Escrow Directory
          </button>
          <EscrowPanel
            escrowAddress={selectedEscrow}
            senderPublicKey={senderPublicKey}
            signTransaction={signTransaction}
            onStateChange={onBalanceRefresh}
          />
        </div>
      ) : (
        <div className={styles.dashboardGrid}>
          {/* Create Escrow Section */}
          <div className={styles.formCol}>
            <div className={styles.card} id="initialize-escrow-form">
              <h3 className={styles.title}>Initialize Medical Treatment Escrow</h3>
              <p className={styles.subtitle}>
                Patients can deploy a custom single-purpose escrow agreement with a hospital, insurer, and arbiter.
              </p>

              <form onSubmit={handleCreate} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Patient Address (Fund Source)</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={patient}
                    onChange={(e) => setPatient(e.target.value.trim())}
                    placeholder="G..."
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Hospital Address (Payout Dest)</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={hospital}
                    onChange={(e) => setHospital(e.target.value.trim())}
                    placeholder="G..."
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Insurer Address (Optional)</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={insurer}
                    onChange={(e) => setInsurer(e.target.value.trim())}
                    placeholder="G..."
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Arbiter Address (Dispute Mediation)</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={arbiter}
                    onChange={(e) => setArbiter(e.target.value.trim())}
                    placeholder="G..."
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Treatment Bill Amount (XLM)</label>
                  <input
                    type="number"
                    step="any"
                    className={styles.input}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 50.00"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={createStatus === 'pending'}
                >
                  {createStatus === 'pending' ? 'Deploying Escrow...' : 'Deploy Treatment Escrow'}
                </button>
              </form>

              {/* Feedback messages */}
              {createStatus === 'pending' && (
                <div className={styles.feedbackPending}>
                  <span className={styles.spinner} />
                  <span>Simulating, deploying new contract code, and initializing contract state...</span>
                </div>
              )}

              {createStatus === 'success' && newEscrowAddress && (
                <div className={styles.feedbackSuccess}>
                  <div className={styles.successTitle}>✅ Escrow Contract Deployed!</div>
                  <p className={styles.successText} title={newEscrowAddress}>
                    Address: {newEscrowAddress.slice(0, 8)}...{newEscrowAddress.slice(-8)}
                  </p>
                  <button
                    className={styles.openBtn}
                    onClick={() => setSelectedEscrow(newEscrowAddress)}
                  >
                    Open Escrow Panel
                  </button>
                </div>
              )}

              {createStatus === 'error' && createError && (
                <div className={styles.feedbackError}>
                  <div className={styles.errorTitle}>❌ Deployment Failed</div>
                  <p className={styles.errorText}>{createError.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Directory Section */}
          <div className={styles.directoryCol}>
            <div className={styles.headerRow}>
              <h3 className={styles.title}>Treatment Escrow Directory</h3>
              <button
                className={styles.refreshListBtn}
                onClick={loadEscrowList}
                disabled={isLoadingList}
              >
                🔄 Refresh
              </button>
            </div>
            <p className={styles.subtitle}>List of active medical payment escrows registered on the factory.</p>

            {isLoadingList ? (
              <div>
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : listError ? (
              <div className={styles.listError}>{listError}</div>
            ) : escrows.length === 0 ? (
              <div className={styles.emptyDirectory}>
                <p>No medical escrows currently deployed via this factory.</p>
                <p className={styles.emptyHelp}>Fill the deployment form on the left to spawn the first instance!</p>
              </div>
            ) : (
              <div className={styles.listContainer}>
                {escrows.map((escrow) => (
                  <div
                    key={escrow.address}
                    className={styles.escrowCard}
                    onClick={() => setSelectedEscrow(escrow.address)}
                  >
                    <div className={styles.escrowCardHeader}>
                      <span className={styles.escrowAddress} title={escrow.address}>
                        {escrow.address.slice(0, 8)}...{escrow.address.slice(-8)}
                      </span>
                      {escrow.isLoading ? (
                        <span className={styles.loadingDot}>...</span>
                      ) : (
                        <span
                          className={`${styles.statusBadge} ${
                            escrow.status === 0 ? styles.badgePending :
                            escrow.status === 1 ? styles.badgeFunded :
                            escrow.status === 2 ? styles.badgeCompleted :
                            escrow.status === 3 ? styles.badgeRefunded :
                            styles.badgeDisputed
                          }`}
                        >
                          {getStatusText(escrow.status)}
                        </span>
                      )}
                    </div>
                    <div className={styles.escrowCardFooter}>
                      <span className={styles.openIndicator}>Interact with Contract &rarr;</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

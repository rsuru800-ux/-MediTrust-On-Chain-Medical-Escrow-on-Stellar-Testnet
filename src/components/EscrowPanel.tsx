import React, { useState, useEffect } from 'react';
import styles from './EscrowPanel.module.css';
import {
  getEscrowDetails,
  depositToEscrow,
  partialReleaseEscrow,
  releaseEscrow,
  refundEscrow,
  disputeEscrow,
  resolveDisputeEscrow,
  EscrowDetails,
} from '../lib/treatmentEscrow.ts';
import { useEscrowEvents } from '../hooks/useEscrowEvents.ts';
import { ActivityTimeline } from './ActivityTimeline.tsx';
import { mapToAppError, AppError } from '../utils/errors.ts';
import { trackEvent, trackError } from '../utils/analytics.ts';
import { EXPLORER_TX_URL } from '../config/stellar.ts';

interface EscrowPanelProps {
  escrowAddress: string;
  senderPublicKey: string;
  signTransaction: (txXdr: string) => Promise<{ signedTxXdr: string }>;
  onStateChange: () => void;
}

export const EscrowPanel: React.FC<EscrowPanelProps> = ({
  escrowAddress,
  senderPublicKey,
  signTransaction,
  onStateChange,
}) => {
  const [details, setDetails] = useState<EscrowDetails | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Contract operations states
  const [opStatus, setOpStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [opError, setOpError] = useState<AppError | null>(null);
  const [opTxHash, setOpTxHash] = useState<string | null>(null);

  // Interactive inputs / confirmations
  const [partialAmount, setPartialAmount] = useState('');
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  // Hook for live events timeline
  const { events, status: eventSyncStatus, error: eventSyncError, refreshEvents } = useEscrowEvents(escrowAddress);

  const fetchDetails = async () => {
    setIsFetching(true);
    setFetchError(null);
    try {
      const data = await getEscrowDetails(escrowAddress);
      setDetails(data);
    } catch (e: any) {
      setFetchError('Failed to fetch escrow contract details from testnet RPC.');
      trackError(e, 'Fetch escrow details error');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [escrowAddress]);

  const handleAction = async (actionType: string) => {
    setConfirmAction(null);
    setOpError(null);
    setOpStatus('pending');
    setOpTxHash(null);
    trackEvent('escrow_action_submitted', { actionType, escrowAddress });

    try {
      let txHash = '';
      const actionParams = { escrowId: escrowAddress, senderPublicKey, signTransaction };

      switch (actionType) {
        case 'deposit':
          txHash = await depositToEscrow(actionParams);
          break;
        case 'release':
          txHash = await releaseEscrow(actionParams);
          break;
        case 'partial_release':
          if (!partialAmount || parseFloat(partialAmount) <= 0) {
            throw new Error('Please enter a positive payout amount.');
          }
          txHash = await partialReleaseEscrow({ ...actionParams, amount: partialAmount });
          setPartialAmount('');
          break;
        case 'refund':
          txHash = await refundEscrow(actionParams);
          break;
        case 'dispute':
          txHash = await disputeEscrow(actionParams);
          break;
        case 'resolve_hospital':
          txHash = await resolveDisputeEscrow({ ...actionParams, releaseToHospital: true });
          break;
        case 'resolve_patient':
          txHash = await resolveDisputeEscrow({ ...actionParams, releaseToHospital: false });
          break;
        default:
          throw new Error('Invalid operation type');
      }

      setOpTxHash(txHash);
      setOpStatus('success');
      trackEvent('escrow_action_success', { actionType, txHash });
      
      // Refresh local details and trigger parent refresh
      await fetchDetails();
      refreshEvents();
      onStateChange();
    } catch (err: any) {
      const appErr = mapToAppError(err);
      setOpError(appErr);
      setOpStatus('error');
      trackError(appErr, `Escrow action failed: ${actionType}`);
    }
  };

  if (isFetching) {
    return <div className={styles.panelLoading}>Loading Escrow Contract Ledger Data...</div>;
  }

  if (fetchError || !details) {
    return (
      <div className={styles.panelError}>
        <p>{fetchError || 'Unable to load contract details.'}</p>
        <button onClick={fetchDetails} className={styles.retryBtn}>Retry Load</button>
      </div>
    );
  }

  // Resolve user role
  const isPatient = senderPublicKey.toLowerCase() === details.patient.toLowerCase();
  const isHospital = senderPublicKey.toLowerCase() === details.hospital.toLowerCase();
  const isArbiter = senderPublicKey.toLowerCase() === details.arbiter.toLowerCase();
  const isInsurer = details.insurer && senderPublicKey.toLowerCase() === details.insurer.toLowerCase();

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return 'PENDING DEPOSIT';
      case 1: return 'FUNDED / ACTIVE';
      case 2: return 'COMPLETED / RELEASED';
      case 3: return 'REFUNDED';
      case 4: return 'DISPUTED / FROZEN';
      default: return 'UNKNOWN';
    }
  };

  const getStatusClass = (status: number) => {
    switch (status) {
      case 0: return styles.statusPending;
      case 1: return styles.statusFunded;
      case 2: return styles.statusReleased;
      case 3: return styles.statusRefunded;
      case 4: return styles.statusDisputed;
      default: return '';
    }
  };

  const remainingBalance = details.amount - details.released_total;

  return (
    <div className={styles.panelGrid}>
      {/* Left Column: Escrow details and actions */}
      <div className={styles.detailsCol}>
        <div className={styles.card}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.contractLabel}>TREATMENT ESCROW INSTANCE</span>
              <h2 className={styles.contractAddress} title={escrowAddress}>
                {escrowAddress.slice(0, 8)}...{escrowAddress.slice(-8)}
              </h2>
            </div>
            <span className={`${styles.statusLabel} ${getStatusClass(details.status)}`}>
              {getStatusText(details.status)}
            </span>
          </div>

          {/* Horizontal Progress Stepper */}
          <div className={styles.stepperContainer}>
            <div className={`${styles.step} ${styles.stepCompleted}`}>
              <span className={styles.stepNumber}>1</span>
              <span className={styles.stepLabel}>Bill Issued</span>
            </div>
            <div className={styles.stepConnector} />
            
            <div className={`${styles.step} ${details.status >= 1 ? styles.stepCompleted : ''}`}>
              <span className={styles.stepNumber}>2</span>
              <span className={styles.stepLabel}>Funds Escrowed</span>
            </div>
            <div className={styles.stepConnector} />
            
            <div className={`${styles.step} ${details.status === 4 ? styles.stepDisputed : (details.status === 2 || details.status === 3) ? styles.stepCompleted : ''}`}>
              <span className={styles.stepNumber}>{details.status === 4 ? '⚠️' : '3'}</span>
              <span className={styles.stepLabel}>{details.status === 4 ? 'Disputed' : 'Verified'}</span>
            </div>
            <div className={styles.stepConnector} />
            
            <div className={`${styles.step} ${details.status === 2 ? styles.stepCompleted : ''}`}>
              <span className={styles.stepNumber}>4</span>
              <span className={styles.stepLabel}>Released/Paid</span>
            </div>
          </div>

          <div className={styles.metricsRow}>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Total Treatment Amount</div>
              <div className={styles.metricValue}>{details.amount.toFixed(2)} <span className={styles.currency}>XLM</span></div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Released to Hospital</div>
              <div className={styles.metricValue}>{details.released_total.toFixed(2)} <span className={styles.currency}>XLM</span></div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricLabel}>Locked Escrow Balance</div>
              <div className={styles.metricValue}>{remainingBalance.toFixed(2)} <span className={styles.currency}>XLM</span></div>
            </div>
          </div>

          {/* Party details */}
          <div className={styles.partyList}>
            <div className={styles.partyItem}>
              <span className={styles.partyLabel}>Patient Account</span>
              <span className={styles.partyValue} title={details.patient}>
                {details.patient.slice(0, 6)}...{details.patient.slice(-6)} {isPatient && '(You)'}
              </span>
            </div>
            <div className={styles.partyItem}>
              <span className={styles.partyLabel}>Hospital Account</span>
              <span className={styles.partyValue} title={details.hospital}>
                {details.hospital.slice(0, 6)}...{details.hospital.slice(-6)} {isHospital && '(You)'}
              </span>
            </div>
            {details.insurer && (
              <div className={styles.partyItem}>
                <span className={styles.partyLabel}>Insurer Account</span>
                <span className={styles.partyValue} title={details.insurer}>
                  {details.insurer.slice(0, 6)}...{details.insurer.slice(-6)} {isInsurer && '(You)'}
                </span>
              </div>
            )}
            <div className={styles.partyItem}>
              <span className={styles.partyLabel}>Arbiter Account</span>
              <span className={styles.partyValue} title={details.arbiter}>
                {details.arbiter.slice(0, 6)}...{details.arbiter.slice(-6)} {isArbiter && '(You)'}
              </span>
            </div>
          </div>

          {/* Context Actions Container */}
          <div className={styles.actionsBox}>
            <h4 className={styles.actionsTitle}>Available Escrow Payout Actions</h4>
            
            {/* 1. Patient Actions */}
            {isPatient && details.status === 0 && (
              <button className={styles.primaryBtn} onClick={() => handleAction('deposit')}>
                💳 Authorize and Deposit {details.amount.toFixed(2)} XLM
              </button>
            )}

            {isPatient && details.status === 1 && (
              <div className={styles.btnRow}>
                <button
                  className={styles.warningBtn}
                  onClick={() => setConfirmAction('dispute')}
                >
                  ⚖️ Initiate Dispute
                </button>
                <button
                  className={styles.dangerBtn}
                  onClick={() => setConfirmAction('refund')}
                >
                  ⏪ Request Full Refund
                </button>
              </div>
            )}

            {/* 2. Hospital Actions */}
            {isHospital && details.status === 1 && (
              <div className={styles.hospitalActions}>
                <div className={styles.partialForm}>
                  <input
                    type="number"
                    step="any"
                    className={styles.input}
                    placeholder="Partial payout amount..."
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                  />
                  <button
                    className={styles.primaryBtn}
                    onClick={() => setConfirmAction('partial_release')}
                    disabled={!partialAmount}
                  >
                    Draw Milestone
                  </button>
                </div>
                <div className={styles.btnRow}>
                  <button
                    className={styles.successBtn}
                    onClick={() => setConfirmAction('release')}
                  >
                    🔑 Settle Full Remaining ({remainingBalance.toFixed(2)} XLM)
                  </button>
                  <button
                    className={styles.warningBtn}
                    onClick={() => setConfirmAction('dispute')}
                  >
                    ⚖️ Dispute Payout
                  </button>
                </div>
              </div>
            )}

            {/* 3. Arbiter Actions */}
            {isArbiter && details.status === 4 && (
              <div className={styles.btnRow}>
                <button
                  className={styles.successBtn}
                  onClick={() => setConfirmAction('resolve_hospital')}
                >
                  Resolve: Release Payout to Hospital
                </button>
                <button
                  className={styles.dangerBtn}
                  onClick={() => setConfirmAction('resolve_patient')}
                >
                  Resolve: Refund Deposit to Patient
                </button>
              </div>
            )}

            {/* No actions available state */}
            {!isPatient && !isHospital && !isArbiter && !isInsurer && (
              <p className={styles.infoText}>Your wallet key is not registered as a party to this escrow.</p>
            )}

            {details.status === 2 && (
              <p className={styles.infoText}>This medical escrow contract has been fully completed and settled.</p>
            )}

            {details.status === 3 && (
              <p className={styles.infoText}>This medical escrow contract has been fully refunded to the patient.</p>
            )}

            {details.status === 1 && !isPatient && !isHospital && (
              <p className={styles.infoText}>Awaiting clinical payout triggers from the patient or hospital.</p>
            )}

            {details.status === 4 && !isArbiter && (
              <p className={styles.infoText}>⚠️ Payment is frozen. Awaiting dispute settlement from the Arbiter.</p>
            )}
          </div>

          {/* Action Confirmations Dialogs */}
          {confirmAction && (
            <div className={styles.confirmationOverlay}>
              <div className={styles.confirmationBox}>
                <h4 className={styles.confirmTitle}>Confirm Irreversible Action</h4>
                <p className={styles.confirmText}>
                  Are you absolutely sure you want to perform this operation? Escrow funds will be moved and settled on-chain.
                </p>
                <div className={styles.confirmBtnRow}>
                  <button
                    className={styles.confirmYes}
                    onClick={() => handleAction(confirmAction)}
                  >
                    Yes, Submit
                  </button>
                  <button
                    className={styles.confirmNo}
                    onClick={() => setConfirmAction(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* feedback notifications */}
          {opStatus === 'pending' && (
            <div className={styles.feedbackPending}>
              <span className={styles.spinner} />
              <span>Simulating contract call, request signatures, and submitting transaction...</span>
            </div>
          )}

          {opStatus === 'success' && opTxHash && (
            <div className={styles.feedbackSuccess}>
              <div className={styles.successTitle}>✅ Operation Complete</div>
              <a
                href={EXPLORER_TX_URL(opTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.explorerLink}
              >
                View Transaction on Stellar Expert Explorer ↗
              </a>
            </div>
          )}

          {opStatus === 'error' && opError && (
            <div className={styles.feedbackError}>
              <div className={styles.errorTitle}>❌ Action Failed</div>
              <p className={styles.errorText}>{opError.message}</p>
              <span className={styles.errorCode}>Code: {opError.code}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Live Event Stream timeline */}
      <div className={styles.timelineCol}>
        <ActivityTimeline
          events={events}
          status={eventSyncStatus}
          error={eventSyncError}
          onRefresh={refreshEvents}
        />
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import styles from './ClaimsPortal.module.css';
import { getEscrows } from '../lib/escrowFactory.ts';
import { getEscrowDetails, EscrowDetails } from '../lib/treatmentEscrow.ts';
import { ESCROW_FACTORY_CONTRACT_ID, EXPLORER_CONTRACT_URL } from '../config/stellar.ts';
import { trackError } from '../utils/analytics.ts';
import { EscrowPanel } from './EscrowPanel.tsx';
import { SkeletonCard } from './Skeleton.tsx';

interface ClaimsPortalProps {
  senderPublicKey: string;
  signTransaction: (txXdr: string) => Promise<{ signedTxXdr: string }>;
  onBalanceRefresh: () => Promise<void>;
  onNavigateToEscrows: () => void;
}

interface EnrichedEscrow {
  address: string;
  details: EscrowDetails | null;
  isLoading: boolean;
  role: 'patient' | 'insurer' | 'arbiter' | 'other';
}

const STATUS_LABELS: Record<number, string> = {
  0: 'Pending',
  1: 'Active (Funded)',
  2: 'Released / Paid',
  3: 'Refunded',
  4: 'Disputed',
};

export const ClaimsPortal: React.FC<ClaimsPortalProps> = ({
  senderPublicKey,
  signTransaction,
  onBalanceRefresh,
  onNavigateToEscrows,
}) => {
  const [escrows, setEscrows] = useState<EnrichedEscrow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEscrow, setSelectedEscrow] = useState<string | null>(null);

  const loadClaims = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const addresses = await getEscrows(ESCROW_FACTORY_CONTRACT_ID);
      const summaries: EnrichedEscrow[] = addresses.map(addr => ({
        address: addr,
        details: null,
        isLoading: true,
        role: 'other',
      }));
      setEscrows(summaries);

      // Load details for each escrow in parallel
      const detailPromises = addresses.map(async (addr, idx) => {
        try {
          const details = await getEscrowDetails(addr);
          const role: EnrichedEscrow['role'] =
            details.patient === senderPublicKey ? 'patient' :
            details.insurer === senderPublicKey ? 'insurer' :
            details.arbiter === senderPublicKey ? 'arbiter' : 'other';
          setEscrows(prev => {
            const updated = [...prev];
            if (updated[idx]) updated[idx] = { ...updated[idx], details, isLoading: false, role };
            return updated;
          });
        } catch {
          setEscrows(prev => {
            const updated = [...prev];
            if (updated[idx]) updated[idx] = { ...updated[idx], isLoading: false };
            return updated;
          });
        }
      });
      await Promise.allSettled(detailPromises);
    } catch (e: any) {
      setError('Unable to load claims from the Factory contract. Please check your connection and try again.');
      trackError(e, 'ClaimsPortal load');
    } finally {
      setIsLoading(false);
    }
  }, [senderPublicKey]);

  useEffect(() => { loadClaims(); }, [loadClaims]);

  // Only show claims relevant to this wallet
  const myClaims = escrows.filter(e => e.role === 'patient' || e.role === 'insurer');
  const allLoaded = !escrows.some(e => e.isLoading);

  const totalActive = myClaims.filter(e => e.details?.status === 1).length;
  const totalPaid = myClaims.filter(e => e.details?.status === 2).length;
  const totalDisputed = myClaims.filter(e => e.details?.status === 4).length;
  const totalAmountLocked = myClaims.reduce((sum, e) =>
    e.details ? sum + (e.details.amount - e.details.released_total) : sum, 0);

  if (selectedEscrow) {
    return (
      <div>
        <button className={styles.refreshBtn} onClick={() => setSelectedEscrow(null)} style={{ marginBottom: 24 }}>
          ← Back to Claims
        </button>
        <EscrowPanel
          escrowAddress={selectedEscrow}
          senderPublicKey={senderPublicKey}
          signTransaction={signTransaction}
          onStateChange={onBalanceRefresh}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Hero info card */}
      <div className={styles.infoCard}>
        <div className={styles.infoText}>
          <h3>Insurance Claims Portal</h3>
          <p>
            Your on-chain medical claims are escrow contracts where your wallet is registered as
            the patient or co-insurer. Funds are locked in the smart contract and released only
            after treatment is verified on Stellar Testnet.
          </p>
        </div>
        <div className={styles.infoIcon}>🏥</div>
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>My Total Claims</div>
          <div className={styles.statValue}>{allLoaded ? myClaims.length : '—'}</div>
          <div className={styles.statSub}>Filed via this wallet</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Active Escrows</div>
          <div className={styles.statValue}>{allLoaded ? totalActive : '—'}</div>
          <div className={styles.statSub}>Funded &amp; locked on-chain</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Paid / Released</div>
          <div className={styles.statValue}>{allLoaded ? totalPaid : '—'}</div>
          <div className={styles.statSub}>Care verified, funds sent</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Locked Value</div>
          <div className={styles.statValue}>{allLoaded ? totalAmountLocked.toFixed(2) : '—'}</div>
          <div className={styles.statSub}>XLM in active escrows</div>
        </div>
      </div>

      {/* Claims table */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>My Claims ({myClaims.length})</h3>
          <button className={styles.refreshBtn} onClick={loadClaims} disabled={isLoading}>
            🔄 {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {error && <div className={styles.errorMsg}>⚠️ {error}</div>}

        {isLoading && escrows.length === 0 ? (
          <div><SkeletonCard /><SkeletonCard /></div>
        ) : myClaims.length === 0 && !isLoading ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🏥</div>
            <h4 className={styles.emptyTitle}>No Insurance Claims Found</h4>
            <p className={styles.emptyText}>
              Your wallet ({senderPublicKey.slice(0, 8)}...{senderPublicKey.slice(-8)}) is not
              registered as a patient or insurer in any on-chain escrow contract yet.
            </p>
            <button className={styles.emptyBtn} onClick={onNavigateToEscrows}>
              Create First Escrow →
            </button>
          </div>
        ) : (
          <table className={styles.claimTable}>
            <thead>
              <tr>
                <th>Contract</th>
                <th>Your Role</th>
                <th>Hospital</th>
                <th>Amount</th>
                <th>Released</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {myClaims.map(escrow => (
                <tr key={escrow.address} onClick={() => setSelectedEscrow(escrow.address)}>
                  <td>
                    <a
                      className={styles.monoText}
                      href={EXPLORER_CONTRACT_URL(escrow.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      title={escrow.address}
                    >
                      {escrow.address.slice(0, 8)}...{escrow.address.slice(-6)}
                    </a>
                  </td>
                  <td>
                    <span className={styles.roleBadge}>
                      {escrow.role === 'patient' ? '🧑‍⚕️ Patient' : '🏦 Insurer'}
                    </span>
                  </td>
                  <td>
                    {escrow.details ? (
                      <span className={styles.monoText} title={escrow.details.hospital}>
                        {escrow.details.hospital.slice(0, 6)}...{escrow.details.hospital.slice(-6)}
                      </span>
                    ) : escrow.isLoading ? '...' : '—'}
                  </td>
                  <td>
                    <span className={styles.amountText}>
                      {escrow.details ? `${escrow.details.amount.toFixed(2)} XLM` : escrow.isLoading ? '...' : '—'}
                    </span>
                  </td>
                  <td>
                    {escrow.details ? `${escrow.details.released_total.toFixed(2)} XLM` : escrow.isLoading ? '...' : '—'}
                  </td>
                  <td>
                    {escrow.isLoading ? (
                      <span className={`${styles.badge} ${styles.badgePending}`}>Loading...</span>
                    ) : escrow.details ? (
                      <span className={`${styles.badge} ${
                        escrow.details.status === 0 ? styles.badgePending :
                        escrow.details.status === 1 ? styles.badgeFunded :
                        escrow.details.status === 2 ? styles.badgeReleased :
                        escrow.details.status === 3 ? styles.badgeRefunded :
                        styles.badgeDisputed
                      }`}>
                        {STATUS_LABELS[escrow.details.status] ?? 'Unknown'}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    <button className={styles.openBtn} onClick={e => { e.stopPropagation(); setSelectedEscrow(escrow.address); }}>
                      Manage →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Disputed claims warning */}
      {totalDisputed > 0 && (
        <div style={{
          background: 'var(--status-error-bg)',
          border: '1px solid rgba(186,26,26,0.2)',
          borderRadius: 'var(--radius-card)',
          padding: 'var(--space-16)',
          display: 'flex',
          gap: 'var(--space-12)',
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <strong style={{ color: 'var(--status-error-color)' }}>
              {totalDisputed} claim{totalDisputed > 1 ? 's' : ''} in dispute
            </strong>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--on-surface-variant)' }}>
              Disputed escrows have frozen funds. Your arbiter must resolve the dispute before any release or refund can occur.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

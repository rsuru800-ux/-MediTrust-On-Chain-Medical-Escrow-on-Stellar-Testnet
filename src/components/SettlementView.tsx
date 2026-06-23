import React, { useState, useEffect, useCallback } from 'react';
import styles from './SettlementView.module.css';
import { getEscrows } from '../lib/escrowFactory.ts';
import { getEscrowDetails, EscrowDetails } from '../lib/treatmentEscrow.ts';
import { ESCROW_FACTORY_CONTRACT_ID, EXPLORER_CONTRACT_URL } from '../config/stellar.ts';
import { trackError } from '../utils/analytics.ts';
import { EscrowPanel } from './EscrowPanel.tsx';
import { SkeletonCard } from './Skeleton.tsx';

interface SettlementViewProps {
  senderPublicKey: string;
  signTransaction: (txXdr: string) => Promise<{ signedTxXdr: string }>;
  onBalanceRefresh: () => Promise<void>;
}

interface EnrichedEscrow {
  address: string;
  details: EscrowDetails | null;
  isLoading: boolean;
}

const STATUS_LABELS: Record<number, string> = {
  0: 'Pending',
  1: 'Active',
  2: 'Released',
  3: 'Refunded',
  4: 'Disputed',
};

export const SettlementView: React.FC<SettlementViewProps> = ({
  senderPublicKey,
  signTransaction,
  onBalanceRefresh,
}) => {
  const [escrows, setEscrows] = useState<EnrichedEscrow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEscrow, setSelectedEscrow] = useState<string | null>(null);

  const loadSettlements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const addresses = await getEscrows(ESCROW_FACTORY_CONTRACT_ID);
      const summaries: EnrichedEscrow[] = addresses.map(addr => ({
        address: addr,
        details: null,
        isLoading: true,
      }));
      setEscrows(summaries);

      addresses.forEach(async (addr, idx) => {
        try {
          const details = await getEscrowDetails(addr);
          setEscrows(prev => {
            const updated = [...prev];
            if (updated[idx]) updated[idx] = { ...updated[idx], details, isLoading: false };
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
    } catch (e: any) {
      setError('Unable to load settlement records from the Factory contract.');
      trackError(e, 'SettlementView load');
    } finally {
      setIsLoading(false);
    }
  }, [senderPublicKey]);

  useEffect(() => { loadSettlements(); }, [loadSettlements]);

  // Hospital-facing view
  const mySettlements = escrows.filter(e => e.details?.hospital === senderPublicKey);
  const allLoaded = !escrows.some(e => e.isLoading);

  const totalPending = mySettlements.reduce((sum, e) =>
    e.details && e.details.status === 1 ? sum + (e.details.amount - e.details.released_total) : sum, 0);
  const totalReleased = mySettlements.reduce((sum, e) =>
    e.details ? sum + e.details.released_total : sum, 0);
  const totalBilled = mySettlements.reduce((sum, e) =>
    e.details ? sum + e.details.amount : sum, 0);

  if (selectedEscrow) {
    return (
      <div>
        <button className={styles.refreshBtn} onClick={() => setSelectedEscrow(null)} style={{ marginBottom: 24 }}>
          ← Back to Settlements
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
      {/* Hero */}
      <div className={styles.heroCard}>
        <div className={styles.heroText}>
          <h3>Provider Settlement View</h3>
          <p>
            Hospital balance reconciliation dashboard. Shows all escrow contracts where your wallet
            is registered as the healthcare provider. Track pending payouts and released settlements.
          </p>
        </div>
        <div className={styles.heroIcon}>⚖️</div>
      </div>

      {/* Summary row */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total Billed</div>
          <div className={styles.summaryValue}>
            {allLoaded ? totalBilled.toFixed(2) : '—'}
            <span className={styles.summaryUnit}> XLM</span>
          </div>
          <div className={styles.summaryHelp}>Across {mySettlements.length} escrow(s)</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Pending Payout</div>
          <div className={styles.summaryValue} style={{ color: 'var(--status-pending-color)' }}>
            {allLoaded ? totalPending.toFixed(2) : '—'}
            <span className={styles.summaryUnit}> XLM</span>
          </div>
          <div className={styles.summaryHelp}>Locked in active escrows</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total Released</div>
          <div className={styles.summaryValue} style={{ color: 'var(--status-success-color)' }}>
            {allLoaded ? totalReleased.toFixed(2) : '—'}
            <span className={styles.summaryUnit}> XLM</span>
          </div>
          <div className={styles.summaryHelp}>Already paid to this wallet</div>
        </div>
      </div>

      {/* Table */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Settlement Records ({mySettlements.length})</h3>
          <button className={styles.refreshBtn} onClick={loadSettlements} disabled={isLoading}>
            🔄 {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {error && <div className={styles.errorMsg}>⚠️ {error}</div>}

        {isLoading && escrows.length === 0 ? (
          <div><SkeletonCard /><SkeletonCard /></div>
        ) : mySettlements.length === 0 && !isLoading ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>⚖️</div>
            <h4 className={styles.emptyTitle}>No Settlement Records</h4>
            <p className={styles.emptyText}>
              Your wallet ({senderPublicKey.slice(0, 8)}...{senderPublicKey.slice(-8)}) is not
              registered as a hospital in any on-chain escrow contract yet. Ask your patient to
              deploy an escrow and enter your wallet as the hospital address.
            </p>
          </div>
        ) : (
          <table className={styles.settlementTable}>
            <thead>
              <tr>
                <th>Contract</th>
                <th>Patient</th>
                <th>Total Bill</th>
                <th>Released</th>
                <th>Remaining</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {mySettlements.map(escrow => {
                const remaining = escrow.details ? escrow.details.amount - escrow.details.released_total : 0;
                const pct = escrow.details && escrow.details.amount > 0
                  ? Math.min(100, (escrow.details.released_total / escrow.details.amount) * 100)
                  : 0;
                return (
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
                      {escrow.details ? (
                        <span className={styles.monoText} title={escrow.details.patient}>
                          {escrow.details.patient.slice(0, 6)}...{escrow.details.patient.slice(-6)}
                        </span>
                      ) : escrow.isLoading ? '...' : '—'}
                    </td>
                    <td>
                      <span className={styles.amountCell}>
                        {escrow.details ? `${escrow.details.amount.toFixed(2)} XLM` : escrow.isLoading ? '...' : '—'}
                      </span>
                    </td>
                    <td>{escrow.details ? `${escrow.details.released_total.toFixed(2)} XLM` : '—'}</td>
                    <td>
                      <span className={styles.pendingCell}>
                        {escrow.details ? `${remaining.toFixed(2)} XLM` : '—'}
                      </span>
                    </td>
                    <td style={{ minWidth: 100 }}>
                      {escrow.details ? (
                        <div>
                          <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--outline)', marginTop: 4 }}>
                            {pct.toFixed(0)}% paid out
                          </div>
                        </div>
                      ) : '—'}
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
                          {STATUS_LABELS[escrow.details.status] ?? '—'}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <button className={styles.openBtn} onClick={e => { e.stopPropagation(); setSelectedEscrow(escrow.address); }}>
                        View →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

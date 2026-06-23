import React, { useState, useEffect, useCallback } from 'react';
import styles from './ClaimsList.module.css';
import { getEscrows } from '../lib/escrowFactory.ts';
import { getEscrowDetails, EscrowDetails } from '../lib/treatmentEscrow.ts';
import { ESCROW_FACTORY_CONTRACT_ID, EXPLORER_CONTRACT_URL } from '../config/stellar.ts';
import { trackError } from '../utils/analytics.ts';
import { EscrowPanel } from './EscrowPanel.tsx';
import { SkeletonCard } from './Skeleton.tsx';

interface ClaimsListProps {
  senderPublicKey: string;
  signTransaction: (txXdr: string) => Promise<{ signedTxXdr: string }>;
  onBalanceRefresh: () => Promise<void>;
}

interface EnrichedEscrow {
  address: string;
  details: EscrowDetails | null;
  isLoading: boolean;
}

type StatusFilter = 'all' | 0 | 1 | 2 | 3 | 4;

const STATUS_LABELS: Record<number, string> = {
  0: 'Pending',
  1: 'Active',
  2: 'Released',
  3: 'Refunded',
  4: 'Disputed',
};

const PAGE_SIZE = 10;

export const ClaimsList: React.FC<ClaimsListProps> = ({
  senderPublicKey,
  signTransaction,
  onBalanceRefresh,
}) => {
  const [escrows, setEscrows] = useState<EnrichedEscrow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEscrow, setSelectedEscrow] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(0);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setPage(0);
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
      setError('Unable to load escrow directory from the Factory contract.');
      trackError(e, 'ClaimsList load');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const getMyRole = (details: EscrowDetails | null) => {
    if (!details) return null;
    if (details.patient === senderPublicKey) return 'Patient';
    if (details.hospital === senderPublicKey) return 'Hospital';
    if (details.insurer === senderPublicKey) return 'Insurer';
    if (details.arbiter === senderPublicKey) return 'Arbiter';
    return null;
  };

  const filtered = escrows.filter(e => {
    if (statusFilter === 'all') return true;
    if (e.details === null) return false;
    return e.details.status === statusFilter;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (selectedEscrow) {
    return (
      <div>
        <button className={styles.refreshBtn} onClick={() => setSelectedEscrow(null)} style={{ marginBottom: 24 }}>
          ← Back to Directory
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
      {/* Top controls */}
      <div className={styles.topBar}>
        <div className={styles.filterRow}>
          {(['all', 0, 1, 2, 3, 4] as StatusFilter[]).map(f => (
            <button
              key={String(f)}
              className={`${styles.filterBtn} ${statusFilter === f ? styles.filterBtnActive : ''}`}
              onClick={() => { setStatusFilter(f); setPage(0); }}
            >
              {f === 'all' ? `All (${escrows.length})` : `${STATUS_LABELS[f as number]} (${escrows.filter(e => e.details?.status === f).length})`}
            </button>
          ))}
        </div>
        <button className={styles.refreshBtn} onClick={loadAll} disabled={isLoading}>
          🔄 {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Table section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            Insurance Claims Directory — {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          </h3>
        </div>

        {error && <div className={styles.errorMsg}>⚠️ {error}</div>}

        {isLoading && escrows.length === 0 ? (
          <div><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
        ) : filtered.length === 0 && !isLoading ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <h4 className={styles.emptyTitle}>No Escrows Found</h4>
            <p className={styles.emptyText}>
              {statusFilter === 'all'
                ? 'No medical escrows have been deployed via this factory contract yet. Deploy the first escrow from the Escrows Directory tab.'
                : `No escrows with status "${STATUS_LABELS[statusFilter as number]}" found. Try a different filter.`}
            </p>
          </div>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Contract Address</th>
                  <th>Patient</th>
                  <th>Hospital</th>
                  <th>Insurer</th>
                  <th>Amount</th>
                  <th>Released</th>
                  <th>Status</th>
                  <th>My Role</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((escrow, idx) => {
                  const myRole = getMyRole(escrow.details);
                  return (
                    <tr key={escrow.address} onClick={() => setSelectedEscrow(escrow.address)}>
                      <td style={{ color: 'var(--outline)', fontSize: 12 }}>
                        {page * PAGE_SIZE + idx + 1}
                      </td>
                      <td>
                        <a
                          className={styles.monoLink}
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
                            {escrow.details.patient.slice(0, 6)}...{escrow.details.patient.slice(-4)}
                          </span>
                        ) : escrow.isLoading ? <span style={{ color: 'var(--outline)' }}>...</span> : '—'}
                      </td>
                      <td>
                        {escrow.details ? (
                          <span className={styles.monoText} title={escrow.details.hospital}>
                            {escrow.details.hospital.slice(0, 6)}...{escrow.details.hospital.slice(-4)}
                          </span>
                        ) : escrow.isLoading ? '...' : '—'}
                      </td>
                      <td>
                        {escrow.details
                          ? escrow.details.insurer
                            ? <span className={styles.monoText} title={escrow.details.insurer}>{escrow.details.insurer.slice(0, 6)}...{escrow.details.insurer.slice(-4)}</span>
                            : <span style={{ color: 'var(--outline)', fontSize: 12 }}>None</span>
                          : escrow.isLoading ? '...' : '—'}
                      </td>
                      <td>
                        <span className={styles.amountCell}>
                          {escrow.details ? `${escrow.details.amount.toFixed(2)} XLM` : escrow.isLoading ? '...' : '—'}
                        </span>
                      </td>
                      <td>
                        {escrow.details ? `${escrow.details.released_total.toFixed(2)} XLM` : '—'}
                      </td>
                      <td>
                        {escrow.isLoading ? (
                          <span className={`${styles.badge} ${styles.badgePending}`}>Loading</span>
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
                        {myRole ? (
                          <span className={styles.myRoleBadge}>{myRole}</span>
                        ) : (
                          <span style={{ color: 'var(--outline)', fontSize: 12 }}>Observer</span>
                        )}
                      </td>
                      <td>
                        <button
                          className={styles.openBtn}
                          onClick={e => { e.stopPropagation(); setSelectedEscrow(escrow.address); }}
                        >
                          Open →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <span className={styles.pageInfo}>
                  Page {page + 1} of {totalPages} ({filtered.length} records)
                </span>
                <div className={styles.pageButtons}>
                  <button className={styles.pageBtn} onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                    ← Prev
                  </button>
                  <button className={styles.pageBtn} onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

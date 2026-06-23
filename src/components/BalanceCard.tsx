import React, { useState } from 'react';
import styles from './BalanceCard.module.css';
import { fundAccountViaFriendbot } from '../lib/stellar.ts';
import { trackEvent, trackError } from '../utils/analytics.ts';

interface BalanceCardProps {
  balance: number;
  isFunded: boolean;
  isFetching: boolean;
  onRefresh: () => Promise<void>;
  publicKey: string;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  balance,
  isFunded,
  isFetching,
  onRefresh,
  publicKey,
}) => {
  const [isFunding, setIsFunding] = useState(false);
  const [fundingError, setFundingError] = useState<string | null>(null);

  const handleFundAccount = async () => {
    setIsFunding(true);
    setFundingError(null);
    trackEvent('friendbot_funding_started', { publicKey });

    try {
      await fundAccountViaFriendbot(publicKey);
      trackEvent('friendbot_funding_success', { publicKey });
      await onRefresh();
    } catch (e: any) {
      setFundingError('Friendbot failed to fund this account. Please try again.');
      trackError(e, 'Friendbot funding error');
    } finally {
      setIsFunding(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>PATIENT WALLET BALANCE</span>
        <button
          className={`${styles.refreshButton} ${isFetching ? styles.spinning : ''}`}
          onClick={onRefresh}
          disabled={isFetching || isFunding}
          title="Refresh Balance"
        >
          🔄
        </button>
      </div>

      <div className={styles.balanceContainer}>
        {isFetching && !isFunding ? (
          <span className={styles.loadingText}>Fetching...</span>
        ) : (
          <>
            <span className={styles.amount}>{balance.toFixed(2)}</span>
            <span className={styles.currency}>XLM</span>
          </>
        )}
      </div>

      {!isFunded && (
        <div className={styles.unfundedWarning}>
          <p className={styles.warningText}>
            ⚠️ Account not found on testnet. Connect a funded account or click below to receive testnet XLM.
          </p>
          <button
            className={styles.fundButton}
            onClick={handleFundAccount}
            disabled={isFunding}
          >
            {isFunding ? 'Funding Account...' : 'Fund via Friendbot (10k XLM)'}
          </button>
          {fundingError && <p className={styles.errorText}>{fundingError}</p>}
        </div>
      )}

      {isFunded && (
        <div className={styles.fundedBadge}>
          <span className={styles.badgeIndicator} />
          Active on Stellar Testnet
        </div>
      )}
    </div>
  );
};

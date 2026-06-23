import React from 'react';
import styles from './WalletButton.module.css';

interface WalletButtonProps {
  publicKey: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  onConnectClick: () => void;
  onDisconnectClick: () => void;
  walletName: string | null;
}

export const WalletButton: React.FC<WalletButtonProps> = ({
  publicKey,
  isConnected,
  isConnecting,
  onConnectClick,
  onDisconnectClick,
  walletName,
}) => {
  if (isConnecting) {
    return (
      <button className={`${styles.button} ${styles.connecting}`} disabled>
        <span className={styles.spinner} />
        Connecting...
      </button>
    );
  }

  if (isConnected && publicKey) {
    const truncatedKey = `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;
    return (
      <div className={styles.connectedContainer}>
        <div className={styles.walletDetails}>
          <span className={styles.indicator} />
          <span className={styles.publicKey} title={publicKey}>
            {truncatedKey}
          </span>
          {walletName && (
            <span className={styles.walletName}>
              ({walletName})
            </span>
          )}
        </div>
        <button className={styles.disconnectButton} onClick={onDisconnectClick}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button className={styles.button} onClick={onConnectClick}>
      Connect Wallet
    </button>
  );
};

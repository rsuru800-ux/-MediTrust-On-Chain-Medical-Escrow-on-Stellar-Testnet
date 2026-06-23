import React from 'react';
import styles from './WalletSelectModal.module.css';

interface WalletSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (providerId: string) => Promise<void>;
  isFreighterInstalled: boolean;
}

export const WalletSelectModal: React.FC<WalletSelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  isFreighterInstalled,
}) => {
  if (!isOpen) return null;

  const handleWalletSelect = async (providerId: string) => {
    try {
      await onSelect(providerId);
      onClose();
    } catch (e) {
      // Error is already set and handled in useWallet hook
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Connect Your Wallet</h2>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>
        <p className={styles.subtitle}>Select a Stellar wallet provider to connect as Patient or Hospital.</p>
        
        <div className={styles.walletList}>
          {/* Freighter Option */}
          <div
            className={styles.walletItem}
            onClick={() => handleWalletSelect('freighter')}
          >
            <div className={styles.walletInfo}>
              <div className={styles.iconContainer}>
                <img
                  src="https://www.freighter.app/img/logo.svg"
                  alt="Freighter Wallet"
                  className={styles.walletIcon}
                  onError={(e) => {
                    // Fallback to simple symbol if image fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <div className={styles.walletName}>Freighter Wallet</div>
                <div className={styles.walletDescription}>
                  {isFreighterInstalled
                    ? 'Official Stellar extension (Recommended)'
                    : 'Not installed. Click download below.'}
                </div>
              </div>
            </div>
            {isFreighterInstalled ? (
              <span className={styles.badge}>Installed</span>
            ) : (
              <a
                href="https://www.freighter.app/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.downloadLink}
                onClick={(e) => e.stopPropagation()}
              >
                Install Freighter
              </a>
            )}
          </div>

          {/* xBull Option */}
          <div
            className={styles.walletItem}
            onClick={() => handleWalletSelect('xbull')}
          >
            <div className={styles.walletInfo}>
              <div className={styles.iconContainer}>
                <div className={styles.fallbackIcon}>🐃</div>
              </div>
              <div>
                <div className={styles.walletName}>xBull Wallet</div>
                <div className={styles.walletDescription}>Multi-chain browser wallet module</div>
              </div>
            </div>
            <span className={styles.badge}>Alternative</span>
          </div>

          {/* Albedo Option */}
          <div
            className={styles.walletItem}
            onClick={() => handleWalletSelect('albedo')}
          >
            <div className={styles.walletInfo}>
              <div className={styles.iconContainer}>
                <div className={styles.fallbackIcon}>🌌</div>
              </div>
              <div>
                <div className={styles.walletName}>Albedo Wallet</div>
                <div className={styles.walletDescription}>Web-based decentralized signing portal</div>
              </div>
            </div>
            <span className={styles.badge}>Alternative</span>
          </div>
        </div>
        
        <div className={styles.footer}>
          Secure on-chain medical escrow powered by Stellar Soroban
        </div>
      </div>
    </div>
  );
};

import { useState, useEffect, useCallback } from 'react';
import { StellarWalletsKit, WalletNetwork, allowAllModules } from '@creit.tech/stellar-wallets-kit';
import { isConnected as isFreighterConnected } from '@stellar/freighter-api';
import { mapToAppError, AppError } from '../utils/errors.ts';
import { trackEvent, trackError } from '../utils/analytics.ts';
import { NETWORK_PASSPHRASE } from '../config/stellar.ts';

// Initialize a single global instance of StellarWalletsKit
export const walletsKit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  modules: allowAllModules(),
});

export const useWallet = () => {
  const [publicKey, setPublicKey] = useState<string | null>(() => {
    return sessionStorage.getItem('meditrust_wallet_address');
  });
  const [walletName, setWalletName] = useState<string | null>(() => {
    return sessionStorage.getItem('meditrust_wallet_name');
  });
  const [isConnected, setIsConnected] = useState<boolean>(() => {
    return !!sessionStorage.getItem('meditrust_wallet_address');
  });
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);
  const [isFreighterInstalled, setIsFreighterInstalled] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Check if Freighter is installed on mount (with polling retries for async content script injection)
  useEffect(() => {
    let active = true;
    const check = async (attempts = 3, delay = 500) => {
      try {
        const installed = await isFreighterConnected();
        if (installed && active) {
          setIsFreighterInstalled(true);
          return;
        }
      } catch (e) {
        // ignore
      }
      if (attempts > 1 && active) {
        setTimeout(() => check(attempts - 1, delay * 2), delay);
      } else if (active) {
        setIsFreighterInstalled(false);
      }
    };

    if (typeof window !== 'undefined' && ((window as any).stellar || (window as any).freighter)) {
      setIsFreighterInstalled(true);
    } else {
      check();
    }

    return () => {
      active = false;
    };
  }, []);

  // Ensure walletsKit has the selected wallet set when restoring session/wallet connection
  useEffect(() => {
    if (walletName) {
      try {
        walletsKit.setWallet(walletName);
      } catch (e) {
        console.error('Failed to set wallet provider on mount:', e);
      }
    }
  }, [walletName]);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const connectWithProvider = useCallback(async (providerId: string) => {
    setIsConnecting(true);
    setError(null);
    setIsModalOpen(false);

    try {
      trackEvent('wallet_connect_provider', { providerId });
      
      walletsKit.setWallet(providerId);
      const { address } = await walletsKit.getAddress();

      if (address) {
        setPublicKey(address);
        setWalletName(providerId);
        setIsConnected(true);
        
        sessionStorage.setItem('meditrust_wallet_address', address);
        sessionStorage.setItem('meditrust_wallet_name', providerId);
        
        trackEvent('wallet_connect_success', { providerId, address });
      } else {
        throw new Error('Connection successful but no public key returned.');
      }
      setIsConnecting(false);
    } catch (err: any) {
      const appErr = mapToAppError(err);
      setError(appErr);
      setIsConnecting(false);
      trackError(appErr, `Wallet connect direct: ${providerId}`);
      throw appErr;
    }
  }, []);

  const disconnect = useCallback(() => {
    trackEvent('wallet_disconnect', { publicKey, walletName });

    setPublicKey(null);
    setWalletName(null);
    setIsConnected(false);
    setError(null);

    sessionStorage.removeItem('meditrust_wallet_address');
    sessionStorage.removeItem('meditrust_wallet_name');
  }, [publicKey, walletName]);

  const signTransaction = useCallback(
    async (txXdr: string): Promise<{ signedTxXdr: string }> => {
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      try {
        trackEvent('tx_signing_started', { walletName });
        // Must pass networkPassphrase and address so the wallet knows which
        // network to sign for and which account to use — without these the
        // wallet returns a 400 Bad Request or signs for the wrong network.
        const result = await walletsKit.signTransaction(txXdr, {
          networkPassphrase: NETWORK_PASSPHRASE,
          address: publicKey,
        });
        trackEvent('tx_signing_success', { walletName });
        return result;
      } catch (err: any) {
        const appErr = mapToAppError(err);
        trackError(appErr, 'Transaction signing failed');
        throw appErr;
      }
    },
    [publicKey, walletName]
  );

  return {
    publicKey,
    walletName,
    isConnected,
    isConnecting,
    isFreighterInstalled,
    isModalOpen,
    error,
    openModal,
    closeModal,
    connectWithProvider,
    disconnect,
    signTransaction,
  };
};
export type UseWalletReturn = ReturnType<typeof useWallet>;

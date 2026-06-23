import React, { useState } from 'react';
import styles from './SendPayment.module.css';
import { sendNativePayment } from '../lib/stellar.ts';
import { isValidStellarAddress, validatePaymentAmount } from '../utils/validation.ts';
import { mapToAppError, AppError } from '../utils/errors.ts';
import { trackEvent, trackError } from '../utils/analytics.ts';
import { EXPLORER_TX_URL } from '../config/stellar.ts';

interface SendPaymentProps {
  senderPublicKey: string;
  balance: number;
  signTransaction: (txXdr: string) => Promise<{ signedTxXdr: string }>;
  onPaymentSuccess: () => Promise<void>;
}

export const SendPayment: React.FC<SendPaymentProps> = ({
  senderPublicKey,
  balance,
  signTransaction,
  onPaymentSuccess,
}) => {
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus('pending');
    trackEvent('payment_send_started', { amount, destination });

    // 1. Validate destination address
    if (!isValidStellarAddress(destination)) {
      const appErr = {
        code: 'INVALID_ADDRESS',
        message: 'Destination address is malformed. It must be a valid 56-character Stellar public key starting with G.',
      };
      setError(appErr);
      setStatus('error');
      trackError(appErr, 'Payment validation address');
      return;
    }

    // 2. Validate amount
    const valResult = validatePaymentAmount(amount, balance);
    if (!valResult.isValid) {
      const appErr = {
        code: 'INSUFFICIENT_BALANCE',
        message: valResult.error || 'Invalid amount.',
      };
      setError(appErr);
      setStatus('error');
      trackError(appErr, 'Payment validation amount');
      return;
    }

    try {
      // 3. Send payment
      const hash = await sendNativePayment({
        senderPublicKey,
        destination,
        amount,
        signTransaction,
      });

      setTxHash(hash);
      setStatus('success');
      setDestination('');
      setAmount('');
      trackEvent('payment_send_success', { hash });
      
      // Trigger balance refresh
      await onPaymentSuccess();
    } catch (err: any) {
      const appErr = mapToAppError(err);
      setError(appErr);
      setStatus('error');
      trackError(appErr, 'Payment send submission error');
    }
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Send Stellar XLM Payment</h3>
      <p className={styles.subtitle}>Send a direct payment on Stellar testnet (e.g. initial hospital deposit or copay).</p>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="destination" className={styles.label}>Recipient Stellar Public Key (starts with G)</label>
          <input
            id="destination"
            type="text"
            className={styles.input}
            placeholder="e.g. GABC..."
            value={destination}
            onChange={(e) => setDestination(e.target.value.trim())}
            disabled={status === 'pending'}
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="amount" className={styles.label}>Amount (XLM)</label>
          <input
            id="amount"
            type="number"
            step="any"
            className={styles.input}
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={status === 'pending'}
            required
          />
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={status === 'pending'}
        >
          {status === 'pending' ? 'Submitting payment...' : 'Send XLM Payment'}
        </button>
      </form>

      {/* States Feedbacks */}
      {status === 'pending' && (
        <div className={styles.feedbackPending}>
          <span className={styles.spinner} />
          <span>Building transaction, signing, and submitting to Stellar network...</span>
        </div>
      )}

      {status === 'success' && txHash && (
        <div className={styles.feedbackSuccess}>
          <div className={styles.successTitle}>✅ Payment Transferred Successfully!</div>
          <p className={styles.successText}>Funds have been successfully sent on testnet.</p>
          <a
            href={EXPLORER_TX_URL(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.explorerLink}
          >
            View on Stellar Expert Explorer ↗
          </a>
        </div>
      )}

      {status === 'error' && error && (
        <div className={styles.feedbackError}>
          <div className={styles.errorTitle}>❌ Transaction Failed</div>
          <p className={styles.errorText}>{error.message}</p>
          <span className={styles.errorCode}>Code: {error.code}</span>
        </div>
      )}
    </div>
  );
};

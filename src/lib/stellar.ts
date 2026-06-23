import {
  Asset,
  Operation,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { horizonServer, withRetry } from './sorobanClient.ts';
import { NETWORK_PASSPHRASE } from '../config/stellar.ts';

/**
 * Fetches the native XLM balance of a Stellar public key.
 * Resolves 404 (unfunded) accounts as balance 0 and funded = false.
 */
export async function fetchXlmBalance(
  publicKey: string
): Promise<{ balance: number; isFunded: boolean }> {
  try {
    const account = await withRetry(() => horizonServer.loadAccount(publicKey));
    const nativeBalanceEntry = account.balances.find(
      (b: any) => b.asset_type === 'native'
    );
    const balance = nativeBalanceEntry ? parseFloat(nativeBalanceEntry.balance) : 0;
    return { balance, isFunded: true };
  } catch (error: any) {
    // Horizon returns HTTP 404 for unfunded accounts
    if (error?.response?.status === 404) {
      return { balance: 0, isFunded: false };
    }
    throw error;
  }
}

/**
 * Requests 10,000 XLM for a public key on Stellar Testnet using Friendbot.
 */
export async function fundAccountViaFriendbot(publicKey: string): Promise<void> {
  const url = `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`;
  
  await withRetry(async () => {
    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Friendbot funding failed: ${response.statusText}. ${body}`);
    }
  });
}

interface SendPaymentOptions {
  senderPublicKey: string;
  destination: string;
  amount: string;
  signTransaction: (txXdr: string) => Promise<{ signedTxXdr: string }>;
}

/**
 * Builds, signs (via wallet interface), and submits a standard XLM payment transaction on testnet.
 */
export async function sendNativePayment(
  options: SendPaymentOptions
): Promise<string> {
  const { senderPublicKey, destination, amount, signTransaction } = options;

  // 1. Fetch sender account details to get the current sequence number
  const account = await horizonServer.loadAccount(senderPublicKey);

  // 2. Check if destination account exists — if not, use createAccount instead of payment.
  //    Sending a payment to an unfunded address causes Horizon to return 400 (op_no_destination).
  let destinationFunded = true;
  try {
    await horizonServer.loadAccount(destination);
  } catch (err: any) {
    if (err?.response?.status === 404) {
      destinationFunded = false;
    } else {
      throw err;
    }
  }

  // 3. Build the transaction with either payment or createAccount operation.
  //    Use 10,000 stroops (0.001 XLM) as fee — testnet can reject the minimum
  //    100 stroops (BASE_FEE) during congestion.
  const builder = new TransactionBuilder(account, {
    fee: '10000',
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  if (destinationFunded) {
    builder.addOperation(
      Operation.payment({
        destination,
        asset: Asset.native(),
        amount,
      })
    );
  } else {
    // createAccount funds a new account with `startingBalance`
    builder.addOperation(
      Operation.createAccount({
        destination,
        startingBalance: amount,
      })
    );
  }

  const transaction = builder.setTimeout(30).build();
  const txXdr = transaction.toXDR();

  // 4. Request signature from the connected wallet
  const { signedTxXdr } = await signTransaction(txXdr);

  // 5. Parse the signed transaction XDR and submit to Horizon
  const signedTx = new Transaction(signedTxXdr, NETWORK_PASSPHRASE);

  try {
    const response = await horizonServer.submitTransaction(signedTx);

    if (!response.successful) {
      const errorDetails = (response as any).extras?.result_codes;
      throw new Error(
        `Transaction submission failed. Result codes: ${JSON.stringify(errorDetails)}`
      );
    }

    return response.hash;
  } catch (submitErr: any) {
    // Horizon SDK throws on 400/500 responses — extract the real error details
    const resultCodes =
      submitErr?.response?.data?.extras?.result_codes ||
      submitErr?.response?.extras?.result_codes;
    const txResult =
      submitErr?.response?.data?.extras?.result_xdr ||
      submitErr?.response?.extras?.result_xdr;

    if (resultCodes) {
      const ops = resultCodes.operations || [];
      const txCode = resultCodes.transaction || 'unknown';
      throw new Error(
        `Transaction failed (${txCode}): ${ops.join(', ') || 'no operation details'}. ` +
        `Ensure the destination account is funded and you have sufficient XLM balance.`
      );
    }

    // Re-throw with whatever info is available
    throw new Error(
      `Horizon submission error: ${submitErr.message || submitErr}` +
      (txResult ? ` | Result XDR: ${txResult}` : '')
    );
  }
}

import { Horizon, rpc, Contract, TransactionBuilder, xdr, Transaction } from '@stellar/stellar-sdk';
import { HORIZON_URL, SOROBAN_RPC_URL, NETWORK_PASSPHRASE } from '../config/stellar.ts';

// Central Horizon server instance
export const horizonServer = new Horizon.Server(HORIZON_URL);

// Central Soroban RPC server instance
export const sorobanRpcServer = new rpc.Server(SOROBAN_RPC_URL, {
  allowHttp: SOROBAN_RPC_URL.startsWith('http://'),
});

/**
 * Executes an async operation with exponential backoff retries.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (retries <= 0) throw error;
    const status = error?.response?.status;
    const isClientError = status >= 400 && status < 500 && status !== 429;
    if (isClientError) throw error;

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return withRetry(operation, retries - 1, delayMs * 2);
  }
}

interface ContractCallParams {
  contractId: string;
  methodName: string;
  args: xdr.ScVal[];
  senderPublicKey: string;
  signTransaction: (txXdr: string) => Promise<{ signedTxXdr: string }>;
}

/**
 * Handles the complete Soroban contract execution lifecycle:
 * Simulation -> Assembly -> Signing -> Submission -> Status Polling.
 */
export async function simulateAndSubmitContractCall(
  params: ContractCallParams
): Promise<{ hash: string; result?: xdr.ScVal }> {
  const { contractId, methodName, args, senderPublicKey, signTransaction } = params;

  // 1. Fetch sender account details
  const account = await horizonServer.loadAccount(senderPublicKey);
  const contract = new Contract(contractId);

  // 2. Build raw transaction with a sufficient base fee.
  // 10,000 stroops (0.001 XLM) avoids rejection during Testnet congestion.
  // The simulator will override this with the actual resource fee anyway.
  let tx: any = new TransactionBuilder(account, {
    fee: '10000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(methodName, ...args))
    .setTimeout(60)
    .build();

  // 3. Simulate the transaction using Soroban RPC
  const simResponse = await sorobanRpcServer.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResponse)) {
    throw new Error(`Simulation failed: ${simResponse.error}`);
  }

  // 4. Assemble transaction containing resource footprints and fees
  tx = rpc.assembleTransaction(tx, simResponse).build();

  // 5. Convert to XDR, request wallet signature, and parse the signed XDR
  const txXdr = tx.toXDR();
  const { signedTxXdr } = await signTransaction(txXdr);
  const signedTx = new Transaction(signedTxXdr, NETWORK_PASSPHRASE);

  // 6. Submit signed transaction to RPC server
  const sendResponse = await sorobanRpcServer.sendTransaction(signedTx);
  if (sendResponse.status === 'ERROR') {
    throw new Error(`RPC send failed: ${JSON.stringify(sendResponse.errorResult)}`);
  }

  const txHash = sendResponse.hash;

  // 7. Poll transaction status
  let attempts = 0;
  const maxAttempts = 15;
  const delayMs = 1500;

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    const txStatus = await sorobanRpcServer.getTransaction(txHash);

    if (txStatus.status === 'SUCCESS') {
      const result = txStatus.returnValue;
      return { hash: txHash, result };
    } else if (txStatus.status === 'FAILED') {
      throw new Error(`Transaction execution failed on-chain. XDR: ${txStatus.resultXdr}`);
    }
    attempts++;
  }

  throw new Error(`Transaction polling timed out after ${((maxAttempts * delayMs) / 1000).toFixed(0)}s`);
}

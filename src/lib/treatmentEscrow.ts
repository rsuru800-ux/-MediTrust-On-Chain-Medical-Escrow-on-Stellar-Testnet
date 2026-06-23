import {
  Account,
  Address,
  Contract,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
  rpc,
} from '@stellar/stellar-sdk';
import { sorobanRpcServer, simulateAndSubmitContractCall } from './sorobanClient.ts';
import { NETWORK_PASSPHRASE } from '../config/stellar.ts';

// Dummy public key for read-only simulations
const DUMMY_ACCOUNT = 'GB6QY2SV7NAFVB2QXIRXKGL56F67I422WN64T5XDVYXUPG23NPQS2RGD';

export interface EscrowDetails {
  patient: string;
  hospital: string;
  insurer: string | null;
  arbiter: string;
  amount: number; // converted to float XLM
  released_total: number; // converted to float XLM
  status: number; // enum (0: Pending, 1: Funded, 2: Released, 3: Refunded, 4: Disputed)
  token: string;
}

interface EscrowActionParams {
  escrowId: string;
  senderPublicKey: string;
  signTransaction: (txXdr: string) => Promise<{ signedTxXdr: string }>;
}

/**
 * Fetches all details for a specific escrow contract instance.
 */
export async function getEscrowDetails(escrowId: string): Promise<EscrowDetails> {
  const dummyAccount = new Account(DUMMY_ACCOUNT, '0');
  const contract = new Contract(escrowId);

  const tx = new TransactionBuilder(dummyAccount, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get_details'))
    .setTimeout(30)
    .build();

  const response = await sorobanRpcServer.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(response)) {
    throw new Error(`Simulation failed: ${response.error}`);
  }

  const resultVal = response.result?.retval;
  if (!resultVal) {
    throw new Error('Simulation succeeded but returned empty values.');
  }

  const native = scValToNative(resultVal);

  return {
    patient: native.patient,
    hospital: native.hospital,
    insurer: native.insurer || null,
    arbiter: native.arbiter,
    amount: Number(native.amount) / 10000000,
    released_total: Number(native.released_total) / 10000000,
    status: native.status,
    token: native.token,
  };
}

/**
 * Deposits the contract amount into the escrow (Patient action).
 */
export async function depositToEscrow(params: EscrowActionParams): Promise<string> {
  const { escrowId, senderPublicKey, signTransaction } = params;

  const response = await simulateAndSubmitContractCall({
    contractId: escrowId,
    methodName: 'deposit',
    args: [],
    senderPublicKey,
    signTransaction,
  });

  return response.hash;
}

/**
 * Releases a partial amount to the hospital (Hospital action).
 */
export async function partialReleaseEscrow(
  params: EscrowActionParams & { amount: string }
): Promise<string> {
  const { escrowId, amount, senderPublicKey, signTransaction } = params;
  
  // Convert float amount to stroops (bigint)
  const amountBigInt = BigInt(Math.round(parseFloat(amount) * 10000000));
  const amountScVal = nativeToScVal(amountBigInt, { type: 'i128' });

  const response = await simulateAndSubmitContractCall({
    contractId: escrowId,
    methodName: 'partial_release',
    args: [amountScVal],
    senderPublicKey,
    signTransaction,
  });

  return response.hash;
}

/**
 * Releases all remaining funds to the hospital (Hospital action).
 */
export async function releaseEscrow(params: EscrowActionParams): Promise<string> {
  const { escrowId, senderPublicKey, signTransaction } = params;

  const response = await simulateAndSubmitContractCall({
    contractId: escrowId,
    methodName: 'release',
    args: [],
    senderPublicKey,
    signTransaction,
  });

  return response.hash;
}

/**
 * Refunds remaining funds back to the patient (Patient action).
 */
export async function refundEscrow(params: EscrowActionParams): Promise<string> {
  const { escrowId, senderPublicKey, signTransaction } = params;

  const response = await simulateAndSubmitContractCall({
    contractId: escrowId,
    methodName: 'refund',
    args: [],
    senderPublicKey,
    signTransaction,
  });

  return response.hash;
}

/**
 * Files a dispute on the escrow, locking funds (Patient or Hospital action).
 */
export async function disputeEscrow(params: EscrowActionParams): Promise<string> {
  const { escrowId, senderPublicKey, signTransaction } = params;
  
  const callerScVal = Address.fromString(senderPublicKey).toScVal();

  const response = await simulateAndSubmitContractCall({
    contractId: escrowId,
    methodName: 'dispute',
    args: [callerScVal],
    senderPublicKey,
    signTransaction,
  });

  return response.hash;
}

/**
 * Resolves a dispute, sending remaining funds to hospital or patient (Arbiter action).
 */
export async function resolveDisputeEscrow(
  params: EscrowActionParams & { releaseToHospital: boolean }
): Promise<string> {
  const { escrowId, releaseToHospital, senderPublicKey, signTransaction } = params;
  
  const releaseToHospitalScVal = nativeToScVal(releaseToHospital);

  const response = await simulateAndSubmitContractCall({
    contractId: escrowId,
    methodName: 'resolve_dispute',
    args: [releaseToHospitalScVal],
    senderPublicKey,
    signTransaction,
  });

  return response.hash;
}

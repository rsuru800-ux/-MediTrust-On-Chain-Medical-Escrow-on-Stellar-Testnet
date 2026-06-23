import {
  Account,
  Address,
  Contract,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { sorobanRpcServer, simulateAndSubmitContractCall } from './sorobanClient.ts';
import { NETWORK_PASSPHRASE, NATIVE_TOKEN_ADDRESS } from '../config/stellar.ts';

// Dummy public key for read-only simulations
const DUMMY_ACCOUNT = 'GB6QY2SV7NAFVB2QXIRXKGL56F67I422WN64T5XDVYXUPG23NPQS2RGD';

export interface CreateEscrowParams {
  factoryContractId: string;
  patientAddress: string;
  hospitalAddress: string;
  insurerAddress?: string;
  arbiterAddress: string;
  amount: string; // Float string
  senderPublicKey: string;
  signTransaction: (txXdr: string) => Promise<{ signedTxXdr: string }>;
}

/**
 * Creates a new treatment escrow via the factory contract.
 */
export async function createEscrow(params: CreateEscrowParams): Promise<string> {
  const {
    factoryContractId,
    patientAddress,
    hospitalAddress,
    insurerAddress,
    arbiterAddress,
    amount,
    senderPublicKey,
    signTransaction,
  } = params;

  // Convert amount (e.g. 10.5 XLM) to stroops (base units with 7 decimals)
  const amountBigInt = BigInt(Math.round(parseFloat(amount) * 10000000));

  // Build salt using cryptography API
  const saltBytes = window.crypto.getRandomValues(new Uint8Array(32));
  const saltScVal = xdr.ScVal.scvBytes(saltBytes as unknown as Buffer);

  // Convert inputs to Soroban ScVal types
  const patientScVal = Address.fromString(patientAddress).toScVal();
  const hospitalScVal = Address.fromString(hospitalAddress).toScVal();
  const insurerScVal = insurerAddress
    ? Address.fromString(insurerAddress).toScVal()
    : xdr.ScVal.scvVoid();
  const arbiterScVal = Address.fromString(arbiterAddress).toScVal();
  const amountScVal = nativeToScVal(amountBigInt, { type: 'i128' });
  const tokenScVal = Address.fromString(NATIVE_TOKEN_ADDRESS).toScVal();

  const args = [
    patientScVal,
    hospitalScVal,
    insurerScVal,
    arbiterScVal,
    amountScVal,
    tokenScVal,
    saltScVal,
  ];

  const response = await simulateAndSubmitContractCall({
    contractId: factoryContractId,
    methodName: 'create_escrow',
    args,
    senderPublicKey,
    signTransaction,
  });

  if (!response.result) {
    throw new Error('Transaction succeeded but contract return value is missing.');
  }

  // Deployed escrow address is returned by the contract
  const escrowAddress = scValToNative(response.result) as string;
  return escrowAddress;
}

/**
 * Fetches all deployed escrows registered on the factory.
 */
export async function getEscrows(factoryContractId: string): Promise<string[]> {
  const dummyAccount = new Account(DUMMY_ACCOUNT, '0');
  const contract = new Contract(factoryContractId);

  const tx = new TransactionBuilder(dummyAccount, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get_escrows'))
    .setTimeout(30)
    .build();

  const response = await sorobanRpcServer.simulateTransaction(tx);
  if (sorobanRpcServer.simulateTransaction.name && !response) {
    throw new Error('Simulation returned empty result');
  }

  if (rpc.Api.isSimulationError(response)) {
    throw new Error(`Simulation failed: ${response.error}`);
  }

  const resultVal = response.result?.retval;
  if (!resultVal) return [];

  return scValToNative(resultVal) as string[];
}

/**
 * Fetches the status of a dynamic escrow using the factory's cross-contract call method.
 * Returns enum status number (0: Pending, 1: Funded, 2: Released, 3: Refunded, 4: Disputed).
 */
export async function getEscrowStatus(
  factoryContractId: string,
  escrowAddress: string
): Promise<number> {
  const dummyAccount = new Account(DUMMY_ACCOUNT, '0');
  const contract = new Contract(factoryContractId);
  const escrowScVal = Address.fromString(escrowAddress).toScVal();

  const tx = new TransactionBuilder(dummyAccount, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get_escrow_status', escrowScVal))
    .setTimeout(30)
    .build();

  const response = await sorobanRpcServer.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(response)) {
    throw new Error(`Simulation failed: ${response.error}`);
  }

  const resultVal = response.result?.retval;
  if (!resultVal) return 0;

  return scValToNative(resultVal) as number;
}

// Import rpc namespace from stellar-sdk for type validation helpers
import { rpc } from '@stellar/stellar-sdk';

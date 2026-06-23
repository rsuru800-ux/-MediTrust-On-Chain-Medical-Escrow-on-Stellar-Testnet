import { StrKey } from '@stellar/stellar-sdk';

/**
 * Validates whether a string is a well-formed Stellar public key (G...)
 */
export const isValidStellarAddress = (address: string): boolean => {
  if (!address || address.length !== 56) return false;
  return StrKey.isValidEd25519PublicKey(address);
};

/**
 * Validates whether a string is a well-formed Soroban contract ID (C...)
 */
export const isValidContractId = (contractId: string): boolean => {
  if (!contractId || contractId.length !== 56) return false;
  return StrKey.isValidContract(contractId);
};

/**
 * Validates whether a string is a well-formed Stellar Address OR Contract ID
 */
export const isValidAddressOrContract = (address: string): boolean => {
  return isValidStellarAddress(address) || isValidContractId(address);
};

/**
 * Validates whether the sending amount is a positive number and
 * doesn't exceed the available balance minus the base reserve.
 * 
 * @param amount String value of amount to send
 * @param availableBalance Current native XLM balance of account
 * @param baseReserve Reserve to preserve (defaults to 1.5 XLM)
 */
export const validatePaymentAmount = (
  amount: string,
  availableBalance: number,
  baseReserve = 1.5
): { isValid: boolean; error?: string } => {
  const parsed = parseFloat(amount);
  
  if (isNaN(parsed) || parsed <= 0) {
    return { isValid: false, error: 'Amount must be a positive number.' };
  }

  const maxSpendable = availableBalance - baseReserve;
  if (maxSpendable <= 0) {
    return {
      isValid: false,
      error: `Your balance is below the minimum base reserve of ${baseReserve} XLM. Please fund your account.`,
    };
  }

  if (parsed > maxSpendable) {
    return {
      isValid: false,
      error: `Amount exceeds maximum spendable balance of ${maxSpendable.toFixed(4)} XLM (available balance: ${availableBalance.toFixed(4)} XLM, reserving ${baseReserve} XLM for network fees).`,
    };
  }

  return { isValid: true };
};

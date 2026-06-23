export interface AppError {
  code: string;
  message: string;
  cause?: any;
}

export const mapToAppError = (error: any): AppError => {
  if (!error) {
    return {
      code: 'UNKNOWN',
      message: 'An unexpected error occurred. Please try again.',
    };
  }

  // Already an AppError
  if (typeof error === 'object' && 'code' in error && 'message' in error) {
    return error as AppError;
  }

  const message = error.message || String(error);
  const lowercaseMsg = message.toLowerCase();

  // 1. Freighter / Wallet Rejection
  if (
    lowercaseMsg.includes('user declined') ||
    lowercaseMsg.includes('rejected') ||
    lowercaseMsg.includes('declined') ||
    lowercaseMsg.includes('cancel') ||
    error.code === 'user_declined' ||
    error.status === 'rejected'
  ) {
    return {
      code: 'USER_REJECTED',
      message: 'Transaction signature request was rejected in your wallet.',
      cause: error,
    };
  }

  // 2. Insufficient Balance
  if (
    lowercaseMsg.includes('insufficient_balance') ||
    lowercaseMsg.includes('op_underfunded') ||
    lowercaseMsg.includes('underfunded') ||
    lowercaseMsg.includes('insufficient balance')
  ) {
    return {
      code: 'INSUFFICIENT_BALANCE',
      message: 'Your wallet has insufficient XLM balance to complete this transaction (accounting for base reserve).',
      cause: error,
    };
  }

  // 3. Malformed Destination / Address
  if (
    lowercaseMsg.includes('invalid address') ||
    lowercaseMsg.includes('malformed') ||
    lowercaseMsg.includes('op_no_destination') ||
    lowercaseMsg.includes('no destination') ||
    lowercaseMsg.includes('destination address is invalid')
  ) {
    return {
      code: 'INVALID_ADDRESS',
      message: 'The destination wallet address is invalid or malformed.',
      cause: error,
    };
  }

  // 4. Contract Logic & Authorization Errors
  if (
    lowercaseMsg.includes('auth') ||
    lowercaseMsg.includes('unauthorized') ||
    lowercaseMsg.includes('require_auth') ||
    lowercaseMsg.includes('unauthorized caller')
  ) {
    return {
      code: 'UNAUTHORIZED_CALLER',
      message: 'Unauthorized caller: Your connected address does not have authorization to perform this action.',
      cause: error,
    };
  }

  if (
    lowercaseMsg.includes('must be pending') ||
    lowercaseMsg.includes('must be funded') ||
    lowercaseMsg.includes('must be disputed') ||
    lowercaseMsg.includes('already initialized') ||
    lowercaseMsg.includes('exceeds escrow balance')
  ) {
    return {
      code: 'CONTRACT_LOGIC_ERROR',
      message: `Escrow condition violated: ${message}`,
      cause: error,
    };
  }

  // 5. Network / Infrastructure Errors
  if (
    lowercaseMsg.includes('timeout') ||
    lowercaseMsg.includes('network error') ||
    lowercaseMsg.includes('failed to fetch') ||
    lowercaseMsg.includes('404') ||
    lowercaseMsg.includes('500') ||
    lowercaseMsg.includes('502') ||
    lowercaseMsg.includes('503') ||
    lowercaseMsg.includes('504') ||
    lowercaseMsg.includes('rpc') ||
    lowercaseMsg.includes('horizon')
  ) {
    return {
      code: 'NETWORK_INFRASTRUCTURE_ERROR',
      message: 'Network or RPC connection failed. The Stellar testnet nodes may be congested or temporarily unreachable.',
      cause: error,
    };
  }

  return {
    code: 'GENERIC_ERROR',
    message: message || 'An error occurred while communicating with the Stellar network.',
    cause: error,
  };
};

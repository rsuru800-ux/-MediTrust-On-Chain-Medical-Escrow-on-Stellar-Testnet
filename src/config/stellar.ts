/**
 * MediTrust Stellar and Soroban configuration.
 * Consolidates all environment variables and provides fallbacks for Testnet.
 * 
 * To switch to MAINNET in the future:
 * 1. Update VITE_STELLAR_NETWORK to 'mainnet' in the .env file.
 * 2. Update VITE_HORIZON_URL to 'https://horizon.stellar.org'.
 * 3. Update VITE_SOROBAN_RPC_URL to a mainnet Soroban RPC provider.
 * 4. Replace VITE_ESCROW_FACTORY_CONTRACT_ID with the mainnet deployed factory contract ID.
 * 5. Replace VITE_NATIVE_TOKEN_ADDRESS with the native XLM token address on mainnet (usually CAS3EBOJBI3SM5CT6S2F45P5ND5UFS2H7WOHICG2RRMKFAKBA7E3C44A).
 */

const getEnv = (key: string, defaultValue: string): string => {
  return import.meta.env[key] || defaultValue;
};

export const STELLAR_NETWORK = getEnv('VITE_STELLAR_NETWORK', 'testnet');

export const NETWORK_PASSPHRASE = STELLAR_NETWORK === 'mainnet'
  ? 'Public Global Stellar Network ; October 2005'
  : 'Test SDF Network ; September 2015';

export const HORIZON_URL = getEnv('VITE_HORIZON_URL', 'https://horizon-testnet.stellar.org');

export const SOROBAN_RPC_URL = getEnv('VITE_SOROBAN_RPC_URL', 'https://soroban-testnet.stellar.org');

export const ESCROW_FACTORY_CONTRACT_ID = getEnv(
  'VITE_ESCROW_FACTORY_CONTRACT_ID',
  'CAUCNUPYKUHM5OTSR4KJWYP4CFBWUTO5GKBQJY26UOXBUGEF6CAIIABM'
);

export const NATIVE_TOKEN_ADDRESS = getEnv(
  'VITE_NATIVE_TOKEN_ADDRESS',
  'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'
);

export const EXPLORER_TX_URL = (hash: string) => {
  return STELLAR_NETWORK === 'mainnet'
    ? `https://stellar.expert/explorer/public/tx/${hash}`
    : `https://stellar.expert/explorer/testnet/tx/${hash}`;
};

export const EXPLORER_ACCOUNT_URL = (address: string) => {
  return STELLAR_NETWORK === 'mainnet'
    ? `https://stellar.expert/explorer/public/account/${address}`
    : `https://stellar.expert/explorer/testnet/account/${address}`;
};

export const EXPLORER_CONTRACT_URL = (contractId: string) => {
  return STELLAR_NETWORK === 'mainnet'
    ? `https://stellar.expert/explorer/public/contract/${contractId}`
    : `https://stellar.expert/explorer/testnet/contract/${contractId}`;
};

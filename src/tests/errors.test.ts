import { describe, it, expect } from 'vitest';
import { mapToAppError } from '../utils/errors.ts';

describe('mapToAppError', () => {
  it('should map Freighter user rejection error', () => {
    const rawError = { message: 'User declined the signing request' };
    const mapped = mapToAppError(rawError);
    expect(mapped.code).toBe('USER_REJECTED');
    expect(mapped.message).toContain('rejected');
  });

  it('should map Horizon insufficient balance error', () => {
    const rawError = { message: 'op_underfunded' };
    const mapped = mapToAppError(rawError);
    expect(mapped.code).toBe('INSUFFICIENT_BALANCE');
    expect(mapped.message).toContain('insufficient XLM balance');
  });

  it('should map malformed address error', () => {
    const rawError = { message: 'op_no_destination' };
    const mapped = mapToAppError(rawError);
    expect(mapped.code).toBe('INVALID_ADDRESS');
    expect(mapped.message).toContain('invalid or malformed');
  });

  it('should map unauthorized contract callers', () => {
    const rawError = { message: 'HostError: Error(Auth, InvalidAction)' };
    const mapped = mapToAppError(rawError);
    expect(mapped.code).toBe('UNAUTHORIZED_CALLER');
    expect(mapped.message).toContain('does not have authorization');
  });

  it('should map network timeouts and RPC errors', () => {
    const rawError = { message: 'failed to fetch rpc endpoint' };
    const mapped = mapToAppError(rawError);
    expect(mapped.code).toBe('NETWORK_INFRASTRUCTURE_ERROR');
    expect(mapped.message).toContain('Network or RPC connection failed');
  });
});

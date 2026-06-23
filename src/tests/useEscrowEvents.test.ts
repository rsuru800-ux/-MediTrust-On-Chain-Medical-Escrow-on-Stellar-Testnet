import { vi, describe, it, expect } from 'vitest';
import { parseRpcEvent } from '../hooks/useEscrowEvents.ts';

// Mock scValToNative as an identity mapping for test ease
vi.mock('@stellar/stellar-sdk', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return new Proxy(actual, {
    get(target, prop) {
      if (prop === 'scValToNative') {
        return (val: any) => val;
      }
      return target[prop];
    },
  });
});

describe('parseRpcEvent', () => {
  it('should parse contract created event', () => {
    const mockEvt = {
      id: '0001-01',
      ledger: 10,
      topic: ['created', 'G_PATIENT', 'G_HOSPITAL'],
      value: 500000000, // 50 XLM in stroops (7 decimals)
    };

    const parsed = parseRpcEvent(mockEvt);
    expect(parsed.type).toBe('created');
    expect(parsed.amount).toBe(50);
    expect(parsed.actor).toBe('G_PATIENT');
    expect(parsed.message).toContain('initialized by patient');
  });

  it('should parse deposited event', () => {
    const mockEvt = {
      id: '0001-02',
      ledger: 12,
      topic: ['deposited', 'G_PATIENT'],
      value: 1000000000, // 100 XLM
    };

    const parsed = parseRpcEvent(mockEvt);
    expect(parsed.type).toBe('deposited');
    expect(parsed.amount).toBe(100);
    expect(parsed.actor).toBe('G_PATIENT');
    expect(parsed.message).toContain('locked 100.00 XLM');
  });

  it('should parse released events (partial mode)', () => {
    const mockEvt = {
      id: '0001-03',
      ledger: 15,
      topic: ['released', 'G_HOSPITAL', 'partial'],
      value: 200000000, // 20 XLM
    };

    const parsed = parseRpcEvent(mockEvt);
    expect(parsed.type).toBe('released');
    expect(parsed.amount).toBe(20);
    expect(parsed.actor).toBe('G_HOSPITAL');
    expect(parsed.message).toContain('PARTIAL');
    expect(parsed.message).toContain('released to hospital');
  });

  it('should parse disputed events', () => {
    const mockEvt = {
      id: '0001-04',
      ledger: 20,
      topic: ['disputed', 'G_PATIENT'],
      value: 1, // status enum
    };

    const parsed = parseRpcEvent(mockEvt);
    expect(parsed.type).toBe('disputed');
    expect(parsed.actor).toBe('G_PATIENT');
    expect(parsed.message).toContain('dispute was formally filed');
  });

  it('should parse resolved events', () => {
    const mockEvt = {
      id: '0001-05',
      ledger: 25,
      topic: ['resolved', 'G_ARBITER'],
      value: true, // payout to hospital is true
    };

    const parsed = parseRpcEvent(mockEvt);
    expect(parsed.type).toBe('resolved');
    expect(parsed.actor).toBe('G_ARBITER');
    expect(parsed.message).toContain('Dispute resolved by arbiter');
    expect(parsed.message).toContain('Hospital');
  });

  it('should parse refunded events', () => {
    const mockEvt = {
      id: '0001-06',
      ledger: 30,
      topic: ['refunded', 'G_PATIENT'],
      value: 800000000, // 80 XLM
    };

    const parsed = parseRpcEvent(mockEvt);
    expect(parsed.type).toBe('refunded');
    expect(parsed.amount).toBe(80);
    expect(parsed.actor).toBe('G_PATIENT');
    expect(parsed.message).toContain('claimed refund of 80.00 XLM');
  });
});

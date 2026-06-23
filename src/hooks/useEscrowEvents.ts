import { useState, useEffect, useRef } from 'react';
import { sorobanRpcServer, withRetry } from '../lib/sorobanClient.ts';
import { scValToNative } from '@stellar/stellar-sdk';
import { trackError } from '../utils/analytics.ts';

export interface EscrowEventLog {
  id: string;
  ledger: number;
  timestamp: string;
  type: 'created' | 'deposited' | 'released' | 'disputed' | 'resolved' | 'refunded' | 'unknown';
  message: string;
  amount?: number;
  actor?: string;
  details?: any;
}

/**
 * Decodes a raw Soroban event and formats it into a human-readable log entry.
 */
export function parseRpcEvent(evt: any): EscrowEventLog {
  const topics = evt.topic.map((t: any) => scValToNative(t));
  const value = scValToNative(evt.value);
  const typeStr = String(topics[0] || '').toLowerCase();
  
  let type: EscrowEventLog['type'] = 'unknown';
  let message = 'Unknown escrow activity';
  let amount: number | undefined;
  let actor: string | undefined;

  if (typeStr.includes('created')) {
    type = 'created';
    amount = Number(value) / 10000000;
    actor = String(topics[1] || '');
    message = `Escrow treatment plan initialized by patient (${actor.slice(0, 4)}...${actor.slice(-4)}) for ${amount.toFixed(2)} XLM.`;
  } else if (typeStr.includes('deposited')) {
    type = 'deposited';
    amount = Number(value) / 10000000;
    actor = String(topics[1] || '');
    message = `Funds deposited! Patient (${actor.slice(0, 4)}...${actor.slice(-4)}) locked ${amount.toFixed(2)} XLM in escrow.`;
  } else if (typeStr.includes('released')) {
    type = 'released';
    amount = Number(value) / 10000000;
    actor = String(topics[1] || '');
    const mode = String(topics[2] || 'partial');
    message = `${mode.toUpperCase()} settlement payout of ${amount.toFixed(2)} XLM released to hospital (${actor.slice(0, 4)}...${actor.slice(-4)}).`;
  } else if (typeStr.includes('disputed')) {
    type = 'disputed';
    actor = String(topics[1] || '');
    message = `A dispute was formally filed by (${actor.slice(0, 4)}...${actor.slice(-4)}). Funds locked.`;
  } else if (typeStr.includes('resolved')) {
    type = 'resolved';
    actor = String(topics[1] || '');
    const toHospital = !!value;
    message = `Dispute resolved by arbiter (${actor.slice(0, 4)}...${actor.slice(-4)}). Remaining funds routed to ${toHospital ? 'Hospital' : 'Patient'}.`;
  } else if (typeStr.includes('refunded')) {
    type = 'refunded';
    amount = Number(value) / 10000000;
    actor = String(topics[1] || '');
    message = `Treatment escrow refunded. Patient (${actor.slice(0, 4)}...${actor.slice(-4)}) claimed refund of ${amount.toFixed(2)} XLM.`;
  }

  return {
    id: evt.id,
    ledger: evt.ledger,
    timestamp: '12:00:00 PM', // Fixed in parsing for test consistency; updated to localTimeString on runtime
    type,
    message,
    amount,
    actor,
    details: value,
  };
}

/**
 * Custom hook to subscribe to and stream events emitted by a specific Escrow contract.
 */
export const useEscrowEvents = (escrowId: string | null) => {
  const [events, setEvents] = useState<EscrowEventLog[]>([]);
  const [status, setStatus] = useState<'live' | 'reconnecting' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const startLedgerRef = useRef<number>(0);
  const timerRef = useRef<any>(null);
  const retryCountRef = useRef<number>(0);
  const maxRetries = 5;

  const fetchEvents = async () => {
    if (!escrowId) return;

    try {
      if (startLedgerRef.current === 0) {
        const latestLedger = await withRetry(async () => {
          const info = await sorobanRpcServer.getLatestLedger();
          return info.sequence;
        }, 2, 500);
        startLedgerRef.current = Math.max(1, latestLedger - 10000);
      }

      const response = await sorobanRpcServer.getEvents({
        startLedger: startLedgerRef.current,
        filters: [
          {
            type: 'contract',
            contractIds: [escrowId],
          },
        ],
        limit: 50,
      });

      setStatus('live');
      setError(null);
      retryCountRef.current = 0;

      if (response && response.events && response.events.length > 0) {
        const parsedEvents: EscrowEventLog[] = response.events.map((evt) => {
          const parsed = parseRpcEvent(evt);
          parsed.timestamp = new Date().toLocaleTimeString(); // Set actual timestamp at runtime

          if (evt.ledger > startLedgerRef.current) {
            startLedgerRef.current = evt.ledger + 1;
          }

          return parsed;
        });

        setEvents((prev) => {
          const existingIds = new Set(prev.map((e) => e.id));
          const newUniqueEvents = parsedEvents.filter((e) => !existingIds.has(e.id));
          return [...prev, ...newUniqueEvents];
        });
      }
    } catch (err: any) {
      handlePollFailure(err);
    }
  };

  const handlePollFailure = (err: any) => {
    trackError(err, 'useEscrowEvents poll failure');
    setStatus('reconnecting');
    setError(err?.message || 'RPC Event connection failed.');

    retryCountRef.current++;
    if (retryCountRef.current >= maxRetries) {
      setStatus('disconnected');
      setError('Event sync disconnected. RPC server is unreachable.');
      stopPolling();
    }
  };

  const startPolling = () => {
    stopPolling();
    fetchEvents();
    timerRef.current = setInterval(fetchEvents, 4000);
  };

  const stopPolling = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (escrowId) {
      setEvents([]);
      startLedgerRef.current = 0;
      retryCountRef.current = 0;
      startPolling();
    } else {
      setEvents([]);
      setStatus('disconnected');
      stopPolling();
    }

    return () => stopPolling();
  }, [escrowId]);

  return {
    events,
    status,
    error,
    refreshEvents: fetchEvents,
  };
};

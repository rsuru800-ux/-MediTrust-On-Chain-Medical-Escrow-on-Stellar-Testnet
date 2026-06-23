import React from 'react';
import styles from './ActivityTimeline.module.css';
import { EscrowEventLog } from '../hooks/useEscrowEvents.ts';

interface ActivityTimelineProps {
  events: EscrowEventLog[];
  status: 'live' | 'reconnecting' | 'disconnected';
  error: string | null;
  onRefresh: () => void;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  events,
  status,
  error,
  onRefresh,
}) => {
  const getStatusBadgeClass = () => {
    switch (status) {
      case 'live':
        return styles.statusLive;
      case 'reconnecting':
        return styles.statusReconnecting;
      case 'disconnected':
        return styles.statusDisconnected;
      default:
        return '';
    }
  };

  const getEventIcon = (type: EscrowEventLog['type']) => {
    switch (type) {
      case 'created':
        return '📋';
      case 'deposited':
        return '💰';
      case 'released':
        return '🔑';
      case 'disputed':
        return '⚖️';
      case 'resolved':
        return '🤝';
      case 'refunded':
        return '⏪';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Escrow Activity Timeline</h3>
        <div className={styles.statusGroup}>
          <span className={`${styles.statusBadge} ${getStatusBadgeClass()}`}>
            <span className={styles.pulseDot} />
            {status.toUpperCase()}
          </span>
          <button className={styles.refreshButton} onClick={onRefresh} title="Sync events manually">
            🔄
          </button>
        </div>
      </div>

      {error && <div className={styles.errorMessage}>⚠️ {error}</div>}

      <div className={styles.timelineList}>
        {events.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>No on-chain events found for this treatment escrow.</p>
            <p className={styles.emptySubText}>Events will stream here automatically upon deposits or releases.</p>
          </div>
        ) : (
          events
            .slice()
            .reverse() // Display newest events first
            .map((event) => (
              <div key={event.id} className={styles.timelineItem}>
                <div className={styles.iconCol}>
                  <div className={`${styles.eventIcon} ${styles[event.type]}`}>
                    {getEventIcon(event.type)}
                  </div>
                  <div className={styles.connectorLine} />
                </div>
                <div className={styles.contentCol}>
                  <div className={styles.itemHeader}>
                    <span className={styles.eventType}>{event.type.toUpperCase()}</span>
                    <span className={styles.timestamp}>{event.timestamp}</span>
                  </div>
                  <p className={styles.message}>{event.message}</p>
                  <div className={styles.metaRow}>
                    <span className={styles.ledger}>Ledger: #{event.ledger}</span>
                    <span className={styles.eventId}>Event ID: {event.id.slice(0, 16)}...</span>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
};

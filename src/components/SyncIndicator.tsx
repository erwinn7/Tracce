import React from 'react';
import type { SyncState } from '../hooks/useSync';

interface SyncIndicatorProps {
  syncState: SyncState;
  pendingCount?: number;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  syncState,
  pendingCount = 0,
}) => {
  return (
    <div className={`sync-indicator sync-indicator-${syncState}`} role="status">
      <span className="sync-dot" />
      <span className="sync-text">
        {syncState === 'offline' && 'Hors ligne'}
        {syncState === 'pending' && `En attente (${pendingCount})`}
        {syncState === 'synced' && 'Synchronisé'}
      </span>
    </div>
  );
};

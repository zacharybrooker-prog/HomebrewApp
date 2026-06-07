import * as Y from 'yjs';

export interface SyncProvider {
  /** Connects to the host/server and begins syncing the provided doc */
  connect(): void;
  /** Disconnects from the host/server */
  disconnect(): void;
  /** Emits when the connection state changes */
  onStatusChange(callback: (status: 'connecting' | 'connected' | 'disconnected') => void): void;
}

/**
 * Common configuration for a provider.
 */
export interface SyncProviderConfig {
  doc: Y.Doc;
  url: string;
  campaignId: string;
  token?: string; // JWT for Cloud Provider
  role?: 'dm' | 'player';
  participantId?: string;
}

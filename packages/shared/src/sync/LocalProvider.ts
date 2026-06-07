import { WebsocketProvider } from 'y-websocket';
import type { SyncProvider, SyncProviderConfig } from '../sync';

export class LocalProvider implements SyncProvider {
  private provider: WebsocketProvider;
  private statusCallbacks: Set<(status: 'connecting' | 'connected' | 'disconnected') => void> = new Set();

  constructor(config: SyncProviderConfig) {
    // Pass role and participantId as connection params so the server can gate access
    const url = new URL(config.url);
    if (config.role) url.searchParams.set('role', config.role);
    if (config.participantId) url.searchParams.set('participantId', config.participantId);

    this.provider = new WebsocketProvider(
      url.toString(),
      config.campaignId,
      config.doc,
      { connect: false } // we manually connect
    );

    this.provider.on('status', (event: { status: 'connecting' | 'connected' | 'disconnected' }) => {
      this.statusCallbacks.forEach(cb => cb(event.status));
    });
  }

  connect(): void {
    this.provider.connect();
  }

  disconnect(): void {
    this.provider.disconnect();
  }

  onStatusChange(callback: (status: 'connecting' | 'connected' | 'disconnected') => void): void {
    this.statusCallbacks.add(callback);
  }
}

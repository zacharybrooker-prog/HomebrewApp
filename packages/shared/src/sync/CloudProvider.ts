import { WebsocketProvider } from 'y-websocket';
import type { SyncProvider, SyncProviderConfig } from '../sync';

export class CloudProvider implements SyncProvider {
  private provider: WebsocketProvider;
  private statusCallbacks: Set<(status: 'connecting' | 'connected' | 'disconnected') => void> = new Set();

  constructor(config: SyncProviderConfig) {
    // Fastify/ws needs the token either in the query params or we pass it
    const url = new URL(config.url);
    if (config.token) url.searchParams.set('token', config.token);
    
    this.provider = new WebsocketProvider(
      url.toString(),
      config.campaignId,
      config.doc,
      { connect: false }
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

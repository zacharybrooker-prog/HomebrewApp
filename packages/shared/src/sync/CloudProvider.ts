import { WebsocketProvider } from 'y-websocket';
import type { SyncProvider, SyncProviderConfig } from '../sync';

export class CloudProvider implements SyncProvider {
  private provider: WebsocketProvider;
  private statusCallbacks: Set<(status: 'connecting' | 'connected' | 'disconnected') => void> = new Set();

  constructor(config: SyncProviderConfig) {
    this.provider = new WebsocketProvider(
      config.url,
      config.campaignId,
      config.doc,
      { 
        connect: false,
        params: config.token ? { token: config.token } : {}
      }
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

import type { SyncProvider, SyncProviderConfig } from '../sync';
import { PeerJsProvider } from './PeerJsProvider';

export class CloudProvider implements SyncProvider {
  private provider: PeerJsProvider;
  
  constructor(config: SyncProviderConfig) {
    const isHost = config.role === 'dm';
    this.provider = new PeerJsProvider(config.doc, config.campaignId, isHost);
  }

  connect(): void {
    this.provider.connect();
  }

  disconnect(): void {
    this.provider.disconnect();
  }

  onStatusChange(callback: (status: 'connecting' | 'connected' | 'disconnected') => void): void {
    this.provider.onStatusChange(callback);
  }
}

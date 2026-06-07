import { WebrtcProvider } from 'y-webrtc';
import type { SyncProvider, SyncProviderConfig } from '../sync';

export class CloudProvider implements SyncProvider {
  private provider: WebrtcProvider;
  private statusCallbacks: Set<(status: 'connecting' | 'connected' | 'disconnected') => void> = new Set();
  
  constructor(config: SyncProviderConfig) {
    this.provider = new WebrtcProvider(
      `frogs-world-campaign-${config.campaignId}`,
      config.doc,
      {
        signaling: [
          'wss://signaling.yjs.dev',
          'wss://y-webrtc-signaling-eu.herokuapp.com',
          'wss://y-webrtc-signaling-us.herokuapp.com'
        ],
        password: config.campaignId // optional password for room
      }
    );
    
    this.provider.on('synced', (state: { synced: boolean }) => {
      this.statusCallbacks.forEach(cb => cb(state.synced ? 'connected' : 'connecting'));
    });

    this.provider.on('peers', () => {
      this.statusCallbacks.forEach(cb => cb('connected'));
    });
  }

  connect(): void {
    this.provider.connect();
    this.statusCallbacks.forEach(cb => cb('connected'));
  }

  disconnect(): void {
    this.provider.disconnect();
    this.statusCallbacks.forEach(cb => cb('disconnected'));
  }

  onStatusChange(callback: (status: 'connecting' | 'connected' | 'disconnected') => void): void {
    this.statusCallbacks.add(callback);
    callback('connecting'); // Initial state
  }
}

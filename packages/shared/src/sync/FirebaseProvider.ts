import * as Y from 'yjs';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import type { SyncProvider } from '../sync';

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export class FirebaseProvider implements SyncProvider {
  private updateHandler: (_update: Uint8Array, origin: any) => void;
  private unsubscribe: (() => void) | null = null;
  private timeoutId: any;
  private statusCallbacks: Set<(status: 'connecting' | 'connected' | 'disconnected') => void> = new Set();
  private status: 'connecting' | 'connected' | 'disconnected' = 'disconnected';

  private db: any;
  private campaignId: string;
  private ydoc: Y.Doc;
  private isHost: boolean;

  constructor(
    db: any, // Firestore instance passed from web package
    campaignId: string,
    ydoc: Y.Doc,
    isHost: boolean
  ) {
    this.db = db;
    this.campaignId = campaignId;
    this.ydoc = ydoc;
    this.isHost = isHost;

    this.updateHandler = (_update: Uint8Array, origin: any) => {
      if (origin === this) return; // Ignore our own remote updates
      this.debouncedSave();
    };
    
    // Listen for local changes to push to Firebase
    this.ydoc.on('update', this.updateHandler);
  }

  private setStatus(status: 'connecting' | 'connected' | 'disconnected') {
    this.status = status;
    this.statusCallbacks.forEach(cb => cb(status));
  }

  private debouncedSave() {
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => this.saveToFirestore(), 2000);
  }

  private async saveToFirestore() {
    try {
      const state = Y.encodeStateAsUpdate(this.ydoc);
      const base64 = uint8ArrayToBase64(state);
      
      const docRef = doc(this.db, 'campaigns', this.campaignId);
      await setDoc(docRef, { state: base64, lastUpdated: Date.now() }, { merge: true });
    } catch (e) {
      console.error('Failed to save campaign to Firebase:', e);
    }
  }

  public async connect(): Promise<void> {
    this.setStatus('connecting');
    const docRef = doc(this.db, 'campaigns', this.campaignId);

    try {
      // Validation check for players
      if (!this.isHost) {
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) {
          console.error(`Campaign ${this.campaignId} does not exist.`);
          this.setStatus('disconnected');
          // Dispatch a custom event so the UI can redirect/alert
          window.dispatchEvent(new CustomEvent('campaign-not-found'));
          return;
        }
      } else {
        // If Host (DM), do an initial write to ensure the document exists
        this.saveToFirestore();
      }

      this.unsubscribe = onSnapshot(docRef, (snapshot) => {
        const data = snapshot.data();
        if (data && data.state) {
          try {
            const bytes = base64ToUint8Array(data.state);
            // Apply the update locally. Mark origin as `this` so we don't echo it back.
            Y.applyUpdate(this.ydoc, bytes, this);
          } catch (e) {
            console.error('Failed to parse campaign state from Firebase:', e);
          }
        }
        this.setStatus('connected');
      }, (error: any) => {
        console.error('Firebase sync error:', error);
        this.setStatus('disconnected');
      });

    } catch (e) {
      console.error('Failed to connect to Firebase campaign:', e);
      this.setStatus('disconnected');
    }
  }

  public disconnect(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    clearTimeout(this.timeoutId);
    this.setStatus('disconnected');
  }

  public onStatusChange(callback: (status: 'connecting' | 'connected' | 'disconnected') => void): void {
    this.statusCallbacks.add(callback);
    // Immediately call with current status
    callback(this.status);
  }

  public destroy() {
    this.disconnect();
    this.ydoc.off('update', this.updateHandler);
  }
}

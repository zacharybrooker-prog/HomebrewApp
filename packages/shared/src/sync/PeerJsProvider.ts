import * as Y from 'yjs';
import { Peer, DataConnection } from 'peerjs';

export class PeerJsProvider {
  public doc: Y.Doc;
  private peer: Peer;
  private connections: Map<string, DataConnection> = new Map();
  private isHost: boolean;
  public statusCallbacks: Set<(status: 'connecting' | 'connected' | 'disconnected') => void> = new Set();
  private status: 'connecting' | 'connected' | 'disconnected' = 'disconnected';

  constructor(doc: Y.Doc, roomId: string, isHost: boolean) {
    this.doc = doc;
    this.isHost = isHost;
    
    // Create a predictable host ID.
    const hostId = `frogsworld-host-${roomId}`;
    
    this.setStatus('connecting');

    if (this.isHost) {
      this.peer = new Peer(hostId);
    } else {
      this.peer = new Peer(); // Random ID for players
    }

    this.peer.on('open', (id) => {
      console.log('PeerJS connected to signaling server with ID:', id);
      if (this.isHost) {
        this.setStatus('connected'); // Host is ready to accept connections
      } else {
        // Player connects to the host
        const conn = this.peer.connect(hostId, { reliable: true });
        this.setupConnection(conn);
      }
    });

    this.peer.on('connection', (conn) => {
      // Host receives connection from player
      this.setupConnection(conn);
    });

    this.peer.on('error', (err) => {
      console.error('PeerJS Error:', err);
      if (err.type === 'peer-unavailable') {
        console.warn('Host not found. DM must connect first!');
      }
      this.setStatus('disconnected');
    });

    this.peer.on('disconnected', () => {
      this.setStatus('disconnected');
    });

    this.doc.on('update', this.onUpdate);
  }

  private setStatus(status: 'connecting' | 'connected' | 'disconnected') {
    this.status = status;
    this.statusCallbacks.forEach(cb => cb(status));
  }

  private setupConnection = (conn: DataConnection) => {
    const onOpen = () => {
      console.log('PeerJS connection opened with:', conn.peer);
      this.connections.set(conn.peer, conn);
      if (!this.isHost) {
        this.setStatus('connected');
      }
      
      const state = Y.encodeStateAsUpdate(this.doc);
      conn.send(this.toHex(state));
    };

    if (conn.open) {
      onOpen();
    } else {
      conn.on('open', onOpen);
    }

    conn.on('data', async (data: any) => {
      try {
        if (typeof data === 'string') {
          const update = this.fromHex(data);
          Y.applyUpdate(this.doc, update, conn.peer);
        } else {
          console.warn('PeerJS received non-string data, ignoring.', data);
        }
      } catch (err) {
        console.error('PeerJS data handling error', err);
      }
    });

    conn.on('close', () => {
      console.log('PeerJS connection closed:', conn.peer);
      this.connections.delete(conn.peer);
      if (!this.isHost) {
        this.setStatus('disconnected');
      }
    });
  }

  private onUpdate = (update: Uint8Array, origin: any) => {
    const hexUpdate = this.toHex(update);
    for (const [peerId, conn] of this.connections.entries()) {
      if (conn.open && origin !== peerId) {
        conn.send(hexUpdate);
      }
    }
  }

  private toHex(buffer: Uint8Array): string {
    let hex = '';
    for (let i = 0; i < buffer.length; i++) {
      let h = buffer[i].toString(16);
      if (h.length === 1) h = '0' + h;
      hex += h;
    }
    return hex;
  }

  private fromHex(hexString: string): Uint8Array {
    const result = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
      result[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
    }
    return result;
  }

  public connect(): void {
    if (this.peer.disconnected) {
      this.peer.reconnect();
    }
  }

  public disconnect(): void {
    this.peer.disconnect();
    for (const conn of this.connections.values()) {
      conn.close();
    }
    this.setStatus('disconnected');
  }

  public onStatusChange(callback: (status: 'connecting' | 'connected' | 'disconnected') => void): void {
    this.statusCallbacks.add(callback);
    callback(this.status);
  }

  public destroy() {
    this.doc.off('update', this.onUpdate);
    this.peer.destroy();
  }
}

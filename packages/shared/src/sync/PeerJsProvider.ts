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

  private chunkBuffers: Map<string, { total: number, chunks: string[], msgType: string }> = new Map();

  private sendPayload(conn: DataConnection, payload: any) {
    try {
      // We must avoid sending large objects because PeerJS does not chunk JSON strings
      // We also must avoid sending Uint8Array because PeerJS BinaryPack is buggy on iOS Safari
      let update: Uint8Array;
      let msgType: string;
      
      if (payload.type === 'sync1' || payload.type === 'sync2' || payload.type === 'update') {
        update = payload.data;
        msgType = payload.type;
      } else {
        return;
      }

      let str = '';
      const sliceSize = 8192;
      for (let i = 0; i < update.length; i += sliceSize) {
        str += String.fromCharCode.apply(null, update.subarray(i, i + sliceSize) as any);
      }
      const b64 = btoa(str);

      const CHUNK_SIZE = 16000;
      const totalChunks = Math.ceil(b64.length / CHUNK_SIZE);
      const msgId = Math.random().toString(36).substring(2, 9);
      
      for (let i = 0; i < totalChunks; i++) {
        const chunk = b64.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        // FORCE JSON stringification to bypass BinaryPack completely
        const rawString = JSON.stringify({ type: 'yjs-chunk', msgType, id: msgId, index: i, total: totalChunks, payload: chunk });
        conn.send(rawString);
      }
    } catch (e) {
      console.error('Failed to chunk data', e);
    }
  }

  private setupConnection = (conn: DataConnection) => {
    const onOpen = () => {
      console.log('PeerJS connection opened with:', conn.peer);
      this.connections.set(conn.peer, conn);
      if (!this.isHost) {
        this.setStatus('connected');
      }
      
      // Step 1: Send State Vector to initiate Sync Protocol
      const sv = Y.encodeStateVector(this.doc);
      this.sendPayload(conn, { type: 'sync1', data: sv });
    };

    if (conn.open) {
      onOpen();
    } else {
      conn.on('open', onOpen);
    }

    conn.on('data', async (data: any) => {
      try {
        if (typeof data === 'string') {
          const parsed = JSON.parse(data);
          if (parsed && parsed.type === 'yjs-chunk') {
            let buffer = this.chunkBuffers.get(parsed.id);
            if (!buffer) {
              buffer = { total: parsed.total, chunks: new Array(parsed.total), msgType: parsed.msgType };
              this.chunkBuffers.set(parsed.id, buffer);
            }
            buffer.chunks[parsed.index] = parsed.payload;
            
            if (buffer.chunks.filter(c => c !== undefined).length === parsed.total) {
              this.chunkBuffers.delete(parsed.id);
              const fullB64 = buffer.chunks.join('');
              const str = atob(fullB64);
              const arr = new Uint8Array(str.length);
              for (let i = 0; i < str.length; i++) {
                arr[i] = str.charCodeAt(i);
              }

              // Handle Yjs Sync Protocol
              if (buffer.msgType === 'sync1') {
                // Received sync step 1. Send sync step 2 (missing updates)
                const update = Y.encodeStateAsUpdate(this.doc, arr);
                this.sendPayload(conn, { type: 'sync2', data: update });
                // Also send our own sync step 1 just in case
                const sv = Y.encodeStateVector(this.doc);
                this.sendPayload(conn, { type: 'sync1', data: sv });
              } else if (buffer.msgType === 'sync2' || buffer.msgType === 'update') {
                Y.applyUpdate(this.doc, arr, conn.peer);
              }
            }
          }
          return;
        }

        // Fallback for previous binary/object formats
        let update: Uint8Array | null = null;
        if (data instanceof Uint8Array) {
          update = data;
        } else if (data instanceof ArrayBuffer) {
          update = new Uint8Array(data);
        } else if (Array.isArray(data)) {
          update = new Uint8Array(data);
        } else if (typeof data === 'object' && data !== null && data.type === 'Buffer' && Array.isArray(data.data)) {
          update = new Uint8Array(data.data);
        } else if (data instanceof Blob) {
          const ab = await data.arrayBuffer();
          update = new Uint8Array(ab);
        }

        if (update) {
          Y.applyUpdate(this.doc, update, conn.peer);
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
    for (const [peerId, conn] of this.connections.entries()) {
      if (conn.open && origin !== peerId) {
        this.sendPayload(conn, { type: 'update', data: update });
      }
    }
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

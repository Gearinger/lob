/**
 * Lobster Poker - Network Module (P2P via PeerJS)
 * (c) 2026 Lob
 */
'use strict';

export class Network {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.conns = new Map(); // 用于主机存放多路连接
    this.onMessage = null;
    this.onConnect = null;
    this.onDisconnect = null;
    this.isHost = false;
    this.myId = null;
    this.roomCode = null;
  }

  _hashCode(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31,h) + s.charCodeAt(i)) | 0;
    return Math.abs(h).toString(36);
  }

  async createRoom(playerName, roomCode) {
    const peerId = 'lobpoker_' + this._hashCode(roomCode);
    return new Promise((resolve, reject) => {
      this.peer = new Peer(peerId, {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun.qq.com:3478' },
            { urls: 'stun:stun.miwifi.com:3478' },
          ]
        }
      });
      this.peer.on('open', id => {
        console.info('[NET] Peer opened as host:', id);
        this.myId = id;
        this.isHost = true;
        this.roomCode = roomCode;
        this._updateStatus('房主已就绪，等待加入...');
        resolve(id);
      });
      this.peer.on('connection', conn => {
        console.info('[NET] Incoming connection from joiner:', conn.peer);
        this.conns.set(conn.peer, conn);
        this._setupConnection(conn);
        this._updateStatus('玩家已连接!');
        if (this.onConnect) this.onConnect();
      });
      this.peer.on('error', err => {
        console.error('[NET] Peer server error:', err.type, err);
        this._updateStatus('连接错误: ' + err.type);
        reject(err);
      });
      this.peer.on('disconnected', () => {
        console.warn('[NET] Peer service disconnected, attempting reconnect...');
        this.peer && this.peer.reconnect();
      });
    });
  }

  async joinRoom(playerName, roomCode, uuid, netWorth = null) {
    const peerId = 'lobpoker_' + this._hashCode(roomCode) + '_' + Date.now().toString(36) + '_j';
    console.info('[NET] Attempting to join room:', roomCode, 'as', peerId);
    return new Promise((resolve, reject) => {
      this.peer = new Peer(peerId, {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun.qq.com:3478' },
          ]
        }
      });
      this.peer.on('open', id => {
        console.info('[NET] Joiner peer opened:', id);
        this.myId = id;
        this.isHost = false;
        this.roomCode = roomCode;
        const hostPeerId = 'lobpoker_' + this._hashCode(roomCode);
        console.info('[NET] Connecting to host:', hostPeerId);
        this.conn = this.peer.connect(hostPeerId, { reliable: true });
        this._setupConnection(this.conn);
        this.conn.on('open', () => {
          console.info('[NET] Connection to host established!');
          this._updateStatus('已连接房主!');
          this.send({ type: 'JOIN', data: { name: playerName, uuid, netWorth } });
          resolve(id);
        });
        this.conn.on('error', err => {
          console.error('[NET] Data connection error:', err);
          this._updateStatus('连接失败，请确认房间号正确');
          reject(err);
        });
        setTimeout(() => {
          if (!this.conn.open) { 
            console.error('[NET] Join timeout (10s)');
            this._updateStatus('连接超时'); 
            reject(new Error('timeout')); 
          }
        }, 10000);
      });
      this.peer.on('error', err => { 
        console.error('[NET] Joiner peer error:', err.type, err);
        this._updateStatus('连接错误: ' + err.type); 
        reject(err); 
      });
    });
  }

  _setupConnection(conn) {
    conn.on('data', data => {
      console.debug('[NET] RECEIVED <<', data.type, data);
      if (this.onMessage) this.onMessage(data);
    });
    conn.on('close', () => {
      console.warn('[NET] Connection closed by remote peer:', conn.peer);
      if (this.isHost) this.conns.delete(conn.peer);
      this._updateStatus('有玩家断开连接');
      if (this.onDisconnect) this.onDisconnect(conn.peer);
    });
  }

  send(msg) {
    const payload = { ...msg, sender: this.myId, timestamp: Date.now() };
    if (this.isHost) {
      let sentCount = 0;
      this.conns.forEach((conn) => {
        if (conn && conn.open) {
          conn.send(payload);
          sentCount++;
        }
      });
      console.debug('[NET] BROADCASTING >>', msg.type, 'to', sentCount, 'peers.');
    } else {
      if (this.conn && this.conn.open) {
        console.debug('[NET] SENDING >>', msg.type, msg);
        this.conn.send(payload);
      } else {
        console.warn('[NET] Cannot send message, connection is not open:', msg.type);
      }
    }
  }

  destroy() {
    console.info('[NET] Destroying network instance...');
    if (this.conn) this.conn.close();
    this.conns.forEach((c) => c.close());
    this.conns.clear();
    if (this.peer) this.peer.destroy();
  }

  _updateStatus(s) {
    const el = document.getElementById('connection-status');
    if (el) el.textContent = 'WebRTC: ' + s;
  }
}

/**
 * Lobster Poker - Application Logic (Controller)
 * (c) 2026 Lob
 */
'use strict';

import { Network } from './net.js';
import { GameRoom, INITIAL_CHIPS, SMALL_BLIND, BIG_BLIND, MIN_RAISE, botDecide, PHASE_LABELS, COUNTDOWN_SECONDS } from './poker.js';
import { UI } from './ui.js';

export class App {
  constructor() {
    this.net = new Network();
    this.ui = new UI(this);
    this.isHost = false;
    this.room = null;
    this.myId = null;
    this.myName = '';
    this._countingDown = false;
    this._lastPhase = 'lobby';
    this.botTimeouts = {};
    
    this.net.onMessage = (msg) => this._handleMessage(msg);
    this.net.onConnect = () => {};
    this.net.onDisconnect = () => this._leave();
  }

  init() {
    this.ui.init();
    console.info('[APP] Initialized version:', POKER_VERSION);
  }

  // ==================== ROOM SETUP ====================

  async _createRoom(name, code) {
    this.ui.setLoading(true, '正在创建并同步信号...');
    console.info('[APP] Creating room:', code, 'as host:', name);
    try {
      this.myName = name;
      await this.net.createRoom(name, code);
      this.isHost = true;
      this.myId = this.net.myId;
      this.room = new GameRoom(code, this.myId, name);
      this._lastPhase = 'lobby';
      this.ui.showLobby();
      this.ui.addChatMessage('', `🏠 房间 ${code} 已创建，等待玩家加入...`, true);
      this.ui.updateLobby(this.room, this.myId, this.isHost);
    } catch (e) {
      console.error('[APP] Room creation fail:', e);
      this.ui.showError('创建房间失败: ' + (e.type || e.message));
    } finally {
      this.ui.setLoading(false);
    }
  }

  async _joinRoom(name, code) {
    this.ui.setLoading(true, '正在寻找并链接信号...');
    console.info('[APP] Joining room:', code, 'as guest:', name);
    try {
      this.myName = name;
      await this.net.joinRoom(name, code);
      this.isHost = false;
      this.myId = this.net.myId;
      this._lastPhase = 'lobby';
      this.ui.showLobby();
      this.ui.addChatMessage('', `✅ 已加入房间 ${code}，等待同步...`, true);
      this.ui.updateLobby({ players: [{ id: this.myId, name, isBot: false, isReady: false }], roomCode: code, hostId: '' }, this.myId, false);
    } catch (e) {
      console.error('[APP] Room join fail:', e);
      this.ui.showError('加入房间失败: ' + (e.message || e.type || ''));
    } finally {
      this.ui.setLoading(false);
    }
  }

  // ==================== MESSAGE HANDLER ====================

  _handleMessage(msg) {
    const { type, data, sender } = msg;
    switch (type) {
      case 'JOIN': {
        if (!this.isHost || !this.room) break;
        console.info('[APP] JOIN/Update from:', data.name, 'Ready:', data.ready);
        let p = this.room.players.find(p => p.id === sender);
        if (p) {
          p.isReady = !!data.ready;
        } else {
          p = this.room.addPlayer(sender, data.name);
          if (p) {
            p.isReady = !!data.ready;
            this.ui.addChatMessage('', `👤 ${data.name} 加入了房间`, true);
          }
        }
        
        if (this.room.allReady()) {
          this._startCountdown();
        } else if (this._countingDown) {
          this._countingDown = false;
          this.ui.hideCountdown();
          this.ui.addChatMessage('', '⚠️ 对手取消准备，对局停止倒计时', true);
        }
        
        this._broadcastState();
        this.ui.updateLobby(this.room, this.myId, true);
        break;
      }

      case 'ROOM_STATE': {
        if (this.isHost) break;
        console.debug('[APP] ROOM_STATE sync received. Phase:', data.phase);
        const wasInGame = this.room && this.room.phase !== 'lobby' && this.room.phase !== 'gameover';
        this._deserializeRoom(data);
        this._checkPhaseChange();
        if (this.room.phase === 'lobby') {
          this.ui.showLobby();
          this.ui.updateLobby(this.room, this.myId, false);
        } else {
          if (!wasInGame) this.ui.showGame();
          this.ui.updateGame(this.room, this.myId, false);
        }
        break;
      }

      case 'ACTION_LOG': {
        if (this.isHost) break;
        this.ui.addChatMessage(data.name, data.desc, true);
        break;
      }

      case 'CHAT': {
        this.ui.addChatMessage(data.name, data.text);
        break;
      }

      case 'LEAVE': {
        this.ui.addChatMessage('', `🚪 ${data.name} 离开了房间`, true);
        if (this.isHost && this.room) {
          this.room.removePlayer(sender);
          this._broadcastState();
          this.ui.updateLobby(this.room, this.myId, true);
        }
        break;
      }
    }
  }

  // ==================== ACTIONS ====================

  setReady() {
    if (!this.room) return;
    const myP = this.room.players.find(p => p.id === this.myId);
    if (myP) {
      myP.isReady = !myP.isReady;
      if (this.isHost) {
        if (this.room.allReady()) {
          this._startCountdown();
        } else {
          // If was counting down, stop it!
          if (this._countingDown) {
            this._countingDown = false;
            this.ui.hideCountdown();
            this.ui.addChatMessage('', '⚠️ 有玩家取消准备，对局停止倒计时', true);
          }
          this._broadcastState();
        }
        this.ui.updateLobby(this.room, this.myId, true);
      } else {
        this.net.send({ type: 'JOIN', data: { name: this.myName, ready: myP.isReady } });
      }
    }
  }

  addBot(name) {
    if (!this.room) return;
    const bot = this.room.addBot(name);
    if (bot) {
      this._broadcastState();
      this.ui.updateLobby(this.room, this.myId, true);
      this.ui.addChatMessage('', `🤖 Bot ${name} 已加入`, true);
    }
  }

  removeBot(id) {
    if (!this.isHost || !this.room) return;
    const p = this.room.players.find(p => p.id === id);
    if (p && p.isBot) {
      this.room.removePlayer(id);
      this._broadcastState();
      this.ui.updateLobby(this.room, this.myId, true);
      this.ui.addChatMessage('', `🗑️ Bot ${p.name} 已移除`, true);
    }
  }

  _startCountdown() {
    if (this._countingDown) return;
    this._countingDown = true;
    this.ui.showCountdown(COUNTDOWN_SECONDS, () => {
      this._countingDown = false;
      this.room.startGame();
      this._lastPhase = 'preflop';
      this.ui.showGame();
      this.ui.updateGame(this.room, this.myId, true);
      this._broadcastState();
      this._scheduleBotTurn();
    });
  }

  playerAction(action, amount) {
    if (!this.room) return;
    const myIdx = this.room.players.findIndex(p => p.id === this.myId);
    if (myIdx !== this.room.currentTurn) return;

    this.clearBotTimeout();
    const me = this.room.players[myIdx];
    const actualToCall = this.room.currentBet - (me.currentBet || 0);
    const desc = this._getActionDesc(action, action === 'call' ? actualToCall : amount);
    
    this.ui.addChatMessage(me.name, desc, true);
    const ok = this.room.playerAction(this.myId, action, amount);
    if (!ok) return;

    this.net.send({ type: 'ACTION_LOG', data: { name: me.name, desc } });
    this._checkPhaseChange();
    this._broadcastState();
    this.ui.updateGame(this.room, this.myId, true);

    if (this.room.phase === 'gameover') {
      this._handleGameOver();
    } else {
      this._scheduleBotTurn();
    }
  }

  _getActionDesc(action, val) {
    switch (action) {
      case 'fold':   return '弃牌 (Fold)';
      case 'check':  return '让牌 (Check)';
      case 'call':   return '跟注 (Call) ' + val;
      case 'raise':  return '加注 (Raise) ' + val;
      case 'allin':  return '💰 全下 (ALL IN)!';
      default:       return '行动';
    }
  }

  _scheduleBotTurn() {
    if (!this.room || this.room.phase === 'gameover' || this.room.phase === 'lobby') return;
    const cp = this.room.players[this.room.currentTurn];
    if (cp && cp.isBot && !cp.folded) {
      const delay = 900 + Math.random() * 1100;
      this.botTimeouts.bot = setTimeout(() => {
        if (!this.room || this.room.phase === 'gameover') return;
        if (this.room.players[this.room.currentTurn]?.id !== cp.id) return;

        const action = botDecide(this.room, this.room.currentTurn);
        const amount = (action === 'raise')
          ? Math.min(this.room.currentBet + MIN_RAISE, cp.chips + (cp.currentBet || 0))
          : 0;

        const actualToCall = this.room.currentBet - (cp.currentBet || 0);
        const desc = this._getActionDesc(action, action === 'call' ? actualToCall : amount);
        this.ui.addChatMessage(cp.name, desc, true);

        this.room.playerAction(cp.id, action, amount);
        this.net.send({ type: 'ACTION_LOG', data: { name: cp.name, desc } });
        this._checkPhaseChange();
        this._broadcastState();
        this.ui.updateGame(this.room, this.myId, true);

        if (this.room.phase === 'gameover') {
          this._handleGameOver();
        } else {
          this._scheduleBotTurn();
        }
      }, delay);
    }
  }

  _handleGameOver() {
    this.clearBotTimeout();
    if (this._autoNextRoundTimeout) clearInterval(this._autoNextRoundTimeout);

    const winner = this.room.winner || '?';
    const hand   = this.room.winHand || '';
    
    this.ui.showResult(winner, hand, this.room.showdownResults);
    this.ui.addChatMessage('', `🏆 ${winner} 获胜！${hand}`, true);
    this._broadcastState();
    
    const alive = this.room.players.filter(p => p.chips > 0);
    const nextBtn = document.getElementById('btn-next-round');
    
    if (alive.length < 2) {
      nextBtn.textContent = '游戏宣告结束';
    } else {
      let timeLeft = 3;
      nextBtn.textContent = `下一局 (${timeLeft}s)`;
      this._autoNextRoundTimeout = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
          clearInterval(this._autoNextRoundTimeout);
          this._autoNextRoundTimeout = null;
          if (this.isHost) this._nextRound();
        } else {
          nextBtn.textContent = `下一局 (${timeLeft}s)`;
        }
      }, 1000);
    }
  }

  _nextRound() {
    if (this._autoNextRoundTimeout) {
      clearInterval(this._autoNextRoundTimeout);
      this._autoNextRoundTimeout = null;
    }
    if (!this.room) return;
    this.ui.hideResult();
    
    if (this.isHost) {
      this.room.startGame();
      this._lastPhase = 'preflop';
      this._broadcastState();
      this.ui.showGame();
      this.ui.updateGame(this.room, this.myId, true);
      this._scheduleBotTurn();
    }
  }

  _checkPhaseChange() {
    if (!this.room) return;
    const current = this.room.phase;
    if (current !== this._lastPhase && current !== 'lobby' && current !== 'gameover') {
      const label = PHASE_LABELS[current] || current;
      this.ui.addChatMessage('', `--- 进入 ${label} 阶段 ---`, true);
      console.info('[APP] Phase change detected:', this._lastPhase, '->', current);
    }
    this._lastPhase = current;
  }

  clearBotTimeout() {
    if (this.botTimeouts.bot) {
      clearTimeout(this.botTimeouts.bot);
      delete this.botTimeouts.bot;
    }
  }

  _broadcastState() {
    this.net.send({ type: 'ROOM_STATE', data: this._serializeRoom() });
  }

  _serializeRoom() {
    return JSON.parse(JSON.stringify(this.room));
  }

  _deserializeRoom(data) {
    this.room = Object.assign(new GameRoom(data.roomCode, data.hostId, ''), data);
  }

  _leave() {
    this.clearBotTimeout();
    this.net.send({ type: 'LEAVE', data: { name: this.myName } });
    this.net.destroy();
    this.room = null;
    this._countingDown = false;
    this.ui.clearChat();
    this.ui.resetLobby();
    this.ui.showLobby();
  }
}

export const POKER_VERSION = '1.2.0';
window.appRemoveBot = (id) => { if (window.app) window.app.removeBot(id); };
window.appJoinRoom = () => {
  const name = document.getElementById('player-name-input').value.trim() || '玩家B';
  const code = document.getElementById('room-code-input').value.trim().toUpperCase();
  if (code && window.app) window.app._joinRoom(name, code);
};
window.appCreateRoom = () => {
  const name = document.getElementById('player-name-input').value.trim() || '玩家A';
  const code = Math.random().toString(36).substring(2,6).toUpperCase();
  if (window.app) window.app._createRoom(name, code);
};
window.appSendChat = (e) => {
  if (e && e.key !== 'Enter') return;
  if (window.app) window.app._sendChat();
};
window.appNextRound = () => { if (window.app) window.app._nextRound(); };
window.appSetReady = () => { if (window.app) window.app.setReady(); };
window.appBackToLobby = () => { if (window.app) window.app._leave(); };
window.appResetRoom = () => { if (window.app) window.app._leave(); };
window.appAdjustRaise = (v) => {
  const input = document.getElementById('raise-amount-input');
  if (input) input.value = Math.max(0, (parseInt(input.value||0)||0) + v);
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  console.info('[APP] DOM loaded, initializing app...');
  window.app = new App();
  window.app.init();
});

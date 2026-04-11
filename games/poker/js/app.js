/**
 * Lobster Poker - Application Logic (Controller)
 * (c) 2026 Lob
 */
'use strict';

import { Network } from './net.js';
import { GameRoom, INITIAL_BANKROLL, INITIAL_TABLE_CHIPS, SMALL_BLIND, BIG_BLIND, MIN_RAISE, botDecide, PHASE_LABELS, COUNTDOWN_SECONDS } from './poker.js';
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
    
    this.myUuid = localStorage.getItem('lob_poker_uuid');
    if (!this.myUuid) {
      this.myUuid = Math.random().toString(36).substring(2, 10);
      localStorage.setItem('lob_poker_uuid', this.myUuid);
    }
    
    this.net.onMessage = (msg) => this._handleMessage(msg);
    this.net.onConnect = () => {};
    this.net.onDisconnect = (peerId) => this._handleDisconnect(peerId);
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
      
      let saved = localStorage.getItem('lob_poker_networth');
      const nw = saved ? parseInt(saved, 10) : null;
      
      this.room = new GameRoom(code, this.myId, name, this.myUuid, nw);
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
      let saved = localStorage.getItem('lob_poker_networth');
      const nw = saved ? parseInt(saved, 10) : null;
      
      await this.net.joinRoom(name, code, this.myUuid, nw);
      this.isHost = false;
      this.myId = this.net.myId;
      this._lastPhase = 'lobby';
      this.ui.showLobby();
      this.ui.addChatMessage('', `✅ 已加入房间 ${code}，等待同步...`, true);
      this.ui.updateLobby({ players: [{ id: this.myId, uuid: this.myUuid, name, isBot: false, isReady: false }], roomCode: code, hostId: '' }, this.myId, false);
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
        console.info('[APP] JOIN/Update from:', data.name, 'Ready:', data.ready, 'UUID:', data.uuid);
        
        let p = this.room.players.find(p => p.uuid === data.uuid);
        if (p) {
          // 断线重连或状态更新：更新通信通道 id
          if (p.id !== sender) {
            console.info(`[APP] 玩家 ${data.name} 断线重连成功！更新网线 ${p.id} -> ${sender}`);
            this.ui.addChatMessage('', `🔄 ${data.name} 重新连接回了房间！`, true);
            p.id = sender;
          }
          p.connected = true;
          if (data.ready !== undefined) p.isReady = !!data.ready;
        } else {
          p = this.room.addPlayer(sender, data.name, data.uuid, data.netWorth);
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
        const wasGameOver = this.room && this.room.phase === 'gameover';
        this._deserializeRoom(data);
        this._checkPhaseChange();
        this._saveProgress();
        
        if (this.room.phase === 'lobby') {
          this.ui.showLobby();
          this.ui.updateLobby(this.room, this.myId, false);
          
          // 若全员就绪，客机同步触发视觉倒计时
          if (this.room.allReady()) {
            this._startCountdown();
          } else if (this._countingDown) {
            this._countingDown = false;
            this.ui.hideCountdown();
          }
        } else {
          if (!wasInGame) this.ui.showGame();
          this.ui.updateGame(this.room, this.myId, false);
          
          // 客机同步弹出游戏结束结算面板
          if (this.room.phase === 'gameover' && !wasGameOver) {
            this._handleGameOver();
          }
        }
        break;
      }

      case 'ACTION_LOG': {
        if (this.isHost) break;
        this.ui.addChatMessage(data.name, data.desc, true);
        break;
      }

      case 'RESTART_MATCH': {
        if (!this.isHost) break;
        this.ui.addChatMessage(data.name, '请求重新开局...', true);
        this._restartMatch();
        break;
      }

      case 'REQUEST_NEXT_ROUND': {
        // B2 Fix: guest can ask host to advance to the next round
        if (!this.isHost) break;
        this._nextRound();
        break;
      }

      case 'CHAT': {
        this.ui.addChatMessage(data.name, data.text);
        break;
      }

      case 'LEAVE': {
        if (this.isHost && this.room) {
          const p = this.room.players.find(p => p.id === sender);
          if (p && !p.isReady && this.room.phase === 'lobby') {
            // 在大厅时允许彻底移除
            this.ui.addChatMessage('', `🚪 ${data.name} 退出了房间`, true);
            this.room.removePlayer(sender);
          } else if (p) {
            // 对战中不可踢出，挂机状态
            this.ui.addChatMessage('', `⚠ ${data.name} 临时离开了房间 (可重连)`, true);
            p.connected = false;
          }
          this._broadcastState();
          this.ui.updateLobby(this.room, this.myId, true);
        }
        break;
      }

      case 'PLAYER_ACTION': {
        if (!this.isHost) break;
        this.playerAction(data.action, data.amount, sender);
        break;
      }
    }
  }

  // ==================== ACTIONS ====================

  setReady() {
    if (!this.room) return;
    this.ui.playSFX('click');
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
        this.net.send({ type: 'JOIN', data: { name: this.myName, ready: myP.isReady, uuid: this.myUuid } });
      }
    }
  }

  addBot(name) {
    if (!this.room) return;
    this.ui.playSFX('click');
    const bot = this.room.addBot(name);
    if (bot) {
      this._broadcastState();
      this.ui.updateLobby(this.room, this.myId, true);
      this.ui.addChatMessage('', `🤖 Bot ${name} 已加入`, true);
    }
  }

  removeBot(id) {
    if (!this.isHost || !this.room) return;
    this.ui.playSFX('click');
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
      this.ui.showGame();
      if (this.room) this.ui.updateGame(this.room, this.myId, this.isHost);
      
      // 只有主机具有游戏进程推进的职权
      if (this.isHost) {
        this.room.startGame();
        this._lastPhase = 'preflop';
        this.ui.updateGame(this.room, this.myId, true);
        this._broadcastState();
        this._scheduleBotTurn();
      }
    });
  }

  playerAction(action, amount, playerId = this.myId) {
    if (!this.room) return;
    
    // 如果是客机自身操作，只负责发送指令给主机
    if (!this.isHost && playerId === this.myId) {
      this.ui.playSFX('click');
      this.net.send({ type: 'PLAYER_ACTION', data: { action, amount } });
      return;
    }

    // ----- 以下逻辑仅在主机（Host）端执行 -----
    const pIdx = this.room.players.findIndex(p => p.id === playerId);
    if (pIdx !== this.room.currentTurn) return;
    
    if (playerId === this.myId) this.ui.playSFX('click');
    this.clearBotTimeout();
    
    const actor = this.room.players[pIdx];
    const actualToCall = this.room.currentBet - (actor.currentBet || 0);
    const desc = this._getActionDesc(action, action === 'call' ? actualToCall : amount);
    
    const ok = this.room.playerAction(playerId, action, amount);
    if (!ok) return;

    this.ui.addChatMessage(actor.name, desc, true);
    this.net.send({ type: 'ACTION_LOG', data: { name: actor.name, desc } });
    
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
    if (this._autoNextRoundTimeout) {
      clearInterval(this._autoNextRoundTimeout);
      this._autoNextRoundTimeout = null;
    }

    const winner = this.room.winner || '?';
    const hand   = this.room.winHand || '';
    
    if (this.isHost) {
      this._broadcastState();
    }

    // B4 Fix: isTrulyGameOver should only consider human players (not bots),
    // because bots go bankrupt normally but game should continue until all
    // human players are bankrupt. Also: chips+bankroll must BOTH be zero.
    const humanPlayers = this.room.players.filter(p => !p.isBot);
    const isTrulyGameOver = humanPlayers.some(
      p => (p.chips + (p.bankroll || 0)) <= 0
    );

    if (isTrulyGameOver) {
      // 真正破产，显示结算界面（不自动进入下一局）
      this.ui.showResult(winner, hand, this.room.showdownResults, true);
      this.ui.addChatMessage('', `🏆 ${winner} 获胜！${hand} · 有玩家破产`, true);
    } else {
      // 正常结束，自动倒计时进入下一局
      this.ui.showResult(winner, hand, this.room.showdownResults, false);
      this.ui.addChatMessage('', `🏆 ${winner} 获胜！${hand}`, true);

      if (this.isHost) {
        const nextBtn = document.getElementById('btn-next-round');
        let timeLeft = 7;
        const getBtnText = (t) => `下一局 (${t}s)`;
        nextBtn.textContent = getBtnText(timeLeft);
        nextBtn.style.pointerEvents = 'auto';
        nextBtn.style.opacity = '1';

        this._autoNextRoundTimeout = setInterval(() => {
          timeLeft--;
          if (timeLeft <= 0) {
            clearInterval(this._autoNextRoundTimeout);
            this._autoNextRoundTimeout = null;
            this._nextRound();
          } else {
            nextBtn.textContent = getBtnText(timeLeft);
          }
        }, 1000);
      }
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
    this._saveProgress();
    this.net.send({ type: 'ROOM_STATE', data: this._serializeRoom() });
  }

  requestRestartMatch() {
    this.ui.hideResult();
    const matchOverlay = document.getElementById('match-overlay');
    if (matchOverlay) matchOverlay.classList.remove('show');

    if (this.isHost) {
      this._restartMatch();
    } else {
      this.ui.addChatMessage('', '正在等待房主重新开局...', true);
      this.net.send({ type: 'RESTART_MATCH', data: { name: this.myName } });
    }
  }

  _restartMatch() {
    if (!this.isHost || !this.room) return;
    
    this.room.players.forEach(p => {
       p.chips = Math.min(INITIAL_TABLE_CHIPS, INITIAL_BANKROLL + INITIAL_TABLE_CHIPS); 
       p.bankroll = Math.max(0, (INITIAL_BANKROLL + INITIAL_TABLE_CHIPS) - p.chips);
       p.isReady = false;
       p.folded = false;
       p.currentBet = 0;
       p.hand = [];
       p.handsPlayed = 0;
       p.handsWon = 0;
    });
    this.room.phase = 'lobby';
    this.room.publicCards = [];
    this.room.pot = 0;
    this.room.currentBet = 0;
    
    this._saveProgress();
    this._broadcastState();
    
    this.ui.showLobby();
    this.ui.updateLobby(this.room, this.myId, true);
    this.ui.addChatMessage('', '🔄 房主已重新开局，请准备！', true);
  }

  _saveProgress() {
    if (!this.room) return;
    const me = this.room.players.find(p => p.id === this.myId);
    if (me && typeof me.bankroll === 'number') {
      const netWorth = me.chips + me.bankroll;
      localStorage.setItem('lob_poker_networth', netWorth.toString());
    }
  }

  _serializeRoom() {
    return JSON.parse(JSON.stringify(this.room));
  }

  _deserializeRoom(data) {
    // B1 Fix: create a proper GameRoom instance to preserve prototype methods,
    // then copy only data fields (not constructor-initialized ones that would
    // conflict). This ensures allReady(), startGame(), etc. all remain callable.
    const room = new GameRoom(data.roomCode, data.hostId, '');
    // Overwrite all enumerable data fields from the serialized snapshot
    room.players = data.players || room.players;
    room.phase = data.phase || room.phase;
    room.publicCards = data.publicCards || [];
    room.pot = data.pot || 0;
    room.currentBet = data.currentBet || 0;
    room.currentTurn = data.currentTurn ?? 0;
    room.dealerIdx = data.dealerIdx ?? 0;
    room.deck = data.deck || [];
    room.winner = data.winner || null;
    room.winHand = data.winHand || null;
    room.showdownResults = data.showdownResults || [];
    this.room = room;
  }

  _sendChat() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    this.ui.addChatMessage(this.myName, text);
    this.net.send({ type: 'CHAT', data: { name: this.myName, text } });
    input.value = '';
  }

  _handleDisconnect(peerId) {
    // 只有非房主完全断网时，才调用硬退出。如果是主机管理旗下玩家掉线则走房主逻辑。
    if (!this.isHost && !peerId) {
      return this._leave();
    }
    
    // 主机收到某 peerID 断开的消息
    if (this.isHost && this.room && peerId) {
      const p = this.room.players.find(p => p.id === peerId);
      if (p) {
        if (this.room.phase === 'lobby') {
          this.ui.addChatMessage('', `🔌 ${p.name} 连接意外断开`, true);
          p.connected = false;
        } else {
          this.ui.addChatMessage('', `⚠ ${p.name} 掉线了 (将进入托管/等待重连)`, true);
          p.connected = false;
        }
        this._broadcastState();
        this.ui.updateLobby(this.room, this.myId, true);
      }
    }
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
  if (window.app) window.app.ui.playSFX('click');
  const name = document.getElementById('player-name-input').value.trim() || '玩家B';
  const code = document.getElementById('room-code-input').value.trim().toUpperCase();
  if (code && window.app) window.app._joinRoom(name, code);
};
window.appCreateRoom = () => {
  if (window.app) window.app.ui.playSFX('click');
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
window.copyRoomCode = () => {
  if (window.app) window.app.ui.playSFX('click');
  const code = document.getElementById('display-room-code').textContent;
  if (code && code !== '----') {
    navigator.clipboard.writeText(code).then(() => {
      if (window.app) window.app.ui.showToast(`房号 ${code} 已复制！`, '📋');
    }).catch(e => {
      if (window.app) window.app.ui.showToast(`无法复制房号`, '❌');
    });
  }
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  console.info('[APP] DOM loaded, initializing app...');
  window.app = new App();
  window.app.init();
});

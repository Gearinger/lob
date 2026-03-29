/**
 * Lobster Poker - UI Rendering Module
 * (c) 2026 Lob
 */
'use strict';

import { PHASE_LABELS, PHASE_BET_LIMITS, SMALL_BLIND, BIG_BLIND, MIN_RAISE } from './poker.js';

export class UI {
  constructor(app) {
    this.app = app;
    this.sounds = {
      click: new Audio('assets/sfx/click.mp3'),
      deal: new Audio('assets/sfx/deal.mp3'),
      win: new Audio('assets/sfx/win.mp3')
    };
    this.bgm = {
      lobby: new Audio('assets/bgm/lobby.mp3'),
      game: new Audio('assets/bgm/game.mp3')
    };
    Object.values(this.bgm).forEach(a => { a.loop = true; a.volume = 0.15; });
    this.currentBGM = null;
    this.lastPhase = null;
    this.lastPublicCardCount = 0;
  }

  playSFX(key) {
    const s = this.sounds[key];
    if (s) {
      s.currentTime = 0;
      s.play().catch(e => console.warn('[SFX] Audio play block:', e.message));
    }
  }

  // Spawn a gold chip particle flying from element toward the pot display
  spawnChipParticle(fromEl, isDown = false) {
    if (!fromEl) return;
    const rect = fromEl.getBoundingClientRect();
    const potEl = document.getElementById('cur-phase-pot');
    const potRect = potEl ? potEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2 };
    const chip = document.createElement('div');
    chip.className = 'chip-particle' + (isDown ? ' fly-down' : '');
    chip.textContent = '¢';
    const startX = rect.left + rect.width / 2 - 12;
    const startY = rect.top + rect.height / 2 - 12;
    chip.style.left = startX + 'px';
    chip.style.top = startY + 'px';
    const dx = potRect.left - startX;
    const dy = (isDown ? potRect.top - startY + 40 : potRect.top - startY - 40);
    chip.style.setProperty('--chip-dx', dx + 'px');
    chip.style.setProperty('--chip-dy', dy + 'px');
    document.body.appendChild(chip);
    chip.addEventListener('animationend', () => chip.remove());
  }

  showToast(msg, icon = '✅') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.innerHTML = `<span class="icon">${icon}</span>${msg}`;
    container.appendChild(toast);

    // Auto remove after 2.8s total animation
    setTimeout(() => { toast.remove(); }, 2800);
  }

  triggerPotBurst() {
    const el = document.querySelector('.pot-display');
    if (!el) return;
    el.classList.remove('pot-win-burst');
    void el.offsetWidth; // reflow
    el.classList.add('pot-win-burst');
    el.addEventListener('animationend', () => el.classList.remove('pot-win-burst'), { once: true });
  }

  stopAllBGM() {
    Object.values(this.bgm).forEach(a => { a.pause(); a.currentTime = 0; });
    this.currentBGM = null;
  }

  playBGM(type) {
    if (this.currentBGM === type) return;
    this.stopAllBGM();
    const s = this.bgm[type];
    if (s) {
      this.currentBGM = type;
      s.play().catch(e => console.warn('[BGM] Audio play block:', e.message));
    }
  }

  init() {
    // Action Panel: Raise Confirm
    const btnConfirm = document.getElementById('btn-raise-confirm');
    if (btnConfirm) {
      btnConfirm.onclick = () => {
        this.playSFX('click');
        const seatEl = document.querySelector('.player-seat.pos-self');
        this.spawnChipParticle(seatEl);
        const input = document.getElementById('raise-amount-input');
        const val = parseInt(input.value);
        if (isNaN(val) || val <= 0) return;
        this.app.playerAction('raise', val);
        document.getElementById('raise-panel').classList.remove('show');
      };
    }

    // Action Panel: Raise Cancel
    const btnCancel = document.getElementById('btn-raise-cancel');
    if (btnCancel) {
      btnCancel.onclick = () => {
        this.playSFX('click');
        document.getElementById('raise-panel').classList.remove('show');
      };
    }

    // Game Result: Next Round
    const btnNext = document.getElementById('btn-next-round');
    if (btnNext) {
      btnNext.onclick = () => {
        this.playSFX('click');
        if (window.app) window.app._nextRound();
      };
    }

    // Game Header: Leave
    const btnLeave = document.getElementById('btn-leave-game');
    if (btnLeave) {
      btnLeave.onclick = () => {
        this.playSFX('click');
        if (window.app) window.app._leave();
      };
    }

    // Chat: Send
    const btnChat = document.getElementById('btn-send-chat');
    if (btnChat) {
      btnChat.onclick = () => {
        this.playSFX('click');
        if (window.app) window.app._sendChat();
      };
    }
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.onkeypress = (e) => {
        if (e.key === 'Enter') this.app._sendChat();
      };
    }
  }

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');

    if (id === 'lobby-screen') this.playBGM('lobby');
    else if (id === 'game-screen') this.playBGM('game');
  }

  showLobby() { this.showScreen('lobby-screen'); }
  showGame() { this.showScreen('game-screen'); }

  showCountdown(seconds, callback) {
    this.hideCountdown();
    let sec = seconds || 3;
    const overlay = document.createElement('div');
    overlay.id = 'countdown-overlay';
    overlay.className = 'loading-overlay active'; // 借用背景的毛玻璃黑色遮罩
    overlay.style.zIndex = '10000';
    overlay.innerHTML = `<div id="countdown-num" style="font-size: 6rem; font-weight: 800; color: #E88A3D; text-shadow: 0 0 20px rgba(232,138,61,0.6); animation: popIn 0.8s ease-out;">${sec}</div>`;
    document.body.appendChild(overlay);
    this.playSFX('click');

    this._countdownInterval = setInterval(() => {
      sec--;
      if (sec <= 0) {
        this.hideCountdown();
        if (callback) callback();
      } else {
        const num = document.getElementById('countdown-num');
        if (num) {
          num.textContent = sec;
          num.style.animation = 'none';
          void num.offsetWidth;
          num.style.animation = 'popIn 0.8s ease-out';
          this.playSFX('click');
        }
      }
    }, 1000);
  }

  hideCountdown() {
    if (this._countdownInterval) {
      clearInterval(this._countdownInterval);
      this._countdownInterval = null;
    }
    const overlay = document.getElementById('countdown-overlay');
    if (overlay) overlay.remove();
  }

  updateLobby(room, myId, isHost) {
    document.getElementById('setup-section').style.display = 'none';
    document.getElementById('room-section').style.display = 'block';
    document.getElementById('display-room-code').textContent = room.roomCode;

    const list = document.getElementById('lobby-player-list');
    list.innerHTML = '';
    for (const p of room.players) {
      const div = document.createElement('div');
      div.className = 'player-item';
      const isMe = p.id === myId;
      const isHostPlayer = room.hostId === p.id;
      const roleLabel = isHostPlayer ? '<span class="role host">房主</span>' : '';

      let delBtnHtml = '';
      if (isHost && p.isBot) {
        delBtnHtml = `<button class="small-btn del-btn" onclick="appRemoveBot('${p.id}')">移除</button>`;
      }

      div.innerHTML = `
        <span class="icon">${p.isBot ? '🤖' : '👤'}</span>
        <span class="name">${p.name}${isMe ? ' (你)' : ''}</span>
        ${roleLabel}
        <span class="status ${p.isReady ? 'ready' : ''}">${p.isReady ? '✓ 就绪' : ''}</span>
        ${delBtnHtml}`;
      list.appendChild(div);
    }

    const actions = document.getElementById('lobby-actions');
    actions.innerHTML = '';

    // Add Bot (Host only)
    if (isHost && room.players.length < 2) {
      const addBtn = document.createElement('button');
      addBtn.className = 'small-btn';
      addBtn.textContent = '+ 添加Bot';
      addBtn.onclick = () => {
        const name = 'Bot-' + (room.players.filter(p => p.isBot).length + 1);
        this.app.addBot(name);
      };
      actions.appendChild(addBtn);
    }

    // Ready Button
    const readyBtn = document.createElement('button');
    readyBtn.className = 'btn btn-primary';
    const me = room.players.find(p => p.id === myId);
    if (me) {
      if (!me.isReady) {
        readyBtn.textContent = '✓ 准备';
        readyBtn.className = 'btn btn-primary';
      } else {
        readyBtn.textContent = '✕ 取消准备';
        readyBtn.className = 'btn btn-secondary';
      }
      readyBtn.onclick = () => this.app.setReady();
    }
    actions.appendChild(readyBtn);

    const waitMsg = document.getElementById('waiting-msg');
    waitMsg.style.display = (room.players.length < 2) ? 'block' : 'none';
  }

  updateGame(room, myId, isHost) {
    this.room = room; // cache for raise panel callbacks
    document.getElementById('game-room-code').textContent = room.roomCode;

    const phaseChanged = this.lastPhase !== room.phase;
    if (phaseChanged) {
      if (room.phase !== 'lobby' && room.phase !== 'gameover') this.playSFX('deal');
      if (room.phase === 'gameover') {
        if (room.winner === this.app.myName) this.playSFX('win');
        setTimeout(() => this.triggerPotBurst(), 300);
      }
      this.lastPhase = room.phase;
    }

    const phaseEl = document.getElementById('phase-label');
    if (phaseEl) phaseEl.textContent = PHASE_LABELS[room.phase] || room.phase.toUpperCase();

    const currentPhaseTotal = (room.players || []).reduce((s, p) => s + (p.currentBet || 0), 0);
    const totalGamePot = (room.pot || 0) + currentPhaseTotal;

    const curLabel = document.getElementById('cur-phase-pot');
    if (curLabel) curLabel.textContent = currentPhaseTotal;

    const totalLabel = document.getElementById('total-game-pot');
    if (totalLabel) totalLabel.textContent = totalGamePot;

    const renderRank = (r) => `<span class="rank">${r}</span>`;

    // === Community Card Animation ===
    const pubCards = document.getElementById('public-cards');
    const slots = pubCards.querySelectorAll('.card-slot');
    const prevCount = this.lastPublicCardCount || 0;
    const newCount = room.publicCards.length;
    let dealIdx = 0;
    for (let i = 0; i < 5; i++) {
      if (room.publicCards[i]) {
        const c = room.publicCards[i];
        const isNew = i >= prevCount && newCount > prevCount && phaseChanged;
        const aniClass = isNew ? `deal-anim deal-d${dealIdx++}` : '';
        slots[i].innerHTML = `<div class="card ${c.suit === '♥' || c.suit === '♦' ? 'red' : 'black'} ${aniClass}">${renderRank(c.rank)}<span class="suit">${c.suit}</span></div>`;
        slots[i].classList.add('filled');
      } else {
        slots[i].innerHTML = '-';
        slots[i].classList.remove('filled');
      }
    }
    this.lastPublicCardCount = newCount;

    const db = document.getElementById('dealer-btn');
    db.style.display = room.phase === 'lobby' ? 'none' : 'flex';

    const seatsEl = document.getElementById('player-seats');
    seatsEl.innerHTML = '';

    // Relative positioning: make current player always at the bottom
    const myIdx = room.players.findIndex(p => p.id === myId);
    const n = room.players.length;

    room.players.forEach((p, i) => {
      const div = document.createElement('div');
      const relIdx = (i - myIdx + n) % n;
      const posClass = relIdx === 0 ? 'pos-self' : 'pos-opp';

      div.className = 'player-seat ' + posClass;
      const isMe = p.id === myId;
      const isTurn = (i === room.currentTurn && room.phase !== 'lobby' && room.phase !== 'gameover' && !p.folded);
      const isWinner = (room.phase === 'gameover' && room.winner === p.name);

      // We show cards if it's me, or if it's showdown/gameover UNLESS they folded
      const showCards = (isMe && !p.folded) || ((room.phase === 'showdown' || room.phase === 'gameover') && !p.folded);

      let cardsHtml = '';
      if (p.hand && p.hand.length === 2) {
        const isOpp = posClass === 'pos-opp';
        const aniClass = phaseChanged && room.phase === 'preflop'
          ? (isOpp ? 'deal-anim deal-anim-opp' : 'deal-anim') : '';
        if (showCards) {
          const isShowdown = (room.phase === 'showdown' || room.phase === 'gameover');
          const cardAni = isShowdown && !isMe ? 'deal-anim flip-anim' : aniClass;
          cardsHtml = p.hand.map((c, ci) =>
            `<div class="card ${c.suit === '♥' || c.suit === '♦' ? 'red' : 'black'} ${cardAni} deal-d${ci}" style="margin:0 2px; width:60px; height:84px;">${renderRank(c.rank)}<span class="suit">${c.suit}</span></div>`
          ).join('');
        } else if (!p.folded) {
          const oppAni = isOpp ? (aniClass ? 'deal-anim-opp' : '') : aniClass;
          cardsHtml = `<div class="card-back ${oppAni} deal-d0" style="width:60px;height:84px;border-radius:8px; margin: 0 2px;"></div>` +
            `<div class="card-back ${oppAni} deal-d1" style="width:60px;height:84px;border-radius:8px; margin: 0 2px;"></div>`;
        }
      }

      const betHtml = (p.currentBet > 0 || p.handTotal > 0) && (room.phase !== 'lobby' && room.phase !== 'gameover')
        ? `<div class="bet-indicator anim-pop">
            <div class="bet-part">本轮 ${p.currentBet || 0}</div>
            <div class="bet-sep"></div>
            <div class="bet-part">总计 ${(p.handTotal || 0) + (p.currentBet || 0)}</div>
           </div>` : '';

      let labels = '';
      if (i === room.dealerIdx && room.phase !== 'lobby') {
        labels += `<span class="seat-btn-label dealer">D</span> `;
      }
      if (room.phase === 'preflop') {
        if (i === (room.dealerIdx + 1) % room.players.length) labels += `<span class="seat-btn-label small-blind">小盲</span> `;
        if (i === (room.dealerIdx + 2) % room.players.length) labels += `<span class="seat-btn-label big-blind">大盲</span> `;
      }

      div.innerHTML = `
        <div class="side-layout">
          <div class="seat-card-row ${!showCards ? 'seat-cards-hidden' : ''} ${p.folded ? 'seat-folded' : ''}">${cardsHtml}</div>
          <div class="seat-info ${isTurn ? 'is-turn' : ''} ${isWinner ? 'is-winner' : ''}">
            <div class="seat-name">${p.name}${p.isBot ? ' 🤖' : ''}</div>
            <div class="seat-chips">💰 ${p.chips}</div>
            <div class="seat-roles">${labels}</div>
            ${p.folded ? '<div class="action-status folded">已弃牌</div>' : ''}
          </div>
        </div>
        ${betHtml}
      `;
      seatsEl.appendChild(div);
    });

    this._updateActionBar(room, myId);
  }

  _updateActionBar(room, myId) {
    const bar = document.getElementById('action-bar');
    const info = document.getElementById('action-info');
    const btns = document.getElementById('action-buttons');
    const raisePanel = document.getElementById('raise-panel');

    raisePanel.classList.remove('show');
    btns.innerHTML = '';

    if (room.phase === 'lobby') {
      info.textContent = '等待对局开始...';
      bar.classList.add('disabled');
      return;
    }

    const myIdx = room.players.findIndex(p => p.id === myId);
    const me = room.players[myIdx];
    const isMyTurn = myIdx === room.currentTurn;
    const toCall = room.currentBet - (me?.currentBet || 0);

    bar.classList.toggle('disabled', !isMyTurn || me?.folded || room.phase === 'gameover' || room.phase === 'showdown');

    if (room.phase === 'gameover') {
      info.textContent = '本局对战结束';
      return;
    }
    if (room.phase === 'showdown') {
      info.textContent = '全场摊牌结算中...';
      return;
    }

    info.textContent = isMyTurn
      ? (toCall > 0 ? `当前到你行动 · 需要跟注: ${toCall}` : '当前到你行动 · 请选择')
      : `等待 ${room.players[room.currentTurn]?.name || '对手'} 行动...`;

    if (!isMyTurn || (me && me.folded)) return;

    // Fold
    const foldBtn = document.createElement('button');
    foldBtn.className = 'action-btn fold'; foldBtn.textContent = '弃牌';
    foldBtn.onclick = () => {
      this.playSFX('click');
      this.app.playerAction('fold');
    };
    btns.appendChild(foldBtn);

    if (toCall > 0) {
      const callBtn = document.createElement('button');
      callBtn.className = 'action-btn call'; callBtn.textContent = `跟注 ${toCall}`;
      callBtn.onclick = () => {
        this.playSFX('click');
        const seatEl = document.querySelector('.player-seat.pos-self');
        setTimeout(() => this.spawnChipParticle(seatEl), 50);
        this.app.playerAction('call');
      };
      btns.appendChild(callBtn);
    } else {
      const checkBtn = document.createElement('button');
      checkBtn.className = 'action-btn check'; checkBtn.textContent = '让牌';
      checkBtn.onclick = () => {
        this.playSFX('click');
        this.app.playerAction('check');
      };
      btns.appendChild(checkBtn);
    }

    // Raise (always available unless all-in)
    if (me.chips > 0) {
      const raiseBtn = document.createElement('button');
      raiseBtn.className = 'action-btn raise'; raiseBtn.textContent = '加注';
      raiseBtn.onclick = () => {
        this.playSFX('click');
        raisePanel.classList.add('show');
        const input = document.getElementById('raise-amount-input');
        // totalBet semantics: minimum is currentBet + MIN_RAISE
        const minTotal = (room.currentBet || 0) + MIN_RAISE;
        const maxTotal = me.chips + (me.currentBet || 0);
        input.min = minTotal;
        input.max = maxTotal;
        input.placeholder = `最小加注到 ${minTotal}`;
        input.value = Math.min(minTotal, maxTotal);
        input.focus();
      };
      btns.appendChild(raiseBtn);
    }

    // All-in
    if (me.chips > 0) {
      const allInBtn = document.createElement('button');
      allInBtn.className = 'action-btn allin'; allInBtn.textContent = `ALL IN 💰`;
      allInBtn.onclick = () => {
        this.playSFX('click');
        const seatEl = document.querySelector('.player-seat.pos-self');
        // Spawn 3 chips for dramatic effect
        for (let i = 0; i < 3; i++) setTimeout(() => this.spawnChipParticle(seatEl), i * 100);
        this.app.playerAction('allin');
      };
      btns.appendChild(allInBtn);
    }
  }

  showCountdown(n, cb) {
    const overlay = document.getElementById('countdown-overlay');
    const numEl = document.getElementById('countdown-number');
    overlay.classList.add('show');
    let count = n;
    numEl.textContent = count;

    if (this.countdownInterval) clearInterval(this.countdownInterval);

    this.countdownInterval = setInterval(() => {
      count--;
      numEl.textContent = count > 0 ? count : '开始!';
      if (count <= 0) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
        setTimeout(() => { overlay.classList.remove('show'); if (cb) cb(); }, 500);
      }
    }, 1000);
  }

  hideCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    document.getElementById('countdown-overlay').classList.remove('show');
  }

  showResult(winner, winHand, showdownResults) {
    const overlay = document.getElementById('result-overlay');
    const winnerEl = document.getElementById('result-winner');
    const handEl = document.getElementById('result-hand');

    winnerEl.textContent = winner;
    handEl.textContent = winHand || '';

    // Add detail list
    let detailHtml = '<div class="result-details" style="margin-top:20px; text-align:left; font-size:0.9rem; width:100%; max-width:400px; display:flex; flex-direction:column; gap:12px;">';
    if (showdownResults && showdownResults.length > 0) {
      showdownResults.forEach(res => {
        const isWinner = res.name === winner;
        // Parse "A♠ K♣ 10♦..." into spans
        const cardTags = (res.cards || '').split(' ').filter(v => !!v).map(v => {
          const rank = v.slice(0, -1);
          const suit = v.slice(-1);
          const isRed = suit === '♥' || suit === '♦';
          return `<span style="background:#fff; color:${isRed ? '#C44A4A' : '#2A2A4A'}; padding:2px 4px; border-radius:4px; font-weight:700; margin-right:4px; font-size:0.85rem; border:1px solid #ddd; display:inline-flex; align-items:center;">
                    <span>${rank}</span><span style="font-size:0.7rem;margin-left:1px">${suit}</span>
                  </span>`;
        }).join('');

        detailHtml += `
          <div style="padding:10px; border-radius:12px; background:rgba(232,138,61,0.05); border:1px solid ${isWinner ? '#FFD700' : 'transparent'}">
             <div style="display:flex; justify-content:space-between; margin-bottom:8px; color:${isWinner ? '#E88A3D' : '#3D2A35'}; font-weight:700;">
               <span>${isWinner ? '👑 ' : ''}${res.name}</span>
               <span style="opacity:0.8; font-size:0.8rem; font-weight:normal">${res.desc}</span>
             </div>
             <div>${cardTags}</div>
          </div>`;
      });
    }
    detailHtml += '</div>';

    // Replace result-hand with detailed info
    const content = overlay.querySelector('.result-box');
    const oldDetails = content.querySelector('.result-details');
    if (oldDetails) oldDetails.remove();
    content.insertAdjacentHTML('beforeend', detailHtml);

    overlay.classList.add('show');
  }

  hideResult() {
    document.getElementById('result-overlay').classList.remove('show');
  }

  addChatMessage(sender, msg, isSystem) {
    const el = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-msg' + (isSystem ? ' system' : '');

    if (isSystem) {
      if (sender) {
        div.innerHTML = `<span class="sender">${sender}:</span> <span class="action-text">${msg}</span>`;
      } else {
        div.textContent = msg;
      }
    } else {
      div.innerHTML = `<span class="sender">${sender}:</span> ${msg}`;
    }
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
  }

  clearChat() {
    document.getElementById('chat-messages').innerHTML = '';
  }

  showError(msg, field) {
    const el = document.getElementById(field || 'lobby-error');
    if (el) { el.textContent = msg; setTimeout(() => el.textContent = '', 4000); }
  }

  setLoading(isLoading, msg) {
    const el = document.getElementById('loading-overlay');
    if (el) {
      el.classList.toggle('active', isLoading);
      if (msg) el.querySelector('.loading-msg').textContent = msg;
    }
  }

  resetLobby() {
    document.getElementById('setup-section').style.display = 'block';
    document.getElementById('room-section').style.display = 'none';
    document.getElementById('connection-status').textContent = 'WebRTC: 初始化中...';
  }
}

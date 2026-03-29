/**
 * Lobster Poker - Game Engine & Utils
 * (c) 2026 Lob
 */
'use strict';

// ==================== CONSTANTS ====================
export const INITIAL_CHIPS = 10000;
export const SMALL_BLIND = 5;
export const BIG_BLIND = 10;
export const MIN_RAISE = 5;
export const COUNTDOWN_SECONDS = 3;

export const SUITS = ['♠', '♥', '♦', '♣'];
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const RANK_VALUES = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };

export const PHASES = ['preflop', 'flop', 'turn', 'river', 'showdown', 'gameover'];
export const PHASE_LABELS = { lobby:'大厅', preflop:'翻牌前', flop:'翻牌', turn:'转牌', river:'河牌', showdown:'摊牌', gameover:'结束' };
export const PHASE_BET_LIMITS = { preflop:{min:SMALL_BLIND,max:BIG_BLIND}, flop:{min:BIG_BLIND,max:BIG_BLIND}, turn:{min:BIG_BLIND,max:BIG_BLIND}, river:{min:BIG_BLIND,max:BIG_BLIND} };

// ==================== POKER UTILS ====================
export function makeDeck() {
  const deck = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank });
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function handRank(hand) {
  const sorted = [...hand].sort((a,b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
  const values = sorted.map(c => RANK_VALUES[c.rank]);
  const suits = sorted.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = (values[0] - values[4] === 4) && new Set(values).size === 5;
  const isLowStraight = values.join(',') === '14,5,4,3,2'; // A-2-3-4-5
  const isStraightFlush = isFlush && isStraight;
  const isLowStraightFlush = isFlush && isLowStraight;

  const rankCounts = {};
  for (const c of hand) rankCounts[c.rank] = (rankCounts[c.rank]||0) + 1;
  const counts = Object.values(rankCounts).sort((a,b)=>b-a);
  const uniqueRanks = Object.keys(rankCounts);

  if (isStraightFlush || isLowStraightFlush) return [8, ...(isLowStraightFlush ? [5] : [values[0]]), ...values];
  if (counts[0] === 4) return [7, ...values.slice(0,1), ...values]; // Four of a kind
  if (counts[0] === 3 && counts[1] === 2) return [6, ...values.slice(0,1), ...values]; // Full house
  if (isFlush) return [5, ...values]; // Flush
  if (isStraight || isLowStraight) return [4, isLowStraight ? 5 : values[0]]; // Straight
  if (counts[0] === 3) return [3, ...values, ...values]; // Three of a kind
  if (counts[0] === 2 && counts[1] === 2) {
    const pairs = uniqueRanks.filter(r => rankCounts[r] === 2).sort((a,b)=>RANK_VALUES[b]-RANK_VALUES[a]);
    const kickers = values.filter(v => !pairs.map(r=>RANK_VALUES[r]).includes(v));
    return [2, ...pairs.map(r=>RANK_VALUES[r]), ...kickers];
  }
  if (counts[0] === 2) return [1, ...Object.keys(rankCounts).sort((a,b)=>RANK_VALUES[b]-RANK_VALUES[a]).map(r=>RANK_VALUES[r]), ...values]; // One pair
  return [0, ...values]; // High card
}

export function bestHandFrom7(cards7) {
  let best = null;
  for (let i = 0; i < cards7.length - 4; i++) {
    for (let j = i+1; j < cards7.length - 3; j++) {
      for (let k = j+1; k < cards7.length - 2; k++) {
        for (let l = k+1; l < cards7.length - 1; l++) {
          for (let m = l+1; m < cards7.length; m++) {
            const combo = [cards7[i],cards7[j],cards7[k],cards7[l],cards7[m]];
            const r = handRank(combo);
            if (!best || compareRanks(r, handRank(best)) > 0) best = combo;
          }
        }
      }
    }
  }
  return best;
}

export function compareRanks(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
}

export function describeHand(hand) {
  const r = handRank(hand);
  const names = ['高牌','一对','两对','三条','顺子','同花','葫芦','四条','同花顺'];
  return names[r[0]] || '未知';
}

export function cardDisplay(card) {
  if (!card) return '?';
  return card.rank + card.suit;
}

// ==================== BOT AI ====================
export function botDecide(state, playerIdx) {
  const p = state.players[playerIdx];
  if (!p || p.folded) return 'check';
  const toCall = state.currentBet - (p.currentBet || 0);
  const r = Math.random();
  const handStrength = estimateHandStrength(state, playerIdx);

  if (toCall === 0) {
    if (handStrength > 0.7) return r > 0.5 ? 'raise' : 'check';
    if (handStrength > 0.3) return 'check';
    return r > 0.7 ? 'fold' : 'check';
  } else {
    if (p.chips <= toCall) return 'allin';
    if (handStrength > 0.7) return toCall > p.chips * 0.3 ? 'allin' : (r > 0.4 ? 'raise' : 'call');
    if (handStrength > 0.4) return r > 0.3 ? 'call' : 'fold';
    return r > 0.6 ? 'fold' : 'call';
  }
}

export function estimateHandStrength(state, playerIdx) {
  const p = state.players[playerIdx];
  if (!p.hand || p.hand.length < 2) return 0;
  const [r1, r2] = [RANK_VALUES[p.hand[0].rank], RANK_VALUES[p.hand[1].rank]];
  let score = (r1 + r2) / 28;
  const isPair = p.hand[0].rank === p.hand[1].rank;
  if (isPair) score = (r1 - 2) / 13 * 0.5 + 0.5;
  const isSuited = p.hand[0].suit === p.hand[1].suit;
  if (isSuited) score = Math.min(1, score + 0.1);
  return Math.min(1, score);
}

// ==================== GAME STATE ====================
export class GameRoom {
  constructor(roomCode, hostId, hostName) {
    this.roomCode = roomCode;
    this.hostId = hostId;
    this.players = [{ id: hostId, name: hostName, isBot: false, isReady: false, chips: INITIAL_CHIPS, currentBet: 0, folded: false, actedThisRound: false, connected: true, hand: [] }];
    this.phase = 'lobby';
    this.publicCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.currentTurn = 0;
    this.dealerIdx = 0;
    this.deck = [];
    this.winner = null;
    this.winHand = null;
    this.showdownResults = [];
  }

  addPlayer(id, name) {
    if (this.players.length >= 2) return null;
    const p = { id, name, isBot: false, isReady: false, chips: INITIAL_CHIPS, currentBet: 0, handTotal: 0, folded: false, actedThisRound: false, connected: true, hand: [] };
    this.players.push(p);
    return p;
  }

  addBot(name) {
    if (this.players.length >= 2) return null;
    const botId = 'bot_' + Date.now();
    const p = { id: botId, name: name || 'Bot-' + (this.players.length+1), isBot: true, isReady: true, chips: INITIAL_CHIPS, currentBet: 0, handTotal: 0, folded: false, actedThisRound: false, connected: true, hand: [] };
    this.players.push(p);
    return p;
  }

  removePlayer(id) {
    const idx = this.players.findIndex(p => p.id === id);
    if (idx === -1) return;
    this.players.splice(idx, 1);
    if (this.dealerIdx >= this.players.length) this.dealerIdx = Math.max(0, this.players.length - 1);
  }

  allReady() { return this.players.length >= 2 && this.players.every(p => p.isReady); }

  get activePlayers() { return this.players.filter(p => !p.folded); }

  _bettingRoundComplete() {
    const active = this.players.filter(p => !p.folded);
    const canAct = active.filter(p => p.chips > 0);
    
    // If everyone is all-in or folded, round is complete
    if (canAct.length <= 1 && active.every(p => p.chips === 0 || p.folded || (p.currentBet === this.currentBet))) {
      return true;
    }

    // Must have everyone matched the current bet AND everyone must have had a chance to act
    const matched = active.every(p => p.folded || p.chips === 0 || p.currentBet === this.currentBet);
    const allActed = active.every(p => p.folded || p.chips === 0 || p.actedThisRound);
    
    return matched && allActed;
  }

  startGame() {
    console.info('[GAME] Round starting. Blinds:', SMALL_BLIND, '/', BIG_BLIND);
    this.phase = 'preflop';
    this.publicCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.winner = null;
    this.winHand = null;
    this.showdownResults = [];
    this.deck = makeDeck();

    this.players.forEach(p => { 
      p.currentBet = 0; 
      p.handTotal = 0;
      p.folded = false; 
      p.actedThisRound = false;
      p.hand = [this.deck.pop(), this.deck.pop()]; 
    });

    this.dealerIdx = (this.dealerIdx + 1) % this.players.length;
    const sbIdx = this.dealerIdx;
    const bbIdx = (this.dealerIdx + 1) % this.players.length;

    const sb = this.players[sbIdx];
    const bb = this.players[bbIdx];
    
    const sbAmt = Math.min(SMALL_BLIND, sb.chips);
    const bbAmt = Math.min(BIG_BLIND, bb.chips);
    
    sb.chips -= sbAmt; sb.currentBet = sbAmt;
    bb.chips -= bbAmt; bb.currentBet = bbAmt;
    this.currentBet = bbAmt;
    this.pot = sbAmt + bbAmt;

    // Small blind is dealer in heads-up, but big blind acts last preflop
    this.currentTurn = sbIdx;
    console.info('[GAME] Seating done. S-Blind:', sb.name, 'B-Blind:', bb.name, 'First actor:', this.players[this.currentTurn].name);
  }

  playerAction(playerId, action, amount) {
    const pIdx = this.players.findIndex(p => p.id === playerId);
    if (pIdx !== this.currentTurn) {
      console.warn('[GAME] Invalid actor:', playerId, 'Expected:', this.players[this.currentTurn]?.name);
      return false;
    }
    const p = this.players[pIdx];
    if (p.folded) return false;

    console.info('[GAME] Action:', p.name, '->', action, amount || '');
    p.actedThisRound = true;
    const toCall = this.currentBet - (p.currentBet || 0);

    switch(action) {
      case 'fold': p.folded = true; break;
      case 'check': if (toCall > 0) break; break;
      case 'call': {
        const callAmt = Math.min(toCall, p.chips);
        p.chips -= callAmt;
        p.currentBet = (p.currentBet || 0) + callAmt;
        this.pot += callAmt;
        break;
      }
      case 'raise': {
        const totalBet = Math.min(amount || this.currentBet + MIN_RAISE, p.chips + (p.currentBet || 0));
        const raiseAmt = totalBet - (p.currentBet || 0);
        if (raiseAmt <= 0) break;
        p.chips -= raiseAmt;
        p.currentBet = (p.currentBet || 0) + raiseAmt;
        this.pot += raiseAmt;
        if (p.currentBet > this.currentBet) {
          this.currentBet = p.currentBet;
          // Everyone else must act again
          this.players.forEach(p => { if (p.id !== playerId) p.actedThisRound = false; });
        }
        break;
      }
      case 'allin': {
        const allInAmt = p.chips;
        p.chips = 0;
        p.currentBet = (p.currentBet || 0) + allInAmt;
        this.pot += allInAmt;
        if (p.currentBet > this.currentBet) {
          this.currentBet = p.currentBet;
          this.players.forEach(p => { if (p.id !== playerId) p.actedThisRound = false; });
        }
        break;
      }
    }

    this._advanceTurn(pIdx);
    this._checkPhaseEnd();
    return true;
  }

  _advanceTurn(fromIdx) {
    const n = this.players.length;
    let next = (fromIdx + 1) % n;
    let tries = 0;
    while (tries < n) {
      const p = this.players[next];
      if (!p.folded && p.chips > 0) {
        this.currentTurn = next;
        return;
      }
      next = (next + 1) % n;
      tries++;
    }
    this.currentTurn = fromIdx;
  }

  _checkPhaseEnd() {
    const active = this.activePlayers;
    if (active.length <= 1) {
      this._resolveShowdown();
      this.phase = 'gameover';
      return;
    }
    if (this._bettingRoundComplete()) {
      this._nextPhase();
    }
  }

  _nextPhase() {
    const nextIdx = PHASES.indexOf(this.phase) + 1;
    const nextPhase = PHASES[nextIdx] || 'gameover';
    this.phase = nextPhase;
    console.info('[GAME] Phase changed to:', this.phase);

    if (this.phase === 'showdown') {
      this._resolveShowdown();
      this.phase = 'gameover';
      return;
    }
    if (this.phase === 'gameover') return;

    this.currentBet = 0;
    this.players.forEach(p => { 
      p.handTotal = (p.handTotal || 0) + (p.currentBet || 0);
      p.currentBet = 0; 
      p.actedThisRound = false; 
    });

    if (this.phase === 'flop') {
      this.publicCards.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
    } else if (this.phase === 'turn' || this.phase === 'river') {
      this.publicCards.push(this.deck.pop());
    }

    const n = this.players.length;
    let start = (this.dealerIdx + 1) % n;
    let tries = 0;
    while (tries < n) {
      const p = this.players[start];
      if (!p.folded && p.chips > 0) {
        this.currentTurn = start;
        return;
      }
      start = (start + 1) % n;
      tries++;
    }
    this.phase = 'showdown';
    this._resolveShowdown();
    this.phase = 'gameover';
  }

  _resolveShowdown() {
    const active = this.activePlayers;
    this.showdownResults = [];
    
    if (active.length === 1) {
      active[0].chips += this.pot;
      this.winner = active[0].name;
      this.winHand = '对手弃牌';
      this.showdownResults.push({ name: active[0].name, desc: '赢（对手弃牌）', cards: '' });
      return;
    }

    let bestPlayer = null, bestHandRankArr = null, bestHand = null;
    for (const player of active) {
      const allCards = [...player.hand, ...this.publicCards];
      if (allCards.length < 5) continue;
      const hand = bestHandFrom7(allCards);
      const rank = handRank(hand);
      const desc = describeHand(hand);
      
      this.showdownResults.push({ 
        name: player.name, 
        desc: desc, 
        cards: hand.map(c => cardDisplay(c)).join(' ')
      });

      if (!bestHandRankArr || compareRanks(rank, bestHandRankArr) > 0) {
        bestHandRankArr = rank; bestPlayer = player; bestHand = hand;
      }
    }

    if (bestPlayer) {
      bestPlayer.chips += this.pot;
      this.winner = bestPlayer.name;
      this.winHand = describeHand(bestHand);
    }
  }
}

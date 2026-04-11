(function(){
/* ===== CONSTANTS & CONFIG ===== */
var STYLES={
  normal:{name:'普攻流',emoji:'⚔️',desc:'稳定输出，攻击递增',perks:'Lv1:攻+5 | Lv2:30%连击 | Lv3:攻+回合数'},
  life:{name:'生命流',emoji:'❤️',desc:'超强生存，锁血回复',perks:'Lv1:血+30 | Lv2:一次锁血 | Lv3:回10%损血'},
  crit:{name:'暴击流',emoji:'💥',desc:'一击必杀，暴击爆发',perks:'Lv1:暴击+20% | Lv2:爆伤250% | Lv3:无视20%甲'},
  ult:{name:'大招流',emoji:'🔮',desc:'法术轰炸，周期爆发',perks:'Lv1:法术30伤 | Lv2:法伤+40% | Lv3:CD减2秒'},
  dodge:{name:'闪避流',emoji:'💨',desc:'灵活闪避，蓄力反击',perks:'Lv1:闪避+15% | Lv2:闪后必中+20% | Lv3:法伤-30%'},
  poison:{name:'毒伤流',emoji:'☠️',desc:'持续毒伤，无视护甲',perks:'Lv1:毒伤5 | Lv2:可叠2层 | Lv3:+1%最大血'}
};
var SK=Object.keys(STYLES);
var EPRE=['狂暴','迅捷','铁甲','剧毒','虚空','烈焰','暗影','寒霜'];
var ESUF=['纺织娘','铁线虫','刀锋螳','霸王蝶','战熊蚁','电击蜂','毒蝎','巨蜥'];
var PNAME_A=['铁头','铜皮','狂暴','迅捷','隐形','毒牙','裂甲','幻影','霸王','怒爪'];
var PNAME_B=['蛐蛐','蝼蛄','螽斯','蟋蟀','纺织娘','油葫芦'];

var ENEMY_TRAITS=[
  {id:'rage',n:'狂暴',d:'血量<40%时攻击+40%',f:function(e,tick,p,L){if(e.hp/e.mHp<0.4&&!e._raged){e._raged=true;L.push({t:'bo',s:'🔥 '+e.n+'进入狂暴状态！'});}}},
  {id:'heal',n:'再生',d:'每回合回复3%生命',f:function(e,tick,p,L){var r=Math.floor(e.mHp*0.03);if(r>0){e.hp=Math.min(e.mHp,e.hp+r);L.push({t:'sy',s:' └再生+'+r});}}},
  {id:'reflect',n:'反震',d:'受击时反弹15%伤害',f:function(e,tick,p,L,dmg){if(dmg>0){var r=Math.floor(dmg*0.15);p.hp=Math.max(0,p.hp-r);L.push({t:'ea',s:' └反震-'+r});}}},
  {id:'combo',n:'疾风',d:'每4回合触发一次二连击',f:function(e,tick,p,L){return (tick%4===0);}},
  {id:'vamp',n:'嗜血',d:'15%全能吸血',f:function(e,tick,p,L,dmg){if(dmg>0){var v=Math.floor(dmg*0.15);e.hp=Math.min(e.mHp,e.hp+v);L.push({t:'sy',s:' └嗜血+'+v});}}},
  {id:'weaken',n:'破甲',d:'攻击降低目标1点护甲',f:function(e,tick,p,L){p.ar=Math.max(0,p.ar-1);L.push({t:'sy',s:' └破甲！我方护甲-1'});}}
];

var OPS=[
  /* RED (tr) */
  {n:'影子分身',d:'[特效] 攻击 35% 几率触发两次伤害',f:function(p){p._shadow=0.35},r:'tr',tags:['normal']},
  {n:'不灭意志',d:'[被动] 受到致命伤时锁血1点并无敌1回合(每局1次)',f:function(p){p._rebirth=1},r:'tr',tags:['life']},
  {n:'时空冻结',d:'[主动] 使敌人跳过2回合，且下回合必暴',f:function(p){p.acts.push({n:'冻结',cd:0,mcd:8,u:function(p,e,L){e._st=2;p._gHitN=true;L.push({t:'bo',s:'⏱️ 时空冻结！'});}})},r:'tr',tags:[]},
  /* ORANGE (to) */
  {n:'嗜血渴望',d:'[特效] 暴击时回复伤害30%的生命',f:function(p){p._leech=0.3},r:'to',tags:['crit']},
  {n:'绝地求生',d:'[被动] 血量<30%时增益 50%闪避',f:function(p){p._lastStand=1},r:'to',tags:['life','dodge']},
  {n:'狂暴药剂',d:'[主动] 牺牲10点生命，换取3回合内2倍攻击',f:function(p){p.acts.push({n:'狂暴',cd:0,mcd:6,u:function(p,e,L){p.hp=Math.max(1,p.hp-10);p._rage=3;L.push({t:'bo',s:'💊 注入狂暴药剂！'});}})},r:'to',tags:['normal']},
  /* BLUE (tb) */
  {n:'破甲重击',d:'[特效] 攻击20%几率使目标护甲永久-2',f:function(p){p._sunder=0.2},r:'tb',tags:['normal']},
  {n:'战神护盾',d:'[主动] 获得35点护盾，持续3回合',f:function(p){p.acts.push({n:'护盾',cd:0,mcd:5,u:function(p,e,L){p._shield=3;p._shieldV=35;L.push({t:'bo',s:'🛡️ 开启战神护盾！'});}})},r:'tb',tags:['life']},
  {n:'净化',d:'[主动] 解除所有状态并回30生命',f:function(p){p.acts.push({n:'净化',cd:0,mcd:4,u:function(p,e,L){p._st=0;p._br=0;p._fr=0;p.hp=Math.min(p.mHp,p.hp+30);L.push({t:'bo',s:'✨ 净化清明！'});}})},r:'tb',tags:[]},
  /* GREEN (tg) */
  {n:'成长之星',d:'[被动] 战斗每轮永久+1点攻击',f:function(p){p._grow=1},r:'tg',tags:[]},
  {n:'财源滚滚',d:'立即获得15金币',f:function(p){p.g+=15},r:'tg',tags:[]},
  /* WHITE (tw) */
  {n:'基础强化',d:'生命+20，护甲+2',f:function(p){p._h.push({t:'hp',v:20},{t:'def',v:2})},r:'tw',tags:[]}
];

var EQUIPS=[
  {id:'blade',name:'🗡️ 锋刃',desc:'攻击力+6',h:[{t:'ar',v:6}]},
  {id:'shield',name:'🛡️ 铁壁',desc:'生命+40，护甲+5',h:[{t:'hp',v:40},{t:'def',v:5}]},
  {id:'gem',name:'💎 灵石',desc:'大招伤害+15',h:[{t:'ub',v:15}]},
  {id:'clover',name:'🍀 四叶草',desc:'暴击+10%，闪避+5%',h:[{t:'cr',v:10},{t:'dr',v:5}]},
  {id:'flame',name:'🔥 烈焰心',desc:'攻击+4，暴击伤害+30%',h:[{t:'ar',v:4},{t:'cr',v:0,d:0.3}]},
  {id:'syringe',name:'💉 回春针',desc:'生命+35，吸血5%',h:[{t:'hp',v:35},{t:'ls',v:5}]},
  {id:'fang',name:'☠️ 蚀骨钉',desc:'毒伤+4，攻击+2',h:[{t:'pd',v:4},{t:'ar',v:2}]},
  {id:'boots',name:'💨 疾风靴',desc:'闪避+10%，攻击+2',h:[{t:'dr',v:10},{t:'ar',v:2}]}
];

var SAVE_VER=3;
var SPEEDS=[{l:'1x',d:700},{l:'2x',d:300},{l:'⚡',d:0}];

/* ===== ACHIEVEMENT BONUSES ===== */
function getAchBonus(){
  var hs=parseInt(localStorage.getItem('ch-hs')||'0');
  return{
    gold:hs>=3?5:0,
    hp:hs>=5?10:0,
    pick4:hs>=8,
    equipUp:hs>=12
  };
}
function achText(){
  var hs=parseInt(localStorage.getItem('ch-hs')||'0');
  var t=[];
  if(hs>=3)t.push('🥉+5金');
  if(hs>=5)t.push('🥈+10血');
  if(hs>=8)t.push('🥇4选1');
  if(hs>=12)t.push('👑掉率↑');
  return t.length>0?t.join(' '):'';
}

/* ===== STATE ===== */
/* ===== STATE ===== */
var st={ph:'SPLASH',r:1,pl:null,en:null,bt:0,br:null,at:null,
  hs:parseInt(localStorage.getItem('ch-hs')||'0'),
  spd:0,stats:null,curChoices:null,bossBonus:false};

/* ===== SFX ENGINE (Web Audio API) ===== */
var AU=new(window.AudioContext||window.webkitAudioContext)();
function sfx(f,t,v,type){
  var o=AU.createOscillator(),g=AU.createGain();
  o.type=type||'square';o.frequency.setValueAtTime(f,AU.currentTime);
  g.gain.setValueAtTime(v,AU.currentTime);g.gain.exponentialRampToValueAtTime(0.0001,AU.currentTime+t);
  o.connect(g);g.connect(AU.destination);o.start();o.stop(AU.currentTime+t);
}
var S={
  hit:function(){sfx(150,0.1,0.1,'sawtooth');},
  crit:function(){sfx(400,0.2,0.15);sfx(200,0.2,0.1);},
  ult:function(){sfx(100,0.8,0.2,'sawtooth');sfx(600,0.5,0.1);},
  blip:function(){sfx(600,0.05,0.05,'sine');},
  win:function(){sfx(400,0.1,0.1);setTimeout(function(){sfx(600,0.3,0.1);},100);},
  lose:function(){sfx(200,0.3,0.1);sfx(100,0.5,0.1);}
};

/* ===== HELPERS ===== */
function $(id){return document.getElementById(id);}
function rnd(a,b){return a+Math.floor(Math.random()*(b-a+1));}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function shake(){document.body.classList.remove('v-shake');void document.body.offsetWidth;document.body.classList.add('v-shake');}
function flash(){document.body.classList.remove('v-flash');void document.body.offsetWidth;document.body.classList.add('v-flash');}
function hit(){document.body.classList.remove('v-hit');void document.body.offsetWidth;document.body.classList.add('v-hit');S.hit();}
function ultTxt(txt){var fx=$('ult-fx');fx.classList.add('v');$('ult-txt').textContent=txt;S.ult();setTimeout(function(){fx.classList.remove('v');},1500);}
function genPlayerName(){return pick(PNAME_A)+pick(PNAME_B);}
function genEnemyName(){return pick(EPRE)+pick(ESUF);}

function initStats(){
  return {
    dmgDealt: 0,
    dmgTaken: 0,
    goldEarned: 0,
    crits: 0,
    maxHit: 0,
    dodges: 0,
    kills: []
  };
}

/* ===== PLAYER ===== */
function createPlayer(sk){
  var ab=getAchBonus();
  return{n:genPlayerName(),sk:sk,sl:1,ba:[12,16],bHp:150+ab.hp,hp:150+ab.hp,mHp:150+ab.hp,
    ar:3,cr:5,cd:2,dr:0,pd:0,ls:0,th:0,ub:0,ea:0,mhb:0,g:20+ab.gold,
    ps:0,_pdmg:0,_pLv3:false,_h:[],equips:[],acts:[],
    _st:0,_br:0,_fr:0,
    _gHit:false,_gHitN:false,_lifelock:false,_ultCD:-1};
}

/* ===== RECALC STATS ===== */
function processStats(list,cr,cd,dr,pd,ls,th,def,aMin,aMax,ea,ub,mhb){
  for(var i=0;i<list.length;i++){
    var c=list[i];
    if(c.t==='hp')mhb+=c.v;
    else if(c.t==='cr'){cr+=c.v||0;cd+=c.d||0;}
    else if(c.t==='dr')dr+=c.v||0;
    else if(c.t==='pd')pd+=c.v||0;
    else if(c.t==='ls')ls+=c.v||0;
    else if(c.t==='th'){th+=c.v||0;def+=c.v||0;}
    else if(c.t==='ar'){aMin+=c.v||0;aMax+=c.v||0;}
    else if(c.t==='ea')ea+=c.v||0;
    else if(c.t==='ub')ub+=c.v||0;
    else if(c.t==='def')def+=c.v||0;
  }
  return{cr:cr,cd:cd,dr:dr,pd:pd,ls:ls,th:th,def:def,aMin:aMin,aMax:aMax,ea:ea,ub:ub,mhb:mhb};
}
function rc(u){
  var s=processStats(u._h,5,2,0,0,0,0,3,12+(u._gV||0),16+(u._gV||0),0,0,0);
  if(u.equips){
    for(var i=0;i<u.equips.length;i++){
      s=processStats(u.equips[i].h,s.cr,s.cd,s.dr,s.pd,s.ls,s.th,s.def,s.aMin,s.aMax,s.ea,s.ub,s.mhb);
    }
  }
  var sk=u.sk,sl=u.sl;
  if(sk==='normal'&&sl>=1){s.aMin+=5;s.aMax+=5;}
  if(sk==='crit'&&sl>=1)s.cr+=20;
  if(sk==='crit'&&sl>=2)s.cd+=0.5;
  if(sk==='crit'&&sl>=3)u._iAr=true;
  if(sk==='dodge'&&sl>=1)s.dr+=15;
  if(sk==='poison'&&sl>=1)s.pd+=5;
  if(sk==='ult'&&sl>=1)s.ub+=30;
  if(sk==='life'&&sl>=1)s.mhb+=30;
  u.cr=s.cr;u.cd=s.cd;u.dr=s.dr;u.pd=s.pd;u.ls=s.ls;u.th=s.th;u.ar=s.def;
  u.ba=[s.aMin,s.aMax];u.ea=s.ea;u.ub=s.ub;
  if(s.mhb>0){u.mhb=s.mhb;u.mHp=u.bHp+s.mhb;}
}

/* ===== ENEMY GENERATION ===== */
function isBoss(r){return r>0&&r%5===0;}
function genEnemy(r){
  var boss=isBoss(r);
  var sk=pick(SK),sl=Math.min(3,Math.ceil(r/2.5));
  if(boss) sl=r>=10?3:Math.min(3,sl+1);
  var hp=60+r*25,atMin=12+Math.floor(r*3.5),atMax=18+Math.floor(r*4.5);
  var def=Math.floor(r*0.8)+(boss?5:0);
  if(boss){hp=Math.floor(hp*1.8);atMin=Math.floor(atMin*1.3);atMax=Math.floor(atMax*1.3);}
  var nm=(boss?'👑 ':'')+genEnemyName();
  var e={n:nm,sk:sk,sl:sl,ba:[atMin,atMax],bHp:hp,hp:hp,mHp:hp,
    ar:def,cr:5+r,cd:2,dr:0,pd:0,ls:0,th:0,ub:0,ea:0,
    ps:0,_pdmg:0,_pLv3:false,_h:[],traits:[],
    _st:0,_br:0,_fr:0,
    _gHit:false,_gHitN:false,_lifelock:false,_ultCD:-1,boss:boss,bpDesc:''};
  
  if(r>=3){
    var nT=boss?2:(r>=8?1:(Math.random()<0.4?1:0));
    for(var i=0;i<nT;i++){
      var t=pick(ENEMY_TRAITS);
      if(e.traits.indexOf(t)<0) e.traits.push(t);
    }
  }

  if(boss){
    var bps=[
      {d:'反弹8',f:function(e){e.th=8;}},
      {d:'暴击+15%',f:function(e){e.cr+=15;}},
      {d:'闪避+10%',f:function(e){e.dr+=10;}}
    ];
    var bp=pick(bps);bp.f(e);e.bpDesc=bp.d;
  }
  rc(e);return e;
}

/* ===== BATTLE ENGINE ===== */
function battleStep(tick,p,e,boost){
  var L=[];
  if(tick===10)L.push({t:'bo',s:'🔥 狂暴阶段！双方伤害+50%'});
  if(tick===15)L.push({t:'bo',s:'🔥🔥 极限狂暴！双方伤害+100%'});

  /* --- Player Action --- */
  if(p._st>0){
    L.push({t:'st',s:p.n+'晕眩中...'});p._st--;
  }else{
    var pMiss=p._fr>0&&Math.random()<0.5;
    var pDr=p.dr; if(p._lastStand&&p.hp/p.mHp<0.3) pDr+=50; 
    var eDodged=!p._gHit&&Math.random()*100<e.dr;
    if(pMiss||eDodged){
      L.push({t:'do',s:pMiss?(p.n+'受冻失误！'):(e.n+'闪避了！')});
      if(e.sk==='dodge'&&e.sl>=2&&!pMiss){e._gHitN=true;L.push({t:'sy',s:' └蓄力反击！'});}
      if(e.sk==='dodge'&&e.sl>=1&&!pMiss){p._fr=Math.max(p._fr,2);L.push({t:'fr',s:' └冻结攻击者！❄️'});}
      p._gHit=false;
    }else{
      var pBase=rnd(p.ba[0],p.ba[1]);
      if(p.sk==='normal'&&p.sl>=3)pBase+=tick;
      if(p._rage>0) pBase*=2;
      var pCrit=p._gHit||Math.random()*100<p.cr;
      var pRaw=Math.floor(pBase*(pCrit?p.cd:1)*(p._gHit?1.2:1)*boost);
      var eDef=(e._br>0)?0:e.ar;
      if(p._iAr)eDef=Math.floor(eDef*0.8);
      var pDmg=Math.max(5,pRaw-eDef);
      
      if(e.sk==='life'&&e.sl>=2&&!e._lifelock&&e.hp-pDmg<=0){pDmg=e.hp-1;e._lifelock=true;L.push({t:'sy',s:e.n+'锁血！'});}
      if(e._rebirth&&e.hp-pDmg<=0&&!e._rebirthX){pDmg=e.hp-1;e._rebirthX=true;e._st=1;L.push({t:'st',s:e.n+'不灭意志！'});}

      if(e._shield>0&&e._shieldV>0){
        var abs=Math.min(e._shieldV,pDmg);
        e._shieldV-=abs;pDmg-=abs;
        L.push({t:'sy',s:' └护盾抵扣 '+abs});
      }
      e.hp=Math.max(0,e.hp-pDmg);
      L.push({t:pCrit?'cr':'pa',s:p.n+' '+pDmg+(pCrit?' 💥':'')});
      if(pCrit){
        shake();flash();S.crit();
        if(p.sk==='crit'&&p.sl>=1&&Math.random()<0.3){e._st=1;L.push({t:'st',s:' └眩晕敌人！😵'});}
        if(p._leech){var lh=Math.floor(pDmg*p._leech);p.hp=Math.min(p.mHp,p.hp+lh);L.push({t:'sy',s:' └嗜血+'+lh});}
      }else{hit();}
      if(p._sunder&&Math.random()<p._sunder){e.ar=Math.max(0,e.ar-2);L.push({t:'sy',s:' └破甲-2'});}
      if(p._shadow&&Math.random()<p._shadow&&e.hp>0){var sd=Math.floor(pDmg*0.8);e.hp=Math.max(0,e.hp-sd);L.push({t:'sy',s:' └影子追击！'+sd});S.hit();}

      e.traits.forEach(function(t){if(t.id==='reflect') t.f(e,tick,p,L,pDmg);});
      st.stats.dmgDealt+=pDmg;if(pCrit)st.stats.crits++;if(pDmg>st.stats.maxHit)st.stats.maxHit=pDmg;
      if(p.ls>0){var lh=Math.floor(pDmg*p.ls/100);if(lh>0){p.hp=Math.min(p.mHp,p.hp+lh);L.push({t:'sy',s:' └吸血+'+lh});}}
      if(p.pd>0){var ms=(p.sk==='poison'&&p.sl>=2)?2:1;e.ps=Math.min(e.ps+1,ms);e._pdmg=p.pd;e._pLv3=(p.sk==='poison'&&p.sl>=3);L.push({t:'sy',s:' └毒'+p.pd});}
      if(e.th>0){p.hp=Math.max(0,p.hp-e.th);L.push({t:'ea',s:' └荆棘'+e.th});st.stats.dmgTaken+=e.th;}
      p._gHit=false;
    }
  }
  if(e.hp<=0)return{w:'p',ls:L.concat([{t:'vi',s:e.n+'倒下！胜利！🎉'}])};

  /* Player Ult */
  if(p.ub>0&&p._ultCD<=0&&p._st<=0){
    ultTxt(p.n+' · 万剑齐发！');
    var ud=p.ub;if(p.sk==='ult'&&p.sl>=2)ud=Math.floor(ud*1.4);
    e.hp=Math.max(0,e.hp-ud);L.push({t:'cr',s:p.n+'法术！'+ud+' 🔮'});
    p._ultCD=(p.sk==='ult'&&p.sl>=3)?3:5;st.stats.dmgDealt+=ud;
    if(p.sk==='ult'&&p.sl>=1&&Math.random()<0.5){e._br=3;L.push({t:'bu',s:' └引发灼烧！🔥'});}
    if(e.hp<=0)return{w:'p',ls:L.concat([{t:'vi',s:e.n+'被法术击杀！'}])};
  }
  if(p.ub>0&&p._ultCD>0&&p._fr<=0)p._ultCD--;

  /* --- Enemy Action --- */
  if(e._st>0){
    L.push({t:'st',s:e.n+'晕眩中...'});e._st--;
  }else{
    var eMiss=e._fr>0&&Math.random()<0.5;
    var pDr=p.dr; if(p._lastStand&&p.hp/p.mHp<0.3) pDr+=50;
    var pDodged=!e._gHit&&Math.random()*100<pDr;
    if(eMiss||pDodged){
      L.push({t:'do',s:eMiss?(e.n+'受冻失误！'):(p.n+'闪避了！')});st.stats.dodges++;
      if(p.sk==='dodge'&&p.sl>=2&&!eMiss){p._gHitN=true;L.push({t:'sy',s:' └蓄力反击！'});}
      if(p.sk==='dodge'&&p.sl>=1&&!eMiss){e._fr=Math.max(e._fr,2);L.push({t:'fr',s:' └冻结攻击者！❄️'});}
      e._gHit=false;
    }else{
      var eBase=rnd(e.ba[0],e.ba[1]);
      if(e.sk==='normal'&&e.sl>=3)eBase+=tick;
      if(e._raged) eBase=Math.floor(eBase*1.4);
      var eCrit=e._gHit||Math.random()*100<e.cr;
      var eRaw=Math.floor(eBase*(eCrit?e.cd:1)*(e._gHit?1.2:1)*boost);
      var pDef=(p._br>0)?0:p.ar;
      if(e._iAr)pDef=Math.floor(pDef*0.8);
      var eDmg=Math.max(5,eRaw-pDef);
      if(p.sk==='life'&&p.sl>=2&&!p._lifelock&&p.hp-eDmg<=0){eDmg=p.hp-1;p._lifelock=true;L.push({t:'sy',s:p.n+'锁血！'});}
      if(p._shield>0&&p._shieldV>0){
        var abs=Math.min(p._shieldV,eDmg);
        p._shieldV-=abs;eDmg-=abs;
        L.push({t:'sy',s:' └护盾抵扣 '+abs});
      }
      p.hp=Math.max(0,p.hp-eDmg);
      L.push({t:eCrit?'cr':'ea',s:e.n+' '+eDmg+(eCrit?' 💥':'')});st.stats.dmgTaken+=eDmg;
      if(eCrit){shake();S.crit();}else{hit();}
      if(p._rebirth&&p.hp<=0&&!p._rebirthX){p.hp=1;p._rebirthX=true;p._st=1;L.push({t:'st',s:p.n+'不灭意志！'});}
      e.traits.forEach(function(t){if(t.id==='vamp')t.f(e,tick,p,L,eDmg);if(t.id==='weaken')t.f(e,tick,p,L);});
      if(e.ls>0){var elh=Math.floor(eDmg*e.ls/100);if(elh>0)e.hp=Math.min(e.mHp,e.hp+elh);}
      if(e.pd>0){var ms=(e.sk==='poison'&&e.sl>=2)?2:1;p.ps=Math.min(p.ps+1,ms);p._pdmg=e.pd;p._pLv3=(e.sk==='poison'&&e.sl>=3);L.push({t:'sy',s:' └毒'+e.pd});}
      if(p.th>0){e.hp=Math.max(0,e.hp-p.th);L.push({t:'pa',s:' └荆棘'+p.th});}
      e._gHit=false;
    }
  }
  if(p.hp<=0)return{w:'e',ls:L.concat([{t:'di',s:p.n+'倒下！战败…'}])};

  if(e.sk==='normal'&&e.sl>=2&&!eDodged&&p.hp>0&&Math.random()<0.3){
    var ecb=rnd(e.ba[0],e.ba[1]);var ecc=Math.random()*100<e.cr;
    var ecd=Math.max(5,Math.floor(ecb*(ecc?e.cd:1)*boost)-p.ar);
    p.hp=Math.max(0,p.hp-ecd);L.push({t:ecc?'cr':'ea',s:' └'+e.n+'连击！'+ecd+(ecc?' 💥':'')});
    st.stats.dmgTaken+=ecd;
    if(p.hp<=0)return{w:'e',ls:L.concat([{t:'di',s:' └连击击杀！'}])};
  }
  
  /* [Trait] Combo Check */
  var hasCombo=false;e.traits.forEach(function(t){if(t.id==='combo'&&t.f(e,tick,p,L))hasCombo=true;});
  if(hasCombo&&p.hp>0){
    var cb=rnd(e.ba[0],e.ba[1]);if(e._raged)cb*=1.4;
    var cd=Math.max(5,Math.floor(cb)-p.ar);
    p.hp=Math.max(0,p.hp-cd);L.push({t:'ea',s:' └'+e.n+'疾风连击！'+cd});
    if(p.hp<=0)return{w:'e',ls:L.concat([{t:'di',s:' └疾风击杀！'}])};
  }
  if(e.ub>0&&e._ultCD<=0){
    var eu=e.ub;if(e.sk==='ult'&&e.sl>=2)eu=Math.floor(eu*1.4);
    if(p.sk==='dodge'&&p.sl>=3)eu=Math.floor(eu*0.7);
    p.hp=Math.max(0,p.hp-eu);L.push({t:'cr',s:e.n+'法术！'+eu+' 🔮'});
    e._ultCD=(e.sk==='ult'&&e.sl>=3)?3:5;st.stats.dmgTaken+=eu;
    if(p.hp<=0)return{w:'e',ls:L.concat([{t:'di',s:p.n+'被法术击杀！'}])};
  }
  if(e.ub>0&&e._ultCD>0)e._ultCD--;

  /* [Trait] Passive Ticks (Rage, Heal, Combo) */
  e.traits.forEach(function(t){
    if(t.id==='rage'||t.id==='heal') t.f(e,tick,p,L);
  });

  /* Poison */
  if(e.ps>0){
    var epd=(e._pdmg||0)*e.ps;if(e._pLv3)epd+=Math.floor(e.mHp*0.01)*e.ps;
    if(epd>0){e.hp=Math.max(0,e.hp-epd);L.push({t:'sy',s:' 🟢 '+e.n+'毒发-'+epd});if(e.hp<=0)return{w:'p',ls:L.concat([{t:'vi',s:e.n+'毒发倒下！'}])};}
  }
  if(p.ps>0){
    var ppd=(p._pdmg||0)*p.ps;if(p._pLv3)ppd+=Math.floor(p.mHp*0.01)*p.ps;
    if(ppd>0){p.hp=Math.max(0,p.hp-ppd);L.push({t:'sy',s:' 🟢 '+p.n+'毒发-'+ppd});if(p.hp<=0)return{w:'e',ls:L.concat([{t:'di',s:p.n+'毒发倒下！'}])};}
  }

  /* Regen */
  if(p.sk==='life'&&p.sl>=3){var rg=Math.floor((p.mHp-p.hp)*0.1);if(rg>0){p.hp=Math.min(p.mHp,p.hp+rg);L.push({t:'sy',s:' └回流+'+rg});}}
  if(e.sk==='life'&&e.sl>=3){var erg=Math.floor((e.mHp-e.hp)*0.1);if(erg>0)e.hp=Math.min(e.mHp,e.hp+erg);}

  p._gHit=p._gHitN||false;p._gHitN=false;
  e._gHit=e._gHitN||false;e._gHitN=false;
  if(p._br>0)p._br--;if(p._fr>0)p._fr--;
  if(e._br>0)e._br--;if(e._fr>0)e._fr--;
  if(p._rage>0)p._rage--;if(p._shield>0)p._shield--;
  if(e._rage>0)e._rage--;if(e._shield>0)e._shield--;
  return{w:null,ls:L};
}

/* ===== UI UPDATES ===== */
function al(e){
  var d=document.createElement('div');
  d.className='le '+(e.t||'');d.textContent=e.s;
  $('la').appendChild(d);$('la').scrollTop=$('la').scrollHeight;
}
function logStats(){
  var p=st.pl;al({t:'sy',s:'💥'+p.cr+'% 🚪'+p.dr+'% ☠️'+p.pd+' ⚔️'+p.ba[0]+'-'+p.ba[1]+' ❤️'+p.hp+'/'+p.mHp});
}
function ui(){
  var p=st.pl,e=st.en;if(!p)return;
  $('rn').textContent=st.r;
  $('st').textContent=st.r>1?'连胜'+(st.r-1):'初始';
  $('bnt').textContent=st.r;$('gv').textContent=p.g;
  $('pn').textContent=p.n;$('sb').textContent=STYLES[p.sk].emoji+' '+STYLES[p.sk].name;
  $('sl').textContent=p.sl;
  var pSts='';if(p._st)pSts+='😵';if(p._br)pSts+='🔥';if(p._fr)pSts+='❄️';if(p._shield)pSts+='🛡️';
  $('hv').textContent=p.hp+(pSts?' '+pSts:'');$('hm').textContent=p.mHp;
  var hpPct=p.hp/p.mHp*100;
  $('hb').style.width=hpPct+'%';$('hb').className='hf p-bar'+(hpPct<30?' low':'');
  $('patk').textContent=p.ba[0]+'-'+p.ba[1];$('pdef').textContent=p.ar;
  $('pcrt').textContent=p.cr;$('pdge').textContent=p.dr+(p._lastStand&&p.hp/p.mHp<0.3?'+50':'');$('ppoi').textContent=p.pd+(p.ps>0?'('+p.ps+')':'');
  
  var eqH='';var mxS=2;
  if(p.equips&&p.equips.length>0){
    p.equips.forEach(function(eq){eqH+='<span class="eq-slot">'+eq.name+'</span>';});
    for(var i=p.equips.length;i<mxS;i++)eqH+='<span class="eq-slot eq-empty">空槽</span>';
  }else{for(var i2=0;i2<mxS;i2++)eqH+='<span class="eq-slot eq-empty">空槽</span>';}
  $('peq').innerHTML='🎒 '+eqH;$('achRow').textContent=achText();

  var actH='';
  if(p.acts) p.acts.forEach(function(a,i){
    var dis=(st.ph!=='BATTLE'||a.cd>0)?'disabled':'';
    var cd=a.cd>0?' data-cd="'+a.cd+'"':'';
    actH+='<button class="act-btn" '+dis+cd+' onclick="useActive('+i+')">'+a.n+'</button>';
  });
  $('actRow').innerHTML=actH;

  if(e){
    $('en').textContent=e.n;$('en').className=e.boss?'en-boss':'';
    var tTexts=e.traits.map(function(t){return t.n;}).join('|');
    var eSts='';if(e._st)eSts+='😵';if(e._br)eSts+='🔥';if(e._fr)eSts+='❄️';
    $('esb').textContent=STYLES[e.sk].emoji+' '+STYLES[e.sk].name+(e.boss?' '+e.bpDesc:'')+(tTexts?' ['+tTexts+']':'');
    $('esl').textContent=e.sl;$('ehv').textContent=e.hp+(eSts?' '+eSts:'');$('ehm').textContent=e.mHp;
    var ehp=e.hp/e.mHp*100;$('ehb').style.width=ehp+'%';$('ehb').className='hf e-bar'+(ehp<30?' low':'');
    $('eatk').textContent=e.ba[0]+'-'+e.ba[1];$('edef').textContent=e.ar;
    $('ecrt').textContent=e.cr;$('edge').textContent=e.dr;$('epoi').textContent=e.pd;
  }
  if(p.sl<3&&p.g>=15&&st.ph==='PREPARE')$('bu').classList.remove('h');else $('bu').classList.add('h');
  if(p.hp<p.mHp&&p.g>=8&&st.ph==='PREPARE')$('bheal').classList.remove('h');else $('bheal').classList.add('h');
  $('bspeed').textContent=SPEEDS[st.spd].l;
  $('rind').textContent=(st.ph==='BATTLE'?'⏱'+st.bt+(st.bt>=15?' 🔥🔥':st.bt>=10?' 🔥':''):isBoss(st.r)?'👑 BOSS':'');
}

/* ===== BREAKTHROUGH SYSTEM ===== */
function genChoices(){
  var ab=getAchBonus();var n=ab.pick4?4:3;
  var rw={tw:10,tg:30,tb:30,to:20,tr:10},tt=0;for(var k in rw)tt+=rw[k];
  var pool=OPS.filter(function(o){return !(o.n==='经验胶囊'&&st.pl.sl>=3);});
  var chosen=[];
  for(var i=0;i<60&&chosen.length<n;i++){
    var roll=Math.random()*tt,cu=0,sel='tg';
    for(var k2 in rw){cu+=rw[k2];if(roll<cu){sel=k2;break;}}
    var cands=pool.filter(function(o){return o.r===sel&&chosen.indexOf(o)<0;});
    if(!cands.length)continue;
    var weight=[];cands.forEach(function(c){var w=(c.tags&&c.tags.indexOf(st.pl.sk)>=0)?25:10;for(var j=0;j<w;j++)weight.push(c);});
    chosen.push(pick(weight));
  }
  while(chosen.length<n){var rem=pool.filter(function(o){return chosen.indexOf(o)<0;});if(!rem.length)break;chosen.push(pick(rem));}
  return chosen;
}
function showChoices(chs){
  st.curChoices=chs;var ct=$('cb');ct.innerHTML='';
  chs.forEach(function(ch){
    var btn=document.createElement('button');btn.className='btn cb '+ch.r;
    btn.innerHTML='<div class="cn">'+ch.n+'</div><div class="cd">'+ch.d+'</div>';
    btn.onclick=function(){onChoice(ch);};ct.appendChild(btn);
  });
  if(st.pl.g>=10)$('brf').classList.remove('h');else $('brf').classList.add('h');
  $('co').classList.remove('h');$('bn').classList.add('h');
}
function onChoice(ch){
  ch.f(st.pl);rc(st.pl);if(ch.heal)st.pl.hp=st.pl.mHp;else st.pl.hp=Math.min(st.pl.hp,st.pl.mHp);
  $('co').classList.add('h');$('bn').classList.remove('h');
  al({t:'sy',s:'获得了「'+ch.n+'」'});logStats();
  if(st.bossBonus){st.bossBonus=false;al({t:'bo',s:'👑 Boss奖励：再次突破！'});setTimeout(function(){showChoices(genChoices());},400);return;}
  if(st._pendingEquip){var eq=st._pendingEquip;st._pendingEquip=null;setTimeout(function(){showEquipDrop(eq);},300);return;}
  finishPostVictory();
}
function useActive(i){
  var a=st.pl.acts[i];if(a.cd>0||st.ph!=='BATTLE')return;
  var L=[];a.u(st.pl,st.en,L);a.cd=a.mcd;L.forEach(al);ui();
}
window.useActive = useActive;

function finishPostVictory(){st.en=genEnemy(st.r);st.ph='PREPARE';ui();save();al({t:'sy',s:'下一轮对手：'+st.en.n+(st.en.boss?' 👑BOSS':'')});}

/* ===== EQUIPMENT SYSTEM ===== */
function showEquipDrop(eq){
  var body=$('eo-body');body.innerHTML='<div class="eo-item">'+eq.name+'<div class="eo-desc">'+eq.desc+'</div></div>';
  var p=st.pl;if(!p.equips)p.equips=[];
  if(p.equips.length<2){
    var b=document.createElement('button');b.className='btn eq-btn';b.textContent='✅ 装备';
    b.onclick=function(){equipItem(eq,-1);};body.appendChild(b);
  }else{
    body.innerHTML+='<div class="eo-cur">── 当前装备（点击替换）──</div>';
    p.equips.forEach(function(c,i){var br=document.createElement('button');br.className='btn eq-btn';br.textContent='🔄 替换 '+c.name;br.onclick=function(){equipItem(eq,i);};body.appendChild(br);});
  }
  var bs=document.createElement('button');bs.className='btn eq-skip';bs.textContent='跳过';bs.onclick=function(){$('eo').classList.add('h');finishPostVictory();};
  body.appendChild(bs);$('eo').classList.remove('h');
}
function equipItem(eq,idx){
  var p=st.pl;if(idx>=0){al({t:'sy',s:'🔄 卸下 '+p.equips[idx].name});p.equips.splice(idx,1);}
  p.equips.push(eq);rc(p);var hB=0;eq.h.forEach(function(h){if(h.t==='hp')hB+=h.v;});if(hB>0)p.hp=Math.min(p.mHp,p.hp+hB);
  al({t:'sy',s:'🎒 装备了 '+eq.name});$('eo').classList.add('h');ui();save();finishPostVictory();
}

/* ===== GAME FLOW ===== */
function startBattle(){
  if(st.ph!=='PREPARE')return;
  S.blip();
  clearTimeout(st.at);if(!st.en)st.en=genEnemy(st.r);
  st.pl.ps=0;st.pl._pdmg=0;st.pl._ultCD=st.pl.ub>0?5:-1;st.pl._lifelock=false;
  st.pl._st=0;st.pl._br=0;st.pl._fr=0;
  st.en.ps=0;st.en._pdmg=0;st.en._ultCD=st.en.ub>0?5:-1;st.en._lifelock=false;
  st.en._st=0;st.en._br=0;st.en._fr=0;
  st.bt=0;st.br=null;st.ph='BATTLE';$('bn').disabled=true;
  al({t:'sy',s:'─── 第'+st.r+'轮 vs '+st.en.n+' ───'});ui();
  if(st.spd===2){while(st.ph==='BATTLE'){var w=battleTick();if(w){setTimeout(function(){endBattle(w);},300);break;}}return;}
  (function lp(){if(st.ph!=='BATTLE')return;var w=battleTick();if(w){setTimeout(function(){endBattle(w);},500);return;}st.at=setTimeout(lp,SPEEDS[st.spd].d);})();
}
function battleTick(){st.bt++;var b=st.bt>=15?2:st.bt>=10?1.5:1;var r=battleStep(st.bt,st.pl,st.en,b);r.ls.forEach(al);ui();if(r.w)return r.w;if(st.bt>30)return st.pl.hp>=st.en.hp?'p':'e';return null;}
function endBattle(w){st.ph='BATTLE_END';$('bn').disabled=false;if(w==='p')onVictory();else onDefeat();}
function onVictory(){
  S.win();
  var b=st.en.boss;var rew=(15+st.r*2)*(b?2:1);st.pl.g+=rew;st.stats.goldEarned+=rew;st.stats.kills.push(st.en.n);
  if(st.r>st.hs){st.hs=st.r;localStorage.setItem('ch-hs',st.hs);}
  if(st.pl._grow){st.pl._gV=(st.pl._gV||0)+1;rc(st.pl);}
  al({t:'vi',s:'🎉 胜利！+'+rew+'金'});st.r++;st.bossBonus=b;
  var dr=getAchBonus().equipUp?0.5:0.25;if(b)dr=1.0;st._pendingEquip=Math.random()<dr?pick(EQUIPS):null;
  setTimeout(function(){showChoices(genChoices());},400);
}
function onDefeat(){
  S.lose();
  st.ph='GAMEOVER';var s=st.stats;var p=st.pl;$('ro').classList.remove('h');
  $('rt').textContent='💀 战败';$('rt').className='rt x';
  var h='<b>'+p.n+'</b> 在第'+st.r+'轮倒下<br><br><div class="go-stats">';
  h+='⚔️总伤害：<span>'+s.dmgDealt+'</span> (最高 '+s.maxHit+')<br>';
  h+='💔总承伤：<span>'+s.dmgTaken+'</span><br>';
  h+='💥暴击：<span>'+s.crits+'</span> 🚪闪避：<span>'+s.dodges+'</span><br>';
  h+='💰金币：<span>'+s.goldEarned+'</span> 🦖击败：<span>'+s.kills.length+'</span>';
  h+='</div>';
  if(s.kills.length>0)h+='<div class="go-kills">击败：'+s.kills.slice(-5).join(', ')+(s.kills.length>5?'...':'')+'</div>';
  h+='最高连胜：<span>'+st.hs+'</span><br><br>';
  $('rd').innerHTML=h;var b=document.createElement('button');b.className='btn p2';b.textContent='🔄 再来一局';b.onclick=function(){location.reload();};$('rd').appendChild(b);localStorage.removeItem('ch-save');
}

/* ===== SYSTEM ===== */
function save(){try{localStorage.setItem('ch-save',JSON.stringify({v:SAVE_VER,r:st.r,pl:st.pl,hs:st.hs,stats:st.stats}));}catch(e){}}
function load(){
  try{var s=localStorage.getItem('ch-save');if(!s)return false;var d=JSON.parse(s);if(d.v!==SAVE_VER)return false;
  st.pl=d.pl;st.r=d.r;st.hs=d.hs||0;st.stats=d.stats||initStats();rc(st.pl);st.en=genEnemy(st.r);st.ph='PREPARE';ui();return true;}catch(e){return false;}
}

/* ===== WIKI SYSTEM ===== */
function openWiki(){
  $('wiki').classList.remove('h');
  renderWiki('s');
}
function renderWiki(tab){
  var body=$('wiki-body');body.innerHTML='';
  var tabs=document.querySelectorAll('.wiki-tab');tabs.forEach(function(t){t.classList.remove('on');if(t.dataset.t===tab)t.classList.add('on');});
  var rNames={tw:'白色·基础',tg:'绿色·优秀',tb:'蓝色·精良',to:'橙色·史诗',tr:'红色·传说'};
  
  if(tab==='s'){
    SK.forEach(function(k){
      var s=STYLES[k];
      var d=document.createElement('div');d.className='wiki-item';
      d.innerHTML='<div class="wiki-item-h"><div class="wiki-item-n">'+s.emoji+' '+s.name+'</div></div><div class="wiki-item-d">'+s.desc+'</div><div class="wiki-item-p">'+s.perks+'</div>';
      body.appendChild(d);
    });
  }else if(tab==='o'){
    OPS.forEach(function(o){
      var d=document.createElement('div');d.className='wiki-item';
      d.innerHTML='<div class="wiki-item-h"><div class="wiki-item-n">'+o.n+'</div><div class="wiki-item-r '+o.r+'">'+rNames[o.r]+'</div></div><div class="wiki-item-d">'+o.d+'</div>';
      body.appendChild(d);
    });
  }else if(tab==='e'){
    EQUIPS.forEach(function(e){
      var d=document.createElement('div');d.className='wiki-item';
      d.innerHTML='<div class="wiki-item-h"><div class="wiki-item-n">'+e.name+'</div></div><div class="wiki-item-d">'+e.desc+'</div>';
      body.appendChild(d);
    });
  }else if(tab==='t'){
    ENEMY_TRAITS.forEach(function(t){
      var d=document.createElement('div');d.className='wiki-item';
      d.innerHTML='<div class="wiki-item-h"><div class="wiki-item-n">'+t.n+'</div></div><div class="wiki-item-d">'+t.d+'</div>';
      body.appendChild(d);
    });
  }
}

function selectStyle(k){$('ss').classList.add('h');st.pl=createPlayer(k);rc(st.pl);st.stats=initStats();st.r=1;st.ph='PREPARE';al({t:'sy',s:'🦗 '+st.pl.n+'出战！'});ui();setTimeout(function(){showChoices(genChoices());},300);}

/* ===== INIT ===== */
window.onload=function(){
  $('sbt').onclick=function(){AU.resume();S.blip();$('sp').classList.add('h');if(!load()){$('ss').classList.remove('h');var g=$('ss-grid');g.innerHTML='';SK.forEach(function(k){var s=STYLES[k];var c=document.createElement('div');c.className='ss-card';c.innerHTML='<div class="ss-emoji">'+s.emoji+'</div><div class="ss-name">'+s.name+'</div><div class="ss-desc">'+s.desc+'</div>';c.onclick=function(){S.blip();selectStyle(k);};g.appendChild(c);});}};
  $('bn').onclick=function(){if(st.ph==='PREPARE')startBattle();};
  $('bu').onclick=function(){if(st.pl.sl<3&&st.pl.g>=15){S.blip();st.pl.g-=15;st.pl.sl++;rc(st.pl);ui();save();al({t:'sy',s:'⬆ 流派升级！'});}};
  $('bheal').onclick=function(){if(st.pl.g>=8){S.blip();st.pl.g-=8;var h=Math.floor((st.pl.mHp-st.pl.hp)*0.3);st.pl.hp=Math.min(st.pl.mHp,st.pl.hp+h);ui();save();al({t:'sy',s:'❤️ 回复了'+h+'HP'});}};
  $('bspeed').onclick=function(){S.blip();if(st.ph==='BATTLE'){st.ph='PREPARE';startBattle();return;}st.spd=(st.spd+1)%SPEEDS.length;ui();};
  $('brf').onclick=function(){if(st.pl.g>=10){S.blip();st.pl.g-=10;showChoices(genChoices());ui();}};
  $('bclear').onclick=function(){S.blip();$('la').innerHTML='';};
  $('bwiki').onclick=function(){S.blip();openWiki();};
  $('wikiclose').onclick=function(){S.blip();$('wiki').classList.add('h');};
  document.querySelectorAll('.wiki-tab').forEach(function(t){t.onclick=function(){S.blip();renderWiki(t.dataset.t);};});
  
  /* Canvas Background */
  var c=$('n'),x=c.getContext('2d');function rz(){c.width=window.innerWidth;c.height=window.innerHeight;}rz();window.onresize=rz;
  (function dr(){x.clearRect(0,0,c.width,c.height);for(var i=0;i<25;i++){x.fillStyle='rgba(212,197,169,'+(Math.random()*0.03)+')';x.fillRect(Math.random()*c.width,Math.random()*c.height,2,2);}requestAnimationFrame(dr);})();
};
})();

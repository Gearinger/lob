// ====== 题目数据 ======
const questions = [
  { q: "我在不同人面前会表现出不一样的自己", opts: ["不认同", "中立", "认同"] },
  { q: "你因便秘坐在马桶上（已长达30分钟），拉不出很难受。此时你更想", opts: ["再坐三十分钟看看，说不定就有了", "用力拍打自己的屁股并说：死屁股，快拉啊！", "使用开塞露，快点拉出来才好"] },
  { q: "对象超过5小时没回消息，说自己窜稀了，你会怎么想？", opts: ["拉稀不可能5小时，也许ta隐瞒了我", "在信任和怀疑之间摇摆", "也许今天ta真的不太舒服"] },
  { q: "我和人相处主打一个电子围栏，靠太近会自动报警。", opts: ["认同", "中立", "不认同"] },
  { q: "我渴望和我信任的人关系密切，熟得像失散多年的亲戚。", opts: ["认同", "中立", "不认同"] },
  { q: "突然某一天，我意识到人生哪有什么他妈的狗屁意义，人不过是和动物一样被各种欲望支配着……", opts: ["是这样的", "也许是，也许不是", "这简直是胡扯"] },
  { q: "我做决定比较果断，不喜欢犹豫", opts: ["不认同", "中立", "认同"] },
  { q: "此题没有题目，请盲选", opts: ["反复思考后感觉应该选A？", "啊，要不选B？", "不会就选C？"] },
  { q: "别人说你"执行力强"，你内心更接近哪句？", opts: ["我被逼到最后确实执行力超强……", "啊，有时候吧", "是的，事情本来就该被推进"] },
  { q: "快考试了，学校规定必须上晚自习，请假会扣分，但今晚你约了女/男神一起玩《绝地求生》，你怎么办？", opts: ["翘了！反正就一次！", "干脆请个假吧", "都快考试了还去啥"] },
  { q: "朋友带了ta的朋友一起来玩，你最可能的状态是", opts: ["对"朋友的朋友"天然有点距离感", "看对方，能玩就玩", "朋友的朋友应该也算我的朋友！要热情聊天"] },
  { q: "我喜欢打破常规，不喜欢被束缚", opts: ["认同", "保持中立", "不认同"] },
  { q: "有时候你明明对一件事有不同的、负面的看法，但最后没说出来。多数情况下原因是：", opts: ["这种情况较少", "可能碍于情面或者关系", "不想让别人知道自己是个阴暗的人"] },
  { q: "我一定要不断往上爬、变得更厉害", opts: ["不认同", "中立", "认同"] },
  { q: "我很清楚真正的自己是什么样的", opts: ["不认同", "中立", "认同"] },
  { q: "你因玩《第五人格》而结识许多网友，并被邀请线下见面，你的想法是？", opts: ["网上口嗨下就算了，真见面还是有点忐忑", "见网友也挺好，反正谁来聊我就聊两句", "我会打扮一番并热情聊天，万一呢？"] },
  { q: "恋爱后，对象非常黏人，你作何感想？", opts: ["那很爽了", "都行无所谓", "我更喜欢保留独立空间"] },
  { q: "你的恋爱对象是一个尊老爱幼温柔敦厚洁身自好光明磊落大义凛然能言善辩口才流利观察入微见多识广博学多才的人……", opts: ["就算ta再优秀我也不会陷入太深", "会介于A和C之间", "会非常珍惜ta，也许会变成恋爱脑"] },
  { q: "我内心有真正追求的东西", opts: ["不认同", "中立", "认同"] },
  { q: "我不仅是屌丝，我还是joker，我还是咸鱼，这辈子没谈过一场恋爱……", opts: ["我哭了……", "这是什么……", "这不是我！"] },
  { q: "我不够好，周围的人都比我优秀", opts: ["确实", "有时", "不是"] },
  { q: "我在感情里经常担心被对方抛弃", opts: ["是的", "偶尔", "不是"] },
  { q: "我做事常常有计划，____", opts: ["然而计划不如变化快", "有时能完成，有时不能", "我讨厌被打破计划"] },
  { q: "你走在街上，一位萌萌的小女孩递给你一根棒棒糖，此时你作何感想？", opts: ["呜呜她真好真可爱！居然给我棒棒糖！", "一脸懵逼，作挠头状", "这也许是一种新型诈骗？还是走开为好"] },
  { q: "我做事主要为了取得成果和进步，而不是避免麻烦和风险。", opts: ["不认同", "中立", "认同"] },
  { q: "外人的评价对我来说无所吊谓。", opts: ["不认同", "中立", "认同"] },
  { q: "我在任何关系里都很重视个人空间", opts: ["我更喜欢依赖与被依赖", "看情况", "是的！（斩钉截铁地说道）"] },
  { q: "大多数人是善良的", opts: ["其实邪恶的人心比世界上的痔疮更多", "也许吧", "是的，我愿相信好人更多"] },
  { q: "我对天发誓，我对待每一份感情都是认真的！", opts: ["并没有", "也许？", "是的！（问心无愧骄傲脸）"] },
  { q: "您平时有什么爱好？", opts: ["吃喝拉撒", "艺术爱好（看书/音乐/绘画等）", "健身运动"] },
  { q: "我做事通常有目标。", opts: ["不认同", "中立", "认同"] }
];

// ====== 4维度评分 ======
// 维度: S-N, B-I, T-F, O-I
// 0=选A, 1=选B, 2=选C
const dimMap = [
  [1,0,0], // Q1: S/N
  [0,2,1], // Q2: B/I
  [2,1,0], // Q3: T/F
  [1,0,2], // Q4: S/N
  [0,1,2], // Q5: B/I
  [0,1,2], // Q6: T/F
  [2,1,0], // Q7: S/N
  [0,1,2], // Q8: B/I
  [0,1,2], // Q9: T/F
  [2,0,1], // Q10: S/N
  [0,1,2], // Q11: B/I
  [2,1,0], // Q12: S/N
  [2,1,0], // Q13: T/F
  [0,1,2], // Q14: S/N
  [2,1,0], // Q15: B/I
  [2,1,0], // Q16: T/F
  [0,1,2], // Q17: S/N
  [2,1,0], // Q18: B/I
  [0,1,2], // Q19: T/F
  [0,2,1], // Q20: S/N
  [0,1,2], // Q21: B/I
  [2,1,0], // Q22: T/F
  [2,1,0], // Q23: S/N
  [0,1,2], // Q24: B/I
  [2,1,0], // Q25: T/F
  [2,1,0], // Q26: S/N
  [0,1,2], // Q27: B/I
  [0,1,2], // Q28: T/F
  [2,1,0], // Q29: S/N
  [0,1,2], // Q30: 特殊维度
  [0,1,2], // Q31: T/F
];

// ====== 人格结果 ======
const personalities = {
  "S_B_T_O": { name: "社恐卷王", emoji: "📚", desc: "你是朋友圈里的卷王，表面社恐内心戏多，嘴上说躺平身体在加班。开会永远坐最后一排，但脑子里已经在推演所有人的反应。对着镜子练习微笑，练到嘴角抽筋。" },
  "S_B_T_I": { name: "理性独行侠", emoji: "🤖", desc: "你做决定不靠情绪靠逻辑，感情用事？不存在的。你觉得很多人哭是因为没学过概率论。朋友失恋找你倾诉，你第一反应是画决策树分析该不该分。" },
  "S_B_F_O": { name: "高冷守护者", emoji: "🛡️", desc: "你对在乎的人掏心掏肺，但方式极其含蓄——给对方发一篇养生文章算关心，打3个电话没人接就默默焦虑到失眠。你觉得表达感情太油腻，宁可写小作文也不当面说。" },
  "S_B_F_I": { name: "闷骚老实人", emoji: "🐼", desc: "你是那种被问'想吃什么'永远说'随便'的人，但心里其实有 87 个想法只是不说。恋爱里属于'你猜你猜你猜猜猜'型，对方猜不对你还委屈。" },
  "S_I_T_O": { name: "策划型社牛", emoji: "🎯", desc: "你是那种参加聚会前会在脑内预演3遍社交剧本的人：进门先跟谁打招呼、寒暄用哪3个话题、什么时候找借口撤退。实战起来完全不是那么回事。" },
  "S_I_T_I": { name: "逻辑社交达人", emoji: "🧠", desc: "你既能跟人聊得开心，又不会被情绪带跑。朋友吵架找你评理，你冷静分析完双方论点后说'我建议你们别聊了'——然后被骂了一顿。" },
  "S_I_F_O": { name: "社牛暖宝宝", emoji: "☀️", desc: "你是人群里的暖气片，跟谁都能聊起来，但你的热心是有'社交KPI'的——今天关心了3个人，完成了今日社交额度。内心其实在想：'怎么还没结束'。" },
  "S_I_F_I": { name: "社牛小太阳", emoji: "🌻", desc: "你是那种永远在笑、永远有余温的人，大家觉得你能量满满。其实你是'演技派'——演多了自己都分不清是真开心还是职业开心。" },
  "N_B_T_O": { name: "反卷冒险王", emoji: "🚀", desc: "你的人生口号是'规则就是用来打破的'，上班找漏洞、上课找逃课路线、连吃火锅都在研究怎么用最少的钱涮最多的菜。老板说你不务正业，你管这叫降维打击。" },
  "N_B_T_I": { name: "杠精天才", emoji: "⚡", desc: "你的大脑永远在运转一个问题：'有没有更好的方案？'开会时你的发言永远以'但是——'开头。朋友说'今天吃火锅吧'，你的第一反应是'火锅的碳排放比炒菜高23%'。" },
  "N_B_F_O": { name: "浪漫叛逆者", emoji: "🎸", desc: "你对世界有独特的审美，眼里的美和别人不一样——喜欢小众乐队、地下漫画、凌晨三点的路边摊。你觉得打卡网红景点的人都是韭菜，但自己也没少买。" },
  "N_B_F_I": { name: "空想艺术家", emoji: "🎨", desc: "你脑子里装着一整个宇宙，每天晚上躺床上就能开一场个人演唱会。但执行率感人——想健身想了3年，至今只买了瑜伽垫。" },
  "N_I_T_O": { name: "热血策划人", emoji: "🔥", desc: "你是那种凌晨3点突然有灵感爬起来记笔记的人，笔记本上写满了'创业计划'、'改变世界方案'、'给首富的一封信'。第二天醒来：昨晚我发了什么疯？" },
  "N_I_T_I": { name: "哲学家杠王", emoji: "🧩", desc: "你总是在思考一些没人思考的问题——'如果我早上起床的第一件事是问自己今天想成为谁，那今天晚上我会不会变成那个人？'然后上班迟到了。" },
  "N_I_F_O": { name: "理想主义诗人", emoji: "🌙", desc: "你相信童话，只是嘴上不承认。你觉得世界上没有坏人一说，只是每个人都有自己的故事。你偶尔会被骗，但很快原谅，因为你相信人性本善。" },
  "N_I_F_I": { name: "深情梦想家", emoji: "💫", desc: "你既深情又爱做梦，喜欢一个人能喜欢到把所有社交平台都刷成ta喜欢的颜色。你觉得这是浪漫，对方觉得这是跟踪狂。" },
  "T_B_T_O": { name: "死理性派", emoji: "🧊", desc: "你是那种'请问你这结论的置信区间是多少'的人。朋友跟你吐槽老板，你第一反应是：'要不画个甘特图？'聊天终结者本人。" },
  "T_B_T_I": { name: "冷漠分析师", emoji: "🔍", desc: "你对情感的感知能力约等于体温计——只有高低，没有中间地带。别人哭了，你内心：'这是悲伤情绪的外化表现，触发因素是……'" },
  "T_B_F_O": { name: "毒舌评论家", emoji: "💀", desc: "你说话直，但你的直是'戳破皇帝新衣'那种直。朋友穿了一件新衣服问你怎么样，你说：'显得你更矮了。'然后问你要不要一起去喝咖啡。" },
  "T_B_F_I": { name: "冷血善良人", emoji: "🖤", desc: "你是那种嘴上说'跟我没关系'但默默给流浪猫买罐头的人。你的善良是'不留名捐款'型的，感动了中国但没感动你身边的人。" },
  "T_I_T_O": { name: "辩论冠军", emoji: "🏆", desc: "你参加辩论赛能拿冠军，跟家人吃饭也能吵起来。你不是坏，是控制不住想赢的本能。吵完之后你还会复盘：'我当时那个论点其实还能再犀利一点。'" },
  "T_I_T_I": { name: "谋略大师", emoji: "♟️", desc: "你脑子转得比嘴快，说话之前已经在脑内模拟了对方可能回应的17种方案，以及你对应的反击话术。所以你说话永远精准，每一句都在射程范围内。" },
  "T_I_F_O": { name: "毒舌暖心人", emoji: "💊", desc: "你的话像手术刀——准，但疼。你说真话是因为在乎，觉得'朋友之间不用套路'。你骂完人还会补一句'我骂你是因为你有被骂的价值'，对方听完更气了。" },
  "T_I_F_I": { name: "毒舌温柔心", emoji: "🌹", desc: "你是那种刀子嘴豆腐心的人，嘴上说'我才不在乎'，但朋友生病你比谁都紧张，连偏方都查了18个版本。" },
  "F_B_T_O": { name: "玻璃心战士", emoji: "🫧", desc: "你每天都在'我是不是说错话了'和'ta是不是讨厌我了'之间横跳。发消息前要打3遍草稿，对方5分钟没回就开始写遗书。你的人际敏感度报表拉满，但生活满意度报表感人。" },
  "F_B_T_I": { name: "情绪过山车", emoji: "🎢", desc: "你的情绪比天气预报还难预测，前一秒还在笑，下一秒可能因为想起某个尴尬瞬间开始社死。你是那种在KTV唱到伤感歌曲会真的哭出来的人，旁边人以为你失恋了，其实你只是觉得歌词写得挺好。" },
  "F_B_F_O": { name: "多愁善感王", emoji: "🥀", desc: "你看个广告能哭3包纸巾，听朋友吐槽老公能共情到跟着生气。你是朋友圈的情绪大盘，跟你聊天永远有'实时情感直播'可看。" },
  "F_B_F_I": { name: "重度恋爱脑", emoji: "🦋", desc: "你谈恋爱的方式是把整个人生绑定对方。对方发一条朋友圈你就开始写800字读后感，连对方用的表情包都要分析是什么情绪。你觉得这是深情，别人觉得这是行为艺术。" },
  "F_I_T_O": { name: "讨好型卷王", emoji: "🎭", desc: "你的人生哲学是'我不能给别人添麻烦'，于是你一个人干3个人的活，还觉得是自己应该的。别人说'辛苦了'，你说'不辛苦'，其实背地里偷偷哭。" },
  "F_I_T_I": { name: "社交蝴蝶", emoji: "🦋", desc: "你是那种见谁都能聊嗨的人，但散场后回到家，脱掉社交面具，一个人坐在黑暗里，觉得空虚极了。" },
  "F_I_F_O": { name: "深情社牛", emoji: "❤️", desc: "你对世界的感知是360度全开的那种，能同时感受到18种情绪。你爱一个人可以爱到尘土里，但同时还能跟全场的人谈笑风生。" },
  "F_I_F_I": { name: "人间小天使", emoji: "👼", desc: "你温柔、善良、共情能力爆表，别人跟你吐槽完心情就好了。你是朋友圈里的治愈系，但没人知道你其实也需要被治愈。" }
};

const dimLabels = ["S-N 维度", "B-I 维度", "T-F 维度", "O-I 维度"];
const dimEmojis = ["🌱", "🤝", "💡", "🏠"];

let currentQ = 0;
let answers = new Array(questions.length).fill(-1);

function startTest() {
  document.getElementById('page-home').classList.remove('active');
  document.getElementById('page-test').classList.add('active');
  renderQuestion();
}

function renderQuestion() {
  const q = questions[currentQ];
  document.getElementById('q-badge').textContent = `第 ${currentQ + 1} 题`;
  document.getElementById('q-num').textContent = `${currentQ + 1} / ${questions.length}`;
  document.getElementById('progress-fill').style.width = `${((currentQ + 1) / questions.length) * 100}%`;

  const card = document.getElementById('question-card');
  card.style.animation = 'none';
  card.offsetHeight;
  card.style.animation = 'slideIn 0.3s ease';

  document.getElementById('q-text').textContent = q.q;

  const optsEl = document.getElementById('q-options');
  const letters = ['A', 'B', 'C', 'D'];
  optsEl.innerHTML = q.opts.map((opt, i) => `
    <div class="option ${answers[currentQ] === i ? 'selected' : ''}"
         onclick="selectOption(${i})" id="opt-${i}">
      <div class="option-letter">${letters[i]}</div>
      <div>${opt}</div>
    </div>
  `).join('');

  document.getElementById('btn-prev').style.display = currentQ > 0 ? 'inline-block' : 'none';
  document.getElementById('btn-next').style.display = answers[currentQ] >= 0 ? 'inline-block' : 'none';
  document.getElementById('btn-submit').style.display = 'none';

  const allAnswered = answers.every(a => a >= 0);
  if (allAnswered) {
    document.getElementById('btn-next').style.display = 'none';
    document.getElementById('btn-submit').style.display = 'inline-block';
    document.getElementById('btn-submit').disabled = false;
    document.getElementById('submit-notice').style.display = 'block';
  }
}

function selectOption(idx) {
  answers[currentQ] = idx;
  document.querySelectorAll('.option').forEach((el, i) => {
    el.classList.toggle('selected', i === idx);
  });
  document.getElementById('btn-next').style.display = 'inline-block';
  if (currentQ === questions.length - 1 && answers.every(a => a >= 0)) {
    document.getElementById('btn-next').style.display = 'none';
    document.getElementById('btn-submit').style.display = 'inline-block';
    document.getElementById('submit-notice').style.display = 'block';
  }
}

function nextQ() {
  if (currentQ < questions.length - 1) {
    currentQ++;
    renderQuestion();
  }
}

function prevQ() {
  if (currentQ > 0) {
    currentQ--;
    renderQuestion();
  }
}

function calcDim() {
  const dims = [0, 0, 0, 0];
  questions.forEach((_, qi) => {
    const ans = answers[qi];
    if (ans < 0) return;
    const map = dimMap[qi];
    dims[0] += map[ans] || 0;
  });
  // 归一化到 0-100
  const maxPossible = questions.length * 2;
  return dims.map(d => Math.min(100, Math.round((d / maxPossible) * 200)));
}

function getTypeKey(dims) {
  const [d0, d1, d2, d3] = dims;
  const s = d0 < 50 ? 'S' : 'N';
  const b = d1 < 50 ? 'B' : 'I';
  const t = d2 < 50 ? 'T' : 'F';
  const o = d3 < 50 ? 'O' : 'I';
  return `${s}_${b}_${t}_${o}`;
}

function showResult() {
  const dims = calcDim();
  const key = getTypeKey(dims);
  const p = personalities[key] || personalities["F_I_F_I"];

  document.getElementById('page-test').classList.remove('active');
  document.getElementById('page-result').classList.add('active');

  document.getElementById('r-type').textContent = p.name;
  document.getElementById('r-doodle').textContent = p.emoji;
  document.getElementById('r-desc').textContent = p.desc;

  const colors = ['#e74c3c','#3498db','#27ae60','#8e44ad','#f39c12','#1abc9c','#e67e22'];
  const tags = [
    ['🌱 内敛型', '🌿 外向型'],
    ['🤝 理性型', '💗 感性型'],
    ['🎯 目标型', '🛋️ 随性型'],
    ['📖 计划型', '🔥 即兴型']
  ];

  document.getElementById('r-tags').innerHTML = dims.map((d, i) => {
    const label = d < 50 ? tags[i][0] : tags[i][1];
    const r = Math.floor(Math.random() * 360);
    return `<span class="tag" style="--r:${(Math.random()-0.5)*10}deg; border-color: ${colors[i % colors.length]}; color: ${colors[i % colors.length]}">${label}</span>`;
  }).join('');

  document.getElementById('r-score').innerHTML = dimLabels.map((label, i) => `
    <div class="score-row">
      <span>${dimEmojis[i]} ${label}</span>
      <div class="bar-bg">
        <div class="bar-fill" style="width:0%; background:${colors[i]}"></div>
      </div>
      <span>${dims[i]}%</span>
    </div>
  `).join('');

  setTimeout(() => {
    document.querySelectorAll('.bar-fill').forEach((bar, i) => {
      bar.style.width = dims[i] + '%';
    });
  }, 100);
}

function restartTest() {
  currentQ = 0;
  answers = new Array(questions.length).fill(-1);
  document.getElementById('submit-notice').style.display = 'none';
  document.getElementById('btn-submit').disabled = true;
  document.getElementById('btn-submit').style.display = 'none';
  document.getElementById('page-result').classList.remove('active');
  document.getElementById('page-test').classList.add('active');
  renderQuestion();
}

function shareResult() {
  const type = document.getElementById('r-type').textContent;
  const text = `我的 SBTI 人格是「${type}」！你也来测测？🔗 ${window.location.href}`;
  if (navigator.share) {
    navigator.share({ title: 'SBTI 离谱人格测试', text });
  } else {
    navigator.clipboard.writeText(text).then(() => alert('结果已复制到剪贴板！'));
  }
}

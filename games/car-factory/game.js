/**
 * 🚗 造车模拟器 - Game Logic
 */

// ==================== 游戏配置 ====================
const CONFIG = {
    difficulty: {
        easy: { money: 100000000, riskRate: 0.15, name: '简单' },
        medium: { money: 50000000, riskRate: 0.30, name: '中等' },
        hard: { money: 20000000, riskRate: 0.50, name: '困难' }
    },
    phases: [
        'research',      // 研发设计
        'procurement',   // 采购供应
        'production',    // 生产制造
        'quality',        // 质检出厂
        'marketing',      // 宣发销售
        'after-sales'     // 售后服务
    ],
    phaseNames: {
        'research': '🔧 研发设计阶段',
        'procurement': '📦 采购供应阶段',
        'production': '🏭 生产制造阶段',
        'quality': '✅ 质检出厂阶段',
        'marketing': '📢 宣发销售阶段',
        'after-sales': '🛠️ 售后服务阶段'
    }
};

// ==================== 随机事件 ====================
const RANDOM_EVENTS = [
    {
        id: 'blackmail',
        name: '宣发时被对家黑',
        desc: '竞争对手雇水军黑你，说你的车刹车失灵！',
        impact: { reputation: -20, sales: -30 },
        prevent: '公关投入'
    },
    {
        id: 'accident',
        name: '发生意外事故',
        desc: '某批次车辆被发现存在安全隐患，需要召回！',
        impact: { cost: 5000000, reputation: -15 },
        prevent: '品控投入'
    },
    {
        id: 'competitor',
        name: '竞品强势来袭',
        desc: '市场上突然出现性价比更高的竞品！',
        impact: { sales: -25 },
        prevent: '研发投入'
    },
    {
        id: 'lawsuit',
        name: '法律纠纷',
        desc: '被指控专利侵权，面临法律诉讼！',
        impact: { cost: 8000000, reputation: -10 },
        prevent: '法务投入'
    },
    {
        id: 'supply',
        name: '供应链断供',
        desc: '关键零部件供应商破产，芯片断供！',
        impact: { cost: 3000000, delay: true },
        prevent: '多元供应链'
    }
];

// ==================== 决策选项 ====================
const DECISIONS = {
    research: [
        { id: 'economy', name: '经济型轿车', desc: '主打性价比，适合家庭用户', cost: 20000000, quality: 60 },
        { id: 'mid', name: '中端SUV', desc: '均衡配置，受众广泛', cost: 40000000, quality: 80 },
        { id: 'luxury', name: '高端豪华车', desc: '极致品质，追求利润', cost: 80000000, quality: 100 }
    ],
    procurement: [
        { id: 'budget', name: '精简采购', desc: '低成本零件，压缩成本', cost: 10000000, quality: -10 },
        { id: 'standard', name: '标准采购', desc: '可靠供应商，稳定品质', cost: 25000000, quality: 0 },
        { id: 'premium', name: '高端采购', desc: '顶级零部件，卓越品质', cost: 50000000, quality: +15 }
    ],
    production: [
        { id: 'low', name: '小规模产线', desc: '产能低但灵活', cost: 15000000, capacity: 500 },
        { id: 'medium', name: '标准产线', desc: '中等产能，平衡之选', cost: 35000000, capacity: 1500 },
        { id: 'high', name: '大规模产线', desc: '高产能，抢占市场', cost: 70000000, capacity: 3000 }
    ],
    quality: [
        { id: 'loose', name: '宽松品控', desc: '降低标准，提高产量', cost: 5000000, passRate: 0.7 },
        { id: 'standard', name: '标准品控', desc: '行业标准，品质保证', cost: 15000000, passRate: 0.9 },
        { id: 'strict', name: '严格品控', desc: '极致品质，口碑保证', cost: 30000000, passRate: 0.99 }
    ],
    marketing: [
        { id: 'low', name: '低调宣传', desc: '低成本营销', cost: 10000000, fame: 30, riskDefense: -10 },
        { id: 'medium', name: '正常宣发', desc: '行业标准推广', cost: 30000000, fame: 60, riskDefense: 0 },
        { id: 'high', name: '大力推广', desc: '全渠道铺开', cost: 60000000, fame: 100, riskDefense: +20 }
    ],
    pricing: [
        { id: 'low', name: '低价策略', desc: '薄利多销', price: 150000, demand: 1.5 },
        { id: 'medium', name: '适中定价', desc: '平衡利润与销量', price: 250000, demand: 1.0 },
        { id: 'high', name: '高端定价', desc: '高利润策略', price: 400000, demand: 0.6 }
    ]
};

// ==================== 游戏状态 ====================
let gameState = {
    money: 0,
    year: 1,
    quarter: 1,
    difficulty: 'medium',
    riskRate: 0.3,
    currentPhase: 'research',
    phaseIndex: 0,
    reputation: 50,      // 口碑 0-100
    sales: 0,            // 总销量
    inventory: 0,        // 库存
    fame: 0,             // 知名度
    // 当前决策
    carQuality: 50,      // 车辆质量
    capacity: 500,       // 产能
    passRate: 0.8,      // 合格率
    totalCost: 0,       // 总投入
    // 历史记录
    history: [],
    // 游戏状态
    isGameOver: false,
    productionQueue: 0,  // 生产队列
    isDelay: false      // 是否因供应链问题停产
};

// ==================== DOM 元素 ====================
const elements = {
    money: document.getElementById('money'),
    year: document.getElementById('year'),
    quarter: document.getElementById('quarter'),
    difficulty: document.getElementById('difficulty'),
    phaseTitle: document.getElementById('phase-title'),
    phaseDesc: document.getElementById('phase-desc'),
    decisionOptions: document.getElementById('decision-options'),
    confirmBtn: document.getElementById('confirm-btn'),
    reputationBar: document.getElementById('reputation-bar'),
    reputationVal: document.getElementById('reputation-val'),
    salesVal: document.getElementById('sales-val'),
    inventoryVal: document.getElementById('inventory-val'),
    fameVal: document.getElementById('fame-val'),
    // 屏幕
    difficultyScreen: document.getElementById('difficulty-screen'),
    gameScreen: document.getElementById('game-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    // 弹窗
    eventModal: document.getElementById('event-modal'),
    eventTitle: document.getElementById('event-title'),
    eventDesc: document.getElementById('event-desc'),
    eventImpact: document.getElementById('event-impact'),
    eventClose: document.getElementById('event-close'),
    // 按钮
    difficultyBtns: document.querySelectorAll('.diff-btn'),
    restartBtn: document.getElementById('restart-btn')
};

// ==================== 工具函数 ====================
function formatMoney(amount) {
    if (amount >= 100000000) {
        return '¥' + (amount / 100000000).toFixed(1) + '亿';
    } else if (amount >= 10000) {
        return '¥' + (amount / 10000).toFixed(0) + '万';
    }
    return '¥' + amount;
}

function formatMoneyRaw(amount) {
    return '¥' + amount.toLocaleString();
}

function randomEvent(probability) {
    return Math.random() < probability;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// ==================== 游戏初始化 ====================
function initGame() {
    // 绑定难度选择
    elements.difficultyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const diff = btn.dataset.diff;
            startGame(diff);
        });
    });

    // 绑定确认按钮
    elements.confirmBtn.addEventListener('click', confirmDecision);

    // 绑定事件关闭
    elements.eventClose.addEventListener('click', closeEvent);

    // 绑定重新开始
    elements.restartBtn.addEventListener('click', restartGame);
}

function startGame(difficulty) {
    const config = CONFIG.difficulty[difficulty];
    
    gameState = {
        money: config.money,
        year: 1,
        quarter: 1,
        difficulty: difficulty,
        riskRate: config.riskRate,
        currentPhase: 'research',
        phaseIndex: 0,
        reputation: 50,
        sales: 0,
        inventory: 0,
        fame: 0,
        carQuality: 50,
        capacity: 500,
        passRate: 0.8,
        totalCost: 0,
        history: [],
        isGameOver: false,
        productionQueue: 0,
        isDelay: false
    };

    // 切换界面
    elements.difficultyScreen.classList.remove('active');
    elements.gameScreen.classList.add('active');
    elements.gameOverScreen.classList.add('hidden');

    updateUI();
    renderPhase();
}

function restartGame() {
    elements.gameOverScreen.classList.add('hidden');
    elements.difficultyScreen.classList.add('active');
}

// ==================== UI 更新 ====================
function updateUI() {
    elements.money.textContent = formatMoney(gameState.money);
    elements.year.textContent = gameState.year;
    elements.quarter.textContent = gameState.quarter;
    elements.difficulty.textContent = CONFIG.difficulty[gameState.difficulty].name;

    elements.reputationVal.textContent = Math.round(gameState.reputation);
    elements.reputationBar.style.width = gameState.reputation + '%';
    
    elements.salesVal.textContent = gameState.sales.toLocaleString();
    elements.inventoryVal.textContent = gameState.inventory.toLocaleString();
    elements.fameVal.textContent = gameState.fame;

    // 更新流程图状态
    updateFlowChart();
}

function updateFlowChart() {
    const nodes = document.querySelectorAll('.flow-node');
    nodes.forEach((node, index) => {
        const phase = CONFIG.phases[index];
        node.classList.remove('active', 'completed');
        
        if (phase === gameState.currentPhase) {
            node.classList.add('active');
        } else if (CONFIG.phases.indexOf(phase) < gameState.phaseIndex) {
            node.classList.add('completed');
        }
    });
}

// ==================== 阶段渲染 ====================
function renderPhase() {
    const phase = gameState.currentPhase;
    elements.phaseTitle.textContent = CONFIG.phaseNames[phase];
    elements.confirmBtn.disabled = true;
    elements.decisionOptions.innerHTML = '';

    // 根据阶段渲染不同选项
    let options;
    
    if (phase === 'marketing') {
        // 营销阶段 + 定价
        elements.phaseDesc.textContent = '请选择营销策略和定价';
        renderMarketingOptions();
    } else if (phase === 'after-sales') {
        // 售后阶段 - 结算
        elements.phaseDesc.textContent = '本季度销售结算中...';
        renderAfterSalesOptions();
    } else {
        elements.phaseDesc.textContent = getPhaseDescription(phase);
        options = DECISIONS[phase] || DECISIONS[phase === 'research' ? 'research' : 'standard'];
        
        options.forEach(opt => {
            const btn = document.createElement('div');
            btn.className = 'option-btn';
            btn.innerHTML = `
                <div class="option-info">
                    <span class="option-name">${opt.name}</span>
                    <span class="option-desc">${opt.desc}</span>
                </div>
                <span class="option-cost">${formatMoney(opt.cost)}</span>
            `;
            btn.addEventListener('click', () => selectOption(btn, opt));
            elements.decisionOptions.appendChild(btn);
        });
    }
}

function getPhaseDescription(phase) {
    const descs = {
        'research': '请决定您的车型研发方向',
        'procurement': '请选择零部件采购策略',
        'procurement': '请选择零部件采购策略',
        'production': '请确定生产线规模',
        'quality': '请设置质量控制标准',
        'marketing': '请制定营销策略',
        'after-sales': '售后服务与市场反馈'
    };
    return descs[phase] || '请做出决策';
}

function renderMarketingOptions() {
    // 营销选项
    const marketingOpts = DECISIONS.marketing;
    marketingOpts.forEach(opt => {
        const btn = document.createElement('div');
        btn.className = 'option-btn marketing-opt';
        btn.dataset.marketing = JSON.stringify(opt);
        btn.innerHTML = `
            <div class="option-info">
                <span class="option-name">${opt.name}</span>
                <span class="option-desc">${opt.desc}</span>
            </div>
            <span class="option-cost">${formatMoney(opt.cost)}</span>
        `;
        btn.addEventListener('click', () => selectOption(btn, opt, 'marketing'));
        elements.decisionOptions.appendChild(btn);
    });

    // 定价选项
    const pricingTitle = document.createElement('h4');
    pricingTitle.textContent = '📊 定价策略';
    pricingTitle.style.marginTop = '20px';
    elements.decisionOptions.appendChild(pricingTitle);

    const pricingOpts = DECISIONS.pricing;
    pricingOpts.forEach(opt => {
        const btn = document.createElement('div');
        btn.className = 'option-btn pricing-opt';
        btn.dataset.pricing = JSON.stringify(opt);
        btn.innerHTML = `
            <div class="option-info">
                <span class="option-name">${opt.name}</span>
                <span class="option-desc">${opt.desc}</span>
            </div>
            <span class="option-cost">${formatMoney(opt.price)}</span>
        `;
        btn.addEventListener('click', () => selectOption(btn, opt, 'pricing'));
        elements.decisionOptions.appendChild(btn);
    });
}

function renderAfterSalesOptions() {
    // 结算阶段，自动计算
    setTimeout(() => {
        confirmDecision();
    }, 1000);
}

// ==================== 选择逻辑 ====================
let selectedOptions = {};

function selectOption(btn, option, type = null) {
    if (type === 'marketing') {
        // 营销和定价需要分别选择
        document.querySelectorAll('.marketing-opt').forEach(b => b.classList.remove('selected'));
        selectedOptions.marketing = option;
    } else if (type === 'pricing') {
        document.querySelectorAll('.pricing-opt').forEach(b => b.classList.remove('selected'));
        selectedOptions.pricing = option;
    } else {
        document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
        selectedOptions.current = option;
    }
    
    btn.classList.add('selected');
    elements.confirmBtn.disabled = false;
}

function confirmDecision() {
    const phase = gameState.currentPhase;
    
    if (phase === 'research') {
        handleResearch();
    } else if (phase === 'procurement') {
        handleProcurement();
    } else if (phase === 'production') {
        handleProduction();
    } else if (phase === 'quality') {
        handleQuality();
    } else if (phase === 'marketing') {
        handleMarketing();
    } else if (phase === 'after-sales') {
        handleAfterSales();
    }

    selectedOptions = {};
    nextPhase();
}

// ==================== 各阶段处理 ====================
function handleResearch() {
    const opt = selectedOptions.current;
    if (!opt) return;

    gameState.money -= opt.cost;
    gameState.totalCost += opt.cost;
    gameState.carQuality = opt.quality;
    
    // 历史记录
    gameState.history.push({
        phase: 'research',
        option: opt.name,
        cost: opt.cost
    });
}

function handleProcurement() {
    const opt = selectedOptions.current;
    if (!opt) return;

    gameState.money -= opt.cost;
    gameState.totalCost += opt.cost;
    gameState.carQuality += opt.quality;
    
    // 采购影响质量
    gameState.carQuality = clamp(gameState.carQuality, 30, 100);
    
    gameState.history.push({
        phase: 'procurement',
        option: opt.name,
        cost: opt.cost
    });
}

function handleProduction() {
    const opt = selectedOptions.current;
    if (!opt) return;

    gameState.money -= opt.cost;
    gameState.totalCost += opt.cost;
    gameState.capacity = opt.capacity;
    
    // 开始生产
    gameState.productionQueue = gameState.capacity;
    
    gameState.history.push({
        phase: 'production',
        option: opt.name,
        cost: opt.cost
    });
}

function handleQuality() {
    const opt = selectedOptions.current;
    if (!opt) return;

    gameState.money -= opt.cost;
    gameState.totalCost += opt.cost;
    gameState.passRate = opt.passRate;
    
    // 处理生产队列
    const produced = Math.floor(gameState.productionQueue * gameState.passRate);
    gameState.inventory += produced;
    gameState.productionQueue = 0;
    
    gameState.history.push({
        phase: 'quality',
        option: opt.name,
        produced: produced,
        cost: opt.cost
    });
}

function handleMarketing() {
    const marketing = selectedOptions.marketing;
    const pricing = selectedOptions.pricing;
    
    if (!marketing || !pricing) return;

    gameState.money -= marketing.cost;
    gameState.totalCost += marketing.cost;
    gameState.fame = marketing.fame;
    
    gameState.currentPrice = pricing.price;
    gameState.currentDemand = pricing.demand;
    
    // 计算实际销量
    const baseDemand = gameState.fame * gameState.currentDemand;
    const qualityFactor = gameState.carQuality / 100;
    const reputationFactor = gameState.reputation / 100;
    
    const actualSales = Math.floor(
        Math.min(gameState.inventory, 
            baseDemand * qualityFactor * reputationFactor * 500)
    );
    
    gameState.quarterSales = actualSales;
    gameState.inventory -= actualSales;
    gameState.sales += actualSales;
    
    gameState.history.push({
        phase: 'marketing',
        marketing: marketing.name,
        pricing: pricing.name,
        sales: actualSales,
        revenue: actualSales * pricing.price,
        cost: marketing.cost
    });
}

function handleAfterSales() {
    // 售后结算
    const sales = gameState.quarterSales || 0;
    const revenue = sales * (gameState.currentPrice || 200000);
    const profit = revenue - (gameState.totalCost / 8); // 分摊到每季度
    
    gameState.money += profit;
    
    // 口碑变化
    const repChange = sales > 0 ? Math.min(5, sales / 100) : -3;
    gameState.reputation = clamp(gameState.reputation + repChange, 0, 100);
    
    // 随机事件检查
    checkRandomEvent();
}

// ==================== 随机事件 ====================
function checkRandomEvent() {
    if (gameState.isDelay) {
        // 之前有供应链问题，已恢复
        gameState.isDelay = false;
        return;
    }

    if (!randomEvent(gameState.riskRate)) return;

    // 随机选择一个事件
    const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
    
    // 显示事件
    showEvent(event);
}

function showEvent(event) {
    let impactHtml = '';
    
    if (event.impact.reputation) {
        const cls = event.impact.reputation < 0 ? 'impact-negative' : 'impact-positive';
        impactHtml += `<div class="impact-item"><span>口碑</span><span class="${cls}">${event.impact.reputation > 0 ? '+' : ''}${event.impact.reputation}%</span></div>`;
    }
    if (event.impact.sales) {
        const cls = event.impact.sales < 0 ? 'impact-negative' : 'impact-positive';
        impactHtml += `<div class="impact-item"><span>销量</span><span class="${cls}">${event.impact.sales > 0 ? '+' : ''}${event.impact.sales}%</span></div>`;
    }
    if (event.impact.cost) {
        impactHtml += `<div class="impact-item"><span>损失</span><span class="impact-negative">-${formatMoney(event.impact.cost)}</span></div>`;
        gameState.money -= event.impact.cost;
        gameState.totalCost += event.impact.cost;
    }
    if (event.impact.delay) {
        impactHtml += `<div class="impact-item"><span>状态</span><span class="impact-negative">停产1轮</span></div>`;
        gameState.isDelay = true;
    }

    // 应用口碑影响
    if (event.impact.reputation) {
        gameState.reputation = clamp(gameState.reputation + event.impact.reputation, 0, 100);
    }
    
    // 应用销量影响
    if (event.impact.sales) {
        const salesReduction = Math.floor(gameState.quarterSales * Math.abs(event.impact.sales) / 100);
        if (event.impact.sales < 0) {
            gameState.sales -= salesReduction;
            gameState.quarterSales -= salesReduction;
        }
    }

    elements.eventTitle.textContent = '⚠️ ' + event.name;
    elements.eventDesc.textContent = event.desc;
    elements.eventImpact.innerHTML = impactHtml;
    
    elements.eventModal.classList.remove('hidden');
}

function closeEvent() {
    elements.eventModal.classList.add('hidden');
}

// ==================== 阶段流转 ====================
function nextPhase() {
    gameState.phaseIndex++;
    
    // 检查游戏结束
    if (gameState.money <= 0) {
        gameOver(false, '资金耗尽！公司破产。');
        return;
    }
    
    if (gameState.year > 10) {
        gameOver(true, '恭喜！完成10年创业！');
        return;
    }

    if (gameState.phaseIndex >= CONFIG.phases.length) {
        // 新年
        gameState.phaseIndex = 0;
        gameState.year++;
        gameState.quarter = 1;
    } else {
        gameState.quarter++;
    }

    // 停产检查
    if (gameState.isDelay) {
        gameState.quarterSales = 0;
    }

    gameState.currentPhase = CONFIG.phases[gameState.phaseIndex];
    
    updateUI();
    renderPhase();
}

function gameOver(won, reason) {
    gameState.isGameOver = true;
    
    elements.gameScreen.classList.remove('active');
    elements.gameOverScreen.classList.remove('hidden');
    
    document.getElementById('game-over-title').textContent = won ? '🎉 游戏通关！' : '💸 游戏结束';
    document.getElementById('game-over-title').style.color = won ? 'var(--success)' : 'var(--danger)';
    
    const statsHtml = `
        <div class="stat-row"><span>存活年限</span><span>${gameState.year} 年</span></div>
        <div class="stat-row"><span>总销量</span><span>${gameState.sales.toLocaleString()} 辆</span></div>
        <div class="stat-row"><span>最终资金</span><span>${formatMoney(gameState.money)}</span></div>
        <div class="stat-row"><span>最终口碑</span><span>${Math.round(gameState.reputation)}%</span></div>
        <div class="stat-row"><span>总投入</span><span>${formatMoney(gameState.totalCost)}</span></div>
        <div class="stat-row"><span>结束原因</span><span>${reason}</span></div>
    `;
    
    document.getElementById('game-over-stats').innerHTML = statsHtml;
}

// ==================== 启动 ====================
document.addEventListener('DOMContentLoaded', initGame);

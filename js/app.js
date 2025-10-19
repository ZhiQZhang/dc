// 应用状态管理
const appState = {
    currentPage: 'welcome-page',
    currentMode: null,
    currentItems: [],
    currentIndex: 0,
    learningResults: {
        total: 0,
        known: 0,
        familiar: 0,
        hard: 0
    },
    settings: {
        learningCount: 20,
        randomOrder: true,
        autoPlay: false
    },
    learnedWords: new Set(),
    learnedPhrases: new Set(),
    wordData: [],
    phraseData: []
};

// 页面元素缓存
const pageElements = {
    pages: document.querySelectorAll('.page'),
    navItems: document.querySelectorAll('.nav-item'),
    welcome: {
        startLearning: document.getElementById('start-learning')
    },
    modeSelection: {
        modeCards: document.querySelectorAll('.mode-card'),
        backToWelcome: document.getElementById('back-to-welcome')
    },
    learning: {
        progressFill: document.querySelector('.progress-fill'),
        progressText: document.querySelector('.progress-text'),
        currentType: document.getElementById('current-type'),
        currentIndex: document.getElementById('current-index'),
        itemText: document.getElementById('item-text'),
        showMeaning: document.getElementById('show-meaning'),
        itemMeaning: document.getElementById('item-meaning'),
        markHard: document.getElementById('mark-hard'),
        markFamiliar: document.getElementById('mark-familiar'),
        markKnown: document.getElementById('mark-known'),
        endLearning: document.getElementById('end-learning')
    },
    results: {
        totalItems: document.getElementById('total-items'),
        knownItems: document.getElementById('known-items'),
        familiarItems: document.getElementById('familiar-items'),
        hardItems: document.getElementById('hard-items'),
        resultsChart: document.getElementById('results-chart'),
        reviewHard: document.getElementById('review-hard'),
        newLearning: document.getElementById('new-learning')
    },
    settings: {
        learningCount: document.getElementById('learning-count'),
        randomOrder: document.getElementById('random-order'),
        autoPlay: document.getElementById('auto-play'),
        saveSettings: document.getElementById('save-settings'),
        backFromSettings: document.getElementById('back-from-settings')
    }
};

// 从data.js导入数据
// 注意：data.js已在HTML中通过<script>标签引入，数据可通过window对象访问

// 初始化应用
async function initApp() {
    loadUserData();
    loadSettings();
    await ensureSourcesCached();
    setupEventListeners();
    updateWelcomeStats();
    initializeCharts();
    const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (file === 'learing.html' || file === 'learning.html') {
        const selectedMode = localStorage.getItem('selectedMode') || 'words';
        startLearning(selectedMode);
    } else if (file === 'results.html') {
        const latest = localStorage.getItem('latestResults');
        if (latest) {
            try { appState.learningResults = { ...appState.learningResults, ...JSON.parse(latest) }; } catch(e) {}
        }
        if (pageElements.results.totalItems && pageElements.results.knownItems && pageElements.results.familiarItems && pageElements.results.hardItems) {
            pageElements.results.totalItems.textContent = appState.learningResults.total;
            pageElements.results.knownItems.textContent = appState.learningResults.known;
            pageElements.results.familiarItems.textContent = appState.learningResults.familiar;
            pageElements.results.hardItems.textContent = appState.learningResults.hard;
            updateResultsChart();
        }
    }
}

// 加载用户数据
function loadUserData() {
    // 从window对象获取从data.js导入的数据
    appState.wordData = window.wordData || [];
    appState.phraseData = window.phraseData || [];
}

// 加载设置
function loadSettings() {
    const savedSettings = localStorage.getItem('wordAppSettings');
    if (savedSettings) {
        appState.settings = { ...appState.settings, ...JSON.parse(savedSettings) };
        updateSettingsUI();
    }
}

// 更新设置UI
function updateSettingsUI() {
    pageElements.settings.learningCount.value = appState.settings.learningCount;
    pageElements.settings.randomOrder.checked = appState.settings.randomOrder;
    pageElements.settings.autoPlay.checked = appState.settings.autoPlay;
}

// 设置事件监听器
function setupEventListeners() {
    // 导航事件：多页面改为a跳转，移除JS导航绑定
    pageElements.navItems.forEach(() => { });

    if (pageElements.welcome.startLearning) {
        pageElements.welcome.startLearning.addEventListener('click', () => {
            window.location.href = 'mode.html';
        });
    }

    pageElements.modeSelection.modeCards.forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.dataset.mode;
            localStorage.setItem('selectedMode', mode);
            window.location.href = 'learing.html';
        });
    });

    if (pageElements.modeSelection.backToWelcome) {
        pageElements.modeSelection.backToWelcome.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    // 学习页面事件保持不变
    if (pageElements.learning.showMeaning) {
        pageElements.learning.showMeaning.addEventListener('click', () => {
            if (pageElements.learning.itemMeaning) {
                if (!pageElements.learning.itemMeaning.textContent || pageElements.learning.itemMeaning.textContent === '释义将在这里显示') {
                    console.warn('释义内容可能未正确设置');
                }
                pageElements.learning.itemMeaning.classList.remove('hidden');
                console.log('显示释义:', pageElements.learning.itemMeaning.textContent);
            } else {
                console.error('无法显示释义，itemMeaning元素不存在');
            }
        });
    }

    pageElements.learning.markHard && pageElements.learning.markHard.addEventListener('click', () => { markItem('hard'); });
    pageElements.learning.markFamiliar && pageElements.learning.markFamiliar.addEventListener('click', () => { markItem('familiar'); });
    pageElements.learning.markKnown && pageElements.learning.markKnown.addEventListener('click', () => { markItem('known'); });
    pageElements.learning.endLearning && pageElements.learning.endLearning.addEventListener('click', () => { showResults(); });

    // 结果页面事件
    pageElements.results.reviewHard && pageElements.results.reviewHard.addEventListener('click', () => { reviewHardItems(); });
    pageElements.results.newLearning && pageElements.results.newLearning.addEventListener('click', () => { window.location.href = 'mode.html'; });

    // 设置页面事件
    pageElements.settings.saveSettings && pageElements.settings.saveSettings.addEventListener('click', () => { saveSettings(); });
    pageElements.settings.backFromSettings && pageElements.settings.backFromSettings.addEventListener('click', () => { window.location.href = 'index.html'; });
}

// 导航到页面
function navigateToPage(pageId) { }

function updateNavActiveState(pageId) { }

// 开始学习
async function startLearning(mode) {
    let items = [];

    if (mode === 'words') {
        items = await getRandomFromCache('words', appState.settings.learningCount);
        pageElements.learning.currentType.textContent = '单词';
    } else if (mode === 'phrases') {
        items = await getRandomFromCache('phrases', appState.settings.learningCount);
        pageElements.learning.currentType.textContent = '短语';
    } else if (mode === 'review') {
        // 复习模式逻辑
        const hardItems = JSON.parse(localStorage.getItem('hardItems') || '[]');
        items = hardItems;
        pageElements.learning.currentType.textContent = '复习';
    }

    // 随机排序
    if (appState.settings.randomOrder) {
        items = shuffleArray(items);
    }

    // 截取指定数量
    appState.currentItems = items.slice(0, appState.settings.learningCount);
    appState.currentIndex = 0;

    // 重置学习结果
    appState.learningResults = {
        total: appState.currentItems.length,
        known: 0,
        familiar: 0,
        hard: 0
    };

    // 加载第一个项目
    loadCurrentItem();

    // 多页面环境不在此导航，页面已在learing.html
}

// 加载当前学习项目
function loadCurrentItem() {
    if (appState.currentIndex >= appState.currentItems.length) {
        showResults();
        return;
    }

    const item = appState.currentItems[appState.currentIndex];

    // 清理音标显示，移除多余的括号
    const cleanPhonetic = (phonetic) => {
        if (!phonetic) return '';
        // 移除首尾括号（如果存在）
        return phonetic.replace(/^\[|\]$/g, '');
    };

    // 确保itemMeaning元素存在
    if (!pageElements.learning.itemMeaning) {
        console.error('itemMeaning元素未找到');
        return;
    }

    // 根据当前模式和项目类型显示内容
    if (item.word) {
        // 单词
        let wordContent = item.word;
        if (item.yb) {
            wordContent += '\n/' + cleanPhonetic(item.yb) + '/';
        }
        pageElements.learning.itemText.textContent = wordContent.trim();
        ensurePronounceButton(item.word);
    } else if (item.phrase) {
        // 短语
        pageElements.learning.itemText.textContent = item.phrase;
        ensurePronounceButton(item.phrase);
        pageElements.learning.itemMeaning.textContent = item.translation;
    } else {
        // 未知类型，提供默认显示
        pageElements.learning.itemText.textContent = '未知项目';
        pageElements.learning.itemMeaning.textContent = '无法识别的数据格式';
        ensurePronounceButton('');
    }

    // 确保释义总是被隐藏，等待用户点击显示
    pageElements.learning.itemMeaning.classList.add('hidden');

    // 更新进度
    const progress = ((appState.currentIndex + 1) / appState.currentItems.length) * 100;
    pageElements.learning.progressFill.style.width = `${progress}%`;
    pageElements.learning.progressText.textContent = `${appState.currentIndex + 1}/${appState.currentItems.length}`;
    pageElements.learning.currentIndex.textContent = `${appState.currentIndex + 1}/${appState.currentItems.length}`;
}

// 标记项目
function markItem(status) {
    // 更新学习结果
    appState.learningResults[status]++;

    // 记录已学习项目
    const item = appState.currentItems[appState.currentIndex];
    if (appState.currentMode === 'words') {
        appState.learnedWords.add(item.word);
    } else if (appState.currentMode === 'phrases') {
        appState.learnedPhrases.add(item.phrase || item.word);
    } else if (appState.currentMode === 'review') {
        // 复习模式下确保正确访问word字段
        if (item.word) {
            appState.learnedWords.add(item.word);
        } else if (item.phrase) {
            appState.learnedPhrases.add(item.phrase);
        }
    }

    // 如果是难点，保存到复习列表
    if (status === 'hard') {
        const hardItems = JSON.parse(localStorage.getItem('hardItems') || '[]');
        // 避免重复添加相同的难点项
        const isDuplicate = hardItems.some(hardItem =>
            (item.word && hardItem.word === item.word) ||
            (item.phrase && hardItem.phrase === item.phrase)
        );
        if (!isDuplicate) {
            hardItems.push(item);
            localStorage.setItem('hardItems', JSON.stringify(hardItems));
        }
    }

    // 保存学习记录
    saveLearningProgress();

    // 加载下一个项目
    appState.currentIndex++;
    loadCurrentItem();
}

// 显示结果
function showResults() {
    try { localStorage.setItem('latestResults', JSON.stringify(appState.learningResults)); } catch (e) { }
    if (pageElements.results.totalItems && pageElements.results.knownItems && pageElements.results.familiarItems && pageElements.results.hardItems) {
        pageElements.results.totalItems.textContent = appState.learningResults.total;
        pageElements.results.knownItems.textContent = appState.learningResults.known;
        pageElements.results.familiarItems.textContent = appState.learningResults.familiar;
        pageElements.results.hardItems.textContent = appState.learningResults.hard;
        updateResultsChart();
    }
    window.location.href = 'results.html';
}

// 更新结果图表
function updateResultsChart() {
    if (!window.resultsChart) {
        initializeCharts();
        if (!window.resultsChart) return;
    }
    const option = {
        series: [{
            data: [
                { value: appState.learningResults.known, name: '已掌握' },
                { value: appState.learningResults.familiar, name: '不太熟' },
                { value: appState.learningResults.hard, name: '需加强' }
            ]
        }]
    };
    window.resultsChart.setOption(option);
}

// 初始化图表
function initializeCharts() {
    const el = pageElements.results.resultsChart;
    if (!el || typeof echarts === 'undefined') return;
    window.resultsChart = echarts.init(el, null, { renderer: 'canvas' });
    const option = {
        tooltip: { trigger: 'item' },
        legend: { bottom: 0 },
        series: [{
            name: '学习统计',
            type: 'pie',
            radius: ['50%', '70%'],
            center: ['50%', '40%'],
            avoidLabelOverlap: false,
            label: { show: false, position: 'center' },
            labelLine: { show: false },
            data: [
                { value: 0, name: '已掌握' },
                { value: 0, name: '不太熟' },
                { value: 0, name: '需加强' }
            ]
        }]
    };
    window.resultsChart.setOption(option);
    window.addEventListener('resize', () => { window.resultsChart && window.resultsChart.resize(); });
}

// 复习难点
function reviewHardItems() {
    appState.currentMode = 'review';
    localStorage.setItem('selectedMode', 'review');
    window.location.href = 'learing.html';
}

// 保存设置
function saveSettings() {
    appState.settings.learningCount = parseInt(pageElements.settings.learningCount.value) || 20;
    appState.settings.randomOrder = pageElements.settings.randomOrder.checked;
    appState.settings.autoPlay = pageElements.settings.autoPlay.checked;

    localStorage.setItem('wordAppSettings', JSON.stringify(appState.settings));

    alert('设置已保存！');
    window.location.href = 'index.html';
}

// 保存学习进度
function saveLearningProgress() {
    const progress = {
        learnedWords: Array.from(appState.learnedWords),
        learnedPhrases: Array.from(appState.learnedPhrases),
        lastLearned: new Date().toISOString()
    };

    localStorage.setItem('wordAppProgress', JSON.stringify(progress));
}

// 更新欢迎页面统计
function updateWelcomeStats() {
    const statsElement = document.querySelector('.stats-summary');
    if (statsElement) {
        const wordStat = statsElement.querySelector('.stat-item:nth-child(1) .stat-number');
        const phraseStat = statsElement.querySelector('.stat-item:nth-child(2) .stat-number');

        wordStat.textContent = appState.learnedWords.size;
        phraseStat.textContent = appState.learnedPhrases.size;
    }
}

// 工具函数：随机打乱数组
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 根据URL设置底部导航active态
function setNavActiveByLocation() {
    const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const map = {
        'index.html': 'index.html',
        'mode.html': 'mode.html',
        'results.html': 'results.html',
        'settings.html': 'settings.html',
        'learing.html': 'learing.html',
        'learning.html': 'learning.html'
    };
    const current = map[file] || 'index.html';
    const items = Array.from(document.querySelectorAll('.app-nav .nav-item'));
    items.forEach(a => {
        a.classList.remove('active');
        const href = (a.getAttribute('href') || '').toLowerCase();
        if (href === current) a.classList.add('active');
    });
}

// 监听页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
    setNavActiveByLocation();
});

// IndexedDB：打开数据库
function openWordAppDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('wordAppDB', 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('words')) {
                db.createObjectStore('words', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('phrases')) {
                db.createObjectStore('phrases', { keyPath: 'id', autoIncrement: true });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// IndexedDB：统计store内数量
function getStoreCount(db, storeName) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        console.log(tx);

        // const store = tx.objectStore(storeName);
        // const countReq = store.count();
        // countReq.onsuccess = () => resolve(countReq.result || 0);
        // countReq.onerror = () => reject(countReq.error);
    });
}

// IndexedDB：若为空则用当前内置数据做种子
async function initIndexedDBWithSeed() {
    if (!('indexedDB' in window)) return;
    try {
        const db = await openWordAppDB();
        const wordsCount = await getStoreCount(db, 'words');
        const phrasesCount = await getStoreCount(db, 'phrases');
        const seedWords = Array.isArray(appState.wordData) ? appState.wordData : [];
        const seedPhrases = Array.isArray(appState.phraseData) ? appState.phraseData : [];
        const needSeedWords = wordsCount === 0 && seedWords.length > 0;
        const needSeedPhrases = phrasesCount === 0 && seedPhrases.length > 0;
        if (needSeedWords) {
            const tx = db.transaction('words', 'readwrite');
            const store = tx.objectStore('words');
            seedWords.forEach(item => {
                const record = typeof item === 'string' ? { word: item } : item;
                store.add(record);
            });
        }
        if (needSeedPhrases) {
            const tx = db.transaction('phrases', 'readwrite');
            const store = tx.objectStore('phrases');
            seedPhrases.forEach(item => {
                const record = typeof item === 'string' ? { phrase: item } : item;
                store.add(record);
            });
        }
    } catch (e) {
        console.warn('IndexedDB初始化失败，使用内置数据作为回退', e);
    }
}

// IndexedDB：获取随机若干项
async function fetchRandomFromIDB(storeName, count) {
    if (!('indexedDB' in window)) {
        const fallback = storeName === 'words' ? (appState.wordData || []) : (appState.phraseData || []);
        return (appState.settings.randomOrder ? shuffleArray(fallback) : fallback)
          .slice(0, count);
    }
    try {
        const db = await openWordAppDB();
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const getAllReq = store.getAll();
        const records = await new Promise((resolve, reject) => {
            getAllReq.onsuccess = () => resolve(getAllReq.result || []);
            getAllReq.onerror = () => reject(getAllReq.error);
        });

        let pool = [];
        if (Array.isArray(records) && records.length > 0) {
          // 兼容形态1：单条记录包含大量数据，如 { name: 'words', data: [...] }
          if (Array.isArray(records[0] && records[0].data)) {
            pool = records[0].data;
          } else {
            // 兼容形态2：每条记录即一个词/短语对象
            pool = records;
          }
        }

        // 统一数据结构：字符串转对象
        pool = Array.isArray(pool) ? pool.map((item) => {
          if (typeof item === 'string') {
            return storeName === 'words' ? { word: item } : { phrase: item };
          }
          return item;
        }) : [];

        const shuffled = appState.settings.randomOrder ? shuffleArray(pool) : pool;
        return shuffled.slice(0, count);
    } catch (e) {
        console.warn('从IndexedDB读取失败，使用内置数据回退', e);
        const fallback = storeName === 'words' ? (appState.wordData || []) : (appState.phraseData || []);
        const normalized = fallback.map((item) => typeof item === 'string'
          ? (storeName === 'words' ? { word: item } : { phrase: item })
          : item);
        return (appState.settings.randomOrder ? shuffleArray(normalized) : normalized)
          .slice(0, count);
    }
}

// 缓存数据源：如未缓存则从js目录的JSON文件拉取并存入IndexedDB
async function ensureSourcesCached(){
  try{
    const db = await openWordAppDB();
    // 检查words是否已有容器数据
    const hasWords = await hasContainerData(db, 'words');
    const hasPhrases = await hasContainerData(db, 'phrases');
    if(!hasWords){
      const res = await fetch('js/dc.json', { cache: 'no-store' });
      const data = await res.json();
      await upsertContainerRecord(db, 'words', Array.isArray(data) ? data : []);
    }
    if(!hasPhrases){
      const res = await fetch('js/dy.json', { cache: 'no-store' });
      const data = await res.json();
      await upsertContainerRecord(db, 'phrases', Array.isArray(data) ? data : []);
    }
    localStorage.setItem('sourcesCachedAt', String(Date.now()));
  }catch(e){
    console.warn('ensureSourcesCached失败，可能是fetch或IndexedDB不可用，将使用内置数据回退', e);
  }
}

// 判断store中是否存在包含data数组的容器记录
function hasContainerData(db, storeName){
  return new Promise((resolve)=>{
    try{
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        const found = list.some(r => Array.isArray(r && r.data) && r.data.length > 0);
        resolve(found);
      };
      req.onerror = () => resolve(false);
    }catch{ resolve(false); }
  });
}

// 写入或更新容器记录（兼容不同keyPath）
function upsertContainerRecord(db, storeName, data){
  return new Promise((resolve, reject) => {
    try{
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const record = { name: storeName, data };
      const putReq = store.put(record);
      putReq.onsuccess = () => resolve(true);
      putReq.onerror = () => reject(putReq.error);
    }catch(e){ reject(e); }
  });
}

// 会话级去重标记（本次会话内已抽取的条目）
const sessionPicked = {
  words: new Set(),
  phrases: new Set()
};

const SOURCE_FILES = { words: 'js/dc.json', phrases: 'js/dy.json' };
const SOURCE_CACHE_KEYS = { words: 'words-source', phrases: 'phrases-source' };

function getCachedSource(mode){
  try{
    const raw = localStorage.getItem(SOURCE_CACHE_KEYS[mode]);
    const data = raw ? JSON.parse(raw) : null;
    return Array.isArray(data) ? data : null;
  }catch(e){ return null; }
}

function setCachedSource(mode, data){
  try{
    localStorage.setItem(SOURCE_CACHE_KEYS[mode], JSON.stringify(Array.isArray(data) ? data : []));
    localStorage.setItem('sourcesCachedAt', String(Date.now()));
    return true;
  }catch(e){ return false; }
}

async function fetchSource(mode){
  const url = SOURCE_FILES[mode];
  const res = await fetch(url, { cache: 'no-store' });
  if(!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
  return await res.json();
}

// 保证本地缓存存在（首次从js目录拉取）
async function ensureSourcesCached(){
  for(const mode of ['words','phrases']){
    if(!getCachedSource(mode)){
      try{
        const data = await fetchSource(mode);
        setCachedSource(mode, Array.isArray(data) ? data : []);
      }catch(e){
        console.warn('fetch source failed', mode, e);
      }
    }
  }
}

// 兼容旧名：不再使用IndexedDB，改为localStorage检查
function hasContainerData(storeName){
  return !!getCachedSource(storeName);
}
// 兼容旧名：写入容器数据到localStorage
function upsertContainerRecord(storeName, data){
  return setCachedSource(storeName, data);
}

// 从缓存中抽取随机数据，并在本次会话内做去重标记
async function getRandomFromCache(mode, count){
  await ensureSourcesCached();
  let list = getCachedSource(mode) || [];
  list = list.map(item => {
    if(typeof item === 'string'){
      return mode === 'words' ? { word: item } : { phrase: item, translation: '' };
    }
    return item;
  });
  const keyFn = mode === 'words' ? (it) => (it.word || JSON.stringify(it))
                                 : (it) => (it.phrase || JSON.stringify(it));
  const sess = sessionPicked[mode];
  const available = list.filter(it => !sess.has(keyFn(it)));
  const pool = available.length >= count ? available : list;
  const selected = shuffleArray(pool).slice(0, count);
  selected.forEach(it => sess.add(keyFn(it)));
  return selected;
}

// 在音标后方插入发音按钮，并绑定请求逻辑
function ensurePronounceButton(text){
  try{
    // 移除旧按钮避免重复
    const old = document.getElementById('play-audio-btn');
    if(old && old.parentElement){ old.parentElement.removeChild(old); }
    if(!text){ return; }
    const btn = document.createElement('button');
    btn.id = 'play-audio-btn';
    btn.type = 'button';
    btn.className = 'btn-outline';
    btn.textContent = '发音';
    // 放在音标后：紧跟在#item-text元素之后
    if(pageElements.learning.itemText){
      pageElements.learning.itemText.insertAdjacentElement('afterend', btn);
    }
    btn.addEventListener('click', () => {
      playPronunciation(text);
    });
  }catch(e){ console.warn('插入发音按钮失败', e); }
}

// 有道API签名与请求
const youdaoConfig = {
  appKey: '020c8643f66ec4f9',
  appSecret: '0ZdXoiHiKM9DOkGFmKzwZp3E93l2ePsE', // 暴露在前端有风险，请注意安全
  from: 'zh-CHS',
  to: 'en',
  vocabId: ''
};

function truncate(q){
  const len = q.length;
  if(len <= 20) return q;
  return q.substring(0, 10) + len + q.substring(len-10, len);
}

function buildYoudaoSign(query){
  const salt = Date.now();
  const curtime = Math.floor(Date.now()/1000);
  const str1 = youdaoConfig.appKey + truncate(query) + salt + curtime + youdaoConfig.appSecret;
  const sign = CryptoJS.SHA256(str1).toString(CryptoJS.enc.Hex);
  return { sign, salt, curtime };
}

function playPronunciation(query){
  try{
    const { sign, salt, curtime } = buildYoudaoSign(query);
    $.ajax({
      url: 'https://openapi.youdao.com/api',
      type: 'GET',
      dataType: 'jsonp',
      data: {
        q: query,
        appKey: youdaoConfig.appKey,
        salt: salt,
        from: youdaoConfig.from,
        to: youdaoConfig.to,
        sign: sign,
        signType: 'v3',
        curtime: curtime,
        vocabId: youdaoConfig.vocabId,
      },
      success: function (data) {
        try{
          console.log('youdao response:', data);
          const speakUrl = data && (data.speakUrl || (data.basic && data.basic['uk-speak-url']) || (data.basic && data.basic['us-speak-url']));
          if(speakUrl){
            const audio = new Audio(speakUrl);
            audio.play().catch(err => console.warn('audio play error', err));
          }else{
            console.warn('未返回speakUrl');
          }
        }catch(e){ console.warn('处理响应失败', e); }
      },
      error: function (xhr, status, err){
        console.warn('youdao请求失败', status, err);
      }
    });
  }catch(e){ console.warn('发音请求构建失败', e); }
}
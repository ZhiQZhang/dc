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
function initApp() {
    loadUserData();
    loadSettings();
    setupEventListeners();
    updateWelcomeStats();
    initializeCharts();
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
    // 导航事件
    pageElements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.dataset.target;
            navigateToPage(target);
            updateNavActiveState(target);
        });
    });
    
    // 欢迎页面事件
    pageElements.welcome.startLearning.addEventListener('click', () => {
        navigateToPage('mode-selection');
    });
    
    // 模式选择页面事件
    pageElements.modeSelection.modeCards.forEach(card => {
        card.addEventListener('click', () => {
            appState.currentMode = card.dataset.mode;
            startLearning(appState.currentMode);
        });
    });
    
    pageElements.modeSelection.backToWelcome.addEventListener('click', () => {
        navigateToPage('welcome-page');
    });
    
    // 学习页面事件
    pageElements.learning.showMeaning.addEventListener('click', () => {
        if (pageElements.learning.itemMeaning) {
            // 确保释义文本不为空
            if (!pageElements.learning.itemMeaning.textContent || pageElements.learning.itemMeaning.textContent === '释义将在这里显示') {
                console.warn('释义内容可能未正确设置');
            }
            // 移除hidden类显示释义
            pageElements.learning.itemMeaning.classList.remove('hidden');
            console.log('显示释义:', pageElements.learning.itemMeaning.textContent);
        } else {
            console.error('无法显示释义，itemMeaning元素不存在');
        }
    });
    
    pageElements.learning.markHard.addEventListener('click', () => {
        markItem('hard');
    });
    
    pageElements.learning.markFamiliar.addEventListener('click', () => {
        markItem('familiar');
    });
    
    pageElements.learning.markKnown.addEventListener('click', () => {
        markItem('known');
    });
    
    pageElements.learning.endLearning.addEventListener('click', () => {
        showResults();
    });
    
    // 结果页面事件
    pageElements.results.reviewHard.addEventListener('click', () => {
        reviewHardItems();
    });
    
    pageElements.results.newLearning.addEventListener('click', () => {
        navigateToPage('mode-selection');
    });
    
    // 设置页面事件
    pageElements.settings.saveSettings.addEventListener('click', () => {
        saveSettings();
    });
    
    pageElements.settings.backFromSettings.addEventListener('click', () => {
        navigateToPage('welcome-page');
    });
}

// 导航到页面
function navigateToPage(pageId) {
    pageElements.pages.forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    appState.currentPage = pageId;
}

// 更新导航激活状态
function updateNavActiveState(pageId) {
    pageElements.navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.target === pageId) {
            item.classList.add('active');
        }
    });
}

// 开始学习
function startLearning(mode) {
    let items = [];
    
    if (mode === 'words') {
        items = [...appState.wordData];
        pageElements.learning.currentType.textContent = '单词';
    } else if (mode === 'phrases') {
        items = [...appState.phraseData];
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
    
    // 导航到学习页面
    navigateToPage('learning-page');
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
        
        // 设置释义 - 单词数据结构
        pageElements.learning.itemMeaning.textContent = `${item.cx || ''} ${item.sy}`.trim();
    } else if (item.phrase) {
        // 短语
        pageElements.learning.itemText.textContent = item.phrase;
        pageElements.learning.itemMeaning.textContent = item.translation;
    } else {
        // 未知类型，提供默认显示
        pageElements.learning.itemText.textContent = '未知项目';
        pageElements.learning.itemMeaning.textContent = '无法识别的数据格式';
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
    // 更新结果数据
    pageElements.results.totalItems.textContent = appState.learningResults.total;
    pageElements.results.knownItems.textContent = appState.learningResults.known;
    pageElements.results.familiarItems.textContent = appState.learningResults.familiar;
    pageElements.results.hardItems.textContent = appState.learningResults.hard;
    
    // 更新图表
    updateResultsChart();
    
    // 导航到结果页面
    navigateToPage('results-page');
}

// 更新结果图表
function updateResultsChart() {
    if (!window.resultsChart) {
        initializeCharts();
    }
    
    window.resultsChart.data.labels = ['已掌握', '不太熟', '需加强'];
    window.resultsChart.data.datasets[0].data = [
        appState.learningResults.known,
        appState.learningResults.familiar,
        appState.learningResults.hard
    ];
    
    window.resultsChart.update();
}

// 初始化图表
function initializeCharts() {
    const ctx = pageElements.results.resultsChart.getContext('2d');
    
    window.resultsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['已掌握', '不太熟', '需加强'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#6bcb77', '#ffd93d', '#ff6b6b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// 复习难点
function reviewHardItems() {
    appState.currentMode = 'review';
    startLearning('review');
}

// 保存设置
function saveSettings() {
    appState.settings.learningCount = parseInt(pageElements.settings.learningCount.value) || 20;
    appState.settings.randomOrder = pageElements.settings.randomOrder.checked;
    appState.settings.autoPlay = pageElements.settings.autoPlay.checked;
    
    localStorage.setItem('wordAppSettings', JSON.stringify(appState.settings));
    
    // 显示保存成功提示
    alert('设置已保存！');
    navigateToPage('welcome-page');
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

// 监听页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);
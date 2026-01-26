// Telegram Web App initialization
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Haptic Feedback Helper
const haptic = {
    // Impact feedback: 'light', 'medium', 'heavy', 'rigid', 'soft'
    impact: (style = 'medium') => {
        try {
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred(style);
            }
        } catch (e) {}
    },
    // Notification feedback: 'error', 'success', 'warning'
    notification: (type = 'success') => {
        try {
            if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred(type);
            }
        } catch (e) {}
    },
    // Selection changed feedback
    selection: () => {
        try {
            if (tg.HapticFeedback) {
                tg.HapticFeedback.selectionChanged();
            }
        } catch (e) {}
    }
};

// Snackbar (replaces tg.showAlert for in-app toasts)
let snackbarTimeout = null;
function showSnackbar(message, type = 'default') {
    const el = document.getElementById('snackbar');
    if (!el) return;
    if (snackbarTimeout) clearTimeout(snackbarTimeout);
    el.textContent = typeof message === 'string' ? message : (message && message.message) || String(message);
    el.className = 'snackbar show';
    if (type === 'success') el.classList.add('snackbar-success');
    else if (type === 'error') el.classList.add('snackbar-error');
    else if (type === 'warning') el.classList.add('snackbar-warning');
    snackbarTimeout = setTimeout(() => {
        el.classList.remove('show', 'snackbar-success', 'snackbar-error', 'snackbar-warning');
        snackbarTimeout = null;
    }, 4000);
}

// Confetti celebration effect
function celebrateConfetti() {
    if (typeof confetti !== 'function') {
        console.log('Confetti not loaded');
        return;
    }
    
    // First burst
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    });
    
    // Side bursts with delay
    setTimeout(() => {
        confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
        });
        confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
        });
    }, 150);
    
    // Final burst
    setTimeout(() => {
        confetti({
            particleCount: 80,
            spread: 100,
            origin: { y: 0.7 }
        });
    }, 300);
}

// API base URL (should be configured)
// In production, this should be your backend URL
const API_BASE_URL = window.API_URL || 'http://localhost:8000';

// Bot settings (will be loaded from API or set manually)
const settings = {
    telegram_bot_username: window.BOT_USERNAME || 'leaderboardtestbot'
};

// Get initData for authentication
const initData = tg.initData;
const initDataUnsafe = tg.initDataUnsafe;

// State
let currentTab = 'all-time';
let userData = null;
let presetAmounts = {};
let currentLanguage = 'ru'; // Will be set from user data

// Initialize app
async function init() {
    try {
        // Get user data
        const response = await fetch(`${API_BASE_URL}/me`, {
            headers: {
                'X-Init-Data': initData
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to get user data');
        }
        
        userData = await response.json();
        
        // Update bot username from userData if available
        if (userData.bot_username) {
            settings.telegram_bot_username = userData.bot_username;
        }
        
        // Language: stored choice > user locale (ru → ru, else → en)
        currentLanguage = getLanguage();
        setLanguage();
        updateTranslations();
        
        // Load preset amounts (could be from userData or settings)
        presetAmounts = {
            1: 100, // Will be updated from API
            2: 50,
            3: 25
        };
        
        updatePresetButtons();
        setupEventListeners();
        updateBalanceBar();
        loadLeaderboard('all-time');
        loadCollectedFunds();
    } catch (error) {
        console.error('Init error:', error);
        showError(t('initError'));
    }
}

// Update all translations in the page
function updateTranslations() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = t(key);
        if (element.tagName === 'INPUT' && element.hasAttribute('data-i18n-placeholder')) {
            element.placeholder = translation;
        } else {
            element.textContent = translation;
        }
    });
    
    // Update placeholders separately
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = t(key);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Bottom navigation
    document.querySelectorAll('.nav-item').forEach(navItem => {
        navItem.addEventListener('click', () => {
            haptic.selection(); // Vibration on nav switch
            const tabName = navItem.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Language switcher (profile)
    document.querySelectorAll('.profile-lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            if (lang !== 'ru' && lang !== 'en') return;
            haptic.selection();
            try { localStorage.setItem('app_lang', lang); } catch (e) {}
            currentLanguage = lang;
            setLanguage();
            updateTranslations();
            document.querySelectorAll('.profile-lang-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-lang') === lang));
        });
    });

    // Rise in rating button - opens activate or top-up modal
    document.getElementById('donate-btn').addEventListener('click', () => {
        haptic.impact('medium');
        handleRiseInRating();
    });
    
    // Top-up modal close
    const closeTopupBtn = document.getElementById('close-topup');
    if (closeTopupBtn) {
        closeTopupBtn.addEventListener('click', () => {
            haptic.impact('light');
            hideTopupModal();
        });
    }
    
    // Top-up backdrop
    const topupBackdrop = document.getElementById('topup-backdrop');
    if (topupBackdrop) {
        topupBackdrop.addEventListener('click', () => {
            haptic.impact('light');
            hideTopupModal();
        });
    }
    
    // Top-up method tabs
    document.querySelectorAll('.topup-method').forEach(btn => {
        btn.addEventListener('click', () => {
            haptic.selection();
            selectTopupMethod(btn.dataset.method);
        });
    });
    
    // Top-up quick amounts
    document.querySelectorAll('.quick-amount-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            haptic.impact('light');
            const amount = parseFloat(btn.dataset.amount);
            document.getElementById('topup-amount').value = amount;
            updateTopupPreview();
            
            // Highlight selected
            document.querySelectorAll('.quick-amount-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Top-up amount input
    const topupAmountInput = document.getElementById('topup-amount');
    if (topupAmountInput) {
        topupAmountInput.addEventListener('input', updateTopupPreview);
    }
    
    // Top-up connect wallet
    const topupConnectBtn = document.getElementById('topup-connect-wallet');
    if (topupConnectBtn) {
        topupConnectBtn.addEventListener('click', async () => {
            haptic.impact('medium');
            if (window.tonConnect && window.tonConnect.connect) {
                await window.tonConnect.connect();
            }
        });
    }
    
    // Top-up pay with TON
    const topupPayBtn = document.getElementById('topup-pay-btn');
    if (topupPayBtn) {
        topupPayBtn.addEventListener('click', () => {
            haptic.impact('heavy');
            processTopupTonPayment();
        });
    }
    
    // Top-up pay with Stars
    const topupStarsBtn = document.getElementById('topup-stars-btn');
    if (topupStarsBtn) {
        topupStarsBtn.addEventListener('click', () => {
            haptic.impact('heavy');
            processTopupStarsPayment();
        });
    }
    
    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            haptic.impact('light'); // Vibration on preset select
            const presetId = parseInt(btn.dataset.preset);
            selectPreset(presetId, e.currentTarget);
        });
    });
    
    // Custom amount input (legacy - may not exist)
    const customStarsInput = document.getElementById('custom-stars');
    if (customStarsInput) {
        customStarsInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (value > 0) {
                selectCustomAmount(value);
            } else {
                const invoiceBtn = document.getElementById('create-invoice-btn');
                if (invoiceBtn) invoiceBtn.disabled = true;
            }
        });
    }
    
    // Payment method selection (legacy - may not exist)
    const paymentMethodBtns = document.querySelectorAll('.payment-method-btn');
    if (paymentMethodBtns.length > 0) {
        paymentMethodBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const method = btn.dataset.method;
                selectPaymentMethod(method);
            });
        });
    }
    
    // Crypto currency selection (legacy - may not exist)
    const cryptoCurrencySelect = document.getElementById('crypto-currency');
    if (cryptoCurrencySelect) {
        cryptoCurrencySelect.addEventListener('change', (e) => {
            selectedCryptoCurrency = e.target.value;
        });
    }
    
    // Create invoice button (legacy - may not exist)
    const createInvoiceBtn = document.getElementById('create-invoice-btn');
    if (createInvoiceBtn) {
        createInvoiceBtn.addEventListener('click', () => {
            haptic.impact('heavy');
            createInvoice();
        });
    }
    
    // Share referral button
    const shareBtn = document.getElementById('share-ref-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            haptic.impact('medium'); // Vibration on share
            console.log('Share button clicked');
            shareReferralLink();
        });
    } else {
        console.error('Share button not found!');
    }
    
    // Profile: title input
    const customTitleInput = document.getElementById('custom-title');
    const titleCharCountSpan = document.getElementById('title-char-count');
    if (customTitleInput && titleCharCountSpan) {
        customTitleInput.addEventListener('input', (e) => {
            titleCharCountSpan.textContent = e.target.value.length;
        });
    }
    
    // Profile: description textarea
    const customTextInput = document.getElementById('custom-text');
    const textCharCountSpan = document.getElementById('text-char-count');
    if (customTextInput && textCharCountSpan) {
        customTextInput.addEventListener('input', (e) => {
            textCharCountSpan.textContent = e.target.value.length;
        });
    }
    
    // Profile: save button
    const saveProfileBtn = document.getElementById('save-profile');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', () => {
            haptic.impact('medium'); // Vibration on save
            saveProfile();
        });
    }
    
    // User profile modal: close button
    const closeUserProfileBtn = document.getElementById('close-user-profile');
    if (closeUserProfileBtn) {
        closeUserProfileBtn.addEventListener('click', () => {
            haptic.impact('light');
            hideUserProfileModal();
        });
    }
    
    // User profile backdrop: close on click
    const userProfileBackdrop = document.getElementById('user-profile-backdrop');
    if (userProfileBackdrop) {
        userProfileBackdrop.addEventListener('click', () => {
            haptic.impact('light');
            hideUserProfileModal();
        });
    }
    
    // Edit name: open modal
    const editNameBtn = document.getElementById('profile-name-edit');
    console.log('Edit name button found:', editNameBtn);
    if (editNameBtn) {
        editNameBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Edit name button clicked');
            haptic.impact('light');
            showEditNameModal();
        });
    }
    
    // Edit name: save
    const editNameSaveBtn = document.getElementById('edit-name-save');
    if (editNameSaveBtn) {
        editNameSaveBtn.addEventListener('click', () => {
            haptic.impact('medium');
            saveDisplayName();
        });
    }
    
    // Edit name: cancel
    const editNameCancelBtn = document.getElementById('edit-name-cancel');
    if (editNameCancelBtn) {
        editNameCancelBtn.addEventListener('click', () => {
            haptic.impact('light');
            hideEditNameModal();
        });
    }
    
    // Edit name: backdrop close
    const editNameBackdrop = document.getElementById('edit-name-backdrop');
    if (editNameBackdrop) {
        editNameBackdrop.addEventListener('click', () => {
            haptic.impact('light');
            hideEditNameModal();
        });
    }
    
    // Activate charts: open modal (profile button)
    const activateBtn = document.getElementById('activate-charts-btn');
    if (activateBtn) {
        activateBtn.addEventListener('click', () => {
            haptic.impact('light');
            showActivateModal();
        });
    }
    
    // Activate charts: open modal (balance bar button)
    const balanceBarActivateBtn = document.getElementById('balance-bar-activate');
    if (balanceBarActivateBtn) {
        balanceBarActivateBtn.addEventListener('click', () => {
            haptic.impact('light');
            showActivateModal();
        });
    }
    
    // Activate charts: MAX button
    const activateMaxBtn = document.getElementById('activate-max');
    if (activateMaxBtn) {
        activateMaxBtn.addEventListener('click', () => {
            haptic.impact('light');
            const input = document.getElementById('activate-amount');
            const balance = userData?.balance_charts || 0;
            input.value = Math.floor(balance);
        });
    }
    
    // Activate charts: confirm
    const activateConfirmBtn = document.getElementById('activate-confirm');
    if (activateConfirmBtn) {
        activateConfirmBtn.addEventListener('click', () => {
            haptic.impact('medium');
            activateCharts();
        });
    }
    
    // Activate charts: cancel
    const activateCancelBtn = document.getElementById('activate-cancel');
    if (activateCancelBtn) {
        activateCancelBtn.addEventListener('click', () => {
            haptic.impact('light');
            hideActivateModal();
        });
    }
    
    // Activate charts: backdrop close
    const activateBackdrop = document.getElementById('activate-backdrop');
    if (activateBackdrop) {
        activateBackdrop.addEventListener('click', () => {
            haptic.impact('light');
            hideActivateModal();
        });
    }
    
    // Activate charts: top-up button
    const activateTopupBtn = document.getElementById('activate-topup-btn');
    if (activateTopupBtn) {
        activateTopupBtn.addEventListener('click', () => {
            haptic.impact('light');
            hideActivateModal();
            showTopupModal();
        });
    }
    
    // Payment method selection (Stars/TON)
    document.querySelectorAll('.payment-method-selector .payment-method').forEach(btn => {
        btn.addEventListener('click', () => {
            haptic.selection();
            selectPaymentMethod(btn.dataset.method);
        });
    });
    
    // TON amount input
    const tonAmountInput = document.getElementById('ton-amount');
    if (tonAmountInput) {
        tonAmountInput.addEventListener('input', updateTonPreview);
    }
    
    // Copy TON address button
    const copyTonBtn = document.getElementById('copy-ton-address');
    if (copyTonBtn) {
        copyTonBtn.addEventListener('click', () => {
            haptic.impact('light');
            copyTonAddress();
        });
    }
    
    // Load TON config
    loadTonConfig();
}

// Tab switching
function switchTab(tabName) {
    currentTab = tabName;
    
    // Update bottom nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });
    
    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === tabName);
    });
    
    // "Подняться в рейтинге" button shown on all pages
    const donateContainer = document.getElementById('donate-button-container');
    if (donateContainer) {
        donateContainer.style.display = 'block';
    }
    
    // Show/hide balance bar and collected bar (hide on profile tab only)
    const balanceBar = document.getElementById('balance-bar');
    if (balanceBar) {
        balanceBar.classList.toggle('hidden', tabName === 'profile');
        updateBalanceBar();
    }
    const collectedBar = document.getElementById('collected-bar');
    if (collectedBar) {
        collectedBar.classList.toggle('hidden', tabName === 'profile');
    }
    
    // Load content based on tab
    if (tabName === 'profile') {
        loadProfile();
        updateMyPositionBarFromUserData();
    } else if (tabName === 'tasks') {
        updateTranslations();
        loadTasks();
        updateMyPositionBarFromUserData();
    } else {
        loadLeaderboard(tabName);
    }
}

// Update "You're at X place • N charts" bar from userData (for Profile/Tasks tabs — show all-time)
function updateMyPositionBarFromUserData() {
    if (!userData) return;
    const rankEl = document.getElementById('my-rank');
    const chartsEl = document.getElementById('my-charts');
    const blockEl = document.getElementById('my-position');
    if (!rankEl || !chartsEl || !blockEl) return;
    rankEl.textContent = userData.rank_all_time || '-';
    chartsEl.textContent = formatNumber(userData.tons_all_time || 0);
    blockEl.style.display = 'block';
}

// Load and display collected funds status bar (max 1000 TON = 15% of all deps)
const COLLECTED_MAX_TON = 1000;
async function loadCollectedFunds() {
    const currentEl = document.getElementById('collected-current');
    const fillEl = document.getElementById('collected-bar-fill');
    if (!currentEl || !fillEl) return;
    try {
        const response = await fetch(`${API_BASE_URL}/leaderboard/collected`, {
            headers: { 'X-Init-Data': initData }
        });
        if (!response.ok) return;
        const data = await response.json();
        const totalCharts = parseFloat(data.total_charts) || 0;
        const chartsPerTon = tonConfig?.charts_per_ton || 100;
        const totalTon = totalCharts / chartsPerTon;
        const displayTon = Math.min(totalTon, COLLECTED_MAX_TON);
        const percent = Math.min(100, (totalTon / COLLECTED_MAX_TON) * 100);
        currentEl.textContent = displayTon.toFixed(1);
        fillEl.style.width = percent.toFixed(1) + '%';
    } catch (e) {
        console.log('Collected funds load failed:', e);
    }
}

// Update balance bar on leaderboard pages
function updateBalanceBar() {
    const balanceValue = document.getElementById('balance-bar-value');
    const activateBtn = document.getElementById('balance-bar-activate');
    
    if (balanceValue && userData) {
        const balance = userData.balance_charts || 0;
        balanceValue.textContent = balance;
        
        if (activateBtn) {
            activateBtn.disabled = balance <= 0;
        }
    }
}

// Load tasks tab
function getTaskLink(task) {
    const c = task.config || {};
    if (task.type === 'subscribe_channel') {
        const ch = (c.channel_username || '').replace(/^@/, '');
        return ch ? `https://t.me/${ch}` : '#';
    }
    if (task.type === 'join_chat') {
        return c.invite_link || c.chat_invite_link || '#';
    }
    if (task.type === 'open_app') {
        return c.app_url || c.url || '#';
    }
    return '#';
}

async function loadTasks() {
    const listEl = document.getElementById('tasks-list');
    if (!listEl) return;
    listEl.innerHTML = `<div class="loading">${t('loading')}</div>`;
    try {
        const response = await fetch(`${API_BASE_URL}/tasks`, {
            headers: { 'X-Init-Data': initData }
        });
        if (!response.ok) {
            if (response.status === 404) {
                listEl.innerHTML = `<div class="tasks-empty">${t('tasksEmpty')}</div>`;
                return;
            }
            throw new Error('Failed to load tasks');
        }
        const tasks = await response.json();
        if (!Array.isArray(tasks) || tasks.length === 0) {
            listEl.innerHTML = `<div class="tasks-empty">${t('tasksEmpty')}</div>`;
            return;
        }
        let html = '';
        tasks.forEach(task => {
            const link = getTaskLink(task);
            const typeLabel = task.type === 'subscribe_channel' ? t('taskTypeSubscribe') : task.type === 'join_chat' ? t('taskTypeJoinChat') : t('taskTypeOpenApp');
            const typeIcon = task.type === 'subscribe_channel' ? 'task-icon-channel' : task.type === 'join_chat' ? 'task-icon-chat' : 'task-icon-app';
            if (task.completed) {
                html += `
                    <div class="task-card task-card-done" data-task-id="${escapeHtml(task.id)}">
                        <div class="task-card-icon ${typeIcon}"></div>
                        <div class="task-card-body">
                            <span class="task-card-type">${escapeHtml(typeLabel)}</span>
                            <h3 class="task-card-title">${escapeHtml(task.title)}</h3>
                            ${task.description ? `<p class="task-card-desc">${escapeHtml(task.description)}</p>` : ''}
                            <div class="task-card-reward"><span class="charts-icon charts-icon-sm"></span> ${task.charts_reward}</div>
                        </div>
                        <div class="task-card-done-badge">${t('taskDone')}</div>
                    </div>`;
            } else {
                html += `
                    <div class="task-card" data-task-id="${escapeHtml(task.id)}">
                        <div class="task-card-icon ${typeIcon}"></div>
                        <div class="task-card-body">
                            <span class="task-card-type">${escapeHtml(typeLabel)}</span>
                            <h3 class="task-card-title">${escapeHtml(task.title)}</h3>
                            ${task.description ? `<p class="task-card-desc">${escapeHtml(task.description)}</p>` : ''}
                            <div class="task-card-reward"><span class="charts-icon charts-icon-sm"></span> ${task.charts_reward}</div>
                        </div>
                        <div class="task-card-actions">
                            <a href="${escapeHtml(link)}" class="task-btn task-btn-go" data-task-link="${escapeHtml(link)}" data-task-id="${escapeHtml(task.id)}">${t('taskGo')}</a>
                            <button type="button" class="task-btn task-btn-claim" data-task-id="${escapeHtml(task.id)}">${t('taskClaim')}</button>
                        </div>
                    </div>`;
            }
        });
        listEl.innerHTML = html;
        listEl.querySelectorAll('.task-btn-go').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const url = btn.getAttribute('data-task-link') || btn.href;
                if (url && url !== '#') {
                    if (typeof tg !== 'undefined' && tg.openTelegramLink) {
                        tg.openTelegramLink(url);
                    } else {
                        window.open(url, '_blank');
                    }
                }
            });
        });
        listEl.querySelectorAll('.task-btn-claim').forEach(btn => {
            btn.addEventListener('click', () => claimTaskReward(btn.getAttribute('data-task-id')));
        });
    } catch (err) {
        console.error('Load tasks error:', err);
        listEl.innerHTML = `<div class="tasks-empty">${t('tasksLoadError')}</div>`;
    }
}

async function claimTaskReward(taskId) {
    try {
        const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/complete`, {
            method: 'POST',
            headers: { 'X-Init-Data': initData }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            let msg = data.detail;
            if (Array.isArray(msg) && msg[0] && msg[0].msg) msg = msg[0].msg;
            else if (typeof msg !== 'string') msg = data.error || t('taskClaimError');
            showSnackbar(msg, 'error');
            return;
        }
        if (userData) userData.balance_charts = data.new_balance;
        updateBalanceBar();
        haptic.notification('success');
        showSnackbar(t('taskClaimSuccess', { amount: data.charts_added }), 'success');
        loadTasks();
    } catch (err) {
        console.error('Claim task error:', err);
        showSnackbar(t('taskClaimError'), 'error');
    }
}

// Load leaderboard
async function loadLeaderboard(type) {
    const listElement = document.getElementById(`${type}-list`);
    if (!listElement) return;
    listElement.innerHTML = `<div class="loading">${t('loading')}</div>`;
    
    try {
        let url = `${API_BASE_URL}/leaderboard/${type}?limit=10000`;
        if (type === 'week') {
            url += '&week_key=';
        }
        
        const response = await fetch(url, {
            headers: {
                'X-Init-Data': initData
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load leaderboard');
        }
        
        const data = await response.json();
        renderLeaderboard(type, data);
    } catch (error) {
        console.error('Load leaderboard error:', error);
        listElement.innerHTML = `<div class="loading">${t('errorLoading')}</div>`;
    }
}

// Render leaderboard
// Store leaderboard data for user profiles
let leaderboardData = {};

function renderLeaderboard(type, items) {
    const listElement = document.getElementById(`${type}-list`);
    
    // Store items for user profile lookup
    items.forEach(item => {
        leaderboardData[item.tg_id] = item;
    });
    
    if (items.length === 0) {
        listElement.innerHTML = `<div class="loading">${t('noData')}</div>`;
        return;
    }
    
    // Helper function to get rank group info
    function getRankGroup(rank) {
        if (rank >= 1 && rank <= 3) return { class: '', color: null, label: null };
        if (rank >= 4 && rank <= 10) return { class: 'rank-4-10', color: '#8FE3FF', label: '4-10' };
        if (rank >= 11 && rank <= 25) return { class: 'rank-11-25', color: '#E5F0F5', label: '11-25' };
        if (rank >= 26 && rank <= 50) return { class: 'rank-26-50', color: '#6A1B9A', label: '26-50' };
        if (rank >= 51 && rank <= 100) return { class: 'rank-51-100', color: '#1E3A8A', label: '51-100' };
        if (rank >= 101 && rank <= 250) return { class: 'rank-101-250', color: '#1FAA59', label: '101-250' };
        if (rank >= 251 && rank <= 500) return { class: 'rank-251-500', color: '#FF8C00', label: '251-500' };
        if (rank >= 501 && rank <= 1000) return { class: 'rank-501-1000', color: '#FFD700', label: '501-1000' };
        return { class: '', color: null, label: null };
    }
    
    // Render items with separators
    let html = '';
    let prevGroupLabel = null;
    
    items.forEach((item, index) => {
        const rank = item.rank;
        const currentGroup = getRankGroup(rank);
        
        // Add separator if we're entering a new group (and it's not top-3)
        if (currentGroup.label && prevGroupLabel !== currentGroup.label) {
            html += `
                <div class="rank-separator" style="background: linear-gradient(135deg, ${currentGroup.color}22, ${currentGroup.color}44); border-color: ${currentGroup.color};">
                    <span class="rank-separator-text" style="color: ${currentGroup.color};">${currentGroup.label}</span>
                </div>
            `;
        }
        
        prevGroupLabel = currentGroup.label;
        
        const avatar = item.photo_url 
            ? `<img src="${item.photo_url}" alt="">`
            : `<span>${(item.first_name || item.username || 'U')[0].toUpperCase()}</span>`;
        
        const displayName = item.display_name || item.username || item.first_name || (currentLanguage === 'ru' ? 'Пользователь' : 'User');
        
        // Show title in leaderboard list (link icon if has link/description)
        let customInfo = '';
        if (item.custom_title) {
            const hasMore = item.custom_text || item.custom_link;
            const moreIcon = hasMore ? ' →' : '';
            customInfo = `<div class="user-custom-text"><span class="user-custom-text-inner">${escapeHtml(item.custom_title)}${moreIcon}</span></div>`;
        } else if (item.custom_text || item.custom_link) {
            customInfo = `<div class="user-custom-text"><span class="user-custom-text-inner">🔗</span></div>`;
        }
        
        let amountText = '';
        let tons = 0;
        if (type === 'referrals') {
            tons = item.referrals_tons_total;
            amountText = `<span class="charts-icon charts-icon-md"></span><span class="amount-num">${tons}</span> (${item.referrals_count} ${t('referralsCount')})`;
        } else if (type === 'week') {
            tons = item.tons_week;
            amountText = `<span class="charts-icon charts-icon-md"></span><span class="amount-num">${tons}</span>`;
        } else {
            tons = item.tons_total;
            amountText = `<span class="charts-icon charts-icon-md"></span><span class="amount-num">${tons}</span>`;
        }
        
        // Store tons for profile view
        item._displayTons = tons;
        
        // Rank styling classes
        let rankClass = '';
        if (rank === 1) rankClass = 'top-1';
        else if (rank === 2) rankClass = 'top-2';
        else if (rank === 3) rankClass = 'top-3';
        else rankClass = currentGroup.class;
        
        const rankDisplay = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
        
        html += `
            <div class="leaderboard-item ${rankClass}" data-tg-id="${item.tg_id}" onclick="openUserProfile(${item.tg_id}, ${item.rank})">
                <div class="rank">${rankDisplay}</div>
                <div class="avatar">${avatar}</div>
                <div class="user-info">
                    <div class="username">${displayName}</div>
                    ${customInfo}
                </div>
                <div class="amount">${amountText}</div>
            </div>
        `;
    });
    
    listElement.innerHTML = html;
    
    // Show my position (charts count depends on current tab: all-time / week / referrals)
    if (userData) {
        const myItem = items.find(item => String(item.tg_id) === String(userData.tg_id));
        let chartsForTab = 0;
        if (type === 'referrals') {
            chartsForTab = myItem ? (myItem.referrals_tons_total || 0) : (userData.referrals_tons_total || 0);
        } else if (type === 'week') {
            chartsForTab = myItem ? (myItem.tons_week || 0) : (userData.tons_week || 0);
        } else {
            chartsForTab = myItem ? (myItem.tons_total || 0) : (userData.tons_all_time || 0);
        }
        if (myItem) {
            document.getElementById('my-rank').textContent = myItem.rank;
            document.getElementById('my-charts').textContent = formatNumber(chartsForTab);
            document.getElementById('my-position').style.display = 'block';
        } else {
            // User not in this list, still show rank and charts from userData
            document.getElementById('my-rank').textContent = (type === 'all-time' && userData.rank_all_time) ? userData.rank_all_time : '-';
            document.getElementById('my-charts').textContent = formatNumber(chartsForTab);
            document.getElementById('my-position').style.display = 'block';
        }
    }
    
    // Apply marquee effect to overflowing text
    setTimeout(() => {
        applyMarqueeEffect(listElement);
    }, 100);
}

// Apply marquee effect to text that overflows
function applyMarqueeEffect(container) {
    const customTexts = container.querySelectorAll('.user-custom-text');
    customTexts.forEach(el => {
        const inner = el.querySelector('.user-custom-text-inner');
        if (inner && inner.scrollWidth > el.clientWidth) {
            el.classList.add('marquee');
        } else {
            el.classList.remove('marquee');
        }
    });
}

// Update preset buttons
function updatePresetButtons() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        const presetId = parseInt(btn.dataset.preset);
        const amount = presetAmounts[presetId];
        if (amount) {
            btn.querySelector('.preset-amount').textContent = `${amount} ⭐`;
            btn.dataset.amount = amount;
        }
    });
}

// Handle Rise in Rating button click
function handleRiseInRating() {
    const balance = userData?.balance_charts || 0;
    
    if (balance > 0) {
        // User has charts, show activate modal
        showActivateModal();
    } else {
        // No charts, show top-up modal
        showTopupModal();
    }
}

// Show top-up modal (optional: suggestedCharts = target charts to pre-fill, e.g. "their place + 1")
function showTopupModal(suggestedCharts) {
    const modal = document.getElementById('topup-modal');
    const backdrop = document.getElementById('topup-backdrop');
    
    if (modal) modal.classList.add('active');
    if (backdrop) backdrop.classList.add('active');
    
    tg.BackButton.show();
    tg.BackButton.onClick(hideTopupModal);
    
    // Pre-fill amount so that charts = suggestedCharts (for "take their place")
    const amountInput = document.getElementById('topup-amount');
    if (amountInput && typeof suggestedCharts === 'number' && suggestedCharts > 0) {
        const rate = currentTopupMethod === 'ton' ? (tonConfig?.charts_per_ton || 100) : 1;
        const amount = currentTopupMethod === 'ton'
            ? Math.max(0.1, Math.ceil(suggestedCharts / rate * 100) / 100)
            : suggestedCharts;
        amountInput.value = amount;
        updateTopupPreview();
    }
    
    // Check wallet connection status
    updateTopupWalletStatus();
    updateTopupPreview();
}

// Hide top-up modal
function hideTopupModal() {
    const modal = document.getElementById('topup-modal');
    const backdrop = document.getElementById('topup-backdrop');
    
    if (modal) modal.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    
    if (!document.getElementById('user-profile-modal')?.classList.contains('active') &&
        !document.getElementById('activate-modal')?.classList.contains('active')) {
        tg.BackButton.hide();
    }
}

// Select top-up payment method
let currentTopupMethod = 'ton';

function selectTopupMethod(method) {
    currentTopupMethod = method;
    
    // Update tabs
    document.querySelectorAll('.topup-method').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.method === method);
    });
    
    // Update currency display
    const currencyEl = document.getElementById('topup-currency');
    if (currencyEl) {
        currencyEl.textContent = method === 'ton' ? 'TON' : 'Stars';
    }
    
    // Show/hide sections
    const tonSection = document.getElementById('topup-ton-section');
    const starsSection = document.getElementById('topup-stars-section');
    
    if (tonSection) tonSection.style.display = method === 'ton' ? 'block' : 'none';
    if (starsSection) starsSection.style.display = method === 'stars' ? 'block' : 'none';
    
    // Update preview
    updateTopupPreview();
}

// Update top-up charts preview
function updateTopupPreview() {
    const amountInput = document.getElementById('topup-amount');
    const chartsEl = document.getElementById('topup-charts-amount');
    
    if (!amountInput || !chartsEl) return;
    
    const amount = parseFloat(amountInput.value) || 0;
    let charts = 0;
    
    if (currentTopupMethod === 'ton') {
        const rate = tonConfig?.charts_per_ton || 100;
        charts = Math.floor(amount * rate);
    } else {
        // Stars: 1 star = 1 chart (or use rate from config)
        charts = Math.floor(amount);
    }
    
    chartsEl.textContent = charts;
}

// Update wallet connection status in top-up modal
function updateTopupWalletStatus() {
    const connectSection = document.getElementById('topup-wallet-connect');
    const paySection = document.getElementById('topup-wallet-pay');
    
    const isConnected = window.tonConnect && window.tonConnect.isConnected && window.tonConnect.isConnected();
    
    if (connectSection) connectSection.style.display = isConnected ? 'none' : 'block';
    if (paySection) paySection.style.display = isConnected ? 'block' : 'none';
}

// Process TON payment from top-up modal
async function processTopupTonPayment() {
    const raw = String(document.getElementById('topup-amount').value || '').trim().replace(',', '.');
    const amount = parseFloat(raw) || 0;
    
    if (amount < 0.1) {
        showSnackbar(t('minTonAmount'), 'warning');
        return;
    }
    
    try {
        // Create payment
        const response = await fetch(`${API_BASE_URL}/ton/create-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Init-Data': initData
            },
            body: JSON.stringify({ amount_ton: amount })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create payment');
        }
        
        const payment = await response.json();
        
        // Send transaction via TON Connect
        if (window.tonConnect && window.tonConnect.sendTransaction) {
            await window.tonConnect.sendTransaction(
                payment.to_wallet,
                amount,
                payment.payment_comment
            );
            
            haptic.notification('success');
            showSnackbar(t('paymentCreated', { amount: amount }), 'success');
            
            // Start checking status
            startTonPaymentCheck(payment.payment_comment);
        }
    } catch (error) {
        console.error('TON payment error:', error);
        haptic.notification('error');
        showSnackbar(error.message, 'error');
    }
}

// Process Stars payment from top-up modal
async function processTopupStarsPayment() {
    const amount = parseInt(document.getElementById('topup-amount').value) || 0;
    
    if (amount < 1) {
        showSnackbar('Минимум 1 Star', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/payments/create-invoice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Init-Data': initData
            },
            body: JSON.stringify({
                stars_amount: amount,
                payment_type: 'stars'
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create invoice');
        }
        
        const data = await response.json();
        
        if (data.invoice_url) {
            hideTopupModal();
            const invoiceUrl = data.invoice_url.startsWith('http') ? data.invoice_url : `https://t.me/${data.invoice_url}`;
            if (tg && typeof tg.openInvoice === 'function') {
                tg.openInvoice(invoiceUrl, (status) => {
                    if (status === 'paid') {
                        haptic.notification('success');
                        celebrateConfetti();
                        showSnackbar(t('paymentSuccess'), 'success');
                        setTimeout(() => {
                            loadLeaderboard(currentTab);
                            init();
                        }, 1000);
                    }
                });
            }
        }
    } catch (error) {
        console.error('Stars payment error:', error);
        haptic.notification('error');
        showSnackbar(error.message, 'error');
    }
}

// Legacy: Show donate modal (keep for backwards compatibility)
function showDonateModal() {
    showTopupModal();
}

// Legacy: Hide donate modal
function hideDonateModal() {
    hideTopupModal();
    // Reset selection
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.getElementById('custom-stars').value = '';
    document.getElementById('create-invoice-btn').disabled = true;
    selectedAmount = null;
    selectedPresetId = null;
    selectedPaymentMethod = 'stars';
    // Reset payment method UI
    selectPaymentMethod('stars');
}

// Select payment method (only Stars available without crypto provider)
function selectPaymentMethod(method) {
    // Only Stars is available
    selectedPaymentMethod = 'stars';
}

// Open user profile modal
function openUserProfile(tgId, rank) {
    haptic.impact('light');
    
    const user = leaderboardData[tgId];
    if (!user) return;
    
    const modal = document.getElementById('user-profile-modal');
    const backdrop = document.getElementById('user-profile-backdrop');
    
    // Set avatar
    const avatarEl = document.getElementById('user-profile-avatar');
    if (user.photo_url) {
        avatarEl.innerHTML = `<img src="${user.photo_url}" alt="">`;
    } else {
        const initial = (user.first_name || user.username || 'U')[0].toUpperCase();
        avatarEl.innerHTML = `<span>${initial}</span>`;
    }
    
    // Set name (prefer display_name if set)
    const nameEl = document.getElementById('user-profile-name');
    nameEl.textContent = user.display_name || user.first_name || user.username || 'User';
    
    // Set username
    const usernameEl = document.getElementById('user-profile-username');
    usernameEl.textContent = user.username ? `@${user.username}` : '';
    usernameEl.style.display = user.username ? 'block' : 'none';
    
    // Set stats
    document.getElementById('user-profile-tons').textContent = user._displayTons || user.tons_total || 0;
    document.getElementById('user-profile-rank').textContent = `#${rank}`;
    
    // Set custom title and description
    const customTextEl = document.getElementById('user-profile-custom-text');
    let profileText = '';
    if (user.custom_title) {
        profileText += `<strong>${escapeHtml(user.custom_title)}</strong>`;
    }
    if (user.custom_text) {
        if (profileText) profileText += '<br>';
        profileText += escapeHtml(user.custom_text);
    }
    if (profileText) {
        customTextEl.innerHTML = profileText;
        customTextEl.style.display = 'block';
    } else {
        customTextEl.innerHTML = '';
        customTextEl.style.display = 'none';
    }
    
    // Set custom link
    const linkEl = document.getElementById('user-profile-link');
    const linkTextEl = document.getElementById('user-profile-link-text');
    if (user.custom_link && linkEl && linkTextEl) {
        // Format display URL (remove protocol, truncate if needed)
        let displayUrl = user.custom_link.replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (displayUrl.length > 40) {
            displayUrl = displayUrl.substring(0, 37) + '...';
        }
        linkTextEl.textContent = displayUrl;
        linkEl.style.display = 'flex';
        linkEl.onclick = (e) => {
            e.preventDefault();
            haptic.impact('light');
            if (tg && tg.openLink) {
                tg.openLink(user.custom_link);
            } else {
                window.open(user.custom_link, '_blank');
            }
        };
    } else if (linkEl) {
        linkEl.style.display = 'none';
    }
    
    // "Take their place" button: only for other users, suggests deposit +1 charts
    const takePlaceBtn = document.getElementById('take-place-btn');
    const takePlaceHint = document.getElementById('take-place-hint');
    const theirCharts = user._displayTons ?? user.tons_total ?? 0;
    const targetCharts = Math.floor(theirCharts) + 1;
    const isOwnProfile = userData && String(user.tg_id) === String(userData.tg_id);
    if (takePlaceBtn && takePlaceHint) {
        if (!isOwnProfile && targetCharts >= 1) {
            takePlaceBtn.style.display = 'flex';
            takePlaceHint.textContent = t('takeTheirPlaceHint') + ' (' + targetCharts + ')';
            takePlaceBtn.onclick = () => {
                haptic.impact('light');
                hideUserProfileModal();
                const balance = userData?.balance_charts || 0;
                if (balance >= targetCharts) {
                    showActivateModal(targetCharts);
                } else {
                    showTopupModal(targetCharts);
                }
            };
        } else {
            takePlaceBtn.style.display = 'none';
        }
    }
    
    // Show modal
    modal.classList.add('active');
    backdrop.classList.add('active');
    
    tg.BackButton.show();
    tg.BackButton.onClick(hideUserProfileModal);
}

// Linkify for profile (makes links look nicer with button style)
function linkifyProfile(text) {
    if (!text) return '';
    
    const escaped = escapeHtml(text);
    const urlPattern = /(https?:\/\/[^\s<]+)/g;
    
    // Split text by URLs
    const parts = escaped.split(urlPattern);
    const urls = escaped.match(urlPattern) || [];
    
    let result = '';
    let urlIndex = 0;
    
    parts.forEach((part, i) => {
        if (urlPattern.test(part)) {
            // This is a URL
            const url = urls[urlIndex] || part;
            const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
            const shortUrl = displayUrl.length > 35 ? displayUrl.substring(0, 32) + '...' : displayUrl;
            result += `<a href="${url}" onclick="event.preventDefault(); haptic.impact('light'); Telegram.WebApp.openLink('${url}');">🔗 ${shortUrl}</a>`;
            urlIndex++;
        } else if (part.trim()) {
            // Regular text
            result += `<p style="margin: 0 0 8px 0;">${part}</p>`;
        }
    });
    
    return result;
}

// Hide user profile modal
function hideUserProfileModal() {
    const modal = document.getElementById('user-profile-modal');
    const backdrop = document.getElementById('user-profile-backdrop');
    
    modal.classList.remove('active');
    backdrop.classList.remove('active');
    tg.BackButton.hide();
}

// Edit Display Name Modal
function showEditNameModal() {
    console.log('showEditNameModal called');
    const modal = document.getElementById('edit-name-modal');
    const backdrop = document.getElementById('edit-name-backdrop');
    const input = document.getElementById('edit-name-input');
    
    console.log('Modal:', modal, 'Backdrop:', backdrop, 'Input:', input);
    
    if (!modal || !backdrop || !input) {
        console.error('Edit name modal elements not found!');
        return;
    }
    
    // Pre-fill with current display name or original name
    if (userData) {
        input.value = userData.display_name || userData.username || userData.first_name || '';
    }
    
    modal.classList.add('active');
    backdrop.classList.add('active');
    input.focus();
    console.log('Modal should be visible now');
}

function hideEditNameModal() {
    const modal = document.getElementById('edit-name-modal');
    const backdrop = document.getElementById('edit-name-backdrop');
    
    modal.classList.remove('active');
    backdrop.classList.remove('active');
}

async function saveDisplayName() {
    const input = document.getElementById('edit-name-input');
    const displayName = input.value.trim();
    
    try {
        const response = await fetch(`${API_BASE_URL}/me/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Init-Data': initData
            },
            body: JSON.stringify({
                display_name: displayName || null  // Send null to clear
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save');
        }
        
        const result = await response.json();
        
        // Update local userData
        userData.display_name = result.display_name;
        
        // Update profile display
        updateProfileNameDisplay();
        
        hideEditNameModal();
        haptic.notification('success');
        showSnackbar(t('profileSaved'), 'success');
        
    } catch (error) {
        console.error('Error saving display name:', error);
        haptic.notification('error');
        showSnackbar(t('profileError'), 'error');
    }
}

// Activate Charts Modal (optional: suggestedAmount = pre-fill amount, e.g. for "take their place")
function showActivateModal(suggestedAmount) {
    const modal = document.getElementById('activate-modal');
    const backdrop = document.getElementById('activate-backdrop');
    const input = document.getElementById('activate-amount');
    const availableEl = document.getElementById('activate-available');
    
    const balance = userData?.balance_charts || 0;
    availableEl.textContent = balance;
    const maxVal = Math.floor(balance);
    input.max = maxVal;
    if (typeof suggestedAmount === 'number' && suggestedAmount > 0 && suggestedAmount <= maxVal) {
        input.value = suggestedAmount;
    } else {
        input.value = '';
    }
    
    modal.classList.add('active');
    backdrop.classList.add('active');
    input.focus();
}

function hideActivateModal() {
    const modal = document.getElementById('activate-modal');
    const backdrop = document.getElementById('activate-backdrop');
    
    modal.classList.remove('active');
    backdrop.classList.remove('active');
}

async function activateCharts() {
    const input = document.getElementById('activate-amount');
    const raw = String(input.value || '').trim().replace(',', '.');
    const amount = parseFloat(raw, 10);
    
    if (!Number.isFinite(amount) || amount <= 0) {
        showSnackbar(t('enterAmount'), 'error');
        return;
    }
    
    const amountNum = Math.floor(amount);
    if (amountNum <= 0) {
        showSnackbar(t('enterAmount'), 'error');
        return;
    }
    
    const balance = userData?.balance_charts || 0;
    if (amountNum > balance) {
        showSnackbar(t('insufficientBalance'), 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/me/activate-charts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Init-Data': initData
            },
            body: JSON.stringify({ amount: amountNum })
        });
        
        if (!response.ok) {
            const text = await response.text();
            let data = {};
            try {
                data = text ? JSON.parse(text) : {};
            } catch (_) {}
            let msg = data.detail;
            if (Array.isArray(msg) && msg[0] && msg[0].msg) msg = msg[0].msg;
            else if (typeof msg !== 'string') msg = t('activationError');
            if (msg === 'Insufficient balance') msg = t('insufficientBalance');
            if (msg === 'Amount must be positive' || (typeof msg === 'string' && msg.toLowerCase().includes('amount'))) msg = t('enterAmount');
            if (msg === 'User not found' || msg === 'Invalid initData') msg = t('activationError');
            if (typeof msg === 'string' && msg.includes('did not match the expected pattern')) msg = t('enterAmount');
            throw new Error(msg);
        }

        const result = await response.json();
        
        // Update local userData
        userData.balance_charts = result.new_balance;
        userData.tons_all_time = (userData.tons_all_time || 0) + amountNum;
        
        // Update UI - Profile section
        const profileBalanceEl = document.getElementById('profile-balance');
        if (profileBalanceEl) {
            profileBalanceEl.textContent = result.new_balance;
        }
        const profileTonsEl = document.getElementById('profile-tons');
        if (profileTonsEl) {
            profileTonsEl.textContent = userData.tons_all_time;
        }
        
        // Update balance bar
        updateBalanceBar();
        
        // Disable button if no balance left
        const activateBtn = document.getElementById('activate-charts-btn');
        if (activateBtn) {
            activateBtn.disabled = result.new_balance <= 0;
        }
        
        hideActivateModal();
        haptic.notification('success');
        celebrateConfetti(); // 🎉 Confetti!
        showSnackbar(t('chartsActivated', { amount: amountNum }), 'success');
        
        // Reload leaderboard and collected bar if on leaderboard tab
        if (currentTab !== 'profile') {
            loadLeaderboard(currentTab);
            loadCollectedFunds();
        }
        
    } catch (error) {
        console.error('Error activating charts:', error);
        haptic.notification('error');
        showSnackbar(error.message || t('activationError'), 'error');
    }
}

function updateProfileNameDisplay() {
    const nameEl = document.getElementById('profile-name');
    const originalNameEl = document.getElementById('profile-original-name');
    
    if (!userData) return;
    
    const displayName = userData.display_name;
    const originalName = userData.username ? `@${userData.username}` : userData.first_name;
    
    if (displayName) {
        // Show custom name, with original below
        nameEl.textContent = displayName;
        if (originalNameEl) {
            originalNameEl.textContent = originalName;
            originalNameEl.style.display = 'block';
        }
    } else {
        // Show original name only
        nameEl.textContent = userData.username || userData.first_name || 'User';
        if (originalNameEl) {
            originalNameEl.style.display = 'none';
        }
    }
}

let selectedAmount = null;
let selectedPresetId = null;
let selectedPaymentMethod = 'stars';
let currentTonPayment = null;
let tonPaymentCheckInterval = null;
let tonConfig = null;

// Initialize TON payment config
async function loadTonConfig() {
    try {
        const response = await fetch(`${API_BASE_URL}/ton/config`);
        if (response.ok) {
            tonConfig = await response.json();
            console.log('TON config loaded:', tonConfig);
            loadCollectedFunds();
        }
    } catch (error) {
        console.log('TON payments not available:', error);
    }
}

// Select payment method (stars or ton)
function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    
    // Update UI
    document.querySelectorAll('.payment-method-selector .payment-method').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.method === method);
    });
    
    const starsSection = document.querySelector('.presets');
    const customStarsSection = document.querySelector('.custom-amount');
    const tonSection = document.getElementById('ton-amount-section');
    const tonPaymentInfo = document.getElementById('ton-payment-info');
    const createBtn = document.getElementById('create-invoice-btn');
    
    if (method === 'ton') {
        // Hide stars, show TON
        if (starsSection) starsSection.style.display = 'none';
        if (customStarsSection) customStarsSection.style.display = 'none';
        if (tonSection) tonSection.style.display = 'block';
        if (createBtn) createBtn.textContent = t('createTonPayment');
        updateTonPreview();
    } else {
        // Show stars, hide TON
        if (starsSection) starsSection.style.display = 'grid';
        if (customStarsSection) customStarsSection.style.display = 'block';
        if (tonSection) tonSection.style.display = 'none';
        if (tonPaymentInfo) tonPaymentInfo.style.display = 'none';
        if (createBtn) createBtn.textContent = t('createPayment');
    }
    
    // Reset state
    currentTonPayment = null;
    if (tonPaymentCheckInterval) {
        clearInterval(tonPaymentCheckInterval);
        tonPaymentCheckInterval = null;
    }
}

// Update TON preview (charts amount)
function updateTonPreview() {
    const tonInput = document.getElementById('ton-amount');
    const previewEl = document.getElementById('ton-charts-preview');
    const createBtn = document.getElementById('create-invoice-btn');
    
    if (!tonInput || !previewEl) return;
    
    const tonAmount = parseFloat(tonInput.value) || 0;
    const rate = tonConfig?.charts_per_ton || 100;
    const charts = Math.floor(tonAmount * rate);
    
    previewEl.textContent = charts;
    
    if (createBtn) {
        createBtn.disabled = tonAmount < 0.1;
    }
}

// Create TON payment
async function createTonPayment() {
    const tonInput = document.getElementById('ton-amount');
    const rawTon = String(tonInput.value || '').trim().replace(',', '.');
    const tonAmount = parseFloat(rawTon) || 0;
    
    if (tonAmount < 0.1) {
        showSnackbar(t('minTonAmount'), 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/ton/create-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Init-Data': initData
            },
            body: JSON.stringify({ amount_ton: tonAmount })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create payment');
        }
        
        const payment = await response.json();
        currentTonPayment = payment;
        
        // Show payment info
        showTonPaymentInfo(payment);
        
        // Start checking payment status
        startTonPaymentCheck(payment.payment_comment);
        
    } catch (error) {
        console.error('Error creating TON payment:', error);
        haptic.notification('error');
        showSnackbar(error.message, 'error');
    }
}

// Show TON payment info
function showTonPaymentInfo(payment) {
    const createBtn = document.getElementById('create-invoice-btn');
    const tonPaymentInfo = document.getElementById('ton-payment-info');
    const walletDisplay = document.getElementById('ton-wallet-display');
    const commentDisplay = document.getElementById('ton-comment-display');
    const paymentLink = document.getElementById('ton-payment-link');
    const timerEl = document.getElementById('ton-timer');
    
    if (createBtn) createBtn.style.display = 'none';
    if (tonPaymentInfo) tonPaymentInfo.style.display = 'block';
    
    if (walletDisplay) {
        walletDisplay.textContent = payment.to_wallet;
    }
    
    if (commentDisplay) {
        commentDisplay.innerHTML = `${t('paymentComment')}: <strong>${payment.payment_comment}</strong>`;
    }
    
    if (paymentLink) {
        paymentLink.href = payment.payment_link;
    }
    
    // Start countdown timer
    if (timerEl) {
        updateTonTimer(payment.expires_at, timerEl);
    }
}

// Update TON payment timer
function updateTonTimer(expiresAt, timerEl) {
    const update = () => {
        const now = new Date();
        const expires = new Date(expiresAt);
        const diff = expires - now;
        
        if (diff <= 0) {
            timerEl.textContent = t('paymentExpired');
            if (tonPaymentCheckInterval) {
                clearInterval(tonPaymentCheckInterval);
            }
            return;
        }
        
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        timerEl.textContent = t('expiresIn', { time: `${minutes}:${seconds.toString().padStart(2, '0')}` });
    };
    
    update();
    setInterval(update, 1000);
}

// Start checking TON payment status
function startTonPaymentCheck(comment) {
    if (tonPaymentCheckInterval) {
        clearInterval(tonPaymentCheckInterval);
    }
    
    tonPaymentCheckInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/ton/payment/${comment}`, {
                headers: { 'X-Init-Data': initData }
            });
            
            if (!response.ok) return;
            
            const payment = await response.json();
            
            if (payment.status === 'completed') {
                clearInterval(tonPaymentCheckInterval);
                tonPaymentCheckInterval = null;
                
                // Success!
                haptic.notification('success');
                celebrateConfetti();
                
                // Update status UI
                const statusEl = document.getElementById('ton-status');
                if (statusEl) {
                    statusEl.classList.add('completed');
                    statusEl.innerHTML = `<span class="status-icon">✅</span><span class="status-text">${t('paymentReceived')}</span>`;
                }
                
                showSnackbar(t('tonPaymentSuccess', { charts: payment.charts_amount }), 'success');
                
                // Reload data
                setTimeout(() => {
                    hideDonateModal();
                    loadLeaderboard(currentTab);
                    init();
                }, 1500);
            } else if (payment.status === 'expired') {
                clearInterval(tonPaymentCheckInterval);
                tonPaymentCheckInterval = null;
                
                const statusEl = document.getElementById('ton-status');
                if (statusEl) {
                    statusEl.innerHTML = `<span class="status-icon">⏰</span><span class="status-text">${t('paymentExpired')}</span>`;
                }
            }
        } catch (error) {
            console.error('Error checking payment:', error);
        }
    }, 5000); // Check every 5 seconds
}

// Copy TON address to clipboard
function copyTonAddress() {
    if (!currentTonPayment) return;
    
    const text = `${currentTonPayment.to_wallet}\n${t('comment')}: ${currentTonPayment.payment_comment}`;
    
    navigator.clipboard.writeText(text).then(() => {
        haptic.notification('success');
        showSnackbar(t('addressCopied'), 'success');
    }).catch(err => {
        console.error('Copy error:', err);
    });
}

// Select preset
function selectPreset(presetId, buttonElement) {
    selectedPresetId = presetId;
    selectedAmount = presetAmounts[presetId];
    
    // Remove selected class from all buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Add selected class to clicked button
    if (buttonElement) {
        buttonElement.classList.add('selected');
    }
    
    document.getElementById('custom-stars').value = '';
    document.getElementById('create-invoice-btn').disabled = false;
}

// Select custom amount
function selectCustomAmount(amount) {
    selectedPresetId = null;
    selectedAmount = amount;
    
    // Remove selected class from all preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    document.getElementById('create-invoice-btn').disabled = false;
}

// Create invoice (or TON payment)
async function createInvoice() {
    // Handle TON payment
    if (selectedPaymentMethod === 'ton') {
        return createTonPayment();
    }
    
    if (!selectedAmount) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/payments/create-invoice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Init-Data': initData
            },
            body: JSON.stringify({
                stars_amount: selectedAmount,
                preset_id: selectedPresetId,
                payment_type: 'stars',  // Only Stars available
                crypto_currency: null
            })
        });
        
        let data;
        try {
            data = await response.json();
        } catch (e) {
            // If response is not JSON, try to get text
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        if (!response.ok) {
            const errorMsg = data.detail || data.error || data.message || `HTTP ${response.status}: ${response.statusText}`;
            console.error('Invoice creation failed:', errorMsg, data);
            
            // Check if it's a crypto payment provider error
            haptic.notification('error'); // Error vibration
            if (errorMsg.includes('CRYPTO_PROVIDER_TOKEN') || errorMsg.includes('payment provider')) {
                showSnackbar(t('cryptoProviderError'), 'error');
            } else {
                showSnackbar(t('paymentErrorMsg', { error: errorMsg }), 'error');
            }
            hideDonateModal();
            return;
        }
        
        // Check for errors in response
        if (data.error || !data.invoice_url) {
            const errorMsg = data.error || data.detail || data.message || 'Unknown error';
            console.error('Invoice creation error in response:', errorMsg, data);
            
            // Check if it's a crypto payment provider error
            haptic.notification('error'); // Error vibration
            if (errorMsg.includes('CRYPTO_PROVIDER_TOKEN') || errorMsg.includes('payment provider')) {
                showSnackbar(t('cryptoProviderError'), 'error');
            } else {
                showSnackbar(t('paymentErrorMsg', { error: errorMsg }), 'error');
            }
            hideDonateModal();
            return;
        }
        
        // Open Telegram Stars invoice
        if (data.invoice_url) {
            console.log('Opening invoice URL:', data.invoice_url);
            // openInvoice() requires the full URL (https://t.me/invoice/...)
            const invoiceUrl = data.invoice_url.startsWith('http') ? data.invoice_url : `https://t.me/${data.invoice_url}`;
            hideDonateModal();
            if (tg && typeof tg.openInvoice === 'function') {
                try {
                    tg.openInvoice(invoiceUrl, (status) => {
                        console.log('Invoice payment status:', status);
                        if (status === 'paid') {
                            haptic.notification('success'); // Success vibration
                            celebrateConfetti(); // 🎉 Confetti!
                            showSnackbar(t('paymentSuccess'), 'success');
                            // Reload leaderboard to show updated stats
                            setTimeout(() => {
                                loadLeaderboard(currentTab);
                                // Reload user data
                                init();
                            }, 1000);
                        } else if (status === 'failed') {
                            haptic.notification('error'); // Error vibration
                            showSnackbar(t('paymentFailed'), 'error');
                        } else if (status === 'cancelled') {
                            haptic.impact('light'); // Light vibration on cancel
                            console.log('Payment cancelled by user');
                        } else {
                            console.log('Unknown payment status:', status);
                        }
                    });
                } catch (err) {
                    console.error('openInvoice error:', err);
                    // Fallback: open URL directly
                    if (typeof tg.openTelegramLink === 'function') {
                        tg.openTelegramLink(data.invoice_url);
                    } else if (typeof tg.openLink === 'function') {
                        tg.openLink(data.invoice_url);
                    }
                }
            } else if (tg && typeof tg.openTelegramLink === 'function') {
                // Fallback: open invoice URL via Telegram
                console.log('Using openTelegramLink fallback');
                tg.openTelegramLink(data.invoice_url);
            } else if (tg && typeof tg.openLink === 'function') {
                // Fallback: open invoice URL directly
                console.log('Using openLink fallback');
                tg.openLink(data.invoice_url);
            } else {
                // Last resort: show popup with link
                tg.showPopup({
                    title: currentLanguage === 'ru' ? 'Оплата' : 'Payment',
                    message: `${currentLanguage === 'ru' ? 'Откройте ссылку для оплаты' : 'Open link to pay'}:\n${data.invoice_url}`,
                    buttons: [{ type: 'ok' }]
                });
            }
            return; // Exit early, modal already hidden
        } else {
            // Invoice creation failed
            console.error('No invoice_url in response:', data);
            showSnackbar(t('paymentError'), 'error');
        }
        
        hideDonateModal();
    } catch (error) {
        console.error('Create invoice error:', error);
        showError(t('paymentError'));
    }
}

// Share referral link
function shareReferralLink() {
    console.log('shareReferralLink called', { userData, settings, tg });
    
    if (!userData || !userData.tg_id) {
        console.error('No userData or tg_id', userData);
        showError(t('userDataError'));
        return;
    }
    
    // Get bot username from settings or userData
    const botUsername = userData.bot_username || settings.telegram_bot_username || 'leaderboardtestbot';
    
    // Create Telegram deep link: https://t.me/bot?start=ref_<tg_id>
    const telegramLink = `https://t.me/${botUsername}?start=ref_${userData.tg_id}`;
    const shareText = t('shareText', { link: telegramLink });
    const refParam = `ref_${userData.tg_id}`;
    
    console.log('Sharing link:', telegramLink, 'Bot username:', botUsername);
    
    // Try different methods to share - prioritize methods that open chat selector
    try {
        // Method 1: Use switchInlineQuery - opens chat selector modal (BEST for "invite friend")
        if (tg && typeof tg.switchInlineQuery === 'function') {
            console.log('Using tg.switchInlineQuery');
            // switchInlineQuery(query, choose_chat_types) opens chat selector
            // Empty array for choose_chat_types means all chat types
            tg.switchInlineQuery(shareText, ['users', 'bots', 'groups', 'channels']);
            return;
        }
        
        // Method 2: Use shareUrl if available (opens native share dialog)
        if (tg && typeof tg.shareUrl === 'function') {
            console.log('Using tg.shareUrl');
            tg.shareUrl(telegramLink, shareText);
            return;
        }
        
        // Method 3: Use sendData to trigger bot inline mode
        // This creates a "share" URL that opens chat selector
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(telegramLink)}&text=${encodeURIComponent(t('shareText', { link: '' }))}`;
        
        if (tg && typeof tg.openTelegramLink === 'function') {
            console.log('Using tg.openTelegramLink with share URL');
            tg.openTelegramLink(shareUrl);
            return;
        }
        
        // Method 4: Use openLink as fallback
        if (tg && typeof tg.openLink === 'function') {
            console.log('Using tg.openLink');
            tg.openLink(shareUrl);
            return;
        }
        
        // Method 5: Copy to clipboard and show alert
        if (navigator.clipboard && navigator.clipboard.writeText) {
            console.log('Using clipboard');
            navigator.clipboard.writeText(shareText).then(() => {
                haptic.notification('success'); // Success vibration
                showSnackbar(t('linkCopied'), 'success');
            }).catch((err) => {
                console.error('Clipboard error:', err);
                haptic.notification('warning'); // Warning vibration
                showSnackbar(t('shareLink', { link: telegramLink }));
            });
            return;
        }
        
        // Method 6: Just show the link
        console.log('Showing alert with link');
        showSnackbar(t('shareLink', { link: telegramLink }));
    } catch (error) {
        console.error('Error sharing referral link:', error);
        showSnackbar(t('shareLink', { link: telegramLink }));
    }
}

// Show error (uses snackbar)
function showError(message) {
    showSnackbar(message, 'error');
}

// Format number with thousands separator
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return Math.floor(num).toLocaleString('ru-RU');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Convert URLs in text to clickable links (with XSS protection)
function linkify(text) {
    if (!text) return '';
    
    // First escape HTML to prevent XSS
    const escaped = escapeHtml(text);
    
    // URL regex pattern
    const urlPattern = /(https?:\/\/[^\s<]+)/g;
    
    // Replace URLs with clickable links
    return escaped.replace(urlPattern, (url) => {
        // Truncate display URL if too long
        const displayUrl = url.length > 30 ? url.substring(0, 27) + '...' : url;
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation(); if(window.Telegram && Telegram.WebApp) { Telegram.WebApp.openLink('${url}'); return false; }">${displayUrl}</a>`;
    });
}

// Update language selector active state and labels (profile)
function updateLanguageSelectorState() {
    const lang = getLanguage();
    const labelEl = document.querySelector('.profile-language-label');
    if (labelEl) labelEl.textContent = t('languageLabel');
    document.querySelectorAll('.profile-lang-btn').forEach(btn => {
        const isRu = btn.getAttribute('data-lang') === 'ru';
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
        btn.textContent = t(isRu ? 'languageRu' : 'languageEn');
    });
}

// Load profile data
async function loadProfile() {
    updateLanguageSelectorState();
    // Fetch fresh user data from backend
    try {
        const response = await fetch(`${API_BASE_URL}/me`, {
            headers: {
                'X-Init-Data': initData
            }
        });
        
        if (response.ok) {
            userData = await response.json();
        }
    } catch (error) {
        console.error('Failed to refresh user data:', error);
    }
    
    const customTitleInput = document.getElementById('custom-title');
    const customTextInput = document.getElementById('custom-text');
    const customLinkInput = document.getElementById('custom-link');
    const titleCharCountSpan = document.getElementById('title-char-count');
    const textCharCountSpan = document.getElementById('text-char-count');
    
    // Load custom title
    if (customTitleInput && userData) {
        customTitleInput.value = userData.custom_title || '';
        if (titleCharCountSpan) {
            titleCharCountSpan.textContent = (userData.custom_title || '').length;
        }
    }
    
    // Load custom text (description)
    if (customTextInput && userData) {
        customTextInput.value = userData.custom_text || '';
        if (textCharCountSpan) {
            textCharCountSpan.textContent = (userData.custom_text || '').length;
        }
    }
    
    // Load custom link
    if (customLinkInput && userData) {
        customLinkInput.value = userData.custom_link || '';
    }
    
    // Update profile user info
    if (userData) {
        // Avatar
        const avatarEl = document.getElementById('profile-avatar');
        if (avatarEl) {
            if (userData.photo_url) {
                avatarEl.innerHTML = `<img src="${userData.photo_url}" alt="">`;
            } else {
                const initial = (userData.first_name || userData.username || 'U')[0].toUpperCase();
                avatarEl.innerHTML = `<span>${initial}</span>`;
            }
        }
        
        // Name (with display_name support)
        updateProfileNameDisplay();
        
        // Stats - Charts in leaderboard
        const tonsEl = document.getElementById('profile-tons');
        if (tonsEl) {
            tonsEl.textContent = userData.tons_all_time || 0;
        }
        
        // Stats - Referrals
        const refsEl = document.getElementById('profile-refs');
        if (refsEl) {
            refsEl.textContent = userData.referrals_count || 0;
        }
        
        // Balance
        const balanceEl = document.getElementById('profile-balance');
        if (balanceEl) {
            const balance = userData.balance_charts || 0;
            balanceEl.textContent = balance;
            
            // Disable activate button if no balance
            const activateBtn = document.getElementById('activate-charts-btn');
            if (activateBtn) {
                activateBtn.disabled = balance <= 0;
            }
        }
        
        // Rank badge
        const rankBadge = document.getElementById('profile-rank-badge');
        const rankIcon = document.getElementById('profile-rank-icon');
        if (rankBadge && rankIcon) {
            const rank = userData.rank_all_time;
            if (rank && rank > 0) {
                if (rank === 1) {
                    rankIcon.textContent = '🥇';
                    rankBadge.className = 'profile-rank-badge gold';
                } else if (rank === 2) {
                    rankIcon.textContent = '🥈';
                    rankBadge.className = 'profile-rank-badge silver';
                } else if (rank === 3) {
                    rankIcon.textContent = '🥉';
                    rankBadge.className = 'profile-rank-badge bronze';
                } else {
                    rankIcon.textContent = `#${rank}`;
                    rankBadge.className = 'profile-rank-badge';
                }
            } else {
                rankIcon.textContent = '—';
                rankBadge.className = 'profile-rank-badge';
            }
        }
    }
}

// Save profile (title, description, and link)
async function saveProfile() {
    const customTitleInput = document.getElementById('custom-title');
    const customTextInput = document.getElementById('custom-text');
    const customLinkInput = document.getElementById('custom-link');
    
    const customTitle = customTitleInput ? customTitleInput.value.trim() : '';
    const customText = customTextInput ? customTextInput.value.trim() : '';
    const customLink = customLinkInput ? customLinkInput.value.trim() : '';
    
    // Validate link
    if (customLink && !customLink.startsWith('http://') && !customLink.startsWith('https://')) {
        haptic.notification('error');
        showSnackbar(t('invalidLink'), 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/me/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Init-Data': initData
            },
            body: JSON.stringify({
                custom_title: customTitle || null,
                custom_text: customText || null,
                custom_link: customLink || null
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to save');
        }
        
        const data = await response.json();
        
        // Update local userData
        if (userData) {
            userData.custom_title = data.custom_title;
            userData.custom_text = data.custom_text;
            userData.custom_link = data.custom_link;
        }
        
        haptic.notification('success'); // Success vibration
        showSnackbar(t('profileSaved'), 'success');
        
        // Reload current leaderboard to show updated data
        loadLeaderboard(currentTab);
    } catch (error) {
        console.error('Error saving profile:', error);
        haptic.notification('error'); // Error vibration
        showSnackbar(t('profileError'), 'error');
    }
}

// Week countdown timer
let countdownInterval = null;

function startWeekCountdown() {
    updateCountdown();
    // Update every second
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    countdownInterval = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    // Get next Monday 00:00:00 (Europe/Berlin timezone, but we'll approximate with local)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate days until next Monday
    let daysUntilMonday = (8 - dayOfWeek) % 7;
    if (daysUntilMonday === 0) daysUntilMonday = 7; // If today is Monday, next week
    
    // Create next Monday date at 00:00:00
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);
    
    // Calculate difference
    const diff = nextMonday - now;
    
    if (diff <= 0) {
        // Week just reset, recalculate
        setTimeout(updateCountdown, 1000);
        return;
    }
    
    // Convert to days, hours, minutes, seconds
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    // Update DOM
    const daysEl = document.getElementById('countdown-days');
    const hoursEl = document.getElementById('countdown-hours');
    const minutesEl = document.getElementById('countdown-minutes');
    const secondsEl = document.getElementById('countdown-seconds');
    
    if (daysEl) daysEl.textContent = days;
    if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
    if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
    if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    init();
    startWeekCountdown();
});

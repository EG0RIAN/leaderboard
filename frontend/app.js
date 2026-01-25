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
        
        // Set language based on user's language_code
        if (userData.language_code) {
            currentLanguage = userData.language_code.startsWith('ru') ? 'ru' : 'en';
        } else {
            currentLanguage = getLanguage();
        }
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
        loadLeaderboard('all-time');
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
    
    // Donate button
    document.getElementById('donate-btn').addEventListener('click', () => {
        haptic.impact('medium'); // Vibration on donate button
        showDonateModal();
    });
    
    // Modal close
    document.getElementById('close-modal').addEventListener('click', () => {
        haptic.impact('light'); // Vibration on close
        hideDonateModal();
    });
    
    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            haptic.impact('light'); // Vibration on preset select
            const presetId = parseInt(btn.dataset.preset);
            selectPreset(presetId, e.currentTarget);
        });
    });
    
    // Custom amount input
    document.getElementById('custom-stars').addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        if (value > 0) {
            selectCustomAmount(value);
        } else {
            document.getElementById('create-invoice-btn').disabled = true;
        }
    });
    
    // Payment method selection (only Stars available without crypto provider)
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
    
    // Crypto currency selection
    const cryptoCurrencySelect = document.getElementById('crypto-currency');
    if (cryptoCurrencySelect) {
        cryptoCurrencySelect.addEventListener('change', (e) => {
            selectedCryptoCurrency = e.target.value;
        });
    }
    
    // Create invoice button
    document.getElementById('create-invoice-btn').addEventListener('click', () => {
        haptic.impact('heavy'); // Strong vibration on payment
        createInvoice();
    });
    
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
    
    // Show/hide donate button (hide on profile tab)
    const donateContainer = document.getElementById('donate-button-container');
    if (donateContainer) {
        donateContainer.style.display = tabName === 'profile' ? 'none' : 'block';
    }
    
    // Load content based on tab
    if (tabName === 'profile') {
        loadProfile();
    } else {
        loadLeaderboard(tabName);
    }
}

// Load leaderboard
async function loadLeaderboard(type) {
    const listElement = document.getElementById(`${type}-list`);
    listElement.innerHTML = `<div class="loading">${t('loading')}</div>`;
    
    try {
        let url = `${API_BASE_URL}/leaderboard/${type}`;
        if (type === 'week') {
            url += '?week_key=';
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
    
    listElement.innerHTML = items.map(item => {
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
            amountText = `${tons} <span class="charts-icon charts-icon-md"></span> (${item.referrals_count} ${t('referralsCount')})`;
        } else if (type === 'week') {
            tons = item.tons_week;
            amountText = `${tons} <span class="charts-icon charts-icon-md"></span>`;
        } else {
            tons = item.tons_total;
            amountText = `${tons} <span class="charts-icon charts-icon-md"></span>`;
        }
        
        // Store tons for profile view
        item._displayTons = tons;
        
        // Rank styling classes
        let rankClass = '';
        const rank = item.rank;
        console.log('Rendering item with rank:', rank);
        if (rank === 1) rankClass = 'top-1';
        else if (rank === 2) rankClass = 'top-2';
        else if (rank === 3) rankClass = 'top-3';
        else if (rank >= 4 && rank <= 10) rankClass = 'rank-4-10';
        else if (rank >= 11 && rank <= 25) rankClass = 'rank-11-25';
        else if (rank >= 26 && rank <= 50) rankClass = 'rank-26-50';
        else if (rank >= 51 && rank <= 100) rankClass = 'rank-51-100';
        else if (rank >= 101 && rank <= 250) rankClass = 'rank-101-250';
        else if (rank >= 251 && rank <= 500) rankClass = 'rank-251-500';
        else if (rank >= 501 && rank <= 1000) rankClass = 'rank-501-1000';
        console.log('Assigned rankClass:', rankClass);
        
        const rankDisplay = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
        
        return `
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
    }).join('');
    
    // Show my position if user is in list
    if (userData) {
        const myItem = items.find(item => item.tg_id === userData.tg_id);
        if (myItem) {
            document.getElementById('my-rank').textContent = myItem.rank;
            document.getElementById('my-position').style.display = 'block';
        } else {
            document.getElementById('my-position').style.display = 'none';
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

// Show donate modal
function showDonateModal() {
    document.getElementById('donate-modal').classList.add('active');
    tg.BackButton.show();
    tg.BackButton.onClick(hideDonateModal);
}

// Hide donate modal
function hideDonateModal() {
    document.getElementById('donate-modal').classList.remove('active');
    if (!document.getElementById('user-profile-modal').classList.contains('active')) {
        tg.BackButton.hide();
    }
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
        const response = await fetch(`${API_BASE_URL}/user/me/profile`, {
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
        tg.showAlert(t('profileSaved'));
        
    } catch (error) {
        console.error('Error saving display name:', error);
        haptic.notification('error');
        tg.showAlert(t('profileError'));
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
let selectedPaymentMethod = 'stars'; // Only 'stars' available (crypto requires provider setup)

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

// Create invoice
async function createInvoice() {
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
                tg.showAlert(t('cryptoProviderError'));
            } else {
                tg.showAlert(t('paymentErrorMsg', { error: errorMsg }));
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
                tg.showAlert(t('cryptoProviderError'));
            } else {
                tg.showAlert(t('paymentErrorMsg', { error: errorMsg }));
            }
            hideDonateModal();
            return;
        }
        
        // Open Telegram Stars invoice
        if (data.invoice_url) {
            console.log('Opening invoice URL:', data.invoice_url);
            
            // For Telegram Stars, the URL format is: https://t.me/$ABC123
            // openInvoice() needs the full URL or just the slug with $
            
            // Extract invoice slug - keep the $ prefix!
            let invoiceSlug = data.invoice_url;
            
            // Extract just the slug part (with $ for Stars invoices)
            if (invoiceSlug.includes('t.me/')) {
                // Get everything after t.me/
                invoiceSlug = invoiceSlug.split('t.me/')[1].split('?')[0];
            }
            
            console.log('Invoice slug for openInvoice:', invoiceSlug);
            
            // Hide modal first
            hideDonateModal();
            
            if (tg && typeof tg.openInvoice === 'function') {
                console.log('Calling tg.openInvoice with:', invoiceSlug);
                try {
                    tg.openInvoice(invoiceSlug, (status) => {
                        console.log('Invoice payment status:', status);
                        if (status === 'paid') {
                            haptic.notification('success'); // Success vibration
                            tg.showAlert(t('paymentSuccess'));
                            // Reload leaderboard to show updated stats
                            setTimeout(() => {
                                loadLeaderboard(currentTab);
                                // Reload user data
                                init();
                            }, 1000);
                        } else if (status === 'failed') {
                            haptic.notification('error'); // Error vibration
                            tg.showAlert(t('paymentFailed'));
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
            tg.showAlert(t('paymentError'));
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
                tg.showAlert(t('linkCopied'));
            }).catch((err) => {
                console.error('Clipboard error:', err);
                haptic.notification('warning'); // Warning vibration
                tg.showAlert(t('shareLink', { link: telegramLink }));
            });
            return;
        }
        
        // Method 6: Just show the link
        console.log('Showing alert with link');
        tg.showAlert(t('shareLink', { link: telegramLink }));
    } catch (error) {
        console.error('Error sharing referral link:', error);
        tg.showAlert(t('shareLink', { link: telegramLink }));
    }
}

// Show error
function showError(message) {
    tg.showAlert(message);
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

// Load profile data
async function loadProfile() {
    // Fetch fresh user data from backend
    try {
        const response = await fetch(`${API_BASE_URL}/user/me`, {
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
        
        // Stats - Diamonds
        const tonsEl = document.getElementById('profile-tons');
        if (tonsEl) {
            tonsEl.textContent = userData.tons_all_time || 0;
        }
        
        // Stats - Referrals
        const refsEl = document.getElementById('profile-refs');
        if (refsEl) {
            refsEl.textContent = userData.referrals_count || 0;
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
        tg.showAlert(t('invalidLink'));
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
        tg.showAlert(t('profileSaved'));
        
        // Reload current leaderboard to show updated data
        loadLeaderboard(currentTab);
    } catch (error) {
        console.error('Error saving profile:', error);
        haptic.notification('error'); // Error vibration
        tg.showAlert(t('profileError'));
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

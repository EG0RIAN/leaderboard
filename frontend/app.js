// Telegram Web App initialization
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

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
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Donate button
    document.getElementById('donate-btn').addEventListener('click', () => {
        showDonateModal();
    });
    
    // Modal close
    document.getElementById('close-modal').addEventListener('click', () => {
        hideDonateModal();
    });
    
    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
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
        createInvoice();
    });
    
    // Share referral button
    const shareBtn = document.getElementById('share-ref-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Share button clicked');
            shareReferralLink();
        });
    } else {
        console.error('Share button not found!');
    }
    
    // Profile: custom text input
    const customTextInput = document.getElementById('custom-text');
    const charCountSpan = document.getElementById('char-count');
    if (customTextInput && charCountSpan) {
        customTextInput.addEventListener('input', (e) => {
            charCountSpan.textContent = e.target.value.length;
        });
    }
    
    // Profile: save custom text button
    const saveCustomTextBtn = document.getElementById('save-custom-text');
    if (saveCustomTextBtn) {
        saveCustomTextBtn.addEventListener('click', () => {
            saveCustomText();
        });
    }
}

// Tab switching
function switchTab(tabName) {
    currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === tabName);
    });
    
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
function renderLeaderboard(type, items) {
    const listElement = document.getElementById(`${type}-list`);
    
    if (items.length === 0) {
        listElement.innerHTML = `<div class="loading">${t('noData')}</div>`;
        return;
    }
    
    listElement.innerHTML = items.map(item => {
        const avatar = item.photo_url 
            ? `<img src="${item.photo_url}" alt="">`
            : `<span>${(item.first_name || item.username || 'U')[0].toUpperCase()}</span>`;
        
        const displayName = item.username || item.first_name || (currentLanguage === 'ru' ? 'Пользователь' : 'User');
        
        // Custom text (if set) - with clickable links and marquee for long text
        const customTextHtml = item.custom_text 
            ? `<div class="user-custom-text"><span class="user-custom-text-inner">${linkify(item.custom_text)}</span></div>` 
            : '';
        
        let amountText = '';
        if (type === 'referrals') {
            amountText = `${item.referrals_tons_total} 💎 (${item.referrals_count} ${t('referralsCount')})`;
        } else if (type === 'week') {
            amountText = `${item.tons_week} 💎`;
        } else {
            amountText = `${item.tons_total} 💎`;
        }
        
        return `
            <div class="leaderboard-item">
                <div class="rank">#${item.rank}</div>
                <div class="avatar">${avatar}</div>
                <div class="user-info">
                    <div class="username">${displayName}</div>
                    ${customTextHtml}
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
    tg.BackButton.hide();
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
                            tg.showAlert(t('paymentSuccess'));
                            // Reload leaderboard to show updated stats
                            setTimeout(() => {
                                loadLeaderboard(currentTab);
                                // Reload user data
                                init();
                            }, 1000);
                        } else if (status === 'failed') {
                            tg.showAlert(t('paymentFailed'));
                        } else if (status === 'cancelled') {
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
                tg.showAlert(t('linkCopied'));
            }).catch((err) => {
                console.error('Clipboard error:', err);
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
function loadProfile() {
    const customTextInput = document.getElementById('custom-text');
    const charCountSpan = document.getElementById('char-count');
    
    if (customTextInput && userData && userData.custom_text) {
        customTextInput.value = userData.custom_text;
        if (charCountSpan) {
            charCountSpan.textContent = userData.custom_text.length;
        }
    }
}

// Save custom text
async function saveCustomText() {
    const customTextInput = document.getElementById('custom-text');
    if (!customTextInput) return;
    
    const customText = customTextInput.value.trim();
    
    try {
        const response = await fetch(`${API_BASE_URL}/me/custom-text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Init-Data': initData
            },
            body: JSON.stringify({
                custom_text: customText || null
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save');
        }
        
        const data = await response.json();
        
        // Update local userData
        if (userData) {
            userData.custom_text = data.custom_text;
        }
        
        tg.showAlert(t('customTextSaved'));
    } catch (error) {
        console.error('Error saving custom text:', error);
        tg.showAlert(t('customTextError'));
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

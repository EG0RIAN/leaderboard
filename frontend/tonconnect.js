// TON Connect Integration

let tonConnectUI = null;
let connectedWallet = null;
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 10;

// Initialize TON Connect
async function initTonConnect() {
    try {
        initAttempts++;
        
        // Log all possible locations of TON Connect
        console.log('Init attempt', initAttempts);
        console.log('window.TON_CONNECT_UI:', typeof window.TON_CONNECT_UI, window.TON_CONNECT_UI);
        console.log('window.TonConnectUI:', typeof window.TonConnectUI, window.TonConnectUI);
        console.log('window.TonConnect:', typeof window.TonConnect, window.TonConnect);
        
        // Try different ways the SDK might be exposed
        let TonConnectUIClass = null;
        
        // Check all possible locations
        if (window.TON_CONNECT_UI && window.TON_CONNECT_UI.TonConnectUI) {
            TonConnectUIClass = window.TON_CONNECT_UI.TonConnectUI;
            console.log('Found via window.TON_CONNECT_UI.TonConnectUI');
        } else if (window.TonConnectUI && typeof window.TonConnectUI === 'function') {
            TonConnectUIClass = window.TonConnectUI;
            console.log('Found via window.TonConnectUI (function)');
        } else if (window.TonConnectUI && window.TonConnectUI.TonConnectUI) {
            TonConnectUIClass = window.TonConnectUI.TonConnectUI;
            console.log('Found via window.TonConnectUI.TonConnectUI');
        } else if (window.TonConnect && window.TonConnect.TonConnectUI) {
            TonConnectUIClass = window.TonConnect.TonConnectUI;
            console.log('Found via window.TonConnect.TonConnectUI');
        } else if (window.TonConnect && typeof window.TonConnect === 'function') {
            TonConnectUIClass = window.TonConnect;
            console.log('Found via window.TonConnect (function)');
        }
        
        if (!TonConnectUIClass) {
            if (initAttempts < MAX_INIT_ATTEMPTS) {
                console.log('TON Connect UI not loaded yet, retrying in 500ms...');
                setTimeout(initTonConnect, 500);
                return;
            } else {
                console.error('TON Connect UI failed to load after', MAX_INIT_ATTEMPTS, 'attempts');
                console.error('Available window properties:', Object.keys(window).filter(k => k.toLowerCase().includes('ton')));
                // Show user-friendly error
                const container = document.getElementById('ton-connect-container');
                if (container) {
                    const btn = container.querySelector('#ton-connect-btn');
                    if (btn) {
                        btn.disabled = true;
                        btn.innerHTML = '<span class="wallet-btn-text">TON Connect недоступен</span>';
                    }
                }
                return;
            }
        }
        
        console.log('TON Connect UI class found, creating instance...');
        
        // Verify manifest is accessible
        const manifestUrl = 'https://v3022889.hosted-by-vdsina.ru/tonconnect-manifest.json';
        try {
            const manifestCheck = await fetch(manifestUrl, { method: 'HEAD' });
            if (!manifestCheck.ok) {
                console.warn('Manifest check failed:', manifestCheck.status);
            }
        } catch (e) {
            console.warn('Manifest check error:', e);
        }
        
        // Initialize TON Connect UI
        tonConnectUI = new TonConnectUIClass({
            manifestUrl: manifestUrl
        });
        
        console.log('TON Connect UI instance created:', tonConnectUI);
        
        // Subscribe to wallet connection changes
        tonConnectUI.onStatusChange((wallet) => {
            if (wallet) {
                console.log('Wallet connected:', wallet);
                connectedWallet = wallet;
                onWalletConnected(wallet);
            } else {
                console.log('Wallet disconnected');
                connectedWallet = null;
                onWalletDisconnected();
            }
        });
        
        // Check if already connected
        const currentWallet = tonConnectUI.wallet;
        if (currentWallet) {
            connectedWallet = currentWallet;
            onWalletConnected(currentWallet);
        }
        
        // Setup button handlers (after a small delay to ensure DOM is ready)
        setTimeout(() => {
            setupWalletButtons();
        }, 100);
        
        console.log('TON Connect fully initialized!');
    } catch (error) {
        console.error('Error initializing TON Connect:', error);
        console.error('Stack:', error.stack);
    }
}

// Setup wallet button handlers - both direct and delegation
let walletButtonsSetup = false;
function setupWalletButtons() {
    if (walletButtonsSetup) {
        console.log('Wallet buttons already set up');
        return;
    }
    walletButtonsSetup = true;
    
    console.log('Setting up wallet buttons...');
    
    // Direct handlers (more reliable)
    const connectBtn = document.getElementById('ton-connect-btn');
    const disconnectBtn = document.getElementById('disconnect-wallet');
    
    if (connectBtn) {
        connectBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Connect button clicked (direct handler)!');
            if (window.haptic) window.haptic.impact('medium');
            await connectWallet();
        });
        console.log('Direct handler added to #ton-connect-btn');
    } else {
        console.warn('#ton-connect-btn not found in DOM');
    }
    
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Disconnect button clicked (direct handler)!');
            if (window.haptic) window.haptic.impact('light');
            await disconnectWallet();
        });
        console.log('Direct handler added to #disconnect-wallet');
    }
    
    // Also use event delegation as fallback
    document.addEventListener('click', async (e) => {
        const connectBtnDel = e.target.closest('#ton-connect-btn');
        const disconnectBtnDel = e.target.closest('#disconnect-wallet');
        
        if (connectBtnDel && connectBtnDel !== connectBtn) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Connect button clicked via delegation!');
            if (window.haptic) window.haptic.impact('medium');
            await connectWallet();
        }
        
        if (disconnectBtnDel && disconnectBtnDel !== disconnectBtn) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Disconnect button clicked via delegation!');
            if (window.haptic) window.haptic.impact('light');
            await disconnectWallet();
        }
    });
    
    console.log('Wallet button handlers set up (direct + delegation)');
}

// Connect wallet
async function connectWallet() {
    console.log('=== connectWallet called ===');
    console.log('tonConnectUI:', tonConnectUI);
    console.log('connectedWallet:', connectedWallet);
    console.log('window.tonConnect:', window.tonConnect);
    
    if (!tonConnectUI) {
        console.error('TON Connect not initialized, attempting to reinitialize...');
        // Try to reinitialize
        initAttempts = 0;
        await startTonConnectInit();
        
        // Wait a bit for initialization
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!tonConnectUI) {
            console.error('TON Connect still not initialized after retry');
            const errorMsg = 'TON Connect не загружен. Обновите страницу.';
            if (window.showSnackbar) {
                window.showSnackbar(errorMsg, 'error');
            } else {
                alert(errorMsg);
            }
            return;
        }
        console.log('TON Connect reinitialized successfully');
    }
    
    try {
        console.log('Checking tonConnectUI methods...');
        console.log('tonConnectUI keys:', Object.keys(tonConnectUI));
        console.log('openModal type:', typeof tonConnectUI.openModal);
        console.log('connectWallet type:', typeof tonConnectUI.connectWallet);
        console.log('open method type:', typeof tonConnectUI.open);
        
        // Try different methods to open connection modal
        if (typeof tonConnectUI.openModal === 'function') {
            console.log('Using openModal() method...');
            await tonConnectUI.openModal();
            console.log('Modal opened successfully via openModal()');
        } else if (typeof tonConnectUI.connectWallet === 'function') {
            console.log('Using connectWallet() method...');
            await tonConnectUI.connectWallet();
            console.log('Wallet connection initiated via connectWallet()');
        } else if (typeof tonConnectUI.open === 'function') {
            console.log('Using open() method...');
            await tonConnectUI.open();
            console.log('Connection opened via open()');
        } else {
            console.error('No connection method found on tonConnectUI');
            console.error('Available methods:', Object.keys(tonConnectUI).filter(k => typeof tonConnectUI[k] === 'function'));
            throw new Error('Метод подключения недоступен. Проверьте консоль.');
        }
    } catch (error) {
        console.error('Error connecting wallet:', error);
        console.error('Error stack:', error.stack);
        const errorMsg = error?.message || String(error);
        if (window.showSnackbar) {
            window.showSnackbar('Ошибка подключения: ' + errorMsg, 'error');
        } else {
            alert('Ошибка подключения: ' + errorMsg);
        }
    }
}

// Disconnect wallet
async function disconnectWallet() {
    if (!tonConnectUI) return;
    
    try {
        await tonConnectUI.disconnect();
    } catch (error) {
        console.error('Error disconnecting wallet:', error);
    }
}

// Handle wallet connected
function onWalletConnected(wallet) {
    const container = document.getElementById('ton-connect-container');
    const walletInfo = document.getElementById('wallet-info');
    const walletAddress = document.getElementById('wallet-address');
    
    if (container) container.style.display = 'none';
    if (walletInfo) walletInfo.style.display = 'flex';
    
    if (walletAddress && wallet.account) {
        // Format address (show first 4 and last 4 characters)
        const address = wallet.account.address;
        const shortAddress = address.slice(0, 6) + '...' + address.slice(-4);
        walletAddress.textContent = shortAddress;
        walletAddress.title = address;
    }
    
    // Save wallet address to backend (optional)
    saveWalletAddress(wallet.account?.address);
}

// Handle wallet disconnected
function onWalletDisconnected() {
    const container = document.getElementById('ton-connect-container');
    const walletInfo = document.getElementById('wallet-info');
    
    if (container) container.style.display = 'block';
    if (walletInfo) walletInfo.style.display = 'none';
}

// Save wallet address to backend
async function saveWalletAddress(address) {
    if (!address || !window.initData) return;
    
    try {
        await fetch(`${window.API_URL || ''}/me/wallet`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Init-Data': window.initData
            },
            body: JSON.stringify({ wallet_address: address })
        });
    } catch (error) {
        console.error('Error saving wallet address:', error);
    }
}

// Get connected wallet
function getConnectedWallet() {
    return connectedWallet;
}

// Check if wallet is connected
function isWalletConnected() {
    return connectedWallet !== null;
}

// Minimal BOC builder for one cell (opcode 0 + comment) — no external deps, works in WebView
function buildCommentBocFallback(comment) {
    if (!comment || typeof comment !== 'string') return null;
    const utf8 = new TextEncoder().encode(comment);
    const len = utf8.length;
    if (len === 0) return null;
    // Body: 32-bit zero (opcode) + string tail (UTF-8, last byte has high bit set)
    const dataLen = 4 + len;
    const data = new Uint8Array(dataLen);
    data[0] = 0;
    data[1] = 0;
    data[2] = 0;
    data[3] = 0;
    for (let i = 0; i < len; i++) data[4 + i] = utf8[i];
    data[4 + len - 1] |= 0x80;
    // BOC (TON spec): magic, flags, size/off_bytes, cells, roots, absent, tot_cells_size, root_list, index, cell_data
    const cellLen = 2 + dataLen;
    const headerLen = 4 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1;
    const boc = new Uint8Array(headerLen + cellLen);
    let o = 0;
    boc[o++] = 0xb5;
    boc[o++] = 0xee;
    boc[o++] = 0x9c;
    boc[o++] = 0x72;
    boc[o++] = 0x10; // has_idx=1, has_crc32c=0, has_cache_bits=0, flags=0
    boc[o++] = 0x21; // size=1 (3b), off_bytes=1 (8b)
    boc[o++] = 0x01; // cells
    boc[o++] = 0x01; // roots
    boc[o++] = 0x00; // absent
    boc[o++] = cellLen & 0xff; // tot_cells_size (1 byte)
    boc[o++] = 0x00; // root_list
    boc[o++] = 0x00; // index
    boc[o++] = 0x00; // refs
    boc[o++] = dataLen; // bits in bytes
    for (let i = 0; i < dataLen; i++) boc[o++] = data[i];
    return btoa(String.fromCharCode.apply(null, boc));
}

// Build TON comment payload (opcode 0 + UTF-8 text) as base64 BOC
async function buildCommentPayload(comment) {
    if (!comment || typeof comment !== 'string') return null;
    try {
        const mod = await import('https://esm.sh/@ton/core@0.58.0');
        const body = mod.beginCell()
            .storeUint(0, 32)
            .storeStringTail(comment)
            .endCell();
        return body.toBoc().toString('base64');
    } catch (e) {
        console.warn('Comment payload via @ton/core failed, using fallback:', e);
        return buildCommentBocFallback(comment);
    }
}

// Send TON transaction via TonConnect
async function sendTransaction(toAddress, amount, comment = '') {
    if (!tonConnectUI || !connectedWallet) {
        throw new Error(isWalletConnected() ? 'Wallet not ready' : 'Подключите кошелёк в разделе Профиль');
    }

    const address = String(toAddress).trim();
    const amountNum = Number(amount);
    if (!isFinite(amountNum) || amountNum < 0.01) {
        throw new Error('Неверная сумма');
    }
    const amountNano = Math.round(amountNum * 1e9).toString();

    let payload = await buildCommentPayload(comment);
    if (comment && !payload) {
        payload = buildCommentBocFallback(comment);
    }
    if (comment && !payload) {
        throw new Error('Не удалось подготовить комментарий к переводу. Обновите страницу.');
    }
    const msg = {
        address: address,
        amount: amountNano
    };
    if (payload) msg.payload = payload;
    const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [msg]
    };

    try {
        const result = await tonConnectUI.sendTransaction(transaction);
        console.log('Transaction sent:', result);
        return result;
    } catch (error) {
        console.error('Transaction error:', error);
        if (error && error.message && error.message.includes('declined')) {
            throw new Error('Перевод отменён');
        }
        throw error;
    }
}

// Load TON Connect SDK dynamically if not loaded
async function ensureTonConnectSDK() {
    // Check if already loaded
    if (window.TON_CONNECT_UI || window.TonConnectUI || window.TonConnect) {
        console.log('TON Connect SDK already loaded');
        return true;
    }
    
    // Check if script tag exists
    const existingScript = document.querySelector('script[src*="tonconnect"]');
    if (existingScript) {
        console.log('TON Connect script tag exists, waiting for load...');
        // Wait for script to load
        return new Promise((resolve) => {
            let attempts = 0;
            const checkInterval = setInterval(() => {
                attempts++;
                if (window.TON_CONNECT_UI || window.TonConnectUI || window.TonConnect) {
                    clearInterval(checkInterval);
                    resolve(true);
                } else if (attempts > 20) { // 10 seconds max
                    clearInterval(checkInterval);
                    console.error('TON Connect SDK failed to load from script tag');
                    resolve(false);
                }
            }, 500);
        });
    }
    
    // Try to load SDK dynamically
    console.log('Attempting to load TON Connect SDK dynamically...');
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@tonconnect/ui@latest/dist/tonconnect-ui.min.js';
        script.async = true;
        script.onload = () => {
            console.log('TON Connect SDK loaded dynamically');
            setTimeout(() => resolve(true), 100);
        };
        script.onerror = () => {
            console.error('Failed to load TON Connect SDK from unpkg');
            resolve(false);
        };
        document.head.appendChild(script);
    });
}

// Initialize on load
async function startTonConnectInit() {
    console.log('Starting TON Connect initialization...');
    
    // Setup buttons early (even if SDK not loaded yet)
    setupWalletButtons();
    
    // Ensure SDK is loaded
    const sdkLoaded = await ensureTonConnectSDK();
    if (!sdkLoaded) {
        console.error('TON Connect SDK not available');
        const container = document.getElementById('ton-connect-container');
        if (container) {
            const btn = container.querySelector('#ton-connect-btn');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="wallet-btn-text">TON Connect недоступен</span>';
            }
        }
        return;
    }
    
    console.log('window.TON_CONNECT_UI:', window.TON_CONNECT_UI);
    console.log('window.TonConnectUI:', window.TonConnectUI);
    console.log('window.TonConnect:', window.TonConnect);
    
    // Check if SDK script is loaded
    const scripts = Array.from(document.querySelectorAll('script[src*="tonconnect"]'));
    console.log('TON Connect scripts found:', scripts.length, scripts.map(s => s.src));
    
    // Start initialization
    initTonConnect();
}

// Try multiple initialization strategies
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startTonConnectInit);
} else {
    // DOM already loaded
    setTimeout(startTonConnectInit, 100);
}

// Also try after window load (in case SDK loads late)
window.addEventListener('load', () => {
    if (!tonConnectUI && initAttempts < 3) {
        console.log('Window loaded, retrying TON Connect init...');
        initAttempts = 0;
        setTimeout(initTonConnect, 500);
    }
});

// Export for use in other scripts
window.tonConnect = {
    connect: connectWallet,
    disconnect: disconnectWallet,
    getWallet: getConnectedWallet,
    isConnected: isWalletConnected,
    sendTransaction: sendTransaction
};


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
        
        // Try different ways the SDK might be exposed
        let TonConnectUIClass = null;
        
        if (window.TON_CONNECT_UI && window.TON_CONNECT_UI.TonConnectUI) {
            TonConnectUIClass = window.TON_CONNECT_UI.TonConnectUI;
            console.log('Found via window.TON_CONNECT_UI.TonConnectUI');
        } else if (window.TonConnectUI && typeof window.TonConnectUI === 'function') {
            TonConnectUIClass = window.TonConnectUI;
            console.log('Found via window.TonConnectUI (function)');
        } else if (window.TonConnectUI && window.TonConnectUI.TonConnectUI) {
            TonConnectUIClass = window.TonConnectUI.TonConnectUI;
            console.log('Found via window.TonConnectUI.TonConnectUI');
        }
        
        if (!TonConnectUIClass) {
            if (initAttempts < MAX_INIT_ATTEMPTS) {
                console.log('TON Connect UI not loaded yet, retrying in 500ms...');
                setTimeout(initTonConnect, 500);
                return;
            } else {
                console.error('TON Connect UI failed to load after', MAX_INIT_ATTEMPTS, 'attempts');
                return;
            }
        }
        
        console.log('TON Connect UI class found, creating instance...');
        
        // Initialize TON Connect UI
        tonConnectUI = new TonConnectUIClass({
            manifestUrl: 'https://v3022889.hosted-by-vdsina.ru/tonconnect-manifest.json'
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
        
        // Setup button handlers
        setupWalletButtons();
        
        console.log('TON Connect fully initialized!');
    } catch (error) {
        console.error('Error initializing TON Connect:', error);
        console.error('Stack:', error.stack);
    }
}

// Setup wallet button handlers using event delegation
function setupWalletButtons() {
    console.log('Setting up wallet buttons with event delegation');
    
    // Use event delegation on document to catch all clicks
    document.addEventListener('click', async (e) => {
        const connectBtn = e.target.closest('#ton-connect-btn');
        const disconnectBtn = e.target.closest('#disconnect-wallet');
        
        if (connectBtn) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Connect button clicked via delegation!');
            if (window.haptic) window.haptic.impact('medium');
            await connectWallet();
        }
        
        if (disconnectBtn) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Disconnect button clicked via delegation!');
            if (window.haptic) window.haptic.impact('light');
            await disconnectWallet();
        }
    });
    
    console.log('Wallet button event delegation set up');
}

// Connect wallet
async function connectWallet() {
    console.log('connectWallet called, tonConnectUI:', tonConnectUI);
    
    if (!tonConnectUI) {
        console.error('TON Connect not initialized');
        alert('TON Connect не инициализирован. Попробуйте перезагрузить страницу.');
        return;
    }
    
    try {
        console.log('Opening modal...');
        await tonConnectUI.openModal();
        console.log('Modal opened');
    } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Ошибка подключения: ' + error.message);
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

// Send TON transaction (for future use)
async function sendTransaction(toAddress, amount, comment = '') {
    if (!tonConnectUI || !connectedWallet) {
        throw new Error('Wallet not connected');
    }
    
    const amountNum = Number(amount);
    const amountNano = Math.round(amountNum * 1e9);
    const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
        messages: [
            {
                address: String(toAddress).trim(),
                amount: String(amountNano),
                payload: comment ? btoa(unescape(encodeURIComponent(comment))) : undefined
            }
        ]
    };
    
    try {
        const result = await tonConnectUI.sendTransaction(transaction);
        console.log('Transaction sent:', result);
        return result;
    } catch (error) {
        console.error('Transaction error:', error);
        throw error;
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, checking TON Connect availability...');
    console.log('window.TON_CONNECT_UI:', window.TON_CONNECT_UI);
    console.log('window.TonConnectUI:', window.TonConnectUI);
    
    // Wait a bit for other scripts to load
    setTimeout(initTonConnect, 300);
});

// Export for use in other scripts
window.tonConnect = {
    connect: connectWallet,
    disconnect: disconnectWallet,
    getWallet: getConnectedWallet,
    isConnected: isWalletConnected,
    sendTransaction: sendTransaction
};


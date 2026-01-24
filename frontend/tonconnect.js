// TON Connect Integration

let tonConnectUI = null;
let connectedWallet = null;

// Initialize TON Connect
async function initTonConnect() {
    try {
        // Check if TON Connect UI is loaded
        if (typeof TonConnectUI === 'undefined') {
            console.log('TON Connect UI not loaded yet, retrying...');
            setTimeout(initTonConnect, 500);
            return;
        }
        
        // Initialize TON Connect UI
        tonConnectUI = new TonConnectUI.TonConnectUI({
            manifestUrl: window.location.origin + '/tonconnect-manifest.json',
            buttonRootId: null // We'll handle the button ourselves
        });
        
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
        
        console.log('TON Connect initialized');
    } catch (error) {
        console.error('Error initializing TON Connect:', error);
    }
}

// Setup wallet button handlers
function setupWalletButtons() {
    const connectBtn = document.getElementById('ton-connect-btn');
    const disconnectBtn = document.getElementById('disconnect-wallet');
    
    if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
            if (window.haptic) window.haptic.impact('medium');
            await connectWallet();
        });
    }
    
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', async () => {
            if (window.haptic) window.haptic.impact('light');
            await disconnectWallet();
        });
    }
}

// Connect wallet
async function connectWallet() {
    if (!tonConnectUI) {
        console.error('TON Connect not initialized');
        return;
    }
    
    try {
        await tonConnectUI.openModal();
    } catch (error) {
        console.error('Error connecting wallet:', error);
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
    
    const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
        messages: [
            {
                address: toAddress,
                amount: (amount * 1e9).toString(), // Convert to nanoton
                payload: comment ? btoa(comment) : undefined
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
    // Wait a bit for other scripts to load
    setTimeout(initTonConnect, 100);
});

// Export for use in other scripts
window.tonConnect = {
    connect: connectWallet,
    disconnect: disconnectWallet,
    getWallet: getConnectedWallet,
    isConnected: isWalletConnected,
    sendTransaction: sendTransaction
};


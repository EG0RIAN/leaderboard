// Translations for the app
const translations = {
    ru: {
        // Tabs
        tabAllTime: "За всё время",
        tabWeek: "За неделю",
        tabReferrals: "Топ рефералов",
        tabProfile: "Профиль",
        
        // Leaderboards
        leaderboardAllTime: "Лидерборд за всё время",
        leaderboardWeek: "Лидерборд за неделю",
        leaderboardReferrals: "Топ рефералов",
        
        // Buttons
        donate: "Пополнить",
        inviteFriend: "Приведи друга",
        createPayment: "Создать платеж",
        close: "Закрыть",
        
        // Donate modal
        donateTitle: "Пополнить донат",
        preset1: "1 место",
        preset2: "2 место",
        preset3: "3 место",
        customAmount: "Своя сумма (Stars):",
        enterAmount: "Введите сумму",
        paymentMethod: "Способ оплаты:",
        telegramStars: "Telegram Stars",
        crypto: "Криптовалюта",
        selectCrypto: "Выберите валюту:",
        
        // Messages
        loading: "Загрузка...",
        noData: "Нет данных",
        errorLoading: "Ошибка загрузки",
        you: "Вы",
        position: "Позиция",
        
        // Referrals
        referralsCount: "реф.",
        
        // Errors
        initError: "Ошибка инициализации",
        paymentError: "Ошибка создания платежа",
        userDataError: "Данные пользователя не найдены. Подождите загрузки...",
        linkCopied: "✅ Ссылка скопирована в буфер обмена!\n\nПоделитесь ею с друзьями через любой мессенджер.",
        shareLink: "Реферальная ссылка:\n\n{link}\n\nСкопируйте и поделитесь с друзьями.",
        
        // Payment
        paymentCreated: "Создан платеж на {amount} Stars",
        paymentSuccess: "✅ Платеж успешно обработан!",
        paymentFailed: "❌ Платеж не прошел. Попробуйте еще раз.",
        paymentErrorMsg: "❌ Ошибка создания платежа: {error}\n\nПопробуйте позже.",
        cryptoProviderError: "❌ Криптоплатежи временно недоступны.\n\nИспользуйте Telegram Stars для оплаты.",
        
        // Share
        shareText: "🎮 Присоединяйся к лидерборду донатов!\n\n{link}",
        
        // Profile
        profileTitle: "Настройки профиля",
        customTextLabel: "Ваш текст в лидерборде:",
        customTextPlaceholder: "Введите текст (макс. 100 символов)",
        saveText: "Сохранить",
        customTextInfo: "Этот текст будет отображаться рядом с вашим именем в лидерборде.",
        customTextSaved: "✅ Текст сохранен!",
        customTextError: "❌ Ошибка сохранения. Попробуйте позже."
    },
    en: {
        // Tabs
        tabAllTime: "All Time",
        tabWeek: "This Week",
        tabReferrals: "Top Referrals",
        tabProfile: "Profile",
        
        // Leaderboards
        leaderboardAllTime: "All Time Leaderboard",
        leaderboardWeek: "Weekly Leaderboard",
        leaderboardReferrals: "Top Referrals",
        
        // Buttons
        donate: "Top Up",
        inviteFriend: "Invite Friend",
        createPayment: "Create Payment",
        close: "Close",
        
        // Donate modal
        donateTitle: "Top Up Donation",
        preset1: "1st Place",
        preset2: "2nd Place",
        preset3: "3rd Place",
        customAmount: "Custom Amount (Stars):",
        enterAmount: "Enter amount",
        paymentMethod: "Payment Method:",
        telegramStars: "Telegram Stars",
        crypto: "Cryptocurrency",
        selectCrypto: "Select currency:",
        
        // Messages
        loading: "Loading...",
        noData: "No data",
        errorLoading: "Error loading",
        you: "You",
        position: "Position",
        
        // Referrals
        referralsCount: "ref.",
        
        // Errors
        initError: "Initialization error",
        paymentError: "Payment creation error",
        userDataError: "User data not found. Please wait for loading...",
        linkCopied: "✅ Link copied to clipboard!\n\nShare it with your friends via any messenger.",
        shareLink: "Referral link:\n\n{link}\n\nCopy and share with friends.",
        
        // Payment
        paymentCreated: "Payment created for {amount} Stars",
        paymentSuccess: "✅ Payment processed successfully!",
        paymentFailed: "❌ Payment failed. Please try again.",
        paymentErrorMsg: "❌ Payment creation error: {error}\n\nPlease try later.",
        cryptoProviderError: "❌ Cryptocurrency payments are temporarily unavailable.\n\nPlease use Telegram Stars for payment.",
        
        // Share
        shareText: "🎮 Join the donation leaderboard!\n\n{link}",
        
        // Profile
        profileTitle: "Profile Settings",
        customTextLabel: "Your text in leaderboard:",
        customTextPlaceholder: "Enter text (max 100 characters)",
        saveText: "Save",
        customTextInfo: "This text will be displayed next to your name in the leaderboard.",
        customTextSaved: "✅ Text saved!",
        customTextError: "❌ Error saving. Please try later."
    }
};

// Get current language
function getLanguage() {
    // Try to get from Telegram Web App
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        const lang = tg.initDataUnsafe?.user?.language_code;
        if (lang) {
            // If language is Russian, return 'ru', otherwise 'en'
            return lang.startsWith('ru') ? 'ru' : 'en';
        }
    }
    
    // Fallback: check browser language
    const browserLang = navigator.language || navigator.userLanguage;
    return browserLang.startsWith('ru') ? 'ru' : 'en';
}

// Translation function
function t(key, params = {}) {
    const lang = getLanguage();
    const translation = translations[lang]?.[key] || translations.en[key] || key;
    
    // Replace placeholders
    if (params && Object.keys(params).length > 0) {
        return translation.replace(/\{(\w+)\}/g, (match, paramKey) => {
            return params[paramKey] !== undefined ? params[paramKey] : match;
        });
    }
    
    return translation;
}

// Set language attribute on html element
function setLanguage() {
    const lang = getLanguage();
    document.documentElement.lang = lang;
}


// Translations for the app
const translations = {
    ru: {
        // Tabs / Nav
        tabAllTime: "За всё время",
        tabWeek: "За неделю",
        tabReferrals: "Топ рефералов",
        tabProfile: "Профиль",
        navAllTime: "Общий",
        navWeek: "Неделя",
        navReferrals: "Рефералы",
        navProfile: "Профиль",
        
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
        
        // Countdown
        weekResetIn: "До обновления:",
        days: "д",
        hours: "ч",
        minutes: "м",
        seconds: "с",
        
        // Messages
        loading: "Загрузка...",
        noData: "Нет данных",
        errorLoading: "Ошибка загрузки",
        you: "Вы",
        position: "Позиция",
        
        // Referrals
        referralsCount: "реф.",
        referralsLabel: "рефералов",
        yourPosition: "место в топе",
        diamonds: "чартсов",
        notInTop: "Пока не в топе",
        
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
        
        // Wallet
        walletTitle: "TON Кошелёк",
        connectWallet: "Подключить кошелёк",
        disconnectWallet: "Отключить",
        walletConnected: "Кошелёк подключен",
        
        // Profile
        profileTitle: "Профиль",
        customTitleLabel: "Заголовок:",
        customTitlePlaceholder: "Виден в топе",
        customTextLabel: "Описание:",
        customTextPlaceholder: "Видно при нажатии на профиль...",
        customLinkLabel: "Ссылка:",
        customLinkPlaceholder: "https://...",
        saveProfile: "Сохранить",
        profileInfo: "Заголовок виден в топе, описание и ссылка — при нажатии!",
        profileSaved: "✅ Профиль сохранен!",
        profileError: "❌ Ошибка сохранения. Попробуйте позже.",
        invalidLink: "❌ Введите корректную ссылку (начинается с http:// или https://)",
        
        // Edit Display Name
        editDisplayName: "Изменить имя",
        displayNamePlaceholder: "Как вас называть?",
        displayNameHint: "Будет отображаться в лидерборде",
        cancel: "Отмена",
        save: "Сохранить",
        
        // Onboarding
        onboardingTitle1: "Самый честный лидерборд",
        onboardingText1: "Встречайте самый честный лидерборд в Telegram!",
        onboardingTitle2: "Как попасть в топ?",
        onboardingText2: "Твоя позиция зависит от количества чартсов. Чем больше чартсов — тем выше рейтинг!",
        onboardingText2b: "Чем выше ваш рейтинг, тем дороже призы, которые вы можете выиграть!",
        onboardingTitle3: "Как получить чартсы?",
        onboardingText3: "Покупай за TON и STARS или подарки, а также зарабатывай бонусами за рефералов.",
        onboardingTitle4: "Будь креативным!",
        onboardingText4: "Напиши сообщение, которое увидят все: реклама продукта, мем или философская мысль — решаешь ты!",
        onboardingTitle5: "Розыгрыши!",
        onboardingText5: "Все участники лидерборда автоматически участвуют в еженедельном розыгрыше!",
        onboardingText5b: "Чем выше ваше место, тем круче розыгрыш!",
        onboardingSkip: "Пропустить",
        onboardingStart: "Начать"
    },
    en: {
        // Tabs / Nav
        tabAllTime: "All Time",
        tabWeek: "This Week",
        tabReferrals: "Top Referrals",
        tabProfile: "Profile",
        navAllTime: "Total",
        navWeek: "Week",
        navReferrals: "Referrals",
        navProfile: "Profile",
        
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
        
        // Countdown
        weekResetIn: "Resets in:",
        days: "d",
        hours: "h",
        minutes: "m",
        seconds: "s",
        
        // Messages
        loading: "Loading...",
        noData: "No data",
        errorLoading: "Error loading",
        you: "You",
        position: "Position",
        
        // Referrals
        referralsCount: "ref.",
        referralsLabel: "referrals",
        yourPosition: "place in top",
        diamonds: "charts",
        notInTop: "Not in top yet",
        
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
        
        // Wallet
        walletTitle: "TON Wallet",
        connectWallet: "Connect wallet",
        disconnectWallet: "Disconnect",
        walletConnected: "Wallet connected",
        
        // Profile
        profileTitle: "Profile",
        customTitleLabel: "Title:",
        customTitlePlaceholder: "Shown in leaderboard",
        customTextLabel: "Description:",
        customTextPlaceholder: "Shown when clicking profile...",
        customLinkLabel: "Link:",
        customLinkPlaceholder: "https://...",
        saveProfile: "Save",
        profileInfo: "Title shows in leaderboard, description and link — on click!",
        profileSaved: "✅ Profile saved!",
        profileError: "❌ Error saving. Please try later.",
        invalidLink: "❌ Enter a valid link (starts with http:// or https://)",
        
        // Edit Display Name
        editDisplayName: "Change Name",
        displayNamePlaceholder: "What should we call you?",
        displayNameHint: "Will be shown in the leaderboard",
        cancel: "Cancel",
        save: "Save",
        
        // Onboarding
        onboardingTitle1: "The Fairest Leaderboard",
        onboardingText1: "Meet the fairest leaderboard on Telegram!",
        onboardingTitle2: "How to reach the top?",
        onboardingText2: "Your position depends on the number of charts. More charts — higher ranking!",
        onboardingText2b: "The higher your ranking, the better prizes you can win!",
        onboardingTitle3: "How to get charts?",
        onboardingText3: "Buy with TON, STARS or gifts, and earn bonuses from referrals.",
        onboardingTitle4: "Be Creative!",
        onboardingText4: "Write a message everyone will see: product ad, meme, or philosophical thought — you decide!",
        onboardingTitle5: "Giveaways!",
        onboardingText5: "All leaderboard participants automatically enter the weekly giveaway!",
        onboardingText5b: "The higher your place, the better the prizes!",
        onboardingSkip: "Skip",
        onboardingStart: "Start"
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


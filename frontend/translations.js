// Translations for the app
const translations = {
    ru: {
        // Tabs / Nav
        tabAllTime: "За всё время",
        tabWeek: "За неделю",
        tabReferrals: "Топ рефералов",
        tabProfile: "Профиль",
        tabTasks: "Задания",
        navAllTime: "Общий",
        navWeek: "Неделя",
        navReferrals: "Рефералы",
        navProfile: "Профиль",
        navTasks: "Задания",
        tasksSubtitle: "Выполняйте задания и получайте чартсы",
        taskTypeSubscribe: "Подписаться на канал",
        taskTypeJoinChat: "Войти в чат",
        taskTypeOpenApp: "Перейти в приложение",
        taskGo: "Перейти",
        taskClaim: "Получить награду",
        taskDone: "Выполнено",
        tasksEmpty: "Нет доступных заданий",
        tasksLoadError: "Задания временно недоступны",
        taskClaimSuccess: "✅ Получено {amount} чартсов!",
        taskClaimError: "Не удалось получить награду",
        
        // Leaderboards
        leaderboardAllTime: "Вечный лидерборд",
        leaderboardWeek: "Недельный лидерборд",
        leaderboardReferrals: "Топ рефералов",
        
        // Buttons
        donate: "Пополнить",
        inviteFriend: "Приведи друга",
        createPayment: "Создать платеж",
        close: "Закрыть",
        
        // Rise in rating
        riseInRating: "Подняться в рейтинге",
        topupTitle: "Пополнить баланс",
        topUp: "+",
        payNow: "Оплатить",
        payWithStars: "Оплатить Stars",
        needMoreCharts: "Нужно ещё чартсов для активации",
        
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
        weekResetIn: "До розыгрыша:",
        days: "д",
        hours: "ч",
        minutes: "м",
        seconds: "с",
        
        // Messages
        loading: "Загрузка...",
        noData: "Нет данных",
        errorLoading: "Ошибка загрузки",
        you: "Вы",
        yourPosition: "Вы на",
        place: "месте",
        position: "Позиция",
        
        // Referrals
        referralsCount: "реф.",
        referralsLabel: "рефералов",
        yourPosition: "место в топе",
        diamonds: "чартсов",
        charts: "чартсов",
        inLeaderboard: "в топе",
        notInTop: "Пока не в топе",
        
        // Balance & Activation
        balance: "Баланс:",
        balanceTitle: "Ваш баланс",
        balanceHint: "Активируйте чартсы, чтобы войти в лидерборд",
        activateCharts: "Активировать",
        activateChartsTitle: "Активировать чартсы",
        availableBalance: "Доступно:",
        enterAmount: "Введите количество",
        max: "MAX",
        activateHint: "Чартсы будут добавлены в текущий недельный лидерборд",
        activate: "Активировать",
        chartsActivated: "✅ Активировано {amount} чартсов!",
        activationError: "❌ Ошибка активации",
        insufficientBalance: "❌ Недостаточно чартсов на балансе",
        
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
        
        // TON Payment
        tonAmount: "Сумма в TON:",
        createTonPayment: "Создать платеж TON",
        paymentComment: "Комментарий к переводу",
        comment: "Комментарий",
        copyAddress: "Скопировать адрес",
        openWallet: "Открыть кошелёк",
        waitingPayment: "Ожидание оплаты...",
        paymentReceived: "Платеж получен!",
        paymentExpired: "Время платежа истекло",
        expiresIn: "Истекает через {time}",
        minTonAmount: "Минимальная сумма: 0.1 TON",
        addressCopied: "✅ Адрес и комментарий скопированы!",
        tonPaymentSuccess: "✅ Получено {charts} чартсов!",
        
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
        onboardingStart: "Начать",
        
        // Collected funds bar
        collectedFunds: "Собранные средства",
        collectedHint: "15% от всех депозитов"
    },
    en: {
        // Tabs / Nav
        tabAllTime: "All Time",
        tabWeek: "This Week",
        tabReferrals: "Top Referrals",
        tabProfile: "Profile",
        tabTasks: "Tasks",
        navAllTime: "Total",
        navWeek: "Week",
        navReferrals: "Referrals",
        navProfile: "Profile",
        navTasks: "Tasks",
        tasksSubtitle: "Complete tasks and earn charts",
        taskTypeSubscribe: "Subscribe to channel",
        taskTypeJoinChat: "Join chat",
        taskTypeOpenApp: "Open app",
        taskGo: "Go",
        taskClaim: "Claim reward",
        taskDone: "Done",
        tasksEmpty: "No tasks available",
        tasksLoadError: "Tasks temporarily unavailable",
        taskClaimSuccess: "✅ {amount} charts received!",
        taskClaimError: "Failed to claim reward",
        
        // Leaderboards
        leaderboardAllTime: "All Time Leaderboard",
        leaderboardWeek: "Weekly Leaderboard",
        leaderboardReferrals: "Top Referrals",
        
        // Buttons
        donate: "Top Up",
        inviteFriend: "Invite Friend",
        createPayment: "Create Payment",
        close: "Close",
        
        // Rise in rating
        riseInRating: "Rise in ranking",
        topupTitle: "Top up balance",
        topUp: "+",
        payNow: "Pay",
        payWithStars: "Pay with Stars",
        needMoreCharts: "Need more charts to activate",
        
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
        weekResetIn: "Until giveaway:",
        days: "d",
        hours: "h",
        minutes: "m",
        seconds: "s",
        
        // Messages
        loading: "Loading...",
        noData: "No data",
        errorLoading: "Error loading",
        you: "You",
        yourPosition: "You're at",
        place: "place",
        position: "Position",
        
        // Referrals
        referralsCount: "ref.",
        referralsLabel: "referrals",
        diamonds: "charts",
        charts: "charts",
        inLeaderboard: "in top",
        notInTop: "Not in top yet",
        
        // Balance & Activation
        balance: "Balance:",
        balanceTitle: "Your Balance",
        balanceHint: "Activate charts to enter the leaderboard",
        activateCharts: "Activate",
        activateChartsTitle: "Activate Charts",
        availableBalance: "Available:",
        enterAmount: "Enter amount",
        max: "MAX",
        activateHint: "Charts will be added to current weekly leaderboard",
        activate: "Activate",
        chartsActivated: "✅ Activated {amount} charts!",
        activationError: "❌ Activation error",
        insufficientBalance: "❌ Insufficient balance",
        
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
        
        // TON Payment
        tonAmount: "Amount in TON:",
        createTonPayment: "Create TON Payment",
        paymentComment: "Transfer comment",
        comment: "Comment",
        copyAddress: "Copy address",
        openWallet: "Open wallet",
        waitingPayment: "Waiting for payment...",
        paymentReceived: "Payment received!",
        paymentExpired: "Payment expired",
        expiresIn: "Expires in {time}",
        minTonAmount: "Minimum amount: 0.1 TON",
        addressCopied: "✅ Address and comment copied!",
        tonPaymentSuccess: "✅ Received {charts} charts!",
        
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
        onboardingStart: "Start",
        
        // Collected funds bar
        collectedFunds: "Collected funds",
        collectedHint: "15% of all deposits"
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


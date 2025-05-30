import React, { createContext, useContext, useState, useEffect } from 'react';

interface LocalizationContextType {
  language: 'en' | 'ar';
  setLanguage: (lang: 'en' | 'ar') => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const translations = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.categories': 'Categories',
    'nav.events': 'Events',
    'nav.chat': 'Chat',
    'nav.profile': 'Profile',
    'nav.more': 'More',
    
    // Map
    'map.title': 'Discover Yanbu',
    'map.nearbyPlaces': 'Nearby Places',
    'map.joinChat': 'Join Chat',
    'map.moveCloser': 'Move closer to join chat',
    'map.distance': 'm away',
    'map.open': 'Open',
    'map.closed': 'Closed',
    
    // Categories
    'categories.all': 'All',
    'categories.cafes': 'Cafés',
    'categories.restaurants': 'Restaurants',
    'categories.shops': 'Shops',
    'categories.events': 'Events',
    
    // Chat
    'chat.title': 'Store Chats',
    'chat.locked': 'Chat Locked',
    'chat.unlocked': 'In Range',
    'chat.typeMessage': 'Type your message...',
    'chat.signInToChat': 'Sign in to chat...',
    'chat.getCloserToChat': 'Get closer to chat...',
    'chat.noMessages': 'No messages yet. Start the conversation!',
    'chat.liveGPS': 'Live GPS • 500m range • Store-specific chats',
    
    // Profile
    'profile.title': 'Profile',
    'profile.nickname': 'Nickname',
    'profile.age': 'Age',
    'profile.gender': 'Gender',
    'profile.interests': 'Interests',
    'profile.male': 'Male',
    'profile.female': 'Female',
    'profile.updateProfile': 'Update Profile',
    'profile.signOut': 'Sign Out',
    
    // Events
    'events.title': 'Events',
    'events.happening': "What's Happening",
    'events.noEvents': 'No events scheduled',
    'events.attendees': 'attendees',
    'events.rsvp': 'RSVP',

    // Onboarding
    'onboarding.welcome': 'Welcome to Yanbu Vibes!',
    'onboarding.welcomeDesc': 'Connect with people and discover amazing places in Yanbu. Your adventure starts here!',
    'onboarding.discoverPlaces': 'Discover Places',
    'onboarding.discoverDesc': 'Explore cafes, restaurants, shops and events around you. Find your next favorite spot!',
    'onboarding.proximityChat': 'Proximity Chat',
    'onboarding.chatDesc': 'Chat with people when you\'re near the same location. Make real connections!',
    'onboarding.customize': 'Customize Your Experience',
    'onboarding.customizeDesc': 'Set your language, theme, and preferences to make the app truly yours.',
    'onboarding.getStarted': 'Get Started',
    'onboarding.skip': 'Skip Tutorial',

    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Customize your Yanbu Vibes experience',
    'settings.appearance': 'Appearance',
    'settings.darkMode': 'Dark Mode',
    'settings.darkModeDesc': 'Use dark theme for better viewing in low light',
    'settings.lightMode': 'Light',
    'settings.language': 'Language',
    'settings.currentLanguage': 'Current Language',
    'settings.notifications': 'Notifications',
    'settings.proximityNotifications': 'Proximity Alerts',
    'settings.proximityNotificationsDesc': 'Get notified when near interesting places',
    'settings.soundNotifications': 'Sound Notifications',
    'settings.soundNotificationsDesc': 'Play sounds for notifications',
    'settings.hapticFeedback': 'Haptic Feedback',
    'settings.enableHaptic': 'Enable Vibrations',
    'settings.hapticDesc': 'Feel tactile feedback for interactions',
    'settings.testHaptic': 'Test Vibration',
    'settings.deviceInfo': 'Device Information',
    'settings.platform': 'Platform',
    'settings.orientation': 'Text Direction',
    'settings.version': 'Version',
    'settings.notificationsEnabled': 'Notifications enabled',
    'settings.notificationsDisabled': 'Notifications disabled',
    'settings.notificationsPermissionDenied': 'Notification permission denied',
    'settings.hapticTested': 'Haptic feedback tested',

    // Gamification
    'gamification.level': 'Level',
    'gamification.points': 'Points',
    'gamification.placesVisited': 'Places',
    'gamification.messages': 'Messages',
    'gamification.dayStreak': 'Day Streak',
    'gamification.achievements': 'Achievements',
    'gamification.unlocked': 'Unlocked',
    'gamification.achievementUnlocked': 'Achievement Unlocked!',

    // Achievements
    'achievements.firstVisit': 'First Step',
    'achievements.firstVisitDesc': 'Visit your first place in Yanbu',
    'achievements.explorer': 'Explorer',
    'achievements.explorerDesc': 'Visit 5 different places',
    'achievements.socialButterfly': 'Social Butterfly',
    'achievements.socialButterflyDesc': 'Send 50 messages in chats',
    'achievements.streakMaster': 'Streak Master',
    'achievements.streakMasterDesc': 'Use the app for 7 consecutive days',
    'achievements.yanbuExpert': 'Yanbu Expert',
    'achievements.yanbuExpertDesc': 'Visit 20 different places',
    
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.close': 'Close',
    'common.open': 'Open',
    'common.back': 'Back',
    'common.next': 'Next',
  },
  ar: {
    // Navigation
    'nav.home': 'الرئيسية',
    'nav.categories': 'الفئات',
    'nav.events': 'الفعاليات',
    'nav.chat': 'المحادثة',
    'nav.profile': 'الملف الشخصي',
    'nav.more': 'المزيد',
    
    // Map
    'map.title': 'اكتشف ينبع',
    'map.nearbyPlaces': 'الأماكن القريبة',
    'map.joinChat': 'انضم للمحادثة',
    'map.moveCloser': 'اقترب أكثر للانضمام للمحادثة',
    'map.distance': 'متر',
    'map.open': 'مفتوح',
    'map.closed': 'مغلق',
    
    // Categories
    'categories.all': 'الكل',
    'categories.cafes': 'المقاهي',
    'categories.restaurants': 'المطاعم',
    'categories.shops': 'المتاجر',
    'categories.events': 'الفعاليات',
    
    // Chat
    'chat.title': 'محادثات المتاجر',
    'chat.locked': 'المحادثة مقفلة',
    'chat.unlocked': 'في النطاق',
    'chat.typeMessage': 'اكتب رسالتك...',
    'chat.signInToChat': 'سجل الدخول للمحادثة...',
    'chat.getCloserToChat': 'اقترب أكثر للمحادثة...',
    'chat.noMessages': 'لا توجد رسائل بعد. ابدأ المحادثة!',
    'chat.liveGPS': 'GPS مباشر • نطاق 500 متر • محادثات خاصة بالمتاجر',
    
    // Profile
    'profile.title': 'الملف الشخصي',
    'profile.nickname': 'اللقب',
    'profile.age': 'العمر',
    'profile.gender': 'الجنس',
    'profile.interests': 'الاهتمامات',
    'profile.male': 'ذكر',
    'profile.female': 'أنثى',
    'profile.updateProfile': 'تحديث الملف الشخصي',
    'profile.signOut': 'تسجيل الخروج',
    
    // Events
    'events.title': 'الفعاليات',
    'events.happening': 'ما يحدث',
    'events.noEvents': 'لا توجد فعاليات مجدولة',
    'events.attendees': 'مشارك',
    'events.rsvp': 'تأكيد الحضور',

    // Onboarding
    'onboarding.welcome': 'مرحباً بك في ينبع فايبز!',
    'onboarding.welcomeDesc': 'تواصل مع الناس واكتشف أماكن رائعة في ينبع. مغامرتك تبدأ هنا!',
    'onboarding.discoverPlaces': 'اكتشف الأماكن',
    'onboarding.discoverDesc': 'استكشف المقاهي والمطاعم والمتاجر والفعاليات حولك. اعثر على مكانك المفضل التالي!',
    'onboarding.proximityChat': 'محادثة القرب',
    'onboarding.chatDesc': 'تحدث مع الناس عندما تكون قريباً من نفس الموقع. كوّن علاقات حقيقية!',
    'onboarding.customize': 'خصص تجربتك',
    'onboarding.customizeDesc': 'اضبط لغتك وسمتك وتفضيلاتك لجعل التطبيق ملكك حقاً.',
    'onboarding.getStarted': 'ابدأ',
    'onboarding.skip': 'تخطي الدليل',

    // Settings
    'settings.title': 'الإعدادات',
    'settings.subtitle': 'خصص تجربة ينبع فايبز',
    'settings.appearance': 'المظهر',
    'settings.darkMode': 'الوضع الليلي',
    'settings.darkModeDesc': 'استخدم السمة المظلمة للرؤية الأفضل في الإضاءة المنخفضة',
    'settings.lightMode': 'فاتح',
    'settings.language': 'اللغة',
    'settings.currentLanguage': 'اللغة الحالية',
    'settings.notifications': 'الإشعارات',
    'settings.proximityNotifications': 'تنبيهات القرب',
    'settings.proximityNotificationsDesc': 'احصل على إشعارات عند القرب من أماكن مثيرة',
    'settings.soundNotifications': 'إشعارات صوتية',
    'settings.soundNotificationsDesc': 'تشغيل أصوات للإشعارات',
    'settings.hapticFeedback': 'التغذية الراجعة اللمسية',
    'settings.enableHaptic': 'تفعيل الاهتزاز',
    'settings.hapticDesc': 'اشعر بالتغذية الراجعة اللمسية للتفاعلات',
    'settings.testHaptic': 'اختبر الاهتزاز',
    'settings.deviceInfo': 'معلومات الجهاز',
    'settings.platform': 'النظام',
    'settings.orientation': 'اتجاه النص',
    'settings.version': 'الإصدار',
    'settings.notificationsEnabled': 'تم تفعيل الإشعارات',
    'settings.notificationsDisabled': 'تم إلغاء الإشعارات',
    'settings.notificationsPermissionDenied': 'تم رفض إذن الإشعارات',
    'settings.hapticTested': 'تم اختبار التغذية الراجعة اللمسية',

    // Gamification
    'gamification.level': 'المستوى',
    'gamification.points': 'النقاط',
    'gamification.placesVisited': 'الأماكن',
    'gamification.messages': 'الرسائل',
    'gamification.dayStreak': 'أيام متتالية',
    'gamification.achievements': 'الإنجازات',
    'gamification.unlocked': 'مفتوح',
    'gamification.achievementUnlocked': 'إنجاز جديد!',

    // Achievements
    'achievements.firstVisit': 'الخطوة الأولى',
    'achievements.firstVisitDesc': 'زر أول مكان لك في ينبع',
    'achievements.explorer': 'مستكشف',
    'achievements.explorerDesc': 'زر 5 أماكن مختلفة',
    'achievements.socialButterfly': 'فراشة اجتماعية',
    'achievements.socialButterflyDesc': 'أرسل 50 رسالة في المحادثات',
    'achievements.streakMaster': 'سيد التتالي',
    'achievements.streakMasterDesc': 'استخدم التطبيق لمدة 7 أيام متتالية',
    'achievements.yanbuExpert': 'خبير ينبع',
    'achievements.yanbuExpertDesc': 'زر 20 مكان مختلف',
    
    // Common
    'common.loading': 'جاري التحميل...',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.add': 'إضافة',
    'common.close': 'إغلاق',
    'common.open': 'مفتوح',
    'common.back': 'رجوع',
    'common.next': 'التالي',
  }
};

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const LocalizationProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<'en' | 'ar'>(() => {
    const saved = localStorage.getItem('language');
    return (saved as 'en' | 'ar') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const isRTL = language === 'ar';

  return (
    <LocalizationContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};

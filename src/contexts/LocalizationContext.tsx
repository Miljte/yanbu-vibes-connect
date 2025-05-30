
import React, { createContext, useContext, useState, useEffect } from 'react';

interface LocalizationContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

const translations = {
  en: {
    // Navigation
    'nav.map': 'Map',
    'nav.events': 'Events',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'nav.admin': 'Admin',
    'nav.merchant': 'Merchant',
    'nav.chat': 'Chat',
    
    // Events
    'events.title': 'Events in Yanbu',
    'events.subtitle': 'Discover exciting events happening around you',
    'events.noEvents': 'No events found',
    'events.loadMore': 'Load More',
    'events.rsvp': 'RSVP',
    'events.attending': 'Attending',
    
    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Customize your app experience',
    'settings.appearance': 'Appearance',
    'settings.darkMode': 'Dark Mode',
    'settings.darkModeDesc': 'Switch to dark theme',
    'settings.lightMode': 'Light Mode',
    'settings.language': 'Language',
    'settings.currentLanguage': 'Current Language',
    'settings.notifications': 'Notifications',
    'settings.proximityNotifications': 'Proximity Notifications',
    'settings.proximityNotificationsDesc': 'Get alerts when near events or places',
    'settings.soundNotifications': 'Sound Notifications',
    'settings.soundNotificationsDesc': 'Play sounds for notifications',
    'settings.hapticFeedback': 'Haptic Feedback',
    'settings.enableHaptic': 'Enable Haptic Feedback',
    'settings.hapticDesc': 'Feel vibrations for interactions',
    'settings.testHaptic': 'Test Vibration',
    'settings.hapticTested': 'Haptic feedback tested!',
    'settings.deviceInfo': 'Device Information',
    'settings.platform': 'Platform',
    'settings.orientation': 'Text Direction',
    'settings.version': 'Version',
    'settings.notificationsEnabled': 'Notifications enabled successfully',
    'settings.notificationsDisabled': 'Notifications disabled',
    'settings.notificationsPermissionDenied': 'Notification permission denied',
    
    // Auth
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.signOut': 'Sign Out',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.nickname': 'Nickname',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.noAccount': "Don't have an account?",
    'auth.hasAccount': 'Already have an account?',
    'auth.welcome': 'Welcome to Pop In',
    'auth.subtitle': 'Connect with your community in Yanbu',
    
    // Profile
    'profile.title': 'My Profile',
    'profile.edit': 'Edit Profile',
    'profile.save': 'Save Changes',
    'profile.nickname': 'Nickname',
    'profile.age': 'Age',
    'profile.gender': 'Gender',
    'profile.interests': 'Interests',
    'profile.joinedOn': 'Joined on',
    
    // Map
    'map.title': 'Explore Yanbu',
    'map.searchPlaces': 'Search places...',
    'map.currentLocation': 'Current Location',
    'map.nearbyPlaces': 'Nearby Places',
    'map.checkingLocation': 'Checking location...',
    
    // Chat
    'chat.title': 'Proximity Chat',
    'chat.subtitle': 'Chat with people nearby',
    'chat.typeMessage': 'Type a message...',
    'chat.send': 'Send',
    
    // Location
    'location.mapRestricted': 'Map Restricted',
    'location.limitedToYanbu': 'Map features are limited to Yanbu area.',
    'location.stillAccess': 'You can still access other features.',
    'location.checkAgain': 'Check Location Again',
    
    // Onboarding
    'onboarding.welcome': 'Welcome to Pop In',
    'onboarding.welcomeDesc': 'Connect with your community in Yanbu',
    'onboarding.discoverPlaces': 'Discover Places',
    'onboarding.discoverDesc': 'Find exciting locations around you',
    'onboarding.proximityChat': 'Proximity Chat',
    'onboarding.chatDesc': 'Chat with people nearby',
    'onboarding.customize': 'Customize',
    'onboarding.customizeDesc': 'Personalize your experience',
    'onboarding.getStarted': 'Get Started',
    'onboarding.skip': 'Skip Tutorial',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.close': 'Close',
    'common.save': 'Save',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.add': 'Add',
    'common.remove': 'Remove',
    'common.update': 'Update',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort',
    'common.clear': 'Clear',
    'common.apply': 'Apply',
    'common.reset': 'Reset',
    'common.back': 'Back',
    'common.next': 'Next'
  },
  ar: {
    // Navigation
    'nav.map': 'الخريطة',
    'nav.events': 'الفعاليات',
    'nav.profile': 'الملف الشخصي',
    'nav.settings': 'الإعدادات',
    'nav.admin': 'الإدارة',
    'nav.merchant': 'التاجر',
    'nav.chat': 'المحادثة',
    
    // Events
    'events.title': 'فعاليات ينبع',
    'events.subtitle': 'اكتشف الفعاليات المثيرة من حولك',
    'events.noEvents': 'لم يتم العثور على فعاليات',
    'events.loadMore': 'تحميل المزيد',
    'events.rsvp': 'تأكيد الحضور',
    'events.attending': 'سأحضر',
    
    // Settings
    'settings.title': 'الإعدادات',
    'settings.subtitle': 'خصص تجربة التطبيق الخاصة بك',
    'settings.appearance': 'المظهر',
    'settings.darkMode': 'الوضع المظلم',
    'settings.darkModeDesc': 'التبديل إلى المظهر المظلم',
    'settings.lightMode': 'الوضع المضيء',
    'settings.language': 'اللغة',
    'settings.currentLanguage': 'اللغة الحالية',
    'settings.notifications': 'التنبيهات',
    'settings.proximityNotifications': 'تنبيهات القرب',
    'settings.proximityNotificationsDesc': 'احصل على تنبيهات عند القرب من الأحداث أو الأماكن',
    'settings.soundNotifications': 'التنبيهات الصوتية',
    'settings.soundNotificationsDesc': 'تشغيل الأصوات للتنبيهات',
    'settings.hapticFeedback': 'الاستجابة اللمسية',
    'settings.enableHaptic': 'تفعيل الاستجابة اللمسية',
    'settings.hapticDesc': 'الشعور بالاهتزازات للتفاعلات',
    'settings.testHaptic': 'اختبار الاهتزاز',
    'settings.hapticTested': 'تم اختبار الاستجابة اللمسية!',
    'settings.deviceInfo': 'معلومات الجهاز',
    'settings.platform': 'المنصة',
    'settings.orientation': 'اتجاه النص',
    'settings.version': 'الإصدار',
    'settings.notificationsEnabled': 'تم تفعيل التنبيهات بنجاح',
    'settings.notificationsDisabled': 'تم إلغاء التنبيهات',
    'settings.notificationsPermissionDenied': 'تم رفض إذن التنبيهات',
    
    // Auth
    'auth.signIn': 'تسجيل الدخول',
    'auth.signUp': 'إنشاء حساب',
    'auth.signOut': 'تسجيل الخروج',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.confirmPassword': 'تأكيد كلمة المرور',
    'auth.nickname': 'الاسم المستعار',
    'auth.forgotPassword': 'نسيت كلمة المرور؟',
    'auth.noAccount': 'ليس لديك حساب؟',
    'auth.hasAccount': 'لديك حساب بالفعل؟',
    'auth.welcome': 'مرحباً بك في بوب إن',
    'auth.subtitle': 'تواصل مع مجتمعك في ينبع',
    
    // Profile
    'profile.title': 'ملفي الشخصي',
    'profile.edit': 'تعديل الملف الشخصي',
    'profile.save': 'حفظ التغييرات',
    'profile.nickname': 'الاسم المستعار',
    'profile.age': 'العمر',
    'profile.gender': 'الجنس',
    'profile.interests': 'الاهتمامات',
    'profile.joinedOn': 'انضم في',
    
    // Map
    'map.title': 'استكشف ينبع',
    'map.searchPlaces': 'البحث عن الأماكن...',
    'map.currentLocation': 'الموقع الحالي',
    'map.nearbyPlaces': 'الأماكن القريبة',
    
    // Chat
    'chat.title': 'محادثة القرب',
    'chat.subtitle': 'تحدث مع الأشخاص القريبين',
    'chat.typeMessage': 'اكتب رسالة...',
    'chat.send': 'إرسال',
    
    // Common
    'common.loading': 'جاري التحميل...',
    'common.error': 'خطأ',
    'common.success': 'نجح',
    'common.cancel': 'إلغاء',
    'common.confirm': 'تأكيد',
    'common.close': 'إغلاق',
    'common.save': 'حفظ',
    'common.edit': 'تعديل',
    'common.delete': 'حذف',
    'common.add': 'إضافة',
    'common.remove': 'إزالة',
    'common.update': 'تحديث',
    'common.create': 'إنشاء',
    'common.search': 'بحث',
    'common.filter': 'تصفية',
    'common.sort': 'ترتيب',
    'common.clear': 'مسح',
    'common.apply': 'تطبيق',
    'common.reset': 'إعادة تعيين'
  }
};

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  const isRTL = language === 'ar';

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  const t = (key: string): string => {
    return translations[language]?.[key] || key;
  };

  const value = {
    language,
    setLanguage,
    t,
    isRTL
  };

  return (
    <LocalizationContext.Provider value={value}>
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

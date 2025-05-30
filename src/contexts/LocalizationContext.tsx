
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
    'nav.map': 'Map',
    'nav.categories': 'Categories',
    'nav.events': 'Events',
    'nav.chat': 'Chat',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'nav.admin': 'Admin',
    'nav.merchant': 'Business',
    'nav.more': 'More',
    
    // Map
    'map.title': 'Discover Yanbu',
    'map.explore': 'Explore Yanbu',
    'map.nearbyPlaces': 'Nearby Places',
    'map.joinChat': 'Join Chat',
    'map.moveCloser': 'Move closer to join chat',
    'map.distance': 'm away',
    'map.open': 'Open',
    'map.closed': 'Closed',
    'map.yourLocation': 'Your Location',
    'map.getCloserToChat': 'Get Closer to Chat',
    'map.signInToChat': 'Sign In to Chat',
    'map.inRange': 'In Range',
    'map.tooFar': 'Too Far',
    'map.checkLocationAgain': 'Check Location Again',
    'map.checkingLocation': 'Checking Location...',
    
    // Categories
    'categories.all': 'All',
    'categories.cafes': 'Cafés',
    'categories.restaurants': 'Restaurants',
    'categories.shops': 'Shops',
    'categories.events': 'Events',
    'categories.malls': 'Malls',
    'categories.beaches': 'Beaches',
    
    // Chat
    'chat.title': 'Store Chats',
    'chat.locationChats': 'Location Chats',
    'chat.locked': 'Chat Locked',
    'chat.unlocked': 'In Range',
    'chat.typeMessage': 'Type your message...',
    'chat.signInToChat': 'Sign in to chat...',
    'chat.getCloserToChat': 'Get closer to chat...',
    'chat.noMessages': 'No messages yet. Start the conversation!',
    'chat.liveGPS': 'Live GPS • 500m range • Store-specific chats',
    'chat.nearbyLocations': 'Nearby Locations',
    'chat.available': 'Available',
    'chat.send': 'Send',
    
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
    'profile.editProfile': 'Edit Profile',
    
    // Events
    'events.title': 'Events',
    'events.happening': "What's Happening",
    'events.noEvents': 'No events scheduled',
    'events.attendees': 'attendees',
    'events.rsvp': 'RSVP',
    'events.createEvent': 'Create Event',
    'events.eventDetails': 'Event Details',

    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Customize your POP IN experience',
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

    // Auth
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.signOut': 'Sign Out',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.dontHaveAccount': "Don't have an account?",
    'auth.alreadyHaveAccount': 'Already have an account?',

    // Admin
    'admin.title': 'Admin Dashboard',
    'admin.userManagement': 'User Management',
    'admin.placeManagement': 'Place Management',
    'admin.analytics': 'Analytics',
    'admin.totalUsers': 'Total Users',
    'admin.activePlaces': 'Active Places',
    'admin.totalMessages': 'Total Messages',

    // Merchant
    'merchant.title': 'Business Dashboard',
    'merchant.engagementHub': 'Customer Engagement Hub',
    'merchant.connectNearby': 'Connect with nearby customers in real-time',
    'merchant.selectStore': 'Select Store',
    'merchant.sendPromotion': 'Send Real-time Promotion',
    'merchant.nearbyCustomers': 'Live Nearby Customers',
    'merchant.usersNearby': 'Users Nearby',
    'merchant.messagesToday': 'Messages Today',
    'merchant.engagementRate': 'Engagement',
    'merchant.totalVisits': 'Total Visits',
    'merchant.activeOffers': 'Active Offers',

    // Location Restriction
    'location.restricted': 'Location Restricted',
    'location.mapRestricted': 'Map Access Restricted',
    'location.onlyYanbu': 'This app is only available in Yanbu, Saudi Arabia.',
    'location.limitedToYanbu': 'Map access is limited to users inside Yanbu.',
    'location.checkAgain': 'Check Location Again',
    'location.stillAccess': 'You can still access events and your profile.',

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
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.ok': 'OK',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.info': 'Info',
  },
  ar: {
    // Navigation
    'nav.home': 'الرئيسية',
    'nav.map': 'الخريطة',
    'nav.categories': 'الفئات',
    'nav.events': 'الفعاليات',
    'nav.chat': 'المحادثة',
    'nav.profile': 'الملف الشخصي',
    'nav.settings': 'الإعدادات',
    'nav.admin': 'الإدارة',
    'nav.merchant': 'الأعمال',
    'nav.more': 'المزيد',
    
    // Map
    'map.title': 'اكتشف ينبع',
    'map.explore': 'استكشف ينبع',
    'map.nearbyPlaces': 'الأماكن القريبة',
    'map.joinChat': 'انضم للمحادثة',
    'map.moveCloser': 'اقترب أكثر للانضمام للمحادثة',
    'map.distance': 'متر',
    'map.open': 'مفتوح',
    'map.closed': 'مغلق',
    'map.yourLocation': 'موقعك',
    'map.getCloserToChat': 'اقترب أكثر للمحادثة',
    'map.signInToChat': 'سجل الدخول للمحادثة',
    'map.inRange': 'في النطاق',
    'map.tooFar': 'بعيد جداً',
    'map.checkLocationAgain': 'تحقق من الموقع مرة أخرى',
    'map.checkingLocation': 'جاري فحص الموقع...',
    
    // Categories
    'categories.all': 'الكل',
    'categories.cafes': 'المقاهي',
    'categories.restaurants': 'المطاعم',
    'categories.shops': 'المتاجر',
    'categories.events': 'الفعاليات',
    'categories.malls': 'المولات',
    'categories.beaches': 'الشواطئ',
    
    // Chat
    'chat.title': 'محادثات المتاجر',
    'chat.locationChats': 'محادثات الأماكن',
    'chat.locked': 'المحادثة مقفلة',
    'chat.unlocked': 'في النطاق',
    'chat.typeMessage': 'اكتب رسالتك...',
    'chat.signInToChat': 'سجل الدخول للمحادثة...',
    'chat.getCloserToChat': 'اقترب أكثر للمحادثة...',
    'chat.noMessages': 'لا توجد رسائل بعد. ابدأ المحادثة!',
    'chat.liveGPS': 'GPS مباشر • نطاق 500 متر • محادثات خاصة بالمتاجر',
    'chat.nearbyLocations': 'الأماكن القريبة',
    'chat.available': 'متاح',
    'chat.send': 'إرسال',
    
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
    'profile.editProfile': 'تعديل الملف الشخصي',
    
    // Events
    'events.title': 'الفعاليات',
    'events.happening': 'ما يحدث',
    'events.noEvents': 'لا توجد فعاليات مجدولة',
    'events.attendees': 'مشارك',
    'events.rsvp': 'تأكيد الحضور',
    'events.createEvent': 'إنشاء فعالية',
    'events.eventDetails': 'تفاصيل الفعالية',

    // Settings
    'settings.title': 'الإعدادات',
    'settings.subtitle': 'خصص تجربة بوب إن الخاصة بك',
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

    // Auth
    'auth.signIn': 'تسجيل الدخول',
    'auth.signUp': 'إنشاء حساب',
    'auth.signOut': 'تسجيل الخروج',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.confirmPassword': 'تأكيد كلمة المرور',
    'auth.forgotPassword': 'نسيت كلمة المرور؟',
    'auth.dontHaveAccount': 'ليس لديك حساب؟',
    'auth.alreadyHaveAccount': 'لديك حساب بالفعل؟',

    // Admin
    'admin.title': 'لوحة الإدارة',
    'admin.userManagement': 'إدارة المستخدمين',
    'admin.placeManagement': 'إدارة الأماكن',
    'admin.analytics': 'التحليلات',
    'admin.totalUsers': 'إجمالي المستخدمين',
    'admin.activePlaces': 'الأماكن النشطة',
    'admin.totalMessages': 'إجمالي الرسائل',

    // Merchant
    'merchant.title': 'لوحة الأعمال',
    'merchant.engagementHub': 'مركز تفاعل العملاء',
    'merchant.connectNearby': 'تواصل مع العملاء القريبين في الوقت الفعلي',
    'merchant.selectStore': 'اختر المتجر',
    'merchant.sendPromotion': 'أرسل عرض فوري',
    'merchant.nearbyCustomers': 'العملاء القريبون مباشرة',
    'merchant.usersNearby': 'المستخدمون القريبون',
    'merchant.messagesToday': 'الرسائل اليوم',
    'merchant.engagementRate': 'التفاعل',
    'merchant.totalVisits': 'إجمالي الزيارات',
    'merchant.activeOffers': 'العروض النشطة',

    // Location Restriction
    'location.restricted': 'الموقع مقيد',
    'location.mapRestricted': 'الوصول للخريطة مقيد',
    'location.onlyYanbu': 'هذا التطبيق متاح فقط في ينبع، المملكة العربية السعودية.',
    'location.limitedToYanbu': 'الوصول للخريطة مقتصر على المستخدمين داخل ينبع.',
    'location.checkAgain': 'تحقق من الموقع مرة أخرى',
    'location.stillAccess': 'لا يزال بإمكانك الوصول إلى الفعاليات وملفك الشخصي.',

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
    'common.yes': 'نعم',
    'common.no': 'لا',
    'common.ok': 'موافق',
    'common.error': 'خطأ',
    'common.success': 'نجح',
    'common.warning': 'تحذير',
    'common.info': 'معلومات',
  }
};

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const LocalizationProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<'en' | 'ar'>(() => {
    const saved = localStorage.getItem('language');
    return (saved as 'en' | 'ar') || 'ar'; // Default to Arabic
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    
    // Apply appropriate font classes to body
    const body = document.body;
    if (language === 'ar') {
      body.className = body.className.replace(/font-\w+/g, '');
      body.classList.add('font-arabic');
    } else {
      body.className = body.className.replace(/font-\w+/g, '');
      body.classList.add('font-streetwear');
    }
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const isRTL = language === 'ar';

  return (
    <LocalizationContext.Provider value={{ language, setLanguage, t, isRTL }}>
      <div className={language === 'ar' ? 'font-arabic' : 'font-streetwear'}>
        {children}
      </div>
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

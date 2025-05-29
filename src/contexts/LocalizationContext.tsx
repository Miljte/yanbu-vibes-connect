
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
    
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.close': 'Close',
    'common.open': 'Open',
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
    
    // Common
    'common.loading': 'جاري التحميل...',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.add': 'إضافة',
    'common.close': 'إغلاق',
    'common.open': 'مفتوح',
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


import React, { useState } from 'react';
import { MapPin, MessageCircle, Calendar, User, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [language, setLanguage] = useState<'ar' | 'en'>('en');

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <header className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">
              {language === 'ar' ? 'ينبع فايبس' : 'Yanbu Vibes'}
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#map" className="flex items-center space-x-2 text-slate-300 hover:text-cyan-400 transition-colors">
              <MapPin className="w-4 h-4" />
              <span>{language === 'ar' ? 'الخريطة' : 'Map'}</span>
            </a>
            <a href="#chat" className="flex items-center space-x-2 text-slate-300 hover:text-cyan-400 transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span>{language === 'ar' ? 'المحادثة' : 'Chat'}</span>
            </a>
            <a href="#events" className="flex items-center space-x-2 text-slate-300 hover:text-cyan-400 transition-colors">
              <Calendar className="w-4 h-4" />
              <span>{language === 'ar' ? 'الأحداث' : 'Events'}</span>
            </a>
            <a href="#profile" className="flex items-center space-x-2 text-slate-300 hover:text-cyan-400 transition-colors">
              <User className="w-4 h-4" />
              <span>{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</span>
            </a>
          </nav>

          {/* Language Toggle & Mobile Menu */}
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="border-slate-700 text-slate-300 hover:text-white hover:border-cyan-500"
            >
              {language === 'ar' ? 'EN' : 'ع'}
            </Button>
            
            <button
              className="md:hidden text-slate-300 hover:text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800">
            <nav className="flex flex-col space-y-4">
              <a href="#map" className="flex items-center space-x-2 text-slate-300 hover:text-cyan-400 transition-colors">
                <MapPin className="w-4 h-4" />
                <span>{language === 'ar' ? 'الخريطة' : 'Map'}</span>
              </a>
              <a href="#chat" className="flex items-center space-x-2 text-slate-300 hover:text-cyan-400 transition-colors">
                <MessageCircle className="w-4 h-4" />
                <span>{language === 'ar' ? 'المحادثة' : 'Chat'}</span>
              </a>
              <a href="#events" className="flex items-center space-x-2 text-slate-300 hover:text-cyan-400 transition-colors">
                <Calendar className="w-4 h-4" />
                <span>{language === 'ar' ? 'الأحداث' : 'Events'}</span>
              </a>
              <a href="#profile" className="flex items-center space-x-2 text-slate-300 hover:text-cyan-400 transition-colors">
                <User className="w-4 h-4" />
                <span>{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</span>
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

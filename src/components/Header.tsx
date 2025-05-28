
import React, { useState } from 'react';
import { MapPin, MessageCircle, Calendar, User, Menu, X, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import AuthModal from './AuthModal';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [language, setLanguage] = useState<'ar' | 'en'>('en');
  const { user, signOut } = useAuth();
  const { hasPermission } = useRoles();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">
                {language === 'ar' ? 'بوب إن' : 'POP IN'}
              </h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              {hasPermission('view_map') && (
                <a href="#map" className="flex items-center space-x-2 text-slate-300 hover:text-cyan-400 transition-colors">
                  <MapPin className="w-4 h-4" />
                  <span>{language === 'ar' ? 'الخريطة' : 'Map'}</span>
                </a>
              )}
              {hasPermission('access_chat') && (
                <a href="#chat" className="flex items-center space-x-2 text-slate-300 hover:text-cyan-400 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  <span>{language === 'ar' ? 'المحادثة' : 'Chat'}</span>
                </a>
              )}
              {hasPermission('rsvp_events') && (
                <a href="#events" className="flex items-center space-x-2 text-slate-300 hover:text-cyan-400 transition-colors">
                  <Calendar className="w-4 h-4" />
                  <span>{language === 'ar' ? 'الأحداث' : 'Events'}</span>
                </a>
              )}
              {user && (
                <a href="#profile" className="flex items-center space-x-2 text-slate-300 hover:text-cyan-400 transition-colors">
                  <User className="w-4 h-4" />
                  <span>{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</span>
                </a>
              )}
            </nav>

            {/* Auth & Language Toggle */}
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleLanguage}
                className="border-slate-700 text-slate-300 hover:text-white hover:border-cyan-500"
              >
                {language === 'ar' ? 'EN' : 'ع'}
              </Button>
              
              {user ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="hidden md:flex border-slate-700 text-slate-300 hover:text-white hover:border-red-500"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {language === 'ar' ? 'تسجيل خروج' : 'Sign Out'}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="hidden md:flex border-slate-700 text-slate-300 hover:text-white hover:border-cyan-500"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {language === 'ar' ? 'تسجيل دخول' : 'Sign In'}
                </Button>
              )}
              
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
                {hasPermission('view_map') && (
                  <a href="#map" className="flex items-center space-x-2 text-slate-300 hover:text-cyan-400 transition-colors">
                    <MapPin className="w-4 h-4" />
                    <span>{language === 'ar' ? 'الخريطة' : 'Map'}</span>
                  </a>
                )}
                {hasPermission('access_chat') && (
                  <a href="#chat" className="flex items-center space-x-2 text-slate-300 hover:text-cyan-400 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    <span>{language === 'ar' ? 'المحادثة' : 'Chat'}</span>
                  </a>
                )}
                {hasPermission('rsvp_events') && (
                  <a href="#events" className="flex items-center space-x-2 text-slate-300 hover:text-cyan-400 transition-colors">
                    <Calendar className="w-4 h-4" />
                    <span>{language === 'ar' ? 'الأحداث' : 'Events'}</span>
                  </a>
                )}
                {user && (
                  <a href="#profile" className="flex items-center space-x-2 text-slate-300 hover:text-cyan-400 transition-colors">
                    <User className="w-4 h-4" />
                    <span>{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</span>
                  </a>
                )}
                
                <div className="pt-4 border-t border-slate-700">
                  {user ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSignOut}
                      className="w-full border-slate-700 text-slate-300 hover:text-white hover:border-red-500"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {language === 'ar' ? 'تسجيل خروج' : 'Sign Out'}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsAuthModalOpen(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full border-slate-700 text-slate-300 hover:text-white hover:border-cyan-500"
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      {language === 'ar' ? 'تسجيل دخول' : 'Sign In'}
                    </Button>
                  )}
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </>
  );
};

export default Header;

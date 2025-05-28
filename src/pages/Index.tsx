
import React from 'react';
import Header from '@/components/Header';
import InteractiveMap from '@/components/InteractiveMap';
import LocationChat from '@/components/LocationChat';
import EventsSection from '@/components/EventsSection';
import UserProfile from '@/components/UserProfile';

const Index = () => {
  return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 sm:py-20">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-600/10"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white mb-4 sm:mb-6">
            Discover <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Yanbu</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Connect with your city through location-based chats, discover events, and explore the best places around you
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
            <button className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold transition-all transform hover:scale-105">
              Start Exploring
            </button>
            <button className="border border-slate-600 text-slate-300 hover:text-white hover:border-cyan-500 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold transition-all">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="py-12 sm:py-16 bg-slate-800/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Why POP IN?</h2>
            <p className="text-slate-300 max-w-2xl mx-auto px-4">
              Experience your city like never before with our innovative location-based social platform
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 px-4">
            <div className="text-center p-6 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-cyan-500/50 transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🗺️</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Live Location Map</h3>
              <p className="text-slate-300 text-sm sm:text-base">Discover places around you with real-time crowd levels and demographics</p>
            </div>
            
            <div className="text-center p-6 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-cyan-500/50 transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Proximity Chat</h3>
              <p className="text-slate-300 text-sm sm:text-base">Join anonymous group chats when you're within 500m of any location</p>
            </div>
            
            <div className="text-center p-6 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-cyan-500/50 transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🎉</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Local Events</h3>
              <p className="text-slate-300 text-sm sm:text-base">Discover and join exciting events happening around Yanbu</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main App Sections */}
      <InteractiveMap />
      <LocationChat />
      <EventsSection />
      <UserProfile />

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-8 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="col-span-1 sm:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">P</span>
                </div>
                <h3 className="text-xl font-bold text-white">POP IN</h3>
              </div>
              <p className="text-slate-300 mb-4 text-sm sm:text-base">
                Connecting Yanbu's community through location-based social experiences
              </p>
              <p className="text-slate-400 text-sm">
                © 2024 POP IN. All rights reserved.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li><a href="#map" className="hover:text-cyan-400 transition-colors">Interactive Map</a></li>
                <li><a href="#chat" className="hover:text-cyan-400 transition-colors">Location Chat</a></li>
                <li><a href="#events" className="hover:text-cyan-400 transition-colors">Events</a></li>
                <li><a href="#profile" className="hover:text-cyan-400 transition-colors">Profile</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

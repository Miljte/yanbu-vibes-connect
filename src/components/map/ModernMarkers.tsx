
import React from 'react';
import { MapPin, Users, Store, Navigation, Zap, Radio, Coffee, ShoppingBag, Calendar, Sparkles } from 'lucide-react';

interface MarkerProps {
  type: 'user' | 'store' | 'cluster' | 'navigation' | 'active-user' | 'cafe' | 'restaurant' | 'shop' | 'event';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  active?: boolean;
  count?: number;
  className?: string;
  distance?: number;
  animated?: boolean;
}

export const ModernMarker: React.FC<MarkerProps> = ({ 
  type, 
  size = 'md', 
  active = false, 
  count,
  className = '',
  distance,
  animated = true
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  };

  const getMarkerIcon = () => {
    switch (type) {
      case 'cafe':
        return <Coffee className={iconSize[size]} />;
      case 'restaurant':
        return <Store className={iconSize[size]} />;
      case 'shop':
        return <ShoppingBag className={iconSize[size]} />;
      case 'event':
        return <Calendar className={iconSize[size]} />;
      case 'user':
      case 'active-user':
        return <Navigation className={iconSize[size]} />;
      case 'cluster':
        return <Users className={iconSize[size]} />;
      case 'navigation':
        return <Navigation className={`${iconSize[size]} transform rotate-45`} />;
      default:
        return <MapPin className={iconSize[size]} />;
    }
  };

  const getMarkerColors = () => {
    const isNearby = distance !== undefined && distance <= 200;
    
    switch (type) {
      case 'user':
      case 'active-user':
        return {
          bg: 'from-blue-500 via-blue-600 to-blue-700',
          ring: 'ring-blue-400/50',
          glow: 'shadow-blue-500/40'
        };
      case 'cafe':
        return {
          bg: isNearby ? 'from-green-500 via-green-600 to-green-700' : 'from-amber-600 via-amber-700 to-amber-800',
          ring: isNearby ? 'ring-green-400/50' : 'ring-amber-400/50',
          glow: isNearby ? 'shadow-green-500/40' : 'shadow-amber-600/40'
        };
      case 'restaurant':
        return {
          bg: isNearby ? 'from-green-500 via-green-600 to-green-700' : 'from-red-500 via-red-600 to-red-700',
          ring: isNearby ? 'ring-green-400/50' : 'ring-red-400/50',
          glow: isNearby ? 'shadow-green-500/40' : 'shadow-red-500/40'
        };
      case 'shop':
        return {
          bg: isNearby ? 'from-green-500 via-green-600 to-green-700' : 'from-purple-500 via-purple-600 to-purple-700',
          ring: isNearby ? 'ring-green-400/50' : 'ring-purple-400/50',
          glow: isNearby ? 'shadow-green-500/40' : 'shadow-purple-500/40'
        };
      case 'event':
        return {
          bg: isNearby ? 'from-green-500 via-green-600 to-green-700' : 'from-pink-500 via-pink-600 to-pink-700',
          ring: isNearby ? 'ring-green-400/50' : 'ring-pink-400/50',
          glow: isNearby ? 'shadow-green-500/40' : 'shadow-pink-500/40'
        };
      case 'cluster':
        return {
          bg: 'from-indigo-500 via-indigo-600 to-indigo-700',
          ring: 'ring-indigo-400/50',
          glow: 'shadow-indigo-500/40'
        };
      default:
        return {
          bg: 'from-gray-500 via-gray-600 to-gray-700',
          ring: 'ring-gray-400/50',
          glow: 'shadow-gray-500/40'
        };
    }
  };

  const colors = getMarkerColors();
  const isNearby = distance !== undefined && distance <= 200;

  return (
    <div className={`relative cursor-pointer group ${className}`}>
      {/* Ripple animation for user location */}
      {(type === 'user' || type === 'active-user') && animated && (
        <>
          <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping"></div>
          <div className="absolute inset-0 rounded-full bg-blue-400/10 animate-pulse"></div>
        </>
      )}
      
      {/* Proximity glow for nearby places */}
      {isNearby && animated && (
        <div className="absolute inset-0 rounded-full bg-green-400/30 animate-pulse"></div>
      )}
      
      {/* Main marker container */}
      <div className={`relative ${sizeClasses[size]} transition-all duration-300 group-hover:scale-110`}>
        {/* Shadow */}
        <div className="absolute inset-0 rounded-full bg-black/20 blur-sm transform translate-y-0.5"></div>
        
        {/* Outer ring */}
        <div className={`absolute inset-0 rounded-full ring-2 ${colors.ring} ${animated ? 'animate-pulse' : ''}`}></div>
        
        {/* Main marker body */}
        <div className={`
          absolute inset-0 rounded-full 
          bg-gradient-to-br ${colors.bg}
          border-2 border-white/90 
          shadow-lg ${colors.glow}
          flex items-center justify-center
          text-white
          transition-all duration-300
          group-hover:shadow-xl
          ${active ? 'ring-2 ring-white ring-offset-2' : ''}
        `}>
          {getMarkerIcon()}
        </div>
        
        {/* Active indicator */}
        {(active || type === 'active-user') && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-sm">
            <div className="absolute inset-1 bg-green-600 rounded-full animate-pulse"></div>
          </div>
        )}
        
        {/* Hot spot indicator for very close places */}
        {distance !== undefined && distance <= 100 && (
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-orange-400 to-red-500 rounded-full border-2 border-white animate-bounce flex items-center justify-center">
            <Zap className="w-2 h-2 text-white" />
          </div>
        )}
        
        {/* Cluster count badge */}
        {count && count > 1 && (
          <div className="absolute -top-3 -right-3 min-w-[20px] h-5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 border-2 border-white shadow-lg">
            {count > 99 ? '99+' : count}
          </div>
        )}
        
        {/* Special effects for premium locations */}
        {(active || isNearby) && animated && (
          <div className="absolute -top-1 -left-1 w-3 h-3">
            <Sparkles className="w-3 h-3 text-yellow-400 animate-pulse" />
          </div>
        )}
      </div>
      
      {/* Distance badge */}
      {distance !== undefined && distance <= 500 && (
        <div className="absolute -bottom-7 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap font-medium">
          {Math.round(distance)}m
        </div>
      )}
    </div>
  );
};

// High-performance CSS-only markers for better map performance
export const OptimizedMarker: React.FC<{ 
  type: 'user' | 'store' | 'cafe' | 'restaurant' | 'shop' | 'event'; 
  active?: boolean;
  distance?: number;
  size?: 'sm' | 'md' | 'lg';
}> = ({ type, active = false, distance, size = 'md' }) => {
  const sizeClass = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  const isNearby = distance !== undefined && distance <= 200;
  
  const getTypeEmoji = () => {
    switch (type) {
      case 'cafe': return '☕';
      case 'restaurant': return '🍽️';
      case 'shop': return '🛍️';
      case 'event': return '🎉';
      case 'user': return '📍';
      default: return '📍';
    }
  };

  const getBackgroundColor = () => {
    if (type === 'user') return 'bg-blue-500';
    if (isNearby) return 'bg-green-500';
    
    switch (type) {
      case 'cafe': return 'bg-amber-600';
      case 'restaurant': return 'bg-red-500';
      case 'shop': return 'bg-purple-500';
      case 'event': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={`relative ${sizeClass} cursor-pointer group`}>
      {/* Ripple for user */}
      {type === 'user' && (
        <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping"></div>
      )}
      
      {/* Main marker */}
      <div className={`
        relative w-full h-full rounded-full 
        ${getBackgroundColor()} 
        border-3 border-white 
        shadow-lg hover:shadow-xl 
        transition-all duration-300 
        hover:scale-110
        flex items-center justify-center
        text-white font-bold
        ${active ? 'ring-2 ring-white ring-offset-2' : ''}
      `}>
        <span className="text-sm">{getTypeEmoji()}</span>
      </div>
      
      {/* Active indicator */}
      {active && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
      )}
      
      {/* Hot spot for very close places */}
      {distance !== undefined && distance <= 100 && (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full border-2 border-white animate-bounce flex items-center justify-center">
          <span className="text-xs">⚡</span>
        </div>
      )}
      
      {/* Distance badge */}
      {distance !== undefined && distance <= 300 && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap">
          {Math.round(distance)}m
        </div>
      )}
    </div>
  );
};

export default ModernMarker;

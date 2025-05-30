
import React from 'react';
import { MapPin, Users, Store, Navigation, Zap, Radio } from 'lucide-react';

interface MarkerProps {
  type: 'user' | 'store' | 'cluster' | 'navigation' | 'active-user';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  active?: boolean;
  count?: number;
  className?: string;
  distance?: number;
}

export const ModernMarker: React.FC<MarkerProps> = ({ 
  type, 
  size = 'md', 
  active = false, 
  count,
  className = '',
  distance
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const renderMarkerContent = () => {
    switch (type) {
      case 'user':
      case 'active-user':
        return (
          <div className={`relative ${sizeClasses[size]} ${className}`}>
            {/* Multiple ripple effects */}
            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ripple"></div>
            <div className="absolute inset-0 rounded-full bg-blue-500/15 animate-ripple" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ripple" style={{ animationDelay: '1s' }}></div>
            
            {/* Outer glow ring */}
            <div className="absolute inset-1 rounded-full bg-gradient-to-br from-blue-400/40 to-blue-600/40 blur-sm"></div>
            
            {/* Main marker body */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-3 border-white shadow-lg">
              <div className="absolute inset-0 flex items-center justify-center">
                <Navigation className={`${iconSize[size]} text-white`} />
              </div>
            </div>
            
            {/* Center pulse */}
            <div className="absolute inset-3 rounded-full bg-blue-300 animate-pulse-gps"></div>
            
            {/* Active indicator for active user */}
            {type === 'active-user' && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-bounce-soft">
                <Radio className="w-2 h-2 text-white m-0.5" />
              </div>
            )}
          </div>
        );

      case 'store':
        return (
          <div className={`relative ${sizeClasses[size]} ${className}`}>
            {/* Shadow base */}
            <div className="absolute inset-0 rounded-full bg-black/15 blur-sm transform translate-y-1"></div>
            
            {/* Proximity glow based on distance */}
            {distance !== undefined && distance <= 200 && (
              <div className="absolute inset-0 rounded-full bg-green-400/30 animate-pulse-gps"></div>
            )}
            
            {/* Main marker */}
            <div className={`absolute inset-0 rounded-full ${
              active 
                ? 'bg-gradient-to-br from-green-400 via-green-500 to-green-600 shadow-lg shadow-green-500/40' 
                : distance !== undefined && distance <= 200
                ? 'bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 shadow-lg shadow-orange-500/40'
                : 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 shadow-lg shadow-orange-500/30'
            } border-3 border-white`}>
              <div className="absolute inset-0 flex items-center justify-center">
                <Store className={`${iconSize[size]} text-white`} />
              </div>
            </div>
            
            {/* Hot spot indicator for very close stores */}
            {distance !== undefined && distance <= 100 && (
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full border-2 border-white animate-bounce-soft flex items-center justify-center">
                <Zap className="w-2 h-2 text-white" />
              </div>
            )}
            
            {/* Active indicator */}
            {active && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse">
                <div className="absolute inset-1 bg-green-600 rounded-full"></div>
              </div>
            )}
            
            {/* Distance badge for nearby stores */}
            {distance !== undefined && distance <= 500 && (
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap">
                {Math.round(distance)}m
              </div>
            )}
          </div>
        );

      case 'cluster':
        return (
          <div className={`relative ${sizeClasses[size]} ${className}`}>
            {/* Pulsing background */}
            <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-pulse-gps"></div>
            
            {/* Shadow */}
            <div className="absolute inset-0 rounded-full bg-black/20 blur-sm transform translate-y-1"></div>
            
            {/* Main marker */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 border-3 border-white shadow-lg shadow-purple-500/40">
              <div className="absolute inset-0 flex items-center justify-center">
                <Users className={`${iconSize[size]} text-white`} />
              </div>
            </div>
            
            {/* Count badge */}
            {count && (
              <div className="absolute -top-2 -right-2 min-w-[24px] h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-2 border-2 border-white shadow-lg animate-bounce-soft">
                {count}
              </div>
            )}
            
            {/* Expanding ring for large clusters */}
            {count && count > 10 && (
              <div className="absolute inset-0 rounded-full border-2 border-purple-400 animate-pulse-gps"></div>
            )}
          </div>
        );

      case 'navigation':
        return (
          <div className={`relative ${sizeClasses[size]} ${className}`}>
            {/* Rotating outer ring */}
            <div className="absolute inset-0 rounded-full border-2 border-blue-400 border-dashed animate-spin"></div>
            
            {/* Pulsing middle ring */}
            <div className="absolute inset-1 rounded-full border border-blue-300 animate-pulse-gps"></div>
            
            {/* Main marker */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 border-2 border-white shadow-lg">
              <div className="absolute inset-0 flex items-center justify-center">
                <Navigation className={`${iconSize[size]} text-white transform rotate-45`} />
              </div>
            </div>
            
            {/* Direction indicator */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full animate-bounce-soft"></div>
          </div>
        );

      default:
        return (
          <div className={`relative ${sizeClasses[size]} ${className}`}>
            <div className="absolute inset-0 rounded-full bg-gray-500 border-2 border-white shadow-lg">
              <div className="absolute inset-0 flex items-center justify-center">
                <MapPin className={`${iconSize[size]} text-white`} />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="relative cursor-pointer transform transition-all duration-300 hover:scale-110 hover:z-50">
      {renderMarkerContent()}
    </div>
  );
};

// High-performance CSS-only markers for better map performance
export const CSSMarker: React.FC<{ 
  type: 'user' | 'store'; 
  active?: boolean;
  distance?: number;
}> = ({ type, active = false, distance }) => {
  if (type === 'user') {
    return (
      <div className="relative w-10 h-10">
        {/* Ripple effects */}
        <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ripple"></div>
        <div className="absolute inset-2 rounded-full bg-blue-500 border-3 border-white shadow-lg">
          <div className="absolute inset-0 flex items-center justify-center text-white text-xs">
            📍
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-10 h-10 ${
      active 
        ? 'bg-green-500 shadow-green-500/50' 
        : distance && distance <= 200
        ? 'bg-orange-500 shadow-orange-500/50'
        : 'bg-orange-500 shadow-orange-500/50'
    } rounded-full border-3 border-white shadow-lg cursor-pointer transform transition-all duration-300 hover:scale-110`}>
      <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
        🏪
      </div>
      {active && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
      )}
      {distance && distance <= 100 && (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full border-2 border-white animate-bounce-soft flex items-center justify-center">
          ⚡
        </div>
      )}
    </div>
  );
};

// Customizable marker for admin panel
export const AdminEditableMarker: React.FC<{
  type: string;
  iconName: string;
  color: string;
  size: string;
  animated: boolean;
}> = ({ type, iconName, color, size, animated }) => {
  const sizeClass = size === 'small' ? 'w-6 h-6' : size === 'large' ? 'w-12 h-12' : 'w-8 h-8';
  const animationClass = animated ? 'animate-pulse-gps' : '';
  
  return (
    <div className={`relative ${sizeClass} ${animationClass}`}>
      <div 
        className="absolute inset-0 rounded-full border-3 border-white shadow-lg flex items-center justify-center text-white font-bold"
        style={{ backgroundColor: color }}
      >
        {iconName === 'store' ? '🏪' : iconName === 'cafe' ? '☕' : iconName === 'restaurant' ? '🍽️' : '📍'}
      </div>
    </div>
  );
};

export default ModernMarker;

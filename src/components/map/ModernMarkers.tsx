
import React from 'react';
import { MapPin, Users, Store, Navigation } from 'lucide-react';

interface MarkerProps {
  type: 'user' | 'store' | 'cluster' | 'navigation';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  count?: number;
  className?: string;
}

export const ModernMarker: React.FC<MarkerProps> = ({ 
  type, 
  size = 'md', 
  active = false, 
  count,
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  };

  const renderMarkerContent = () => {
    switch (type) {
      case 'user':
        return (
          <div className={`relative ${sizeClasses[size]} ${className}`}>
            {/* Pulsing outer ring */}
            <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-pulse-gps"></div>
            {/* Middle ring */}
            <div className="absolute inset-1 rounded-full bg-blue-500/50"></div>
            {/* Inner dot */}
            <div className="absolute inset-2 rounded-full bg-blue-500 border-2 border-white shadow-lg"></div>
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Navigation className={`${iconSize[size]} text-white`} />
            </div>
          </div>
        );

      case 'store':
        return (
          <div className={`relative ${sizeClasses[size]} ${className}`}>
            {/* Shadow */}
            <div className="absolute inset-0 rounded-full bg-black/20 blur-sm transform translate-y-1"></div>
            {/* Main marker */}
            <div className={`absolute inset-0 rounded-full ${
              active 
                ? 'bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/30' 
                : 'bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/30'
            } border-3 border-white`}>
              <div className="absolute inset-0 flex items-center justify-center">
                <Store className={`${iconSize[size]} text-white`} />
              </div>
            </div>
            {/* Active indicator */}
            {active && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
            )}
          </div>
        );

      case 'cluster':
        return (
          <div className={`relative ${sizeClasses[size]} ${className}`}>
            {/* Shadow */}
            <div className="absolute inset-0 rounded-full bg-black/20 blur-sm transform translate-y-1"></div>
            {/* Main marker */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 border-3 border-white shadow-lg shadow-purple-500/30">
              <div className="absolute inset-0 flex items-center justify-center">
                <Users className={`${iconSize[size]} text-white`} />
              </div>
            </div>
            {/* Count badge */}
            {count && (
              <div className="absolute -top-2 -right-2 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 border-2 border-white shadow-lg">
                {count}
              </div>
            )}
          </div>
        );

      case 'navigation':
        return (
          <div className={`relative ${sizeClasses[size]} ${className}`}>
            {/* Rotating outer ring */}
            <div className="absolute inset-0 rounded-full border-2 border-blue-400 border-dashed animate-spin"></div>
            {/* Main marker */}
            <div className="absolute inset-1 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white shadow-lg">
              <div className="absolute inset-0 flex items-center justify-center">
                <Navigation className={`${iconSize[size]} text-white`} />
              </div>
            </div>
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
    <div className="relative cursor-pointer transform transition-transform hover:scale-110">
      {renderMarkerContent()}
    </div>
  );
};

// CSS-only markers for better performance
export const CSSMarker: React.FC<{ type: 'user' | 'store'; active?: boolean }> = ({ 
  type, 
  active = false 
}) => {
  if (type === 'user') {
    return (
      <div className="gps-marker w-8 h-8">
        <div className="absolute inset-2 flex items-center justify-center text-white font-bold text-xs">
          📍
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-8 h-8 ${
      active 
        ? 'bg-green-500 shadow-green-500/50' 
        : 'bg-orange-500 shadow-orange-500/50'
    } rounded-full border-3 border-white shadow-lg cursor-pointer transform transition-transform hover:scale-110`}>
      <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">
        🏪
      </div>
      {active && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
      )}
    </div>
  );
};

export default ModernMarker;

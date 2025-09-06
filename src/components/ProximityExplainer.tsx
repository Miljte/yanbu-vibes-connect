import React from 'react';
import { MapPin, MessageSquare, Users, Radius } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ProximityExplainerProps {
  isInYanbu: boolean;
  onDismiss: () => void;
}

const ProximityExplainer: React.FC<ProximityExplainerProps> = ({ isInYanbu, onDismiss }) => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full animate-scale-in">
        <CardContent className="p-6 text-center space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary/70 rounded-full flex items-center justify-center mx-auto">
              <Radius className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Welcome to Yanbu Vibes!</h2>
            <p className="text-muted-foreground">
              Connect with people and places within 500 meters of your location
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-medium">Location-Based Discovery</p>
                <p className="text-sm text-muted-foreground">Find nearby places and events</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-left">
                <p className="font-medium">Proximity Chat</p>
                <p className="text-sm text-muted-foreground">
                  {isInYanbu ? 'Chat unlocked! Talk to people nearby' : 'Available when you\'re in Yanbu'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-left">
                <p className="font-medium">Local Community</p>
                <p className="text-sm text-muted-foreground">Join events and connect with locals</p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className={`p-4 rounded-lg border-2 ${
            isInYanbu 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-orange-50 border-orange-200 text-orange-800'
          }`}>
            <p className="font-medium">
              {isInYanbu 
                ? '✅ You\'re in Yanbu! All features unlocked'
                : '📍 Move to Yanbu to unlock proximity chat'
              }
            </p>
          </div>

          {/* Action */}
          <button
            onClick={onDismiss}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Start Exploring
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProximityExplainer;

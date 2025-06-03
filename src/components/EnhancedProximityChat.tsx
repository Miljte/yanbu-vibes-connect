
import React from 'react';
import MerchantChatRoom from './MerchantChatRoom';

interface EnhancedProximityChatProps {
  placeId?: string;
  onBack?: () => void;
}

const EnhancedProximityChat: React.FC<EnhancedProximityChatProps> = ({ placeId, onBack }) => {
  if (!placeId) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="bg-card border max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <h2 className="text-xl font-bold text-foreground">No Chat Selected</h2>
            <p className="text-muted-foreground">Please select a place to access chat.</p>
            {onBack && (
              <Button onClick={onBack} className="w-full">
                Back to Map
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <MerchantChatRoom placeId={placeId} onBack={onBack} />;
};

export default EnhancedProximityChat;

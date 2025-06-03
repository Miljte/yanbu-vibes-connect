
import React from 'react';
import MerchantChatRoom from './MerchantChatRoom';

interface EnhancedProximityChatProps {
  placeId: string;
  onBack?: () => void;
}

const EnhancedProximityChat: React.FC<EnhancedProximityChatProps> = ({ placeId, onBack }) => {
  return <MerchantChatRoom placeId={placeId} onBack={onBack} />;
};

export default EnhancedProximityChat;

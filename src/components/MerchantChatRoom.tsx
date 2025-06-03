
import React from 'react';
import ReliableChatRoom from './ReliableChatRoom';

interface MerchantChatRoomProps {
  placeId: string;
  onBack?: () => void;
}

const MerchantChatRoom: React.FC<MerchantChatRoomProps> = ({ placeId, onBack }) => {
  return <ReliableChatRoom placeId={placeId} onBack={onBack} />;
};

export default MerchantChatRoom;

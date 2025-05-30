
import React, { useState, useRef, useEffect } from 'react';
import { Send, MapPin, Users, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLocalization } from '@/contexts/LocalizationContext';

interface Message {
  id: string;
  user: string;
  message: string;
  timestamp: Date;
  type: 'user' | 'merchant' | 'system';
}

const LocationChat = () => {
  const { t, isRTL } = useLocalization();
  const [selectedLocation, setSelectedLocation] = useState('ستاربكس وسط المدينة');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      user: 'أحمد_92',
      message: 'مرحباً! هل هناك أحد هنا لمجموعة الدراسة؟',
      timestamp: new Date(Date.now() - 300000),
      type: 'user'
    },
    {
      id: '2',
      user: 'ستاربكس_الرسمي',
      message: '🔥 عرض خاص: اشتري 2 واحصل على 1 مجاناً على جميع الفرابتشينو حتى الساعة 6 مساءً!',
      timestamp: new Date(Date.now() - 180000),
      type: 'merchant'
    },
    {
      id: '3',
      user: 'سارة_ك',
      message: 'التوقيت مثالي! وصلت للتو',
      timestamp: new Date(Date.now() - 120000),
      type: 'user'
    },
    {
      id: '4',
      user: 'النظام',
      message: 'انضم مايك_87 إلى المحادثة',
      timestamp: new Date(Date.now() - 60000),
      type: 'system'
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isNearby, setIsNearby] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = () => {
    if (newMessage.trim() && isNearby) {
      const message: Message = {
        id: Date.now().toString(),
        user: 'أنت',
        message: newMessage,
        timestamp: new Date(),
        type: 'user'
      };
      setMessages([...messages, message]);
      setNewMessage('');
    }
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('ar-SA', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageStyle = (type: string) => {
    switch (type) {
      case 'merchant':
        return 'bg-orange-600/20 border-l-4 border-orange-500 text-orange-100';
      case 'system':
        return 'bg-slate-700/30 text-slate-400 text-center text-sm';
      default:
        return 'bg-slate-700/50 text-white';
    }
  };

  const locations = [
    { name: 'ستاربكس وسط المدينة', distance: 0.1, users: 12 },
    { name: 'مول سيف ينبع', distance: 1.2, users: 45 },
    { name: 'كورنيش ينبع', distance: 0.8, users: 23 },
    { name: 'شاطئ الفناتير', distance: 2.1, users: 8 }
  ];

  return (
    <div id="chat" className={`min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 ${isRTL ? 'font-arabic' : 'font-streetwear'}`}>
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">{t('chat.locationChats')}</h2>
          <p className="text-slate-300">تواصل مع الأشخاص القريبين منك - تفتح المحادثة خلال 500 متر</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Location List */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-lg">{t('chat.nearbyLocations')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {locations.map((location) => (
                  <div
                    key={location.name}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedLocation === location.name
                        ? 'bg-cyan-600/30 border border-cyan-500'
                        : 'bg-slate-700/30 hover:bg-slate-700/50'
                    }`}
                    onClick={() => setSelectedLocation(location.name)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-medium text-sm">{location.name}</h3>
                      {location.distance <= 0.5 && (
                        <Badge variant="secondary" className="bg-green-600 text-white text-xs">
                          {t('chat.available')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-slate-400">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>{location.distance} كم</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>{location.users}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm h-[600px] flex flex-col">
              <CardHeader className="border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">{selectedLocation}</CardTitle>
                    <p className="text-slate-400 text-sm">
                      {isNearby ? '12 شخص قريب' : 'اقترب إلى 500 متر للانضمام للمحادثة'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="outline" 
                      className={`${isNearby ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400'}`}
                    >
                      {isNearby ? t('map.inRange') : t('map.tooFar')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 p-4 overflow-y-auto">
                {!isNearby ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-slate-400">
                      <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">اقترب أكثر للانضمام</h3>
                      <p className="text-sm">تحرك إلى مسافة 500 متر من {selectedLocation} لفتح المحادثة</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div key={message.id} className={`p-3 rounded-lg ${getMessageStyle(message.type)}`}>
                        {message.type !== 'system' && (
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">
                              {message.type === 'merchant' ? '🏪 ' : ''}{message.user}
                            </span>
                            <span className="text-xs opacity-70 flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatTime(message.timestamp)}</span>
                            </span>
                          </div>
                        )}
                        <p className={message.type === 'system' ? 'text-xs' : 'text-sm'}>
                          {message.message}
                        </p>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </CardContent>

              {/* Message Input */}
              <div className="border-t border-slate-700 p-4">
                <div className="flex space-x-3">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isNearby ? t('chat.typeMessage') : t('chat.getCloserToChat')}
                    disabled={!isNearby}
                    className="flex-1 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || !isNearby}
                    className="bg-cyan-600 hover:bg-cyan-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  محادثة مجهولة • لا رسائل خاصة • كن محترماً
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationChat;

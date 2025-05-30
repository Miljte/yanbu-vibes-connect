
import React from 'react';
import { MapPin, RefreshCw, Calendar, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocalization } from '@/contexts/LocalizationContext';

interface LocationRestrictionScreenProps {
  onRetry: () => void;
  isChecking: boolean;
  onNavigateToEvents: () => void;
  onNavigateToProfile: () => void;
}

const LocationRestrictionScreen: React.FC<LocationRestrictionScreenProps> = ({ 
  onRetry, 
  isChecking, 
  onNavigateToEvents, 
  onNavigateToProfile 
}) => {
  const { t, isRTL } = useLocalization();

  return (
    <div className={`min-h-screen bg-background flex items-center justify-center p-4 ${isRTL ? 'font-arabic' : 'font-streetwear'}`}>
      <Card className="max-w-md w-full bg-card border">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{t('location.mapRestricted')}</h2>
            <p className="text-muted-foreground">
              {t('location.limitedToYanbu')} {t('location.stillAccess')}
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                تم تقييد ميزات خريطة بوب إن حالياً داخل حدود مدينة ينبع فقط للحصول على أفضل تجربة محلية.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={onNavigateToEvents}
                variant="outline"
                className="w-full"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {t('nav.events')}
              </Button>
              <Button 
                onClick={onNavigateToProfile}
                variant="outline"
                className="w-full"
              >
                <User className="w-4 h-4 mr-2" />
                {t('nav.profile')}
              </Button>
            </div>
            
            <Button 
              onClick={onRetry}
              disabled={isChecking}
              className="w-full"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {t('map.checkingLocation')}
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  {t('location.checkAgain')}
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground">
              تأكد من تمكين خدمات الموقع وأنك موجود فعلياً في ينبع.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LocationRestrictionScreen;

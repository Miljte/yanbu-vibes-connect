
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, MessageSquare, Users, Settings, ChevronRight, ChevronLeft } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useTheme } from '@/contexts/ThemeContext';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  image?: string;
}

interface OnboardingTutorialProps {
  onComplete: () => void;
  isOpen: boolean;
}

const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ onComplete, isOpen }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { t, isRTL } = useLocalization();
  const { isDark } = useTheme();

  const steps: OnboardingStep[] = [
    {
      title: t('onboarding.welcome'),
      description: t('onboarding.welcomeDesc'),
      icon: <Users className="w-12 h-12 text-primary" />,
    },
    {
      title: t('onboarding.discoverPlaces'),
      description: t('onboarding.discoverDesc'),
      icon: <MapPin className="w-12 h-12 text-primary" />,
    },
    {
      title: t('onboarding.proximityChat'),
      description: t('onboarding.chatDesc'),
      icon: <MessageSquare className="w-12 h-12 text-primary" />,
    },
    {
      title: t('onboarding.customize'),
      description: t('onboarding.customizeDesc'),
      icon: <Settings className="w-12 h-12 text-primary" />,
    },
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto bg-background border shadow-2xl animate-scale-in">
        <CardContent className="p-6">
          <div className="text-center space-y-6">
            {/* Progress indicators */}
            <div className="flex justify-center space-x-2 mb-6">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            {/* Step content */}
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-center">
                {steps[currentStep].icon}
              </div>
              
              <h2 className="text-2xl font-bold text-foreground">
                {steps[currentStep].title}
              </h2>
              
              <p className="text-muted-foreground leading-relaxed">
                {steps[currentStep].description}
              </p>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between items-center pt-6">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className={`${isRTL ? 'order-2' : ''}`}
              >
                {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                {t('common.back')}
              </Button>

              <span className="text-sm text-muted-foreground">
                {currentStep + 1} / {steps.length}
              </span>

              <Button
                onClick={nextStep}
                className={`${isRTL ? 'order-1' : ''}`}
              >
                {currentStep === steps.length - 1 ? t('onboarding.getStarted') : t('common.next')}
                {isRTL ? <ChevronLeft className="w-4 h-4 ml-2" /> : <ChevronRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>

            {/* Skip button */}
            <button
              onClick={onComplete}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('onboarding.skip')}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingTutorial;


import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, MapPin, MessageSquare, Calendar, Award } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLocalization } from '@/contexts/LocalizationContext';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  category: 'exploration' | 'social' | 'streak' | 'special';
}

interface UserStats {
  placesVisited: number;
  messagesCount: number;
  dayStreak: number;
  totalPoints: number;
  level: number;
}

const GamificationSystem: React.FC = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    placesVisited: 0,
    messagesCount: 0,
    dayStreak: 0,
    totalPoints: 0,
    level: 1,
  });
  const [showNewAchievement, setShowNewAchievement] = useState<Achievement | null>(null);
  const { user } = useAuth();
  const { t } = useLocalization();

  const achievementTemplates: Omit<Achievement, 'progress' | 'unlocked'>[] = [
    {
      id: 'first_visit',
      title: t('achievements.firstVisit'),
      description: t('achievements.firstVisitDesc'),
      icon: <MapPin className="w-6 h-6" />,
      maxProgress: 1,
      category: 'exploration',
    },
    {
      id: 'explorer',
      title: t('achievements.explorer'),
      description: t('achievements.explorerDesc'),
      icon: <Star className="w-6 h-6" />,
      maxProgress: 5,
      category: 'exploration',
    },
    {
      id: 'social_butterfly',
      title: t('achievements.socialButterfly'),
      description: t('achievements.socialButterflyDesc'),
      icon: <MessageSquare className="w-6 h-6" />,
      maxProgress: 50,
      category: 'social',
    },
    {
      id: 'streak_master',
      title: t('achievements.streakMaster'),
      description: t('achievements.streakMasterDesc'),
      icon: <Calendar className="w-6 h-6" />,
      maxProgress: 7,
      category: 'streak',
    },
    {
      id: 'yanbu_expert',
      title: t('achievements.yanbuExpert'),
      description: t('achievements.yanbuExpertDesc'),
      icon: <Trophy className="w-6 h-6" />,
      maxProgress: 20,
      category: 'special',
    },
  ];

  useEffect(() => {
    if (user) {
      fetchUserStats();
      initializeAchievements();
    }
  }, [user]);

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      // Fetch user statistics from various tables
      const [profileResult, visitsResult, messagesResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('user_place_visits').select('place_id').eq('user_id', user.id),
        supabase.from('chat_messages').select('id').eq('user_id', user.id),
      ]);

      const profile = profileResult.data;
      const uniquePlaces = new Set(visitsResult.data?.map(v => v.place_id)).size;
      const messageCount = messagesResult.data?.length || 0;

      const newStats: UserStats = {
        placesVisited: uniquePlaces,
        messagesCount: messageCount,
        dayStreak: profile?.day_streak || 0,
        totalPoints: profile?.points || 0,
        level: Math.floor((profile?.points || 0) / 100) + 1,
      };

      setUserStats(newStats);
      updateAchievements(newStats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const initializeAchievements = () => {
    const initialAchievements = achievementTemplates.map(template => ({
      ...template,
      progress: 0,
      unlocked: false,
    }));
    setAchievements(initialAchievements);
  };

  const updateAchievements = (stats: UserStats) => {
    const updatedAchievements = achievements.map(achievement => {
      let progress = 0;
      
      switch (achievement.id) {
        case 'first_visit':
          progress = Math.min(stats.placesVisited, 1);
          break;
        case 'explorer':
          progress = Math.min(stats.placesVisited, 5);
          break;
        case 'social_butterfly':
          progress = Math.min(stats.messagesCount, 50);
          break;
        case 'streak_master':
          progress = Math.min(stats.dayStreak, 7);
          break;
        case 'yanbu_expert':
          progress = Math.min(stats.placesVisited, 20);
          break;
        default:
          progress = achievement.progress;
      }

      const wasUnlocked = achievement.unlocked;
      const isNowUnlocked = progress >= achievement.maxProgress;

      // Show new achievement notification
      if (!wasUnlocked && isNowUnlocked) {
        setShowNewAchievement({ ...achievement, progress, unlocked: true });
        toast.success(`🏆 Achievement Unlocked: ${achievement.title}!`);
        setTimeout(() => setShowNewAchievement(null), 5000);
        
        // Award points for achievement
        awardPoints(achievement.category === 'special' ? 100 : 50);
      }

      return {
        ...achievement,
        progress,
        unlocked: isNowUnlocked,
      };
    });

    setAchievements(updatedAchievements);
  };

  const awardPoints = async (points: number) => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ 
          points: (userStats.totalPoints + points)
        })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  };

  const getCategoryColor = (category: Achievement['category']) => {
    switch (category) {
      case 'exploration': return 'bg-blue-500';
      case 'social': return 'bg-green-500';
      case 'streak': return 'bg-orange-500';
      case 'special': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryIcon = (category: Achievement['category']) => {
    switch (category) {
      case 'exploration': return <MapPin className="w-4 h-4" />;
      case 'social': return <MessageSquare className="w-4 h-4" />;
      case 'streak': return <Calendar className="w-4 h-4" />;
      case 'special': return <Award className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* User Level & Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span>{t('gamification.level')} {userStats.level}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{userStats.totalPoints} {t('gamification.points')}</span>
            <span>{userStats.level * 100} {t('gamification.points')}</span>
          </div>
          <Progress 
            value={(userStats.totalPoints % 100)} 
            className="h-2"
          />
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{userStats.placesVisited}</div>
              <div className="text-xs text-muted-foreground">{t('gamification.placesVisited')}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{userStats.messagesCount}</div>
              <div className="text-xs text-muted-foreground">{t('gamification.messages')}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{userStats.dayStreak}</div>
              <div className="text-xs text-muted-foreground">{t('gamification.dayStreak')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle>{t('gamification.achievements')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-4 rounded-lg border transition-all ${
                  achievement.unlocked 
                    ? 'bg-primary/10 border-primary/20' 
                    : 'bg-muted/50 border-muted'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full ${getCategoryColor(achievement.category)} text-white flex-shrink-0`}>
                    {achievement.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium">{achievement.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {getCategoryIcon(achievement.category)}
                        <span className="ml-1 capitalize">{achievement.category}</span>
                      </Badge>
                      {achievement.unlocked && (
                        <Badge className="bg-green-500 text-white text-xs">
                          {t('gamification.unlocked')}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {achievement.description}
                    </p>
                    
                    <div className="flex items-center space-x-2">
                      <Progress 
                        value={(achievement.progress / achievement.maxProgress) * 100} 
                        className="flex-1 h-2"
                      />
                      <span className="text-xs text-muted-foreground">
                        {achievement.progress}/{achievement.maxProgress}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* New Achievement Popup */}
      {showNewAchievement && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-slide-in-right">
          <Card className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 shadow-2xl">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Trophy className="w-8 h-8" />
                <div>
                  <div className="font-bold">{t('gamification.achievementUnlocked')}</div>
                  <div className="text-sm opacity-90">{showNewAchievement.title}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GamificationSystem;

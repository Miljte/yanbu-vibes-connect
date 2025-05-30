
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Star, 
  MapPin, 
  MessageSquare, 
  Calendar,
  Award,
  Target,
  Zap
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

interface UserStats {
  placesVisited: number;
  messagesSent: number;
  daysActive: number;
  level: number;
  totalPoints: number;
  lastDailyReward: string | null;
}

const GamificationSystem: React.FC = () => {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats>({
    placesVisited: 0,
    messagesSent: 0,
    daysActive: 1,
    level: 1,
    totalPoints: 0,
    lastDailyReward: null
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserStats();
      setupRealtimeSubscription();
    }
  }, [user]);

  const setupRealtimeSubscription = () => {
    if (!user) return;

    const channel = supabase
      .channel('user-stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_stats',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newData = payload.new as any;
            setUserStats(prev => ({
              placesVisited: newData.places_visited || 0,
              messagesSent: newData.messages_sent || 0,
              daysActive: newData.days_active || 1,
              level: newData.level || 1,
              totalPoints: newData.total_points || 0,
              lastDailyReward: newData.last_daily_reward
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      // First try to get existing stats
      const { data: existingStats, error: fetchError } = await supabase
        .rpc('execute_sql', {
          query: `SELECT * FROM user_stats WHERE user_id = '${user.id}'`
        });

      if (fetchError) {
        console.log('Stats table might not exist yet, using defaults');
        setUserStats({
          placesVisited: 0,
          messagesSent: 0,
          daysActive: 1,
          level: 1,
          totalPoints: 0,
          lastDailyReward: null
        });
      } else if (existingStats && existingStats.length > 0) {
        const stats = existingStats[0];
        setUserStats({
          placesVisited: stats.places_visited || 0,
          messagesSent: stats.messages_sent || 0,
          daysActive: stats.days_active || 1,
          level: stats.level || 1,
          totalPoints: stats.total_points || 0,
          lastDailyReward: stats.last_daily_reward
        });
      } else {
        // Create initial stats record using SQL function
        await supabase.rpc('execute_sql', {
          query: `
            INSERT INTO user_stats (user_id, places_visited, messages_sent, days_active, level, total_points)
            VALUES ('${user.id}', 0, 0, 1, 1, 0)
            ON CONFLICT (user_id) DO NOTHING
          `
        });
      }

      initializeAchievements();
    } catch (error) {
      console.error('Error fetching user stats:', error);
      // Fallback to defaults
      setUserStats({
        placesVisited: 0,
        messagesSent: 0,
        daysActive: 1,
        level: 1,
        totalPoints: 0,
        lastDailyReward: null
      });
      initializeAchievements();
    } finally {
      setLoading(false);
    }
  };

  const initializeAchievements = () => {
    const achievementsList: Achievement[] = [
      {
        id: 'first_message',
        name: 'First Steps',
        description: 'Send your first message',
        icon: <MessageSquare className="w-6 h-6" />,
        unlocked: userStats.messagesSent >= 1,
        progress: Math.min(userStats.messagesSent, 1),
        maxProgress: 1
      },
      {
        id: 'social_butterfly',
        name: 'Social Butterfly',
        description: 'Send 10 messages',
        icon: <MessageSquare className="w-6 h-6" />,
        unlocked: userStats.messagesSent >= 10,
        progress: Math.min(userStats.messagesSent, 10),
        maxProgress: 10
      },
      {
        id: 'explorer',
        name: 'Explorer',
        description: 'Visit 5 different places',
        icon: <MapPin className="w-6 h-6" />,
        unlocked: userStats.placesVisited >= 5,
        progress: Math.min(userStats.placesVisited, 5),
        maxProgress: 5
      },
      {
        id: 'active_week',
        name: 'Week Warrior',
        description: 'Stay active for 7 days',
        icon: <Calendar className="w-6 h-6" />,
        unlocked: userStats.daysActive >= 7,
        progress: Math.min(userStats.daysActive, 7),
        maxProgress: 7
      },
      {
        id: 'level_up',
        name: 'Level Up',
        description: 'Reach level 5',
        icon: <Star className="w-6 h-6" />,
        unlocked: userStats.level >= 5,
        progress: Math.min(userStats.level, 5),
        maxProgress: 5
      }
    ];

    setAchievements(achievementsList);
  };

  const claimDailyReward = async () => {
    if (!user) return;

    try {
      const today = new Date().toDateString();
      const lastReward = userStats.lastDailyReward ? new Date(userStats.lastDailyReward).toDateString() : null;
      
      if (lastReward === today) {
        toast.error('Daily reward already claimed today!');
        return;
      }

      const points = 50;
      const newTotalPoints = userStats.totalPoints + points;
      const newLevel = Math.floor(newTotalPoints / 100) + 1;
      
      // Update using SQL since table might not be in types yet
      await supabase.rpc('execute_sql', {
        query: `
          UPDATE user_stats 
          SET 
            total_points = ${newTotalPoints},
            level = ${newLevel},
            last_daily_reward = '${new Date().toISOString()}',
            updated_at = '${new Date().toISOString()}'
          WHERE user_id = '${user.id}'
        `
      });

      // Update local state
      setUserStats(prev => ({
        ...prev,
        totalPoints: newTotalPoints,
        level: newLevel,
        lastDailyReward: new Date().toISOString()
      }));

      toast.success(`Daily reward claimed! +${points} points`);
    } catch (error) {
      console.error('Error claiming daily reward:', error);
      toast.error('Failed to claim daily reward');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading stats...</div>
        </CardContent>
      </Card>
    );
  }

  const canClaimDailyReward = () => {
    if (!userStats.lastDailyReward) return true;
    const today = new Date().toDateString();
    const lastReward = new Date(userStats.lastDailyReward).toDateString();
    return lastReward !== today;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span>Gamification & Rewards</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Level & Points */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Star className="w-6 h-6 text-yellow-500" />
            <span className="text-2xl font-bold">Level {userStats.level}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {userStats.totalPoints} total points
          </div>
          <Progress 
            value={(userStats.totalPoints % 100)} 
            className="w-full"
          />
          <div className="text-xs text-muted-foreground">
            {100 - (userStats.totalPoints % 100)} points to next level
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <MessageSquare className="w-6 h-6 mx-auto mb-1 text-blue-500" />
            <div className="text-lg font-semibold">{userStats.messagesSent}</div>
            <div className="text-xs text-muted-foreground">Messages</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <MapPin className="w-6 h-6 mx-auto mb-1 text-green-500" />
            <div className="text-lg font-semibold">{userStats.placesVisited}</div>
            <div className="text-xs text-muted-foreground">Places</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <Calendar className="w-6 h-6 mx-auto mb-1 text-purple-500" />
            <div className="text-lg font-semibold">{userStats.daysActive}</div>
            <div className="text-xs text-muted-foreground">Days Active</div>
          </div>
        </div>

        {/* Daily Reward */}
        <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              <div>
                <div className="font-medium">Daily Reward</div>
                <div className="text-sm text-muted-foreground">
                  {canClaimDailyReward() ? 'Claim 50 points' : 'Come back tomorrow'}
                </div>
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={claimDailyReward}
              disabled={!canClaimDailyReward()}
            >
              {canClaimDailyReward() ? 'Claim' : 'Claimed'}
            </Button>
          </div>
        </div>

        {/* Achievements */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center space-x-2">
            <Award className="w-4 h-4" />
            <span>Achievements</span>
          </h3>
          <div className="space-y-2">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-3 rounded-lg border transition-colors ${
                  achievement.unlocked 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-muted border-muted-foreground/20'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`${achievement.unlocked ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{achievement.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {achievement.description}
                    </div>
                    {!achievement.unlocked && (
                      <Progress 
                        value={(achievement.progress / achievement.maxProgress) * 100} 
                        className="w-full mt-2 h-2"
                      />
                    )}
                  </div>
                  {achievement.unlocked && (
                    <Badge className="bg-green-500">
                      Unlocked
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GamificationSystem;

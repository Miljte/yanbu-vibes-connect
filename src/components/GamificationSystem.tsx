
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
}

const GamificationSystem: React.FC = () => {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats>({
    placesVisited: 0,
    messagesSent: 0,
    daysActive: 1,
    level: 1,
    totalPoints: 0
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserStats();
      initializeAchievements();
    }
  }, [user]);

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      // Get messages sent by user
      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id);

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
      }

      // Get user profile to check activity
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // Calculate stats based on available data
      const messagesSent = messages?.length || 0;
      const daysActive = profile ? 
        Math.max(1, Math.floor((new Date().getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))) : 1;
      
      // Simple point calculation
      const totalPoints = (messagesSent * 10) + (daysActive * 5);
      const level = Math.floor(totalPoints / 100) + 1;

      setUserStats({
        placesVisited: 0, // This would need a separate tracking table
        messagesSent,
        daysActive,
        level,
        totalPoints
      });

    } catch (error) {
      console.error('Error fetching user stats:', error);
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
      // In a real implementation, you'd check if the user already claimed today
      const points = 50;
      
      setUserStats(prev => ({
        ...prev,
        totalPoints: prev.totalPoints + points
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
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <MessageSquare className="w-6 h-6 mx-auto mb-1 text-blue-500" />
            <div className="text-lg font-semibold">{userStats.messagesSent}</div>
            <div className="text-xs text-muted-foreground">Messages</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <Calendar className="w-6 h-6 mx-auto mb-1 text-green-500" />
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
                <div className="text-sm text-muted-foreground">Claim 50 points</div>
              </div>
            </div>
            <Button size="sm" onClick={claimDailyReward}>
              Claim
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

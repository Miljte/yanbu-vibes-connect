
import React, { useState } from 'react';
import { User, MapPin, Heart, Calendar, Settings, Edit3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const UserProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    nickname: 'Ahmed_92',
    age: 25,
    gender: 'Male',
    location: 'Yanbu, Saudi Arabia',
    interests: ['Technology', 'Coffee', 'Sports', 'Photography'],
    joinDate: new Date('2024-01-15'),
    eventsAttended: 12,
    placesVisited: 28,
    chatMessages: 156
  });

  const availableInterests = [
    'Technology', 'Coffee', 'Sports', 'Photography', 'Music', 'Art', 
    'Food', 'Travel', 'Gaming', 'Books', 'Fashion', 'Fitness'
  ];

  const recentActivity = [
    { type: 'event', title: 'Joined Beach Volleyball Tournament', time: '2 hours ago' },
    { type: 'chat', title: 'Chatted at Starbucks Downtown', time: '5 hours ago' },
    { type: 'location', title: 'Visited Seef Mall Yanbu', time: '1 day ago' },
    { type: 'event', title: 'Attended Tech Meetup', time: '3 days ago' }
  ];

  const toggleInterest = (interest: string) => {
    setProfile(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'event': return '📅';
      case 'chat': return '💬';
      case 'location': return '📍';
      default: return '✨';
    }
  };

  return (
    <div id="profile" className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">My Profile</h2>
          <p className="text-slate-300">Manage your account and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full mx-auto flex items-center justify-center mb-4">
                  <User className="w-12 h-12 text-white" />
                </div>
                <CardTitle className="text-white">{profile.nickname}</CardTitle>
                <p className="text-slate-400 text-sm">Member since {profile.joinDate.toLocaleDateString()}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <Button
                    onClick={() => setIsEditing(!isEditing)}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:text-white hover:border-cyan-500"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    {isEditing ? 'Save Changes' : 'Edit Profile'}
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-cyan-500" />
                    <span className="text-sm">{profile.location}</span>
                  </div>
                  
                  {profile.age && (
                    <div className="flex items-center space-x-2 text-slate-300">
                      <User className="w-4 h-4 text-cyan-500" />
                      <span className="text-sm">{profile.age} years old • {profile.gender}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-700">
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">{profile.eventsAttended}</div>
                    <div className="text-xs text-slate-400">Events</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">{profile.placesVisited}</div>
                    <div className="text-xs text-slate-400">Places</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">{profile.chatMessages}</div>
                    <div className="text-xs text-slate-400">Messages</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="info" className="space-y-6">
              <TabsList className="bg-slate-800 border-slate-700">
                <TabsTrigger value="info" className="data-[state=active]:bg-cyan-600">Profile Info</TabsTrigger>
                <TabsTrigger value="activity" className="data-[state=active]:bg-cyan-600">Activity</TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-cyan-600">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="info">
                <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Nickname</label>
                        {isEditing ? (
                          <Input
                            value={profile.nickname}
                            onChange={(e) => setProfile(prev => ({ ...prev, nickname: e.target.value }))}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        ) : (
                          <div className="text-white bg-slate-700/30 p-3 rounded-lg">{profile.nickname}</div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Age</label>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={profile.age}
                              onChange={(e) => setProfile(prev => ({ ...prev, age: parseInt(e.target.value) }))}
                              className="bg-slate-700 border-slate-600 text-white"
                            />
                          ) : (
                            <div className="text-white bg-slate-700/30 p-3 rounded-lg">{profile.age}</div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Gender</label>
                          {isEditing ? (
                            <select 
                              value={profile.gender}
                              onChange={(e) => setProfile(prev => ({ ...prev, gender: e.target.value }))}
                              className="w-full bg-slate-700 border-slate-600 text-white p-3 rounded-lg"
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Prefer not to say">Prefer not to say</option>
                            </select>
                          ) : (
                            <div className="text-white bg-slate-700/30 p-3 rounded-lg">{profile.gender}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Interests */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-4">Interests</label>
                      <div className="flex flex-wrap gap-2">
                        {availableInterests.map((interest) => (
                          <Badge
                            key={interest}
                            variant={profile.interests.includes(interest) ? "default" : "outline"}
                            className={`cursor-pointer transition-all ${
                              profile.interests.includes(interest)
                                ? 'bg-cyan-600 text-white hover:bg-cyan-700'
                                : 'border-slate-600 text-slate-300 hover:border-cyan-500 hover:text-cyan-400'
                            } ${!isEditing ? 'cursor-default' : ''}`}
                            onClick={() => isEditing && toggleInterest(interest)}
                          >
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity">
                <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentActivity.map((activity, index) => (
                        <div key={index} className="flex items-center space-x-4 p-4 bg-slate-700/30 rounded-lg">
                          <div className="text-2xl">{getActivityIcon(activity.type)}</div>
                          <div className="flex-1">
                            <div className="text-white font-medium">{activity.title}</div>
                            <div className="text-slate-400 text-sm">{activity.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                        <div>
                          <div className="text-white font-medium">Location Sharing</div>
                          <div className="text-slate-400 text-sm">Allow app to access your location</div>
                        </div>
                        <div className="w-12 h-6 bg-cyan-600 rounded-full relative">
                          <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5"></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                        <div>
                          <div className="text-white font-medium">Push Notifications</div>
                          <div className="text-slate-400 text-sm">Get notified about nearby events</div>
                        </div>
                        <div className="w-12 h-6 bg-cyan-600 rounded-full relative">
                          <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5"></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                        <div>
                          <div className="text-white font-medium">Dark Mode</div>
                          <div className="text-slate-400 text-sm">Use dark theme</div>
                        </div>
                        <div className="w-12 h-6 bg-cyan-600 rounded-full relative">
                          <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5"></div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-700">
                      <Button variant="destructive" className="w-full">
                        Delete Account
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;

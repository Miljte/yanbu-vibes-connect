
import React, { useState, useEffect } from 'react';
import { MapPin, Camera, Clock, BarChart3, MessageSquare, Plus, Edit, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type PlaceType = Database['public']['Enums']['place_type'];
type CrowdLevel = Database['public']['Enums']['crowd_level'];

interface Place {
  id?: string;
  name: string;
  type: PlaceType;
  latitude: number;
  longitude: number;
  address: string;
  description: string;
  images: string[];
  working_hours: any;
  crowd_level: CrowdLevel;
  male_percentage: number;
  female_percentage: number;
  is_active: boolean;
}

interface PlaceAnalytics {
  nearbyUsers: number;
  messageCount: number;
  promotionClicks: number;
}

const MerchantDashboard = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [analytics, setAnalytics] = useState<PlaceAnalytics>({
    nearbyUsers: 0,
    messageCount: 0,
    promotionClicks: 0
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const [newPlace, setNewPlace] = useState<Partial<Place>>({
    name: '',
    type: 'cafe',
    latitude: 24.0870,
    longitude: 38.0600,
    address: '',
    description: '',
    images: [],
    working_hours: {
      monday: { open: '08:00', close: '22:00', closed: false },
      tuesday: { open: '08:00', close: '22:00', closed: false },
      wednesday: { open: '08:00', close: '22:00', closed: false },
      thursday: { open: '08:00', close: '22:00', closed: false },
      friday: { open: '08:00', close: '22:00', closed: false },
      saturday: { open: '08:00', close: '22:00', closed: false },
      sunday: { open: '08:00', close: '22:00', closed: false }
    },
    crowd_level: 'low',
    male_percentage: 50,
    female_percentage: 50,
    is_active: true
  });

  useEffect(() => {
    fetchMerchantPlaces();
  }, [user]);

  const fetchMerchantPlaces = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlaces(data || []);
      
      if (data && data.length > 0) {
        setSelectedPlace(data[0]);
        fetchAnalytics(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching places:', error);
      toast.error('Failed to load your places');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async (placeId: string) => {
    try {
      // Get message count for this place
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('place_id', placeId);

      // Get nearby users count (simplified - in real app you'd calculate distance)
      const { data: locations } = await supabase
        .from('user_locations')
        .select('id');

      setAnalytics({
        nearbyUsers: locations?.length || 0,
        messageCount: messages?.length || 0,
        promotionClicks: Math.floor(Math.random() * 50) // Simulated data
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const createPlace = async () => {
    if (!user || !newPlace.name) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const placeData = {
        name: newPlace.name,
        type: newPlace.type as PlaceType,
        latitude: newPlace.latitude!,
        longitude: newPlace.longitude!,
        address: newPlace.address,
        description: newPlace.description,
        images: newPlace.images || [],
        working_hours: newPlace.working_hours,
        crowd_level: newPlace.crowd_level as CrowdLevel,
        male_percentage: newPlace.male_percentage,
        female_percentage: newPlace.female_percentage,
        is_active: newPlace.is_active,
        merchant_id: user.id
      };

      const { data, error } = await supabase
        .from('places')
        .insert(placeData)
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Place created successfully!');
      fetchMerchantPlaces();
      
      // Reset form
      setNewPlace({
        name: '',
        type: 'cafe',
        latitude: 24.0870,
        longitude: 38.0600,
        address: '',
        description: '',
        images: [],
        working_hours: newPlace.working_hours,
        crowd_level: 'low',
        male_percentage: 50,
        female_percentage: 50,
        is_active: true
      });
    } catch (error) {
      console.error('Error creating place:', error);
      toast.error('Failed to create place');
    }
  };

  const updatePlace = async () => {
    if (!selectedPlace?.id) return;

    try {
      const updateData = {
        name: selectedPlace.name,
        type: selectedPlace.type,
        latitude: selectedPlace.latitude,
        longitude: selectedPlace.longitude,
        address: selectedPlace.address,
        description: selectedPlace.description,
        images: selectedPlace.images,
        working_hours: selectedPlace.working_hours,
        crowd_level: selectedPlace.crowd_level as CrowdLevel,
        male_percentage: selectedPlace.male_percentage,
        female_percentage: selectedPlace.female_percentage,
        is_active: selectedPlace.is_active
      };

      const { error } = await supabase
        .from('places')
        .update(updateData)
        .eq('id', selectedPlace.id);

      if (error) throw error;
      
      toast.success('Place updated successfully!');
      setIsEditing(false);
      fetchMerchantPlaces();
    } catch (error) {
      console.error('Error updating place:', error);
      toast.error('Failed to update place');
    }
  };

  const placeTypes: { value: PlaceType; label: string }[] = [
    { value: 'cafe', label: 'Café' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'mall', label: 'Mall' },
    { value: 'beach', label: 'Beach' },
    { value: 'park', label: 'Park' },
    { value: 'event_venue', label: 'Event Venue' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 flex items-center justify-center">
        <div className="text-white">Loading merchant dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Merchant Dashboard</h1>
          <p className="text-slate-300">Manage your places and connect with customers</p>
        </div>

        <Tabs defaultValue="places" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="places" className="data-[state=active]:bg-cyan-600">
              <MapPin className="w-4 h-4 mr-2" />
              My Places
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-cyan-600">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-cyan-600">
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat Management
            </TabsTrigger>
            <TabsTrigger value="add-place" className="data-[state=active]:bg-cyan-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Place
            </TabsTrigger>
          </TabsList>

          <TabsContent value="places">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Places List */}
              <div className="lg:col-span-1">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Your Places</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {places.map((place) => (
                        <div
                          key={place.id}
                          className={`p-3 rounded-lg cursor-pointer transition-all ${
                            selectedPlace?.id === place.id
                              ? 'bg-cyan-600/30 border border-cyan-500'
                              : 'bg-slate-700/30 hover:bg-slate-700/50'
                          }`}
                          onClick={() => {
                            setSelectedPlace(place);
                            if (place.id) fetchAnalytics(place.id);
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-white font-medium">{place.name}</h3>
                            <Badge variant={place.is_active ? "default" : "secondary"}>
                              {place.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-slate-400 text-sm">{place.type}</p>
                        </div>
                      ))}
                      {places.length === 0 && (
                        <div className="text-center text-slate-400 py-8">
                          No places yet. Add your first place!
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Place Details */}
              <div className="lg:col-span-2">
                {selectedPlace ? (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-white">{selectedPlace.name}</CardTitle>
                      <Button
                        onClick={() => {
                          if (isEditing) {
                            updatePlace();
                          } else {
                            setIsEditing(true);
                          }
                        }}
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:text-white"
                      >
                        {isEditing ? <Save className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
                        {isEditing ? 'Save' : 'Edit'}
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Place Name</label>
                            <Input
                              value={selectedPlace.name}
                              onChange={(e) => setSelectedPlace({...selectedPlace, name: e.target.value})}
                              className="bg-slate-700 border-slate-600 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
                            <select
                              value={selectedPlace.type}
                              onChange={(e) => setSelectedPlace({...selectedPlace, type: e.target.value as PlaceType})}
                              className="w-full bg-slate-700 border-slate-600 text-white p-3 rounded-lg"
                            >
                              {placeTypes.map((type) => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                            <Textarea
                              value={selectedPlace.description}
                              onChange={(e) => setSelectedPlace({...selectedPlace, description: e.target.value})}
                              className="bg-slate-700 border-slate-600 text-white"
                              rows={3}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Male %</label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={selectedPlace.male_percentage}
                                onChange={(e) => setSelectedPlace({
                                  ...selectedPlace, 
                                  male_percentage: parseInt(e.target.value),
                                  female_percentage: 100 - parseInt(e.target.value)
                                })}
                                className="bg-slate-700 border-slate-600 text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Female %</label>
                              <Input
                                type="number"
                                value={selectedPlace.female_percentage}
                                disabled
                                className="bg-slate-700 border-slate-600 text-white"
                              />
                            </div>
                          </div>
                          <Button onClick={() => setIsEditing(false)} variant="outline" className="w-full border-slate-600 text-slate-300">
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <span className="text-slate-400">Type:</span>
                            <span className="text-white ml-2">{selectedPlace.type}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Address:</span>
                            <span className="text-white ml-2">{selectedPlace.address || 'Not set'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Description:</span>
                            <p className="text-white mt-1">{selectedPlace.description || 'No description'}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-slate-400">Male/Female Ratio:</span>
                              <p className="text-white">{selectedPlace.male_percentage}% / {selectedPlace.female_percentage}%</p>
                            </div>
                            <div>
                              <span className="text-slate-400">Crowd Level:</span>
                              <Badge variant="outline" className="ml-2 border-slate-600 text-slate-300">
                                {selectedPlace.crowd_level}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="flex items-center justify-center h-64">
                      <div className="text-center text-slate-400">
                        <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Select a place to view details</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            {selectedPlace ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Nearby Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-cyan-400">{analytics.nearbyUsers}</div>
                    <p className="text-slate-400 text-sm">Within 500m</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Chat Messages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-400">{analytics.messageCount}</div>
                    <p className="text-slate-400 text-sm">Total messages</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Promotion Clicks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-400">{analytics.promotionClicks}</div>
                    <p className="text-slate-400 text-sm">This month</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center text-slate-400">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a place to view analytics</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="chat">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Chat Management</CardTitle>
              </CardHeader>
              <CardContent className="text-center py-12">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-slate-400 opacity-50" />
                <p className="text-slate-400">Chat management features coming soon</p>
                <p className="text-slate-500 text-sm mt-2">You'll be able to respond to customers and send promotions</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="add-place">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Add New Place</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Place Name *</label>
                    <Input
                      value={newPlace.name}
                      onChange={(e) => setNewPlace({...newPlace, name: e.target.value})}
                      placeholder="e.g., My Café"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Type *</label>
                    <select
                      value={newPlace.type}
                      onChange={(e) => setNewPlace({...newPlace, type: e.target.value as PlaceType})}
                      className="w-full bg-slate-700 border-slate-600 text-white p-3 rounded-lg"
                    >
                      {placeTypes.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
                  <Input
                    value={newPlace.address}
                    onChange={(e) => setNewPlace({...newPlace, address: e.target.value})}
                    placeholder="Full address in Yanbu"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <Textarea
                    value={newPlace.description}
                    onChange={(e) => setNewPlace({...newPlace, description: e.target.value})}
                    placeholder="Describe your place..."
                    className="bg-slate-700 border-slate-600 text-white"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Latitude</label>
                    <Input
                      type="number"
                      step="any"
                      value={newPlace.latitude}
                      onChange={(e) => setNewPlace({...newPlace, latitude: parseFloat(e.target.value)})}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Longitude</label>
                    <Input
                      type="number"
                      step="any"
                      value={newPlace.longitude}
                      onChange={(e) => setNewPlace({...newPlace, longitude: parseFloat(e.target.value)})}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <Button onClick={createPlace} className="w-full bg-cyan-600 hover:bg-cyan-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Place
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MerchantDashboard;

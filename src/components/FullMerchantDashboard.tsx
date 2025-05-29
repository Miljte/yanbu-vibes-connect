
import React, { useState, useEffect } from 'react';
import { MapPin, Camera, Clock, BarChart3, MessageSquare, Plus, Edit, Save, ArrowLeft, Trash2, Calendar, Store } from 'lucide-react';
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
  merchant_id?: string;
}

interface Event {
  id?: string;
  title: string;
  description: string;
  start_time: string;
  end_time?: string;
  place_id?: string;
  organizer_id: string;
  max_attendees?: number;
  is_active: boolean;
}

const FullMerchantDashboard = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddStore, setShowAddStore] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
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

  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    max_attendees: 50,
    is_active: true
  });

  const placeTypes: { value: PlaceType; label: string }[] = [
    { value: 'cafe', label: 'Café' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'mall', label: 'Mall' },
    { value: 'beach', label: 'Beach' },
    { value: 'park', label: 'Park' },
    { value: 'event_venue', label: 'Event Venue' }
  ];

  useEffect(() => {
    if (user) {
      fetchMerchantData();
      
      // Set up real-time subscriptions
      const placesSubscription = supabase
        .channel('merchant-places')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'places', filter: `merchant_id=eq.${user.id}` }, 
          () => fetchMerchantPlaces()
        )
        .subscribe();

      const eventsSubscription = supabase
        .channel('merchant-events')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'events', filter: `organizer_id=eq.${user.id}` }, 
          () => fetchMerchantEvents()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(placesSubscription);
        supabase.removeChannel(eventsSubscription);
      };
    }
  }, [user]);

  const fetchMerchantData = async () => {
    await Promise.all([fetchMerchantPlaces(), fetchMerchantEvents()]);
    setLoading(false);
  };

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
      
      if (data && data.length > 0 && !selectedPlace) {
        setSelectedPlace(data[0]);
      }
    } catch (error) {
      console.error('Error fetching places:', error);
      toast.error('Failed to load your stores');
    }
  };

  const fetchMerchantEvents = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load your events');
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

      const { error } = await supabase
        .from('places')
        .insert(placeData);

      if (error) throw error;
      
      toast.success('Store added successfully and will appear on the map!');
      setShowAddStore(false);
      
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
      toast.error('Failed to add store');
    }
  };

  const deletePlace = async (placeId: string, placeName: string) => {
    if (!confirm(`Are you sure you want to delete "${placeName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('places')
        .delete()
        .eq('id', placeId)
        .eq('merchant_id', user?.id);

      if (error) throw error;
      
      toast.success('Store deleted successfully');
      if (selectedPlace?.id === placeId) {
        setSelectedPlace(null);
      }
    } catch (error) {
      console.error('Error deleting place:', error);
      toast.error('Failed to delete store');
    }
  };

  const createEvent = async () => {
    if (!user || !newEvent.title || !newEvent.start_time) {
      toast.error('Please fill in title and start time');
      return;
    }

    try {
      const eventData = {
        title: newEvent.title,
        description: newEvent.description,
        start_time: newEvent.start_time,
        end_time: newEvent.end_time,
        place_id: selectedPlace?.id,
        organizer_id: user.id,
        max_attendees: newEvent.max_attendees,
        is_active: newEvent.is_active
      };

      const { error } = await supabase
        .from('events')
        .insert(eventData);

      if (error) throw error;
      
      toast.success('Event created successfully!');
      setShowAddEvent(false);
      
      // Reset form
      setNewEvent({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        max_attendees: 50,
        is_active: true
      });
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    }
  };

  const deleteEvent = async (eventId: string, eventTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${eventTitle}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('organizer_id', user?.id);

      if (error) throw error;
      
      toast.success('Event deleted successfully');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 flex items-center justify-center pb-20">
        <div className="text-white">Loading merchant dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pb-20">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Merchant Dashboard</h1>
          <p className="text-slate-300">Manage your stores and events on POP IN</p>
        </div>

        <Tabs defaultValue="stores" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700 grid w-full grid-cols-3">
            <TabsTrigger value="stores" className="data-[state=active]:bg-cyan-600">
              <Store className="w-4 h-4 mr-2" />
              My Stores ({places.length})
            </TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-cyan-600">
              <Calendar className="w-4 h-4 mr-2" />
              My Events ({events.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-cyan-600">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stores">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">Your Stores</h2>
                <Button
                  onClick={() => setShowAddStore(true)}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Store
                </Button>
              </div>

              {showAddStore && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Add New Store</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Store Name *</label>
                        <Input
                          value={newPlace.name}
                          onChange={(e) => setNewPlace({...newPlace, name: e.target.value})}
                          placeholder="e.g., My Coffee Shop"
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

                    <div className="flex space-x-2">
                      <Button onClick={createPlace} className="bg-cyan-600 hover:bg-cyan-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Store to Map
                      </Button>
                      <Button onClick={() => setShowAddStore(false)} variant="outline" className="border-slate-600 text-slate-300">
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {places.map((place) => (
                  <Card key={place.id} className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-medium">{place.name}</h3>
                        <Badge variant={place.is_active ? "default" : "secondary"}>
                          {place.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-sm mb-3">{place.type} • {place.address}</p>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => setSelectedPlace(place)}
                          variant="outline"
                          className="border-slate-600 text-slate-300 flex-1"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => deletePlace(place.id!, place.name)}
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-600/20"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {places.length === 0 && !showAddStore && (
                <div className="text-center text-slate-400 py-12">
                  <Store className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No stores yet</p>
                  <p className="text-sm">Add your first store to get started!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="events">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">Your Events</h2>
                <Button
                  onClick={() => setShowAddEvent(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={places.length === 0}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Event
                </Button>
              </div>

              {places.length === 0 && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-6 text-center">
                    <p className="text-slate-400">You need to add a store first before creating events.</p>
                  </CardContent>
                </Card>
              )}

              {showAddEvent && places.length > 0 && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Create New Event</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Event Title *</label>
                        <Input
                          value={newEvent.title}
                          onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                          placeholder="e.g., Coffee Tasting Session"
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Max Attendees</label>
                        <Input
                          type="number"
                          value={newEvent.max_attendees}
                          onChange={(e) => setNewEvent({...newEvent, max_attendees: parseInt(e.target.value)})}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                      <Textarea
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                        placeholder="Describe your event..."
                        className="bg-slate-700 border-slate-600 text-white"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Start Time *</label>
                        <Input
                          type="datetime-local"
                          value={newEvent.start_time}
                          onChange={(e) => setNewEvent({...newEvent, start_time: e.target.value})}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">End Time</label>
                        <Input
                          type="datetime-local"
                          value={newEvent.end_time}
                          onChange={(e) => setNewEvent({...newEvent, end_time: e.target.value})}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button onClick={createEvent} className="bg-purple-600 hover:bg-purple-700">
                        <Calendar className="w-4 h-4 mr-2" />
                        Create Event
                      </Button>
                      <Button onClick={() => setShowAddEvent(false)} variant="outline" className="border-slate-600 text-slate-300">
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map((event) => (
                  <Card key={event.id} className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-medium">{event.title}</h3>
                        <Button
                          size="sm"
                          onClick={() => deleteEvent(event.id!, event.title)}
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-600/20"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-slate-400 text-sm mb-2">{event.description}</p>
                      <p className="text-slate-500 text-xs">
                        {new Date(event.start_time).toLocaleString()}
                      </p>
                      {event.max_attendees && (
                        <Badge variant="outline" className="mt-2 border-slate-600 text-slate-300">
                          Max: {event.max_attendees} people
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {events.length === 0 && !showAddEvent && places.length > 0 && (
                <div className="text-center text-slate-400 py-12">
                  <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No events yet</p>
                  <p className="text-sm">Create your first event to engage customers!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Total Stores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-cyan-400">{places.length}</div>
                  <p className="text-slate-400 text-sm">Active on map</p>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Total Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-400">{events.length}</div>
                  <p className="text-slate-400 text-sm">Created by you</p>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Active Stores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">
                    {places.filter(p => p.is_active).length}
                  </div>
                  <p className="text-slate-400 text-sm">Visible to users</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FullMerchantDashboard;

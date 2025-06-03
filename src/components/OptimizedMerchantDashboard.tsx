import React, { useState, useEffect, useCallback } from 'react';
import { Store, Calendar, Gift, Users, BarChart3, MapPin, Trash2, Plus, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import type { Database } from '@/integrations/supabase/types';

type PlaceType = Database['public']['Tables']['places']['Row']['type'];

interface Place {
  id?: string;
  name: string;
  description: string;
  type: PlaceType;
  latitude: number;
  longitude: number;
  image_urls: string[];
  is_active: boolean;
  address: string;
}

interface Event {
  id?: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  place_id: string;
  organizer_id: string;
  max_attendees: number;
  current_attendees: number;
  interested_count: number;
  rsvp_count: number;
  is_active: boolean;
  image_url?: string;
}

const OptimizedMerchantDashboard = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'restaurant' as PlaceType,
    address: '',
    latitude: 21.485811,
    longitude: 39.192505,
    image_urls: [] as string[]
  });

  const [eventFormData, setEventFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    max_attendees: 50,
    image_url: ''
  });

  const { user } = useAuth();

  // Fetch merchant data with caching
  const fetchMerchantData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('🔄 Loading merchant dashboard data...');

      // Fetch places
      const { data: placesData, error: placesError } = await supabase
        .from('places')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (placesError) throw placesError;

      const placesResult = placesData || [];
      setPlaces(placesResult);

      // Auto-select first place
      if (placesResult.length > 0 && !selectedPlace) {
        setSelectedPlace(placesResult[0]);
      }

      // Fetch events for merchant's places
      if (placesResult.length > 0) {
        const placeIds = placesResult.map(p => p.id).filter(Boolean);
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .in('place_id', placeIds)
          .order('start_time', { ascending: true });

        if (eventsError) throw eventsError;
        
        // Ensure all events have the required fields with defaults
        const eventsWithDefaults = (eventsData || []).map(event => ({
          ...event,
          interested_count: event.interested_count || 0,
          rsvp_count: event.rsvp_count || 0,
          current_attendees: event.current_attendees || 0
        }));
        
        setEvents(eventsWithDefaults);
      }

      console.log('✅ Merchant data loaded:', {
        places: placesResult.length,
        events: placesResult.length > 0 ? eventsData?.length || 0 : 0
      });

    } catch (error) {
      console.error('❌ Error loading merchant data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user, selectedPlace?.id]);

  useEffect(() => {
    fetchMerchantData();
  }, [fetchMerchantData]);

  // Handle place operations
  const handleSavePlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const placeData = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        image_urls: formData.image_urls,
        merchant_id: user.id,
        is_active: true
      };

      if (selectedPlace && isEditing && selectedPlace.id) {
        const { error } = await supabase
          .from('places')
          .update(placeData)
          .eq('id', selectedPlace.id)
          .eq('merchant_id', user.id); // Extra security check
        
        if (error) throw error;
        toast.success('Store updated successfully!');
      } else {
        const { data, error } = await supabase
          .from('places')
          .insert([placeData])
          .select()
          .single();
        
        if (error) throw error;
        toast.success('Store created successfully! It will appear on the map shortly.');
        
        // Auto-select the newly created place
        if (data) {
          setSelectedPlace(data);
        }
      }

      setIsEditing(false);
      resetFormData();
      fetchMerchantData();
    } catch (error) {
      console.error('❌ Error saving place:', error);
      toast.error('Failed to save store');
    }
  };

  const handleDeletePlace = async (placeId: string) => {
    if (!user || !placeId) return;

    try {
      console.log('🗑️ Deleting store:', placeId);

      // Delete the place (cascade should handle related data)
      const { error } = await supabase
        .from('places')
        .delete()
        .eq('id', placeId)
        .eq('merchant_id', user.id); // Ensure only the owner can delete

      if (error) throw error;

      toast.success('Store deleted successfully!');
      
      if (selectedPlace?.id === placeId) {
        setSelectedPlace(null);
      }
      
      fetchMerchantData();
    } catch (error) {
      console.error('❌ Error deleting place:', error);
      toast.error('Failed to delete store');
    }
  };

  // Handle event operations
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedPlace?.id) {
      toast.error('Please select a store first');
      return;
    }

    try {
      const eventData = {
        title: eventFormData.title,
        description: eventFormData.description,
        start_time: eventFormData.start_time,
        end_time: eventFormData.end_time,
        max_attendees: eventFormData.max_attendees,
        image_url: eventFormData.image_url,
        place_id: selectedPlace.id,
        organizer_id: user.id,
        current_attendees: 0,
        interested_count: 0,
        rsvp_count: 0,
        is_active: true
      };

      const { error } = await supabase
        .from('events')
        .insert([eventData]);
      
      if (error) throw error;
      
      toast.success('Event created successfully! It will appear on the Events page.');
      setIsCreatingEvent(false);
      resetEventFormData();
      fetchMerchantData();
    } catch (error) {
      console.error('❌ Error creating event:', error);
      toast.error('Failed to create event');
    }
  };

  const startEditing = (place?: Place) => {
    if (place) {
      setSelectedPlace(place);
      setFormData({
        name: place.name,
        description: place.description || '',
        type: place.type,
        address: place.address || '',
        latitude: place.latitude,
        longitude: place.longitude,
        image_urls: place.image_urls || []
      });
    } else {
      resetFormData();
    }
    setIsEditing(true);
  };

  const resetFormData = () => {
    setFormData({
      name: '',
      description: '',
      type: 'restaurant',
      address: '',
      latitude: 21.485811,
      longitude: 39.192505,
      image_urls: []
    });
  };

  const resetEventFormData = () => {
    setEventFormData({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      max_attendees: 50,
      image_url: ''
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <div className="text-foreground text-lg">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">🏪 Merchant Dashboard</h1>
          <p className="text-muted-foreground">Manage your stores and events</p>
        </div>

        <Tabs defaultValue="stores" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="stores">
              <Store className="w-4 h-4 mr-2" />
              My Stores ({places.length})
            </TabsTrigger>
            <TabsTrigger value="events">
              <Calendar className="w-4 h-4 mr-2" />
              Events ({events.length})
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stores">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Store List */}
              <Card className="bg-card border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center justify-between">
                    <span>Your Stores</span>
                    <Button size="sm" onClick={() => startEditing()}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Store
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {places.map((place) => (
                    <div
                      key={place.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedPlace?.id === place.id
                          ? 'bg-primary/10 border border-primary/20'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                      onClick={() => setSelectedPlace(place)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-foreground">{place.name}</h4>
                          <p className="text-sm text-muted-foreground">{place.type}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={place.is_active ? "default" : "secondary"}>
                            {place.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Store</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{place.name}"? This will also delete all related events and chat messages.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeletePlace(place.id!)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete Store
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                  {places.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No stores created yet</p>
                      <Button className="mt-4" onClick={() => startEditing()}>
                        Create Your First Store
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Store Details */}
              <div className="lg:col-span-2 space-y-6">
                {isEditing ? (
                  <Card className="bg-card border">
                    <CardHeader>
                      <CardTitle className="text-foreground">
                        {selectedPlace ? 'Edit Store' : 'Create New Store'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSavePlace} className="space-y-4">
                        <Input
                          placeholder="Store name"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          required
                        />
                        <Textarea
                          placeholder="Store description"
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                        <Select
                          value={formData.type}
                          onValueChange={(value: PlaceType) => setFormData({...formData, type: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select store type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="restaurant">Restaurant</SelectItem>
                            <SelectItem value="cafe">Cafe</SelectItem>
                            <SelectItem value="mall">Mall</SelectItem>
                            <SelectItem value="beach">Beach</SelectItem>
                            <SelectItem value="park">Park</SelectItem>
                            <SelectItem value="event_venue">Event Venue</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Address"
                          value={formData.address}
                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            type="number"
                            step="any"
                            placeholder="Latitude"
                            value={formData.latitude}
                            onChange={(e) => setFormData({...formData, latitude: parseFloat(e.target.value)})}
                            required
                          />
                          <Input
                            type="number"
                            step="any"
                            placeholder="Longitude"
                            value={formData.longitude}
                            onChange={(e) => setFormData({...formData, longitude: parseFloat(e.target.value)})}
                            required
                          />
                        </div>
                        <Input
                          placeholder="Image URL"
                          value={formData.image_urls[0] || ''}
                          onChange={(e) => setFormData({...formData, image_urls: e.target.value ? [e.target.value] : []})}
                        />
                        <div className="flex space-x-2">
                          <Button type="submit">
                            {selectedPlace ? 'Update Store' : 'Create Store'}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                ) : selectedPlace ? (
                  <Card className="bg-card border">
                    <CardHeader>
                      <CardTitle className="text-foreground flex items-center justify-between">
                        <span>{selectedPlace.name}</span>
                        <Button onClick={() => startEditing(selectedPlace)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Store
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedPlace.image_urls && selectedPlace.image_urls.length > 0 && (
                        <img 
                          src={selectedPlace.image_urls[0]} 
                          alt={selectedPlace.name}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      )}
                      <p className="text-muted-foreground">{selectedPlace.description}</p>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{selectedPlace.address}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge variant="outline">{selectedPlace.type}</Badge>
                        <Badge variant={selectedPlace.is_active ? "default" : "secondary"}>
                          {selectedPlace.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">🗺️ Map Integration</h4>
                        <p className="text-blue-700 text-sm">
                          Your store will appear on the main map with coordinates: {selectedPlace.latitude}, {selectedPlace.longitude}
                        </p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2">💬 Chat Room</h4>
                        <p className="text-green-700 text-sm">
                          Users within 500 meters can join your store's dedicated chat room
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-muted/20 border-dashed">
                    <CardContent className="py-12 text-center">
                      <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No store selected</h3>
                      <p className="text-muted-foreground mb-4">Select a store or create a new one to get started</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="events">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Event Management</h2>
                <Button 
                  onClick={() => setIsCreatingEvent(true)}
                  disabled={!selectedPlace}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </div>

              {!selectedPlace && (
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-4">
                    <p className="text-orange-800">Please select a store first to create events.</p>
                  </CardContent>
                </Card>
              )}

              {isCreatingEvent && selectedPlace && (
                <Card className="bg-card border">
                  <CardHeader>
                    <CardTitle className="text-foreground">Create New Event for {selectedPlace.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveEvent} className="space-y-4">
                      <Input
                        placeholder="Event title"
                        value={eventFormData.title}
                        onChange={(e) => setEventFormData({...eventFormData, title: e.target.value})}
                        required
                      />
                      <Textarea
                        placeholder="Event description"
                        value={eventFormData.description}
                        onChange={(e) => setEventFormData({...eventFormData, description: e.target.value})}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Start Time</label>
                          <Input
                            type="datetime-local"
                            value={eventFormData.start_time}
                            onChange={(e) => setEventFormData({...eventFormData, start_time: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">End Time</label>
                          <Input
                            type="datetime-local"
                            value={eventFormData.end_time}
                            onChange={(e) => setEventFormData({...eventFormData, end_time: e.target.value})}
                            required
                          />
                        </div>
                      </div>
                      <Input
                        type="number"
                        placeholder="Max attendees"
                        value={eventFormData.max_attendees}
                        onChange={(e) => setEventFormData({...eventFormData, max_attendees: parseInt(e.target.value)})}
                        required
                      />
                      <Input
                        placeholder="Event image URL"
                        value={eventFormData.image_url}
                        onChange={(e) => setEventFormData({...eventFormData, image_url: e.target.value})}
                      />
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">📅 Event Publishing</h4>
                        <p className="text-blue-700 text-sm">
                          Your event will automatically appear on the public Events page with "Interested" and "RSVP" options
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button type="submit">Create Event</Button>
                        <Button type="button" variant="outline" onClick={() => setIsCreatingEvent(false)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <Card key={event.id} className="bg-card border">
                    <CardHeader>
                      <CardTitle className="text-foreground text-lg">{event.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {event.image_url && (
                        <img 
                          src={event.image_url} 
                          alt={event.title}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                      )}
                      <p className="text-muted-foreground text-sm">{event.description}</p>
                      <div className="flex items-center space-x-2 text-sm">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>{new Date(event.start_time).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Users className="w-4 h-4 text-primary" />
                        <span>{event.current_attendees} / {event.max_attendees} attendees</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-600">{event.interested_count}</div>
                          <div className="text-xs text-muted-foreground">Interested</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">{event.rsvp_count}</div>
                          <div className="text-xs text-muted-foreground">RSVPs</div>
                        </div>
                      </div>
                      <Badge variant={event.is_active ? "default" : "secondary"}>
                        {event.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
                {events.length === 0 && (
                  <div className="col-span-full text-center text-muted-foreground py-8">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No events created yet</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-card border">
                <CardHeader>
                  <CardTitle className="text-foreground text-sm">Total Stores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{places.length}</div>
                </CardContent>
              </Card>
              <Card className="bg-card border">
                <CardHeader>
                  <CardTitle className="text-foreground text-sm">Active Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {events.filter(e => e.is_active).length}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border">
                <CardHeader>
                  <CardTitle className="text-foreground text-sm">Total Event Responses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {events.reduce((acc, event) => acc + (event.interested_count || 0) + (event.rsvp_count || 0), 0)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default OptimizedMerchantDashboard;


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
  interested_count?: number;
  rsvp_count?: number;
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
        console.log('✅ Events loaded:', eventsWithDefaults.length);
      }

      console.log('✅ Merchant data loaded:', {
        places: placesResult.length,
        events: placesResult.length > 0 ? (eventsData?.length || 0) : 0
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
        toast.success('Store updated successfully!');\
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
                          onChange={(e) => setFormData({
                            ...formData, 
                            image_urls: e.target.value ? [e.target.value] : []
                          })}
                        />
                        <div className="flex space-x-4">
                          <Button type="submit" className="flex-1">
                            {selectedPlace ? 'Update Store' : 'Create Store'}
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setIsEditing(false);
                              resetFormData();
                            }}
                          >
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
                        <Button size="sm" onClick={() => startEditing(selectedPlace)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium text-foreground mb-2">Description</h4>
                        <p className="text-muted-foreground">{selectedPlace.description || 'No description provided'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-foreground">Type:</span>
                          <p className="text-muted-foreground capitalize">{selectedPlace.type}</p>
                        </div>
                        <div>
                          <span className="font-medium text-foreground">Status:</span>
                          <p className="text-muted-foreground">{selectedPlace.is_active ? 'Active' : 'Inactive'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-foreground">Location:</span>
                          <p className="text-muted-foreground">{selectedPlace.latitude.toFixed(4)}, {selectedPlace.longitude.toFixed(4)}</p>
                        </div>
                        <div>
                          <span className="font-medium text-foreground">Address:</span>
                          <p className="text-muted-foreground">{selectedPlace.address || 'No address provided'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-card border">
                    <CardContent className="text-center py-12">
                      <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-xl font-semibold text-foreground mb-2">No Store Selected</h3>
                      <p className="text-muted-foreground">Select a store to view details or create a new one</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="events">
            <div className="space-y-6">
              <Card className="bg-card border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center justify-between">
                    <span>Event Management</span>
                    <Button 
                      size="sm" 
                      onClick={() => setIsCreatingEvent(true)}
                      disabled={places.length === 0}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Create Event
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {places.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">Create a store first to manage events</p>
                    </div>
                  ) : isCreatingEvent ? (
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
                        <Input
                          type="datetime-local"
                          value={eventFormData.start_time}
                          onChange={(e) => setEventFormData({...eventFormData, start_time: e.target.value})}
                          required
                        />
                        <Input
                          type="datetime-local"
                          value={eventFormData.end_time}
                          onChange={(e) => setEventFormData({...eventFormData, end_time: e.target.value})}
                        />
                      </div>
                      <Input
                        type="number"
                        placeholder="Max attendees"
                        value={eventFormData.max_attendees}
                        onChange={(e) => setEventFormData({...eventFormData, max_attendees: parseInt(e.target.value)})}
                        min="1"
                        required
                      />
                      <Input
                        placeholder="Event image URL"
                        value={eventFormData.image_url}
                        onChange={(e) => setEventFormData({...eventFormData, image_url: e.target.value})}
                      />
                      <div className="flex space-x-4">
                        <Button type="submit" className="flex-1">Create Event</Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setIsCreatingEvent(false);
                            resetEventFormData();
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      {events.map((event) => (
                        <div key={event.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-foreground">{event.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {new Date(event.start_time).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary">
                                {event.current_attendees}/{event.max_attendees}
                              </Badge>
                              <Badge variant={event.is_active ? "default" : "secondary"}>
                                {event.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                      {events.length === 0 && (
                        <div className="text-center py-8">
                          <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">No events created yet</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle className="text-foreground">Analytics Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-muted rounded-lg">
                    <Store className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <h3 className="text-2xl font-bold text-foreground">{places.length}</h3>
                    <p className="text-muted-foreground">Total Stores</p>
                  </div>
                  <div className="text-center p-6 bg-muted rounded-lg">
                    <Calendar className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <h3 className="text-2xl font-bold text-foreground">{events.length}</h3>
                    <p className="text-muted-foreground">Total Events</p>
                  </div>
                  <div className="text-center p-6 bg-muted rounded-lg">
                    <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <h3 className="text-2xl font-bold text-foreground">
                      {events.reduce((sum, event) => sum + (event.current_attendees || 0), 0)}
                    </h3>
                    <p className="text-muted-foreground">Total RSVPs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default OptimizedMerchantDashboard;

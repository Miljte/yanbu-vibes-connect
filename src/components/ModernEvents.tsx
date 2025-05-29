
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, Heart, UserCheck, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { useLocalization } from '@/contexts/LocalizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Event {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  place_id?: string;
  organizer_id: string;
  max_attendees?: number;
  current_attendees: number;
  is_active: boolean;
  created_at: string;
  place?: {
    name: string;
    latitude: number;
    longitude: number;
  } | null;
  organizer_name?: string;
  user_attending?: boolean;
}

const ModernEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const { user } = useAuth();
  const { isMerchant } = useRoles();
  const { t, isRTL } = useLocalization();

  useEffect(() => {
    fetchEvents();
    
    // Set up real-time subscription
    const eventsSubscription = supabase
      .channel('events-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'events' }, 
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsSubscription);
    };
  }, [user]);

  const fetchEvents = async () => {
    try {
      // Fetch events with place information
      let query = supabase
        .from('events')
        .select(`
          *,
          place:places(name, latitude, longitude)
        `)
        .eq('is_active', true)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      const { data: eventsData, error: eventsError } = await query;

      if (eventsError) {
        console.error('Events query error:', eventsError);
        throw eventsError;
      }

      // Get organizer profiles separately
      if (eventsData && eventsData.length > 0) {
        const organizerIds = eventsData.map(event => event.organizer_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, nickname')
          .in('id', organizerIds);

        // Check if user is attending each event
        let attendeeData = null;
        if (user) {
          const eventIds = eventsData.map(event => event.id);
          const { data: attendeeResult } = await supabase
            .from('event_attendees')
            .select('event_id')
            .eq('user_id', user.id)
            .in('event_id', eventIds);
          attendeeData = attendeeResult;
        }

        const attendingEventIds = new Set(attendeeData?.map(a => a.event_id) || []);
        
        const eventsWithDetails = eventsData.map(event => {
          const organizer = profilesData?.find(p => p.id === event.organizer_id);
          return {
            ...event,
            current_attendees: event.current_attendees || 0,
            organizer_name: organizer?.nickname || 'Unknown',
            user_attending: attendingEventIds.has(event.id)
          };
        }) as Event[];

        setEvents(eventsWithDetails);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (eventId: string, attending: boolean) => {
    if (!user) {
      toast.error('Please sign in to RSVP');
      return;
    }

    try {
      if (attending) {
        const { error } = await supabase
          .from('event_attendees')
          .insert({ event_id: eventId, user_id: user.id });
        
        if (error) throw error;
        toast.success('RSVP confirmed!');
      } else {
        const { error } = await supabase
          .from('event_attendees')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id);
        
        if (error) throw error;
        toast.success('RSVP cancelled');
      }
      
      fetchEvents(); // Refresh to get updated counts
    } catch (error) {
      console.error('Error updating RSVP:', error);
      toast.error('Failed to update RSVP');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventTypeColor = (title: string) => {
    if (title.toLowerCase().includes('sale') || title.toLowerCase().includes('discount')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    }
    if (title.toLowerCase().includes('music') || title.toLowerCase().includes('party')) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    }
    if (title.toLowerCase().includes('food') || title.toLowerCase().includes('restaurant')) {
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    }
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  };

  if (loading) {
    return (
      <div className={`min-h-screen bg-background p-4 flex items-center justify-center pb-20 ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="text-foreground text-lg">Loading events...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background p-4 pb-20 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">What's Happening</h1>
          <p className="text-muted-foreground">Discover events and activities near you</p>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No upcoming events</h3>
            <p className="text-muted-foreground">Check back later for new events and activities</p>
          </div>
        ) : (
          <div className="space-y-6">
            {events.map((event) => (
              <Card 
                key={event.id} 
                className="bg-card border hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedEvent(event)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-foreground">{event.title}</h3>
                        <Badge className={getEventTypeColor(event.title)}>
                          Event
                        </Badge>
                      </div>
                      
                      {event.description && (
                        <p className="text-muted-foreground mb-3">{event.description}</p>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span>{formatDate(event.start_time)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-primary" />
                          <span>{formatTime(event.start_time)}</span>
                        </div>
                        
                        {event.place && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span>{event.place.name}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-4">
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{event.current_attendees} attending</span>
                          {event.max_attendees && (
                            <span>/ {event.max_attendees} max</span>
                          )}
                        </div>
                        
                        {event.organizer_name && (
                          <div className="text-sm text-muted-foreground">
                            by {event.organizer_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 pt-4 border-t border-border">
                    <Button
                      variant={event.user_attending ? "default" : "outline"}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRSVP(event.id, !event.user_attending);
                      }}
                      className="flex items-center space-x-2"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>{event.user_attending ? 'Going' : 'RSVP'}</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <Heart className="w-4 h-4" />
                      <span>Interested</span>
                    </Button>
                    
                    {event.place && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center space-x-2 ml-auto"
                      >
                        <MapPin className="w-4 h-4" />
                        <span>View Location</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-card border max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">{selectedEvent.title}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEvent(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {selectedEvent.description && (
                <p className="text-muted-foreground mb-6">{selectedEvent.description}</p>
              )}
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="text-foreground">{formatDate(selectedEvent.start_time)}</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="text-foreground">{formatTime(selectedEvent.start_time)}</span>
                </div>
                
                {selectedEvent.place && (
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-primary" />
                    <span className="text-foreground">{selectedEvent.place.name}</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="text-foreground">
                    {selectedEvent.current_attendees} people attending
                    {selectedEvent.max_attendees && ` (${selectedEvent.max_attendees} max)`}
                  </span>
                </div>
                
                {selectedEvent.organizer_name && (
                  <div className="text-muted-foreground">
                    Organized by {selectedEvent.organizer_name}
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3">
                <Button
                  variant={selectedEvent.user_attending ? "default" : "outline"}
                  onClick={() => handleRSVP(selectedEvent.id, !selectedEvent.user_attending)}
                  className="flex items-center space-x-2 flex-1"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{selectedEvent.user_attending ? 'Going' : 'RSVP'}</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="flex items-center space-x-2 flex-1"
                >
                  <Heart className="w-4 h-4" />
                  <span>Interested</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ModernEvents;


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
      <div className={`min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 flex items-center justify-center pb-20 ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="text-center space-y-6 animate-scale-in">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-accent-vibrant rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <p className="text-foreground text-lg font-medium animate-pulse">Loading amazing events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-primary-light/10 to-accent-vibrant/10 rounded-full blur-2xl animate-float" />
        <div className="absolute bottom-40 right-10 w-40 h-40 bg-gradient-to-r from-accent-vibrant/10 to-primary-light/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 p-4 pb-28">
        <div className="container mx-auto max-w-4xl">
          {/* Header Section */}
          <div className="mb-8 text-center animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary to-accent-vibrant rounded-2xl mb-4 animate-bounce-soft">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary-light to-accent-vibrant bg-clip-text text-transparent mb-3">
              What's Happening
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Discover exciting events and activities near you in Yanbu
            </p>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-16 animate-scale-in">
              <div className="floating-card max-w-md mx-auto p-8">
                <div className="w-20 h-20 bg-gradient-to-r from-primary/20 to-accent-vibrant/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-breath">
                  <Calendar className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">No upcoming events</h3>
                <p className="text-muted-foreground mb-6">
                  Be the first to know when new events are available
                </p>
                <Button className="btn-modern">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {events.map((event, index) => (
                <div 
                  key={event.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <Card 
                    className="floating-card group cursor-pointer overflow-hidden border-0"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <CardContent className="p-0">
                      {/* Event Card Header with Gradient */}
                      <div className="relative p-6 bg-gradient-to-r from-primary/5 via-primary-light/5 to-accent-vibrant/5">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        <div className="relative flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <h3 className="text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                                {event.title}
                              </h3>
                              <Badge className={`${getEventTypeColor(event.title)} animate-pulse`}>
                                Event
                              </Badge>
                            </div>
                            
                            {event.description && (
                              <p className="text-muted-foreground mb-4 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Event Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center space-x-3 bg-background/50 rounded-xl p-3 backdrop-blur-sm">
                            <div className="w-10 h-10 bg-gradient-to-r from-primary to-primary-light rounded-lg flex items-center justify-center">
                              <Calendar className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Date</p>
                              <p className="text-sm font-medium text-foreground">{formatDate(event.start_time)}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3 bg-background/50 rounded-xl p-3 backdrop-blur-sm">
                            <div className="w-10 h-10 bg-gradient-to-r from-accent-vibrant to-primary-light rounded-lg flex items-center justify-center">
                              <Clock className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Time</p>
                              <p className="text-sm font-medium text-foreground">{formatTime(event.start_time)}</p>
                            </div>
                          </div>
                          
                          {event.place && (
                            <div className="flex items-center space-x-3 bg-background/50 rounded-xl p-3 backdrop-blur-sm">
                              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                                <MapPin className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Location</p>
                                <p className="text-sm font-medium text-foreground truncate">{event.place.name}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Event Stats */}
                        <div className="flex items-center justify-between pt-4 border-t border-border/50">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                <Users className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {event.current_attendees} attending
                                </p>
                                {event.max_attendees && (
                                  <p className="text-xs text-muted-foreground">
                                    of {event.max_attendees} max
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {event.organizer_name && (
                              <div className="text-sm text-muted-foreground">
                                by <span className="font-medium text-foreground">{event.organizer_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center space-x-3 p-6 bg-gradient-to-r from-background via-muted/20 to-background">
                        <Button
                          variant={event.user_attending ? "default" : "outline"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRSVP(event.id, !event.user_attending);
                          }}
                          className={`flex items-center space-x-2 transition-all duration-300 ${
                            event.user_attending 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-glow' 
                              : 'hover:scale-105'
                          }`}
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>{event.user_attending ? 'Going' : 'RSVP'}</span>
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center space-x-2 hover:scale-105 transition-all duration-300"
                        >
                          <Heart className="w-4 h-4" />
                          <span>Interested</span>
                        </Button>
                        
                        {event.place && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center space-x-2 ml-auto hover:bg-primary/10 hover:text-primary transition-all duration-300"
                          >
                            <MapPin className="w-4 h-4" />
                            <span>View Location</span>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modern Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="floating-card max-w-3xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
            {/* Modal Header with Gradient */}
            <div className="relative bg-gradient-to-r from-primary via-primary-light to-accent-vibrant p-6 text-white">
              <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />
              <div className="relative flex items-center justify-between">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">{selectedEvent.title}</h2>
                  <Badge className="bg-white/20 text-white border-white/30">
                    Event Details
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEvent(null)}
                  className="text-white hover:bg-white/20 w-10 h-10 rounded-full"
                >
                  ×
                </Button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {selectedEvent.description && (
                <div className="mb-6 p-4 bg-muted/20 rounded-xl">
                  <p className="text-foreground leading-relaxed">{selectedEvent.description}</p>
                </div>
              )}
              
              {/* Event Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-r from-primary/5 to-primary-light/5 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary-light rounded-xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Event Date</p>
                      <p className="text-lg font-semibold text-foreground">{formatDate(selectedEvent.start_time)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-accent-vibrant/5 to-primary-light/5 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-accent-vibrant to-primary-light rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Start Time</p>
                      <p className="text-lg font-semibold text-foreground">{formatTime(selectedEvent.start_time)}</p>
                    </div>
                  </div>
                </div>
                
                {selectedEvent.place && (
                  <div className="bg-gradient-to-r from-green-500/5 to-teal-500/5 rounded-xl p-4 md:col-span-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="text-lg font-semibold text-foreground">{selectedEvent.place.name}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Attendees</p>
                      <p className="text-lg font-semibold text-foreground">
                        {selectedEvent.current_attendees}
                        {selectedEvent.max_attendees && ` / ${selectedEvent.max_attendees}`}
                      </p>
                    </div>
                  </div>
                </div>
                
                {selectedEvent.organizer_name && (
                  <div className="bg-gradient-to-r from-orange-500/5 to-yellow-500/5 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                        {selectedEvent.organizer_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Organizer</p>
                        <p className="text-lg font-semibold text-foreground">{selectedEvent.organizer_name}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-6 border-t border-border/50 bg-gradient-to-r from-background via-muted/10 to-background">
              <div className="flex space-x-3">
                <Button
                  variant={selectedEvent.user_attending ? "default" : "outline"}
                  onClick={() => handleRSVP(selectedEvent.id, !selectedEvent.user_attending)}
                  className={`flex items-center space-x-2 flex-1 transition-all duration-300 ${
                    selectedEvent.user_attending 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-glow' 
                      : 'hover:scale-105'
                  }`}
                >
                  <UserCheck className="w-5 h-5" />
                  <span>{selectedEvent.user_attending ? 'Going' : 'RSVP'}</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="flex items-center space-x-2 flex-1 hover:scale-105 transition-all duration-300"
                >
                  <Heart className="w-5 h-5" />
                  <span>Interested</span>
                </Button>

                {selectedEvent.place && (
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 hover:bg-primary/10 hover:text-primary transition-all duration-300"
                  >
                    <MapPin className="w-5 h-5" />
                    <span>Directions</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernEvents;

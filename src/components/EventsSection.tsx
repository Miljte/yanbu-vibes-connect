
import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Clock, Heart, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface EventData {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  image_url: string;
  max_attendees: number;
  current_attendees: number;
  is_active: boolean;
  organizer_id: string;
  place_id: string;
  created_at: string;
  updated_at: string;
  interested_count?: number;
  rsvp_count?: number;
  places: {
    id: string;
    name: string;
    type: string;
    address: string;
  };
}

interface UserResponse {
  event_id: string;
  response_type: string;
}

const EventsSection = () => {
  const [events, setEvents] = useState<EventData[]>([]);
  const [userResponses, setUserResponses] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchEvents();
    if (user) {
      fetchUserResponses();
    }
  }, [user]);

  const fetchEvents = async () => {
    try {
      console.log('🔄 Fetching events...');
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          places:place_id (
            id,
            name,
            type,
            address
          )
        `)
        .eq('is_active', true)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Add default values for missing fields
      const eventsWithDefaults = (data || []).map(event => ({
        ...event,
        interested_count: event.interested_count || 0,
        rsvp_count: event.rsvp_count || 0
      }));

      setEvents(eventsWithDefaults);
      console.log('✅ Events loaded:', eventsWithDefaults.length);
    } catch (error) {
      console.error('❌ Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserResponses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('event_responses')
        .select('event_id, response_type')
        .eq('user_id', user.id);

      if (error) throw error;
      setUserResponses(data || []);
    } catch (error) {
      console.error('❌ Error fetching user responses:', error);
    }
  };

  const handleInterested = async (eventId: string) => {
    if (!user) {
      toast.error('Please sign in to show interest');
      return;
    }

    try {
      const existingResponse = userResponses.find(
        r => r.event_id === eventId && r.response_type === 'interested'
      );

      if (existingResponse) {
        // Remove interest
        const { error } = await supabase
          .from('event_responses')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .eq('response_type', 'interested');

        if (error) throw error;
        toast.success('Interest removed');
      } else {
        // Add interest
        const { error } = await supabase
          .from('event_responses')
          .insert({
            event_id: eventId,
            user_id: user.id,
            response_type: 'interested'
          });

        if (error) throw error;
        toast.success('Marked as interested!');
      }

      fetchUserResponses();
      fetchEvents();
    } catch (error) {
      console.error('❌ Error updating interest:', error);
      toast.error('Failed to update interest');
    }
  };

  const handleRSVP = async (eventId: string) => {
    if (!user) {
      toast.error('Please sign in to RSVP');
      return;
    }

    try {
      const existingRSVP = userResponses.find(
        r => r.event_id === eventId && r.response_type === 'rsvp'
      );

      if (existingRSVP) {
        // Remove RSVP
        const { error } = await supabase
          .from('event_responses')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .eq('response_type', 'rsvp');

        if (error) throw error;
        toast.success('RSVP cancelled');
      } else {
        // Add RSVP
        const { error } = await supabase
          .from('event_responses')
          .insert({
            event_id: eventId,
            user_id: user.id,
            response_type: 'rsvp'
          });

        if (error) throw error;
        toast.success('RSVP confirmed!');
      }

      fetchUserResponses();
      fetchEvents();
    } catch (error) {
      console.error('❌ Error updating RSVP:', error);
      toast.error('Failed to update RSVP');
    }
  };

  const isInterested = (eventId: string) => {
    return userResponses.some(r => r.event_id === eventId && r.response_type === 'interested');
  };

  const hasRSVPed = (eventId: string) => {
    return userResponses.some(r => r.event_id === eventId && r.response_type === 'rsvp');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center py-8">
            <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-foreground">Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">🎉 Events</h1>
          <p className="text-muted-foreground">Discover and join exciting events happening nearby</p>
        </div>

        {events.length === 0 ? (
          <Card className="bg-card border text-center py-12">
            <CardContent>
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Events Available</h3>
              <p className="text-muted-foreground">Check back later for upcoming events!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {events.map((event) => (
              <Card key={event.id} className="bg-card border hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {event.image_url && (
                      <div className="md:w-1/3">
                        <img
                          src={event.image_url}
                          alt={event.title}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      </div>
                    )}
                    
                    <div className="flex-1 space-y-4">
                      <div>
                        <h3 className="text-2xl font-bold text-foreground mb-2">{event.title}</h3>
                        <p className="text-muted-foreground">{event.description}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(event.start_time)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4" />
                          <span>{event.places?.name || 'Location TBA'}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>{event.current_attendees}/{event.max_attendees} attending</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="capitalize">
                            {event.places?.type || 'Event'}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4">
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center space-x-1">
                            <Heart className="w-4 h-4" />
                            <span>{event.interested_count || 0} interested</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <UserCheck className="w-4 h-4" />
                            <span>{event.rsvp_count || 0} attending</span>
                          </span>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            variant={isInterested(event.id) ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleInterested(event.id)}
                          >
                            <Heart className={`w-4 h-4 mr-1 ${isInterested(event.id) ? 'fill-current' : ''}`} />
                            {isInterested(event.id) ? 'Interested' : 'Interest'}
                          </Button>
                          
                          <Button
                            variant={hasRSVPed(event.id) ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleRSVP(event.id)}
                            disabled={event.current_attendees >= event.max_attendees && !hasRSVPed(event.id)}
                          >
                            <UserCheck className={`w-4 h-4 mr-1 ${hasRSVPed(event.id) ? 'fill-current' : ''}`} />
                            {hasRSVPed(event.id) ? 'Going' : 'RSVP'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsSection;

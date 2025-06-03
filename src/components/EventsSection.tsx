
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, Heart, Share2, ThumbsUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Event {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  max_attendees: number;
  current_attendees: number;
  interested_count: number;
  rsvp_count: number;
  image_url: string;
  is_active: boolean;
  place_id: string;
  places?: {
    name: string;
    address: string;
    type: string;
  };
}

interface EventResponse {
  event_id: string;
  response_type: 'interested' | 'rsvp';
}

const EventsSection = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [userResponses, setUserResponses] = useState<EventResponse[]>([]);
  const [activeTab, setActiveTab] = useState('all');
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
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          places (
            name,
            address,
            type
          )
        `)
        .eq('is_active', true)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
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
      console.error('Error fetching user responses:', error);
    }
  };

  const handleEventResponse = async (eventId: string, responseType: 'interested' | 'rsvp') => {
    if (!user) {
      toast.error('Please log in to respond to events');
      return;
    }

    try {
      // Check if user already has this response
      const existingResponse = userResponses.find(
        r => r.event_id === eventId && r.response_type === responseType
      );

      if (existingResponse) {
        // Remove the response
        const { error } = await supabase
          .from('event_responses')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .eq('response_type', responseType);

        if (error) throw error;
        
        toast.success(`Removed ${responseType} response`);
      } else {
        // Add the response
        const { error } = await supabase
          .from('event_responses')
          .insert([{
            event_id: eventId,
            user_id: user.id,
            response_type: responseType
          }]);

        if (error) throw error;
        
        toast.success(`Marked as ${responseType}!`);
      }

      // Refresh data
      fetchEvents();
      fetchUserResponses();
    } catch (error) {
      console.error('Error responding to event:', error);
      toast.error('Failed to update response');
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'restaurant': return 'bg-orange-600';
      case 'cafe': return 'bg-amber-600';
      case 'mall': return 'bg-blue-600';
      case 'beach': return 'bg-cyan-600';
      case 'park': return 'bg-green-600';
      case 'event_venue': return 'bg-purple-600';
      default: return 'bg-gray-600';
    }
  };

  const getEventTypeEmoji = (type: string) => {
    switch (type) {
      case 'restaurant': return '🍽️';
      case 'cafe': return '☕';
      case 'mall': return '🛍️';
      case 'beach': return '🏖️';
      case 'park': return '🌳';
      case 'event_venue': return '🎪';
      default: return '📅';
    }
  };

  const hasUserResponded = (eventId: string, responseType: 'interested' | 'rsvp') => {
    return userResponses.some(r => r.event_id === eventId && r.response_type === responseType);
  };

  const filterEvents = (filter: string) => {
    if (filter === 'all') return events;
    if (filter === 'attending') {
      return events.filter(event => 
        userResponses.some(r => r.event_id === event.id && r.response_type === 'rsvp')
      );
    }
    return events.filter(event => event.places?.type === filter);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-white text-lg">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="events" className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Discover Events</h2>
          <p className="text-slate-300">Join exciting events happening around you</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="all" className="data-[state=active]:bg-cyan-600">All Events</TabsTrigger>
            <TabsTrigger value="attending" className="data-[state=active]:bg-cyan-600">My RSVPs</TabsTrigger>
            <TabsTrigger value="restaurant" className="data-[state=active]:bg-cyan-600">Food</TabsTrigger>
            <TabsTrigger value="cafe" className="data-[state=active]:bg-cyan-600">Cafes</TabsTrigger>
            <TabsTrigger value="event_venue" className="data-[state=active]:bg-cyan-600">Venues</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterEvents(activeTab).map((event) => (
                <Card key={event.id} className="bg-slate-800/50 border-slate-700 backdrop-blur-sm overflow-hidden hover:border-cyan-500/50 transition-all">
                  <div className="relative h-48 overflow-hidden">
                    {event.image_url ? (
                      <img 
                        src={event.image_url} 
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center">
                        <Calendar className="w-16 h-16 text-slate-400" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <Badge className={`${getEventTypeColor(event.places?.type || 'event_venue')} text-white`}>
                        {getEventTypeEmoji(event.places?.type || 'event_venue')} {event.places?.type || 'Event'}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary" className="bg-slate-900/80 text-white">
                        {event.places?.name}
                      </Badge>
                    </div>
                  </div>

                  <CardHeader>
                    <CardTitle className="text-white text-lg">{event.title}</CardTitle>
                    <p className="text-slate-300 text-sm line-clamp-2">{event.description}</p>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-slate-300 text-sm">
                        <Calendar className="w-4 h-4 text-cyan-500" />
                        <span>{formatDate(event.start_time)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-300 text-sm">
                        <Clock className="w-4 h-4 text-cyan-500" />
                        <span>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-300 text-sm">
                        <MapPin className="w-4 h-4 text-cyan-500" />
                        <span>{event.places?.address || 'Location TBA'}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-300 text-sm">
                        <Users className="w-4 h-4 text-cyan-500" />
                        <span>
                          {event.current_attendees} / {event.max_attendees} attending
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold text-purple-400">{event.interested_count}</div>
                        <div className="text-xs text-slate-400">Interested</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-400">{event.rsvp_count}</div>
                        <div className="text-xs text-slate-400">RSVPs</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                      <Button
                        size="sm"
                        variant={hasUserResponded(event.id, 'interested') ? 'default' : 'outline'}
                        onClick={() => handleEventResponse(event.id, 'interested')}
                        className={hasUserResponded(event.id, 'interested') 
                          ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                          : 'border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white'
                        }
                      >
                        <ThumbsUp className="w-4 h-4 mr-1" />
                        Interested
                      </Button>
                      
                      <Button
                        size="sm"
                        variant={hasUserResponded(event.id, 'rsvp') ? 'default' : 'outline'}
                        onClick={() => handleEventResponse(event.id, 'rsvp')}
                        className={hasUserResponded(event.id, 'rsvp')
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'border-green-600 text-green-400 hover:bg-green-600 hover:text-white'
                        }
                      >
                        <Heart className="w-4 h-4 mr-1" />
                        RSVP
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filterEvents(activeTab).length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-400 opacity-50" />
                <h3 className="text-xl font-semibold text-white mb-2">No events found</h3>
                <p className="text-slate-400">Check back later for new events!</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EventsSection;

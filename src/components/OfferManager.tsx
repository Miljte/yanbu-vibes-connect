
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Gift } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import MediaUpload from './MediaUpload';

interface Offer {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
}

interface OfferManagerProps {
  placeId: string;
}

const OfferManager: React.FC<OfferManagerProps> = ({ placeId }) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    expires_at: ''
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchOffers();
    setupRealtimeSubscription();
  }, [placeId]);

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('place_id', placeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('offers-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'offers', filter: `place_id=eq.${placeId}` },
        () => {
          fetchOffers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const offerData = {
        ...formData,
        place_id: placeId,
        merchant_id: user.id,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null
      };

      if (editingOffer) {
        const { error } = await supabase
          .from('offers')
          .update(offerData)
          .eq('id', editingOffer.id);
        
        if (error) throw error;
        toast.success('Offer updated successfully!');
      } else {
        const { error } = await supabase
          .from('offers')
          .insert(offerData);
        
        if (error) throw error;
        toast.success('Offer created successfully!');
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving offer:', error);
      toast.error('Failed to save offer');
    }
  };

  const toggleOfferStatus = async (offerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('offers')
        .update({ is_active: !currentStatus })
        .eq('id', offerId);

      if (error) throw error;
      toast.success(`Offer ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error updating offer:', error);
      toast.error('Failed to update offer');
    }
  };

  const deleteOffer = async (offerId: string) => {
    try {
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', offerId);

      if (error) throw error;
      toast.success('Offer deleted successfully!');
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast.error('Failed to delete offer');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      expires_at: ''
    });
    setEditingOffer(null);
  };

  const startEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description,
      image_url: offer.image_url || '',
      expires_at: offer.expires_at ? new Date(offer.expires_at).toISOString().slice(0, 16) : ''
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center">
          <Gift className="w-5 h-5 mr-2" />
          Offers & Promotions
        </h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Create Offer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingOffer ? 'Edit Offer' : 'Create New Offer'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Offer title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
              />
              <Textarea
                placeholder="Offer description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
              />
              <div>
                <label className="block text-sm font-medium mb-2">Offer Image (Optional)</label>
                <MediaUpload
                  onUpload={(urls) => setFormData({...formData, image_url: urls[0] || ''})}
                  maxFiles={1}
                  existingUrls={formData.image_url ? [formData.image_url] : []}
                  folder="offers"
                />
              </div>
              <Input
                type="datetime-local"
                placeholder="Expires at (optional)"
                value={formData.expires_at}
                onChange={(e) => setFormData({...formData, expires_at: e.target.value})}
              />
              <Button type="submit" className="w-full">
                {editingOffer ? 'Update Offer' : 'Create Offer'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {offers.map((offer) => (
          <Card key={offer.id} className="bg-card border">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-foreground text-base">{offer.title}</CardTitle>
                <Badge variant={offer.is_active ? "default" : "secondary"}>
                  {offer.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {offer.image_url && (
                <img
                  src={offer.image_url}
                  alt={offer.title}
                  className="w-full h-32 object-cover rounded"
                />
              )}
              <p className="text-muted-foreground text-sm">{offer.description}</p>
              {offer.expires_at && (
                <p className="text-xs text-muted-foreground">
                  Expires: {new Date(offer.expires_at).toLocaleDateString()}
                </p>
              )}
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startEdit(offer)}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleOfferStatus(offer.id, offer.is_active)}
                >
                  {offer.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteOffer(offer.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {offers.length === 0 && (
        <Card className="bg-muted/20 border-dashed">
          <CardContent className="py-8 text-center">
            <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No offers created yet</p>
            <p className="text-sm text-muted-foreground">Create your first offer to attract customers!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OfferManager;

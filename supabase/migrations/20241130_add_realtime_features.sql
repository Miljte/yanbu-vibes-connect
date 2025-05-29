
-- Create merchant promotions table
CREATE TABLE IF NOT EXISTS public.merchant_promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID REFERENCES auth.users NOT NULL,
  place_id UUID REFERENCES public.places(id) NOT NULL,
  promotion_text TEXT NOT NULL,
  target_users INTEGER DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user bans table
CREATE TABLE IF NOT EXISTS public.user_bans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  banned_by UUID REFERENCES auth.users NOT NULL,
  reason TEXT,
  banned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Create admin logs table
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL, -- 'user', 'place', 'message', etc.
  target_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reported messages table
CREATE TABLE IF NOT EXISTS public.reported_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES public.chat_messages(id) NOT NULL,
  reported_by UUID REFERENCES auth.users NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  reviewed_by UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.merchant_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reported_messages ENABLE ROW LEVEL SECURITY;

-- Merchant promotions policies
CREATE POLICY "Merchants can manage their own promotions" 
  ON public.merchant_promotions 
  FOR ALL 
  USING (auth.uid() = merchant_id);

CREATE POLICY "Admins can view all promotions" 
  ON public.merchant_promotions 
  FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin'));

-- User bans policies
CREATE POLICY "Admins can manage user bans" 
  ON public.user_bans 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin logs policies
CREATE POLICY "Admins can manage admin logs" 
  ON public.admin_logs 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

-- Reported messages policies
CREATE POLICY "Users can report messages" 
  ON public.reported_messages 
  FOR INSERT 
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can view their own reports" 
  ON public.reported_messages 
  FOR SELECT 
  USING (auth.uid() = reported_by);

CREATE POLICY "Admins can manage all reports" 
  ON public.reported_messages 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_promotions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_bans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reported_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.places;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Set replica identity for real-time updates
ALTER TABLE public.merchant_promotions REPLICA IDENTITY FULL;
ALTER TABLE public.user_bans REPLICA IDENTITY FULL;
ALTER TABLE public.admin_logs REPLICA IDENTITY FULL;
ALTER TABLE public.reported_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.user_locations REPLICA IDENTITY FULL;
ALTER TABLE public.places REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  message TEXT NOT NULL,
  is_from_admin BOOLEAN NOT NULL DEFAULT false,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own messages
CREATE POLICY "Users can view own messages"
  ON public.chat_messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own messages (not admin messages)
CREATE POLICY "Users can insert own messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_from_admin = false);

-- Policy: Admins can view all messages
CREATE POLICY "Admins can view all messages"
  ON public.chat_messages
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Admins can insert messages to any user
CREATE POLICY "Admins can insert messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_from_admin = true);

-- Policy: Admins can update messages (e.g., mark as read)
CREATE POLICY "Admins can update messages"
  ON public.chat_messages
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Users can update their own messages (e.g., mark admin messages as read)
CREATE POLICY "Users can update own chat messages"
  ON public.chat_messages
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable real-time
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
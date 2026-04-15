
-- Create scans table
CREATE TABLE public.scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  ai_raw_data JSONB NOT NULL DEFAULT '{}',
  user_edited_data JSONB NOT NULL DEFAULT '{}',
  is_manually_edited BOOLEAN NOT NULL DEFAULT false,
  image_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert scans (no auth, device-based)
CREATE POLICY "Anyone can insert scans"
ON public.scans
FOR INSERT
WITH CHECK (true);

-- Allow reading own scans by device_id
CREATE POLICY "Anyone can read scans by device_id"
ON public.scans
FOR SELECT
USING (true);

-- Create index for quota checking
CREATE INDEX idx_scans_device_id_created_at ON public.scans (device_id, created_at DESC);

-- Create storage bucket for scan images
INSERT INTO storage.buckets (id, name, public) VALUES ('scan-images', 'scan-images', true);

-- Storage policies
CREATE POLICY "Anyone can upload scan images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'scan-images');

CREATE POLICY "Anyone can view scan images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'scan-images');

-- Function to check daily quota
CREATE OR REPLACE FUNCTION public.check_scan_quota(p_device_id TEXT, p_limit INT DEFAULT 10)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT COUNT(*)
    FROM public.scans
    WHERE device_id = p_device_id
      AND created_at > now() - interval '24 hours'
  ) < p_limit;
$$;

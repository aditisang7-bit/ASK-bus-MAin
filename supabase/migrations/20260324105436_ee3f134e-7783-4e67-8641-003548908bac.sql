
CREATE TABLE public.business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  business_name text NOT NULL DEFAULT '',
  owner_name text NOT NULL DEFAULT '',
  gst_number text DEFAULT '',
  address text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  pincode text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  upi_id text DEFAULT '',
  logo_url text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own business profile"
  ON public.business_profiles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add status update capability to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_method text DEFAULT '';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

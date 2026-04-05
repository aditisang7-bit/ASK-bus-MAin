CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'free',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  amount numeric NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 days'),
  razorpay_subscription_id text,
  status text NOT NULL DEFAULT 'trial',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subscription" ON public.subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resource text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  period_start timestamptz NOT NULL DEFAULT date_trunc('month', now()),
  period_end timestamptz NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, resource, period_start)
);

ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own usage" ON public.usage_tracking
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_usage_tracking_updated_at
  BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.increment_usage(_user_id uuid, _resource text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  period_s timestamptz := date_trunc('month', now());
  period_e timestamptz := date_trunc('month', now()) + interval '1 month';
BEGIN
  INSERT INTO public.usage_tracking (user_id, resource, count, period_start, period_end)
  VALUES (_user_id, _resource, 1, period_s, period_e)
  ON CONFLICT (user_id, resource, period_start)
  DO UPDATE SET count = usage_tracking.count + 1, updated_at = now()
  RETURNING count INTO current_count;
  RETURN current_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_usage(_user_id uuid, _resource text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT count FROM public.usage_tracking
     WHERE user_id = _user_id
       AND resource = _resource
       AND period_start = date_trunc('month', now())),
    0
  );
$$;
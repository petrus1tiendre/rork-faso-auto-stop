-- ============================================================
-- Faso Auto-stop: Complete Database Schema (Idempotent)
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT DEFAULT '',
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  rating NUMERIC(3,1) DEFAULT 5.0,
  total_trips INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, avatar_url, is_verified, rating, total_trips)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.phone, ''),
    NULL,
    FALSE,
    5.0,
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- 2. TRIPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('urbain', 'interville')),
  departure TEXT NOT NULL,
  arrival TEXT NOT NULL,
  trip_date DATE NOT NULL,
  trip_time TIME NOT NULL,
  seats INTEGER NOT NULL DEFAULT 3 CHECK (seats > 0 AND seats <= 10),
  price_fcfa INTEGER NOT NULL DEFAULT 0 CHECK (price_fcfa >= 0),
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_type ON public.trips(type);
CREATE INDEX IF NOT EXISTS idx_trips_date ON public.trips(trip_date);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON public.trips(created_at DESC);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trips are viewable by everyone" ON public.trips;
CREATE POLICY "Trips are viewable by everyone"
  ON public.trips FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create trips" ON public.trips;
CREATE POLICY "Authenticated users can create trips"
  ON public.trips FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own trips" ON public.trips;
CREATE POLICY "Users can update own trips"
  ON public.trips FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own trips" ON public.trips;
CREATE POLICY "Users can delete own trips"
  ON public.trips FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 3. BOOKINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, passenger_id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_trip_id ON public.bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_bookings_passenger_id ON public.bookings(passenger_id);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their bookings" ON public.bookings;
CREATE POLICY "Users can view their bookings"
  ON public.bookings FOR SELECT
  USING (
    auth.uid() = passenger_id
    OR auth.uid() IN (SELECT user_id FROM public.trips WHERE id = trip_id)
  );

DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;
CREATE POLICY "Authenticated users can create bookings"
  ON public.bookings FOR INSERT WITH CHECK (auth.uid() = passenger_id);

DROP POLICY IF EXISTS "Involved users can update bookings" ON public.bookings;
CREATE POLICY "Involved users can update bookings"
  ON public.bookings FOR UPDATE
  USING (
    auth.uid() = passenger_id
    OR auth.uid() IN (SELECT user_id FROM public.trips WHERE id = trip_id)
  );

-- ============================================================
-- 4. MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON public.messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Booking participants can view messages" ON public.messages;
CREATE POLICY "Booking participants can view messages"
  ON public.messages FOR SELECT
  USING (
    auth.uid() IN (
      SELECT passenger_id FROM public.bookings WHERE id = booking_id
      UNION
      SELECT t.user_id FROM public.trips t
      JOIN public.bookings b ON b.trip_id = t.id
      WHERE b.id = booking_id
    )
  );

DROP POLICY IF EXISTS "Booking participants can send messages" ON public.messages;
CREATE POLICY "Booking participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND auth.uid() IN (
      SELECT passenger_id FROM public.bookings WHERE id = booking_id
      UNION
      SELECT t.user_id FROM public.trips t
      JOIN public.bookings b ON b.trip_id = t.id
      WHERE b.id = booking_id
    )
  );

-- ============================================================
-- 5. REPORTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can create reports" ON public.reports;
CREATE POLICY "Authenticated users can create reports"
  ON public.reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 6. PHONE VERIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.phone_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_verif_user ON public.phone_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verif_phone ON public.phone_verifications(phone);

ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own verifications" ON public.phone_verifications;
CREATE POLICY "Users can view own verifications"
  ON public.phone_verifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create verifications" ON public.phone_verifications;
CREATE POLICY "Users can create verifications"
  ON public.phone_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own verifications" ON public.phone_verifications;
CREATE POLICY "Users can update own verifications"
  ON public.phone_verifications FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- 7. FUNCTION: Request phone OTP
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_phone_otp(p_phone TEXT)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_otp TEXT;
  v_expires TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Non connecte');
  END IF;

  v_otp := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  v_expires := NOW() + INTERVAL '10 minutes';

  DELETE FROM public.phone_verifications
  WHERE user_id = v_user_id AND phone = p_phone;

  INSERT INTO public.phone_verifications (user_id, phone, otp_code, expires_at)
  VALUES (v_user_id, p_phone, v_otp, v_expires);

  -- In dev mode, return the OTP directly. In production, integrate SMS gateway here.
  RETURN json_build_object('success', true, 'otp', v_otp, 'expires_at', v_expires);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. FUNCTION: Verify phone OTP
-- ============================================================
CREATE OR REPLACE FUNCTION public.verify_phone_otp(p_phone TEXT, p_otp TEXT)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_record RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Non connecte');
  END IF;

  SELECT * INTO v_record
  FROM public.phone_verifications
  WHERE user_id = v_user_id AND phone = p_phone AND verified = FALSE
  ORDER BY created_at DESC LIMIT 1;

  IF v_record IS NULL THEN
    RETURN json_build_object('error', 'Aucun code en attente pour ce numero');
  END IF;

  IF v_record.expires_at < NOW() THEN
    RETURN json_build_object('error', 'Le code a expire. Veuillez en demander un nouveau.');
  END IF;

  IF v_record.attempts >= 5 THEN
    RETURN json_build_object('error', 'Trop de tentatives. Demandez un nouveau code.');
  END IF;

  UPDATE public.phone_verifications SET attempts = attempts + 1 WHERE id = v_record.id;

  IF v_record.otp_code != p_otp THEN
    RETURN json_build_object('error', 'Code incorrect. Tentatives restantes: ' || (4 - v_record.attempts)::TEXT);
  END IF;

  UPDATE public.phone_verifications SET verified = TRUE WHERE id = v_record.id;
  UPDATE public.profiles SET phone = p_phone, is_verified = TRUE WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'message', 'Numero verifie avec succes!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. STORAGE BUCKET for avatars
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

-- ============================================================
-- 10. ENABLE REALTIME
-- ============================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

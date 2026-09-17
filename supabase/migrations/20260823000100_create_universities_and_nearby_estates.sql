-- ============================================================================================
-- Migration: 20260823000100_create_universities_and_nearby_estates.sql
-- Description:
-- 1. Creates `universities` table to enable students/tenants to filter rentals near universities & colleges across Kenya.
-- 2. Uses a `nearby_estates text[]` column with GIN indexing for fast, flexible sub-area matching.
-- 3. Adds an `estate` column to `properties` table (if not exists) for normalized estate tagging.
-- 4. Seeds 60+ Kenyan public universities, private universities, and major colleges/polytechnics with comprehensive nearby student estates.
-- 5. Creates a fast search RPC `get_properties_near_university` for optimal database-level matching.
-- ============================================================================================

-- 1. Ensure extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Add 'estate' column to properties if not already present
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS estate text;

-- Backfill estate from location if empty
UPDATE public.properties
SET estate = split_part(location, ',', 1)
WHERE estate IS NULL AND location IS NOT NULL;

-- 3. Create universities table
CREATE TABLE IF NOT EXISTS public.universities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  short_name      TEXT,
  category        TEXT CHECK (category IN ('public_university', 'private_university', 'college_tvet', 'other')) DEFAULT 'public_university',
  county          TEXT NOT NULL,
  campus          TEXT,
  nearby_estates  TEXT[] NOT NULL DEFAULT '{}',
  website         TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for fast search and estate array lookups
CREATE INDEX IF NOT EXISTS idx_universities_county ON public.universities (county);
CREATE INDEX IF NOT EXISTS idx_universities_category ON public.universities (category);
CREATE INDEX IF NOT EXISTS idx_universities_nearby_estates_gin ON public.universities USING GIN (nearby_estates);
CREATE INDEX IF NOT EXISTS idx_universities_name_trgm ON public.universities USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_universities_short_name_trgm ON public.universities USING GIN (short_name gin_trgm_ops);

-- Indexing on properties for estate and location fast filtering
CREATE INDEX IF NOT EXISTS idx_properties_estate ON public.properties (estate);
CREATE INDEX IF NOT EXISTS idx_properties_location_trgm ON public.properties USING GIN (location gin_trgm_ops);

-- Enable RLS on universities (public read, admin write)
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS universities_select_policy ON public.universities;
CREATE POLICY universities_select_policy ON public.universities
  FOR SELECT TO authenticated, anon
  USING (is_active = true);

DROP POLICY IF EXISTS universities_admin_all_policy ON public.universities;
CREATE POLICY universities_admin_all_policy ON public.universities
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id::text = auth.uid()::text
        AND profiles.role IN ('admin', 'superadmin')
    )
  );

GRANT SELECT ON public.universities TO authenticated, anon;

-- 4. Seed Data: Comprehensive list of Kenyan Universities and Colleges with student residential estates
INSERT INTO public.universities (name, short_name, category, county, campus, nearby_estates)
VALUES
  -- NAIROBI COUNTY
  (
    'University of Nairobi - Main & Chiromo Campus',
    'UoN Main / Chiromo',
    'public_university',
    'Nairobi',
    'Main & Chiromo',
    ARRAY['Chiromo', 'Ngara', 'CBD', 'Parklands', 'Westlands', 'Pangani', 'Riverside', 'State House Road', 'Kileleshwa', 'Hurlingham']
  ),
  (
    'University of Nairobi - Kikuyu Campus',
    'UoN Kikuyu',
    'public_university',
    'Kiambu',
    'Kikuyu',
    ARRAY['Kikuyu Town', 'Thogoto', 'Ondiri', 'Kidfarmaco', 'Zambezi', 'Sigona', 'Gitaru', 'Kamangu']
  ),
  (
    'University of Nairobi - Lower Kabete Campus',
    'UoN Lower Kabete',
    'public_university',
    'Nairobi',
    'Lower Kabete',
    ARRAY['Lower Kabete', 'Spring Valley', 'Kabete', 'Wangige', 'Loresho', 'Kyuna', 'Uthiru']
  ),
  (
    'University of Nairobi - Parklands Law Campus',
    'UoN Parklands',
    'public_university',
    'Nairobi',
    'Parklands Law',
    ARRAY['Parklands', 'Ngara', 'Highridge', 'Westlands', 'City Park', 'Pangani']
  ),
  (
    'University of Nairobi - Upper Hill (KNH Medical School)',
    'UoN Medical School',
    'public_university',
    'Nairobi',
    'KNH Medical',
    ARRAY['Upper Hill', 'Kenyatta National Hospital area', 'Ngumo', 'Mbagathi Way', 'Nairobi West', 'Madaraka', 'Kilimani', 'Community']
  ),
  (
    'Kenyatta University - Main Campus',
    'KU Main',
    'public_university',
    'Nairobi',
    'Main Campus',
    ARRAY['Kahawa Sukari', 'Kahawa Wendani', 'KM', 'Roysambu', 'Githurai 44', 'Githurai 45', 'Zimmerman', 'Kasarani', 'Ruiru Town', 'Clay City']
  ),
  (
    'Kenyatta University - Parklands Campus',
    'KU Parklands',
    'public_university',
    'Nairobi',
    'Parklands',
    ARRAY['Parklands', 'Highridge', 'Ngara', 'Westlands', 'Pangani']
  ),
  (
    'Strathmore University',
    'Strathmore',
    'private_university',
    'Nairobi',
    'Madaraka',
    ARRAY['Madaraka', 'Nairobi West', 'Ole Sangale', 'South C', 'Mbagathi Road', 'Langata', 'Upper Hill', 'T-Mall area', 'Dam Estate']
  ),
  (
    'United States International University Africa',
    'USIU-Africa',
    'private_university',
    'Nairobi',
    'Roysambu / Kasarani',
    ARRAY['Roysambu', 'Safari Park', 'Mirema Drive', 'Roasters', 'USIU Road', 'Kasarani', 'Garden Estate', 'Thome', 'Zimmerman', 'Clay City']
  ),
  (
    'Technical University of Kenya',
    'TUK',
    'public_university',
    'Nairobi',
    'CBD / Haile Selassie',
    ARRAY['CBD', 'South B', 'Ngara', 'Pangani', 'Nairobi West', 'Madaraka', 'Upper Hill', 'Railway']
  ),
  (
    'KCA University',
    'KCA Main',
    'private_university',
    'Nairobi',
    'Ruaraka',
    ARRAY['Ruaraka', 'Allsops', 'Baba Dogo', 'Utalii area', 'Garden Estate', 'Outer Ring Road', 'Pangani', 'Ngara', 'Thika Road']
  ),
  (
    'Catholic University of Eastern Africa',
    'CUEA Main',
    'private_university',
    'Nairobi',
    'Karen',
    ARRAY['Karen', 'Bogani', 'Hardy', 'Langata', 'Ongata Rongai', 'Kuinda', 'Bomas', 'Magadi Road']
  ),
  (
    'Daystar University - Valley Road Campus',
    'Daystar Valley Rd',
    'private_university',
    'Nairobi',
    'Valley Road',
    ARRAY['Valley Road', 'Hurlingham', 'Kilimani', 'Upper Hill', 'Ngumo', 'Mbagathi', 'Community']
  ),
  (
    'Riara University',
    'Riara',
    'private_university',
    'Nairobi',
    'Mbagathi Way',
    ARRAY['Mbagathi Way', 'Nairobi West', 'Madaraka', 'Ngumo', 'Golf Course', 'Highview', 'South C', 'Langata']
  ),
  (
    'Pan Africa Christian University',
    'PAC University',
    'private_university',
    'Nairobi',
    'Roysambu',
    ARRAY['Roysambu', 'Safari Park', 'Roasters', 'Mirema', 'Kasarani', 'Garden Estate', 'Zimmerman']
  ),
  (
    'Co-operative University of Kenya',
    'CUK Karen',
    'public_university',
    'Nairobi',
    'Karen / Ushirika',
    ARRAY['Karen', 'Bogani', 'Hardy', 'Ushirika', 'Langata', 'Ongata Rongai', 'Kuinda']
  ),
  (
    'Multimedia University of Kenya',
    'MMU',
    'public_university',
    'Nairobi',
    'Magadi Road / Rongai border',
    ARRAY['Ongata Rongai', 'Magadi Road', 'Maasai Lodge', 'Nazarene area', 'Tuala', 'Tumaini', 'Bomas', 'Langata']
  ),
  (
    'Kenya Medical Training College - Nairobi (KNH)',
    'KMTC Nairobi',
    'college_tvet',
    'Nairobi',
    'KNH Grounds',
    ARRAY['KNH area', 'Upper Hill', 'Ngumo', 'Mbagathi Way', 'Nairobi West', 'Madaraka', 'Highview']
  ),
  (
    'Kenya Institute of Mass Communication',
    'KIMC South B',
    'college_tvet',
    'Nairobi',
    'South B',
    ARRAY['South B', 'Mariakani', 'Plainsview', 'Golden Gate', 'Balozi', 'Hazina', 'Nairobi West', 'South C']
  ),
  (
    'Kenya Utalii College',
    'Utalii College',
    'college_tvet',
    'Nairobi',
    'Thika Road',
    ARRAY['Ruaraka', 'Allsops', 'Baba Dogo', 'Utalii', 'Ngara', 'Pangani', 'Garden Estate']
  ),
  (
    'Railway Training Institute',
    'RTI South B',
    'college_tvet',
    'Nairobi',
    'South B',
    ARRAY['South B', 'Plainsview', 'Mariakani', 'Hazina', 'South C', 'Nairobi West']
  ),
  (
    'Nairobi Technical Training Institute',
    'Nairobi Tech (NTTI)',
    'college_tvet',
    'Nairobi',
    'Ngara',
    ARRAY['Ngara', 'Pangani', 'Parklands', 'CBD', 'Guru Nanak', 'Desai Road']
  ),
  (
    'Kabete National Polytechnic',
    'Kabete Poly',
    'college_tvet',
    'Nairobi',
    'Lower Kabete',
    ARRAY['Lower Kabete', 'Kabete', 'Wangige', 'Uthiru', 'Loresho', 'Spring Valley']
  ),

  -- KIAMBU COUNTY
  (
    'Jomo Kenyatta University of Agriculture and Technology',
    'JKUAT Main',
    'public_university',
    'Kiambu',
    'Juja Main Campus',
    ARRAY['Juja', 'Gate C', 'Gate A', 'Gate B', 'High Point', 'Gachororo', 'Juja Stage', 'Kalimoni', 'Mirimaini', 'Kenyatta Road', 'Theta', 'Witeithie']
  ),
  (
    'Mount Kenya University - Main Campus',
    'MKU Thika Main',
    'private_university',
    'Kiambu',
    'Thika Main Campus',
    ARRAY['Thika Town', 'Section 9', 'Makongeni', 'Landless', 'Kiganjo Thika', 'Ngoingwa', 'General Kago', 'Posta Thika', 'Bata', 'Chania']
  ),
  (
    'Zetech University - Technology Park',
    'Zetech Ruiru',
    'private_university',
    'Kiambu',
    'Ruiru Campus',
    ARRAY['Ruiru Town', 'Wataalam', 'Githunguri Road', 'Kahawa Sukari', 'Kahawa Wendani', 'Toll Station', 'Membley', 'Kihunguro', 'Kimbo']
  ),
  (
    'St. Paul''s University - Main Campus',
    'St. Pauls Limuru',
    'private_university',
    'Kiambu',
    'Limuru',
    ARRAY['Limuru Town', 'Tigoni', 'Kabuku', 'Ngecha', 'Banana', 'Ruaka', 'Rironi']
  ),
  (
    'Gretsa University',
    'Gretsa Thika',
    'private_university',
    'Kiambu',
    'Thika',
    ARRAY['Thika Town', 'Section 9', 'Makongeni', 'Landless', 'Kiganjo', 'General Kago']
  ),
  (
    'Thika Technical Training Institute',
    'Thika TTI',
    'college_tvet',
    'Kiambu',
    'Thika',
    ARRAY['Thika Town', 'Section 9', 'Makongeni', 'Landless', 'Bata', 'Hospital area Thika']
  ),

  -- NAKURU COUNTY
  (
    'Egerton University - Njoro Main Campus',
    'Egerton Njoro',
    'public_university',
    'Nakuru',
    'Njoro',
    ARRAY['Njoro Town', 'Tatton', 'Gate', 'Njokerio', 'Jewel', 'Kilimo', 'Chesir', 'Ngata', 'Njoro Canning']
  ),
  (
    'Egerton University - Nakuru Town Campus',
    'Egerton Nakuru Town',
    'public_university',
    'Nakuru',
    'Nakuru CBD',
    ARRAY['Nakuru CBD', 'Milimani Nakuru', 'Section 58', 'Freehold', 'Kanu Street', 'Pipeline Nakuru', 'Shabab', 'Kiamunyi']
  ),
  (
    'Kabarak University - Main Campus',
    'Kabarak',
    'private_university',
    'Nakuru',
    'Kabarak / Rongai',
    ARRAY['Kabarak', 'Kiamunyi', 'Mercy Njeri', 'Olive', 'Oloika', 'Rongai Nakuru', 'Nakuru West']
  ),
  (
    'KMTC Nakuru',
    'KMTC Nakuru',
    'college_tvet',
    'Nakuru',
    'PGH Nakuru',
    ARRAY['Milimani Nakuru', 'Section 58', 'Freehold', 'Nakuru CBD', 'Pipeline']
  ),
  (
    'Rift Valley Institute of Science and Technology',
    'RVIST Nakuru',
    'college_tvet',
    'Nakuru',
    'Njoro Road',
    ARRAY['RVIST area', 'Ngata', 'Kiamunyi', 'Njoro', 'Pipeline Nakuru', 'Section 58']
  ),

  -- UASIN GISHU COUNTY (ELDORET)
  (
    'Moi University - Main Campus',
    'Moi Main (Kesses)',
    'public_university',
    'Uasin Gishu',
    'Kesses Main Campus',
    ARRAY['Kesses', 'Cheboiywo', 'Stage', 'Talai', 'Mageso', 'Hill School', 'Chirchir', 'Eldoret Outskirts']
  ),
  (
    'Moi University - Annex Town / Law Campus',
    'Moi Annex Law',
    'public_university',
    'Uasin Gishu',
    'Annex / Eldoret Town',
    ARRAY['Annex', 'Elgon View', 'Eldoret CBD', 'Pioneer Eldoret', 'Langas', 'Kapsoya', 'Kidiwa']
  ),
  (
    'University of Eldoret (Chepkoilel)',
    'UoE Chepkoilel',
    'public_university',
    'Uasin Gishu',
    'Chepkoilel',
    ARRAY['Chepkoilel', 'Marura', 'Kipkenyo', 'University Gate', 'Action Estate', 'Rock Centre', 'Eldoret Town', 'Maili Nne']
  ),
  (
    'Eldoret National Polytechnic',
    'Eldoret Poly',
    'college_tvet',
    'Uasin Gishu',
    'Eldoret Town',
    ARRAY['Pioneer Eldoret', 'Langas', 'Elgon View', 'Eldoret CBD', 'Annex', 'Kapsoya']
  ),
  (
    'Rift Valley Technical Training Institute',
    'RVTTI Eldoret',
    'college_tvet',
    'Uasin Gishu',
    'Eldoret',
    ARRAY['Pioneer', 'Elgon View', 'Annex', 'Eldoret CBD', 'Langas']
  ),

  -- KISUMU COUNTY
  (
    'Maseno University - Main Campus',
    'Maseno Main',
    'public_university',
    'Kisumu',
    'Maseno',
    ARRAY['Maseno Town', 'Siriba', 'College Gate', 'Luanda', 'Emusire', 'Ekwanda', 'Kombewa']
  ),
  (
    'Maseno University - Kisumu City Campus',
    'Maseno Kisumu City',
    'public_university',
    'Kisumu',
    'Kisumu CBD',
    ARRAY['Kisumu CBD', 'Milimani Kisumu', 'Tom Mboya Estate', 'Mamboleo', 'Riat', 'Migosi', 'Kondele', 'Nyamasaria']
  ),
  (
    'Kisumu National Polytechnic',
    'Kisumu Poly',
    'college_tvet',
    'Kisumu',
    'Kisumu Town',
    ARRAY['Kondele', 'Tom Mboya Estate', 'Milimani Kisumu', 'Migosi', 'Nyamasaria', 'Manyatta']
  ),
  (
    'Ramogi Institute of Advanced Technology',
    'RIAT Kisumu',
    'college_tvet',
    'Kisumu',
    'Riat Hills',
    ARRAY['Riat', 'Mamboleo', 'Kibos Road', 'Migosi', 'Kondele', 'Kajulu']
  ),

  -- MOMBASA & COAST
  (
    'Technical University of Mombasa',
    'TUM Main',
    'public_university',
    'Mombasa',
    'Tudor',
    ARRAY['Tudor', 'Tom Mboya', 'Kizingo', 'Mombasa CBD', 'Nyali', 'Makupa', 'Majengo Mombasa', 'Buxton']
  ),
  (
    'Pwani University',
    'Pwani Univ Kilifi',
    'public_university',
    'Kilifi',
    'Kilifi Main',
    ARRAY['Kilifi Town', 'Mnarani', 'Sokoni', 'Sea Horse', 'Kibarani', 'Bofa', 'Mtwapa']
  ),
  (
    'Kenya Coast National Polytechnic',
    'Coast Poly Mombasa',
    'college_tvet',
    'Mombasa',
    'Mombasa Town',
    ARRAY['Mombasa CBD', 'Kizingo', 'Tudor', 'Majengo', 'Nyali', 'Makupa']
  ),
  (
    'Taita Taveta University',
    'TTU Voi',
    'public_university',
    'Taita Taveta',
    'Voi',
    ARRAY['Voi Town', 'Ikanga', 'Sofia', 'Mwakingali', 'Caltex Voi', 'Mwatate']
  ),

  -- NYERI & CENTRAL
  (
    'Dedan Kimathi University of Technology',
    'DeKUT Nyeri',
    'public_university',
    'Nyeri',
    'Nyeri Main',
    ARRAY['Nyeri Town', 'Ring Road', 'Kangemi Nyeri', 'Mweiga', 'Skuta', 'Ruring''u', 'King''ong''o', 'Kamakwa']
  ),
  (
    'Karatina University - Main Campus',
    'Karatina Univ',
    'public_university',
    'Nyeri',
    'Kagochi',
    ARRAY['Kagochi', 'Karatina Town', 'Ragati', 'Muthua', 'General China', 'Kirinyaga Road']
  ),
  (
    'Nyeri National Polytechnic',
    'Nyeri Poly',
    'college_tvet',
    'Nyeri',
    'Nyeri Town',
    ARRAY['Nyeri Town', 'Ring Road', 'Skuta', 'Ruring''u', 'King''ong''o', 'Kamakwa']
  ),
  (
    'Murang''a University of Technology',
    'MUT Murang''a',
    'public_university',
    'Murang''a',
    'Murang''a Town',
    ARRAY['Murang''a Town', 'Mumbi Estate', 'Ihura', 'Mukuyu', 'Mbiri', 'St. Marys']
  ),

  -- KAKAMEGA & WESTERN
  (
    'Masinde Muliro University of Science and Technology',
    'MMUST Kakamega',
    'public_university',
    'Kakamega',
    'Kakamega Main',
    ARRAY['Kakamega Town', 'Lurambi', 'Kefinco', 'Amalemba', 'Sichirai', 'Milimani Kakamega', 'Otiende', 'Showground Kakamega', 'Kambi Somali']
  ),
  (
    'Sigalagala National Polytechnic',
    'Sigalagala Poly',
    'college_tvet',
    'Kakamega',
    'Khayega',
    ARRAY['Khayega', 'Sigalagala', 'Kakamega Town', 'Lurambi', 'Musoli']
  ),
  (
    'Kibabii University',
    'Kibabii Bungoma',
    'public_university',
    'Bungoma',
    'Bungoma',
    ARRAY['Bungoma Town', 'Kanduyi', 'Kibabii Centre', 'Mayanja', 'Tuuti', 'Kibabii Market']
  ),
  (
    'Kisii University - Main Campus',
    'Kisii University',
    'public_university',
    'Kisii',
    'Kisii Main',
    ARRAY['Kisii Town', 'Mwembe', 'Jogoo', 'Nyanchwa', 'Daraja Mbili', 'Milimani Kisii', 'Gesonso']
  ),

  -- EASTERN & LOWER EASTERN
  (
    'Machakos University',
    'Machakos Univ',
    'public_university',
    'Machakos',
    'Machakos Main',
    ARRAY['Machakos Town', 'Katoloni', 'Eastleigh Machakos', 'Miwani', 'Kivandini', 'Grogon Machakos', 'Kola Road']
  ),
  (
    'Daystar University - Athi River Campus',
    'Daystar Athi River',
    'private_university',
    'Machakos',
    'Athi River',
    ARRAY['Athi River', 'Daystar Valley', 'Lukenya', 'Kitengela', 'Mlolongo', 'Green Park', 'Greatwall Gardens']
  ),
  (
    'Meru University of Science and Technology',
    'MUST Meru',
    'public_university',
    'Meru',
    'Nchiru',
    ARRAY['Nchiru', 'Meru Town', 'Makutano Meru', 'Maua Road', 'Gakoromone', 'Kianjai']
  ),
  (
    'Chuka University - Main Campus',
    'Chuka University',
    'public_university',
    'Tharaka Nithi',
    'Ndagani',
    ARRAY['Ndagani', 'Chuka Town', 'Mois', 'Kajiunduthi', 'Igembe', 'Rubate']
  ),
  (
    'South Eastern Kenya University',
    'SEKU Kitui',
    'public_university',
    'Kitui',
    'Kwa Vonza',
    ARRAY['Kwa Vonza', 'Kitui Town', 'Kanyonyoo', 'Lower Yatta', 'Maniers']
  ),

  -- KAJIADO / RIFT VALLEY
  (
    'Africa Nazarene University',
    'ANU Rongai',
    'private_university',
    'Kajiado',
    'Ongata Rongai',
    ARRAY['Ongata Rongai', 'Maasai Lodge', 'Nazarene Gate', 'Tuala', 'Tumaini Rongai', 'Kiserian', 'Rimpa']
  ),
  (
    'Maasai Mara University',
    'Maasai Mara Narok',
    'public_university',
    'Narok',
    'Narok Town',
    ARRAY['Narok Town', 'Total Narok', 'Lenana Narok', 'Majengo Narok', 'Rotian', 'Ololulung''a']
  ),
  (
    'Laikipia University',
    'Laikipia Univ',
    'public_university',
    'Laikipia',
    'Nyahururu',
    ARRAY['Nyahururu Town', 'Laikipia Main Gate', 'Karuga', 'Equator', 'Maina Estate']
  )
ON CONFLICT DO NOTHING;

-- 5. Helper Stored Function for database-side query: get_properties_near_university
CREATE OR REPLACE FUNCTION public.get_properties_near_university(
  p_university_id UUID,
  p_county TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_min_price NUMERIC DEFAULT NULL,
  p_max_price NUMERIC DEFAULT NULL,
  p_limit INT DEFAULT 30,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  landlord_id TEXT,
  title TEXT,
  description TEXT,
  location TEXT,
  county TEXT,
  estate TEXT,
  type TEXT,
  price INT,
  amenities TEXT[],
  images TEXT[],
  is_active BOOLEAN,
  is_boosted BOOLEAN,
  boost_tier TEXT,
  created_at TIMESTAMPTZ,
  matched_estate TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estates TEXT[];
  v_univ_county TEXT;
BEGIN
  -- Fetch estates and county for this university
  SELECT nearby_estates, universities.county
  INTO v_estates, v_univ_county
  FROM universities
  WHERE universities.id = p_university_id;

  IF v_estates IS NULL OR array_length(v_estates, 1) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.landlord_id,
    p.title,
    p.description,
    p.location,
    p.county,
    p.estate,
    p.type,
    p.price,
    p.amenities,
    p.images,
    p.is_active,
    COALESCE(p.is_boosted, false) as is_boosted,
    p.boost_tier,
    p.created_at,
    (
      SELECT est
      FROM unnest(v_estates) est
      WHERE p.location ILIKE '%' || est || '%'
         OR p.estate ILIKE '%' || est || '%'
         OR p.title ILIKE '%' || est || '%'
         OR p.description ILIKE '%' || est || '%'
      LIMIT 1
    ) AS matched_estate
  FROM properties p
  WHERE p.is_active = true
    AND p.payment_status NOT IN ('unpaid', 'pending_verification')
    AND (
      -- Match against any nearby estate in location, estate, title, or description
      EXISTS (
        SELECT 1
        FROM unnest(v_estates) est
        WHERE p.location ILIKE '%' || est || '%'
           OR p.estate ILIKE '%' || est || '%'
           OR p.title ILIKE '%' || est || '%'
           OR p.description ILIKE '%' || est || '%'
      )
    )
    AND (p_county IS NULL OR p_county = 'All Counties' OR p.county = p_county)
    AND (p_type IS NULL OR p_type = 'all' OR p.type = p_type)
    AND (p_min_price IS NULL OR p.price >= p_min_price)
    AND (p_max_price IS NULL OR p.price <= p_max_price)
  ORDER BY
    COALESCE(p.is_boosted, false) DESC,
    p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_properties_near_university(UUID, TEXT, TEXT, NUMERIC, NUMERIC, INT, INT) TO authenticated, anon;

NOTIFY pgrst, 'reload schema';

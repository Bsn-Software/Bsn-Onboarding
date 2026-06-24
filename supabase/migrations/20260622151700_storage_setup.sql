-- ─────────────────────────────────────────────────────────────
-- Création du Bucket Supabase Storage
-- ─────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'onboarding_documents',
  'onboarding_documents',
  false, -- Privé
  5242880, -- 5 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- RLS pour le stockage (storage.objects)
-- ─────────────────────────────────────────────────────────────

-- 1. Les collaborateurs peuvent uploader leurs propres fichiers
-- Le chemin du fichier sera : "collaborator_id/filename"
CREATE POLICY "Collaborateurs peuvent uploader leurs fichiers"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'onboarding_documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2. Les collaborateurs peuvent lire leurs propres fichiers
CREATE POLICY "Collaborateurs peuvent lire leurs fichiers"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'onboarding_documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Les RH peuvent lire tous les fichiers du bucket
CREATE POLICY "RH peuvent lire tous les fichiers"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'onboarding_documents' AND
    public.is_hr()
  );

-- 4. Les RH peuvent supprimer des fichiers
CREATE POLICY "RH peuvent supprimer des fichiers"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'onboarding_documents' AND
    public.is_hr()
  );

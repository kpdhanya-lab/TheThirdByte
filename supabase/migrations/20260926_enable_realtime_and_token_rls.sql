-- Enable Realtime on prescriptions and dispense_tokens
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.prescriptions;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dispense_tokens;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Enable RLS and add public policies for dispense_tokens
ALTER TABLE public.dispense_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon and auth read dispense_tokens" ON public.dispense_tokens;
CREATE POLICY "Allow anon and auth read dispense_tokens"
  ON public.dispense_tokens FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow anon and auth insert dispense_tokens" ON public.dispense_tokens;
CREATE POLICY "Allow anon and auth insert dispense_tokens"
  ON public.dispense_tokens FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon and auth update dispense_tokens" ON public.dispense_tokens;
CREATE POLICY "Allow anon and auth update dispense_tokens"
  ON public.dispense_tokens FOR UPDATE
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow anon and auth delete dispense_tokens" ON public.dispense_tokens;
CREATE POLICY "Allow anon and auth delete dispense_tokens"
  ON public.dispense_tokens FOR DELETE
  TO anon, authenticated
  USING (true);

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_dispense_tokens_prescription_id ON public.dispense_tokens(prescription_id);
CREATE INDEX IF NOT EXISTS idx_dispense_tokens_patient_id ON public.dispense_tokens(patient_id);
CREATE INDEX IF NOT EXISTS idx_dispense_tokens_token ON public.dispense_tokens(token);
CREATE INDEX IF NOT EXISTS idx_dispense_tokens_status ON public.dispense_tokens(status);

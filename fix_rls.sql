CREATE OR REPLACE FUNCTION public.is_hr() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hr');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "RH - lecture tous les profils" ON public.profiles;
CREATE POLICY "RH - lecture tous les profils" ON public.profiles
  FOR SELECT USING (public.is_hr());

DROP POLICY IF EXISTS "RH - modification tous les profils" ON public.profiles;
CREATE POLICY "RH - modification tous les profils" ON public.profiles
  FOR UPDATE USING (public.is_hr());

DROP POLICY IF EXISTS "RH - acces complet checklists" ON public.onboarding_checklists;
CREATE POLICY "RH - acces complet checklists" ON public.onboarding_checklists
  FOR ALL USING (public.is_hr());

DROP POLICY IF EXISTS "RH - gestion templates" ON public.checklist_item_templates;
CREATE POLICY "RH - gestion templates" ON public.checklist_item_templates
  FOR ALL USING (public.is_hr());

DROP POLICY IF EXISTS "RH - acces complet completions" ON public.checklist_completions;
CREATE POLICY "RH - acces complet completions" ON public.checklist_completions
  FOR ALL USING (public.is_hr());

DROP POLICY IF EXISTS "RH - acces complet documents" ON public.onboarding_documents;
CREATE POLICY "RH - acces complet documents" ON public.onboarding_documents
  FOR ALL USING (public.is_hr());

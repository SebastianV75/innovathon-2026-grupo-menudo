-- Task Attachments: private storage bucket + relational metadata table
-- Supports uploading PDF, TXT, and image files to tasks

-- ── 1. Storage bucket ────────────────────────────────────────────────────────
-- The 'task-attachments' private bucket is created via CLI:
--   npx @insforge/cli storage create-bucket task-attachments --private
-- Bucket creation requires admin privileges and cannot run in a migration.

-- ── 2. Storage RLS: owner-only access scoped to task-attachments bucket ──────
-- Drop any pre-existing generic owner-only policies that would conflict
DROP POLICY IF EXISTS storage_objects_owner_select ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_insert ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_update ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_delete ON storage.objects;

-- Also drop our own namespaced policies in case of re-run
DROP POLICY IF EXISTS task_attach_select ON storage.objects;
DROP POLICY IF EXISTS task_attach_insert ON storage.objects;
DROP POLICY IF EXISTS task_attach_update ON storage.objects;
DROP POLICY IF EXISTS task_attach_delete ON storage.objects;

CREATE POLICY task_attach_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket = 'task-attachments'
    AND uploaded_by = (SELECT auth.jwt() ->> 'sub')
  );

CREATE POLICY task_attach_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket = 'task-attachments'
    AND uploaded_by = (SELECT auth.jwt() ->> 'sub')
  );

CREATE POLICY task_attach_update ON storage.objects
  FOR UPDATE TO authenticated
  USING      (bucket = 'task-attachments' AND uploaded_by = (SELECT auth.jwt() ->> 'sub'))
  WITH CHECK (bucket = 'task-attachments' AND uploaded_by = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY task_attach_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket = 'task-attachments'
    AND uploaded_by = (SELECT auth.jwt() ->> 'sub')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;

-- ── 3. task_attachments table ────────────────────────────────────────────────
CREATE TABLE public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_task_attachments" ON public.task_attachments
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_attachments TO authenticated;

CREATE INDEX idx_task_attachments_user_id ON public.task_attachments(user_id);
CREATE INDEX idx_task_attachments_task_id ON public.task_attachments(task_id);

-- Fix user-owned data guards for Aliester app tables.
-- Browser SDK inserts omit user_id; the database binds rows to auth.uid()
-- and rejects cross-user foreign-key references.

ALTER TABLE public.accounts ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.transactions ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.projects ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.tasks ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.events ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.notes ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.subscriptions ALTER COLUMN user_id SET DEFAULT auth.uid();

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.accounts FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.transactions FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.projects FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.tasks FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.events FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.notes FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.subscriptions FROM anon;

CREATE OR REPLACE FUNCTION public.assert_aliester_owned_references()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_TABLE_NAME = 'transactions' THEN
    IF NEW.account_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = NEW.account_id AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'account_id does not belong to this user';
    END IF;

    IF NEW.task_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.tasks
      WHERE id = NEW.task_id AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'task_id does not belong to this user';
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'tasks' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = NEW.project_id AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'project_id does not belong to this user';
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'subscriptions' THEN
    IF NEW.account_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = NEW.account_id AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'account_id does not belong to this user';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transactions_owned_refs ON public.transactions;
CREATE TRIGGER transactions_owned_refs
  BEFORE INSERT OR UPDATE OF account_id, task_id, user_id ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.assert_aliester_owned_references();

DROP TRIGGER IF EXISTS tasks_owned_refs ON public.tasks;
CREATE TRIGGER tasks_owned_refs
  BEFORE INSERT OR UPDATE OF project_id, user_id ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.assert_aliester_owned_references();

DROP TRIGGER IF EXISTS subscriptions_owned_refs ON public.subscriptions;
CREATE TRIGGER subscriptions_owned_refs
  BEFORE INSERT OR UPDATE OF account_id, user_id ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.assert_aliester_owned_references();

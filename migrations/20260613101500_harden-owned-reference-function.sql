-- Harden SECURITY DEFINER function search path.

CREATE OR REPLACE FUNCTION public.assert_aliester_owned_references()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
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

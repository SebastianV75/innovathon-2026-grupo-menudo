-- Adds an optional descripcion column to events so calendar events can carry
-- editable details. Safe to run more than once.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS descripcion TEXT NOT NULL DEFAULT '';

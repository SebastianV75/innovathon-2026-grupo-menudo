-- Add fecha_terminado column to tasks table
-- Records when a task is moved to the "Terminado" stage (etapa 6)

ALTER TABLE public.tasks ADD COLUMN fecha_terminado TIMESTAMPTZ;

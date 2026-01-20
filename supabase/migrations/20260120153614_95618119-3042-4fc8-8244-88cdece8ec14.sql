-- Create table for operator locations (separate from attendance)
CREATE TABLE public.ubicaciones_operarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  latitud DOUBLE PRECISION NOT NULL,
  longitud DOUBLE PRECISION NOT NULL,
  precision_gps DOUBLE PRECISION,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fuera_zona BOOLEAN NOT NULL DEFAULT false,
  geocerca_id UUID,
  origen TEXT NOT NULL CHECK (origen IN ('entrada', 'salida', 'tracking')),
  estado_sync TEXT NOT NULL DEFAULT 'sincronizado' CHECK (estado_sync IN ('sincronizado', 'pendiente_sync')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for geofences
CREATE TABLE public.geocercas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('poligono', 'radio')),
  coordenadas JSONB NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key after geocercas table exists
ALTER TABLE public.ubicaciones_operarios 
ADD CONSTRAINT fk_geocerca 
FOREIGN KEY (geocerca_id) REFERENCES public.geocercas(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_ubicaciones_user_timestamp ON public.ubicaciones_operarios(user_id, timestamp DESC);
CREATE INDEX idx_ubicaciones_timestamp ON public.ubicaciones_operarios(timestamp DESC);
CREATE INDEX idx_geocercas_activa ON public.geocercas(activa) WHERE activa = true;

-- Enable RLS
ALTER TABLE public.ubicaciones_operarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geocercas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ubicaciones_operarios
CREATE POLICY "Users can insert own locations"
ON public.ubicaciones_operarios
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own locations"
ON public.ubicaciones_operarios
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can view all locations"
ON public.ubicaciones_operarios
FOR SELECT
USING (has_role(auth.uid(), 'supervisor'::app_role));

-- RLS Policies for geocercas
CREATE POLICY "Everyone can view active geocercas"
ON public.geocercas
FOR SELECT
USING (activa = true);

CREATE POLICY "Supervisors can manage geocercas"
ON public.geocercas
FOR ALL
USING (has_role(auth.uid(), 'supervisor'::app_role));

-- Enable Realtime for ubicaciones_operarios
ALTER PUBLICATION supabase_realtime ADD TABLE public.ubicaciones_operarios;

-- Trigger for updated_at on geocercas
CREATE TRIGGER update_geocercas_updated_at
BEFORE UPDATE ON public.geocercas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
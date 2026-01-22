-- FIX 1: Convert all RESTRICTIVE policies to PERMISSIVE
-- Drop all existing restrictive policies and recreate as permissive

-- ============ PROFILES TABLE ============
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Supervisors can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Supervisors can update any profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Supervisors can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Supervisors can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'::app_role));

-- ============ USER_ROLES TABLE ============
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Supervisors can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Supervisors can manage roles" ON public.user_roles;

CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Supervisors can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'::app_role));

-- ============ REGISTROS_ASISTENCIA TABLE ============
DROP POLICY IF EXISTS "Users can view own records" ON public.registros_asistencia;
DROP POLICY IF EXISTS "Supervisors can view all records" ON public.registros_asistencia;
DROP POLICY IF EXISTS "Users can insert own records" ON public.registros_asistencia;
DROP POLICY IF EXISTS "Supervisors can update any record" ON public.registros_asistencia;

CREATE POLICY "Users can view own records"
  ON public.registros_asistencia FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can view all records"
  ON public.registros_asistencia FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Users can insert own records"
  ON public.registros_asistencia FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Supervisors can update any record"
  ON public.registros_asistencia FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'::app_role));

-- ============ UBICACIONES_OPERARIOS TABLE ============
DROP POLICY IF EXISTS "Users can view own locations" ON public.ubicaciones_operarios;
DROP POLICY IF EXISTS "Supervisors can view all locations" ON public.ubicaciones_operarios;
DROP POLICY IF EXISTS "Users can insert own locations" ON public.ubicaciones_operarios;

CREATE POLICY "Users can view own locations"
  ON public.ubicaciones_operarios FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can view all locations"
  ON public.ubicaciones_operarios FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Users can insert own locations"
  ON public.ubicaciones_operarios FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============ GEOCERCAS TABLE ============
DROP POLICY IF EXISTS "Everyone can view active geocercas" ON public.geocercas;
DROP POLICY IF EXISTS "Supervisors can manage geocercas" ON public.geocercas;

CREATE POLICY "Everyone can view active geocercas"
  ON public.geocercas FOR SELECT TO authenticated
  USING (activa = true);

CREATE POLICY "Supervisors can manage geocercas"
  ON public.geocercas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'::app_role));

-- ============ FIX 2: Make storage bucket private ============
UPDATE storage.buckets 
SET public = false 
WHERE id = 'attendance-photos';

-- Drop public access policy
DROP POLICY IF EXISTS "Public can view attendance photos" ON storage.objects;
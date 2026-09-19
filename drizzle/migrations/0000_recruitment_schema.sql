-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by signed in" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles readable by signed in" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- New user -> profile + role (first user becomes admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), COALESCE(NEW.email, ''));
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Audit stamping
CREATE OR REPLACE FUNCTION public.stamp_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
    NEW.created_at := now();
  ELSE
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
  END IF;
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Workers
CREATE TABLE public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  passport_number TEXT NOT NULL UNIQUE,
  nationality TEXT NOT NULL DEFAULT '',
  monthly_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  arrival_date DATE,
  current_sponsor_name TEXT NOT NULL DEFAULT '',
  current_sponsor_phone TEXT NOT NULL DEFAULT '',
  transfer_status TEXT NOT NULL DEFAULT 'بدون نقل' CHECK (transfer_status IN ('بدون نقل','قيد النقل','تم النقل')),
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workers TO authenticated;
GRANT ALL ON public.workers TO service_role;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workers select" ON public.workers FOR SELECT TO authenticated USING (true);
CREATE POLICY "workers insert" ON public.workers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "workers update" ON public.workers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "workers delete admin" ON public.workers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER workers_audit BEFORE INSERT OR UPDATE ON public.workers FOR EACH ROW EXECUTE FUNCTION public.stamp_audit();

-- Field-level protection for non-admins
CREATE OR REPLACE FUNCTION public.guard_worker_core_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF NEW.name IS DISTINCT FROM OLD.name
     OR NEW.passport_number IS DISTINCT FROM OLD.passport_number
     OR NEW.nationality IS DISTINCT FROM OLD.nationality
     OR NEW.arrival_date IS DISTINCT FROM OLD.arrival_date THEN
    RAISE EXCEPTION 'غير مسموح: هذه الحقول الأساسية يمكن تعديلها من قبل المدير فقط';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER workers_guard BEFORE UPDATE ON public.workers FOR EACH ROW EXECUTE FUNCTION public.guard_worker_core_fields();

-- Transfers
CREATE TABLE public.transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  old_sponsor_name TEXT NOT NULL DEFAULT '',
  old_sponsor_phone TEXT NOT NULL DEFAULT '',
  new_sponsor_name TEXT NOT NULL DEFAULT '',
  new_sponsor_phone TEXT NOT NULL DEFAULT '',
  visa_type TEXT NOT NULL DEFAULT '',
  transfer_date DATE,
  old_sponsor_dues NUMERIC(12,2) NOT NULL DEFAULT 0,
  down_payment NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(12,2) GENERATED ALWAYS AS (old_sponsor_dues - down_payment) STORED,
  payment_status TEXT NOT NULL DEFAULT 'متبقي مبلغ' CHECK (payment_status IN ('تم الدفع بالكامل','متبقي مبلغ')),
  medical_exam TEXT NOT NULL DEFAULT 'لا يوجد' CHECK (medical_exam IN ('يوجد','لا يوجد')),
  residency_status TEXT NOT NULL DEFAULT 'لا توجد' CHECK (residency_status IN ('توجد','لا توجد')),
  salary_dues_status TEXT NOT NULL DEFAULT 'لا توجد' CHECK (salary_dues_status IN ('توجد','لا توجد')),
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX transfers_worker_idx ON public.transfers(worker_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transfers TO authenticated;
GRANT ALL ON public.transfers TO service_role;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transfers select" ON public.transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "transfers insert" ON public.transfers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "transfers update" ON public.transfers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "transfers delete admin" ON public.transfers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER transfers_audit BEFORE INSERT OR UPDATE ON public.transfers FOR EACH ROW EXECUTE FUNCTION public.stamp_audit();

CREATE OR REPLACE FUNCTION public.guard_transfer_core_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF NEW.worker_id IS DISTINCT FROM OLD.worker_id
     OR NEW.old_sponsor_name IS DISTINCT FROM OLD.old_sponsor_name
     OR NEW.old_sponsor_phone IS DISTINCT FROM OLD.old_sponsor_phone THEN
    RAISE EXCEPTION 'غير مسموح: بيانات الكفيل القديم يمكن تعديلها من قبل المدير فقط';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER transfers_guard BEFORE UPDATE ON public.transfers FOR EACH ROW EXECUTE FUNCTION public.guard_transfer_core_fields();

-- Auto-fill old sponsor from worker + mark worker as in transfer
CREATE OR REPLACE FUNCTION public.on_transfer_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w RECORD;
BEGIN
  SELECT current_sponsor_name, current_sponsor_phone INTO w FROM public.workers WHERE id = NEW.worker_id;
  IF NEW.old_sponsor_name = '' THEN NEW.old_sponsor_name := COALESCE(w.current_sponsor_name, ''); END IF;
  IF NEW.old_sponsor_phone = '' THEN NEW.old_sponsor_phone := COALESCE(w.current_sponsor_phone, ''); END IF;
  UPDATE public.workers SET transfer_status = 'قيد النقل' WHERE id = NEW.worker_id AND transfer_status <> 'قيد النقل';
  RETURN NEW;
END;
$$;
CREATE TRIGGER transfers_before_insert BEFORE INSERT ON public.transfers FOR EACH ROW EXECUTE FUNCTION public.on_transfer_insert();

-- Complete a transfer: move worker to new sponsor
CREATE OR REPLACE FUNCTION public.complete_transfer(_transfer_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO t FROM public.transfers WHERE id = _transfer_id;
  IF t IS NULL THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  UPDATE public.workers
    SET current_sponsor_name = t.new_sponsor_name,
        current_sponsor_phone = t.new_sponsor_phone,
        transfer_status = 'تم النقل'
    WHERE id = t.worker_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.complete_transfer(UUID) TO authenticated;
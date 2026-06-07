-- ================================================================
-- AI USAGE BILLING - Cobrança por uso da chave do Administrador
-- Execute este SQL no Supabase SQL Editor
-- ================================================================

CREATE TABLE IF NOT EXISTS ai_usage_billing (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_mb        numeric(14,6) DEFAULT 0,
  amount_paid     numeric(10,2) DEFAULT 0,
  payment_pending boolean DEFAULT false,
  payment_note    text,
  last_usage_at   timestamptz DEFAULT now(),
  last_payment_at timestamptz,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE ai_usage_billing ENABLE ROW LEVEL SECURITY;

-- Alunos veem e atualizam apenas seu próprio registro
CREATE POLICY "student_view_own_billing" ON ai_usage_billing
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "student_insert_own_billing" ON ai_usage_billing
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "student_update_own_billing" ON ai_usage_billing
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Service role (admin) pode tudo
-- (acesso via service_role key no painel admin)

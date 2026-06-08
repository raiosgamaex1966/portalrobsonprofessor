-- SCRIPT PARA IMPLEMENTAÇÃO DE CHAT EM GRUPO E INDIVIDUAL INTEGRADO
-- Execute este script no SQL Editor do seu painel do Supabase.

-- 1. Adicionar coluna is_group na tabela chat_rooms
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false;

-- 2. Criar a tabela chat_room_members (Membros da Sala)
CREATE TABLE IF NOT EXISTS chat_room_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (room_id, user_id)
);

-- 3. Habilitar RLS na tabela chat_room_members
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas antigas de chat para recriá-las com suporte a grupos
DROP POLICY IF EXISTS "Users can view their own chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can insert their own chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admins can view all chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admins can insert all chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admins can update all chat rooms" ON chat_rooms;

DROP POLICY IF EXISTS "Users can view messages in their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Admins can view all chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can insert all chat messages" ON chat_messages;

DROP POLICY IF EXISTS "Members can view room memberships" ON chat_room_members;
DROP POLICY IF EXISTS "Admins can manage memberships" ON chat_room_members;

-- 5. Criar função de verificação de associação com SECURITY DEFINER (ignora RLS internamente para evitar recursão)
CREATE OR REPLACE FUNCTION public.check_room_membership(r_id UUID, u_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_room_members WHERE room_id = r_id AND user_id = u_id
  );
END;
$$;

-- 6. Criar Políticas RLS para chat_rooms
-- Alunos podem visualizar salas de chat se:
--   - Criaram a sala (user_id = auth.uid()) OU
--   - São membros dela (presente em chat_room_members)
CREATE POLICY "Users can view their chat rooms" ON chat_rooms FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR check_room_membership(id, auth.uid())
  );

-- Alunos podem criar suas próprias salas de chat (individuais)
CREATE POLICY "Users can insert their own chat rooms" ON chat_rooms FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_group = false);

-- Admins/Professores têm controle total sobre as salas de chat
CREATE POLICY "Admins can do everything on chat rooms" ON chat_rooms TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');


-- 7. Criar Políticas RLS para chat_room_members
-- Membros podem visualizar quem participa do mesmo chat
CREATE POLICY "Members can view room memberships" ON chat_room_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR check_room_membership(room_id, auth.uid())
  );

-- Admins/Professores podem gerenciar membros de qualquer grupo
CREATE POLICY "Admins can manage memberships" ON chat_room_members TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');


-- 8. Criar Políticas RLS para chat_messages
-- Alunos podem ver mensagens se pertencerem à sala
CREATE POLICY "Users can view messages in their rooms" ON chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_rooms WHERE id = chat_messages.room_id AND user_id = auth.uid()
    )
    OR check_room_membership(room_id, auth.uid())
  );

-- Alunos podem enviar mensagens se pertencerem à sala
CREATE POLICY "Users can insert messages in their rooms" ON chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM chat_rooms WHERE id = chat_messages.room_id AND user_id = auth.uid()
      )
      OR check_room_membership(room_id, auth.uid())
    )
  );

-- Admins/Professores podem ler e enviar mensagens em qualquer sala
CREATE POLICY "Admins can do everything on chat messages" ON chat_messages TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

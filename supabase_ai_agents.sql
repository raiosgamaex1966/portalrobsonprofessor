-- SQL Schema for Portal do Professor Robson Cordeiro AI Study Center Integration

-- 1. Create custom_agents table
CREATE TABLE IF NOT EXISTS custom_agents (
    id TEXT PRIMARY KEY, -- Using text to support default string IDs like 'torax', 'cranio', etc.
    label TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    gradient TEXT,
    title TEXT,
    system_prompt TEXT,
    active BOOLEAN DEFAULT true,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create agent_configs table
CREATE TABLE IF NOT EXISTS agent_configs (
    agent_id TEXT REFERENCES custom_agents(id) ON DELETE CASCADE PRIMARY KEY,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    api_keys JSONB DEFAULT '{}'::jsonb,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create agent_materials table (separating from the portal's academic materials)
CREATE TABLE IF NOT EXISTS agent_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT REFERENCES custom_agents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    size INTEGER, -- in KB
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE custom_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_materials ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for custom_agents
DROP POLICY IF EXISTS "Read shared or own agents" ON custom_agents;
DROP POLICY IF EXISTS "Read agents for all authenticated" ON custom_agents;
CREATE POLICY "Read agents for all authenticated" ON custom_agents 
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Insert own agents" ON custom_agents;
CREATE POLICY "Insert own agents" ON custom_agents 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Update own agents" ON custom_agents;
CREATE POLICY "Update own agents" ON custom_agents 
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Delete own agents" ON custom_agents;
CREATE POLICY "Delete own agents" ON custom_agents 
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Admins can do everything
DROP POLICY IF EXISTS "Admin full access agents" ON custom_agents;
CREATE POLICY "Admin full access agents" ON custom_agents TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 6. RLS Policies for agent_configs
DROP POLICY IF EXISTS "Manage own configs" ON agent_configs;
CREATE POLICY "Manage own configs" ON agent_configs 
    FOR ALL TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Read configs for all authenticated" ON agent_configs;
CREATE POLICY "Read configs for all authenticated" ON agent_configs
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin full access configs" ON agent_configs;
CREATE POLICY "Admin full access configs" ON agent_configs TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 7. RLS Policies for agent_materials
DROP POLICY IF EXISTS "Manage own agent materials" ON agent_materials;
CREATE POLICY "Manage own agent materials" ON agent_materials 
    FOR ALL TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Read materials for all authenticated" ON agent_materials;
CREATE POLICY "Read materials for all authenticated" ON agent_materials
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin full access agent materials" ON agent_materials;
CREATE POLICY "Admin full access agent materials" ON agent_materials TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 8. Create materials storage bucket policies (just in case)
-- Policies for 'materials' storage bucket (in storage.objects)
-- Run these in your SQL editor if the storage bucket 'materials' is configured.

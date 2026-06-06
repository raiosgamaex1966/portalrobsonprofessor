// Script de setup do banco de dados via Supabase Management API
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "colcrzfhxnjrhxfbefbn";
const API_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

if (!ACCESS_TOKEN) {
  console.error("❌ ERRO: Variável de ambiente SUPABASE_ACCESS_TOKEN não definida");
  console.error("   Defina a variável antes de executar este script:");
  console.error("   export SUPABASE_ACCESS_TOKEN='seu_token_aqui'");
  process.exit(1);
}

async function runSQL(description, sql) {
  console.log(`\n⏳ ${description}...`);
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`❌ Erro: ${err}`);
    return false;
  }
  console.log(`✅ ${description} - OK`);
  return true;
}

async function main() {
  console.log("🚀 Iniciando setup do banco de dados...\n");

  // 1. Criar tabelas
  await runSQL("Criando tabela site_settings", `
    CREATE TABLE IF NOT EXISTS site_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_name TEXT DEFAULT 'Portal do Professor Robson Cordeiro',
      welcome_message TEXT,
      bdz_tutor_enabled BOOLEAN DEFAULT true,
      bdz_tutor_greeting TEXT,
      primary_color TEXT DEFAULT '#1e3a5f',
      accent_color TEXT DEFAULT '#d4a853',
      llm_provider TEXT DEFAULT 'openai',
      llm_model TEXT DEFAULT 'gpt-4o-mini',
      llm_api_key TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  `);

  await runSQL("Criando tabela profiles", `
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
      full_name TEXT,
      phone TEXT,
      birth_date DATE,
      photo_url TEXT,
      role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'student')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  `);

  await runSQL("Criando tabela disciplines", `
    CREATE TABLE IF NOT EXISTS disciplines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  `);

  await runSQL("Criando tabela materials", `
    CREATE TABLE IF NOT EXISTS materials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      discipline_id UUID REFERENCES disciplines(id) ON DELETE CASCADE,
      class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      file_url TEXT,
      file_type TEXT,
      material_type TEXT DEFAULT 'complementary',
      tags TEXT[] DEFAULT '{}',
      content TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  `);

  await runSQL("Criando tabela activities", `
    CREATE TABLE IF NOT EXISTS activities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      discipline_id UUID REFERENCES disciplines(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      due_date TIMESTAMP WITH TIME ZONE,
      points INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  `);

  await runSQL("Criando tabela chat_rooms", `
    CREATE TABLE IF NOT EXISTS chat_rooms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      title TEXT,
      last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  `);

  await runSQL("Criando tabela chat_messages", `
    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
      sender_id UUID REFERENCES auth.users(id),
      role TEXT CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  `);

  // 2. Habilitar RLS
  await runSQL("Habilitando RLS em todas as tabelas", `
    ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE disciplines ENABLE ROW LEVEL SECURITY;
    ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
    ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
    ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
    ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
  `);

  // 3. Criar políticas RLS (drop antes para evitar conflito)
  const tables = ['site_settings', 'profiles', 'disciplines', 'materials', 'activities', 'chat_rooms', 'chat_messages'];
  const policies = [
    ["Site settings are viewable by everyone", "site_settings"],
    ["Disciplines are viewable by authenticated users", "disciplines"],
    ["Materials are viewable by authenticated users", "materials"],
    ["Activities are viewable by authenticated users", "activities"],
    ["Users can view their own profile", "profiles"],
    ["Users can update their own profile", "profiles"],
    ["Users can insert their own profile", "profiles"],
    ["Admins can do everything on disciplines", "disciplines"],
    ["Admins can do everything on materials", "materials"],
    ["Admins can do everything on activities", "activities"],
    ["Users can view their own chat rooms", "chat_rooms"],
    ["Users can insert their own chat rooms", "chat_rooms"],
    ["Users can view messages in their rooms", "chat_messages"],
    ["Users can insert messages in their rooms", "chat_messages"],
    ["Admins can manage site settings", "site_settings"],
  ];

  const dropSQL = policies.map(([name, table]) =>
    `DROP POLICY IF EXISTS "${name}" ON ${table};`
  ).join('\n');
  await runSQL("Removendo políticas antigas", dropSQL);

  await runSQL("Criando políticas RLS", `
    CREATE POLICY "Site settings are viewable by everyone" ON site_settings FOR SELECT USING (true);
    CREATE POLICY "Disciplines are viewable by authenticated users" ON disciplines FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Materials are viewable by authenticated users" ON materials FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Activities are viewable by authenticated users" ON activities FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
    CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
    CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
    CREATE POLICY "Admins can do everything on disciplines" ON disciplines TO authenticated
      USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
    CREATE POLICY "Admins can do everything on materials" ON materials TO authenticated
      USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
    CREATE POLICY "Admins can do everything on activities" ON activities TO authenticated
      USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
    CREATE POLICY "Users can view their own chat rooms" ON chat_rooms FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert their own chat rooms" ON chat_rooms FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can view messages in their rooms" ON chat_messages FOR SELECT
      USING (room_id IN (SELECT id FROM chat_rooms WHERE user_id = auth.uid()));
    CREATE POLICY "Users can insert messages in their rooms" ON chat_messages FOR INSERT
      WITH CHECK (room_id IN (SELECT id FROM chat_rooms WHERE user_id = auth.uid()));
    CREATE POLICY "Admins can manage site settings" ON site_settings TO authenticated
      USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
  `);

  // 4. Criar função e trigger
  await runSQL("Criando função handle_new_user", `
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      INSERT INTO public.profiles (id, full_name, role)
      VALUES (
        new.id,
        new.raw_user_meta_data->>'full_name',
        COALESCE(new.raw_user_meta_data->>'role', 'user')
      );
      RETURN new;
    END;
    $$;
  `);

  await runSQL("Criando trigger on_auth_user_created", `
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  `);

  // 5. Dados iniciais
  await runSQL("Inserindo configurações iniciais do site", `
    INSERT INTO site_settings (site_name, welcome_message, bdz_tutor_enabled, bdz_tutor_greeting, primary_color, accent_color, llm_provider, llm_model)
    SELECT
      'Portal do Professor Robson Cordeiro',
      'Bem-vindo ao Portal do Professor Robson Cordeiro!',
      true,
      'Olá! Eu sou o RCS Tutor. Como posso te ajudar hoje?',
      '#1e3a5f',
      '#d4a853',
      'openai',
      'gpt-4o-mini'
    WHERE NOT EXISTS (SELECT 1 FROM site_settings);
  `);

  console.log("\n🎉 Setup completo! Banco de dados configurado com sucesso.");
  console.log("\n📋 Próximo passo: criar o usuário admin no Supabase Authentication.");
}

main().catch(console.error);

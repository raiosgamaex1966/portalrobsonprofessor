# Configurando no Vercel

## 1. Variáveis de Ambiente

Você precisa adicionar as seguintes variáveis de ambiente no Vercel:

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá para **Settings → Environment Variables**
4. Adicione todas as variáveis do arquivo `.env.example`

### Valores a Adicionar:

```
VITE_SUPABASE_URL=https://colcrzfhxnjrhxfbefbn.supabase.co
VITE_SUPABASE_ANON_KEY=seu_anon_key_do_supabase
VITE_SUPABASE_SERVICE_ROLE_KEY=seu_service_role_key
VITE_SUPABASE_PUBLISHABLE_KEY=seu_publishable_key
SUPABASE_ACCESS_TOKEN=seu_access_token
VITE_DEEPINFRA_API_KEY=sua_deepinfra_key
VITE_OPENAI_API_KEY=sua_openai_key
VITE_ENABLE_TEST_AUTH=false
```

### Como pegar as chaves do Supabase:

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá para: **Settings → API**
4. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`
   - **service_role secret** → `VITE_SUPABASE_SERVICE_ROLE_KEY`

## 2. Redeploy

Após adicionar as variáveis:

1. Vá para **Deployments**
2. Clique nos **3 pontos** do último deploy
3. Selecione **Redeploy**

Pronto! 🚀

## 3. Se o erro "Admin Setup" continuar

Se você ainda vir a tela de setup do admin:

1. Verifique se sua conta de usuário tem `role = 'admin'` na tabela `auth.users` do Supabase
2. Execute este SQL no Supabase (SQL Editor):

```sql
-- Verificar seu role
SELECT id, email, role FROM auth.users LIMIT 10;
```

Se seu email não está como admin, execute:

```sql
-- Tornar seu usuário admin (substitua com seu UUID de user)
UPDATE auth.users 
SET role = 'admin' 
WHERE email = 'robsoncordeiro1966@gmail.com';
```

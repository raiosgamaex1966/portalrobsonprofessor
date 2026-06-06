# Migração Completa para o Supabase

O sistema foi migrado completamente para o Supabase como backend principal.

## O que foi feito:

- **Integração do Cliente**: Instalado o pacote `@supabase/supabase-js` e criado o arquivo `supabaseClient.js`.
- **Autenticação**: O `AuthContext.jsx` usa o Supabase Auth para gerenciar sessões, login e logout.
- **Banco de Dados**: Todas as tabelas foram criadas via SQL no Supabase (perfis, disciplinas, materiais, atividades, chat, etc.) com políticas de segurança (RLS).
- **Adaptador de API**: O arquivo `base44Client.js` atua como uma ponte transparente. Todas as páginas do app se comunicam com o Supabase automaticamente, sem precisar alterar o código de cada página.
- **Edge Functions**: Pasta `supabase/functions/` com o modelo para o RCS Tutor.
- **Storage**: Upload de arquivos mapeado para o Supabase Storage (bucket `app_data`).

## Configurações necessárias

1. **Variáveis de ambiente** — arquivo `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. **Storage** — criar bucket `app_data` como **Public** no painel do Supabase.

3. **Usuário admin** — criado via Supabase Authentication com role `admin` na tabela `profiles`.

---

## Painel de Configurações de LLM (RCS Tutor)

O sistema possui painel dedicado para configurar a IA utilizada.

### APIs Suportadas:
- **OpenAI**: GPT-4o, GPT-4, GPT-3.5
- **Groq / DeepInfra**: Llama 3, Mistral e outros modelos
- **Anthropic (Claude)**: Claude 3.5 Sonnet e Opus

### Como configurar:
1. Faça login como Admin.
2. Acesse **Admin → Configurações do Site**.
3. No card **"Configuração de LLM — RCS Tutor"**, selecione o provedor, cole sua chave e escolha o modelo.
4. Clique em **Salvar Alterações**.

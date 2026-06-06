# Portal do Professor Robson Cordeiro

Plataforma completa de ensino com materiais, atividades, chat e RCS Tutor integrado.

## Tecnologias

- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui
- **Backend/Banco:** Supabase (PostgreSQL + Storage)
- **IA:** OpenAI / Groq / DeepInfra (configurável pelo painel admin)
- **Autenticação:** Supabase Auth

## Como rodar localmente

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure o arquivo `.env.local` com as credenciais do Supabase:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua_anon_key
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## Funcionalidades

- 🎓 Gestão de disciplinas, materiais e atividades
- 📝 Testes e avaliações
- 💬 Chat e fórum
- 🤖 RCS Tutor (assistente de IA)
- 👨‍🏫 Painel administrativo completo
- 📊 Dashboard do aluno com progresso

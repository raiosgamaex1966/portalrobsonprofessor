# Documentação Administrativa — Portal RCS Tutor

## 🤖 LLM Utilizada no RCS Tutor

O RCS Tutor utiliza IA generativa configurável pelo painel administrativo.

- O provedor e modelo padrão são configuráveis em **Admin → Configurações do Site**.
- Suporta OpenAI (GPT-4o, GPT-4o-mini), Groq/DeepInfra (Llama, Mistral) e outros.
- A chave de API também é configurada pelo painel, sem necessidade de alterar o código.

---

## ⚙️ Painel de Configurações do Site

**Acesso:** Admin → Configurações do Site

Nesta página o administrador pode alterar as seguintes configurações **sem precisar mexer no código**:

| Campo | Descrição |
|---|---|
| **Nome do Site** | Nome exibido no cabeçalho e aba do navegador |
| **Mensagem de Boas-Vindas** | Texto opcional exibido na página inicial |
| **Habilitar/Desabilitar RCS Tutor** | Liga ou desliga o assistente de IA para todos os alunos |
| **Mensagem Inicial do RCS Tutor** | Texto de abertura exibido quando o aluno inicia uma conversa |
| **Cor Primária** | Cor azul principal do tema (ex: `#1e3a5f`) |
| **Cor de Destaque** | Cor dourada usada em botões e destaques (ex: `#d4a853`) |

---

## 📚 Gerenciamento de Conteúdo

### Criar Disciplinas
1. Acesse **Admin → Disciplinas**
2. Clique em **"Nova Disciplina"**
3. Preencha: nome, descrição, ícone e cor
4. Salve — a disciplina ficará disponível para vincular materiais

### Subir Materiais
1. Acesse **Admin → Materiais**
2. Clique em **"Novo Material"**
3. Preencha:
   - Título e descrição
   - Disciplina (selecione a disciplina criada)
   - Turma (opcional — deixe vazio para disponibilizar para todos)
   - Tipo de arquivo: PDF, link, texto digitado, vídeo, etc.
   - Tipo: Obrigatório ou Complementar
   - Tags para facilitar a busca
4. Salve — o material aparecerá na página de Materiais para os alunos

> **Dica:** Crie as disciplinas primeiro, depois vincule os materiais a elas.
> Materiais sem turma ficam visíveis para **todos os alunos**.

---

## 👥 Gerenciamento de Usuários

- Novos usuários são convidados via **Admin → Usuários → Convidar**
- Ao convidar, defina o papel: `user` (aluno) ou `admin`
- Apenas administradores podem convidar outros administradores

---

## 🔗 Tecnologias Utilizadas

- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui
- **Backend/Banco:** Supabase (PostgreSQL + Storage)
- **IA:** OpenAI / Groq / DeepInfra (configurável pelo painel)
- **Autenticação:** Supabase Auth
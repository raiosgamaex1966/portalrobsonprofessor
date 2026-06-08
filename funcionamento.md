# Guia de Funcionamento do Portal do Professor

Este documento explica as regras de fluxo do sistema, a ordem correta para cadastrar entidades no painel administrativo e a lógica de matrícula dos alunos.

---

## 1. Fluxo de Cadastros Administrativos (Ordem Recomendada)

Para o correto funcionamento do sistema, as informações devem ser criadas respeitando os relacionamentos do banco de dados. A ordem lógica é a seguinte:

### **Passo 1: Cadastro das Entidades Independentes (Turmas e Disciplinas)**
Você pode cadastrar estes dois elementos em qualquer ordem, pois eles não possuem dependência mútua inicialmente.
- **Disciplinas**: Cadastre as matérias ensinadas no portal (Ex: *Língua Portuguesa Para Concursos*, *Radiologia Médica*).
- **Turmas**: Cadastre os grupos de alunos (Ex: *Turma Radiologia 2026*, *Turma Concurso SUS*).

### **Passo 2: Vinculação (Turmas por Disciplina)**
Uma vez criadas as Turmas e as Disciplinas, você deve associá-las.
- **Turmas por Disciplina**: Serve para definir quais turmas pertencem a quais disciplinas. *Nota: Você não consegue vincular turmas nesta tela sem que a Disciplina e a Turma tenham sido criadas nos passos anteriores.*

---

## 2. Lógica de Matrícula de Alunos

No portal, **os alunos não possuem a opção de se matricular por conta própria**. O controle de acesso e participação é feito de forma centralizada pelo administrador:

1. **Cadastro do Aluno**: O usuário se registra no portal e cria o seu perfil básico de estudante.
2. **Matrícula pelo Administrador**:
   - O Administrador acessa o **Painel Administrativo** -> **Turmas**.
   - Clica no botão de gerenciamento de alunos correspondente à turma em que deseja matricular o aluno.
   - Clica em **Adicionar Aluno**, pesquisa pelo nome/e-mail do aluno e confirma.
3. **Exibição no Dashboard do Aluno**:
   - Assim que o vínculo é feito no painel do administrador, a turma e todo o conteúdo associado a ela (atividades, testes, simulados e materiais) ficam disponíveis no dashboard do aluno instantaneamente.

---

## 3. Portfólio de Projetos (Projetos de Teste de Software)

Esta funcionalidade serve como um espaço de compartilhamento e exibição de projetos práticos desenvolvidos pelos alunos ou professores.

- **Objetivo**: Permitir que os estudantes registrem e apresentem seus trabalhos práticos, códigos de teste de software e sistemas desenvolvidos.
- **Campos de um Projeto**:
  - **Nome** e **Descrição**: Título e explicação do que o projeto resolve.
  - **Categoria**: Classificação do projeto (Web, Mobile, Desktop, Backend, Fullstack ou Outros).
  - **Tecnologias**: Tags separadas por vírgula para listar o que foi usado (ex: React, Node.js, Python).
  - **Links**: URLs diretas para o repositório do código (ex: GitHub) e para o projeto publicado (Demo).
- **Como funciona**:
  - Os usuários logados podem clicar em **"+ Criar Projeto"** na tela de Projetos para expor novos projetos.
  - Funciona como uma galeria coletiva, auxiliando no aprendizado prático e na revisão de códigos.

---

## 4. Chat ao Vivo (Chat com Professor)

O chat ao vivo (disponível em `/Chat` para alunos e `/AdminChat` para professores) permite a comunicação direta em tempo real.

- **Para o Aluno**:
  - Ao clicar em "Chat ao Vivo", o sistema busca a sala de conversa associada ao e-mail do aluno.
  - Caso seja o primeiro acesso e nenhuma sala exista, o sistema cria automaticamente uma sala exclusiva (`ChatRoom`) entre o aluno e o professor.
  - O aluno pode enviar mensagens de texto e acompanhar a conversa de forma síncrona.
- **Para o Professor/Administrador**:
  - O professor visualiza todas as salas ativas de alunos e responde individualmente a cada um no painel de chat do admin.
- **Controle de Leitura**:
  - O sistema rastreia o número de mensagens não lidas (`unread_count_student` e `unread_count_teacher`) para sinalizar novas notificações no painel.

---

## 5. Planejamento: Integração de Chat em Grupo e Individual

Esta seção descreve a arquitetura planejada para permitir conversas em grupo ao lado do chat individual.

- **Diferenciação de Salas (`chat_rooms`)**:
  - A tabela `chat_rooms` contará com um campo `is_group` (booleano) para separar mensagens diretas (DM) de chats de turmas/grupos.
  - Para grupos, o campo `title` armazenará o nome do grupo (ex: *"Dúvidas - Radiologia 2026"*).
- **Associação de Membros (`chat_room_members`)**:
  - Uma nova tabela intermediária associará múltiplos usuários (IDs de alunos e professores) a uma única sala de grupo.
  - O carregamento da barra lateral de chats buscará todas as salas onde o ID do usuário conectado esteja presente nesta lista de membros.
- **Identificação de Remetente nas Mensagens**:
  - Nas conversas em grupo, o frontend lerá o campo `sender_name` para exibir o nome do aluno ou professor ao lado do texto da mensagem, permitindo identificar quem enviou cada resposta na conversa coletiva.

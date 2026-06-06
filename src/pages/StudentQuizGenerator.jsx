import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles, AlertCircle, ArrowLeft, RefreshCw, Check, X, HelpCircle, FileText, ChevronRight, Award, Brain, Activity, MessageSquare, Send, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';

// ─── Fetch Helper with Timeout ────────────────────────────────────────────────
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 90000 } = options; // Aumentado para 90 segundos para permitir geração de JSONs grandes
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('A requisição à IA excedeu o tempo limite de 90 segundos. Tente novamente.');
    }
    throw error;
  }
}

// ─── LLM Helpers ─────────────────────────────────────────────────────────────
async function callOpenAI({ apiKey, model, messages }) {
  const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callDeepInfra({ apiKey, model, messages }) {
  const res = await fetchWithTimeout('https://api.deepinfra.com/v1/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'meta-llama/Llama-3.3-70B-Instruct',
      messages,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`DeepInfra error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callGemini({ apiKey, model, messages }) {
  const geminiModel = model || 'gemini-2.0-flash';
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
  const systemMsg = messages.find(m => m.role === 'system');
  const body = {
    contents,
    ...(systemMsg && {
      systemInstruction: { parts: [{ text: systemMsg.content }] },
    }),
    generationConfig: { temperature: 0.7 },
  };
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

async function callClaude({ apiKey, model, messages }) {
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');
  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: model || 'claude-3-5-haiku-20241022',
      max_tokens: 1500,
      system: systemMsg?.content || '',
      messages: chatMessages,
    }),
  });
  if (!res.ok) throw new Error(`Claude error: ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
}

async function callGroq({ apiKey, model, messages }) {
  const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callKimi({ apiKey, model, messages }) {
  const res = await fetchWithTimeout('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'moonshot-v1-8k',
      messages,
      max_tokens: 800,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`Kimi error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callLLM({ provider, apiKey, model, systemPrompt, userMessage, messages: customMessages }) {
  const messages = customMessages || [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  switch (provider) {
    case 'openai':
      return callOpenAI({ apiKey, model, messages });
    case 'deepinfra':
      return callDeepInfra({ apiKey, model, messages });
    case 'gemini':
      return callGemini({ apiKey, model, messages });
    case 'claude':
      return callClaude({ apiKey, model, messages });
    case 'kimi':
      return callKimi({ apiKey, model, messages });
    case 'groq':
      return callGroq({ apiKey, model, messages });
    default:
      throw new Error(`Provedor "${provider}" não configurado.`);
  }
}

// ─── Componente Principal ───────────────────────────────────────────────────
export default function StudentQuizGenerator() {
  const [disciplines, setDisciplines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [llmSettings, setLlmSettings] = useState(null);

  // Form states
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [materials, setMaterials] = useState([]); // List of materials/topics in selected discipline
  const [selectedMaterials, setSelectedMaterials] = useState([]); // Array of material IDs, max 5
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  const [generationType, setGenerationType] = useState('quiz'); // 'quiz' | 'questionnaire' | 'chat'
  const [questionCount, setQuestionCount] = useState('5');
  const [questionFocus, setQuestionFocus] = useState('both'); // 'theoretical' | 'practical' | 'both'

  // Chat conversation states
  const [chatMessages, setChatMessages] = useState([]); // [{ role: 'assistant' | 'user', content: string }]
  const [chatInput, setChatInput] = useState('');
  const [loadingChatResponse, setLoadingChatResponse] = useState(false);

  // Generated quiz state
  const [quizData, setQuizData] = useState(null);
  const [currentStep, setCurrentStep] = useState('setup'); // 'setup' | 'quiz' | 'summary'

  // Quiz execution state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { questionIndex: optionIndex }
  const [showExplanation, setShowExplanation] = useState({}); // { questionIndex: boolean }
  const [discursiveAnswers, setDiscursiveAnswers] = useState({}); // { questionIndex: text }
  const [showDiscursiveAnswers, setShowDiscursiveAnswers] = useState({}); // { questionIndex: boolean }

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (currentStep === 'chat') {
      const container = document.getElementById('chat-messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [chatMessages, loadingChatResponse, currentStep]);

  useEffect(() => {
    if (selectedDiscipline) {
      fetchMaterialsForDiscipline(selectedDiscipline);
    }
  }, [selectedDiscipline]);

  const fetchMaterialsForDiscipline = async (disciplineId) => {
    setLoadingMaterials(true);
    try {
      const data = await base44.entities.Material.filter({ discipline_id: disciplineId, is_active: true });
      setMaterials(data);
      setSelectedMaterials([]); // Reset selected topics when discipline changes
    } catch (err) {
      console.error("Erro ao buscar materiais:", err);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const loadInitialData = async () => {
    try {
      const disciplinesData = await base44.entities.Discipline.filter({ is_active: true });
      setDisciplines(disciplinesData);
      if (disciplinesData.length > 0) {
        setSelectedDiscipline(disciplinesData[0].id);
      }

      // Fetch LLM configuration
      const { data } = await supabase
        .from('site_settings')
        .select('llm_provider, llm_model, llm_api_key')
        .limit(1)
        .single();

      if (data?.llm_api_key) {
        setLlmSettings(data);
      } else {
        const envKey = import.meta.env.VITE_DEEPINFRA_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;
        if (envKey) {
          const provider = import.meta.env.VITE_DEEPINFRA_API_KEY ? 'deepinfra' : 'openai';
          setLlmSettings({
            llm_provider: provider,
            llm_model: provider === 'deepinfra' ? 'meta-llama/Llama-3.3-70B-Instruct' : 'gpt-4o-mini',
            llm_api_key: envKey,
          });
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados do gerador:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedDiscipline) {
      toast.error("Por favor, selecione uma disciplina.");
      return;
    }

    if (selectedMaterials.length === 0) {
      toast.error("Por favor, selecione pelo menos 1 matéria/tópico para gerar o simulado.");
      return;
    }

    if (!llmSettings?.llm_api_key) {
      toast.error("IA não configurada no painel administrativo.");
      return;
    }

    const disciplineName = disciplines.find(d => d.id === selectedDiscipline)?.name || 'Disciplina Geral';
    const selectedItems = materials.filter(m => selectedMaterials.includes(m.id));
    const selectedNames = selectedItems.map(m => m.title).join(', ');

    // Extrai o conteúdo e descrição do material para servir como contexto para a IA
    const materialsContext = selectedItems.map(m => {
      // Limpa tags HTML do ReactQuill caso existam no content
      const cleanContent = (m.content || '').replace(/<[^>]*>/g, ' ').trim();
      return `TÓPICO: ${m.title}
DESCRIÇÃO: ${m.description || 'Não informada'}
CONTEÚDO E DETALHES DE REFERÊNCIA:
${cleanContent || 'Sem conteúdo adicional cadastrado no sistema.'}`;
    }).join('\n\n=======================\n\n');

    if (generationType === 'chat') {
      setGenerating(true);
      try {
        const welcomeMessage = `Olá! Sou o seu Tutor de Inteligência Artificial. 

Analisei os materiais de estudo que você selecionou: **${selectedNames}** da disciplina de **${disciplineName}** (foco: ${questionFocus === 'theoretical' ? 'Teórico' : questionFocus === 'practical' ? 'Prático' : 'Ambos'}).

Estou pronto para responder a qualquer dúvida, explicar conceitos ou te ajudar com posicionamentos e critérios de exames relacionados a esta matéria. O que você gostaria de saber ou perguntar?`;

        setChatMessages([
          { role: 'assistant', content: welcomeMessage }
        ]);
        setCurrentStep('chat');
      } catch (err) {
        toast.error("Erro ao iniciar o chat de dúvidas.");
      } finally {
        setGenerating(false);
      }
      return;
    }

    setGenerating(true);

    try {
      const systemPrompt = `Você é um gerador de provas e quizzes acadêmicos em formato JSON estruturado. 
Você SEMPRE retorna APENAS um objeto JSON puro e válido, sem blocos de código markdown (\`\`\`json), sem textos extras antes ou depois do JSON.`;

      let focusInstruction = '';
      if (questionFocus === 'theoretical') {
        focusInstruction = 'O foco das questões deve ser estritamente TEÓRICO (conceitos, definições, teorias, física e biologia das matérias, sem casos clínicos complexos ou diagnóstico prático).';
      } else if (questionFocus === 'practical') {
        focusInstruction = 'O foco das questões deve ser estritamente PRÁTICO e clínico (casos clínicos práticos, interpretação de achados e exames de imagem, técnicas de posicionamento radiográfico e tomada de decisão diagnóstica).';
      } else {
        focusInstruction = 'As questões devem conter uma mescla equilibrada de conceitos teóricos fundamentais e de aplicação prática (casos clínicos práticos, técnicas de posicionamento radiográfico e interpretação de achados).';
      }

      let userMessage = '';
      if (generationType === 'quiz') {
        userMessage = `Gere um quiz de múltipla escolha com exatamente ${questionCount} perguntas de nível universitário sobre a disciplina de "${disciplineName}", focando estritamente em tópicos relacionados às seguintes matérias/conteúdos: "${selectedNames}".
${focusInstruction}

ATENÇÃO: Você deve usar as informações abaixo como fonte prioritária de referência para formular as perguntas. Se o material contiver dados específicos como técnicas de posicionamento radiográfico ou termos técnicos particulares, baseie as perguntas neles:
[MATERIAL DE REFERÊNCIA]
${materialsContext}
[FIM DO MATERIAL DE REFERÊNCIA]

Retorne estritamente um JSON no seguinte formato:
{
  "title": "Simulado de Múltipla Escolha - ${disciplineName}",
  "type": "quiz",
  "questions": [
    {
      "question": "Texto da pergunta?",
      "options": [
        "Opção A",
        "Opção B",
        "Opção C",
        "Opção D"
      ],
      "correctIndex": 0,
      "explanation": "Explicação detalhada do porquê a opção correta está certa e as outras erradas."
    }
  ]
}`;
      } else {
        userMessage = `Gere um questionário de revisão com exatamente ${questionCount} perguntas discursivas/abertas sobre a disciplina de "${disciplineName}", focando estritamente em tópicos relacionados às seguintes matérias/conteúdos: "${selectedNames}".
${focusInstruction}

ATENÇÃO: Você deve usar as informações abaixo como fonte prioritária de referência para formular as perguntas. Se o material contiver dados específicos como técnicas de posicionamento radiográfico ou termos técnicos particulares, baseie as perguntas neles:
[MATERIAL DE REFERÊNCIA]
${materialsContext}
[FIM DO MATERIAL DE REFERÊNCIA]

Retorne estritamente um JSON no seguinte formato:
{
  "title": "Questionário discursivo - ${disciplineName}",
  "type": "questionnaire",
  "questions": [
    {
      "question": "Texto da pergunta discursiva?",
      "sampleAnswer": "Resposta esperada detalhada para que o aluno possa comparar.",
      "explanation": "Explicação contextual e teórica sobre o tema abordado."
    }
  ]
}`;
      }

      const responseText = await callLLM({
        provider: llmSettings.llm_provider,
        apiKey: llmSettings.llm_api_key,
        model: llmSettings.llm_model,
        systemPrompt,
        userMessage
      });

      // Limpar resposta caso a LLM insista em colocar tags de markdown
      let cleanText = responseText.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
      }

      const parsedData = JSON.parse(cleanText);
      setQuizData(parsedData);
      setSelectedAnswers({});
      setShowExplanation({});
      setDiscursiveAnswers({});
      setShowDiscursiveAnswers({});
      setCurrentQuestionIndex(0);
      setCurrentStep('quiz');
      toast.success("Estudo gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar estudo:", error);
      toast.error(`Erro ao gerar simulado com a IA: ${error.message || 'Verifique as configurações ou tente novamente.'}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSendChatMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || loadingChatResponse) return;

    const userText = chatInput.trim();
    setChatInput('');

    // Adiciona a mensagem do usuário na tela
    const updatedMessages = [...chatMessages, { role: 'user', content: userText }];
    setChatMessages(updatedMessages);
    setLoadingChatResponse(true);

    try {
      const disciplineName = disciplines.find(d => d.id === selectedDiscipline)?.name || 'Disciplina Geral';
      const selectedItems = materials.filter(m => selectedMaterials.includes(m.id));
      const selectedNames = selectedItems.map(m => m.title).join(', ');

      const materialsContext = selectedItems.map(m => {
        const cleanContent = (m.content || '').replace(/<[^>]*>/g, ' ').trim();
        return `TÓPICO: ${m.title}\nDESCRIÇÃO: ${m.description || 'Não informada'}\nCONTEÚDO E DETALHES DE REFERÊNCIA:\n${cleanContent || 'Sem conteúdo adicional.'}`;
      }).join('\n\n=======================\n\n');

      let focusInstruction = '';
      if (questionFocus === 'theoretical') {
        focusInstruction = 'O foco das suas respostas deve ser estritamente TEÓRICO (biologia, física, conceitos, definições e fundamentações).';
      } else if (questionFocus === 'practical') {
        focusInstruction = 'O foco das suas respostas deve ser estritamente PRÁTICO e clínico (técnicas de posicionamento radiográfico, incidências, angulações, distância foco-filme, critérios de avaliação de exames e interpretação de achados).';
      } else {
        focusInstruction = 'O foco das suas respostas deve abranger de forma equilibrada conceitos teóricos fundamentais e aplicações de posicionamento clínico/exames.';
      }

      const systemPrompt = `Você é um Tutor Conversacional de Inteligência Artificial de nível universitário para a disciplina de "${disciplineName}".
Você está ajudando o aluno a tirar dúvidas sobre o conteúdo das seguintes matérias: "${selectedNames}".
${focusInstruction}

Aqui está o conteúdo oficial do material cadastrado no sistema para sua referência obrigatória:
[MATERIAL DE REFERÊNCIA]
${materialsContext}
[FIM DO MATERIAL DE REFERÊNCIA]

INSTRUÇÕES DE COMPORTAMENTO:
1. Responda de forma didática, clara e objetiva em português (Brasil).
2. Use formatação Markdown (negrito, listas, tabelas) para deixar a resposta legível e profissional.
3. Baseie as suas respostas prioritariamente nas informações do [MATERIAL DE REFERÊNCIA]. Se a informação não constar e for sobre a área, responda de forma cientificamente correta, mas indique se estava ou não no material.
4. Se o aluno perguntar sobre posicionamento radiográfico (ex: incidências de tórax), explique de forma detalhada o posicionamento do paciente, distância foco-filme, angulação do raio, respiração e critérios de qualidade da imagem.
5. Mantenha uma postura encorajadora e amigável.`;

      const responseText = await callLLM({
        provider: llmSettings.llm_provider,
        apiKey: llmSettings.llm_api_key,
        model: llmSettings.llm_model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...updatedMessages.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          }))
        ]
      });

      setChatMessages([...updatedMessages, { role: 'assistant', content: responseText }]);
    } catch (error) {
      console.error("Erro no chat:", error);
      toast.error(`Erro ao obter resposta da IA: ${error.message || 'Tente novamente.'}`);
    } finally {
      setLoadingChatResponse(false);
    }
  };

  const handleOptionSelect = (questionIndex, optionIndex) => {
    if (selectedAnswers[questionIndex] !== undefined) return; // Answered already
    setSelectedAnswers({ ...selectedAnswers, [questionIndex]: optionIndex });
    setShowExplanation({ ...showExplanation, [questionIndex]: true });
  };

  const getScore = () => {
    let score = 0;
    quizData?.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        score++;
      }
    });
    return score;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link to={createPageUrl('StudentDashboard')} className="inline-flex items-center gap-2 text-slate-600 hover:text-[#1e3a5f] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Dashboard
          </Link>
          <div className="flex items-center gap-2 text-[#1e3a5f] bg-[#1e3a5f]/5 px-3 py-1.5 rounded-full border border-[#1e3a5f]/10">
            <Sparkles className="w-4 h-4 text-[#d4a853]" />
            <span className="text-xs font-semibold">Gerador Inteligente por IA</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {currentStep === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="border-t-4 border-t-[#1e3a5f] shadow-xl">
                <CardHeader>
                  <CardTitle className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen className="w-8 h-8 text-[#1e3a5f]" />
                    Gerador de Estudos IA
                  </CardTitle>
                  <CardDescription className="text-slate-600 text-base">
                    Escolha a disciplina, o formato e quantidade de questões para que a inteligência artificial crie um teste personalizado para você praticar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-bold text-slate-700 block mb-2">
                          Selecione a Disciplina / Especialidade
                        </label>
                        <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline}>
                          <SelectTrigger className="w-full bg-white border-slate-200 focus:ring-[#1e3a5f]">
                            <SelectValue placeholder="Selecione a disciplina..." />
                          </SelectTrigger>
                          <SelectContent>
                            {disciplines.map(d => (
                              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-bold text-slate-700 block mb-2">
                          Quantidade de Questões
                        </label>
                        <Select value={questionCount} onValueChange={setQuestionCount}>
                          <SelectTrigger className="w-full bg-white border-slate-200 focus:ring-[#1e3a5f]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 Questões</SelectItem>
                            <SelectItem value="5">5 Questões</SelectItem>
                            <SelectItem value="10">10 Questões</SelectItem>
                            <SelectItem value="15">15 Questões</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-2">
                        Selecione as Matérias / Conteúdos (Escolha de 1 a 5)
                      </label>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 min-h-[80px] flex flex-wrap gap-2 items-center">
                        {loadingMaterials ? (
                          <div className="w-full flex items-center justify-center py-4">
                            <RefreshCw className="w-6 h-6 text-[#1e3a5f] animate-spin" />
                            <span className="text-sm text-slate-500 ml-2">Carregando matérias...</span>
                          </div>
                        ) : materials.length > 0 ? (
                          materials.map(m => {
                            const isSelected = selectedMaterials.includes(m.id);
                            return (
                              <div
                                key={m.id}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedMaterials(selectedMaterials.filter(id => id !== m.id));
                                  } else {
                                    if (selectedMaterials.length >= 5) {
                                      toast.warning("Você pode selecionar no máximo 5 matérias.");
                                      return;
                                    }
                                    setSelectedMaterials([...selectedMaterials, m.id]);
                                  }
                                }}
                                className={`px-4 py-2.5 rounded-full border-2 text-sm font-semibold cursor-pointer transition-all flex items-center gap-2 select-none ${
                                  isSelected
                                    ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white shadow-md scale-95'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                {m.title}
                                {isSelected && <Check className="w-3.5 h-3.5" />}
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-slate-500 italic py-2">
                            Nenhuma matéria cadastrada nesta disciplina. Cadastre materiais na disciplina para que apareçam aqui.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-3">
                      Estilo de Estudo / Formato
                    </label>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div
                        onClick={() => setGenerationType('quiz')}
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                          generationType === 'quiz'
                            ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 shadow-md'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            generationType === 'quiz' ? 'bg-[#1e3a5f] text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <HelpCircle className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 mb-1">Quiz de Múltipla Escolha</h4>
                            <p className="text-xs text-slate-600">Perguntas de múltipla escolha com alternativas e explicações.</p>
                          </div>
                        </div>
                      </div>

                      <div
                        onClick={() => setGenerationType('questionnaire')}
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                          generationType === 'questionnaire'
                            ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 shadow-md'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            generationType === 'questionnaire' ? 'bg-[#1e3a5f] text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 mb-1">Questionário Discursivo</h4>
                            <p className="text-xs text-slate-600">Perguntas abertas teóricas para você comparar com o gabarito.</p>
                          </div>
                        </div>
                      </div>

                      <div
                        onClick={() => setGenerationType('chat')}
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                          generationType === 'chat'
                            ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 shadow-md'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            generationType === 'chat' ? 'bg-[#1e3a5f] text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <MessageSquare className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 mb-1">Chat de Dúvidas</h4>
                            <p className="text-xs text-slate-600">Converse diretamente com a IA para tirar dúvidas sobre o material.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-3">
                      Foco das Questões
                    </label>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div
                        onClick={() => setQuestionFocus('theoretical')}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          questionFocus === 'theoretical'
                            ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 shadow-md'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex gap-3 items-center">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            questionFocus === 'theoretical' ? 'bg-[#1e3a5f] text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <Brain className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-800">Teórico</h4>
                            <p className="text-[10px] text-slate-600">Conceitos e definições</p>
                          </div>
                        </div>
                      </div>

                      <div
                        onClick={() => setQuestionFocus('practical')}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          questionFocus === 'practical'
                            ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 shadow-md'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex gap-3 items-center">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            questionFocus === 'practical' ? 'bg-[#1e3a5f] text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <Activity className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-800">Prático</h4>
                            <p className="text-[10px] text-slate-600">Casos e posicionamento</p>
                          </div>
                        </div>
                      </div>

                      <div
                        onClick={() => setQuestionFocus('both')}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          questionFocus === 'both'
                            ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 shadow-md'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex gap-3 items-center">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            questionFocus === 'both' ? 'bg-[#1e3a5f] text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-800">Ambos</h4>
                            <p className="text-[10px] text-slate-600">Teoria e prática mescladas</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {!llmSettings?.llm_api_key && (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-amber-800">
                        <p className="font-bold">Atenção</p>
                        <p>Nenhuma API de Inteligência Artificial foi configurada no sistema. O administrador precisa configurar a chave da IA em <strong>Admin &rarr; Configurações do Site</strong>.</p>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleGenerate}
                    disabled={generating || !llmSettings?.llm_api_key}
                    className="w-full py-6 text-base bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white rounded-xl shadow-lg transition-all"
                  >
                    {generating ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        {generationType === 'chat' ? 'A IA está preparando seu chat de dúvidas...' : 'A IA está formulando suas questões (pode levar 10-15s)...'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2 text-[#d4a853]" />
                        {generationType === 'chat' ? 'Iniciar Chat com IA' : 'Gerar Prova / Quiz com IA'}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === 'quiz' && quizData && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="shadow-xl">
                <CardHeader className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white rounded-t-xl p-6">
                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <CardTitle className="text-2xl font-bold">{quizData.title}</CardTitle>
                      <CardDescription className="text-blue-100 mt-1">
                        Questão {currentQuestionIndex + 1} de {quizData.questions.length}
                      </CardDescription>
                    </div>
                    <Badge className="bg-[#d4a853] text-[#1e3a5f] text-xs px-3 py-1 font-bold uppercase">
                      {quizData.type === 'quiz' ? 'Múltipla Escolha' : 'Discursivo'}
                    </Badge>
                  </div>
                  <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden mt-4">
                    <div
                      className="bg-[#d4a853] h-full transition-all duration-300"
                      style={{ width: `${((currentQuestionIndex + 1) / quizData.questions.length) * 100}%` }}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="text-lg font-bold text-slate-800">
                    {quizData.questions[currentQuestionIndex].question}
                  </div>

                  {/* Multiple Choice Format */}
                  {quizData.type === 'quiz' && (
                    <div className="space-y-3">
                      {quizData.questions[currentQuestionIndex].options.map((option, idx) => {
                        const isSelected = selectedAnswers[currentQuestionIndex] === idx;
                        const isCorrect = quizData.questions[currentQuestionIndex].correctIndex === idx;
                        const hasAnswered = selectedAnswers[currentQuestionIndex] !== undefined;

                        let buttonClass = 'border-slate-200 hover:border-[#1e3a5f] hover:bg-slate-50';
                        let icon = null;

                        if (hasAnswered) {
                          if (isCorrect) {
                            buttonClass = 'border-green-500 bg-green-50 text-green-900 font-semibold';
                            icon = <Check className="w-5 h-5 text-green-600 flex-shrink-0" />;
                          } else if (isSelected) {
                            buttonClass = 'border-red-500 bg-red-50 text-red-900 font-semibold';
                            icon = <X className="w-5 h-5 text-red-600 flex-shrink-0" />;
                          } else {
                            buttonClass = 'border-slate-100 bg-slate-50/50 text-slate-400 cursor-default';
                          }
                        }

                        return (
                          <div
                            key={idx}
                            onClick={() => handleOptionSelect(currentQuestionIndex, idx)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center gap-4 ${buttonClass}`}
                          >
                            <span>{option}</span>
                            {icon}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Discursive Format */}
                  {quizData.type === 'questionnaire' && (
                    <div className="space-y-4">
                      <Textarea
                        value={discursiveAnswers[currentQuestionIndex] || ''}
                        onChange={(e) => setDiscursiveAnswers({ ...discursiveAnswers, [currentQuestionIndex]: e.target.value })}
                        disabled={showDiscursiveAnswers[currentQuestionIndex]}
                        placeholder="Escreva sua resposta teórica aqui..."
                        rows={5}
                        className="rounded-xl border-slate-200 focus:border-[#1e3a5f]"
                      />

                      <AnimatePresence>
                        {showDiscursiveAnswers[currentQuestionIndex] && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-5 bg-[#1e3a5f]/5 rounded-xl border border-[#1e3a5f]/10 space-y-3"
                          >
                            <div>
                              <span className="text-xs font-bold text-[#1e3a5f] uppercase tracking-wider block mb-1">
                                Resposta Esperada (Espelho)
                              </span>
                              <p className="text-sm text-slate-800 whitespace-pre-wrap">
                                {quizData.questions[currentQuestionIndex].sampleAnswer}
                              </p>
                            </div>
                            {quizData.questions[currentQuestionIndex].explanation && (
                              <div className="pt-3 border-t border-slate-200/50">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                  Contexto / Explicação
                                  </span>
                                <p className="text-sm text-slate-600">
                                  {quizData.questions[currentQuestionIndex].explanation}
                                </p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {!showDiscursiveAnswers[currentQuestionIndex] && (
                        <Button
                          onClick={() => setShowDiscursiveAnswers({ ...showDiscursiveAnswers, [currentQuestionIndex]: true })}
                          disabled={!discursiveAnswers[currentQuestionIndex]?.trim()}
                          className="bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white"
                        >
                          Ver Gabarito de Resposta
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Multiple Choice Explanation */}
                  {quizData.type === 'quiz' && showExplanation[currentQuestionIndex] && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 bg-blue-50/50 rounded-xl border border-blue-200/50"
                    >
                      <h4 className="font-bold text-[#1e3a5f] mb-1 text-sm flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        Explicação Didática
                      </h4>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        {quizData.questions[currentQuestionIndex].explanation}
                      </p>
                    </motion.div>
                  )}
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex justify-between items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="rounded-xl border-slate-200"
                >
                  Anterior
                </Button>

                {currentQuestionIndex < quizData.questions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    disabled={
                      (quizData.type === 'quiz' && selectedAnswers[currentQuestionIndex] === undefined) ||
                      (quizData.type === 'questionnaire' && !showDiscursiveAnswers[currentQuestionIndex])
                    }
                    className="bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white rounded-xl"
                  >
                    Próxima Questão
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => setCurrentStep('summary')}
                    disabled={
                      (quizData.type === 'quiz' && selectedAnswers[currentQuestionIndex] === undefined) ||
                      (quizData.type === 'questionnaire' && !showDiscursiveAnswers[currentQuestionIndex])
                    }
                    className="bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold px-6"
                  >
                    Finalizar Estudo
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {currentStep === 'summary' && quizData && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="shadow-2xl text-center border-t-8 border-t-green-500">
                <CardHeader className="pt-10">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="w-12 h-12 text-green-600 animate-bounce" />
                  </div>
                  <CardTitle className="text-3xl font-extrabold text-slate-800">
                    Estudo Concluído!
                  </CardTitle>
                  <CardDescription className="text-base text-slate-600 mt-2">
                    Excelente trabalho em treinar seus conhecimentos de forma ativa.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  {quizData.type === 'quiz' ? (
                    <div className="bg-slate-50 p-6 rounded-2xl max-w-sm mx-auto border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">
                        Sua Pontuação
                      </p>
                      <p className="text-5xl font-black text-[#1e3a5f] mb-2">
                        {getScore()} <span className="text-2xl text-slate-400">/ {quizData.questions.length}</span>
                      </p>
                      <p className="text-sm font-semibold text-slate-700">
                        ({Math.round((getScore() / quizData.questions.length) * 100)}% de acerto)
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-6 rounded-2xl max-w-md mx-auto border border-slate-200 text-left">
                      <h4 className="font-bold text-[#1e3a5f] mb-3 text-center">Resumo do Questionário</h4>
                      <p className="text-sm text-slate-600 mb-2">
                        Você respondeu a <strong>{quizData.questions.length} perguntas discursivas</strong> e teve a oportunidade de comparar seu entendimento com as respostas gabaritadas da inteligência artificial.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                    <Button
                      onClick={() => setCurrentStep('setup')}
                      className="bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white rounded-xl px-8"
                    >
                      Gerar Novo Teste
                    </Button>
                    <Link to={createPageUrl('StudentDashboard')}>
                      <Button
                        variant="outline"
                        className="rounded-xl border-slate-200 w-full sm:w-auto"
                      >
                        Ir para o Dashboard
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="shadow-2xl border-t-4 border-t-[#1e3a5f]">
                <CardHeader className="bg-slate-50 border-b border-slate-200/80 p-5 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-[#1e3a5f]" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-800">
                        Tutor de Dúvidas IA
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Perguntas diretas sobre o material selecionado
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Deseja sair do chat? O histórico será perdido.')) {
                        setCurrentStep('setup');
                        setChatMessages([]);
                      }
                    }}
                    className="text-slate-500 hover:text-red-600 border-slate-200 rounded-xl"
                  >
                    Encerrar Chat
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Area de Mensagens */}
                  <div className="h-[400px] overflow-y-auto p-6 space-y-4 bg-slate-50/50" id="chat-messages-container">
                    {chatMessages.map((msg, idx) => {
                      const isAi = msg.role === 'assistant';
                      return (
                        <div
                          key={idx}
                          className={`flex gap-3 max-w-[85%] ${isAi ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isAi ? 'bg-[#1e3a5f] text-white' : 'bg-[#d4a853] text-[#1e3a5f]'
                          }`}>
                            {isAi ? <Sparkles className="w-4 h-4 text-[#d4a853]" /> : <User className="w-4 h-4" />}
                          </div>
                          <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                            isAi 
                              ? 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-tl-none whitespace-pre-wrap' 
                              : 'bg-[#1e3a5f] text-white rounded-tr-none'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      );
                    })}

                    {loadingChatResponse && (
                      <div className="flex gap-3 max-w-[85%] mr-auto animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-4 h-4 text-[#d4a853]" />
                        </div>
                        <div className="p-4 rounded-2xl bg-white text-slate-800 shadow-sm border border-slate-100 rounded-tl-none flex items-center gap-2">
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Formulario de Entrada */}
                  <form onSubmit={handleSendChatMessage} className="p-4 border-t border-slate-200 bg-white flex gap-3 rounded-b-xl">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Digite sua dúvida sobre o material de estudo..."
                      disabled={loadingChatResponse}
                      className="flex-1 bg-slate-50 border-slate-200 focus:bg-white rounded-xl focus:ring-[#1e3a5f]"
                    />
                    <Button
                      type="submit"
                      disabled={!chatInput.trim() || loadingChatResponse}
                      className="bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white rounded-xl px-5"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

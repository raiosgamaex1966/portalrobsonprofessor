import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { 
  FileQuestion, Plus, Pencil, Trash2, ArrowLeft, Clock, 
  Calendar, ListChecks, Copy, FileEdit, Sparkles, RefreshCw, Check, AlertCircle
} from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Fetch Helper with Timeout ────────────────────────────────────────────────
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 90000 } = options;
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

export default function AdminTests() {
  const [tests, setTests] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discipline_id: '',
    test_type: 'objective',
    time_limit_minutes: 30,
    due_date: '',
    is_active: true,
    questions: [],
    practical_instructions: ''
  });
  const [saving, setSaving] = useState(false);
  const [llmSettings, setLlmSettings] = useState(null);
  
  // AI questions generator states
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [questionCount, setQuestionCount] = useState('5');
  const [questionFocus, setQuestionFocus] = useState('both'); // 'theoretical' | 'practical' | 'both'
  const [generatingAi, setGeneratingAi] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  useEffect(() => {
    if (formData.discipline_id) {
      fetchMaterials(formData.discipline_id);
    } else {
      setMaterials([]);
    }
  }, [formData.discipline_id]);

  const fetchMaterials = async (disciplineId) => {
    setLoadingMaterials(true);
    try {
      const data = await base44.entities.Material.filter({ discipline_id: disciplineId, is_active: true });
      setMaterials(data || []);
      setSelectedMaterials([]);
    } catch (error) {
      console.error("Erro ao carregar materiais da disciplina:", error);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const checkAuthAndLoad = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      base44.auth.redirectToLogin(createPageUrl('Admin'));
      return;
    }

    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      window.location.href = createPageUrl('Home');
      return;
    }

    loadData();
  };

  const loadData = async () => {
    const [testsData, disciplinesData] = await Promise.all([
      base44.entities.Test.list('-created_date'),
      base44.entities.Discipline.list()
    ]);
    setTests(testsData);
    setDisciplines(disciplinesData);

    // Fetch LLM configuration
    try {
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
    } catch (e) {
      console.error("Erro ao carregar configurações de IA:", e);
    }

    setLoading(false);
  };

  const getDisciplineName = (id) => disciplines.find(d => d.id === id)?.name || 'Sem disciplina';

  const openDialog = (test = null) => {
    if (test) {
      setEditingTest(test);
      setFormData({
        title: test.title || '',
        description: test.description || '',
        discipline_id: test.discipline_id || '',
        test_type: test.test_type || 'objective',
        time_limit_minutes: test.time_limit_minutes || 30,
        due_date: test.due_date ? test.due_date.slice(0, 16) : '',
        is_active: test.is_active !== false,
        questions: test.questions || [],
        practical_instructions: test.practical_instructions || ''
      });
    } else {
      setEditingTest(null);
      setFormData({
        title: '',
        description: '',
        discipline_id: '',
        test_type: 'objective',
        time_limit_minutes: 30,
        due_date: '',
        is_active: true,
        questions: [],
        practical_instructions: ''
      });
    }
    setDialogOpen(true);
  };

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [...formData.questions, {
        question: '',
        options: ['', '', '', ''],
        correct_answer: 0,
        points: 1
      }]
    });
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...formData.questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setFormData({ ...formData, questions: newQuestions });
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const newQuestions = [...formData.questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setFormData({ ...formData, questions: newQuestions });
  };

  const removeQuestion = (index) => {
    const newQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData({ ...formData, questions: newQuestions });
  };

  const duplicateQuestion = (index) => {
    const newQuestions = [...formData.questions];
    newQuestions.splice(index + 1, 0, { ...formData.questions[index] });
    setFormData({ ...formData, questions: newQuestions });
  };

  const handleGenerateAiQuestions = async () => {
    if (!formData.discipline_id) {
      toast.error("Por favor, selecione uma disciplina primeiro.");
      return;
    }

    if (selectedMaterials.length === 0) {
      toast.error("Por favor, selecione pelo menos 1 matéria/tópico como referência.");
      return;
    }

    if (!llmSettings?.llm_api_key) {
      toast.error("Inteligência Artificial não configurada nas Configurações do Site.");
      return;
    }

    setGeneratingAi(true);

    try {
      const disciplineName = disciplines.find(d => d.id === formData.discipline_id)?.name || 'Disciplina Geral';
      const selectedItems = materials.filter(m => selectedMaterials.includes(m.id));
      const selectedNames = selectedItems.map(m => m.title).join(', ');
      
      const materialsContext = selectedItems.map(m => {
        const cleanContent = (m.content || '').replace(/<[^>]*>/g, ' ').trim();
        return `TÓPICO: ${m.title}\nDESCRIÇÃO: ${m.description || 'Não informada'}\nCONTEÚDO E DETALHES DE REFERÊNCIA:\n${cleanContent || 'Sem conteúdo cadastrado.'}`;
      }).join('\n\n=======================\n\n');

      const systemPrompt = `Você é um gerador de provas e exames acadêmicos de nível universitário em formato JSON estruturado. 
Você SEMPRE retorna APENAS um objeto JSON puro e válido, sem blocos de código markdown (\`\`\`json), sem textos extras antes ou depois do JSON.`;

      let focusInstruction = '';
      if (questionFocus === 'theoretical') {
        focusInstruction = 'O foco das questões deve ser estritamente TEÓRICO (conceitos, definições, teorias, física e biologia das matérias, sem casos clínicos complexos ou diagnóstico prático).';
      } else if (questionFocus === 'practical') {
        focusInstruction = 'O foco das questões deve ser estritamente PRÁTICO e clínico (casos clínicos práticos, interpretação de achados e exames de imagem, técnicas de posicionamento radiográfico e tomada de decisão diagnóstica).';
      } else {
        focusInstruction = 'As questões devem conter uma mescla equilibrada de conceitos teóricos fundamentais e de aplicação prática (casos clínicos práticos, técnicas de posicionamento radiográfico e interpretação de achados).';
      }

      const userMessage = `Gere exatamente ${questionCount} questões objetivas de múltipla escolha com exatamente 4 alternativas cada sobre a disciplina de "${disciplineName}", focando estritamente em tópicos relacionados às seguintes matérias/conteúdos: "${selectedNames}".
${focusInstruction}

ATENÇÃO: Você deve usar as informações abaixo como fonte prioritária de referência para formular as perguntas. Se o material contiver dados específicos como técnicas de posicionamento radiográfico ou termos técnicos particulares, baseie as perguntas neles:
[MATERIAL DE REFERÊNCIA]
${materialsContext}
[FIM DO MATERIAL DE REFERÊNCIA]

Retorne estritamente um JSON no seguinte formato:
{
  "questions": [
    {
      "question": "Texto do enunciado da pergunta?",
      "options": [
        "Opção A",
        "Opção B",
        "Opção C",
        "Opção D"
      ],
      "correct_answer": 0,
      "points": 1
    }
  ]
}`;

      const responseText = await callLLM({
        provider: llmSettings.llm_provider,
        apiKey: llmSettings.llm_api_key,
        model: llmSettings.llm_model,
        systemPrompt,
        userMessage
      });

      let cleanText = responseText.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
      }

      const parsedData = JSON.parse(cleanText);
      if (parsedData?.questions && Array.isArray(parsedData.questions)) {
        const formattedQuestions = parsedData.questions.map(q => ({
          question: q.question || 'Pergunta sem enunciado',
          options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
          correct_answer: typeof q.correct_answer === 'number' && q.correct_answer >= 0 && q.correct_answer <= 3 ? q.correct_answer : 0,
          points: typeof q.points === 'number' ? q.points : 1
        }));

        setFormData(prev => ({
          ...prev,
          questions: [...prev.questions, ...formattedQuestions]
        }));
        
        setAiDialogOpen(false);
        toast.success(`${formattedQuestions.length} questões geradas por IA com sucesso!`);
      } else {
        throw new Error("Formato inválido de JSON retornado pela IA.");
      }
    } catch (error) {
      console.error("Erro ao gerar questões com IA:", error);
      toast.error(`Erro ao gerar questões com IA: ${error.message || 'Verifique o formato ou a chave da IA.'}`);
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const dataToSave = {
      ...formData,
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null
    };
    
    if (editingTest) {
      await base44.entities.Test.update(editingTest.id, dataToSave);
    } else {
      await base44.entities.Test.create(dataToSave);
    }
    await loadData();
    setDialogOpen(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (confirm('Tem certeza que deseja excluir este teste?')) {
      await base44.entities.Test.delete(id);
      await loadData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <Link to={createPageUrl('Admin')} className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Painel
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Testes</h1>
              <p className="text-blue-200">Crie e gerencie testes para os alunos</p>
            </div>
            <Button 
              onClick={() => openDialog()}
              className="bg-[#d4a853] hover:bg-[#c49743] text-[#1e3a5f]"
            >
              <Plus className="w-5 h-5 mr-2" />
              Novo Teste
            </Button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl h-24 animate-pulse" />
            ))}
          </div>
        ) : tests.length > 0 ? (
          <div className="space-y-4">
            {tests.map((test, index) => (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="shadow-md hover:shadow-lg transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <FileQuestion className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                           <h3 className="font-semibold text-slate-800">{test.title}</h3>
                           <Badge variant="secondary">{getDisciplineName(test.discipline_id)}</Badge>
                           <Badge className={test.test_type === 'practical' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                             {test.test_type === 'practical' ? 'Prático' : 'Objetivo'}
                           </Badge>
                           {!test.is_active && (
                             <Badge variant="destructive">Inativo</Badge>
                           )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                           {test.test_type === 'objective' && (
                             <span className="flex items-center gap-1">
                               <ListChecks className="w-4 h-4" />
                               {test.questions?.length || 0} questões
                             </span>
                           )}
                            {test.time_limit_minutes && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {test.time_limit_minutes} min
                              </span>
                            )}
                            {test.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(test.due_date), "d/MM/yyyy", { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="ghost" size="icon" onClick={() => openDialog(test)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(test.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="text-center py-16">
            <CardContent>
              <FileQuestion className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">Nenhum teste cadastrado</p>
              <Button onClick={() => openDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Teste
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTest ? 'Editar Teste' : 'Novo Teste'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Título *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Título do teste"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Disciplina *</Label>
                <Select value={formData.discipline_id} onValueChange={(value) => setFormData({ ...formData, discipline_id: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {disciplines.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de Teste *</Label>
                <Select value={formData.test_type} onValueChange={(value) => setFormData({ ...formData, test_type: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="objective">Objetivo (Questões)</SelectItem>
                    <SelectItem value="practical">Prático (Trabalho)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tempo Limite (minutos)</Label>
                <Input
                  type="number"
                  value={formData.time_limit_minutes}
                  onChange={(e) => setFormData({ ...formData, time_limit_minutes: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Instruções do teste..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Prazo Final</Label>
                <Input
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center justify-between pt-6">
                <Label>Ativo</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            {/* Practical Instructions */}
            {formData.test_type === 'practical' && (
              <div>
                <Label className="text-lg font-semibold">Instruções do Trabalho Prático</Label>
                <p className="text-sm text-slate-500 mb-2">
                  Descreva o que os alunos devem fazer neste trabalho prático
                </p>
                <ReactQuill
                  value={formData.practical_instructions}
                  onChange={(value) => setFormData({ ...formData, practical_instructions: value })}
                  placeholder="Digite as instruções detalhadas do trabalho..."
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['link'],
                      ['clean']
                    ]
                  }}
                  style={{ minHeight: '200px' }}
                />
              </div>
            )}

            {/* Questions */}
            {formData.test_type === 'objective' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-lg font-semibold">Questões ({formData.questions.length})</Label>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      onClick={() => {
                        if (!formData.discipline_id) {
                          toast.error("Por favor, selecione uma disciplina primeiro.");
                          return;
                        }
                        setAiDialogOpen(true);
                      }} 
                      size="sm"
                      variant="outline"
                      className="border-purple-200 text-purple-700 hover:bg-purple-50 flex items-center gap-1"
                    >
                      <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                      Gerar com IA
                    </Button>
                    <Button type="button" onClick={addQuestion} size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar Questão
                    </Button>
                  </div>
                </div>

                <div className="space-y-6">
                  {formData.questions.map((question, qIndex) => (
                  <Card key={qIndex} className="p-4 bg-slate-50">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-medium">Questão {qIndex + 1}</h4>
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="icon" onClick={() => duplicateQuestion(qIndex)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label>Enunciado</Label>
                        <Textarea
                          value={question.question}
                          onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                          placeholder="Digite a pergunta..."
                          className="mt-1"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {question.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${qIndex}`}
                              checked={question.correct_answer === oIndex}
                              onChange={() => updateQuestion(qIndex, 'correct_answer', oIndex)}
                              className="w-4 h-4 text-[#1e3a5f]"
                            />
                            <Input
                              value={option}
                              onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                              placeholder={`Opção ${oIndex + 1}`}
                              className="flex-1"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <Label>Pontos:</Label>
                        <Input
                          type="number"
                          value={question.points}
                          onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value) || 1)}
                          className="w-20"
                          min="1"
                        />
                      </div>
                    </div>
                  </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!formData.title || !formData.discipline_id || saving}
              className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Generator Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1e3a5f]">
              <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
              Gerar Questões com IA
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div>
              <Label className="text-sm font-bold text-slate-700 block mb-2">
                Selecione as Matérias/Tópicos de Referência *
              </Label>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 min-h-[80px] flex flex-wrap gap-2 items-center">
                {loadingMaterials ? (
                  <div className="w-full flex items-center justify-center py-4">
                    <RefreshCw className="w-5 h-5 text-[#1e3a5f] animate-spin" />
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
                            setSelectedMaterials([...selectedMaterials, m.id]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 select-none ${
                          isSelected
                            ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {m.title}
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500 italic py-2">
                    Nenhuma matéria cadastrada nesta disciplina. Cadastre materiais na disciplina para usá-los como base de conhecimento da IA.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-bold text-slate-700 block mb-2">
                  Quantidade de Questões
                </Label>
                <Select value={questionCount} onValueChange={setQuestionCount}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Questões</SelectItem>
                    <SelectItem value="5">5 Questões</SelectItem>
                    <SelectItem value="10">10 Questões</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-bold text-slate-700 block mb-2">
                  Foco das Questões
                </Label>
                <Select value={questionFocus} onValueChange={setQuestionFocus}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Teórico e Prático</SelectItem>
                    <SelectItem value="theoretical">Estritamente Teórico</SelectItem>
                    <SelectItem value="practical">Estritamente Prático</SelectItem>
                  </SelectContent>
                </Select>
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
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setAiDialogOpen(false)} disabled={generatingAi}>
              Cancelar
            </Button>
            <Button
              onClick={handleGenerateAiQuestions}
              disabled={generatingAi || !llmSettings?.llm_api_key || selectedMaterials.length === 0}
              className="bg-purple-700 hover:bg-purple-800 text-white flex items-center gap-1.5"
            >
              {generatingAi ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Gerando Questões...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Gerar Questões
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShieldAlert, Settings, FileText, Plus, Trash2, Key, UploadCloud, 
  ArrowLeft, CheckCircle, RefreshCw, Info, Cpu, Eye, EyeOff, LayoutGrid 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from '@/api/supabaseClient';
import { createPageUrl } from "@/utils";

const PROVIDERS = [
  { id: "openai", label: "OpenAI (GPT)", icon: "🟢", placeholder: "sk-proj-...", defaultModel: "gpt-4o-mini", models: ["gpt-4o-mini", "gpt-4o"] },
  { id: "deepinfra", label: "DeepInfra (Llama)", icon: "🟠", placeholder: "DeepInfra Token", defaultModel: "meta-llama/Llama-3.3-70B-Instruct", models: [
    "meta-llama/Llama-3.3-70B-Instruct",
    "meta-llama/Meta-Llama-3.1-8B-Instruct",
    "meta-llama/Llama-3.2-11B-Vision-Instruct",
    "meta-llama/Llama-3.2-90B-Vision-Instruct",
  ]},
  { id: "claude", label: "Anthropic Claude", icon: "🟣", placeholder: "sk-ant-...", defaultModel: "claude-3-5-haiku-20241022", models: ["claude-3-5-haiku-20241022", "claude-3-5-sonnet-20241022"] },
  { id: "gemini", label: "Google Gemini", icon: "🔵", placeholder: "Gemini API Key", defaultModel: "gemini-2.0-flash", models: ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"] },
  { id: "openrouter", label: "OpenRouter", icon: "🌐", placeholder: "sk-or-v1-...", defaultModel: "google/gemini-2.5-flash", models: [
    "google/gemini-2.5-flash",
    "google/gemini-2.0-flash-exp",
    "meta-llama/llama-3.2-11b-vision-instruct:free",
    "openai/gpt-4o-mini",
    "anthropic/claude-3.5-sonnet",
  ]},
];

// Models that support vision/image input
const VISION_MODELS = new Set([
  "gpt-4o-mini", "gpt-4o",
  "claude-3-5-haiku-20241022", "claude-3-5-sonnet-20241022",
  "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro",
  "meta-llama/Llama-3.2-11B-Vision-Instruct",
  "meta-llama/Llama-3.2-90B-Vision-Instruct",
  "google/gemini-2.5-flash",
  "google/gemini-2.0-flash-exp",
  "meta-llama/llama-3.2-11b-vision-instruct:free",
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-sonnet",
]);

const SEED_AGENTS = [
  { id: "anato_geral", label: "01. Anatomia Geral", iconKey: "generic", color: "#818cf8", gradient: "linear-gradient(135deg,#4f46e5,#818cf8)", title: "Anatomia Geral e Posicionamento", systemPrompt: "Você é o AGENTE ANATOMIA GERAL — especialista em terminologias, planos anatômicos e princípios de posicionamento radiográfico. Responda baseado apenas no PDF." },
  { id: "imagem_digital", label: "02. Imagem Digital", iconKey: "generic", color: "#3b82f6", gradient: "linear-gradient(135deg,#2563eb,#3b82f6)", title: "Imagem de RX Digital e Radioproteção", systemPrompt: "Você é o AGENTE IMAGEM DIGITAL — especialista em física de raios-x, qualidade de imagem, radiologia digital e radioproteção. Responda baseado apenas no PDF." },
  { id: "torax", label: "03. Tórax", iconKey: "torax", color: "#10b981", gradient: "linear-gradient(135deg,#059669,#10b981)", title: "Radiologia de Tórax", systemPrompt: "Você é o AGENTE TÓRAX — especialista em radiologia torácica (PA, Perfil, AP, Lordótica, Oblíquas, costelas, esterno, clavícula). Responda baseado apenas no PDF." },
  { id: "abdome", label: "04. Abdômen", iconKey: "abdomen", color: "#f97316", gradient: "linear-gradient(135deg,#ea580c,#f97316)", title: "Radiologia de Abdômen", systemPrompt: "Você é o AGENTE ABDÔMEN — especialista em radiologia abdominal (simples, urografia, rins, bexiga). Responda baseado apenas no PDF." },
  { id: "mmss", label: "05. MMSS", iconKey: "msup", color: "#ec4899", gradient: "linear-gradient(135deg,#db2777,#ec4899)", title: "Membros Superiores (MMSS)", systemPrompt: "Você é o AGENTE MEMBROS SUPERIORES — especialista em radiografia de dedos, mão, punho, antebraço, cotovelo e úmero. Responda baseado apenas no PDF." },
  { id: "umero_proximal", label: "06. Úmero Proximal", iconKey: "msup", color: "#eab308", gradient: "linear-gradient(135deg,#ca8a04,#eab308)", title: "Úmero Proximal e Cintura Escapular", systemPrompt: "Você é o AGENTE ÚMERO PROXIMAL — especialista em ombro, escápula e clavícula. Responda baseado apenas no PDF." },
  { id: "mmii", label: "07. MMII", iconKey: "minf", color: "#14b8a6", gradient: "linear-gradient(135deg,#0d9488,#14b8a6)", title: "Membros Inferiores (MMII)", systemPrompt: "Você é o AGENTE MEMBROS INFERIORES — especialista em pé, tornozelo, perna e joelho. Responda baseado apenas no PDF." },
  { id: "femur_proximal", label: "08. Fêmur Proximal", iconKey: "pelve", color: "#d946ef", gradient: "linear-gradient(135deg,#c084fc,#d946ef)", title: "Fêmur Proximal e Cintura Pélvica", systemPrompt: "Você é o AGENTE FÊMUR PROXIMAL — especialista em quadril, pelve e fêmur proximal. Responda baseado apenas no PDF." },
  { id: "coluna_cerv_torac", label: "09. Coluna Cerv/Torac", iconKey: "coluna", color: "#f43f5e", gradient: "linear-gradient(135deg,#e11d48,#f43f5e)", title: "Colunas Cervical e Torácica", systemPrompt: "Você é o AGENTE COLUNAS CERVICAL E TORÁCICA — especialista em anatomia e posicionamento da coluna cervical e torácica. Responda baseado apenas no PDF." },
  { id: "coluna_lombar", label: "10. Coluna Lombar", iconKey: "coluna", color: "#06b6d4", gradient: "linear-gradient(135deg,#0891b2,#06b6d4)", title: "Coluna Lombar, Sacro e Cóccix", systemPrompt: "Você é o AGENTE COLUNA LOMBAR — especialista em coluna lombar, articulações sacroilíacas, sacro e cóccix. Responda baseado apenas no PDF." },
  { id: "sus", label: "Legislação do SUS", iconKey: "generic", color: "#10b981", gradient: "linear-gradient(135deg,#059669,#10b981)", title: "Sistema Único de Saúde", systemPrompt: "Você é o AGENTE SUS — especialista na legislação do Sistema Único de Saúde (SUS), Lei 8.080/90, Lei 8.142/90, Constituição Federal artigos 196 a 200. Responda baseado apenas no PDF." },
  { id: "portugues", label: "Língua Portuguesa", iconKey: "generic", color: "#818cf8", gradient: "linear-gradient(135deg,#4f46e5,#818cf8)", title: "Especialista em Língua Portuguesa", systemPrompt: "Você é o AGENTE LÍNGUA PORTUGUESA — especialista em gramática, ortografia, interpretação de textos e redação. Responda baseado apenas no PDF." }
];

export default function AdminAiAgents() {
  const [activeTab, setActiveTab] = useState("materials"); 
  const [agents, setAgents] = useState([]);
  const [materials, setMaterials] = useState({});
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [savingConfig, setSavingConfig] = useState({});
  const [uploadingAgent, setUploadingAgent] = useState(null);

  const [newId, setNewId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [newIcon, setNewIcon] = useState("generic");
  const [newColor, setNewColor] = useState("#818cf8");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const { data: agentsData, error: agentsErr } = await supabase
        .from('custom_agents')
        .select('*')
        .order('created_at', { ascending: true });
      if (agentsErr) throw agentsErr;
      setAgents(agentsData || []);

      const { data: configsData } = await supabase.from('agent_configs').select('*');
      const cfgs = {};
      configsData?.forEach(c => {
        cfgs[c.agent_id] = {
          provider: c.provider,
          model: c.model,
          apiKeys: c.api_keys
        };
      });
      setConfigs(cfgs);

      const { data: materialsData } = await supabase.from('agent_materials').select('*');
      const mats = {};
      materialsData?.forEach(m => {
        if (!mats[m.agent_id]) mats[m.agent_id] = [];
        mats[m.agent_id].push(m);
      });
      setMaterials(mats);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados dos tutores.");
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const seedData = SEED_AGENTS.map(a => ({
        id: a.id,
        label: a.label,
        icon: a.iconKey,
        color: a.color,
        gradient: a.gradient,
        title: a.title,
        system_prompt: a.systemPrompt,
        active: true,
        user_id: user?.id || null
      }));

      const { error } = await supabase.from('custom_agents').upsert(seedData);
      if (error) throw error;
      
      toast.success("Agentes iniciais populados com sucesso!");
      loadAll();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao popular agentes padrão.");
    } finally {
      setSeeding(false);
    }
  };

  const handleUploadPdf = async (agentId, file) => {
    if (!file || file.type !== "application/pdf") {
      toast.error("Selecione um arquivo PDF válido.");
      return;
    }

    setUploadingAgent(agentId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fileExt = file.name.split('.').pop();
      const fileName = `${agentId}_${Date.now()}.${fileExt}`;

      const { data: storageData, error: storageErr } = await supabase.storage
        .from('materials')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (storageErr) throw storageErr;

      const { data: { publicUrl } } = supabase.storage
        .from('materials')
        .getPublicUrl(fileName);

      const matRow = {
        agent_id: agentId,
        name: file.name,
        size: Math.round(file.size / 1024),
        file_url: publicUrl,
        user_id: user?.id
      };

      const { error: dbErr } = await supabase.from('agent_materials').insert(matRow);
      if (dbErr) throw dbErr;

      toast.success(`PDF "${file.name}" carregado com sucesso.`);
      loadAll();
    } catch (err) {
      console.error(err);
      toast.error(`Erro ao subir arquivo PDF para o Storage: ${err.message || JSON.stringify(err)}`);
    } finally {
      setUploadingAgent(null);
    }
  };

  const handleRemovePdf = async (agentId, matId, fileUrl) => {
    try {
      const fileName = fileUrl.split('/').pop();
      await supabase.storage.from('materials').remove([fileName]);
      
      const { error } = await supabase.from('agent_materials').delete().eq('id', matId);
      if (error) throw error;

      toast.success("Material PDF removido.");
      loadAll();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao remover PDF.");
    }
  };

  const handleSaveConfig = async (agentId, prov, mdl, key) => {
    setSavingConfig(prev => ({ ...prev, [agentId]: true }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const keysObj = configs[agentId]?.apiKeys || {};
      if (key) {
        keysObj[prov] = key;
      }

      const row = {
        agent_id: agentId,
        provider: prov,
        model: mdl,
        api_keys: keysObj,
        user_id: user?.id
      };

      const { error } = await supabase.from('agent_configs').upsert(row);
      if (error) throw error;

      toast.success("Configuração de IA salva.");
      loadAll();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar configuração de IA.");
    } finally {
      setSavingConfig(prev => ({ ...prev, [agentId]: false }));
    }
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    if (!newId || !newLabel || !newPrompt) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const newAgent = {
        id: newId.toLowerCase().replace(/ /g, '_'),
        label: newLabel,
        title: newTitle || newLabel,
        system_prompt: newPrompt,
        icon: newIcon,
        color: newColor,
        gradient: `linear-gradient(135deg, ${newColor}, #1e293b)`,
        user_id: user?.id
      };

      const { error } = await supabase.from('custom_agents').insert(newAgent);
      if (error) throw error;

      toast.success("Agente customizado criado.");
      setNewId("");
      setNewLabel("");
      setNewTitle("");
      setNewPrompt("");
      loadAll();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar agente customizado.");
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!confirm("Tem certeza que deseja deletar este agente? Isso apagará também os PDFs e chaves vinculados.")) return;
    try {
      const { error } = await supabase.from('custom_agents').delete().eq('id', agentId);
      if (error) throw error;
      toast.success("Agente deletado.");
      loadAll();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao deletar agente.");
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-[#f3f4f6] py-6 px-4 sm:py-8 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Header toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link to={createPageUrl('StudentAiAgents')} className="inline-flex items-center gap-2 text-slate-400 hover:text-white font-bold transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Centro de IA
          </Link>
          
          <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 py-1.5 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <ShieldAlert className="w-4 h-4" />
            Acesso Administrativo
          </Badge>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 flex items-center gap-2">
            <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300" />
            Configurações dos Tutores Inteligentes
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">Configure os prompts de sistema, envie arquivos PDF de referência e gerencie modelos de linguagem.</p>
        </div>

        {/* Tabs navigation */}
        <div className="flex border border-slate-800 bg-[#0f1626] p-1 rounded-2xl max-w-md shadow-inner">
          <button
            onClick={() => setActiveTab("materials")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "materials" ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            PDFs
          </button>
          <button
            onClick={() => setActiveTab("llm")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "llm" ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4" />
            Modelos
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "create" ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            Criar
          </button>
        </div>

        {/* LOADING */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-[#131b2e] border border-slate-800 rounded-3xl">
            <RefreshCw className="w-8 h-8 text-slate-500 animate-spin mb-4" />
            <p className="text-slate-400 text-sm">Carregando painel...</p>
          </div>
        ) : (
          <div>
            
            {/* TAB 1: MATERIALS */}
            {activeTab === "materials" && (
              <div className="space-y-6">
                {agents.length === 0 && (
                  <Card className="p-8 text-center border-dashed border-2 border-slate-800 bg-[#131b2e] rounded-2xl">
                    <Info className="w-10 h-10 text-slate-500 mx-auto mb-4" />
                    <h3 className="font-extrabold text-slate-200">Tabela de Agentes Vazia</h3>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">Inicie criando agentes customizados ou popule com a lista padrão.</p>
                    <Button onClick={handleSeed} disabled={seeding} className="bg-blue-600 text-white font-bold rounded-xl px-6 hover:bg-blue-700">
                      {seeding ? "Populando..." : "Popular Agentes Padrão (Crânio, Tórax, SUS, etc.)"}
                    </Button>
                  </Card>
                )}

                {agents.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {agents.map(agent => {
                      const mats = materials[agent.id] || [];
                      const refInput = React.createRef();
                      return (
                        <Card key={agent.id} className="bg-[#131b2e] border-slate-800 rounded-2xl shadow-xl hover:border-slate-700/80 transition-all">
                          <CardHeader className="flex flex-row items-center gap-3 pb-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: agent.gradient }}>
                              {agent.icon === 'cranio' ? '🧠' : agent.icon === 'torax' ? '🫁' : agent.icon === 'abdomen' ? '🫃' : '🔬'}
                            </div>
                            <div className="flex-1 truncate">
                              <CardTitle className="text-sm sm:text-base font-extrabold truncate" style={{ color: agent.color }}>{agent.label}</CardTitle>
                              <CardDescription className="text-xs text-slate-400 truncate">{agent.title}</CardDescription>
                            </div>
                            <Button 
                              variant="ghost" 
                              onClick={() => handleDeleteAgent(agent.id)}
                              className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl p-2 h-auto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </CardHeader>
                          <CardContent className="space-y-4 pt-0">
                            {/* Materials list */}
                            <div className="space-y-2">
                              {mats.length === 0 ? (
                                <div className="text-[11px] text-amber-400 bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl flex items-start gap-2">
                                  <span>⚠️ Sem PDF anexado. A IA não terá material de referência para responder.</span>
                                </div>
                              ) : (
                                mats.map(m => (
                                  <div key={m.id} className="text-xs text-emerald-300 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl flex items-center justify-between">
                                    <div className="truncate pr-4">
                                      <p className="font-bold truncate">📄 {m.name}</p>
                                      <p className="text-[10px] text-emerald-500 font-semibold">{m.size} KB · Carregado</p>
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      onClick={() => handleRemovePdf(agent.id, m.id, m.file_url)}
                                      className="text-emerald-400 hover:bg-emerald-500/10 p-1.5 h-auto rounded-lg"
                                    >
                                      🗑️
                                    </Button>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Upload input trigger */}
                            <input 
                              type="file" 
                              accept=".pdf" 
                              ref={refInput} 
                              style={{ display: 'none' }} 
                              onChange={e => handleUploadPdf(agent.id, e.target.files[0])}
                            />
                            <Button 
                              onClick={() => refInput.current.click()} 
                              disabled={uploadingAgent === agent.id}
                              className="w-full bg-[#0b101c] border border-slate-800 text-white rounded-xl py-4 text-xs sm:text-sm font-bold hover:bg-[#111728] transition-all flex items-center justify-center gap-2"
                            >
                              {uploadingAgent === agent.id ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>Subindo PDF...</span>
                                </>
                              ) : (
                                <>
                                  <UploadCloud className="w-4 h-4" />
                                  <span>{mats.length > 0 ? "Substituir PDF" : "Enviar PDF"}</span>
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: IA CONFIG */}
            {activeTab === "llm" && (
              <div className="space-y-6">
                {agents.length === 0 && (
                  <p className="text-slate-500 text-center py-12 text-sm">Nenhum agente disponível. Popule a lista na aba de materiais.</p>
                )}

                {agents.map(agent => {
                  const savedCfg = configs[agent.id] || { provider: "openai", model: "gpt-4o-mini", apiKeys: {} };
                  return (
                    <AgentConfigCard 
                      key={agent.id}
                      agent={agent}
                      savedCfg={savedCfg}
                      onSave={handleSaveConfig}
                      saving={savingConfig[agent.id]}
                    />
                  );
                })}
              </div>
            )}

            {/* TAB 3: CREATE AGENT */}
            {activeTab === "create" && (
              <Card className="bg-[#131b2e] border-slate-800 rounded-2xl shadow-xl max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl font-extrabold text-slate-100 flex items-center gap-2">
                    <Cpu className="w-5 h-5" />
                    Adicionar Novo Tutor Personalizado
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs sm:text-sm">Crie um novo módulo de estudo com prompt de instrução e identidade visual exclusivos.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateAgent} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1">ID Único (ex: 'anatomia_pelve')</label>
                        <Input value={newId} onChange={e => setNewId(e.target.value)} placeholder="anatomia_pelve" className="rounded-xl border-slate-800 bg-[#0b101c] text-white" required />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1">Título Visual (ex: 'Pelve / Bacia')</label>
                        <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="08. Pelve / Bacia" className="rounded-xl border-slate-800 bg-[#0b101c] text-white" required />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1">Ícone</label>
                        <Select value={newIcon} onValueChange={setNewIcon}>
                          <SelectTrigger className="rounded-xl border-slate-800 bg-[#0b101c] text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="generic">🔬 Genérico</SelectItem>
                            <SelectItem value="cranio">🧠 Cabeça</SelectItem>
                            <SelectItem value="torax">🫁 Tórax</SelectItem>
                            <SelectItem value="abdomen">🫃 Abdômen</SelectItem>
                            <SelectItem value="coluna">🦴 Coluna</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1">Cor Temática</label>
                        <Input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="h-10 rounded-xl cursor-pointer p-1 border-slate-800 bg-[#0b101c]" />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1">Subtítulo de Identificação</label>
                        <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Especialista em Pelve" className="rounded-xl border-slate-800 bg-[#0b101c] text-white" />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Prompt de Sistema (Instruções de Comportamento)</label>
                      <Textarea 
                        value={newPrompt} 
                        onChange={e => setNewPrompt(e.target.value)} 
                        placeholder="Você é o AGENTE PELVE — especialista exclusivo em radiologia da pelve..." 
                        rows={4}
                        className="rounded-xl border-slate-800 bg-[#0b101c] text-white"
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full bg-blue-600 text-white font-bold rounded-xl py-5 hover:bg-blue-700 shadow transition-all text-xs sm:text-sm">
                      Adicionar Agente Inteligente
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

function AgentConfigCard({ agent, savedCfg, onSave, saving }) {
  const [selectedProvider, setSelectedProvider] = useState(savedCfg.provider || "openai");
  const [selectedModel, setSelectedModel] = useState(savedCfg.model || "gpt-4o-mini");
  const [apiKey, setApiKey] = useState(savedCfg.apiKeys?.[savedCfg.provider] || "");

  useEffect(() => {
    if (savedCfg) {
      setSelectedProvider(savedCfg.provider || "openai");
      setSelectedModel(savedCfg.model || "gpt-4o-mini");
      setApiKey(savedCfg.apiKeys?.[savedCfg.provider] || "");
    }
  }, [savedCfg]);

  const currentProviderData = PROVIDERS.find(p => p.id === selectedProvider) || PROVIDERS[0];

  return (
    <Card className="bg-[#131b2e] border-slate-800 rounded-2xl shadow-xl">
      <CardHeader className="pb-3 flex flex-row items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: agent.gradient }}>
          {agent.icon === 'cranio' ? '🧠' : agent.icon === 'torax' ? '🫁' : '🔬'}
        </div>
        <div>
          <CardTitle className="text-sm sm:text-base font-extrabold" style={{ color: agent.color }}>
            Configurar IA - Agente {agent.label}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Provider Selector */}
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Provedor</label>
            <Select 
              value={selectedProvider} 
              onValueChange={val => {
                setSelectedProvider(val);
                const prov = PROVIDERS.find(p => p.id === val);
                setSelectedModel(prov.defaultModel);
                setApiKey(savedCfg.apiKeys?.[val] || "");
              }}
            >
              <SelectTrigger className="rounded-xl border-slate-800 bg-[#0b101c] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.icon} {p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model Selection */}
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">Modelo</label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="rounded-xl border-slate-800 bg-[#0b101c] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentProviderData.models.map(m => (
                  <SelectItem key={m} value={m}>
                    {VISION_MODELS.has(m) ? '👁️ ' : '📝 '}{m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Vision capability warning */}
            {selectedModel && !VISION_MODELS.has(selectedModel) ? (
              <p className="mt-1.5 text-[11px] text-amber-400 flex items-center gap-1">
                ⚠️ Este modelo <strong>não consegue ler PDFs</strong> (sem suporte a imagem). Use um modelo com 👁️ para que a IA veja o conteúdo do PDF.
              </p>
            ) : selectedModel && VISION_MODELS.has(selectedModel) ? (
              <p className="mt-1.5 text-[11px] text-emerald-400 flex items-center gap-1">
                ✅ Este modelo suporta visão — conseguirá ler os PDFs enviados.
              </p>
            ) : null}
          </div>

          {/* API Key */}
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">API Key do Provedor</label>
            <Input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={currentProviderData.placeholder}
              className="rounded-xl border-slate-800 bg-[#0b101c] text-white"
            />
          </div>
        </div>

        {/* Save Button */}
        <Button 
          onClick={() => onSave(agent.id, selectedProvider, selectedModel, apiKey)}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-5 transition-all text-xs sm:text-sm ml-auto flex items-center gap-1.5"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Salvando...</span>
            </>
          ) : (
            "Salvar Configuração"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

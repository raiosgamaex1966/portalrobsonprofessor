import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Sparkles, BookOpen, FileText, ArrowLeft, RefreshCw, 
  Check, X, HelpCircle, MessageSquare, Send, Award, HelpCircle as CardIcon 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from '@/api/supabaseClient';
import { createPageUrl } from "@/utils";

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
      throw new Error('A requisição à IA excedeu o tempo limite. Tente novamente.');
    }
    throw error;
  }
}

async function downloadPdfBuffer(url) {
  try {
    const encodedFileName = url.includes('/') ? url.split('/').pop() : url;
    const fileName = decodeURIComponent(encodedFileName);
    const { data, error } = await supabase.storage.from('materials').download(fileName);
    if (error) throw error;
    console.log('[PDF] Downloaded via Supabase SDK:', fileName, 'size:', data.size);
    return await data.arrayBuffer();
  } catch (err) {
    console.warn('[PDF] Supabase SDK failed, trying direct fetch:', err);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Direct fetch also failed: ' + response.status);
    return await response.arrayBuffer();
  }
}

const loadPdfJsLib = () => {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = async () => {
      try {
        const workerResp = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js');
        const workerCode = await workerResp.text();
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
        console.log('[PDF] Worker local blob configured');
      } catch (e) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
      resolve(window.pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

async function renderPdfToImages(url, maxPages = 10) {
  try {
    const pdfjs = await loadPdfJsLib();
    const buffer = await downloadPdfBuffer(url);
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    const total = Math.min(pdf.numPages, maxPages);
    console.log('[PDF] Rendering', total, 'of', pdf.numPages, 'pages as images');
    const images = [];
    for (let i = 1; i <= total; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
      images.push(base64);
    }
    console.log('[PDF] Rendered', images.length, 'images successfully');
    return images;
  } catch (err) {
    console.error('[PDF] Failed to render images:', err);
    return [];
  }
}

async function getPdfBase64(url) {
  const buffer = await downloadPdfBuffer(url);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(new Blob([buffer]));
  });
}

async function callLLM({ provider, apiKey, model, messages, systemPrompt, onBytesUsed }) {
  const headers = { "Content-Type": "application/json" };
  const provFormat = provider === 'claude' ? 'anthropic' : 'openai';
  
  let endpoint = 'https://api.openai.com/v1/chat/completions';
  let headerKey = 'Authorization';
  let headerVal = `Bearer ${apiKey}`;

  if (provider === 'claude') {
    endpoint = 'https://api.anthropic.com/v1/messages';
    headerKey = 'x-api-key';
    headerVal = apiKey;
  } else if (provider === 'deepinfra') {
    endpoint = 'https://api.deepinfra.com/v1/openai/chat/completions';
  } else if (provider === 'gemini') {
    endpoint = `https://generativelanguage.googleapis.com/v1beta/chat/completions?key=${apiKey}`;
  } else if (provider === 'openrouter') {
    endpoint = 'https://openrouter.ai/api/v1/chat/completions';
  }

  headers[headerKey] = headerVal;
  if (provider === 'claude') {
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
  } else if (provider === 'openrouter') {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'Portal Robson Cordeiro';
  }

  let body;
  if (provFormat === 'anthropic') {
    body = JSON.stringify({
      model: model || 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      system: systemPrompt,
      messages: messages
    });
  } else {
    const formattedMessages = [];
    if (systemPrompt && systemPrompt.trim()) {
      formattedMessages.push({ role: "system", content: systemPrompt });
    }
    
    messages.forEach(m => {
      formattedMessages.push({
        role: m.role,
        content: m.content
      });
    });

    const hasImages = messages.some(m => Array.isArray(m.content) && m.content.some(c => c.type === 'image_url' || c.type === 'image'));
    const effectiveModel = hasImages && (model === 'gpt-4o-mini' || !model) ? 'gpt-4o' : (model || 'gpt-4o-mini');
    
    body = JSON.stringify({
      model: effectiveModel,
      max_tokens: 2000,
      messages: formattedMessages
    });
  }

  // Track bytes sent
  const reqBytes = new Blob([body]).size;
  const res = await fetchWithTimeout(endpoint, { method: "POST", headers, body });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  const data = await res.json();
  const resBytes = new Blob([JSON.stringify(data)]).size;
  if (onBytesUsed) onBytesUsed(reqBytes + resBytes);
  
  if (provFormat === 'anthropic') {
    return data.content?.map(b => b.text || "").join("") || "Sem resposta.";
  }
  return data.choices?.[0]?.message?.content || "Sem resposta.";
}


// Providers available for students to use their own key
const AI_PROVIDERS_STUDENT = [
  { id: 'openai', label: 'OpenAI (GPT)', placeholder: 'sk-proj-...', models: ['gpt-4o', 'gpt-4o-mini'] },
  { id: 'deepinfra', label: 'DeepInfra (Llama Vision)', placeholder: 'DeepInfra Token', models: ['meta-llama/Llama-3.2-11B-Vision-Instruct', 'meta-llama/Llama-3.2-90B-Vision-Instruct', 'meta-llama/Llama-3.3-70B-Instruct'] },
  { id: 'claude', label: 'Anthropic Claude', placeholder: 'sk-ant-...', models: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022'] },
  { id: 'gemini', label: 'Google Gemini', placeholder: 'Gemini API Key', models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'] },
  { id: 'openrouter', label: 'OpenRouter', placeholder: 'sk-or-v1-...', models: ['google/gemini-2.5-flash', 'google/gemini-2.0-flash-exp', 'meta-llama/llama-3.2-11b-vision-instruct:free', 'openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet'] },
];

const PRICE_PER_MB = 0.50; // R$ por MB
const BILLING_THRESHOLD = 0.01; // bloquear se devia >= R$0.01

export default function StudentAiStudyRoom() {
  const [searchParams] = useSearchParams();
  const agentId = searchParams.get('agent');
  const navigate = useNavigate();

  const [agent, setAgent] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfImages, setPdfImages] = useState([]);
  const [pdfText, setPdfText] = useState("");
  const [loadingPdfText, setLoadingPdfText] = useState(false);
  const [pdfSize, setPdfSize] = useState(0);
  const [profile, setProfile] = useState(null);

  // AI Key source management
  const [keySource, setKeySource] = useState(null); // null | 'admin' | 'own'
  const [ownApiConfig, setOwnApiConfig] = useState(null); // { provider, model, apiKey }
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [billingInfo, setBillingInfo] = useState(null); // { total_mb, amount_paid, payment_pending }
  // Setup form states
  const [setupProvider, setSetupProvider] = useState('openai');
  const [setupModel, setSetupModel] = useState('gpt-4o-mini');
  const [setupKey, setSetupKey] = useState('');
  const [setupStep, setSetupStep] = useState('choose');

  const [mode, setMode] = useState("Tutor IA"); 
  const [generating, setGenerating] = useState(false);

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const chatInputRef = useRef(null);

  const [quiz, setQuiz] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showExplanation, setShowExplanation] = useState({});
  const [numQuestions, setNumQuestions] = useState(5);
  const [currentQuizView, setCurrentQuizView] = useState(0);

  const [flashcards, setFlashcards] = useState([]);
  const [fcIdx, setFcIdx] = useState(0);
  const [fcFlip, setFcFlip] = useState(false);

  // ===== SETUP MODAL / BILLING PANEL =====
  const isAdmin = profile?.role === 'admin';
  const pdfSizeMb = pdfSize / (1024 * 1024);
  const estimatedCost = pdfSizeMb * PRICE_PER_MB;
  const creditsPurchased = billingInfo?.amount_paid || 0;
  const creditsUsed = (billingInfo?.total_mb || 0) * PRICE_PER_MB;
  const creditsBalance = creditsPurchased - creditsUsed;

  // Block only if keySource is admin, balance is insufficient, and user is NOT admin
  const isBlocked = !isAdmin && keySource === 'admin' && creditsBalance < Math.max(0.10, estimatedCost);

  useEffect(() => {
    if (!agentId) {
      navigate(createPageUrl('StudentAiAgents'));
      return;
    }
    // Restore saved key source from localStorage
    const savedSrc = localStorage.getItem(`ai_key_src_${agentId}`);
    const savedCfg = localStorage.getItem(`ai_own_cfg_${agentId}`);
    if (savedSrc === 'own' && savedCfg) {
      setKeySource('own');
      setOwnApiConfig(JSON.parse(savedCfg));
    } else if (savedSrc === 'admin') {
      setKeySource('admin');
      loadBillingInfo();
    }
    loadAgentData();
  }, [agentId]);

  useEffect(() => {
    if (isBlocked) {
      setSetupStep('payment');
    } else if (!keySource) {
      setSetupStep('choose');
    } else if (keySource === 'own') {
      setSetupStep('own-form');
    } else {
      setSetupStep('admin-info');
    }
  }, [isBlocked, keySource]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const loadAgentData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setProfile(prof);
        if (prof?.role === 'admin') {
          setKeySource('admin');
        }
      }

      const { data: agentData, error: agentErr } = await supabase
        .from('custom_agents')
        .select('*')
        .eq('id', agentId)
        .single();
      if (agentErr) throw agentErr;
      setAgent(agentData);

      const { data: configData } = await supabase
        .from('agent_configs')
        .select('*')
        .eq('agent_id', agentId)
        .single();
      
      let activeConfig = configData;
      if (!activeConfig) {
        const { data: settings } = await supabase
          .from('site_settings')
          .select('llm_provider, llm_model, llm_api_key')
          .limit(1)
          .single();
        
        if (settings?.llm_api_key) {
          activeConfig = {
            provider: settings.llm_provider,
            model: settings.llm_model,
            api_keys: { [settings.llm_provider]: settings.llm_api_key }
          };
        } else {
          const envKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_DEEPINFRA_API_KEY || import.meta.env.VITE_OPENROUTER_API_KEY;
          const provider = import.meta.env.VITE_OPENAI_API_KEY ? 'openai' : (import.meta.env.VITE_DEEPINFRA_API_KEY ? 'deepinfra' : 'openrouter');
          activeConfig = {
            provider,
            model: provider === 'openai' ? 'gpt-4o-mini' : (provider === 'deepinfra' ? 'meta-llama/Llama-3.3-70B-Instruct' : 'google/gemini-2.5-flash'),
            api_keys: { [provider]: envKey }
          };
        }
      }
      setConfig(activeConfig);

      const { data: matsData } = await supabase
        .from('agent_materials')
        .select('*')
        .eq('agent_id', agentId);
      const matsList = matsData || [];
      setMaterials(matsList);

      // Set loading false immediately so page content (header, UI) renders without waiting for PDFs
      setLoading(false);

      if (matsList.length > 0) {
        setLoadingPdfText(true);
        // Execute asynchronously
        (async () => {
          try {
            let allImages = [];
            let totalBytes = 0;
            for (const mat of matsList) {
              if (mat.file_url) {
                console.log('[PDF] Processing material:', mat.name);
                try {
                  const response = await fetch(mat.file_url, { method: 'HEAD' });
                  const size = response.headers.get('content-length');
                  if (size) {
                    totalBytes += parseInt(size, 10);
                  } else {
                    const buf = await downloadPdfBuffer(mat.file_url);
                    totalBytes += buf.byteLength;
                  }
                } catch (e) {
                  try {
                    const buf = await downloadPdfBuffer(mat.file_url);
                    totalBytes += buf.byteLength;
                  } catch (dlErr) {
                    console.warn("Failed to get file size:", dlErr);
                  }
                }
                const imgs = await renderPdfToImages(mat.file_url, 15);
                allImages = [...allImages, ...imgs];
              }
            }
            setPdfImages(allImages);
            setPdfSize(totalBytes);
            console.log('[PDF] Total images ready for AI:', allImages.length, 'Size:', totalBytes);
            if (allImages.length > 0) {
              setPdfText(`PDF com ${allImages.length} página(s) renderizada(s) como imagem`);
            }
          } catch (pdfErr) {
            console.error("Erro ao processar PDF:", pdfErr);
          } finally {
            setLoadingPdfText(false);
          }
        })();
      }

    } catch (err) {
      console.error("Erro ao carregar dados do tutor:", err);
      toast.error("Erro ao carregar configurações do Tutor.");
      setLoading(false);
    }
  };

  const getApiKey = () => {
    if (keySource === 'own' && ownApiConfig) return ownApiConfig.apiKey;
    if (!config) return null;
    return config.api_keys?.[config.provider] || '';
  };

  const getEffectiveConfig = () => {
    if (keySource === 'own' && ownApiConfig) return {
      provider: ownApiConfig.provider,
      model: ownApiConfig.model,
    };
    return config;
  };

  const loadBillingInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('ai_usage_billing')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setBillingInfo(data || { total_mb: 0, amount_paid: 0, payment_pending: false });
    } catch (e) {
      setBillingInfo({ total_mb: 0, amount_paid: 0, payment_pending: false });
    }
  };

  const trackUsage = async (bytes) => {
    if (keySource !== 'admin') return;
    const mb = bytes / (1024 * 1024);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: existing } = await supabase
        .from('ai_usage_billing')
        .select('id, total_mb, amount_paid')
        .eq('user_id', user.id)
        .single();
      if (existing) {
        const newMb = existing.total_mb + mb;
        await supabase.from('ai_usage_billing')
          .update({ total_mb: newMb, last_usage_at: new Date().toISOString() })
          .eq('user_id', user.id);
        setBillingInfo(prev => ({ ...prev, total_mb: newMb }));
      } else {
        await supabase.from('ai_usage_billing')
          .insert({ user_id: user.id, total_mb: mb, amount_paid: 0 });
        setBillingInfo({ total_mb: mb, amount_paid: 0, payment_pending: false });
      }
    } catch (e) {
      console.warn('Erro ao registrar uso:', e);
    }
  };

  const saveOwnConfig = () => {
    if (!setupKey.trim()) { toast.error('Informe a chave de API.'); return; }
    const cfg = { provider: setupProvider, model: setupModel, apiKey: setupKey.trim() };
    localStorage.setItem(`ai_own_cfg_${agentId}`, JSON.stringify(cfg));
    setOwnApiConfig(cfg);
    setKeySource('own');
    localStorage.setItem(`ai_key_src_${agentId}`, 'own');
    setShowKeySetup(false);
    toast.success('Chave salva! Usando sua IA.');
  };

  const requestPayment = async (amount = 0) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const note = amount > 0 
        ? `Solicitou recarga de R$ ${amount.toFixed(2)} em créditos via PIX em ${new Date().toLocaleString('pt-BR')}`
        : `Solicitou pagamento em ${new Date().toLocaleString('pt-BR')}`;
      await supabase.from('ai_usage_billing')
        .update({ payment_pending: true, payment_note: note })
        .eq('user_id', user.id);
      setBillingInfo(prev => ({ ...prev, payment_pending: true, payment_note: note }));
      toast.success(amount > 0 ? `Solicitação de recarga de R$ ${amount.toFixed(2)} enviada!` : 'Solicitação enviada ao administrador!');
    } catch (e) {
      toast.error('Erro ao enviar solicitação.');
    }
  };

  // Build messages with PDF images embedded for vision APIs
  const buildVisionMessages = (prev, userText) => {
    const hasImages = pdfImages.length > 0;
    const userContent = [];
    const effConfig = getEffectiveConfig();
    const activeProvider = effConfig?.provider;

    if (hasImages) {
      // Add each page image (limit to first 8 pages for OpenAI/Claude/Gemini, 1 page for others to avoid payload / multi-image API validation issues)
      const maxImgs = (activeProvider === 'openai' || activeProvider === 'claude' || activeProvider === 'gemini') ? 8 : 1;
      pdfImages.slice(0, maxImgs).forEach((imgBase64, idx) => {
        if (activeProvider === 'claude') {
          userContent.push({
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: imgBase64 }
          });
        } else {
          // OpenAI vision format (omit 'detail' to avoid 400 validation error in strict API gateways like DeepInfra)
          userContent.push({
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${imgBase64}` }
          });
        }
      });
    }

    userContent.push({ type: 'text', text: userText });

    // First message has images, subsequent ones just text
    const messages = [...prev.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : (m.content.find?.(c => c.type === 'text')?.text || '')
    })), { role: 'user', content: hasImages ? userContent : userText }];

    return messages;
  };

  const handleSendChat = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    // Must choose key source
    if (!keySource) { setShowKeySetup(true); return; }

    // Check unpaid billing for admin key (only for non-admin students)
    if (keySource === 'admin' && !isAdmin) {
      const due = ((billingInfo?.total_mb || 0) * PRICE_PER_MB) - (billingInfo?.amount_paid || 0);
      if (due >= BILLING_THRESHOLD) { toast.error('Pagamento pendente. Regularize para continuar.'); setShowKeySetup(true); return; }
    }

    const effConfig = getEffectiveConfig();
    const key = getApiKey();
    if (!key) { setShowKeySetup(true); return; }

    const txt = chatInput.trim();
    setChatInput('');
    // Focus back on the text input immediately
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 50);
    const prev = chatMessages;
    const newPrev = [...prev, { role: "user", content: txt }];
    setChatMessages(newPrev);
    setChatLoading(true);

    try {
      const messagesToSend = buildVisionMessages(prev, txt);
      const systemPromptWithRules = `${agent.system_prompt || ''}\n\nREGRAS DE FORMATAÇÃO DE PROVA: Se o usuário solicitar a criação de uma prova, teste, exame ou questionário, formate a resposta estritamente no estilo de uma folha de prova oficial impressa:\n- Comece com um cabeçalho fictício de identificação da prova (Nome do Aluno, Data, Nota, Disciplina).\n- Numere as questões de forma clara (Ex: Questão 1, Questão 2).\n- Para cada questão, liste 4 ou 5 alternativas identificadas com letras (A, B, C, D, E).\n- Deixe um espaço em branco ou linha pontilhada para preenchimento de gabarito ou assinatura.\n- Use separadores visuais limpos (linhas horizontais ou divisores em markdown).\n- Não revele o gabarito logo abaixo da questão. Coloque o gabarito de respostas oculto ou no final em uma seção separada e claramente demarcada como 'GABARITO' para que o aluno possa testar seus conhecimentos.`;
      
      const resText = await callLLM({
        provider: effConfig.provider,
        apiKey: key,
        model: effConfig.model,
        messages: messagesToSend,
        systemPrompt: systemPromptWithRules,
        onBytesUsed: (bytes) => trackUsage(bytes)
      });
      setChatMessages([...newPrev, { role: "assistant", content: resText }]);
    } catch (err) {
      console.error(err);
      setChatMessages([...newPrev, { role: "assistant", content: `Erro ao obter resposta: ${err.message || 'Erro desconhecido.'}` }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 50);
    }
  };

  const generateSimulado = async () => {
    setGenerating(true);
    setQuiz(null);
    setSelectedAnswers({});
    setShowExplanation({});

    if (!keySource) { setShowKeySetup(true); setGenerating(false); return; }
    if (keySource === 'admin' && !isAdmin) {
      const due = ((billingInfo?.total_mb || 0) * PRICE_PER_MB) - (billingInfo?.amount_paid || 0);
      if (due >= BILLING_THRESHOLD) { toast.error('Pagamento pendente.'); setShowKeySetup(true); setGenerating(false); return; }
    }

    const effConfig = getEffectiveConfig();
    const key = getApiKey();
    if (!key) { setShowKeySetup(true); setGenerating(false); return; }

    const sysPrompt = `${agent.system_prompt}\n\nMODO SIMULADO: Crie exatamente ${numQuestions} questões de múltipla escolha com 4 alternativas (A, B, C, D) baseando-se EXCLUSIVAMENTE nas páginas do PDF exibidas. Responda ESTRITAMENTE em formato JSON sem markdown. Formato:\n{"questions":[{"question":"Pergunta?","options":["Alt A","Alt B","Alt C","Alt D"],"correctIndex":0,"explanation":"Explicação detalhada"}]}`;

    try {
      const messagesToSend = buildVisionMessages([], `Analise o material PDF nas imagens e gere o simulado com ${numQuestions} questões de múltipla escolha.`);
      const resText = await callLLM({
        provider: effConfig.provider,
        apiKey: key,
        model: effConfig.model,
        messages: messagesToSend,
        systemPrompt: sysPrompt,
        onBytesUsed: (bytes) => trackUsage(bytes)
      });

      let cleanText = resText.trim();
      if (cleanText.startsWith('```')) cleanText = cleanText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleanText);
      setSelectedAnswers({});
      setShowExplanation({});
      setCurrentQuizView(0);
      setQuiz({ questions: parsed.questions || [], done: false, answers: [] });
    } catch (err) {
      console.error("Erro ao gerar simulado:", err);
      toast.error("Erro ao gerar simulado. Verifique a chave de API e tente novamente.");
    } finally {
      setGenerating(false);
    }
  };

  const exportQuizPDF = async () => {
    if (!quiz) return;
    try {
      // Get student name from auth
      const { data: { user } } = await supabase.auth.getUser();
      const studentName = user?.user_metadata?.full_name || user?.email || 'Aluno';

      // Load jsPDF dynamically
      if (!window.jspdf) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageW = 210;
      const margin = 18;
      const contentW = pageW - margin * 2;  // 174mm usable width
      const pageH = 297;
      let y = margin;

      const checkY = (needed = 20) => {
        if (y + needed > pageH - 20) {
          // Footer on current page
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(160, 160, 180);
          doc.text(studentName, margin, pageH - 10);
          doc.text(new Date().toLocaleDateString('pt-BR'), pageW - margin, pageH - 10, { align: 'right' });
          doc.addPage();
          y = margin;
        }
      };

      const score = Object.entries(selectedAnswers).filter(([qi, ai]) => quiz.questions[+qi]?.correctIndex === ai).length;
      const pct = Math.round((score / quiz.questions.length) * 100);

      // === HEADER ===
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, 36, 'F');

      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`Resultado do Simulado - ${agent?.label || 'Tutor IA'}`, margin, 13);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Aluno: ${studentName}`, margin, 21);
      doc.text(`${score} de ${quiz.questions.length} acertos (${pct}%)   |   ${new Date().toLocaleDateString('pt-BR')}`, margin, 28);

      // Score bar
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 36, pageW, 6, 'F');
      doc.setFillColor(pct >= 70 ? 16 : pct >= 50 ? 234 : 185, pct >= 70 ? 185 : pct >= 50 ? 179 : 28, pct >= 70 ? 129 : pct >= 50 ? 8 : 28);
      doc.rect(0, 36, pageW * (score / quiz.questions.length), 6, 'F');

      y = 52;

      // === QUESTIONS ===
      const letters = ['A', 'B', 'C', 'D', 'E'];

      quiz.questions.forEach((q, qi) => {
        const userAnswer = selectedAnswers[qi];
        const isCorrect = userAnswer !== undefined && userAnswer === q.correctIndex;
        const notAnswered = userAnswer === undefined;

        checkY(35);

        // Question badge
        const badgeColor = notAnswered ? [100,100,120] : isCorrect ? [16,185,129] : [185,28,28];
        doc.setFillColor(...badgeColor);
        doc.roundedRect(margin, y - 4.5, 10, 8, 1.5, 1.5, 'F');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`${qi + 1}`, margin + 3.2, y + 0.8);

        // Status label right-aligned
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        if (notAnswered) {
          doc.setTextColor(120, 120, 140);
          doc.text('[Nao respondida]', pageW - margin, y - 2, { align: 'right' });
        } else if (isCorrect) {
          doc.setTextColor(16, 185, 129);
          doc.text('[CORRETA]', pageW - margin, y - 2, { align: 'right' });
        } else {
          doc.setTextColor(185, 28, 28);
          doc.text('[INCORRETA]', pageW - margin, y - 2, { align: 'right' });
        }

        // Question text
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20, 20, 35);
        const qLines = doc.splitTextToSize(q.question, contentW - 14);
        doc.text(qLines, margin + 13, y);
        y += qLines.length * 5.8 + 4;

        // Options
        q.options.forEach((opt, oi) => {
          checkY(12);
          const isUserPick = userAnswer === oi;
          const isCorrectOpt = q.correctIndex === oi;

          let bgR = 245, bgG = 245, bgB = 250;
          let txR = 80, txG = 80, txB = 100;
          let fontStyle = 'normal';

          if (isCorrectOpt) {
            bgR = 220; bgG = 252; bgB = 231;
            txR = 21; txG = 128; txB = 61;
            fontStyle = 'bold';
          } else if (isUserPick && !isCorrectOpt) {
            bgR = 254; bgG = 226; bgB = 226;
            txR = 185; txG = 28; txB = 28;
            fontStyle = 'bold';
          }

          const optText = `${letters[oi]}) ${opt}`;
          const optLines = doc.splitTextToSize(optText, contentW - 10);
          const optH = optLines.length * 5.2 + 5;

          doc.setFillColor(bgR, bgG, bgB);
          doc.roundedRect(margin, y - 4, contentW, optH, 2, 2, 'F');
          doc.setFontSize(9);
          doc.setFont('helvetica', fontStyle);
          doc.setTextColor(txR, txG, txB);
          doc.text(optLines, margin + 3, y + 1);
          y += optH + 2;
        });

        // Verdict line
        checkY(8);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        if (!notAnswered && !isCorrect) {
          doc.setTextColor(185, 28, 28);
          const correctText = `Resposta correta: ${letters[q.correctIndex]}) ${q.options[q.correctIndex]}`;
          const vLines = doc.splitTextToSize(correctText, contentW);
          doc.text(vLines, margin, y);
          y += vLines.length * 5 + 2;
        } else if (isCorrect) {
          doc.setTextColor(16, 185, 129);
          doc.text('Resposta correta!', margin, y);
          y += 6;
        }

        // Explanation box
        if (q.explanation) {
          checkY(18);
          // Remove any emoji characters to avoid PDF corruption
          const cleanExp = q.explanation.replace(/[\u{1F000}-\u{1FFFF}]|[\u2600-\u27BF]|[\uD800-\uDFFF]/gu, '');
          const expText = `Explicacao: ${cleanExp}`;
          const expLines = doc.splitTextToSize(expText, contentW - 8);
          const expH = expLines.length * 5 + 7;

          doc.setFillColor(239, 246, 255);
          doc.setDrawColor(196, 219, 254);
          doc.roundedRect(margin, y - 4, contentW, expH, 2, 2, 'FD');
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(37, 99, 235);
          doc.text(expLines, margin + 4, y + 1.5);
          y += expH + 3;
        }

        // Divider between questions
        y += 4;
        if (qi < quiz.questions.length - 1) {
          checkY(5);
          doc.setDrawColor(210, 215, 230);
          doc.line(margin, y - 2, pageW - margin, y - 2);
          y += 4;
        }
      });

      // === LAST PAGE FOOTER ===
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 160, 180);
      doc.text(studentName, margin, pageH - 10);
      doc.text(new Date().toLocaleDateString('pt-BR'), pageW - margin, pageH - 10, { align: 'right' });

      const safeLabel = (agent?.label || 'resultado').toLowerCase().replace(/[^a-z0-9]/g, '_');
      doc.save(`simulado_${safeLabel}_${new Date().toISOString().slice(0,10)}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      toast.error('Erro ao exportar PDF. Tente novamente.');
    }
  };

  const handleQuizAnswer = (optionIdx) => {
    if (selectedAnswers[currentQuizView] !== undefined) return;
    const correct = optionIdx === quiz.questions[currentQuizView].correctIndex;
    // Show feedback immediately — do NOT auto-advance
    setSelectedAnswers(prev => ({ ...prev, [currentQuizView]: optionIdx }));
    setShowExplanation(prev => ({ ...prev, [currentQuizView]: true }));
    const allAnswered = Object.keys({ ...selectedAnswers, [currentQuizView]: optionIdx }).length === quiz.questions.length;
    if (allAnswered) {
      setQuiz(q => ({ ...q, done: true }));
    }
  };

  const generateFlashcards = async () => {
    setGenerating(true);
    setFlashcards([]);
    setFcIdx(0);
    setFcFlip(false);

    if (!keySource) { setShowKeySetup(true); setGenerating(false); return; }
    if (keySource === 'admin' && !isAdmin) {
      const due = ((billingInfo?.total_mb || 0) * PRICE_PER_MB) - (billingInfo?.amount_paid || 0);
      if (due >= BILLING_THRESHOLD) { toast.error('Pagamento pendente.'); setShowKeySetup(true); setGenerating(false); return; }
    }

    const effConfig = getEffectiveConfig();
    const key = getApiKey();
    if (!key) { setShowKeySetup(true); setGenerating(false); return; }

    const sysPrompt = `${agent.system_prompt}\n\nMODO FLASHCARDS: Crie 10 flashcards baseando-se EXCLUSIVAMENTE nas páginas do PDF exibidas. Responda ESTRITAMENTE em formato JSON sem markdown. Formato:\n{"cards":[{"front":"Pergunta/Termo","back":"Resposta/Explicação"}]}`;

    try {
      const messagesToSend = buildVisionMessages([], "Analise o material PDF e gere 10 flashcards de revisão.");
      const resText = await callLLM({
        provider: effConfig.provider,
        apiKey: key,
        model: effConfig.model,
        messages: messagesToSend,
        systemPrompt: sysPrompt,
        onBytesUsed: (bytes) => trackUsage(bytes)
      });

      let cleanText = resText.trim();
      if (cleanText.startsWith('```')) cleanText = cleanText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleanText);
      setFlashcards(parsed.cards || []);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar flashcards.");
    } finally {
      setGenerating(false);
    }
  };

  // ===== SETUP MODAL / BILLING PANEL =====

  const renderSetupModal = () => {
    const providerData = AI_PROVIDERS_STUDENT.find(p => p.id === setupProvider) || AI_PROVIDERS_STUDENT[0];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#0f1626] border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-[#0d1525] p-5 border-b border-slate-800">
            <h2 className="text-base font-extrabold text-white">
              {setupStep === 'payment' ? '💳 Saldo de Créditos' :
               setupStep === 'choose' ? '🤖 Configurar Inteligência Artificial' :
               setupStep === 'own-form' ? '🔑 Sua Chave de API' : '⚡ IA do Administrador'}
            </h2>
            {keySource && setupStep !== 'payment' && (
              <button onClick={() => setShowKeySetup(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white text-lg">✕</button>
            )}
          </div>

          <div className="p-5 space-y-4">

            {/* PREPAID CREDIT / PAYMENT REQUIRED */}
            {setupStep === 'payment' && (
              <>
                <div className="bg-rose-950/30 border border-rose-800/50 rounded-2xl p-4 text-center space-y-2">
                  <div className="text-3xl">🚫</div>
                  <p className="text-rose-300 font-bold text-sm">Créditos Insuficientes</p>
                  <p className="text-rose-400 text-xs">
                    Para usar a IA do Admin neste PDF de <strong>{pdfSizeMb.toFixed(2)} MB</strong>, o custo estimado é de <strong>R$ {estimatedCost.toFixed(2)}</strong>.
                  </p>
                </div>
                <div className="bg-slate-900 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Tamanho do PDF</span>
                    <span className="text-white font-bold">{pdfSizeMb.toFixed(2)} MB</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Seu Saldo atual</span>
                    <span className="text-emerald-400 font-bold">R$ {creditsBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Custo Estimado</span>
                    <span className="text-amber-400 font-bold">R$ {estimatedCost.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold">
                    <span className="text-white">Falta para liberar</span>
                    <span className="text-rose-400">R$ {Math.max(0, estimatedCost - creditsBalance).toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-slate-300 text-xs font-bold">Selecione um pacote de recarga:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[5, 10, 20, 50].map((val) => (
                      <button
                        key={val}
                        onClick={() => requestPayment(val)}
                        disabled={billingInfo?.payment_pending}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2 px-3 rounded-xl border border-slate-700 transition disabled:opacity-50"
                      >
                        + R$ {val.toFixed(2)}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => requestPayment(Math.max(1, estimatedCost - creditsBalance))}
                    disabled={billingInfo?.payment_pending}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-blue-400 hover:text-blue-300 font-bold text-xs py-2 px-3 rounded-xl border border-blue-500/30 transition disabled:opacity-50 mt-1"
                  >
                    Recarregar valor exato (R$ {Math.max(1, estimatedCost - creditsBalance).toFixed(2)})
                  </button>
                </div>

                <p className="text-slate-400 text-[10px] text-center mt-2 leading-relaxed">
                  Realize o pagamento via PIX e envie o comprovante. Em seguida, notifique o administrador para liberar seus créditos.
                </p>

                {billingInfo?.payment_pending ? (
                  <div className="bg-amber-950/30 border border-amber-700/50 rounded-xl p-3 text-center text-amber-400 text-xs font-bold">
                    ✅ Solicitação enviada — aguardando liberação de créditos
                  </div>
                ) : (
                  <Button onClick={() => requestPayment(Math.max(5, estimatedCost - creditsBalance))} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl py-3">
                    ✅ Já Paguei — Notificar Administrador
                  </Button>
                )}
                <button onClick={() => { setKeySource('own'); setSetupStep('own-form'); }} className="w-full text-center text-xs text-slate-500 hover:text-slate-300 mt-1">
                  Ou usar minha própria chave de IA (Grátis)
                </button>
              </>
            )}

            {/* CHOOSE SOURCE */}
            {setupStep === 'choose' && (
              <>
                <p className="text-slate-400 text-xs">Escolha como deseja usar a Inteligência Artificial neste tutor:</p>
                <button
                  onClick={() => { setSetupStep('admin-info'); }}
                  className="w-full text-left p-4 rounded-2xl border-2 border-slate-700 hover:border-blue-600 bg-slate-900/50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚡</span>
                    <div>
                      <p className="font-bold text-white text-sm">Usar IA do Administrador</p>
                      <p className="text-xs text-slate-400">Consome saldo de créditos · R$ {PRICE_PER_MB.toFixed(2)}/MB</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setSetupStep('own-form')}
                  className="w-full text-left p-4 rounded-2xl border-2 border-slate-700 hover:border-emerald-600 bg-slate-900/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔑</span>
                    <div>
                      <p className="font-bold text-white text-sm">Usar minha própria chave</p>
                      <p className="text-xs text-slate-400">Gratuito · Sua chave não é salva no servidor</p>
                    </div>
                  </div>
                </button>
              </>
            )}

            {/* ADMIN INFO */}
            {setupStep === 'admin-info' && (
              <>
                <div className="bg-blue-950/30 border border-blue-800/50 rounded-2xl p-4 space-y-2">
                  <p className="text-blue-300 font-bold text-sm">⚡ Sistema de Créditos</p>
                  <p className="text-blue-200/80 text-xs leading-relaxed">
                    O uso da IA do Administrador consome créditos do seu saldo a uma taxa de <strong>R$ {PRICE_PER_MB.toFixed(2)} por MB</strong>.
                  </p>
                </div>
                {billingInfo && (
                  <div className="bg-slate-900 rounded-xl p-3 text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-slate-400">Tamanho do PDF</span><span className="text-white">{pdfSizeMb.toFixed(2)} MB</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Custo Estimado</span><span className="text-amber-400 font-bold">R$ {estimatedCost.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Seu Saldo atual</span><span className="text-emerald-400 font-bold">R$ {creditsBalance.toFixed(2)}</span></div>
                  </div>
                )}
                
                <div className="border-t border-slate-800 pt-3 space-y-2">
                  <p className="text-slate-300 text-xs font-bold">Comprar Créditos:</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[5, 10, 20].map((val) => (
                      <button
                        key={val}
                        onClick={() => requestPayment(val)}
                        disabled={billingInfo?.payment_pending}
                        className="bg-slate-850 hover:bg-slate-850 text-white text-[11px] font-bold py-1.5 rounded-lg border border-slate-700 transition"
                      >
                        + R$ {val}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setKeySource('admin');
                    localStorage.setItem(`ai_key_src_${agentId}`, 'admin');
                    loadBillingInfo();
                    setShowKeySetup(false);
                  }}
                  disabled={isBlocked}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-3 text-xs disabled:opacity-50 mt-3"
                >
                  Usar IA do Administrador
                </Button>
                <button onClick={() => setSetupStep('choose')} className="w-full text-center text-xs text-slate-500 hover:text-slate-300">
                  ← Voltar
                </button>
              </>
            )}

            {/* OWN KEY FORM */}
            {setupStep === 'own-form' && (
              <>
                <p className="text-slate-400 text-xs">Sua chave fica salva <strong className="text-white">apenas neste dispositivo</strong> (localStorage) e nunca é enviada ao servidor.</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Provedor</label>
                    <select
                      value={setupProvider}
                      onChange={e => { setSetupProvider(e.target.value); setSetupModel(AI_PROVIDERS_STUDENT.find(p=>p.id===e.target.value)?.models[0] || ''); }}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    >
                      {AI_PROVIDERS_STUDENT.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Modelo</label>
                    <select
                      value={setupModel}
                      onChange={e => setSetupModel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    >
                      {(AI_PROVIDERS_STUDENT.find(p=>p.id===setupProvider)?.models || []).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Chave de API</label>
                    <input
                      type="password"
                      value={setupKey}
                      onChange={e => setSetupKey(e.target.value)}
                      placeholder={AI_PROVIDERS_STUDENT.find(p=>p.id===setupProvider)?.placeholder || 'sua-chave'}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600"
                    />
                  </div>
                </div>
                <Button onClick={saveOwnConfig} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl py-3">
                  💾 Salvar e usar minha IA
                </Button>
                <button onClick={() => setSetupStep('choose')} className="w-full text-center text-xs text-slate-500 hover:text-slate-300">
                  ← Voltar
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-[#f3f4f6] py-6 px-4 sm:py-8 sm:px-6 lg:px-8 flex flex-col">
      {/* Setup/Billing Modal */}
      <AnimatePresence>
        {(showKeySetup || !keySource || isBlocked) && !isAdmin && renderSetupModal()}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col space-y-6">
        
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link to={createPageUrl('StudentAiAgents')} className="inline-flex items-center gap-2 text-slate-400 hover:text-white font-bold transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Tutores
          </Link>
 
          <div className="flex flex-wrap gap-2">
            {/* AI source badge */}
            {isAdmin ? (
              <Badge className="bg-purple-500/15 border border-purple-500/30 text-purple-300 py-1.5 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5">
                🛡️ Modo Administrador
              </Badge>
            ) : keySource === 'admin' ? (
              <button onClick={() => setShowKeySetup(true)} className="bg-blue-500/10 border border-blue-500/30 text-blue-300 py-1.5 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-500/20 transition">
                ⚡ IA do Admin
                {billingInfo && <span className="text-blue-400/70">· Saldo: R$ {creditsBalance.toFixed(2)}</span>}
              </button>
            ) : keySource === 'own' ? (
              <button onClick={() => setShowKeySetup(true)} className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 py-1.5 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-500/20 transition">
                🔑 Chave Própria · {ownApiConfig?.provider}
              </button>
            ) : (
              <button onClick={() => setShowKeySetup(true)} className="bg-amber-500/10 border border-amber-500/30 text-amber-300 py-1.5 px-3 rounded-full text-xs font-semibold animate-pulse">
                ⚠️ Configurar IA
              </button>
            )}
            <Badge className="bg-slate-900 border border-slate-800 text-slate-300 py-1.5 px-3 rounded-full text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Carga: {materials.length} PDF(s)</span>
            </Badge>
            {loadingPdfText ? (
              <Badge className="bg-amber-500/10 border border-amber-500/20 text-amber-400 py-1.5 px-3 rounded-full text-xs font-semibold flex items-center gap-2">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Processando PDF...</span>
              </Badge>
            ) : pdfImages.length > 0 ? (
              <Badge className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-1.5 px-3 rounded-full text-xs font-semibold flex items-center gap-2">
                <span>✅ PDF Pronto ({pdfImages.length} página(s) visíveis pela IA)</span>
              </Badge>
            ) : materials.length > 0 && !loadingPdfText ? (
              <Badge className="bg-rose-500/10 border border-rose-500/20 text-rose-400 py-1.5 px-3 rounded-full text-xs font-semibold flex items-center gap-2">
                <span>❌ Erro ao processar PDF</span>
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Agent Info Card */}
        <div className="bg-[#0f1626] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex items-center gap-4 sm:gap-5">
          <div 
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-inner flex-shrink-0"
            style={{ background: agent.gradient }}
          >
            {agent.icon === 'cranio' ? '🧠' : agent.icon === 'torax' ? '🫁' : agent.icon === 'abdomen' ? '🫃' : '🔬'}
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100" style={{ color: agent.color }}>
              Tutor: {agent.label}
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm font-semibold">{agent.title}</p>
            {getEffectiveConfig() && (
              <p className="text-[11px] sm:text-xs text-blue-400 font-semibold mt-1 bg-blue-500/10 px-2.5 py-1 rounded-xl inline-block border border-blue-500/20">
                🤖 IA: {getEffectiveConfig().provider?.toUpperCase()} · Modelo: {getEffectiveConfig().model}
              </p>
            )}
          </div>
        </div>

        {!isAdmin && keySource === 'admin' && creditsBalance < 2.00 && (
          <div className="bg-amber-950/40 border border-amber-800/60 text-amber-300 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span>Seu saldo de créditos está baixo (<strong>R$ {creditsBalance.toFixed(2)}</strong>). Adicione créditos para continuar usando os recursos da IA do Admin.</span>
            </div>
            <button 
              onClick={() => { setShowKeySetup(true); }}
              className="bg-amber-500 text-slate-950 hover:bg-amber-400 font-extrabold px-3 py-1.5 rounded-xl transition text-[11px] uppercase tracking-wider flex-shrink-0 shadow-md animate-pulse"
            >
              Adicionar
            </button>
          </div>
        )}

        {/* Modes Selector */}
        <div className="flex border border-slate-800 bg-[#0f1626] p-1 rounded-2xl max-w-sm">
          {["Tutor IA", "Simulado", "Flashcards"].map(m => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setQuiz(null);
                setFlashcards([]);
              }}
              className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                mode === m 
                  ? 'bg-slate-800 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Main Work Workspace */}
        <div className="flex-1 flex flex-col bg-[#131b2e] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] sm:min-h-[500px]">
          
          {/* 1. TUTOR IA (CHAT) */}
          {mode === "Tutor IA" && (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-h-[350px] sm:max-h-[500px]" id="chat-container">
                {chatMessages.length === 0 && (
                  <div className="text-center py-16 px-4 max-w-md mx-auto space-y-3">
                    <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600 mx-auto mb-2 animate-bounce" />
                    <h3 className="font-extrabold text-slate-200 text-base sm:text-lg">Inicie uma Conversa</h3>
                    <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                      Pergunte sobre posicionamentos, critérios ou teorias presentes no material fornecido. O tutor responderá embasado exclusivamente no PDF.
                    </p>
                  </div>
                )}

                {chatMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user' 
                        ? 'bg-blue-600 text-white font-medium rounded-br-none shadow-md'
                        : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/60 shadow-sm'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800 border border-slate-700/60 rounded-2xl rounded-bl-none px-4 py-2.5 text-xs sm:text-sm text-slate-400 flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Tutor digitando...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input section */}
              <form onSubmit={handleSendChat} className="border-t border-slate-800 p-3 sm:p-4 bg-[#0b101c] flex gap-2 sm:gap-3">
                <Input
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder={`Pergunte ao Agente ${agent.label}...`}
                  className="flex-1 bg-slate-900 border-slate-800 text-white placeholder-slate-500 rounded-xl"
                  disabled={chatLoading}
                />
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-4 sm:px-6 transition-all"
                  disabled={chatLoading || !chatInput.trim()}
                >
                  <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </form>
            </div>
          )}

          {/* 2. SIMULADO */}
          {mode === "Simulado" && (
            <div className="flex-1 p-4 sm:p-6 flex flex-col">
              {!quiz && !generating && (
                <div className="max-w-sm mx-auto w-full space-y-6 py-8">
                  <div className="text-center space-y-2">
                    <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600 mx-auto" />
                    <h3 className="font-extrabold text-slate-200 text-base sm:text-lg">Simulado Inteligente</h3>
                    <p className="text-slate-400 text-xs sm:text-sm">
                      A IA vai ler seu PDF e elaborar questões autorais baseadas na teoria.
                    </p>
                  </div>

                  {/* Question count selector */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Número de questões</span>
                      <span className="text-lg font-extrabold text-blue-400">{numQuestions}</span>
                    </div>
                    <input
                      type="range"
                      min="5" max="15" step="1"
                      value={numQuestions}
                      onChange={e => setNumQuestions(Number(e.target.value))}
                      className="w-full h-2 rounded-full accent-blue-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-600 font-bold">
                      <span>5</span><span>10</span><span>15</span>
                    </div>
                  </div>

                  <Button onClick={generateSimulado} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-5 shadow transition-all">
                    Iniciar Simulado com {numQuestions} questões
                  </Button>
                </div>
              )}

              {generating && (
                <div className="flex flex-col items-center justify-center py-16">
                  <RefreshCw className="w-8 h-8 animate-spin text-slate-500 mb-4" />
                  <p className="text-slate-400 text-xs sm:text-sm font-semibold animate-pulse">IA formulando {numQuestions} questões...</p>
                </div>
              )}

              {quiz && (
                <div className="space-y-4 sm:space-y-5 flex-1 flex flex-col">
                  {/* Progress header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] sm:text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                        Questão {currentQuizView + 1} de {quiz.questions.length}
                      </span>
                      {/* Mini progress dots */}
                      <div className="flex gap-1">
                        {quiz.questions.map((_, qi) => {
                          const ans = selectedAnswers[qi];
                          const done = ans !== undefined;
                          const ok = done && ans === quiz.questions[qi].correctIndex;
                          return (
                            <button
                              key={qi}
                              onClick={() => setCurrentQuizView(qi)}
                              className={`w-2 h-2 rounded-full transition-all ${
                                qi === currentQuizView ? 'w-4 ' : ''
                              }${!done ? 'bg-slate-700' : ok ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {quiz.done && (
                        <>
                          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px] sm:text-xs">
                            {Object.entries(selectedAnswers).filter(([qi,ai]) => quiz.questions[+qi]?.correctIndex === ai).length}/{quiz.questions.length} acertos
                          </Badge>
                          <button
                            onClick={exportQuizPDF}
                            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl px-3 py-1.5 text-[10px] sm:text-xs font-bold transition-all"
                          >
                            <FileText className="w-3 h-3" />
                            Exportar PDF
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Question */}
                  <div className="flex-1 space-y-3 sm:space-y-4 overflow-y-auto">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentQuizView}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3 sm:space-y-4"
                      >
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-100 leading-relaxed">
                          {quiz.questions[currentQuizView].question}
                        </h3>

                        {/* Alternatives */}
                        <div className="grid grid-cols-1 gap-2 sm:gap-2.5">
                          {quiz.questions[currentQuizView].options.map((option, idx) => {
                            const answered = selectedAnswers[currentQuizView] !== undefined;
                            const isChosen = selectedAnswers[currentQuizView] === idx;
                            const isCorrect = idx === quiz.questions[currentQuizView].correctIndex;
                            const letters = ['A', 'B', 'C', 'D'];

                            let cardStyle = "border-slate-800 hover:border-blue-700/60 bg-slate-900/40 text-slate-300 cursor-pointer";
                            if (answered) {
                              if (isCorrect) {
                                cardStyle = "bg-emerald-950/30 border-emerald-700 text-emerald-200 cursor-default";
                              } else if (isChosen) {
                                cardStyle = "bg-rose-950/30 border-rose-700 text-rose-300 cursor-default";
                              } else {
                                cardStyle = "bg-slate-950/20 border-slate-900 text-slate-600 opacity-50 cursor-default";
                              }
                            }

                            return (
                              <button
                                key={idx}
                                onClick={() => handleQuizAnswer(idx)}
                                disabled={answered}
                                className={`w-full text-left p-3 sm:p-3.5 rounded-2xl border-2 font-semibold text-xs sm:text-sm transition-all flex items-center gap-3 ${cardStyle}`}
                              >
                                <span className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] font-extrabold ${
                                  answered && isCorrect ? 'bg-emerald-500 text-white' :
                                  answered && isChosen && !isCorrect ? 'bg-rose-500 text-white' :
                                  'bg-slate-800 text-slate-400'
                                }`}>{letters[idx]}</span>
                                <span className="flex-1">{option}</span>
                                {answered && isCorrect && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                                {answered && isChosen && !isCorrect && <X className="w-4 h-4 text-rose-400 flex-shrink-0" />}
                              </button>
                            );
                          })}
                        </div>

                        {/* Immediate feedback + explanation */}
                        {selectedAnswers[currentQuizView] !== undefined && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-2"
                          >
                            {/* Verdict banner */}
                            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm ${
                              selectedAnswers[currentQuizView] === quiz.questions[currentQuizView].correctIndex
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                            }`}>
                              {selectedAnswers[currentQuizView] === quiz.questions[currentQuizView].correctIndex
                                ? <><Check className="w-4 h-4" /> Resposta correta! Muito bem!</>
                                : <><X className="w-4 h-4" /> Incorreta — a correta é: <strong className="text-emerald-400 ml-1">{['A','B','C','D'][quiz.questions[currentQuizView].correctIndex]}) {quiz.questions[currentQuizView].options[quiz.questions[currentQuizView].correctIndex]}</strong></>}
                            </div>

                            {/* Explanation */}
                            <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-900/40">
                              <div className="font-bold text-blue-300 mb-1.5 flex items-center gap-1.5 text-xs">
                                <HelpCircle className="w-3.5 h-3.5" />
                                Explicação do Tutor
                              </div>
                              <p className="text-blue-200 text-xs sm:text-sm leading-relaxed">{quiz.questions[currentQuizView].explanation}</p>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Navigation controls */}
                  <div className="flex justify-between items-center border-t border-slate-800 pt-4 mt-auto gap-2">
                    <Button
                      disabled={currentQuizView === 0}
                      onClick={() => setCurrentQuizView(v => v - 1)}
                      className="rounded-xl font-bold h-9 sm:h-10 text-xs sm:text-sm bg-slate-700 hover:bg-slate-600 text-white border-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ← Anterior
                    </Button>

                    <div className="flex gap-2">
                      {quiz.done && (
                        <Button
                          onClick={generateSimulado}
                          className="rounded-xl font-bold bg-slate-700 hover:bg-slate-600 text-white border-0 h-9 sm:h-10 text-xs sm:text-sm px-4"
                        >
                          Refazer
                        </Button>
                      )}
                      <Button
                        disabled={currentQuizView === quiz.questions.length - 1}
                        onClick={() => setCurrentQuizView(v => v + 1)}
                        className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold h-9 sm:h-10 text-xs sm:text-sm px-5"
                      >
                        Próxima →
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. FLASHCARDS */}
          {mode === "Flashcards" && (
            <div className="flex-1 p-4 sm:p-6 flex flex-col justify-center">
              {flashcards.length === 0 && !generating && (
                <div className="text-center py-12 max-w-sm mx-auto space-y-4">
                  <Brain className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600 mx-auto" />
                  <h3 className="font-extrabold text-slate-200 text-base sm:text-lg">Revisão por Flashcards</h3>
                  <p className="text-slate-400 text-xs sm:text-sm">
                    Exercite a memória ativa respondendo perguntas baseadas no PDF.
                  </p>
                  <Button onClick={generateFlashcards} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-5 shadow transition-all">
                    Gerar 10 Flashcards
                  </Button>
                </div>
              )}

              {generating && (
                <div className="flex flex-col items-center justify-center py-16">
                  <RefreshCw className="w-8 h-8 animate-spin text-slate-500 mb-4" />
                  <p className="text-slate-400 text-xs sm:text-sm font-semibold">Montando cartões de memória...</p>
                </div>
              )}

              {flashcards.length > 0 && (
                <div className="space-y-4 sm:space-y-6 flex-1 flex flex-col">
                  {/* Progress header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-[10px] sm:text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                      Card {fcIdx + 1} de {flashcards.length}
                    </span>
                    <Badge variant="outline" className="border-slate-800 text-[9px] sm:text-[10px] font-semibold text-slate-400">
                      Toque para revelar
                    </Badge>
                  </div>

                  {/* 3D Card wrapper */}
                  <div className="flex-1 flex items-center justify-center py-6">
                    <div 
                      onClick={() => setFcFlip(!fcFlip)}
                      className="w-full max-w-md h-52 sm:h-60 relative cursor-pointer select-none"
                      style={{ perspective: '1000px' }}
                    >
                      <motion.div 
                        animate={{ rotateY: fcFlip ? 180 : 0 }}
                        transition={{ duration: 0.35, ease: "easeInOut" }}
                        className="w-full h-full absolute rounded-3xl border border-slate-800 shadow-xl flex items-center justify-center p-6 text-center"
                        style={{ transformStyle: 'preserve-3d' }}
                      >
                        {/* Front Side */}
                        <div 
                          className="absolute inset-0 bg-[#17223b] rounded-3xl flex flex-col items-center justify-center p-4 sm:p-6"
                          style={{ backfaceVisibility: 'hidden' }}
                        >
                          <div className="w-9 h-9 rounded-xl bg-slate-900/50 flex items-center justify-center text-slate-500 mb-3 sm:mb-4">
                            <CardIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <h4 className="text-sm sm:text-base font-extrabold text-slate-100 leading-snug">
                            {flashcards[fcIdx].front}
                          </h4>
                          <span className="text-slate-500 text-[10px] font-bold mt-4 uppercase tracking-widest">Revelar resposta</span>
                        </div>

                        {/* Back Side */}
                        <div 
                          className="absolute inset-0 bg-[#090d16] rounded-3xl flex flex-col items-center justify-center p-4 sm:p-6 text-white border border-slate-850"
                          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                        >
                          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-3 sm:mb-4">
                            <Award className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <p className="text-xs sm:text-sm font-semibold leading-relaxed text-slate-200">
                            {flashcards[fcIdx].back}
                          </p>
                          <span className="text-slate-500 text-[10px] font-bold mt-4 uppercase tracking-widest">Ver pergunta</span>
                        </div>

                      </motion.div>
                    </div>
                  </div>

                  {/* Nav Controls */}
                  <div className="flex justify-between items-center border-t border-slate-800 pt-4 mt-auto">
                    <Button 
                      variant="outline"
                      disabled={fcIdx === 0}
                      onClick={() => {
                        setFcIdx(fcIdx - 1);
                        setFcFlip(false);
                      }}
                      className="rounded-xl font-bold border-slate-800 text-slate-300 hover:bg-slate-850 h-9 sm:h-10 text-xs sm:text-sm"
                    >
                      Voltar
                    </Button>

                    <Button 
                      variant="outline"
                      onClick={() => {
                        generateFlashcards();
                      }}
                      className="rounded-xl font-bold border-slate-800 text-slate-300 hover:bg-slate-850 h-9 sm:h-10 text-xs sm:text-sm"
                    >
                      Reiniciar
                    </Button>

                    <Button 
                      disabled={fcIdx === flashcards.length - 1}
                      onClick={() => {
                        setFcIdx(fcIdx + 1);
                        setFcFlip(false);
                      }}
                      className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold h-9 sm:h-10 text-xs sm:text-sm px-5"
                    >
                      Avançar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

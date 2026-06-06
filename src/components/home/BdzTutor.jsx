import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, Lightbulb } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/api/supabaseClient';

// ─── Funções de chamada para cada provedor ────────────────────────────────────

async function callOpenAI({ apiKey, model, messages }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages,
      max_tokens: 800,
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    let details = '';
    try {
      const err = await res.json();
      details = err.error?.message || JSON.stringify(err);
    } catch (_) {}
    throw new Error(`OpenAI error ${res.status}: ${details || res.statusText}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callDeepInfra({ apiKey, model, messages }) {
  const res = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'meta-llama/Llama-3.3-70B-Instruct',
      messages,
      max_tokens: 800,
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    let details = '';
    try {
      const err = await res.json();
      details = err.error?.message || JSON.stringify(err);
    } catch (_) {}
    throw new Error(`DeepInfra error ${res.status}: ${details || res.statusText}`);
  }
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
    generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
  };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  if (!res.ok) {
    let details = '';
    try {
      const err = await res.json();
      details = err.error?.message || JSON.stringify(err);
    } catch (_) {}
    throw new Error(`Gemini error ${res.status}: ${details || res.statusText}`);
  }
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

async function callClaude({ apiKey, model, messages }) {
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: model || 'claude-3-5-haiku-20241022',
      max_tokens: 800,
      system: systemMsg?.content || '',
      messages: chatMessages,
    }),
  });
  if (!res.ok) {
    let details = '';
    try {
      const err = await res.json();
      details = err.error?.message || JSON.stringify(err);
    } catch (_) {}
    throw new Error(`Claude error ${res.status}: ${details || res.statusText}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

async function callKimi({ apiKey, model, messages }) {
  const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
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
  if (!res.ok) {
    let details = '';
    try {
      const err = await res.json();
      details = err.error?.message || JSON.stringify(err);
    } catch (_) {}
    throw new Error(`Kimi error ${res.status}: ${details || res.statusText}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callGroq({ apiKey, model, messages }) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 800,
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    let details = '';
    try {
      const err = await res.json();
      details = err.error?.message || JSON.stringify(err);
    } catch (_) {}
    throw new Error(`Groq error ${res.status}: ${details || res.statusText}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

// ─── Dispatcher principal ─────────────────────────────────────────────────────

async function callLLM({ provider, apiKey, model, systemPrompt, history, userMessage }) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
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
      throw new Error(`Provedor "${provider}" não configurado. Configure a IA em Admin → Configurações do Site.`);
  }
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function BdzTutor({ isEnabled = true, greeting, llmSettings }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedSettings, setResolvedSettings] = useState(null);
  const messagesContainerRef = useRef(null);

  // Busca as configurações LLM diretamente do Supabase (com fallback para .env)
  useEffect(() => {
    async function fetchLLMSettings() {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('llm_provider, llm_model, llm_api_key, bdz_tutor_enabled, bdz_tutor_greeting')
          .limit(1)
          .single();

        if (data?.llm_api_key) {
          setResolvedSettings(data);
          return;
        }
      } catch (_) { /* ignora erros de fetch */ }

      // Fallback: tenta usar as variáveis de ambiente do .env
      const envKey = import.meta.env.VITE_DEEPINFRA_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;
      if (envKey) {
        const provider = import.meta.env.VITE_DEEPINFRA_API_KEY ? 'deepinfra' : 'openai';
        setResolvedSettings({
          llm_provider: provider,
          llm_model: provider === 'deepinfra' ? 'meta-llama/Llama-3.3-70B-Instruct' : 'gpt-4o-mini',
          llm_api_key: envKey,
        });
        return;
      }

      // Fallback final: usa as props passadas pelo pai
      if (llmSettings?.llm_api_key) {
        setResolvedSettings(llmSettings);
      }
    }
    fetchLLMSettings();
  }, [llmSettings]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (isEnabled && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: greeting || "Olá! Sou o **RCS Tutor**, seu assistente de estudos. 🎓\n\nNão vou te dar respostas prontas - meu papel é te ajudar a **pensar** e **construir** seu próprio conhecimento.\n\nQual assunto você gostaria de explorar hoje?"
      }]);
    }
  }, [isEnabled, greeting]);

  const systemPrompt = `Você é o RCS Tutor, um assistente educacional socrático do Portal do Professor Robson Cordeiro.

REGRAS FUNDAMENTAIS:
1. NUNCA dê respostas diretas ou prontas
2. SEMPRE faça perguntas que estimulem o pensamento crítico
3. Guie o aluno através de questionamentos para que ele construa sua própria resposta
4. Use o método socrático: perguntas orientadoras, não respostas
5. Quando o aluno acertar parcialmente, reconheça e aprofunde com mais perguntas
6. Seja encorajador e paciente
7. Use analogias e exemplos do cotidiano para facilitar a compreensão
8. Divida problemas complexos em partes menores através de perguntas

FORMATO:
- Seja amigável e use emojis ocasionalmente
- Faça 1-2 perguntas por vez, não sobrecarregue
- Reconheça o esforço do aluno
- Se o aluno pedir a resposta direta, explique gentilmente que seu papel é ajudá-lo a pensar`;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const history = messages.map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const settings = resolvedSettings;
      const provider = settings?.llm_provider;
      const apiKey = settings?.llm_api_key;
      const model = settings?.llm_model;

      if (!provider || provider === 'base44' || !apiKey) {
        throw new Error('configure_llm');
      }

      const content = await callLLM({ provider, apiKey, model, systemPrompt, history, userMessage });
      setMessages(prev => [...prev, { role: 'assistant', content }]);
    } catch (error) {
      let errorMsg = 'Desculpe, ocorreu um erro. Pode tentar novamente?';
      if (error.message === 'configure_llm') {
        errorMsg = '⚙️ O RCS Tutor precisa ser configurado. Acesse **Admin → Configurações do Site** e insira um provedor de IA com sua chave de API.';
      } else {
        errorMsg = `❌ Erro na requisição da IA:\n\n${error.message || error}`;
        console.error('RCS Tutor error:', error);
      }
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isEnabled) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl p-12 text-center"
      >
        <Bot className="w-16 h-16 mx-auto text-slate-400 mb-4" />
        <h3 className="text-xl font-semibold text-slate-600">RCS Tutor Temporariamente Indisponível</h3>
        <p className="text-slate-500 mt-2">O assistente de estudos está em manutenção. Volte em breve!</p>
      </motion.div>
    );
  }

  const isUsingChat = messages.length > 1;

  return (
    <div className={`${isUsingChat ? 'max-w-3xl mx-auto' : 'grid lg:grid-cols-2 gap-8 items-center'}`}>
      {/* Imagem do Robô */}
      {!isUsingChat && (
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden lg:flex items-center justify-center"
        >
          <img
            src="https://media.base44.com/images/public/6a0d80dad9912f00febb90bc/67f6eb953_generated_image.png"
            alt="RCS Tutor"
            className="w-full max-w-md object-contain"
          />
        </motion.div>
      )}

      {/* Chat Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src="https://media.base44.com/images/public/6a0d80dad9912f00febb90bc/67f6eb953_generated_image.png"
                alt="RCS Tutor"
                className="w-16 h-16 object-contain"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                RCS Tutor
                <Sparkles className="w-5 h-5 text-[#d4a853]" />
              </h2>
              <p className="text-blue-200 text-sm">Seu guia de aprendizado socrático</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="h-[400px] overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-50 to-white">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f]'
                    : 'bg-gradient-to-br from-[#d4a853] to-[#f0c674]'
                }`}>
                  {message.role === 'user'
                    ? <User className="w-5 h-5 text-white" />
                    : <Lightbulb className="w-5 h-5 text-[#1e3a5f]" />
                  }
                </div>
                <div className={`max-w-[80%] p-4 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-[#1e3a5f] text-white rounded-tr-sm'
                    : 'bg-white border border-slate-200 shadow-sm rounded-tl-sm'
                }`}>
                  <ReactMarkdown className={`prose prose-sm max-w-none ${message.role === 'user' ? 'prose-invert' : ''}`}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4a853] to-[#f0c674] flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-[#1e3a5f]" />
              </div>
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl rounded-tl-sm p-4">
                <div className="flex gap-1">
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 bg-[#d4a853] rounded-full" />
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-[#d4a853] rounded-full" />
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-[#d4a853] rounded-full" />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua dúvida ou reflexão..."
              className="min-h-[50px] max-h-[120px] resize-none rounded-xl border-slate-200 focus:border-[#d4a853] focus:ring-[#d4a853]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="h-auto px-6 rounded-xl bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] hover:from-[#2d4a6f] hover:to-[#3d5a7f] transition-all duration-300"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
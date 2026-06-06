import React from 'react';
import { Cpu, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const PROVIDERS = [
  { value: 'base44', label: '🔧 Base44 (padrão, sem chave)', models: [] },
  {
    value: 'openai', label: '🟢 OpenAI',
    docsUrl: 'https://platform.openai.com/api-keys',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo']
  },
  {
    value: 'gemini', label: '🔵 Google Gemini',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-lite']
  },
  {
    value: 'claude', label: '🟠 Anthropic Claude',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    models: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-opus-4-5']
  },
  {
    value: 'deepinfra', label: '⚡ DeepInfra',
    docsUrl: 'https://deepinfra.com/dash/api_keys',
    models: [
      'meta-llama/Llama-3.3-70B-Instruct',
      'meta-llama/Meta-Llama-3-8B-Instruct',
      'mistralai/Mistral-7B-Instruct-v0.3',
      'microsoft/WizardLM-2-8x22B',
      'google/gemma-2-27b-it',
      'Qwen/Qwen2.5-72B-Instruct'
    ]
  },
  {
    value: 'groq', label: '🟣 Groq',
    docsUrl: 'https://console.groq.com/keys',
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it'
    ]
  },
  {
    value: 'kimi', label: '🌙 Kimi (Moonshot)',
    docsUrl: 'https://platform.moonshot.cn/console/api-keys',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k']
  }
];

export default function LlmSettingsCard({ settings, setSettings, showApiKey, setShowApiKey }) {
  const selectedProvider = PROVIDERS.find(p => p.value === settings.llm_provider) || PROVIDERS[0];
  const needsKey = settings.llm_provider !== 'base44';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="w-5 h-5" />
          Configuração de LLM — RCS Tutor
        </CardTitle>
        <CardDescription>Escolha o provedor e modelo de inteligência artificial usado pelo tutor</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider */}
        <div>
          <Label>Provedor de IA</Label>
          <Select
            value={settings.llm_provider || 'base44'}
            onValueChange={(val) => {
              const provider = PROVIDERS.find(p => p.value === val);
              const defaultModel = provider?.models?.[0] || '';
              setSettings({ ...settings, llm_provider: val, llm_model: defaultModel });
            }}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecione o provedor" />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model */}
        {needsKey && selectedProvider.models.length > 0 && (
          <div>
            <Label>Modelo</Label>
            <Select
              value={settings.llm_model || ''}
              onValueChange={(val) => setSettings({ ...settings, llm_model: val })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione o modelo" />
              </SelectTrigger>
              <SelectContent>
                {selectedProvider.models.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* API Key */}
        {needsKey && (
          <div>
            <div className="flex items-center justify-between">
              <Label>Chave de API ({selectedProvider.label})</Label>
              {selectedProvider.docsUrl && (
                <a
                  href={selectedProvider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Obter chave
                </a>
              )}
            </div>
            <div className="flex gap-2 mt-1">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={settings.llm_api_key || ''}
                onChange={(e) => setSettings({ ...settings, llm_api_key: e.target.value })}
                placeholder="sk-..."
                className="flex-1 font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              A chave é armazenada de forma segura e usada apenas pelo RCS Tutor no servidor.
            </p>
          </div>
        )}

        {/* Status info */}
        <div className={`p-3 rounded-lg text-sm ${needsKey && settings.llm_api_key ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
          {!needsKey && (
            <span>✅ Usando <strong>Base44 padrão (GPT-4o-mini)</strong> — sem custo adicional de API.</span>
          )}
          {needsKey && !settings.llm_api_key && (
            <span>⚠️ Insira a chave de API para ativar o provedor <strong>{selectedProvider.label}</strong>. Sem chave, será usado o Base44 padrão.</span>
          )}
          {needsKey && settings.llm_api_key && (
            <span>✅ <strong>{selectedProvider.label}</strong> configurado — modelo: <strong>{settings.llm_model || 'padrão'}</strong>.</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { Settings, ArrowLeft, Save, Globe, Palette, Bot, CheckCircle, Cpu, Eye, EyeOff } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import LlmSettingsCard from "../components/admin/LlmSettingsCard";

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    site_name: 'Portal do Professor Robson Cordeiro',
    welcome_message: '',
    bdz_tutor_enabled: true,
    bdz_tutor_greeting: '',
    primary_color: '#1e3a5f',
    accent_color: '#d4a853',
    llm_provider: 'base44',
    llm_model: '',
    llm_api_key: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

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

    loadSettings();
  };

  const loadSettings = async () => {
    try {
      const data = await base44.entities.SiteSettings.list();
      if (data.length > 0) {
        setSettings(data[0]);
      } else {
        // Se não houver configurações no banco, tenta carregar do localStorage (legado de teste)
        const localSettings = localStorage.getItem('site_settings');
        if (localSettings) {
          setSettings(JSON.parse(localSettings));
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const existingSettings = await base44.entities.SiteSettings.list();
      
      if (existingSettings.length > 0) {
        await base44.entities.SiteSettings.update(existingSettings[0].id, settings);
      } else {
        await base44.entities.SiteSettings.create(settings);
      }
      
      // Também salva no localStorage para redundância durante a migração
      localStorage.setItem('site_settings', JSON.stringify(settings));
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações no banco de dados. Tentando salvar localmente...');
      localStorage.setItem('site_settings', JSON.stringify(settings));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-8 px-6">
        <div className="max-w-4xl mx-auto">
          <Link to={createPageUrl('Admin')} className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Painel
          </Link>
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Configurações do Site</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Configurações Gerais
              </CardTitle>
              <CardDescription>Informações básicas do site</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="site_name">Nome do Site</Label>
                <Input
                  id="site_name"
                  value={settings.site_name}
                  onChange={(e) => setSettings({...settings, site_name: e.target.value})}
                  placeholder="Portal do Professor Robson Cordeiro"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="welcome_message">Mensagem de Boas-Vindas</Label>
                <Textarea
                  id="welcome_message"
                  value={settings.welcome_message || ''}
                  onChange={(e) => setSettings({...settings, welcome_message: e.target.value})}
                  placeholder="Mensagem opcional que aparece na home"
                  className="mt-1"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Bdz Tutor Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Configurações do RCS Tutor
              </CardTitle>
              <CardDescription>Controle o assistente de IA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label htmlFor="bdz_enabled" className="text-base font-semibold">
                    Habilitar RCS Tutor
                  </Label>
                  <p className="text-sm text-slate-500 mt-1">
                    {settings.bdz_tutor_enabled 
                      ? 'O RCS Tutor está ativo para os alunos' 
                      : 'O RCS Tutor está desativado'}
                  </p>
                </div>
                <Switch
                  id="bdz_enabled"
                  checked={settings.bdz_tutor_enabled}
                  onCheckedChange={(checked) => setSettings({...settings, bdz_tutor_enabled: checked})}
                />
              </div>
              <div>
                <Label htmlFor="bdz_greeting">Mensagem Inicial do RCS Tutor</Label>
                <Textarea
                  id="bdz_greeting"
                  value={settings.bdz_tutor_greeting || ''}
                  onChange={(e) => setSettings({...settings, bdz_tutor_greeting: e.target.value})}
                  placeholder="Deixe em branco para usar a mensagem padrão"
                  className="mt-1"
                  rows={4}
                />
                <p className="text-sm text-slate-500 mt-2">
                Esta mensagem será exibida quando os alunos iniciarem uma conversa com o RCS Tutor.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* LLM Settings */}
          <LlmSettingsCard settings={settings} setSettings={setSettings} showApiKey={showApiKey} setShowApiKey={setShowApiKey} />

          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Personalização Visual
              </CardTitle>
              <CardDescription>Cores do tema do site</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary_color">Cor Primária</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="primary_color"
                      type="color"
                      value={settings.primary_color}
                      onChange={(e) => setSettings({...settings, primary_color: e.target.value})}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.primary_color}
                      onChange={(e) => setSettings({...settings, primary_color: e.target.value})}
                      placeholder="#1e3a5f"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="accent_color">Cor de Destaque</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="accent_color"
                      type="color"
                      value={settings.accent_color}
                      onChange={(e) => setSettings({...settings, accent_color: e.target.value})}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.accent_color}
                      onChange={(e) => setSettings({...settings, accent_color: e.target.value})}
                      placeholder="#d4a853"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-2">Preview:</p>
                <div className="flex gap-2">
                  <div 
                    className="w-16 h-16 rounded-lg shadow-md"
                    style={{ backgroundColor: settings.primary_color }}
                  />
                  <div 
                    className="w-16 h-16 rounded-lg shadow-md"
                    style={{ backgroundColor: settings.accent_color }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              size="lg"
              className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] hover:from-[#2d4a6f] hover:to-[#3d5a7f]"
            >
              {saving ? (
                <>Salvando...</>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { Shield, Mail, User, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function AdminSetup() {
  const [loading, setLoading] = useState(true);
  const [hasAdmin, setHasAdmin] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });

  useEffect(() => {
    checkAdminExists();
  }, []);

  const checkAdminExists = async () => {
    try {
      const users = await base44.entities.User.filter({ role: 'admin' });
      setHasAdmin(users.length > 0);
    } catch (error) {
      console.error('Error checking admin:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteAdmin = async () => {
    if (!formData.email.trim() || !formData.name.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Email inválido');
      return;
    }

    setInviting(true);
    try {
      await base44.users.inviteUser(formData.email, 'admin');
      setSuccess(true);
      toast.success('Modo Local: Convite simulado com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar convite: ' + (error.message || 'Tente novamente'));
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Se já tem admin ou se estamos no modo local e o usuário quer pular essa tela
  if ((hasAdmin || import.meta.env.VITE_ENABLE_TEST_AUTH === 'true') && !success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Sistema Pronto
            </h2>
            <p className="text-slate-600 mb-6">
              O administrador principal (robsoncordeiro1966@gmail.com) já está configurado no modo de teste.
            </p>
            <Button
              onClick={() => window.location.href = '/'}
              className="w-full bg-[#1e3a5f] hover:bg-[#2d4a6f]"
            >
              <Lock className="w-4 h-4 mr-2" />
              Acessar Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Convite Enviado!
              </h2>
              <p className="text-slate-600 mb-4">
                Um email foi enviado para <strong>{formData.email}</strong> com instruções para criar a senha e acessar o painel administrativo.
              </p>
              <Alert className="mb-6 text-left">
                <Mail className="w-4 h-4" />
                <AlertDescription>
                  Verifique a caixa de entrada e também a pasta de spam. O link do convite é válido por 24 horas.
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => window.location.href = createPageUrl('Home')}
                className="w-full bg-[#1e3a5f] hover:bg-[#2d4a6f]"
              >
                Ir para Home
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl">
          <CardHeader className="space-y-1 pb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#d4a853] to-[#f0c674] flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-[#1e3a5f]" />
            </div>
            <CardTitle className="text-2xl text-center">
              Configuração Inicial
            </CardTitle>
            <CardDescription className="text-center">
              Configure o primeiro administrador do portal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Esta é a configuração inicial do sistema. Um email será enviado com o link para criar a senha de acesso.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4" />
                  Nome Completo do Administrador
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Jorge Baldez"
                  className="h-11"
                />
              </div>

              <div>
                <Label htmlFor="email" className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4" />
                  Email do Administrador
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="jorge@escola.com"
                  className="h-11"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Um convite será enviado para este email
                </p>
              </div>
            </div>

            <Button
              onClick={handleInviteAdmin}
              disabled={inviting}
              className="w-full h-11 bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] hover:from-[#2d4a6f] hover:to-[#3d5a7f] text-base"
            >
              {inviting ? (
                <>Enviando Convite...</>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  Enviar Convite de Administrador
                </>
              )}
            </Button>

            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 text-center">
                Após criar a senha, você poderá acessar o painel administrativo com este email e senha.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <a
            href={createPageUrl('Home')}
            className="text-sm text-white/80 hover:text-white transition-colors"
          >
            ← Voltar para página inicial
          </a>
        </div>
      </motion.div>
    </div>
  );
}
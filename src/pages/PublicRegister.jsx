import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { GraduationCap, CheckCircle, Mail } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";

export default function PublicRegister() {
  const [step, setStep] = useState('form');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    registration_number: '',
    phone: '',
    birth_date: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        navigate(createPageUrl('Home'));
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await base44.entities.PendingStudent.create({
        full_name: formData.full_name,
        email: formData.email,
        registration_number: formData.registration_number,
        phone: formData.phone,
        birth_date: formData.birth_date || null,
        status: 'pending'
      });

      setStep('success');
    } catch (error) {
      console.error('Error submitting registration:', error);
      alert('Erro ao enviar cadastro. Verifique se o email já não está cadastrado.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="text-center">
            <CardContent className="p-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Cadastro Realizado!
              </h2>
              <p className="text-slate-600 mb-6">
                Seu cadastro foi enviado com sucesso! O administrador irá revisar suas informações e enviar um convite de acesso para o email cadastrado.
              </p>
              <Button 
                onClick={() => navigate(createPageUrl('Home'))}
                className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
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
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#1e3a5f] mb-2">
              Cadastro de Aluno
            </h1>
            <p className="text-slate-600">
              Preencha seus dados para criar sua conta no portal
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Informações de Cadastro</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Nome Completo *</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    required
                    placeholder="Seu nome completo"
                  />
                </div>

                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                    placeholder="seu@email.com"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Você receberá um convite neste email após aprovação
                  </p>
                </div>

                <div className="border-t pt-4 mt-4">
                  <p className="text-sm text-slate-600 mb-3">Informações Adicionais</p>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Número de Matrícula</Label>
                      <Input
                        value={formData.registration_number}
                        onChange={(e) => setFormData({...formData, registration_number: e.target.value})}
                        placeholder="Ex: 2024001"
                      />
                    </div>

                    <div>
                      <Label>Telefone</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="(00) 00000-0000"
                      />
                    </div>

                    <div>
                      <Label>Data de Nascimento</Label>
                      <Input
                        type="date"
                        value={formData.birth_date}
                        onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">
                      Após o cadastro, seu perfil será enviado para aprovação do administrador. 
                      Você receberá acesso ao portal assim que for aprovado.
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1e3a5f] hover:bg-[#2d4a6f]"
                >
                  {loading ? 'Criando conta...' : 'Criar Conta'}
                </Button>

                <div className="text-center text-sm text-slate-600">
                  Já tem uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => base44.auth.redirectToLogin()}
                    className="text-[#1e3a5f] hover:underline font-medium"
                  >
                    Fazer login
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
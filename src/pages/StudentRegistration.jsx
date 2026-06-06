import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { GraduationCap, CheckCircle, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function StudentRegistration() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    registration_number: '',
    phone: '',
    birth_date: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        base44.auth.redirectToLogin(createPageUrl('StudentRegistration'));
        return;
      }

      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const profiles = await base44.entities.StudentProfile.filter({ user_id: currentUser.id });
      if (profiles.length > 0) {
        setProfile(profiles[0]);
        setFormData({
          full_name: profiles[0].full_name || '',
          registration_number: profiles[0].registration_number || '',
          phone: profiles[0].phone || '',
          birth_date: profiles[0].birth_date || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        user_id: user.id,
        ...formData,
        birth_date: formData.birth_date || null,
        is_approved: false
      };

      if (profile) {
        await base44.entities.StudentProfile.update(profile.id, data);
        toast.success('Perfil atualizado com sucesso!');
      } else {
        await base44.entities.StudentProfile.create(data);
        toast.success('Perfil de aluno cadastrado com sucesso!');
      }

      navigate(createPageUrl('Home'));
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Erro ao salvar perfil: ' + (error.message || 'Erro desconhecido'));
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
              {profile ? 'Meu Perfil de Aluno' : 'Cadastro de Aluno'}
            </h1>
            <p className="text-slate-600">
              {profile && profile.is_approved ? (
                <span className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Perfil aprovado pelo administrador
                </span>
              ) : profile ? (
                'Aguardando aprovação do administrador'
              ) : (
                'Preencha seus dados para se cadastrar como aluno'
              )}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Informações do Aluno</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input value={user?.email} disabled className="bg-slate-100" />
                </div>

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

                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-[#1e3a5f] hover:bg-[#2d4a6f]"
                >
                  {saving ? 'Salvando...' : profile ? 'Atualizar Perfil' : 'Cadastrar'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, Users, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";

export default function AdminStudentProfiles() {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        base44.auth.redirectToLogin();
        return;
      }

      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (currentUser?.role !== 'admin') return;

      const allProfiles = await base44.entities.StudentProfile.list('-created_date');
      setProfiles(allProfiles);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (profileId) => {
    try {
      await base44.entities.StudentProfile.update(profileId, { is_approved: true });
      loadData();
    } catch (error) {
      console.error('Error approving profile:', error);
    }
  };

  const handleReject = async (profileId) => {
    if (confirm('Deseja realmente rejeitar este perfil?')) {
      try {
        await base44.entities.StudentProfile.update(profileId, { is_approved: false });
        loadData();
      } catch (error) {
        console.error('Error rejecting profile:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-slate-600">Acesso restrito a administradores.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <Link to={createPageUrl('Admin')} className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Painel
          </Link>
          <h1 className="text-3xl font-bold mb-2">Perfis de Alunos</h1>
          <p className="text-blue-200">Aprovar e gerenciar cadastros de alunos</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {profiles.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile, index) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{profile.full_name}</CardTitle>
                      <Badge className={profile.is_approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                        {profile.is_approved ? 'Aprovado' : 'Pendente'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {profile.registration_number && (
                      <p className="text-sm text-slate-600 mb-2">Matrícula: {profile.registration_number}</p>
                    )}
                    {profile.phone && (
                      <p className="text-sm text-slate-600 mb-2">Tel: {profile.phone}</p>
                    )}
                    {profile.birth_date && (
                      <p className="text-sm text-slate-600 mb-4">
                        Nascimento: {(() => {
                          const parts = profile.birth_date.split('-');
                          if (parts.length === 3) {
                            return `${parts[2]}/${parts[1]}/${parts[0]}`;
                          }
                          return new Date(profile.birth_date).toLocaleDateString('pt-BR');
                        })()}
                      </p>
                    )}

                    {!profile.is_approved ? (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApprove(profile.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Aprovar
                        </Button>
                        <Button
                          onClick={() => handleReject(profile.id)}
                          variant="outline"
                          className="flex-1"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Rejeitar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleReject(profile.id)}
                        variant="outline"
                        className="w-full"
                      >
                        Remover Aprovação
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Nenhum perfil de aluno cadastrado ainda.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
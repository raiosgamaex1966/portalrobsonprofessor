import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, Users, Mail, UserPlus, Clock, AlertCircle, ArrowLeft, Shield, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminPendingStudents() {
  const [user, setUser] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedRole, setSelectedRole] = useState({});
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successData, setSuccessData] = useState({ email: '', password: '', fullName: '', alreadyRegistered: false });

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

      const students = await base44.entities.PendingStudent.list('-created_date');
      setAllStudents(students);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredStudents = (status) => {
    return allStudents.filter(s => s.status === status);
  };

  const handleApprove = async (student) => {
    setProcessing(student.id);
    try {
      const role = selectedRole[student.id] || 'aluno';
      
      // Verifica se o usuário já existe
      const existingUsers = await base44.entities.User.filter({ email: student.email });
      
      let tempPassword = null;
      let alreadyRegistered = existingUsers.length > 0;
      
      if (!alreadyRegistered) {
        // Converte "aluno" para "user" para a API do Base44
        const apiRole = role === 'aluno' ? 'user' : role;
        const result = await base44.users.inviteUser(student.email, apiRole);
        tempPassword = result?.password;
      }

      // Atualiza o status
      await base44.entities.PendingStudent.update(student.id, { status: 'approved' });

      // Cria o perfil do aluno aprovado apenas se for aluno
      if (role === 'aluno') {
        const users = await base44.entities.User.filter({ email: student.email });
        const userId = users.length > 0 ? users[0].id : student.email;

        // Verifica se já existe um perfil para este usuário
        const existingProfiles = await base44.entities.StudentProfile.filter({ user_id: userId });
        
        if (existingProfiles.length === 0) {
          await base44.entities.StudentProfile.create({
            user_id: userId,
            full_name: student.full_name,
            registration_number: student.registration_number || '',
            phone: student.phone || '',
            birth_date: student.birth_date || '',
            is_approved: true
          });
        }
      }

      setSuccessData({
        email: student.email,
        fullName: student.full_name,
        password: tempPassword || '',
        alreadyRegistered
      });
      
      setSuccessDialogOpen(true);
      loadData();
    } catch (error) {
      console.error('Error approving student:', error);
      alert('Erro ao aprovar cadastro: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (studentId) => {
    if (confirm('Deseja realmente rejeitar este cadastro?')) {
      try {
        await base44.entities.PendingStudent.update(studentId, { status: 'rejected' });
        loadData();
      } catch (error) {
        console.error('Error rejecting student:', error);
      }
    }
  };

  const handleDelete = async (studentId) => {
    if (!confirm('Tem certeza que deseja excluir este cadastro permanentemente?')) return;
    
    setProcessing(studentId);
    try {
      await base44.entities.PendingStudent.delete(studentId);
      alert('Cadastro excluído com sucesso!');
      loadData();
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Erro ao excluir cadastro: ' + error.message);
    } finally {
      setProcessing(null);
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
          <h1 className="text-3xl font-bold mb-2">Cadastros Pendentes</h1>
          <p className="text-blue-200">Aprovar solicitações de cadastro de alunos</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pendentes ({getFilteredStudents('pending').length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Aprovados ({getFilteredStudents('approved').length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Rejeitados ({getFilteredStudents('rejected').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {getFilteredStudents('pending').length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getFilteredStudents('pending').map((student, index) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{student.full_name}</CardTitle>
                          <Badge className="bg-yellow-100 text-yellow-700">
                            Pendente
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="w-4 h-4" />
                          {student.email}
                        </div>
                        
                        {student.registration_number && (
                          <p className="text-sm text-slate-600">
                            Matrícula: {student.registration_number}
                          </p>
                        )}
                        {student.phone && (
                          <p className="text-sm text-slate-600">
                            Tel: {student.phone}
                          </p>
                        )}
                        {student.birth_date && (
                          <p className="text-sm text-slate-600">
                            Nascimento: {(() => {
                              const parts = student.birth_date.split('-');
                              if (parts.length === 3) {
                                return `${parts[2]}/${parts[1]}/${parts[0]}`;
                              }
                              return new Date(student.birth_date).toLocaleDateString('pt-BR');
                            })()}
                          </p>
                        )}

                        <div className="pt-3 space-y-3">
                          <div>
                            <Label className="text-xs">Cadastrar como:</Label>
                            <Select 
                              value={selectedRole[student.id] || 'aluno'} 
                              onValueChange={(value) => setSelectedRole({...selectedRole, [student.id]: value})}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="aluno">
                                  <div className="flex items-center gap-2">
                                    <Users className="w-3 h-3" />
                                    Aluno
                                  </div>
                                </SelectItem>
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-2">
                                    <Shield className="w-3 h-3" />
                                    Administrador
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => handleApprove(student)}
                            disabled={processing === student.id}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            {processing === student.id ? 'Enviando...' : 'Aprovar'}
                          </Button>
                          <Button
                            onClick={() => handleReject(student.id)}
                            disabled={processing === student.id}
                            variant="outline"
                            className="flex-1"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Rejeitar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Clock className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Nenhum cadastro pendente no momento.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="approved">
            {getFilteredStudents('approved').length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getFilteredStudents('approved').map((student, index) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{student.full_name}</CardTitle>
                          <Badge className="bg-green-100 text-green-700">
                            Aprovado
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="w-4 h-4" />
                          {student.email}
                        </div>
                        
                        {student.registration_number && (
                          <p className="text-sm text-slate-600">
                            Matrícula: {student.registration_number}
                          </p>
                        )}
                        {student.phone && (
                          <p className="text-sm text-slate-600">
                            Tel: {student.phone}
                          </p>
                        )}
                        {student.birth_date && (
                          <p className="text-sm text-slate-600">
                            Nascimento: {(() => {
                              const parts = student.birth_date.split('-');
                              if (parts.length === 3) {
                                return `${parts[2]}/${parts[1]}/${parts[0]}`;
                              }
                              return new Date(student.birth_date).toLocaleDateString('pt-BR');
                            })()}
                          </p>
                        )}

                        <Button
                          onClick={() => handleDelete(student.id)}
                          disabled={processing === student.id}
                          variant="outline"
                          size="sm"
                          className="w-full text-red-600 hover:bg-red-50 border-red-200 mt-3"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir Cadastro
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Nenhum cadastro aprovado ainda.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rejected">
            {getFilteredStudents('rejected').length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getFilteredStudents('rejected').map((student, index) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{student.full_name}</CardTitle>
                          <Badge className="bg-red-100 text-red-700">
                            Rejeitado
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="w-4 h-4" />
                          {student.email}
                        </div>
                        
                        {student.registration_number && (
                          <p className="text-sm text-slate-600">
                            Matrícula: {student.registration_number}
                          </p>
                        )}

                        <Button
                          onClick={() => handleDelete(student.id)}
                          disabled={processing === student.id}
                          variant="outline"
                          size="sm"
                          className="w-full text-red-600 hover:bg-red-50 border-red-200 mt-3"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir Cadastro
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertCircle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Nenhum cadastro rejeitado.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-[500px] border border-slate-200 bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-[#1e3a5f]">
              <CheckCircle className="w-6 h-6 text-green-500" />
              Cadastro Aprovado!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <p className="text-sm text-slate-600">
              O cadastro de <strong>{successData.fullName}</strong> ({successData.email}) foi aprovado.
            </p>

            {successData.alreadyRegistered ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                Este usuário já possuía uma conta no portal. O perfil de estudante foi ativado e ele pode fazer login com suas credenciais existentes.
              </div>
            ) : (
              successData.password && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Senha Temporária</Label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm font-mono select-all">
                        {successData.password}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(successData.password);
                          toast.success('Senha temporária copiada!');
                        }}
                        className="border-slate-300 hover:bg-slate-50 shrink-0"
                      >
                        Copiar
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                    <Button
                      onClick={() => {
                        const subject = encodeURIComponent("Seu cadastro foi aprovado no Portal do Professor Robson Cordeiro!");
                        const body = encodeURIComponent(
                          `Olá, ${successData.fullName}!\n\nSeu cadastro de estudante no Portal do Professor Robson Cordeiro foi aprovado com sucesso!\n\n` +
                          `Você já pode acessar a plataforma utilizando seus dados:\n` +
                          `Link do Portal: ${window.location.origin}\n` +
                          `E-mail: ${successData.email}\n` +
                          `Senha Temporária: ${successData.password}\n\n` +
                          `Após fazer login, você poderá alterar sua senha no seu perfil.\n\n` +
                          `Bons estudos!\nEquipe Portal Robson Cordeiro`
                        );
                        window.location.href = `mailto:${successData.email}?subject=${subject}&body=${body}`;
                        toast.success('Cliente de e-mail aberto!');
                      }}
                      className="w-full bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white flex items-center justify-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      Enviar por E-mail
                    </Button>
                  </div>
                </div>
              )
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                onClick={() => setSuccessDialogOpen(false)}
                className="bg-[#d4a853] hover:bg-[#c49743] text-[#1e3a5f]"
              >
                Entendido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
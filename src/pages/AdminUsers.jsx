import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { Users, UserPlus, Trash2, Mail, Shield, User as UserIcon, ArrowLeft, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminUsers() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successData, setSuccessData] = useState({ email: '', inviteUrl: '', password: '', role: '' });
  const [inviteData, setInviteData] = useState({ email: '', role: 'aluno' });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        window.location.replace(createPageUrl('Home'));
        return;
      }

      const currentUser = await base44.auth.me();
      if (!currentUser || currentUser.role !== 'admin') {
        window.location.replace(createPageUrl('Home'));
        return;
      }

      setUser(currentUser);
      await loadUsers();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    const allUsers = await base44.entities.User.list();
    setUsers(allUsers);
  };

  const handleInviteUser = async () => {
    if (!inviteData.email) return;
    
    setInviting(true);
    try {
      // Converte "aluno" para "user" para a API do Base44
      const apiRole = inviteData.role === 'aluno' ? 'user' : inviteData.role;
      const res = await base44.functions.invoke('sendPreInvite', {
        email: inviteData.email,
        role: apiRole
      });
      
      const inviteUrl = res?.data?.inviteUrl;
      const tempPass = res?.data?.password;
      
      setSuccessData({
        email: inviteData.email,
        inviteUrl: inviteUrl || '',
        password: tempPass || '',
        role: inviteData.role
      });
      
      setSuccessDialogOpen(true);
      await loadUsers();
      setDialogOpen(false);
      setInviteData({ email: '', role: 'aluno' });
    } catch (error) {
      alert('Erro ao enviar convite: ' + error.message);
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${userEmail}?`)) return;

    try {
      await base44.entities.User.delete(userId);
      alert('Usuário excluído com sucesso!');
      await loadUsers();
    } catch (error) {
      alert('Erro ao excluir usuário: ' + error.message);
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
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
            <p className="text-slate-600 mb-4">Esta área é exclusiva para administradores.</p>
            <Link to={createPageUrl('Home')} className="text-[#1e3a5f] hover:underline">
              Voltar para Home
            </Link>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Gerenciar Usuários</h1>
              <p className="text-blue-200">Convidar, visualizar e excluir usuários do sistema</p>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#d4a853] hover:bg-[#c49743] text-[#1e3a5f]">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Convidar Usuário
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar Novo Usuário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Função</Label>
                  <Select
                    value={inviteData.role}
                    onValueChange={(value) => setInviteData({ ...inviteData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aluno">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-3 h-3" />
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    ✉️ O usuário receberá um e-mail em português com link para aceitar o convite. 
                    Após aceitar, receberá outro e-mail para definir a senha.
                  </p>
                </div>
                <Button 
                  onClick={handleInviteUser} 
                  disabled={inviting || !inviteData.email}
                  className="w-full bg-[#1e3a5f] hover:bg-[#2d4a6f]"
                >
                  {inviting ? 'Enviando...' : 'Enviar Convite'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Users List */}
        <div className="space-y-4">
          {users.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Nenhum usuário cadastrado ainda.</p>
              </CardContent>
            </Card>
          ) : (
            users.map((u, index) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          u.role === 'admin' ? 'bg-[#d4a853]' : 'bg-[#1e3a5f]'
                        }`}>
                          {u.role === 'admin' ? (
                            <Shield className="w-6 h-6 text-white" />
                          ) : (
                            <UserIcon className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-800">{u.full_name}</h3>
                            {u.role === 'admin' ? (
                              <span className="text-xs px-2 py-1 rounded-full bg-[#d4a853] text-white font-medium">
                                Admin
                              </span>
                            ) : (u.role === 'user' || u.role === 'aluno' || u.role === 'alunos') ? (
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                                Aluno
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Mail className="w-4 h-4" />
                            {u.email}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Cadastrado em {new Date(u.created_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      
                      {u.id !== user.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="text-red-600 hover:bg-red-50 border-red-200"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-[500px] border border-slate-200 bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-[#1e3a5f]">
              <CheckCircle className="w-6 h-6 text-green-500" />
              Convite Criado com Sucesso!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <p className="text-sm text-slate-600">
              O usuário <strong>{successData.email}</strong> foi cadastrado no sistema. Copie os dados de acesso abaixo para enviar ao aluno.
            </p>

            {successData.inviteUrl && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Link de Ativação</Label>
                <div className="flex gap-2 min-w-0">
                  <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm font-mono break-all select-all">
                    {successData.inviteUrl}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(successData.inviteUrl);
                      toast.success('Link de ativação copiado!');
                    }}
                    className="border-slate-300 hover:bg-slate-50 shrink-0"
                  >
                    Copiar
                  </Button>
                </div>
              </div>
            )}

            {successData.password && (
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
            )}

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
              <Button
                onClick={() => {
                  const subject = encodeURIComponent("Convite para o Portal do Professor Robson Cordeiro");
                  const body = encodeURIComponent(
                    `Olá!\n\nVocê foi convidado para participar do Portal do Professor Robson Cordeiro como Aluno.\n\n` +
                    `Para ativar sua conta, clique no link abaixo:\n${successData.inviteUrl}\n\n` +
                    `Sua senha temporária é: ${successData.password}\n\n` +
                    `Ao acessar pela primeira vez, você poderá alterar sua senha no seu perfil.\n\n` +
                    `Abraços,\nEquipe Portal Robson Cordeiro`
                  );
                  window.location.href = `mailto:${successData.email}?subject=${subject}&body=${body}`;
                  toast.success('Cliente de e-mail aberto!');
                }}
                className="w-full bg-[#1e3a5f] hover:bg-[#2d4a6f] text-white flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Enviar por E-mail
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const inviteText = `Olá!\n\nVocê foi convidado para participar do Portal do Professor Robson Cordeiro como Aluno.\n\n` +
                    `Para ativar sua conta, clique no link abaixo:\n${successData.inviteUrl}\n\n` +
                    `Sua senha temporária é: ${successData.password}\n\n` +
                    `Ao acessar pela primeira vez, você poderá alterar sua senha no seu perfil.\n\n` +
                    `Abraços,\nEquipe Portal Robson Cordeiro`;
                  navigator.clipboard.writeText(inviteText);
                  toast.success('Mensagem do convite copiada!');
                }}
                className="w-full border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
              >
                Copiar Texto do Convite
              </Button>
              <Button
                variant="ghost"
                onClick={() => setSuccessDialogOpen(false)}
                className="w-full text-slate-500 hover:bg-slate-50"
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
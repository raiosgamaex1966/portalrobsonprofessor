import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { MessageSquare, ArrowLeft, Clock, CheckCircle, Mail, Send, Reply, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminMessages() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [showReplyDialog, setShowReplyDialog] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      base44.auth.redirectToLogin(createPageUrl('Admin'));
      return;
    }

    const currentUser = await base44.auth.me();
    if (currentUser?.role !== 'admin') {
      window.location.href = createPageUrl('Home');
      return;
    }

    setUser(currentUser);
    loadData();
  };

  const loadData = async () => {
    const [allMessages, allClasses] = await Promise.all([
      base44.entities.StudentMessage.list('-created_date'),
      base44.entities.Class.list()
    ]);

    setMessages(allMessages);
    setClasses(allClasses);
    setLoading(false);
  };

  const handleOpenReply = (msg) => {
    setSelectedMessage(msg);
    setReplyText(msg.teacher_reply || '');
    setShowReplyDialog(true);
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) {
      toast.error('Digite uma resposta');
      return;
    }

    try {
      await base44.entities.StudentMessage.update(selectedMessage.id, {
        teacher_reply: replyText,
        status: 'replied',
        replied_at: new Date().toISOString()
      });

      toast.success('Resposta enviada!');
      setShowReplyDialog(false);
      setReplyText('');
      loadData();
    } catch (error) {
      toast.error('Erro ao enviar resposta');
    }
  };

  const handleMarkAsRead = async (msgId) => {
    try {
      await base44.entities.StudentMessage.update(msgId, { status: 'read' });
      loadData();
    } catch (error) {
      toast.error('Erro ao marcar como lida');
    }
  };

  const handleDeleteMessage = async (msgId, msgSubject) => {
    if (!confirm(`Tem certeza que deseja excluir a mensagem "${msgSubject}"?`)) {
      return;
    }

    try {
      await base44.entities.StudentMessage.delete(msgId);
      toast.success('Mensagem excluída');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir mensagem');
    }
  };

  const getClassName = (classId) => {
    const classData = classes.find(c => c.id === classId);
    return classData?.name || 'Turma';
  };

  const pendingMessages = messages.filter(m => m.status === 'pending');
  const readMessages = messages.filter(m => m.status === 'read');
  const repliedMessages = messages.filter(m => m.status === 'replied');

  const statusConfig = {
    pending: { label: 'Pendente', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
    read: { label: 'Lida', icon: Mail, color: 'bg-blue-100 text-blue-800' },
    replied: { label: 'Respondida', icon: CheckCircle, color: 'bg-green-100 text-green-800' }
  };

  const MessageCard = ({ msg }) => {
    const status = statusConfig[msg.status] || statusConfig.pending;
    const StatusIcon = status.icon;

    return (
      <Card className="hover:shadow-lg transition-all">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-lg">{msg.subject}</h3>
                <Badge className={status.color}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {status.label}
                </Badge>
              </div>
              <p className="text-sm text-slate-600 mb-1">
                <span className="font-medium">{msg.student_name}</span> • {msg.student_email}
              </p>
              <p className="text-sm text-slate-500 mb-2">
                Turma: {getClassName(msg.class_id)}
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{msg.message}</p>
              <p className="text-xs text-slate-400 mt-2">
                Recebida em {format(new Date(msg.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {msg.status === 'pending' && (
              <Button size="sm" variant="outline" onClick={() => handleMarkAsRead(msg.id)}>
                <Mail className="w-4 h-4 mr-1" />
                Marcar como Lida
              </Button>
            )}
            <Button 
              size="sm" 
              onClick={() => handleOpenReply(msg)}
              className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
            >
              <Reply className="w-4 h-4 mr-1" />
              {msg.status === 'replied' ? 'Ver/Editar Resposta' : 'Responder'}
            </Button>
            {msg.status === 'replied' && (
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => handleDeleteMessage(msg.id, msg.subject)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Excluir
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
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
        <div className="max-w-7xl mx-auto">
          <Link to={createPageUrl('Admin')} className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Painel
          </Link>
          <div className="flex items-center gap-3">
            <MessageSquare className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">Mensagens dos Alunos</h1>
              <p className="text-blue-100 mt-1">Responda às dúvidas e mensagens dos seus alunos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="pending">
              Pendentes ({pendingMessages.length})
            </TabsTrigger>
            <TabsTrigger value="read">
              Lidas ({readMessages.length})
            </TabsTrigger>
            <TabsTrigger value="replied">
              Respondidas ({repliedMessages.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingMessages.length > 0 ? (
              pendingMessages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <MessageCard msg={msg} />
                </motion.div>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <MessageSquare className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Nenhuma mensagem pendente</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="read" className="space-y-4">
            {readMessages.length > 0 ? (
              readMessages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <MessageCard msg={msg} />
                </motion.div>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <MessageSquare className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Nenhuma mensagem lida</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="replied" className="space-y-4">
            {repliedMessages.length > 0 ? (
              repliedMessages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <MessageCard msg={msg} />
                </motion.div>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <MessageSquare className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Nenhuma mensagem respondida</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Responder */}
      <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Responder Mensagem</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-500 mb-1">Mensagem do aluno:</p>
              <p className="text-sm font-medium mb-1">{selectedMessage?.student_name}</p>
              <p className="text-xs text-slate-500 mb-2">{selectedMessage?.subject}</p>
              <p className="text-slate-700 whitespace-pre-wrap">{selectedMessage?.message}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-2">Sua resposta:</p>
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Digite sua resposta..."
                rows={6}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowReplyDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSendReply} className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
              <Send className="w-4 h-4 mr-2" />
              Enviar Resposta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
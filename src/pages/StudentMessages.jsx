import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { MessageSquare, Send, Clock, CheckCircle, Mail, Plus, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function StudentMessages() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [classes, setClasses] = useState([]);
  const [myClasses, setMyClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [formData, setFormData] = useState({
    class_id: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('student-messages-page-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_messages' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      base44.auth.redirectToLogin(createPageUrl('StudentMessages'));
      return;
    }

    const currentUser = await base44.auth.me();
    setUser(currentUser);

    const allClasses = await base44.entities.Class.filter({ is_active: true });
    const classStudents = await base44.entities.ClassStudent.filter({ user_id: currentUser.id });
    const studentMessages = await base44.entities.StudentMessage.filter({ student_email: currentUser.email }, '-created_date');

    const studentClassIds = classStudents.map(cs => cs.class_id);
    const studentClasses = allClasses.filter(c => studentClassIds.includes(c.id));

    setClasses(allClasses);
    setMyClasses(studentClasses);
    setMessages(studentMessages);
    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!formData.class_id || !formData.subject.trim() || !formData.message.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      await base44.entities.StudentMessage.create({
        student_name: user.full_name,
        student_email: user.email,
        class_id: formData.class_id,
        subject: formData.subject,
        message: formData.message,
        status: 'pending'
      });

      toast.success('Mensagem enviada!');
      setShowNewMessageDialog(false);
      setFormData({ class_id: '', subject: '', message: '' });
      loadData();
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    }
  };

  const getClassName = (classId) => {
    const classData = classes.find(c => c.id === classId);
    return classData?.name || 'Turma';
  };

  const statusConfig = {
    pending: { label: 'Pendente', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
    read: { label: 'Lida', icon: Mail, color: 'bg-blue-100 text-blue-800' },
    replied: { label: 'Respondida', icon: CheckCircle, color: 'bg-green-100 text-green-800' }
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
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-10 h-10" />
              <div>
                <h1 className="text-4xl font-bold">Mensagens ao Professor</h1>
                <p className="text-blue-100 mt-2">Envie dúvidas e mensagens para seus professores</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowNewMessageDialog(true)}
              className="bg-[#d4a853] hover:bg-[#c49743] text-[#1e3a5f]"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nova Mensagem
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {myClasses.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Você não está matriculado em nenhuma turma ainda.</p>
            </CardContent>
          </Card>
        ) : messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const status = statusConfig[msg.status] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => setSelectedMessage(msg)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg">{msg.subject}</h3>
                            <Badge className={status.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">
                            Turma: <span className="font-medium">{getClassName(msg.class_id)}</span>
                          </p>
                          <p className="text-sm text-slate-500 line-clamp-2">{msg.message}</p>
                          <p className="text-xs text-slate-400 mt-2">
                            Enviada em {format(new Date(msg.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">Você ainda não enviou nenhuma mensagem.</p>
              <Button onClick={() => setShowNewMessageDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Enviar Primeira Mensagem
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog Nova Mensagem */}
      <Dialog open={showNewMessageDialog} onOpenChange={setShowNewMessageDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Mensagem ao Professor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Turma *</Label>
              <Select value={formData.class_id} onValueChange={(value) => setFormData({...formData, class_id: value})}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {myClasses.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assunto *</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                placeholder="Qual o assunto da mensagem?"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Mensagem *</Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                placeholder="Escreva sua mensagem..."
                className="mt-1"
                rows={6}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowNewMessageDialog(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSendMessage} className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
              <Send className="w-4 h-4 mr-2" />
              Enviar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Ver Mensagem */}
      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedMessage?.subject}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <p className="text-sm text-slate-500 mb-1">Turma:</p>
              <p className="font-medium">{selectedMessage && getClassName(selectedMessage.class_id)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Sua mensagem:</p>
              <p className="text-slate-700 whitespace-pre-wrap">{selectedMessage?.message}</p>
            </div>
            {selectedMessage?.teacher_reply && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="font-semibold text-green-800">Resposta do Professor</p>
                </div>
                <p className="text-slate-700 whitespace-pre-wrap">{selectedMessage.teacher_reply}</p>
                <p className="text-xs text-slate-500 mt-2">
                  Respondida em {format(new Date(selectedMessage.replied_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            )}
            <p className="text-xs text-slate-400">
              Enviada em {selectedMessage && format(new Date(selectedMessage.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Calendar, Clock, Video, Plus, CheckCircle, X, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";

export default function Appointments() {
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    duration: 60,
    meeting_link: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      base44.auth.redirectToLogin();
      return;
    }

    const currentUser = await base44.auth.me();
    setUser(currentUser);

    const filterKey = currentUser.role === 'admin' ? 'teacher_email' : 'student_email';
    const allAppointments = await base44.entities.Appointment.filter(
      { [filterKey]: currentUser.email },
      '-start_time'
    );
    setAppointments(allAppointments);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.start_time) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      const startTime = new Date(formData.start_time);
      const endTime = addMinutes(startTime, formData.duration);

      await base44.entities.Appointment.create({
        student_id: user.id,
        student_email: user.email,
        student_name: user.full_name,
        title: formData.title,
        description: formData.description,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        meeting_link: formData.meeting_link,
        status: 'pending'
      });

      toast.success('Agendamento criado! Aguardando confirmação do professor.');
      setShowDialog(false);
      setFormData({ title: '', description: '', start_time: '', duration: 60, meeting_link: '' });
      loadData();
    } catch (error) {
      toast.error('Erro ao criar agendamento');
    }
  };

  const handleUpdateStatus = async (appointmentId, newStatus) => {
    try {
      await base44.entities.Appointment.update(appointmentId, { status: newStatus });
      toast.success(`Agendamento ${newStatus === 'confirmed' ? 'confirmado' : 'cancelado'}`);
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar agendamento');
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
      confirmed: { label: 'Confirmado', className: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
      completed: { label: 'Concluído', className: 'bg-blue-100 text-blue-800' }
    };
    const config = configs[status] || configs.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-8 px-6">
        <div className="max-w-7xl mx-auto">
          {isAdmin && (
            <Link to={createPageUrl('Admin')} className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Voltar para Painel
            </Link>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">Agendamentos</h1>
                <p className="text-blue-100 mt-1">
                  {isAdmin ? 'Gerencie horários com alunos' : 'Agende horários para dúvidas'}
                </p>
              </div>
            </div>
            {!isAdmin && (
              <Button onClick={() => setShowDialog(true)} className="bg-white text-[#1e3a5f] hover:bg-blue-50">
                <Plus className="w-4 h-4 mr-2" />
                Novo Agendamento
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {appointments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Nenhum agendamento ainda</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {appointments.map((appointment, index) => (
              <motion.div
                key={appointment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-all">
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between">
                      <span className="text-lg">{appointment.title}</span>
                      {getStatusBadge(appointment.status)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="w-4 h-4" />
                      <span>
                        {format(new Date(appointment.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>

                    {appointment.description && (
                      <p className="text-sm text-slate-600">{appointment.description}</p>
                    )}

                    {!isAdmin && (
                      <p className="text-sm text-slate-500">
                        {appointment.teacher_name ? `Professor: ${appointment.teacher_name}` : 'Aguardando confirmação'}
                      </p>
                    )}

                    {isAdmin && (
                      <p className="text-sm text-slate-500">Aluno: {appointment.student_name}</p>
                    )}

                    {appointment.meeting_link && appointment.status === 'confirmed' && (
                      <a href={appointment.meeting_link} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="w-full">
                          <Video className="w-4 h-4 mr-2" />
                          Entrar na Reunião
                        </Button>
                      </a>
                    )}

                    {isAdmin && appointment.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(appointment.id, 'confirmed')}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Confirmar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleUpdateStatus(appointment.id, 'cancelled')}
                          className="flex-1"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog Novo Agendamento */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Dúvida sobre atividade"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o assunto da reunião..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data e Hora *</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="mt-1"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div>
                <Label>Duração (minutos)</Label>
                <Input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  className="mt-1"
                  min={15}
                  step={15}
                />
              </div>
            </div>

            <div>
              <Label>Link da Reunião (opcional)</Label>
              <Input
                value={formData.meeting_link}
                onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                placeholder="https://meet.google.com/..."
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
                Criar Agendamento
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
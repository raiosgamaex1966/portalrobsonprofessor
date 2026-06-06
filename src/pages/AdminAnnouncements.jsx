import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { Megaphone, ArrowLeft, Plus, Edit, Trash2, Save, X, Eye } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'normal',
    is_active: true,
    show_once: false
  });

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

    loadData();
  };

  const loadData = async () => {
    const [announcementsData, viewsData] = await Promise.all([
      base44.entities.Announcement.list('-created_date'),
      base44.entities.AnnouncementView.list()
    ]);
    setAnnouncements(announcementsData);
    setViews(viewsData);
    setLoading(false);
  };

  const handleOpenDialog = (announcement = null) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setFormData(announcement);
    } else {
      setEditingAnnouncement(null);
      setFormData({
        title: '',
        message: '',
        priority: 'normal',
        is_active: true,
        show_once: false
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingAnnouncement) {
        await base44.entities.Announcement.update(editingAnnouncement.id, formData);
        toast.success('Anúncio atualizado!');
      } else {
        await base44.entities.Announcement.create(formData);
        toast.success('Anúncio criado!');
      }
      setShowDialog(false);
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar anúncio');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este anúncio?')) return;
    
    try {
      await base44.entities.Announcement.delete(id);
      toast.success('Anúncio excluído!');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir anúncio');
    }
  };

  const getViewCount = (announcementId) => {
    return views.filter(v => v.announcement_id === announcementId).length;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <Link to={createPageUrl('Admin')} className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Painel
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Megaphone className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">Anúncios para Alunos</h1>
                <p className="text-blue-100 mt-1">Mensagens que aparecem ao fazer login</p>
              </div>
            </div>
            <Button onClick={() => handleOpenDialog()} className="bg-[#d4a853] hover:bg-[#c49743] text-[#1e3a5f]">
              <Plus className="w-5 h-5 mr-2" />
              Novo Anúncio
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-xl h-48 animate-pulse" />
            ))}
          </div>
        ) : announcements.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {announcements.map((announcement, index) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-lg">{announcement.title}</h3>
                          {announcement.priority === 'urgent' && (
                            <Badge className="bg-red-600">Urgente</Badge>
                          )}
                          {!announcement.is_active && (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-3 whitespace-pre-wrap line-clamp-3">
                          {announcement.message}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {getViewCount(announcement.id)} visualizações
                          </div>
                          {announcement.show_once && (
                            <Badge variant="outline" className="text-xs">Mostrar 1x</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                          Criado em {format(new Date(announcement.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(announcement)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(announcement.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
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
              <Megaphone className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">Nenhum anúncio cadastrado ainda.</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Anúncio
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog Criar/Editar */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAnnouncement ? 'Editar Anúncio' : 'Novo Anúncio'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Título do anúncio"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Mensagem *</Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                placeholder="Escreva a mensagem que os alunos verão..."
                className="mt-1"
                rows={6}
              />
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <Label>Anúncio Ativo</Label>
                <p className="text-xs text-slate-500 mt-1">
                  Se ativo, será mostrado aos alunos
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="w-4 h-4 rounded"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <Label>Mostrar Apenas Uma Vez</Label>
                <p className="text-xs text-slate-500 mt-1">
                  Cada aluno verá apenas uma vez
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.show_once}
                onChange={(e) => setFormData({...formData, show_once: e.target.checked})}
                className="w-4 h-4 rounded"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
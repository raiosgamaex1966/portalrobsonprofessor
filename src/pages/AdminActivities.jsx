import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { ClipboardList, ArrowLeft, Plus, Edit, Trash2, Save, X, Upload, FileText, Loader2, MessageSquare, Link as LinkIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminActivities() {
  const [activities, setActivities] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [classes, setClasses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discipline_id: '',
    class_id: '',
    due_date: '',
    attachment_url: '',
    attachment_name: '',
    external_links: [],
    is_active: true
  });
  const [uploading, setUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 6;

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
    const [activitiesData, disciplinesData, classesData, submissionsData] = await Promise.all([
      base44.entities.Activity.list('-created_date'),
      base44.entities.Discipline.filter({ is_active: true }),
      base44.entities.Class.filter({ is_active: true }),
      base44.entities.ActivitySubmission.list()
    ]);
    setActivities(activitiesData);
    setDisciplines(disciplinesData);
    setClasses(classesData);
    setSubmissions(submissionsData);
    setLoading(false);
  };

  const getSubmissionsCount = (activityId) => {
    return submissions.filter(s => s.activity_id === activityId).length;
  };

  const getPendingCount = (activityId) => {
    return submissions.filter(s => s.activity_id === activityId && s.status === 'pending').length;
  };

  const handleOpenDialog = (activity = null) => {
    if (activity) {
      setEditingActivity(activity);
      setFormData({
        ...activity,
        due_date: activity.due_date ? activity.due_date.split('T')[0] : ''
      });
    } else {
      setEditingActivity(null);
      setFormData({
        title: '',
        description: '',
        discipline_id: disciplines[0]?.id || '',
        class_id: '',
        due_date: '',
        attachment_url: '',
        attachment_name: '',
        external_links: [],
        is_active: true
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.discipline_id) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      const dataToSave = {
        ...formData,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null
      };

      if (editingActivity) {
        await base44.entities.Activity.update(editingActivity.id, dataToSave);
        toast.success('Atividade atualizada!');
      } else {
        await base44.entities.Activity.create(dataToSave);
        toast.success('Atividade criada!');
      }
      setShowDialog(false);
      loadData();
    } catch (error) {
      console.error('Error saving activity:', error);
      toast.error(error.message || 'Erro ao salvar atividade');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta atividade?')) return;
    
    try {
      await base44.entities.Activity.delete(id);
      toast.success('Atividade excluída!');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir atividade');
    }
  };

  const getDisciplineName = (id) => {
    return disciplines.find(d => d.id === id)?.name || 'Sem disciplina';
  };

  const getClassName = (id) => {
    return classes.find(c => c.id === id)?.name || 'Todas as turmas';
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({
        ...formData,
        attachment_url: file_url,
        attachment_name: file.name
      });
      toast.success('Arquivo enviado!');
    } catch (error) {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const totalPages = Math.ceil(activities.length / ITEMS_PER_PAGE);
  const paginatedActivities = activities.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

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
              <ClipboardList className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Gerenciar Atividades</h1>
            </div>
            <Button onClick={() => handleOpenDialog()} className="bg-[#d4a853] hover:bg-[#c49743] text-[#1e3a5f]">
              <Plus className="w-5 h-5 mr-2" />
              Nova Atividade
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl h-32 animate-pulse" />
            ))}
          </div>
        ) : activities.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedActivities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index % 6) * 0.05 }}
                >
                <Card className="hover:shadow-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-bold text-lg">{activity.title}</h3>
                          <span className="text-xs px-2 py-1 bg-[#1e3a5f]/10 text-[#1e3a5f] rounded">
                            {getDisciplineName(activity.discipline_id)}
                          </span>
                          {activity.class_id && (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                              {getClassName(activity.class_id)}
                            </span>
                          )}
                        </div>
                        {activity.description && (
                          <p className="text-sm text-slate-500 mb-2 line-clamp-2">{activity.description}</p>
                        )}
                        {activity.due_date && (
                          <p className="text-xs text-orange-600 mb-2">
                            Prazo: {format(new Date(activity.due_date), "d 'de' MMMM, yyyy", { locale: ptBR })}
                          </p>
                        )}
                        {activity.attachment_url && (
                          <div className="flex items-center gap-1 mb-3 text-xs text-[#1e3a5f]">
                            <FileText className="w-3 h-3" />
                            <span>{activity.attachment_name || 'Anexo disponível'}</span>
                          </div>
                        )}
                        {activity.external_links?.length > 0 && (
                          <div className="mb-3">
                            {activity.external_links.map((link, idx) => (
                              <a
                                key={idx}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-600 hover:underline mb-1"
                              >
                                <LinkIcon className="w-3 h-3" />
                                {link.title || link.url}
                              </a>
                            ))}
                          </div>
                        )}
                        
                        {/* Notificações e Ações */}
                        <div className="flex items-center gap-2 pt-2 border-t">
                          {getSubmissionsCount(activity.id) > 0 && (
                            <Link to={createPageUrl('AdminActivitySubmissions') + '?id=' + activity.id}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                              >
                                <MessageSquare className="w-4 h-4 mr-1" />
                                {getSubmissionsCount(activity.id)}
                                {getPendingCount(activity.id) > 0 && (
                                  <Badge className="ml-1 bg-orange-500 h-5 px-1.5 text-xs">
                                    {getPendingCount(activity.id)}
                                  </Badge>
                                )}
                              </Button>
                            </Link>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDialog(activity)}
                            className="h-8"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(activity.id)}
                            className="text-red-500 hover:text-red-700 h-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                >
                  Anterior
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <Button
                      key={i}
                      variant={currentPage === i ? "default" : "outline"}
                      onClick={() => setCurrentPage(i)}
                      className={currentPage === i ? "bg-[#1e3a5f]" : ""}
                      size="sm"
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPage === totalPages - 1}
                >
                  Próxima
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <ClipboardList className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">Nenhuma atividade cadastrada ainda.</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Atividade
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingActivity ? 'Editar Atividade' : 'Nova Atividade'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Título da atividade"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="discipline">Disciplina *</Label>
              <Select
                value={formData.discipline_id}
                onValueChange={(value) => setFormData({...formData, discipline_id: value})}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a disciplina" />
                </SelectTrigger>
                <SelectContent>
                  {disciplines.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="class">Turma (opcional)</Label>
              <Select
                value={formData.class_id || ''}
                onValueChange={(value) => setFormData({...formData, class_id: value || ''})}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todas as turmas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todas as turmas</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Enunciado / Descrição *</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Descreva a atividade que os alunos devem realizar"
                className="mt-1"
                rows={6}
              />
            </div>
            <div>
              <Label htmlFor="due_date">Prazo de Entrega</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="attachment">Anexo (opcional)</Label>
              {formData.attachment_url ? (
                <div className="mt-1 flex items-center gap-3 p-3 border rounded-lg bg-slate-50">
                  <FileText className="w-5 h-5 text-[#1e3a5f]" />
                  <span className="text-sm flex-1">{formData.attachment_name}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setFormData({...formData, attachment_url: '', attachment_name: ''})}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ) : (
                <div className="mt-1">
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                    {uploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-[#1e3a5f]" />
                        <span className="text-sm text-slate-600">Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-slate-400" />
                        <span className="text-sm text-slate-600">Clique para enviar arquivo</span>
                      </>
                    )}
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
              )}
            </div>
            <div>
              <Label>Links Externos (opcional)</Label>
              <div className="mt-2 space-y-2">
                {(formData.external_links || []).map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Título do link"
                      value={link.title || ''}
                      onChange={(e) => {
                        const newLinks = [...(formData.external_links || [])];
                        newLinks[index].title = e.target.value;
                        setFormData({...formData, external_links: newLinks});
                      }}
                      className="flex-1"
                    />
                    <Input
                      placeholder="URL (https://...)"
                      value={link.url || ''}
                      onChange={(e) => {
                        const newLinks = [...(formData.external_links || [])];
                        newLinks[index].url = e.target.value;
                        setFormData({...formData, external_links: newLinks});
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const newLinks = (formData.external_links || []).filter((_, i) => i !== index);
                        setFormData({...formData, external_links: newLinks});
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      external_links: [...(formData.external_links || []), { title: '', url: '' }]
                    });
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Link
                </Button>
              </div>
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
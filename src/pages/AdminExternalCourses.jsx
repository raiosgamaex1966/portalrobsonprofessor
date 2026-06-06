import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { GraduationCap, ArrowLeft, Plus, Edit, Trash2, Save, X, Upload, ExternalLink, Download, CheckCircle, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminExternalCourses() {
  const [courses, setCourses] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showCompletionsDialog, setShowCompletionsDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    external_link: '',
    deadline: '',
    thumbnail_url: '',
    is_active: true
  });
  const [uploading, setUploading] = useState(false);

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
    try {
      const [coursesData, completionsData] = await Promise.all([
        base44.entities.ExternalCourse.list('-created_date'),
        base44.entities.ExternalCourseCompletion.list('-created_date')
      ]);
      setCourses(coursesData);
      setCompletions(completionsData);
    } catch (error) {
      console.error('Error loading admin external courses data:', error);
      toast.error('Erro ao carregar dados dos cursos externos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (course = null) => {
    if (course) {
      setEditingCourse(course);
      setFormData({
        ...course,
        deadline: course.deadline ? course.deadline.slice(0, 16) : ''
      });
    } else {
      setEditingCourse(null);
      setFormData({
        title: '',
        description: '',
        external_link: '',
        deadline: '',
        thumbnail_url: '',
        is_active: true
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.external_link.trim()) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      const dataToSave = {
        ...formData,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null
      };

      if (editingCourse) {
        await base44.entities.ExternalCourse.update(editingCourse.id, dataToSave);
        toast.success('Curso atualizado!');
      } else {
        await base44.entities.ExternalCourse.create(dataToSave);
        toast.success('Curso criado!');
      }
      setShowDialog(false);
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar curso');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este curso?')) return;
    
    try {
      await base44.entities.ExternalCourse.delete(id);
      toast.success('Curso excluído!');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir curso');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, thumbnail_url: file_url });
      toast.success('Imagem enviada!');
    } catch (error) {
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploading(false);
    }
  };

  const handleViewCompletions = (course) => {
    setSelectedCourse(course);
    setShowCompletionsDialog(true);
  };

  const handleApproveCompletion = async (completionId) => {
    try {
      await base44.entities.ExternalCourseCompletion.update(completionId, { status: 'approved' });
      toast.success('Conclusão aprovada!');
      loadData();
    } catch (error) {
      toast.error('Erro ao aprovar conclusão');
    }
  };

  const getCourseCompletions = (courseId) => {
    return completions.filter(c => c.course_id === courseId);
  };

  const getPendingCount = (courseId) => {
    return completions.filter(c => c.course_id === courseId && c.status === 'pending').length;
  };

  const courseCompletions = selectedCourse ? getCourseCompletions(selectedCourse.id) : [];
  const pendingCompletions = courseCompletions.filter(c => c.status === 'pending');
  const approvedCompletions = courseCompletions.filter(c => c.status === 'approved');

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
              <GraduationCap className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Cursos Externos</h1>
            </div>
            <Button onClick={() => handleOpenDialog()} className="bg-[#d4a853] hover:bg-[#c49743] text-[#1e3a5f]">
              <Plus className="w-5 h-5 mr-2" />
              Novo Curso
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl h-64 animate-pulse" />
            ))}
          </div>
        ) : courses.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-all overflow-hidden">
                  {course.thumbnail_url && (
                    <img 
                      src={course.thumbnail_url} 
                      alt={course.title}
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg mb-2">{course.title}</h3>
                    {course.description && (
                      <p className="text-sm text-slate-500 mb-3 line-clamp-2">{course.description}</p>
                    )}
                    {course.deadline && (
                      <p className="text-xs text-orange-600 mb-3">
                        Prazo: {format(new Date(course.deadline), "d 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mb-4">
                      <a 
                        href={course.external_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Acessar Curso
                      </a>
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewCompletions(course)}
                        className="flex-1"
                      >
                        <GraduationCap className="w-4 h-4 mr-1" />
                        Conclusões ({getCourseCompletions(course.id).length})
                        {getPendingCount(course.id) > 0 && (
                          <Badge className="ml-1 bg-orange-500 h-5 px-1.5 text-xs">
                            {getPendingCount(course.id)}
                          </Badge>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenDialog(course)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(course.id)}
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
              <GraduationCap className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">Nenhum curso externo cadastrado ainda.</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Curso
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog Criar/Editar */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCourse ? 'Editar Curso' : 'Novo Curso Externo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Nome do curso"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Breve descrição do curso"
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label>Link do Curso *</Label>
              <Input
                value={formData.external_link}
                onChange={(e) => setFormData({...formData, external_link: e.target.value})}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>Prazo para Conclusão (Data e Hora)</Label>
              <Input
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Imagem de Capa</Label>
              {formData.thumbnail_url ? (
                <div className="mt-1">
                  <img src={formData.thumbnail_url} alt="Capa" className="w-full h-40 object-cover rounded-lg mb-2" />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setFormData({...formData, thumbnail_url: ''})}
                  >
                    Remover Imagem
                  </Button>
                </div>
              ) : (
                <label className="mt-1 flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50">
                  {uploading ? (
                    <span className="text-sm text-slate-600">Enviando...</span>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-slate-400" />
                      <span className="text-sm text-slate-600">Clique para enviar imagem</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                </label>
              )}
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

      {/* Dialog Conclusões */}
      <Dialog open={showCompletionsDialog} onOpenChange={setShowCompletionsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conclusões - {selectedCourse?.title}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="pending" className="py-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">
                Pendentes ({pendingCompletions.length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Aprovadas ({approvedCompletions.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="space-y-3">
              {pendingCompletions.length > 0 ? (
                pendingCompletions.map((completion) => (
                  <Card key={completion.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-semibold">{completion.user_name}</p>
                          <p className="text-sm text-slate-500">{completion.user_email}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Concluído em: {format(new Date(completion.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={completion.certificate_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline">
                              <Download className="w-4 h-4 mr-1" />
                              Certificado
                            </Button>
                          </a>
                          <Button
                            size="sm"
                            onClick={() => handleApproveCompletion(completion.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Aprovar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-center py-8 text-slate-500">Nenhuma conclusão pendente</p>
              )}
            </TabsContent>
            <TabsContent value="approved" className="space-y-3">
              {approvedCompletions.length > 0 ? (
                approvedCompletions.map((completion) => (
                  <Card key={completion.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-semibold">{completion.user_name}</p>
                          <p className="text-sm text-slate-500">{completion.user_email}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Concluído em: {format(new Date(completion.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                          <Badge className="mt-2 bg-green-600">Aprovado</Badge>
                        </div>
                        <a href={completion.certificate_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline">
                            <Download className="w-4 h-4 mr-1" />
                            Certificado
                          </Button>
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-center py-8 text-slate-500">Nenhuma conclusão aprovada</p>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { FileText, ArrowLeft, Plus, Edit, Trash2, Save, X, Upload, Tag } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function AdminMaterials() {
  const [materials, setMaterials] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [filterDiscipline, setFilterDiscipline] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 6;
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discipline_id: '',
    class_id: '',
    file_url: '',
    file_type: 'pdf',
    content: '',
    material_type: 'complementary',
    tags: [],
    is_active: true
  });
  const [tagInput, setTagInput] = useState('');
  const [contentTab, setContentTab] = useState('material');

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
    const [materialsData, disciplinesData, classesData] = await Promise.all([
      base44.entities.Material.list('-created_date'),
      base44.entities.Discipline.filter({ is_active: true }),
      base44.entities.Class.filter({ is_active: true })
    ]);
    setMaterials(materialsData);
    setDisciplines(disciplinesData);
    setClasses(classesData);
    setLoading(false);
  };

  const handleOpenDialog = (material = null) => {
    if (material) {
      setEditingMaterial(material);
      setFormData({
        ...material, 
        tags: material.tags || [],
        content: material.content || '',
        class_id: material.class_id || '',
        material_type: material.material_type || 'complementary'
      });
      setContentTab(material.file_type === 'video' ? 'video' : material.file_type === 'text' ? 'text' : 'material');
    } else {
      setEditingMaterial(null);
      setFormData({
        title: '',
        description: '',
        discipline_id: disciplines[0]?.id || '',
        class_id: '',
        file_url: '',
        file_type: 'pdf',
        content: '',
        material_type: 'complementary',
        tags: [],
        is_active: true
      });
      setContentTab('material');
    }
    setTagInput('');
    setShowDialog(true);
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({...formData, tags: [...formData.tags, tag]});
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({...formData, tags: formData.tags.filter(t => t !== tagToRemove)});
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({...formData, file_url});
      toast.success('Arquivo enviado!');
    } catch (error) {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.discipline_id) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const payload = {
      ...formData,
      class_id: formData.class_id || null
    };

    try {
      if (editingMaterial) {
        await base44.entities.Material.update(editingMaterial.id, payload);
        toast.success('Material atualizado!');
      } else {
        await base44.entities.Material.create(payload);
        toast.success('Material criado!');
      }
      setShowDialog(false);
      loadData();
    } catch (error) {
      console.error('Error saving material:', error);
      toast.error(error.message || 'Erro ao salvar material');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este material?')) return;
    
    try {
      await base44.entities.Material.delete(id);
      toast.success('Material excluído!');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir material');
    }
  };

  const getDisciplineName = (id) => {
    return disciplines.find(d => d.id === id)?.name || 'Sem disciplina';
  };

  const getClassName = (id) => {
    return classes.find(c => c.id === id)?.name || 'Todas as turmas';
  };

  const filteredMaterials = materials.filter(material => {
    const disciplineMatch = filterDiscipline === 'all' || material.discipline_id === filterDiscipline;
    const classMatch = filterClass === 'all' || 
                       (filterClass === 'none' && !material.class_id) || 
                       material.class_id === filterClass;
    return disciplineMatch && classMatch;
  });

  const totalPages = Math.ceil(filteredMaterials.length / ITEMS_PER_PAGE);
  const paginatedMaterials = filteredMaterials.slice(
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
              <FileText className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Gerenciar Materiais</h1>
            </div>
            <Button onClick={() => handleOpenDialog()} className="bg-[#d4a853] hover:bg-[#c49743] text-[#1e3a5f]">
              <Plus className="w-5 h-5 mr-2" />
              Novo Material
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs mb-1">Filtrar por Disciplina</Label>
                <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Disciplinas</SelectItem>
                    {disciplines.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs mb-1">Filtrar por Turma</Label>
                <Select value={filterClass} onValueChange={setFilterClass}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="none">Sem turma específica</SelectItem>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl h-32 animate-pulse" />
            ))}
          </div>
        ) : filteredMaterials.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedMaterials.map((material, index) => (
                <motion.div
                  key={material.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index % 6) * 0.05 }}
                >
                <Card className="hover:shadow-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-bold text-lg">{material.title}</h3>
                          {material.material_type === 'mandatory' && (
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded font-semibold">
                              OBRIGATÓRIO
                            </span>
                          )}
                          <span className="text-xs px-2 py-1 bg-[#1e3a5f]/10 text-[#1e3a5f] rounded">
                            {getDisciplineName(material.discipline_id)}
                          </span>
                          {material.class_id && (
                            <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-600 rounded">
                              {getClassName(material.class_id)}
                            </span>
                          )}
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-600 rounded">
                            {material.file_type?.toUpperCase()}
                          </span>
                        </div>
                        {material.description && (
                          <p className="text-sm text-slate-500 mb-2">{material.description}</p>
                        )}
                        {material.tags && material.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {material.tags.map((tag, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 bg-[#d4a853]/20 text-[#d4a853] rounded-full">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {material.file_url && (
                          <a
                            href={material.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Ver arquivo →
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDialog(material)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(material.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
              <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">Nenhum material cadastrado ainda.</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Material
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial ? 'Editar Material' : 'Novo Material'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Nome do material"
                className="mt-1"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
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
                  value={formData.class_id || 'none'}
                  onValueChange={(value) => setFormData({...formData, class_id: value === 'none' ? '' : value})}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todas as turmas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Todas as turmas</SelectItem>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="description">Descrição Detalhada</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Descreva o conteúdo e objetivo deste material"
                className="mt-1"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="material_type">Tipo do Material</Label>
              <Select
                value={formData.material_type}
                onValueChange={(value) => setFormData({...formData, material_type: value})}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complementary">📚 Complementar</SelectItem>
                  <SelectItem value="mandatory">⭐ Obrigatório</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs value={contentTab} onValueChange={(value) => {
              setContentTab(value);
              if (value === 'material') {
                setFormData({...formData, file_type: 'pdf'});
              } else if (value === 'video') {
                setFormData({...formData, file_type: 'video'});
              } else if (value === 'text') {
                setFormData({...formData, file_type: 'text'});
              }
            }}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="material">📄 Material</TabsTrigger>
                <TabsTrigger value="video">🎥 Vídeo</TabsTrigger>
                <TabsTrigger value="text">✏️ Texto</TabsTrigger>
              </TabsList>

              <TabsContent value="material" className="space-y-4">
                <div>
                  <Label htmlFor="file_type">Formato do Arquivo</Label>
                  <Select
                    value={formData.file_type}
                    onValueChange={(value) => setFormData({...formData, file_type: value})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">📄 PDF</SelectItem>
                      <SelectItem value="docx">📝 Word (DOCX)</SelectItem>
                      <SelectItem value="pptx">📊 PowerPoint (PPTX)</SelectItem>
                      <SelectItem value="xlsx">📈 Excel (XLSX)</SelectItem>
                      <SelectItem value="image">🖼️ Imagem</SelectItem>
                      <SelectItem value="link">🔗 Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Arquivo / Link</Label>
                  <div className="mt-1 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        accept={
                          formData.file_type === 'pdf' ? '.pdf' :
                          formData.file_type === 'docx' ? '.docx,.doc' :
                          formData.file_type === 'pptx' ? '.pptx,.ppt' :
                          formData.file_type === 'xlsx' ? '.xlsx,.xls' :
                          formData.file_type === 'image' ? 'image/*' : '*'
                        }
                        className="flex-1"
                      />
                      {uploading && <span className="text-sm text-slate-500">Enviando...</span>}
                    </div>
                    <Input
                      value={formData.file_url || ''}
                      onChange={(e) => setFormData({...formData, file_url: e.target.value})}
                      placeholder="Ou cole o link direto do arquivo"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="video" className="space-y-4">
                <div>
                  <Label>Vídeo</Label>
                  <div className="mt-1 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        accept="video/*"
                        className="flex-1"
                      />
                      {uploading && <span className="text-sm text-slate-500">Enviando...</span>}
                    </div>
                    <Input
                      value={formData.file_url || ''}
                      onChange={(e) => setFormData({...formData, file_url: e.target.value})}
                      placeholder="Ou cole o link do YouTube, Vimeo, etc."
                    />
                    <p className="text-xs text-slate-500">
                      💡 Você pode fazer upload de um vídeo ou colar um link do YouTube, Vimeo, etc.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="text" className="space-y-4">
                <div>
                  <Label>Conteúdo do Material</Label>
                  <div className="mt-1">
                    <ReactQuill
                      value={formData.content || ''}
                      onChange={(value) => setFormData({...formData, content: value})}
                      placeholder="Digite o conteúdo do material aqui..."
                      modules={{
                        toolbar: [
                          [{ 'header': [1, 2, 3, false] }],
                          ['bold', 'italic', 'underline', 'strike'],
                          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                          [{ 'color': [] }, { 'background': [] }],
                          ['link', 'image'],
                          ['clean']
                        ]
                      }}
                      style={{ minHeight: '200px' }}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            <div>
              <Label htmlFor="tags" className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags / Palavras-chave
              </Label>
              <div className="mt-1 space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Digite uma tag e pressione Enter"
                    className="flex-1"
                  />
                  <Button type="button" onClick={handleAddTag} size="sm" variant="outline">
                    Adicionar
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg">
                    {formData.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-[#d4a853]/20 text-[#d4a853] rounded-full text-sm"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:bg-[#d4a853]/30 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  Ex: exercícios, revisão, prova, fundamental, avançado
                </p>
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
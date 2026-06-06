import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { 
  BookOpen, ArrowLeft, Plus, Edit, Trash2, Save, X,
  Calculator, Microscope, Globe, Palette, Music, Code, Users
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

const iconOptions = [
  { value: 'BookOpen', label: 'Livro', icon: BookOpen },
  { value: 'Calculator', label: 'Matemática', icon: Calculator },
  { value: 'Microscope', label: 'Ciências', icon: Microscope },
  { value: 'Globe', label: 'Geografia', icon: Globe },
  { value: 'Palette', label: 'Artes', icon: Palette },
  { value: 'Music', label: 'Música', icon: Music },
  { value: 'Code', label: 'Programação', icon: Code }
];

export default function AdminDisciplines() {
  const [disciplines, setDisciplines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingDiscipline, setEditingDiscipline] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'BookOpen',
    is_active: true
  });
  const [classes, setClasses] = useState([]);
  const [disciplineClasses, setDisciplineClasses] = useState([]);
  const [showClassesDialog, setShowClassesDialog] = useState(false);
  const [selectedDisciplineForClasses, setSelectedDisciplineForClasses] = useState(null);

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

    loadDisciplines();
  };

  const loadDisciplines = async () => {
    const [disciplinesData, classesData, relationshipsData] = await Promise.all([
      base44.entities.Discipline.list(),
      base44.entities.Class.filter({ is_active: true }),
      base44.entities.DisciplineClass.list()
    ]);
    setDisciplines(disciplinesData);
    setClasses(classesData);
    setDisciplineClasses(relationshipsData);
    setLoading(false);
  };

  const handleOpenDialog = (discipline = null) => {
    if (discipline) {
      setEditingDiscipline(discipline);
      setFormData(discipline);
    } else {
      setEditingDiscipline(null);
      setFormData({
        name: '',
        description: '',
        icon: 'BookOpen',
        is_active: true
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      if (editingDiscipline) {
        await base44.entities.Discipline.update(editingDiscipline.id, formData);
        toast.success('Disciplina atualizada!');
      } else {
        await base44.entities.Discipline.create(formData);
        toast.success('Disciplina criada!');
      }
      setShowDialog(false);
      loadDisciplines();
    } catch (error) {
      console.error('Erro ao salvar disciplina:', error);
      toast.error(error.message || 'Erro ao salvar disciplina');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta disciplina?')) return;
    
    try {
      await base44.entities.Discipline.delete(id);
      toast.success('Disciplina excluída!');
      loadDisciplines();
    } catch (error) {
      toast.error('Erro ao excluir disciplina');
    }
  };

  const handleOpenClassesDialog = (discipline) => {
    setSelectedDisciplineForClasses(discipline);
    setShowClassesDialog(true);
  };

  const getLinkedClasses = (disciplineId) => {
    return disciplineClasses.filter(dc => dc.discipline_id === disciplineId);
  };

  const isClassLinked = (disciplineId, classId) => {
    return disciplineClasses.some(dc => dc.discipline_id === disciplineId && dc.class_id === classId);
  };

  const handleToggleClass = async (classId) => {
    const existing = disciplineClasses.find(
      dc => dc.discipline_id === selectedDisciplineForClasses.id && dc.class_id === classId
    );

    try {
      if (existing) {
        await base44.entities.DisciplineClass.delete(existing.id);
        toast.success('Turma removida!');
      } else {
        await base44.entities.DisciplineClass.create({
          discipline_id: selectedDisciplineForClasses.id,
          class_id: classId
        });
        toast.success('Turma adicionada!');
      }
      loadDisciplines();
    } catch (error) {
      console.error('Erro ao atualizar vínculo:', error);
      toast.error(error.message || 'Erro ao atualizar');
    }
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
              <BookOpen className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Gerenciar Disciplinas</h1>
            </div>
            <Button onClick={() => handleOpenDialog()} className="bg-[#d4a853] hover:bg-[#c49743] text-[#1e3a5f]">
              <Plus className="w-5 h-5 mr-2" />
              Nova Disciplina
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl h-48 animate-pulse" />
            ))}
          </div>
        ) : disciplines.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {disciplines.map((discipline, index) => {
              const IconComponent = iconOptions.find(i => i.value === discipline.icon)?.icon || BookOpen;
              return (
                <motion.div
                  key={discipline.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center">
                          <IconComponent className="w-6 h-6 text-[#1e3a5f]" />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDialog(discipline)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(discipline.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <h3 className="font-bold text-lg mb-2">{discipline.name}</h3>
                      {discipline.description && (
                        <p className="text-sm text-slate-500 line-clamp-2">{discipline.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenClassesDialog(discipline)}
                          className="flex-1"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Turmas ({getLinkedClasses(discipline.id).length})
                        </Button>
                      </div>
                      {!discipline.is_active && (
                        <div className="mt-3 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                          Inativa
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">Nenhuma disciplina cadastrada ainda.</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Disciplina
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDiscipline ? 'Editar Disciplina' : 'Nova Disciplina'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Nome da Disciplina *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Matemática"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Breve descrição da disciplina"
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="icon">Ícone</Label>
              <Select
                value={formData.icon}
                onValueChange={(value) => setFormData({...formData, icon: value})}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="w-4 h-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Classes Dialog */}
      <Dialog open={showClassesDialog} onOpenChange={setShowClassesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Turmas - {selectedDisciplineForClasses?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {classes.length > 0 ? (
              <div className="space-y-3">
                {classes.map((classItem) => {
                  const isLinked = isClassLinked(selectedDisciplineForClasses?.id, classItem.id);
                  return (
                    <div
                      key={classItem.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                    >
                      <Checkbox
                        checked={isLinked}
                        onCheckedChange={() => handleToggleClass(classItem.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{classItem.name}</p>
                        {classItem.year && (
                          <p className="text-xs text-slate-500">Ano: {classItem.year}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center py-8 text-slate-500">
                Nenhuma turma cadastrada ainda.
              </p>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowClassesDialog(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
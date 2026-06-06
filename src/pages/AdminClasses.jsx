import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { Users, Plus, Edit, Trash2, BookOpen, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function AdminClasses() {
  const [user, setUser] = useState(null);
  const [classes, setClasses] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [studentCounts, setStudentCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discipline_id: '',
    year: new Date().getFullYear(),
    teacher_email: '',
    teacher_name: '',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        base44.auth.redirectToLogin(createPageUrl('AdminClasses'));
        return;
      }

      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (currentUser?.role !== 'admin') return;

      const [classesData, disciplinesData, allStudents] = await Promise.all([
        base44.entities.Class.list('-created_date'),
        base44.entities.Discipline.list(),
        base44.entities.ClassStudent.list()
      ]);

      setClasses(classesData);
      setDisciplines(disciplinesData);
      
      // Count students per class
      const counts = {};
      allStudents.forEach(student => {
        counts[student.class_id] = (counts[student.class_id] || 0) + 1;
      });
      setStudentCounts(counts);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.discipline_id) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingClass) {
        await base44.entities.Class.update(editingClass.id, formData);
        toast.success('Turma atualizada com sucesso!');
      } else {
        await base44.entities.Class.create(formData);
        toast.success('Turma criada com sucesso!');
      }

      setShowDialog(false);
      setEditingClass(null);
      setFormData({ name: '', description: '', discipline_id: '', year: new Date().getFullYear(), teacher_email: '', teacher_name: '', is_active: true });
      loadData();
    } catch (error) {
      console.error('Error saving class:', error);
      toast.error(error.message || 'Erro ao salvar turma');
    }
  };

  const handleEdit = (classItem) => {
    setEditingClass(classItem);
    setFormData({
      name: classItem.name,
      description: classItem.description || '',
      discipline_id: classItem.discipline_id,
      year: classItem.year || new Date().getFullYear(),
      teacher_email: classItem.teacher_email || '',
      teacher_name: classItem.teacher_name || '',
      is_active: classItem.is_active !== false
    });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    const studentCount = studentCounts[id] || 0;
    const confirmMsg = studentCount > 0
      ? `Esta turma tem ${studentCount} aluno(s) matriculado(s). Deseja realmente excluir?`
      : 'Deseja realmente excluir esta turma?';
      
    if (confirm(confirmMsg)) {
      try {
        // First delete all class students
        const classStudents = await base44.entities.ClassStudent.filter({ class_id: id });
        await Promise.all(classStudents.map(s => base44.entities.ClassStudent.delete(s.id)));
        
        // Then delete the class
        await base44.entities.Class.delete(id);
        toast.success('Turma excluída com sucesso!');
        loadData();
      } catch (error) {
        console.error('Error deleting class:', error);
        toast.error('Erro ao excluir turma');
      }
    }
  };

  const getDisciplineName = (id) => {
    return disciplines.find(d => d.id === id)?.name || 'Sem disciplina';
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
            <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
            <p className="text-slate-600">Esta área é exclusiva para administradores.</p>
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
              <h1 className="text-3xl font-bold mb-2">Gerenciar Turmas</h1>
              <p className="text-blue-200">Crie e gerencie as turmas do portal</p>
            </div>
            <Button
              onClick={() => {
                setEditingClass(null);
                setFormData({ name: '', description: '', discipline_id: '', year: new Date().getFullYear(), teacher_email: '', teacher_name: '', is_active: true });
                setShowDialog(true);
              }}
              className="bg-[#d4a853] hover:bg-[#c49743] text-[#1e3a5f]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Turma
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {classes.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((classItem, index) => (
              <motion.div
                key={classItem.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-xl">{classItem.name}</CardTitle>
                          {!classItem.is_active && (
                            <Badge variant="destructive">Inativa</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <BookOpen className="w-4 h-4" />
                          {getDisciplineName(classItem.discipline_id)}
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <p className="text-sm text-slate-400">Ano: {classItem.year}</p>
                          <Badge variant="secondary">
                            <Users className="w-3 h-3 mr-1" />
                            {studentCounts[classItem.id] || 0} alunos
                          </Badge>
                        </div>
                        {classItem.teacher_name && (
                          <p className="text-xs text-slate-500 mt-2">
                            Professor: {classItem.teacher_name}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(classItem)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(classItem.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {classItem.description && (
                    <CardContent>
                      <p className="text-sm text-slate-600">{classItem.description}</p>
                    </CardContent>
                  )}
                  <CardContent className="pt-0">
                    <Link to={`${createPageUrl('AdminClassStudents')}?id=${classItem.id}`}>
                      <Button variant="outline" className="w-full">
                        <Users className="w-4 h-4 mr-2" />
                        Gerenciar Alunos
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Nenhuma turma cadastrada ainda.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClass ? 'Editar Turma' : 'Nova Turma'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome da Turma *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                placeholder="Ex: Turma A - Manhã"
              />
            </div>

            <div>
              <Label>Disciplina *</Label>
              <Select
                value={formData.discipline_id}
                onValueChange={(value) => setFormData({...formData, discipline_id: value})}
                required
              >
                <SelectTrigger>
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
              <Label>Ano</Label>
              <Input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                placeholder="2024"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Informações adicionais sobre a turma"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do Professor</Label>
                <Input
                  value={formData.teacher_name}
                  onChange={(e) => setFormData({...formData, teacher_name: e.target.value})}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <Label>Email do Professor</Label>
                <Input
                  type="email"
                  value={formData.teacher_email}
                  onChange={(e) => setFormData({...formData, teacher_email: e.target.value})}
                  placeholder="professor@email.com"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <Label htmlFor="is_active" className="text-sm font-medium">Turma Ativa</Label>
                <p className="text-xs text-slate-500 mt-1">
                  {formData.is_active ? 'A turma está ativa e visível' : 'A turma está inativa'}
                </p>
              </div>
              <input
                id="is_active"
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="w-4 h-4 rounded border-gray-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
              />
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-[#1e3a5f] hover:bg-[#2d4a6f]">
                {editingClass ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
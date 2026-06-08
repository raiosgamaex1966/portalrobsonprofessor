import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Plus, Trash2, Users, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function AdminDisciplineClasses() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disciplines, setDisciplines] = useState([]);
  const [classes, setClasses] = useState([]);
  const [disciplineClasses, setDisciplineClasses] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        base44.auth.redirectToLogin(createPageUrl('AdminDisciplineClasses'));
        return;
      }

      const currentUser = await base44.auth.me();
      if (currentUser.role !== 'admin') {
        window.location.href = createPageUrl('Home');
        return;
      }

      setUser(currentUser);
      await loadData();
    } catch (error) {
      console.error('Error checking auth:', error);
    }
  };

  const loadData = async () => {
    try {
      const [disciplinesData, classesData, relationshipsData] = await Promise.all([
        base44.entities.Discipline.list(),
        base44.entities.Class.filter({ is_active: true }),
        base44.entities.DisciplineClass.list()
      ]);

      setDisciplines(disciplinesData);
      setClasses(classesData);
      setDisciplineClasses(relationshipsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRelationship = async () => {
    if (!selectedDiscipline || !selectedClass) {
      toast.error('Selecione disciplina e turma');
      return;
    }

    // Check if relationship already exists
    const exists = disciplineClasses.some(
      dc => dc.discipline_id === selectedDiscipline && dc.class_id === selectedClass
    );

    if (exists) {
      toast.error('Esta relação já existe');
      return;
    }

    try {
      await base44.entities.DisciplineClass.create({
        discipline_id: selectedDiscipline,
        class_id: selectedClass
      });
      
      toast.success('Turma adicionada à disciplina!');
      setShowDialog(false);
      setSelectedDiscipline('');
      setSelectedClass('');
      loadData();
    } catch (error) {
      toast.error('Erro ao adicionar');
    }
  };

  const handleRemoveRelationship = async (id) => {
    if (!confirm('Remover esta relação?')) return;

    try {
      await base44.entities.DisciplineClass.delete(id);
      toast.success('Relação removida!');
      loadData();
    } catch (error) {
      toast.error('Erro ao remover');
    }
  };

  const getDisciplineName = (id) => {
    return disciplines.find(d => d.id === id)?.name || 'Disciplina';
  };

  const getClassName = (id) => {
    return classes.find(c => c.id === id)?.name || 'Turma';
  };

  const getClassesForDiscipline = (disciplineId) => {
    return disciplineClasses.filter(dc => dc.discipline_id === disciplineId);
  };

  const totalPages = Math.ceil(disciplines.length / ITEMS_PER_PAGE);
  const paginatedDisciplines = disciplines.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <Link to={createPageUrl('Admin')} className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-bold mb-2">Turmas por Disciplina</h1>
            <p className="text-blue-200">Gerencie quais turmas estão associadas a cada disciplina</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Disciplinas</h2>
            <p className="text-slate-600">Vincule turmas às disciplinas</p>
          </div>
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Relação
          </Button>
        </div>

        {disciplines.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedDisciplines.map((discipline) => {
                const linkedClasses = getClassesForDiscipline(discipline.id);
                return (
                  <Card key={discipline.id} className="shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${discipline.color || 'from-blue-500 to-blue-600'} flex items-center justify-center`}>
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold leading-tight">{discipline.name}</h3>
                          <p className="text-xs text-slate-500">{linkedClasses.length} turma(s)</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedDiscipline(discipline.id);
                          setSelectedClass('');
                          setShowDialog(true);
                        }}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 h-9 w-9 rounded-xl"
                        title="Vincular Turma"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {linkedClasses.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto mt-2">
                          {linkedClasses.map((dc) => {
                            const classData = classes.find(c => c.id === dc.class_id);
                            return (
                              <div
                                key={dc.id}
                                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-slate-800 text-sm truncate">{classData?.name}</p>
                                  {classData?.year && (
                                    <p className="text-xs text-slate-500">Ano: {classData.year}</p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveRelationship(dc.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-slate-500 text-sm mb-3">Nenhuma turma vinculada</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedDiscipline(discipline.id);
                              setSelectedClass('');
                              setShowDialog(true);
                            }}
                            className="text-xs border-dashed"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Vincular Turma
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
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
          <Card className="shadow-lg">
            <CardContent className="text-center py-16">
              <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Nenhuma disciplina cadastrada.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Relationship Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Turma à Disciplina</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Disciplina</Label>
              <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione uma disciplina" />
                </SelectTrigger>
                <SelectContent>
                  {disciplines.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Turma</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione uma turma" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.year ? `- ${c.year}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddRelationship} className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { 
  FileQuestion, Plus, Pencil, Trash2, ArrowLeft, Clock, 
  Calendar, ListChecks, Copy, FileEdit
} from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminTests() {
  const [tests, setTests] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discipline_id: '',
    test_type: 'objective',
    time_limit_minutes: 30,
    due_date: '',
    is_active: true,
    questions: [],
    practical_instructions: ''
  });
  const [saving, setSaving] = useState(false);

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
    const [testsData, disciplinesData] = await Promise.all([
      base44.entities.Test.list('-created_date'),
      base44.entities.Discipline.list()
    ]);
    setTests(testsData);
    setDisciplines(disciplinesData);
    setLoading(false);
  };

  const getDisciplineName = (id) => disciplines.find(d => d.id === id)?.name || 'Sem disciplina';

  const openDialog = (test = null) => {
    if (test) {
      setEditingTest(test);
      setFormData({
        title: test.title || '',
        description: test.description || '',
        discipline_id: test.discipline_id || '',
        test_type: test.test_type || 'objective',
        time_limit_minutes: test.time_limit_minutes || 30,
        due_date: test.due_date ? test.due_date.slice(0, 16) : '',
        is_active: test.is_active !== false,
        questions: test.questions || [],
        practical_instructions: test.practical_instructions || ''
      });
    } else {
      setEditingTest(null);
      setFormData({
        title: '',
        description: '',
        discipline_id: '',
        test_type: 'objective',
        time_limit_minutes: 30,
        due_date: '',
        is_active: true,
        questions: [],
        practical_instructions: ''
      });
    }
    setDialogOpen(true);
  };

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [...formData.questions, {
        question: '',
        options: ['', '', '', ''],
        correct_answer: 0,
        points: 1
      }]
    });
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...formData.questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setFormData({ ...formData, questions: newQuestions });
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const newQuestions = [...formData.questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setFormData({ ...formData, questions: newQuestions });
  };

  const removeQuestion = (index) => {
    const newQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData({ ...formData, questions: newQuestions });
  };

  const duplicateQuestion = (index) => {
    const newQuestions = [...formData.questions];
    newQuestions.splice(index + 1, 0, { ...formData.questions[index] });
    setFormData({ ...formData, questions: newQuestions });
  };

  const handleSave = async () => {
    setSaving(true);
    const dataToSave = {
      ...formData,
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null
    };
    
    if (editingTest) {
      await base44.entities.Test.update(editingTest.id, dataToSave);
    } else {
      await base44.entities.Test.create(dataToSave);
    }
    await loadData();
    setDialogOpen(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (confirm('Tem certeza que deseja excluir este teste?')) {
      await base44.entities.Test.delete(id);
      await loadData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <Link to={createPageUrl('Admin')} className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Painel
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Testes</h1>
              <p className="text-blue-200">Crie e gerencie testes para os alunos</p>
            </div>
            <Button 
              onClick={() => openDialog()}
              className="bg-[#d4a853] hover:bg-[#c49743] text-[#1e3a5f]"
            >
              <Plus className="w-5 h-5 mr-2" />
              Novo Teste
            </Button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl h-24 animate-pulse" />
            ))}
          </div>
        ) : tests.length > 0 ? (
          <div className="space-y-4">
            {tests.map((test, index) => (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="shadow-md hover:shadow-lg transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <FileQuestion className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                           <h3 className="font-semibold text-slate-800">{test.title}</h3>
                           <Badge variant="secondary">{getDisciplineName(test.discipline_id)}</Badge>
                           <Badge className={test.test_type === 'practical' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                             {test.test_type === 'practical' ? 'Prático' : 'Objetivo'}
                           </Badge>
                           {!test.is_active && (
                             <Badge variant="destructive">Inativo</Badge>
                           )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                           {test.test_type === 'objective' && (
                             <span className="flex items-center gap-1">
                               <ListChecks className="w-4 h-4" />
                               {test.questions?.length || 0} questões
                             </span>
                           )}
                            {test.time_limit_minutes && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {test.time_limit_minutes} min
                              </span>
                            )}
                            {test.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(test.due_date), "d/MM/yyyy", { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="ghost" size="icon" onClick={() => openDialog(test)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(test.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="text-center py-16">
            <CardContent>
              <FileQuestion className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">Nenhum teste cadastrado</p>
              <Button onClick={() => openDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Teste
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTest ? 'Editar Teste' : 'Novo Teste'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Título *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Título do teste"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Disciplina *</Label>
                <Select value={formData.discipline_id} onValueChange={(value) => setFormData({ ...formData, discipline_id: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {disciplines.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de Teste *</Label>
                <Select value={formData.test_type} onValueChange={(value) => setFormData({ ...formData, test_type: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="objective">Objetivo (Questões)</SelectItem>
                    <SelectItem value="practical">Prático (Trabalho)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tempo Limite (minutos)</Label>
                <Input
                  type="number"
                  value={formData.time_limit_minutes}
                  onChange={(e) => setFormData({ ...formData, time_limit_minutes: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Instruções do teste..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Prazo Final</Label>
                <Input
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center justify-between pt-6">
                <Label>Ativo</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            {/* Practical Instructions */}
            {formData.test_type === 'practical' && (
              <div>
                <Label className="text-lg font-semibold">Instruções do Trabalho Prático</Label>
                <p className="text-sm text-slate-500 mb-2">
                  Descreva o que os alunos devem fazer neste trabalho prático
                </p>
                <ReactQuill
                  value={formData.practical_instructions}
                  onChange={(value) => setFormData({ ...formData, practical_instructions: value })}
                  placeholder="Digite as instruções detalhadas do trabalho..."
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['link'],
                      ['clean']
                    ]
                  }}
                  style={{ minHeight: '200px' }}
                />
              </div>
            )}

            {/* Questions */}
            {formData.test_type === 'objective' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-lg font-semibold">Questões ({formData.questions.length})</Label>
                  <Button type="button" onClick={addQuestion} size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Questão
                  </Button>
                </div>

                <div className="space-y-6">
                  {formData.questions.map((question, qIndex) => (
                  <Card key={qIndex} className="p-4 bg-slate-50">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-medium">Questão {qIndex + 1}</h4>
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="icon" onClick={() => duplicateQuestion(qIndex)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label>Enunciado</Label>
                        <Textarea
                          value={question.question}
                          onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                          placeholder="Digite a pergunta..."
                          className="mt-1"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {question.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${qIndex}`}
                              checked={question.correct_answer === oIndex}
                              onChange={() => updateQuestion(qIndex, 'correct_answer', oIndex)}
                              className="w-4 h-4 text-[#1e3a5f]"
                            />
                            <Input
                              value={option}
                              onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                              placeholder={`Opção ${oIndex + 1}`}
                              className="flex-1"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <Label>Pontos:</Label>
                        <Input
                          type="number"
                          value={question.points}
                          onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value) || 1)}
                          className="w-20"
                          min="1"
                        />
                      </div>
                    </div>
                  </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!formData.title || !formData.discipline_id || saving}
              className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
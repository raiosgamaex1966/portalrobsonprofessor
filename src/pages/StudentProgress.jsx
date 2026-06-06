import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp, Award, FileText, ClipboardCheck, Calendar, MessageSquare, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";

export default function StudentProgress() {
  const [user, setUser] = useState(null);
  const [disciplines, setDisciplines] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activitySubmissions, setActivitySubmissions] = useState([]);
  const [tests, setTests] = useState([]);
  const [testSubmissions, setTestSubmissions] = useState([]);
  const [practicalSubmissions, setPracticalSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiscipline, setSelectedDiscipline] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [
        disciplinesData,
        activitiesData,
        activitySubmissionsData,
        testsData,
        testSubmissionsData,
        practicalSubmissionsData
      ] = await Promise.all([
        base44.entities.Discipline.filter({ is_active: true }),
        base44.entities.Activity.list(),
        base44.entities.ActivitySubmission.filter({ user_id: currentUser.id }),
        base44.entities.Test.filter({ is_active: true }),
        base44.entities.TestSubmission.filter({ user_id: currentUser.id }),
        base44.entities.PracticalSubmission.filter({ user_id: currentUser.id })
      ]);

      setDisciplines(disciplinesData);
      setActivities(activitiesData);
      setActivitySubmissions(activitySubmissionsData);
      setTests(testsData);
      setTestSubmissions(testSubmissionsData);
      setPracticalSubmissions(practicalSubmissionsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDisciplineProgress = (disciplineId) => {
    const disciplineActivities = activities.filter(a => a.discipline_id === disciplineId);
    const disciplineTests = tests.filter(t => t.discipline_id === disciplineId);
    
    const completedActivities = activitySubmissions.filter(
      s => disciplineActivities.some(a => a.id === s.activity_id) && s.status === 'reviewed'
    );
    
    const completedTests = [
      ...testSubmissions.filter(s => disciplineTests.some(t => t.id === s.test_id)),
      ...practicalSubmissions.filter(s => disciplineTests.some(t => t.id === s.test_id) && s.status === 'reviewed')
    ];

    const totalTasks = disciplineActivities.length + disciplineTests.length;
    const completedTasks = completedActivities.length + completedTests.length;
    
    const activityGrades = completedActivities
      .filter(s => s.grade !== null && s.grade !== undefined)
      .map(s => s.grade);
    
    const testGrades = completedTests
      .filter(s => s.score !== null && s.score !== undefined && s.total_points > 0)
      .map(s => (s.score / s.total_points) * 10);
    
    const practicalGrades = completedTests
      .filter(s => s.grade !== null && s.grade !== undefined)
      .map(s => s.grade);

    const allGrades = [...activityGrades, ...testGrades, ...practicalGrades];
    const averageGrade = allGrades.length > 0 
      ? allGrades.reduce((a, b) => a + b, 0) / allGrades.length 
      : null;

    return {
      total: totalTasks,
      completed: completedTasks,
      percentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      averageGrade: averageGrade !== null ? averageGrade.toFixed(1) : null
    };
  };

  const getFilteredSubmissions = () => {
    let activitySubs = activitySubmissions.filter(s => s.status === 'reviewed');
    let testSubs = testSubmissions;
    let practicalSubs = practicalSubmissions.filter(s => s.status === 'reviewed');

    if (selectedDiscipline !== 'all') {
      const disciplineActivities = activities.filter(a => a.discipline_id === selectedDiscipline);
      const disciplineTests = tests.filter(t => t.discipline_id === selectedDiscipline);
      
      activitySubs = activitySubs.filter(s => 
        disciplineActivities.some(a => a.id === s.activity_id)
      );
      testSubs = testSubs.filter(s => 
        disciplineTests.some(t => t.id === s.test_id)
      );
      practicalSubs = practicalSubs.filter(s => 
        disciplineTests.some(t => t.id === s.test_id)
      );
    }

    return { activitySubs, testSubs, practicalSubs };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { activitySubs, testSubs, practicalSubs } = getFilteredSubmissions();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <Link to={createPageUrl('StudentDashboard')}>
            <Button variant="ghost" className="text-white mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-10 h-10" />
            <div>
              <h1 className="text-3xl font-bold">Meu Progresso</h1>
              <p className="text-blue-200">Acompanhe seu desempenho e histórico acadêmico</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        {/* Resumo por Disciplina */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[#d4a853]" />
            Resumo por Disciplina
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {disciplines.map((discipline) => {
              const progress = getDisciplineProgress(discipline.id);
              return (
                <motion.div
                  key={discipline.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -5 }}
                >
                  <Card className="border-l-4" style={{ borderLeftColor: discipline.color || '#1e3a5f' }}>
                    <CardHeader>
                      <CardTitle className="text-lg">{discipline.name}</CardTitle>
                      <CardDescription>
                        {progress.completed} de {progress.total} tarefas concluídas
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-600">Progresso</span>
                            <span className="font-medium">{progress.percentage.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] h-2 rounded-full transition-all"
                              style={{ width: `${progress.percentage}%` }}
                            />
                          </div>
                        </div>
                        {progress.averageGrade && (
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm text-slate-600">Média Geral</span>
                            <Badge className="bg-[#d4a853] text-white">
                              {progress.averageGrade}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Histórico de Notas e Feedback */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Award className="w-6 h-6 text-[#d4a853]" />
            Histórico de Avaliações
          </h2>

          <div className="mb-6 flex gap-2 flex-wrap">
            <Button
              variant={selectedDiscipline === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedDiscipline('all')}
              className={selectedDiscipline === 'all' ? 'bg-[#1e3a5f]' : ''}
            >
              Todas as Disciplinas
            </Button>
            {disciplines.map((discipline) => (
              <Button
                key={discipline.id}
                variant={selectedDiscipline === discipline.id ? 'default' : 'outline'}
                onClick={() => setSelectedDiscipline(discipline.id)}
                className={selectedDiscipline === discipline.id ? 'bg-[#1e3a5f]' : ''}
              >
                {discipline.name}
              </Button>
            ))}
          </div>

          <Tabs defaultValue="activities" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="activities">
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Atividades ({activitySubs.length})
              </TabsTrigger>
              <TabsTrigger value="tests">
                <FileText className="w-4 h-4 mr-2" />
                Testes ({testSubs.length + practicalSubs.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activities" className="space-y-4 mt-6">
              {activitySubs.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-slate-500">
                    Nenhuma atividade avaliada ainda.
                  </CardContent>
                </Card>
              ) : (
                activitySubs.map((submission) => {
                  const activity = activities.find(a => a.id === submission.activity_id);
                  const discipline = disciplines.find(d => d.id === activity?.discipline_id);
                  
                  return (
                    <motion.div
                      key={submission.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <Card className="border-l-4 border-l-blue-500">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg mb-2">{activity?.title}</CardTitle>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">{discipline?.name}</Badge>
                                <Badge className="bg-green-100 text-green-800">
                                  Revisado
                                </Badge>
                                {submission.grade !== null && submission.grade !== undefined && (
                                  <Badge className="bg-[#d4a853] text-white">
                                    Nota: {submission.grade}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="w-4 h-4" />
                            Enviado em: {new Date(submission.submitted_at).toLocaleString('pt-BR')}
                          </div>
                          
                          {submission.teacher_feedback && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div>
                                  <p className="font-medium text-blue-900 mb-2">Feedback do Professor:</p>
                                  <p className="text-slate-700 whitespace-pre-wrap">{submission.teacher_feedback}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          <Link to={createPageUrl('ActivityView') + '?id=' + activity?.id}>
                            <Button variant="outline" className="w-full">
                              Ver Atividade Completa
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="tests" className="space-y-4 mt-6">
              {testSubs.length === 0 && practicalSubs.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-slate-500">
                    Nenhum teste avaliado ainda.
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Testes Objetivos */}
                  {testSubs.map((submission) => {
                    const test = tests.find(t => t.id === submission.test_id);
                    const discipline = disciplines.find(d => d.id === test?.discipline_id);
                    const percentage = test && submission.total_points > 0 
                      ? ((submission.score / submission.total_points) * 100).toFixed(1)
                      : 0;
                    
                    return (
                      <motion.div
                        key={submission.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Card className="border-l-4 border-l-purple-500">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg mb-2">{test?.title}</CardTitle>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="outline">{discipline?.name}</Badge>
                                  <Badge className="bg-purple-100 text-purple-800">
                                    Teste Objetivo
                                  </Badge>
                                  <Badge className="bg-[#d4a853] text-white">
                                    {submission.score} / {submission.total_points} pontos
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Calendar className="w-4 h-4" />
                              Realizado em: {new Date(submission.completed_at).toLocaleString('pt-BR')}
                            </div>
                            
                            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-purple-900">Aproveitamento</span>
                                <span className="text-2xl font-bold text-purple-700">{percentage}%</span>
                              </div>
                              <div className="w-full bg-purple-200 rounded-full h-3">
                                <div
                                  className="bg-purple-600 h-3 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}

                  {/* Testes Práticos */}
                  {practicalSubs.map((submission) => {
                    const test = tests.find(t => t.id === submission.test_id);
                    const discipline = disciplines.find(d => d.id === test?.discipline_id);
                    
                    return (
                      <motion.div
                        key={submission.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Card className="border-l-4 border-l-orange-500">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg mb-2">{test?.title}</CardTitle>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="outline">{discipline?.name}</Badge>
                                  <Badge className="bg-orange-100 text-orange-800">
                                    Teste Prático
                                  </Badge>
                                  {submission.grade !== null && submission.grade !== undefined && (
                                    <Badge className="bg-[#d4a853] text-white">
                                      Nota: {submission.grade}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Calendar className="w-4 h-4" />
                              Enviado em: {new Date(submission.submitted_at).toLocaleString('pt-BR')}
                            </div>
                            
                            {submission.teacher_feedback && (
                              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <MessageSquare className="w-5 h-5 text-orange-600 mt-0.5" />
                                  <div>
                                    <p className="font-medium text-orange-900 mb-2">Feedback do Professor:</p>
                                    <p className="text-slate-700 whitespace-pre-wrap">{submission.teacher_feedback}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
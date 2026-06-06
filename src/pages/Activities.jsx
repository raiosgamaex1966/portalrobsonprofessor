import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { ClipboardList, Calendar, FileText, Check, Filter, Send } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Tentar obter usuário, mas não falhar se não estiver logado
      let currentUser = null;
      try {
        currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.log('User not authenticated');
      }

      const allActivities = await base44.entities.Activity.list();
      const disciplinesData = await base44.entities.Discipline.list();
      
      let filteredActivities = allActivities;
      let filteredDisciplines = disciplinesData;

      // Se for aluno, filtrar atividades por turma
      if (currentUser && currentUser.role === 'user') {
        const classStudents = await base44.entities.ClassStudent.filter({ user_id: currentUser.id });
        const classIds = classStudents.map(cs => cs.class_id);
        
        // Obter disciplinas vinculadas às turmas do aluno
        const disciplineClasses = await base44.entities.DisciplineClass.list();
        const studentDisciplineIds = disciplineClasses
          .filter(dc => classIds.includes(dc.class_id))
          .map(dc => dc.discipline_id);
        
        // Filtrar atividades que pertencem às disciplinas das turmas do aluno
        filteredActivities = allActivities.filter(a => 
          studentDisciplineIds.includes(a.discipline_id) &&
          (!a.class_id || classIds.includes(a.class_id))
        );
        
        // Filtrar disciplinas para mostrar apenas as das turmas do aluno
        filteredDisciplines = disciplinesData.filter(d => 
          studentDisciplineIds.includes(d.id)
        );
      }
      
      // Ordenar por prazo de entrega (mais próximo primeiro)
      const sortedActivities = filteredActivities.sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      });

      setActivities(sortedActivities);
      setDisciplines(filteredDisciplines);

      // Carregar conclusões do usuário
      if (currentUser) {
        const userCompletions = await base44.entities.ActivityCompletion.filter({ 
          user_email: currentUser.email 
        });
        setCompletions(userCompletions);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDisciplineName = (id) => {
    return disciplines.find(d => d.id === id)?.name || 'Sem disciplina';
  };

  const isOverdue = (dueDate) => {
    return dueDate && isPast(new Date(dueDate));
  };

  const isCompleted = (activityId) => {
    return completions.some(c => c.activity_id === activityId);
  };

  const getActivityStatus = (activity) => {
    if (isCompleted(activity.id)) return 'completed';
    if (isOverdue(activity.due_date)) return 'overdue';
    return 'pending';
  };

  const toggleCompletion = async (activityId) => {
    if (!user) return;

    const existingCompletion = completions.find(c => c.activity_id === activityId);
    
    if (existingCompletion) {
      await base44.entities.ActivityCompletion.delete(existingCompletion.id);
      setCompletions(completions.filter(c => c.id !== existingCompletion.id));
    } else {
      const newCompletion = await base44.entities.ActivityCompletion.create({
        activity_id: activityId,
        user_email: user.email,
        completed_at: new Date().toISOString()
      });
      setCompletions([...completions, newCompletion]);
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filterStatus === 'all') return true;
    return getActivityStatus(activity) === filterStatus;
  });

  const totalPages = Math.ceil(filteredActivities.length / ITEMS_PER_PAGE);
  const paginatedActivities = filteredActivities.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-6"
          >
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69726181464fe0497edafcf0/146ccd1e6_Designsemnome.png" 
              alt="Mascote JB"
              className="w-28 h-28 object-contain hidden sm:block"
            />
            <div>
              <h1 className="text-4xl font-bold mb-2">Atividades</h1>
              <p className="text-blue-200">
                Confira as atividades propostas e seus prazos de entrega.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="max-w-7xl mx-auto px-6 pt-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-slate-500" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as atividades</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="completed">Concluídas</SelectItem>
                <SelectItem value="overdue">Atrasadas</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-slate-500">
              {filteredActivities.length} {filteredActivities.length === 1 ? 'atividade' : 'atividades'}
            </span>
          </div>
        </div>
      </div>

      {/* Activities List */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : filteredActivities.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedActivities.map((activity, index) => {
              const completed = isCompleted(activity.id);
              const overdue = isOverdue(activity.due_date);
              const status = getActivityStatus(activity);

              return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index % 6) * 0.05 }}
                className={`bg-white rounded-2xl shadow-lg border overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full ${
                  completed ? 'border-green-200 opacity-80' : overdue ? 'border-red-200' : 'border-slate-100'
                }`}
              >
                <div className={`h-2 ${
                  completed ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 
                  overdue ? 'bg-gradient-to-r from-red-500 to-rose-500' : 
                  'bg-gradient-to-r from-[#d4a853] to-[#f0c674]'
                }`} />
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge className="bg-[#1e3a5f]/10 text-[#1e3a5f] text-xs">
                      {getDisciplineName(activity.discipline_id)}
                    </Badge>
                    {completed && (
                      <Badge className="bg-green-100 text-green-700 text-xs">
                        <Check className="w-3 h-3 mr-1" />
                        Concluída
                      </Badge>
                    )}
                    {overdue && !completed && (
                      <Badge variant="destructive" className="text-xs">Atrasada</Badge>
                    )}
                  </div>
                  
                  <h3 className={`text-lg font-bold mb-2 line-clamp-2 ${completed ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                    {activity.title}
                  </h3>
                  
                  {activity.description && (
                    <p className="text-slate-600 text-sm mb-3 line-clamp-3">
                      {activity.description}
                    </p>
                  )}
                  
                  {activity.attachment_url && (
                    <a
                      href={activity.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1e3a5f]/5 hover:bg-[#1e3a5f]/10 rounded-lg text-[#1e3a5f] text-xs font-medium transition-colors mb-3 w-fit"
                    >
                      <FileText className="w-3 h-3" />
                      {activity.attachment_name || 'Anexo'}
                    </a>
                  )}
                  
                  <div className="mt-auto space-y-2">
                    {activity.due_date && (
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                        completed ? 'bg-green-50 text-green-600' :
                        overdue ? 'bg-red-50 text-red-600' : 
                        'bg-orange-50 text-orange-600'
                      }`}>
                        <Calendar className="w-3 h-3" />
                        <span className="text-xs font-medium">
                          {format(new Date(activity.due_date), "d 'de' MMM", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                    {user && user.role === 'user' && (
                      <Link to={createPageUrl('ActivityView') + '?id=' + activity.id} className="block">
                        <Button size="sm" className="w-full bg-[#d4a853] hover:bg-[#c49743] text-[#1e3a5f]">
                          <Send className="w-3 h-3 mr-2" />
                          Enviar
                        </Button>
                      </Link>
                    )}
                    {user && (
                      <Button
                        size="sm"
                        onClick={() => toggleCompletion(activity.id)}
                        variant={completed ? "outline" : "default"}
                        className={`w-full ${completed ? 
                          "border-green-500 text-green-700 hover:bg-green-50" : 
                          "bg-[#1e3a5f] hover:bg-[#2d4a6f]"
                        }`}
                      >
                        <Check className="w-3 h-3 mr-2" />
                        {completed ? 'Pendente' : 'Concluída'}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
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
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <ClipboardList className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">
              {filterStatus === 'all' 
                ? 'Nenhuma atividade disponível no momento.' 
                : `Nenhuma atividade ${filterStatus === 'completed' ? 'concluída' : filterStatus === 'overdue' ? 'atrasada' : 'pendente'}.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
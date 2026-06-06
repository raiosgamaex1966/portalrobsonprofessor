import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { MessageSquare, Users, BookOpen, ArrowRight } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

export default function Forum() {
  const [disciplines, setDisciplines] = useState([]);
  const [topicCounts, setTopicCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      const currentUser = isAuth ? await base44.auth.me() : null;

      const [disciplinesData, topicsData] = await Promise.all([
        base44.entities.Discipline.filter({ is_active: true }),
        base44.entities.ForumTopic.list()
      ]);

      let filteredDisciplines = disciplinesData;
      let filteredTopics = topicsData;

      // Se for aluno, filtrar disciplinas e tópicos por turma
      if (currentUser && currentUser.role === 'user') {
        const classStudents = await base44.entities.ClassStudent.filter({ user_id: currentUser.id });
        const classIds = classStudents.map(cs => cs.class_id);
        
        // Obter disciplinas vinculadas às turmas do aluno
        const disciplineClasses = await base44.entities.DisciplineClass.list();
        const studentDisciplineIds = disciplineClasses
          .filter(dc => classIds.includes(dc.class_id))
          .map(dc => dc.discipline_id);
        
        // Filtrar disciplinas e tópicos
        filteredDisciplines = disciplinesData.filter(d => 
          studentDisciplineIds.includes(d.id)
        );
        
        filteredTopics = topicsData.filter(t => 
          studentDisciplineIds.includes(t.discipline_id)
        );
      }

      setDisciplines(filteredDisciplines);

      // Conta tópicos por disciplina
      const counts = {};
      filteredTopics.forEach(topic => {
        counts[topic.discipline_id] = (counts[topic.discipline_id] || 0) + 1;
      });
      setTopicCounts(counts);

      setLoading(false);
    } catch (error) {
      console.error('Error loading forum:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#d4a853] flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-[#1e3a5f]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Fórum de Discussão</h1>
                <p className="text-blue-200">Participe das discussões por disciplina</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {disciplines.map((discipline, index) => (
            <motion.div
              key={discipline.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={createPageUrl('ForumTopics') + `?discipline_id=${discipline.id}`}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 group overflow-hidden cursor-pointer">
                  <div className="h-2 bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f]" />
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <BookOpen className="w-7 h-7 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-300">
                          {topicCounts[discipline.id] || 0}
                        </div>
                        <div className="text-xs text-slate-500">tópicos</div>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-[#1e3a5f] transition-colors">
                      {discipline.name}
                    </h3>
                    {discipline.description && (
                      <p className="text-slate-500 text-sm mb-4 line-clamp-2">
                        {discipline.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-[#1e3a5f] group-hover:underline">
                      <span>Ver Discussões</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {disciplines.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Nenhuma disciplina cadastrada ainda.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
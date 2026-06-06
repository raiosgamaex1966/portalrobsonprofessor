import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { FileQuestion, Clock, Calendar, ArrowRight, BookOpen, FileEdit } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Tests() {
  const [tests, setTests] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      const currentUser = isAuth ? await base44.auth.me() : null;

      const [testsData, disciplinesData] = await Promise.all([
        base44.entities.Test.filter({ is_active: true }),
        base44.entities.Discipline.list()
      ]);

      // Se for aluno, filtrar testes por turma
      if (currentUser && currentUser.role === 'user') {
        const classStudents = await base44.entities.ClassStudent.filter({ user_id: currentUser.id });
        const classIds = classStudents.map(cs => cs.class_id);
        
        // Obter disciplinas vinculadas às turmas do aluno
        const disciplineClasses = await base44.entities.DisciplineClass.list();
        const studentDisciplineIds = disciplineClasses
          .filter(dc => classIds.includes(dc.class_id))
          .map(dc => dc.discipline_id);
        
        // Filtrar testes que pertencem às disciplinas das turmas do aluno
        const filteredTests = testsData.filter(t => 
          studentDisciplineIds.includes(t.discipline_id) &&
          (!t.class_id || classIds.includes(t.class_id))
        );
        
        // Filtrar disciplinas para mostrar apenas as das turmas do aluno
        const filteredDisciplines = disciplinesData.filter(d => 
          studentDisciplineIds.includes(d.id)
        );
        
        setTests(filteredTests);
        setDisciplines(filteredDisciplines);
      } else {
        setTests(testsData);
        setDisciplines(disciplinesData);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading tests:', error);
      setLoading(false);
    }
  };

  const getDisciplineName = (id) => {
    return disciplines.find(d => d.id === id)?.name || 'Sem disciplina';
  };

  const totalPages = Math.ceil(tests.length / ITEMS_PER_PAGE);
  const paginatedTests = tests.slice(
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
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-4">
              <FileQuestion className="w-4 h-4 text-[#d4a853]" />
              <span className="text-sm font-medium">Avaliações</span>
            </div>
            <h1 className="text-4xl font-bold mb-4">Testes Disponíveis</h1>
            <p className="text-blue-200 max-w-2xl">
              Avalie seus conhecimentos através dos testes disponíveis. Você precisará se identificar antes de iniciar.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Tests Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : tests.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedTests.map((test, index) => (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index % 6) * 0.05 }}
                className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 group"
              >
                <div className="h-2 bg-gradient-to-r from-[#d4a853] to-[#f0c674]" />
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-[#1e3a5f]/10 text-[#1e3a5f]">
                      {getDisciplineName(test.discipline_id)}
                    </Badge>
                    <Badge className={test.test_type === 'practical' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                      {test.test_type === 'practical' ? 'Prático' : 'Objetivo'}
                    </Badge>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-[#1e3a5f] transition-colors">
                    {test.title}
                  </h3>
                  
                  {test.description && (
                    <p className="text-slate-500 text-sm mb-4 line-clamp-2">
                      {test.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                    {test.test_type === 'objective' ? (
                      <div className="flex items-center gap-1">
                        <FileQuestion className="w-4 h-4" />
                        {test.questions?.length || 0} questões
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <FileEdit className="w-4 h-4" />
                        Trabalho Prático
                      </div>
                    )}
                    {test.time_limit_minutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {test.time_limit_minutes} min
                      </div>
                    )}
                  </div>
                  
                  {test.due_date && (
                    <div className="flex items-center gap-1 text-sm text-orange-500 mb-4">
                      <Calendar className="w-4 h-4" />
                      Prazo: {format(new Date(test.due_date), "d 'de' MMM, yyyy", { locale: ptBR })}
                    </div>
                  )}
                  
                  <Link to={`${createPageUrl('TakeTest')}?id=${test.id}`}>
                    <Button className="w-full bg-gradient-to-r from-[#d4a853] to-[#f0c674] hover:from-[#c49843] hover:to-[#e0b664] text-[#1e3a5f] hover:text-[#1e3a5f] font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
                      {test.test_type === 'practical' ? 'Enviar Trabalho' : 'Iniciar Teste'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
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
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <FileQuestion className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">Nenhum teste disponível no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
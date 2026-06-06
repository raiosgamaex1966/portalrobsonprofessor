import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import DisciplineCard from "@/components/materials/DisciplineCard";
import { BookOpen, Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Materials() {
  const [disciplines, setDisciplines] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      base44.auth.redirectToLogin(window.location.pathname);
      return;
    }

    const currentUser = await base44.auth.me();

    const [disciplinesData, materialsData] = await Promise.all([
      base44.entities.Discipline.filter({ is_active: true }),
      base44.entities.Material.filter({ is_active: true })
    ]);

    // Se for aluno, filtrar materiais por turma
    if (currentUser.role === 'user') {
      const classStudents = await base44.entities.ClassStudent.filter({ user_id: currentUser.id });
      const classIds = classStudents.map(cs => cs.class_id);
      
      // Obter disciplinas vinculadas às turmas do aluno
      const disciplineClasses = await base44.entities.DisciplineClass.list();
      const studentDisciplineIds = disciplineClasses
        .filter(dc => classIds.includes(dc.class_id))
        .map(dc => dc.discipline_id);
      
      // Filtrar materiais que pertencem às disciplinas das turmas do aluno
      const filteredMaterials = materialsData.filter(m => 
        studentDisciplineIds.includes(m.discipline_id) &&
        (!m.class_id || classIds.includes(m.class_id))
      );
      
      // Filtrar disciplinas para mostrar apenas as das turmas do aluno
      const filteredDisciplines = disciplinesData.filter(d => 
        studentDisciplineIds.includes(d.id)
      );
      
      setDisciplines(filteredDisciplines);
      setMaterials(filteredMaterials);
    } else {
      setDisciplines(disciplinesData);
      setMaterials(materialsData);
    }
    
    setLoading(false);
  };

  const getMaterialsCount = (disciplineId) => {
    return materials.filter(m => m.discipline_id === disciplineId).length;
  };

  const filteredDisciplines = disciplines.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.description?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredDisciplines.length / ITEMS_PER_PAGE);
  const paginatedDisciplines = filteredDisciplines.slice(
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
              <BookOpen className="w-4 h-4 text-[#d4a853]" />
              <span className="text-sm font-medium">Biblioteca</span>
            </div>
            <h1 className="text-4xl font-bold mb-4">Materiais de Aula</h1>
            <p className="text-blue-200 max-w-2xl">
              Acesse todos os materiais organizados por disciplina. Selecione uma disciplina para ver o conteúdo disponível.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-6 -mt-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Buscar disciplinas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 py-6 rounded-xl bg-white shadow-lg border-0 text-lg"
          />
        </div>
      </div>

      {/* Disciplines Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : filteredDisciplines.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedDisciplines.map((discipline, index) => (
                <DisciplineCard 
                  key={discipline.id} 
                  discipline={discipline} 
                  index={index}
                  materialsCount={getMaterialsCount(discipline.id)}
                />
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
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">
              {search ? 'Nenhuma disciplina encontrada.' : 'Nenhuma disciplina cadastrada ainda.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
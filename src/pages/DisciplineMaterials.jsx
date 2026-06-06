import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import MaterialCard from "@/components/materials/MaterialCard";
import { BookOpen, ArrowLeft, Search, Filter } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DisciplineMaterials() {
  const [discipline, setDiscipline] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [availableTags, setAvailableTags] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 6;

  const urlParams = new URLSearchParams(window.location.search);
  const disciplineId = urlParams.get('id');

  useEffect(() => {
    if (disciplineId) {
      loadData();
    }
  }, [disciplineId]);

  const loadData = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      base44.auth.redirectToLogin(window.location.pathname + window.location.search);
      return;
    }

    const [disciplinesData, allMaterials, user] = await Promise.all([
      base44.entities.Discipline.filter({ id: disciplineId }),
      base44.entities.Material.filter({ discipline_id: disciplineId, is_active: true }),
      base44.auth.me().catch(() => null)
    ]);

    setDiscipline(disciplinesData[0]);
    
    // Se for aluno, filtrar materiais por turma
    if (user && user.role === 'user') {
      const studentClasses = await base44.entities.ClassStudent.filter({ 
        user_id: user.id 
      });
      const classIds = studentClasses.map(c => c.class_id);
      
      // Mostrar materiais sem turma ou da turma do aluno
      const filteredMaterials = allMaterials.filter(m => 
        !m.class_id || classIds.includes(m.class_id)
      );
      setMaterials(filteredMaterials);
    } else {
      setMaterials(allMaterials);
    }
    
    // Extract unique tags
    const tags = new Set();
    allMaterials.forEach(m => {
      if (m.tags) {
        m.tags.forEach(tag => tags.add(tag));
      }
    });
    setAvailableTags(Array.from(tags).sort());
    
    setLoading(false);
  };

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase()) ||
                          m.description?.toLowerCase().includes(search.toLowerCase()) ||
                          m.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === 'all' || m.file_type === typeFilter;
    const matchesTag = tagFilter === 'all' || m.tags?.includes(tagFilter);
    return matchesSearch && matchesType && matchesTag;
  });

  const totalPages = Math.ceil(filteredMaterials.length / ITEMS_PER_PAGE);
  const paginatedMaterials = filteredMaterials.slice(
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

  if (!discipline) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 mb-4">Disciplina não encontrada</p>
          <Link to={createPageUrl('Materials')}>
            <Button>Voltar para Materiais</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <Link to={createPageUrl('Materials')} className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para disciplinas
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold mb-2">{discipline.name}</h1>
            {discipline.description && (
              <p className="text-blue-200 max-w-2xl">{discipline.description}</p>
            )}
          </motion.div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Buscar por título, descrição ou tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 rounded-xl bg-white border-slate-200"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-48 rounded-xl bg-white">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="docx">Word</SelectItem>
              <SelectItem value="xlsx">Excel</SelectItem>
              <SelectItem value="image">Imagem</SelectItem>
              <SelectItem value="video">Vídeo</SelectItem>
              <SelectItem value="link">Link</SelectItem>
              <SelectItem value="text">Texto</SelectItem>
            </SelectContent>
          </Select>
          {availableTags.length > 0 && (
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-full sm:w-48 rounded-xl bg-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as tags</SelectItem>
                {availableTags.map(tag => (
                  <SelectItem key={tag} value={tag}>#{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Materials List */}
        {filteredMaterials.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedMaterials.map((material, index) => (
                <MaterialCard key={material.id} material={material} index={index} />
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
            <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">
              {search || typeFilter !== 'all' 
                ? 'Nenhum material encontrado com os filtros aplicados.' 
                : 'Nenhum material disponível nesta disciplina ainda.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Calendar, BookOpen, Tag as TagIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MaterialView() {
  const [material, setMaterial] = useState(null);
  const [discipline, setDiscipline] = useState(null);
  const [loading, setLoading] = useState(true);

  const urlParams = new URLSearchParams(window.location.search);
  const materialId = urlParams.get('id');

  useEffect(() => {
    if (materialId) {
      loadMaterial();
    }
  }, [materialId]);

  const loadMaterial = async () => {
    const materialsData = await base44.entities.Material.filter({ id: materialId });
    const mat = materialsData[0];
    
    if (mat) {
      setMaterial(mat);
      
      if (mat.discipline_id) {
        const disciplinesData = await base44.entities.Discipline.filter({ id: mat.discipline_id });
        setDiscipline(disciplinesData[0]);
      }
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!material) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 mb-4">Material não encontrado</p>
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
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-8 px-6">
        <div className="max-w-4xl mx-auto">
          <Link 
            to={discipline ? `${createPageUrl('DisciplineMaterials')}?id=${discipline.id}` : createPageUrl('Materials')} 
            className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para {discipline?.name || 'Materiais'}
          </Link>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold mb-2">{material.title}</h1>
            
            <div className="flex flex-wrap items-center gap-3 text-sm text-blue-200">
              {discipline && (
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {discipline.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(material.created_date), "d 'de' MMMM, yyyy", { locale: ptBR })}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Description */}
          {material.description && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-slate-700">{material.description}</p>
            </div>
          )}

          {/* Tags */}
          {material.tags && material.tags.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <TagIcon className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-600">Tags:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {material.tags.map((tag, i) => (
                  <span 
                    key={i} 
                    className="px-3 py-1 bg-[#d4a853]/10 text-[#d4a853] rounded-full text-sm font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
            {material.content ? (
              <div 
                className="prose prose-slate max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-a:text-[#1e3a5f] prose-strong:text-slate-800 prose-code:text-[#d4a853] prose-pre:bg-slate-900"
                dangerouslySetInnerHTML={{ __html: material.content }}
              />
            ) : (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Conteúdo não disponível</p>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="mt-6 text-center text-sm text-slate-500">
            <p>Material criado por {material.created_by || 'Administrador'}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
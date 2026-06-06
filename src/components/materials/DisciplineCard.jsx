import React from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, Calculator, Microscope, Globe, Palette, 
  Music, Dumbbell, Code, BookMarked, Atom, Languages,
  History, Scale, HeartPulse
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";

const iconMap = {
  BookOpen, Calculator, Microscope, Globe, Palette,
  Music, Dumbbell, Code, BookMarked, Atom, Languages,
  History, Scale, HeartPulse
};

export default function DisciplineCard({ discipline, index, materialsCount }) {
  const IconComponent = iconMap[discipline.icon] || BookOpen;
  
  const colors = [
    { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-50' },
    { bg: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50' },
    { bg: 'from-purple-500 to-purple-600', light: 'bg-purple-50' },
    { bg: 'from-orange-500 to-orange-600', light: 'bg-orange-50' },
    { bg: 'from-rose-500 to-rose-600', light: 'bg-rose-50' },
    { bg: 'from-cyan-500 to-cyan-600', light: 'bg-cyan-50' },
  ];

  const colorSet = colors[index % colors.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -5 }}
    >
      <Link to={`${createPageUrl('DisciplineMaterials')}?id=${discipline.id}`}>
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100 group">
          <div className={`h-2 bg-gradient-to-r ${colorSet.bg}`} />
          <div className="p-6">
            <div className={`w-14 h-14 rounded-xl ${colorSet.light} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
              <IconComponent className={`w-7 h-7 text-${colorSet.bg.split('-')[1]}-600`} />
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-[#1e3a5f] transition-colors">
              {discipline.name}
            </h3>
            
            {discipline.description && (
              <p className="text-slate-500 text-sm mb-4 line-clamp-2">
                {discipline.description}
              </p>
            )}
            
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-sm text-slate-400">
                {materialsCount} {materialsCount === 1 ? 'material' : 'materiais'}
              </span>
              <span className="text-sm font-medium text-[#1e3a5f] group-hover:text-[#d4a853] group-hover:translate-x-1 transition-all duration-300">
                Acessar →
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
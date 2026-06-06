import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Video, Link as LinkIcon, File, Presentation, Download, ExternalLink, Calendar, FileSpreadsheet, Image as ImageIcon, AlignLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createPageUrl } from "@/utils";

const typeConfig = {
  pdf: { icon: FileText, color: 'bg-red-100 text-red-600', label: 'PDF' },
  docx: { icon: File, color: 'bg-blue-100 text-blue-600', label: 'Word' },
  xlsx: { icon: FileSpreadsheet, color: 'bg-green-100 text-green-600', label: 'Excel' },
  image: { icon: ImageIcon, color: 'bg-purple-100 text-purple-600', label: 'Imagem' },
  video: { icon: Video, color: 'bg-pink-100 text-pink-600', label: 'Vídeo' },
  link: { icon: LinkIcon, color: 'bg-cyan-100 text-cyan-600', label: 'Link' },
  text: { icon: AlignLeft, color: 'bg-amber-100 text-amber-600', label: 'Texto' },
};

export default function MaterialCard({ material, index }) {
  const config = typeConfig[material.file_type] || typeConfig.document;
  const IconComponent = config.icon;

  const handleAccess = () => {
    if (material.file_type === 'text') {
      window.location.href = `${window.location.origin}${createPageUrl('MaterialView')}?id=${material.id}`;
    } else if (material.file_url) {
      window.open(material.file_url, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (index % 6) * 0.05 }}
      className="bg-white rounded-xl border border-slate-200 hover:border-[#d4a853]/50 hover:shadow-lg transition-all duration-300 overflow-hidden group h-full flex flex-col"
    >
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start gap-4 flex-1">
          <div className={`w-12 h-12 rounded-xl ${config.color} flex items-center justify-center flex-shrink-0`}>
            <IconComponent className="w-6 h-6" />
          </div>
          
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-800 group-hover:text-[#1e3a5f] transition-colors line-clamp-2">
                {material.title}
              </h3>
              <Badge variant="secondary" className={`${config.color} flex-shrink-0`}>
                {config.label}
              </Badge>
            </div>
            
            {material.description && (
              <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                {material.description}
              </p>
            )}
            
            {material.tags && material.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {material.tags.slice(0, 3).map((tag, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 bg-[#d4a853]/10 text-[#d4a853] rounded-full">
                    #{tag}
                  </span>
                ))}
                {material.tags.length > 3 && (
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                    +{material.tags.length - 3}
                  </span>
                )}
              </div>
            )}
            
            <div className="flex items-center justify-between mt-auto pt-4">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Calendar className="w-3 h-3" />
                {format(new Date(material.created_date), "d 'de' MMM, yyyy", { locale: ptBR })}
              </div>
              
              <Button 
                size="sm" 
                onClick={handleAccess}
                className="bg-[#1e3a5f] hover:bg-[#2d4a6f] rounded-lg"
              >
                {material.file_type === 'text' ? (
                  <>
                    <AlignLeft className="w-4 h-4 mr-1" />
                    Ler
                  </>
                ) : material.file_type === 'link' ? (
                  <>
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Acessar
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-1" />
                    Baixar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
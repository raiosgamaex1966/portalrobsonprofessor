import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Video, ExternalLink, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";

export default function StudentVideos() {
  const [videos, setVideos] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiscipline, setSelectedDiscipline] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        base44.auth.redirectToLogin(createPageUrl('StudentVideos'));
        return;
      }

      const currentUser = await base44.auth.me();
      
      // Carregar turmas do aluno
      const classStudents = await base44.entities.ClassStudent.filter({ user_id: currentUser.id });
      const classIds = classStudents.map(cs => cs.class_id);

      // Obter disciplinas das turmas do aluno
      const disciplineClasses = await base44.entities.DisciplineClass.list();
      const studentDisciplineIds = disciplineClasses
        .filter(dc => classIds.includes(dc.class_id))
        .map(dc => dc.discipline_id);

      // Carregar disciplinas e vídeos
      const [allDisciplines, allVideos] = await Promise.all([
        base44.entities.Discipline.list(),
        base44.entities.VideoResource.filter({ is_active: true })
      ]);

      // Filtrar disciplinas e vídeos do aluno
      const studentDisciplines = allDisciplines.filter(d => 
        studentDisciplineIds.includes(d.id)
      );
      const studentVideos = allVideos.filter(v => 
        studentDisciplineIds.includes(v.discipline_id)
      );

      setDisciplines(studentDisciplines);
      setVideos(studentVideos);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDisciplineName = (disciplineId) => {
    const disc = disciplines.find(d => d.id === disciplineId);
    return disc ? disc.name : 'Disciplina';
  };

  const filteredVideos = selectedDiscipline === 'all' 
    ? videos 
    : videos.filter(v => v.discipline_id === selectedDiscipline);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f] mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando vídeos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1e3a5f] flex items-center gap-3 mb-2">
            <Video className="w-8 h-8" />
            Vídeos Educacionais
          </h1>
          <p className="text-gray-600">Assista aos vídeos das suas disciplinas</p>
        </div>

        {/* Discipline Filter */}
        {disciplines.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedDiscipline('all')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedDiscipline === 'all'
                  ? 'bg-[#1e3a5f] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Todas as Disciplinas
            </button>
            {disciplines.map(disc => (
              <button
                key={disc.id}
                onClick={() => setSelectedDiscipline(disc.id)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  selectedDiscipline === disc.id
                    ? 'bg-[#1e3a5f] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {disc.name}
              </button>
            ))}
          </div>
        )}

        {/* Videos Grid */}
        {filteredVideos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Video className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                {selectedDiscipline === 'all' 
                  ? 'Nenhum vídeo disponível ainda'
                  : 'Nenhum vídeo nesta disciplina'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <a
                  href={video.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full"
                >
                  <Card className="h-full hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-[#1e3a5f] group">
                    {video.thumbnail_url ? (
                      <div className="relative h-48 overflow-hidden rounded-t-xl">
                        <img 
                          src={video.thumbnail_url} 
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                            <Play className="w-8 h-8 text-[#1e3a5f] ml-1" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-48 bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center rounded-t-xl relative overflow-hidden">
                        <Video className="w-16 h-16 text-white/30 absolute" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
                          <div className="w-16 h-16 rounded-full bg-white/0 group-hover:bg-white/90 flex items-center justify-center transition-all">
                            <Play className="w-8 h-8 text-white group-hover:text-[#1e3a5f] ml-1 transition-colors" />
                          </div>
                        </div>
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-lg group-hover:text-[#1e3a5f] transition-colors line-clamp-2">
                        {video.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {video.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {video.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <Badge className="bg-[#1e3a5f] text-white">
                          {getDisciplineName(video.discipline_id)}
                        </Badge>
                        {video.duration && (
                          <span className="text-sm text-gray-500">{video.duration}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-3 text-sm text-blue-600">
                        <ExternalLink className="w-4 h-4" />
                        Assistir vídeo
                      </div>
                    </CardContent>
                  </Card>
                </a>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
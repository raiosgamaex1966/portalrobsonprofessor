import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { MessageSquare, Trash2, Lock, Unlock, Pin, PinOff, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminForum() {
  const [user, setUser] = useState(null);
  const [disciplines, setDisciplines] = useState([]);
  const [topics, setTopics] = useState([]);
  const [filteredTopics, setFilteredTopics] = useState([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedDiscipline === 'all') {
      setFilteredTopics(topics);
    } else {
      setFilteredTopics(topics.filter(t => t.discipline_id === selectedDiscipline));
    }
  }, [selectedDiscipline, topics]);

  const loadData = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        window.location.replace(createPageUrl('Home'));
        return;
      }

      const currentUser = await base44.auth.me();
      if (!currentUser || currentUser.role !== 'admin') {
        window.location.replace(createPageUrl('Home'));
        return;
      }

      setUser(currentUser);

      const [disciplinesData, topicsData] = await Promise.all([
        base44.entities.Discipline.list(),
        base44.entities.ForumTopic.list()
      ]);

      setDisciplines(disciplinesData);
      
      // Ordena por data de criação (mais recentes primeiro)
      const sorted = topicsData.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      );
      setTopics(sorted);
      setFilteredTopics(sorted);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDisciplineName = (disciplineId) => {
    const discipline = disciplines.find(d => d.id === disciplineId);
    return discipline?.name || 'N/A';
  };

  const handleToggleLock = async (topic) => {
    try {
      await base44.entities.ForumTopic.update(topic.id, {
        is_locked: !topic.is_locked
      });
      await loadData();
    } catch (error) {
      alert('Erro ao atualizar: ' + error.message);
    }
  };

  const handleTogglePin = async (topic) => {
    try {
      await base44.entities.ForumTopic.update(topic.id, {
        is_pinned: !topic.is_pinned
      });
      await loadData();
    } catch (error) {
      alert('Erro ao atualizar: ' + error.message);
    }
  };

  const handleDeleteTopic = async (topic) => {
    if (!confirm(`Tem certeza que deseja excluir o tópico "${topic.title}"? Todas as respostas também serão excluídas.`)) return;

    try {
      // Deleta respostas
      const replies = await base44.entities.ForumReply.filter({ topic_id: topic.id });
      for (const reply of replies) {
        await base44.entities.ForumReply.delete(reply.id);
      }

      // Deleta seguimentos
      const follows = await base44.entities.TopicFollow.filter({ topic_id: topic.id });
      for (const follow of follows) {
        await base44.entities.TopicFollow.delete(follow.id);
      }

      // Deleta tópico
      await base44.entities.ForumTopic.delete(topic.id);
      
      await loadData();
    } catch (error) {
      alert('Erro ao excluir: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
            <p className="text-slate-600 mb-4">Esta área é exclusiva para administradores.</p>
            <Link to={createPageUrl('Home')} className="text-[#1e3a5f] hover:underline">
              Voltar para Home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <Link to={createPageUrl('Admin')} className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Painel
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Moderar Fórum</h1>
              <p className="text-blue-200">Gerenciar tópicos e discussões</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Filtro */}
        <div className="mb-6">
          <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filtrar por disciplina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as disciplinas</SelectItem>
              {disciplines.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lista de Tópicos */}
        <div className="space-y-4">
          {filteredTopics.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Nenhum tópico encontrado.</p>
              </CardContent>
            </Card>
          ) : (
            filteredTopics.map((topic, index) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{getDisciplineName(topic.discipline_id)}</Badge>
                          {topic.is_pinned && (
                            <Badge variant="outline" className="border-[#d4a853] text-[#d4a853]">
                              <Pin className="w-3 h-3 mr-1" />
                              Fixado
                            </Badge>
                          )}
                          {topic.is_locked && (
                            <Badge variant="outline" className="border-red-600 text-red-600">
                              <Lock className="w-3 h-3 mr-1" />
                              Bloqueado
                            </Badge>
                          )}
                          {topic.is_resolved && (
                            <Badge variant="outline" className="border-green-600 text-green-600">
                              Resolvido
                            </Badge>
                          )}
                        </div>

                        <Link to={createPageUrl('ForumTopic') + `?id=${topic.id}`}>
                          <h3 className="text-lg font-bold text-slate-800 hover:text-[#1e3a5f] transition-colors mb-2">
                            {topic.title}
                          </h3>
                        </Link>

                        <p className="text-slate-600 text-sm mb-3 line-clamp-2">
                          {topic.content}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>Por {topic.author_name}</span>
                          <span>•</span>
                          <span>{topic.reply_count || 0} respostas</span>
                          <span>•</span>
                          <span>{new Date(topic.created_date).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTogglePin(topic)}
                          className={topic.is_pinned ? 'border-[#d4a853] text-[#d4a853]' : ''}
                          title={topic.is_pinned ? 'Desafixar' : 'Fixar'}
                        >
                          {topic.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleLock(topic)}
                          className={topic.is_locked ? 'border-red-600 text-red-600' : ''}
                          title={topic.is_locked ? 'Desbloquear' : 'Bloquear'}
                        >
                          {topic.is_locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTopic(topic)}
                          className="text-red-600 hover:bg-red-50 border-red-200"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { MessageSquare, Plus, Pin, Lock, CheckCircle2, Clock, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function ForumTopics() {
  const [user, setUser] = useState(null);
  const [discipline, setDiscipline] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: '', content: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const disciplineId = urlParams.get('discipline_id');

    if (!disciplineId) {
      window.location.href = createPageUrl('Forum');
      return;
    }

    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    }

    const [disciplineData, topicsData] = await Promise.all([
      base44.entities.Discipline.get(disciplineId),
      base44.entities.ForumTopic.filter({ discipline_id: disciplineId })
    ]);

    setDiscipline(disciplineData);
    
    // Ordena: fixados primeiro, depois por última resposta
    const sorted = topicsData.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      const dateA = new Date(a.last_reply_at || a.created_date);
      const dateB = new Date(b.last_reply_at || b.created_date);
      return dateB - dateA;
    });
    
    setTopics(sorted);
    setLoading(false);
  };

  const handleCreateTopic = async () => {
    if (!newTopic.title.trim() || !newTopic.content.trim()) return;
    if (!user) {
      alert('Você precisa estar logado para criar um tópico');
      return;
    }

    setCreating(true);
    try {
      await base44.entities.ForumTopic.create({
        title: newTopic.title,
        content: newTopic.content,
        discipline_id: discipline.id,
        author_name: user.full_name,
        author_email: user.email,
        reply_count: 0
      });

      setDialogOpen(false);
      setNewTopic({ title: '', content: '' });
      await loadData();
    } catch (error) {
      alert('Erro ao criar tópico: ' + error.message);
    } finally {
      setCreating(false);
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
          <Link to={createPageUrl('Forum')} className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Fórum
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{discipline?.name}</h1>
              <p className="text-blue-200">{topics.length} tópico(s) de discussão</p>
            </div>

            {user && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#d4a853] hover:bg-[#c49743] text-[#1e3a5f]">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Tópico
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Tópico</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Título</Label>
                      <Input
                        placeholder="Título do tópico"
                        value={newTopic.title}
                        onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Conteúdo</Label>
                      <Textarea
                        placeholder="Descreva sua dúvida ou discussão..."
                        value={newTopic.content}
                        onChange={(e) => setNewTopic({ ...newTopic, content: e.target.value })}
                        rows={6}
                      />
                    </div>
                    <Button 
                      onClick={handleCreateTopic} 
                      disabled={creating || !newTopic.title.trim() || !newTopic.content.trim()}
                      className="w-full bg-[#1e3a5f] hover:bg-[#2d4a6f]"
                    >
                      {creating ? 'Criando...' : 'Criar Tópico'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="space-y-4">
          {topics.map((topic, index) => (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={createPageUrl('ForumTopic') + `?id=${topic.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-6 h-6 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-2">
                          <h3 className="text-lg font-bold text-slate-800 hover:text-[#1e3a5f] transition-colors">
                            {topic.title}
                          </h3>
                          {topic.is_pinned && (
                            <Badge variant="outline" className="border-[#d4a853] text-[#d4a853]">
                              <Pin className="w-3 h-3 mr-1" />
                              Fixado
                            </Badge>
                          )}
                          {topic.is_resolved && (
                            <Badge variant="outline" className="border-green-600 text-green-600">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Resolvido
                            </Badge>
                          )}
                          {topic.is_locked && (
                            <Badge variant="outline" className="border-red-600 text-red-600">
                              <Lock className="w-3 h-3 mr-1" />
                              Bloqueado
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-slate-600 text-sm mb-3 line-clamp-2">
                          {topic.content}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>Por {topic.author_name}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {topic.reply_count} respostas
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(topic.last_reply_at || topic.created_date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {topics.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">Nenhum tópico criado ainda nesta disciplina.</p>
              {user && (
                <Button 
                  onClick={() => setDialogOpen(true)}
                  className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Tópico
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
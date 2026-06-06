import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { 
  MessageSquare, ArrowLeft, CheckCircle2, Lock, Pin, 
  Trash2, Bell, BellOff, Send, Shield 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from 'react-markdown';

export default function ForumTopic() {
  const [user, setUser] = useState(null);
  const [topic, setTopic] = useState(null);
  const [discipline, setDiscipline] = useState(null);
  const [replies, setReplies] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const topicId = urlParams.get('id');

    if (!topicId) {
      window.location.href = createPageUrl('Forum');
      return;
    }

    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Verifica se está seguindo
      const follows = await base44.entities.TopicFollow.filter({ 
        topic_id: topicId, 
        user_email: currentUser.email 
      });
      setIsFollowing(follows.length > 0);
    } catch (error) {
      setUser(null);
    }

    const [topicData, repliesData] = await Promise.all([
      base44.entities.ForumTopic.get(topicId),
      base44.entities.ForumReply.filter({ topic_id: topicId })
    ]);

    setTopic(topicData);
    
    const disciplineData = await base44.entities.Discipline.get(topicData.discipline_id);
    setDiscipline(disciplineData);

    // Filtra respostas não deletadas e ordena por data
    const activeReplies = repliesData
      .filter(r => !r.is_deleted)
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    setReplies(activeReplies);

    setLoading(false);
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !user) return;

    setSubmitting(true);
    try {
      await base44.entities.ForumReply.create({
        topic_id: topic.id,
        content: replyContent,
        author_name: user.full_name,
        author_email: user.email
      });

      // Atualiza contador e data da última resposta
      await base44.entities.ForumTopic.update(topic.id, {
        reply_count: (topic.reply_count || 0) + 1,
        last_reply_at: new Date().toISOString()
      });

      // Notifica seguidores
      try {
        await base44.functions.invoke('notifyTopicFollowers', {
          topic_id: topic.id,
          reply_author_email: user.email,
          reply_author_name: user.full_name
        });
      } catch (error) {
        console.error('Erro ao notificar seguidores:', error);
      }

      setReplyContent('');
      await loadData();
    } catch (error) {
      alert('Erro ao enviar resposta: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!user) return;

    try {
      if (isFollowing) {
        const follows = await base44.entities.TopicFollow.filter({ 
          topic_id: topic.id, 
          user_email: user.email 
        });
        if (follows.length > 0) {
          await base44.entities.TopicFollow.delete(follows[0].id);
        }
        setIsFollowing(false);
      } else {
        await base44.entities.TopicFollow.create({
          topic_id: topic.id,
          user_email: user.email
        });
        setIsFollowing(true);
      }
    } catch (error) {
      alert('Erro ao atualizar seguimento: ' + error.message);
    }
  };

  const handleToggleResolved = async () => {
    if (!user) return;
    try {
      await base44.entities.ForumTopic.update(topic.id, {
        is_resolved: !topic.is_resolved
      });
      await loadData();
    } catch (error) {
      alert('Erro ao atualizar status: ' + error.message);
    }
  };

  const handleToggleLock = async () => {
    if (!user || user.role !== 'admin') return;
    try {
      await base44.entities.ForumTopic.update(topic.id, {
        is_locked: !topic.is_locked
      });
      await loadData();
    } catch (error) {
      alert('Erro ao bloquear/desbloquear: ' + error.message);
    }
  };

  const handleTogglePin = async () => {
    if (!user || user.role !== 'admin') return;
    try {
      await base44.entities.ForumTopic.update(topic.id, {
        is_pinned: !topic.is_pinned
      });
      await loadData();
    } catch (error) {
      alert('Erro ao fixar/desafixar: ' + error.message);
    }
  };

  const handleDeleteReply = async (replyId) => {
    if (!user || user.role !== 'admin') return;
    if (!confirm('Tem certeza que deseja deletar esta resposta?')) return;

    try {
      await base44.entities.ForumReply.update(replyId, { is_deleted: true });
      await loadData();
    } catch (error) {
      alert('Erro ao deletar resposta: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAuthor = user && user.email === topic.author_email;
  const isAdmin = user && user.role === 'admin';
  const canModerate = isAuthor || isAdmin;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <Link 
            to={createPageUrl('ForumTopics') + `?discipline_id=${discipline?.id}`} 
            className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para {discipline?.name}
          </Link>
          <h1 className="text-3xl font-bold">{topic.title}</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Tópico Principal */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
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

              {user && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleFollow}
                    className={isFollowing ? 'border-[#1e3a5f] text-[#1e3a5f]' : ''}
                  >
                    {isFollowing ? (
                      <>
                        <BellOff className="w-4 h-4 mr-2" />
                        Seguindo
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4 mr-2" />
                        Seguir
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            <div className="prose max-w-none mb-4">
              <ReactMarkdown>{topic.content}</ReactMarkdown>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
              <span className="font-medium">{topic.author_name}</span>
              <span>•</span>
              <span>{new Date(topic.created_date).toLocaleDateString('pt-BR')} às {new Date(topic.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            {canModerate && (
              <div className="flex gap-2 pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleResolved}
                  className={topic.is_resolved ? 'border-green-600 text-green-600' : ''}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {topic.is_resolved ? 'Marcar como Não Resolvido' : 'Marcar como Resolvido'}
                </Button>
                
                {isAdmin && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleLock}
                      className={topic.is_locked ? 'border-red-600 text-red-600' : ''}
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      {topic.is_locked ? 'Desbloquear' : 'Bloquear'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTogglePin}
                      className={topic.is_pinned ? 'border-[#d4a853] text-[#d4a853]' : ''}
                    >
                      <Pin className="w-4 h-4 mr-2" />
                      {topic.is_pinned ? 'Desafixar' : 'Fixar'}
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Respostas */}
        <div className="space-y-4 mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {replies.length} {replies.length === 1 ? 'Resposta' : 'Respostas'}
          </h2>

          {replies.map((reply, index) => (
            <motion.div
              key={reply.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{reply.author_name}</span>
                      {reply.author_email === topic.author_email && (
                        <Badge variant="outline" className="text-xs">Autor</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {new Date(reply.created_date).toLocaleDateString('pt-BR')} às {new Date(reply.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteReply(reply.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="prose max-w-none">
                    <ReactMarkdown>{reply.content}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Formulário de Resposta */}
        {user && !topic.is_locked ? (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold text-slate-800 mb-4">Sua Resposta</h3>
              <Textarea
                placeholder="Escreva sua resposta..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={6}
                className="mb-4"
              />
              <Button
                onClick={handleSubmitReply}
                disabled={submitting || !replyContent.trim()}
                className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
              >
                {submitting ? (
                  'Enviando...'
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Resposta
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : topic.is_locked ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Lock className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="text-slate-500">Este tópico está bloqueado para novas respostas.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-slate-500 mb-4">Faça login para participar da discussão</p>
              <Button
                onClick={() => base44.auth.redirectToLogin()}
                className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
              >
                Fazer Login
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
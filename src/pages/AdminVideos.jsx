import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Pencil, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function AdminVideos() {
  const [videos, setVideos] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    discipline_id: '',
    thumbnail_url: '',
    duration: '',
    order: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [videosData, disciplinesData] = await Promise.all([
        base44.entities.VideoResource.list('-created_date'),
        base44.entities.Discipline.filter({ is_active: true })
      ]);
      setVideos(videosData);
      setDisciplines(disciplinesData);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (video = null) => {
    if (video) {
      setEditingVideo(video);
      setFormData({
        title: video.title,
        description: video.description || '',
        video_url: video.video_url,
        discipline_id: video.discipline_id,
        thumbnail_url: video.thumbnail_url || '',
        duration: video.duration || '',
        order: video.order || 0
      });
    } else {
      setEditingVideo(null);
      setFormData({
        title: '',
        description: '',
        video_url: '',
        discipline_id: '',
        thumbnail_url: '',
        duration: '',
        order: 0
      });
    }
    setShowDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingVideo) {
        await base44.entities.VideoResource.update(editingVideo.id, formData);
        toast.success('Vídeo atualizado!');
      } else {
        await base44.entities.VideoResource.create(formData);
        toast.success('Vídeo adicionado!');
      }
      loadData();
      setShowDialog(false);
    } catch (error) {
      toast.error('Erro ao salvar vídeo');
    }
  };

  const handleToggleActive = async (video) => {
    try {
      await base44.entities.VideoResource.update(video.id, {
        is_active: !video.is_active
      });
      toast.success(video.is_active ? 'Vídeo desativado' : 'Vídeo ativado');
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente excluir este vídeo?')) return;
    try {
      await base44.entities.VideoResource.delete(id);
      toast.success('Vídeo excluído!');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir vídeo');
    }
  };

  const getDisciplineName = (disciplineId) => {
    const disc = disciplines.find(d => d.id === disciplineId);
    return disc ? disc.name : 'Sem disciplina';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f] mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1e3a5f] flex items-center gap-3">
              <Video className="w-8 h-8" />
              Gerenciar Vídeos
            </h1>
            <p className="text-gray-600 mt-2">Adicione vídeos educacionais para os alunos</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Vídeo
          </Button>
        </div>

        {videos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Video className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">Nenhum vídeo cadastrado ainda</p>
              <Button onClick={() => handleOpenDialog()} className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeiro Vídeo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`${!video.is_active ? 'opacity-60' : ''}`}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-start justify-between">
                      <span className="flex-1">{video.title}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(video)}
                          className="h-8 w-8"
                        >
                          {video.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(video)}
                          className="h-8 w-8"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(video.id)}
                          className="h-8 w-8 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">{video.description}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="px-2 py-1 bg-[#1e3a5f] text-white rounded text-xs">
                          {getDisciplineName(video.discipline_id)}
                        </span>
                        {video.duration && (
                          <span className="text-gray-500">{video.duration}</span>
                        )}
                      </div>
                      <a
                        href={video.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline block truncate"
                      >
                        {video.video_url}
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingVideo ? 'Editar Vídeo' : 'Adicionar Vídeo'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label>Título *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label>URL do Vídeo *</Label>
                <Input
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                  required
                />
              </div>

              <div>
                <Label>Disciplina *</Label>
                <Select
                  value={formData.discipline_id}
                  onValueChange={(value) => setFormData({ ...formData, discipline_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a disciplina" />
                  </SelectTrigger>
                  <SelectContent>
                    {disciplines.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Duração (opcional)</Label>
                  <Input
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="10:30"
                  />
                </div>
                <div>
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label>URL da Thumbnail (opcional)</Label>
                <Input
                  type="url"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
                  {editingVideo ? 'Atualizar' : 'Adicionar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { MessageSquare, ArrowLeft, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminForumCreate() {
  const [user, setUser] = useState(null);
  const [disciplines, setDisciplines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    discipline_id: '',
    is_pinned: false
  });

  useEffect(() => {
    loadData();
  }, []);

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

      const disciplinesData = await base44.entities.Discipline.filter({ is_active: true });
      setDisciplines(disciplinesData);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim() || !formData.discipline_id) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    setCreating(true);
    try {
      const topic = await base44.entities.ForumTopic.create({
        title: formData.title,
        content: formData.content,
        discipline_id: formData.discipline_id,
        author_name: user.full_name,
        author_email: user.email,
        is_pinned: formData.is_pinned,
        reply_count: 0
      });

      alert('Tópico criado com sucesso!');
      window.location.href = createPageUrl('ForumTopic') + `?id=${topic.id}`;
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

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
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
        <div className="max-w-4xl mx-auto">
          <Link to={createPageUrl('Admin')} className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Painel
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#d4a853] flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-[#1e3a5f]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Criar Tópico no Fórum</h1>
              <p className="text-blue-200">Inicie uma nova discussão para os alunos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <Card>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label>Disciplina *</Label>
                <Select
                  value={formData.discipline_id}
                  onValueChange={(value) => setFormData({ ...formData, discipline_id: value })}
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

              <div>
                <Label>Título *</Label>
                <Input
                  placeholder="Título do tópico"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Conteúdo *</Label>
                <Textarea
                  placeholder="Descreva o tópico de discussão... (suporta Markdown)"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={10}
                  required
                />
                <p className="text-xs text-slate-500 mt-2">
                  Dica: Você pode usar Markdown para formatar o texto (negrito, itálico, listas, etc.)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="pinned"
                  checked={formData.is_pinned}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_pinned: checked })}
                />
                <Label htmlFor="pinned" className="cursor-pointer">
                  Fixar tópico (aparecerá no topo da lista)
                </Label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={creating}
                  className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
                >
                  {creating ? (
                    'Criando...'
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Tópico
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.history.back()}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
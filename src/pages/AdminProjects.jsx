import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Code2, Plus, Edit, Trash2, ExternalLink, FileCode, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminProjects() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'web',
    technologies: '',
    repository_url: '',
    demo_url: '',
    thumbnail_url: '',
    is_active: true
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
      await loadProjects();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    const allProjects = await base44.entities.Project.list('-created_date');
    setProjects(allProjects);
  };

  const handleOpenDialog = (project = null) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name,
        description: project.description,
        category: project.category || 'web',
        technologies: project.technologies?.join(', ') || '',
        repository_url: project.repository_url || '',
        demo_url: project.demo_url || '',
        thumbnail_url: project.thumbnail_url || '',
        is_active: project.is_active !== false
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: '',
        description: '',
        category: 'web',
        technologies: '',
        repository_url: '',
        demo_url: '',
        thumbnail_url: '',
        is_active: true
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const techArray = formData.technologies
        .split(',')
        .map(t => t.trim())
        .filter(t => t);

      const data = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        technologies: techArray,
        repository_url: formData.repository_url || null,
        demo_url: formData.demo_url || null,
        thumbnail_url: formData.thumbnail_url || null,
        is_active: formData.is_active
      };

      if (editingProject) {
        await base44.entities.Project.update(editingProject.id, data);
      } else {
        await base44.entities.Project.create(data);
      }

      setDialogOpen(false);
      loadProjects();
    } catch (error) {
      alert('Erro ao salvar projeto: ' + error.message);
    }
  };

  const handleDelete = async (projectId) => {
    if (!confirm('Deseja realmente excluir este projeto e todos os seus arquivos?')) return;
    
    try {
      const files = await base44.entities.ProjectFile.filter({ project_id: projectId });
      for (const file of files) {
        await base44.entities.ProjectFile.delete(file.id);
      }
      await base44.entities.Project.delete(projectId);
      loadProjects();
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
            <p className="text-slate-600">Acesso restrito a administradores.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categoryColors = {
    web: 'bg-blue-100 text-blue-700',
    mobile: 'bg-green-100 text-green-700',
    desktop: 'bg-purple-100 text-purple-700',
    backend: 'bg-orange-100 text-orange-700',
    fullstack: 'bg-indigo-100 text-indigo-700',
    outros: 'bg-slate-100 text-slate-700'
  };

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
              <h1 className="text-3xl font-bold mb-2">Gerenciar Projetos</h1>
              <p className="text-blue-200">Adicionar e editar projetos de teste de software</p>
            </div>
            <Button onClick={() => handleOpenDialog()} className="bg-[#d4a853] hover:bg-[#c49743] text-[#1e3a5f]">
              <Plus className="w-4 h-4 mr-2" />
              Novo Projeto
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {projects.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Code2 className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Nenhum projeto cadastrado ainda.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  {project.thumbnail_url && (
                    <img
                      src={project.thumbnail_url}
                      alt={project.name}
                      className="w-full h-48 object-cover rounded-t-xl"
                    />
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <Badge className={categoryColors[project.category || 'web']}>
                        {project.category || 'web'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-slate-600 line-clamp-3">{project.description}</p>
                    
                    {project.technologies?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {project.technologies.map((tech, idx) => (
                          <span key={idx} className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-3 border-t">
                      <Link to={createPageUrl('AdminProjectFiles') + `?id=${project.id}`} className="flex-1">
                        <Button variant="outline" className="w-full" size="sm">
                          <FileCode className="w-4 h-4 mr-2" />
                          Arquivos
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" onClick={() => handleOpenDialog(project)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(project.id)} className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Descrição *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                required
              />
            </div>

            <div>
              <Label>Categoria</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="desktop">Desktop</SelectItem>
                  <SelectItem value="backend">Backend</SelectItem>
                  <SelectItem value="fullstack">Full Stack</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tecnologias (separadas por vírgula)</Label>
              <Input
                value={formData.technologies}
                onChange={(e) => setFormData({ ...formData, technologies: e.target.value })}
                placeholder="React, Node.js, MongoDB"
              />
            </div>

            <div>
              <Label>URL do Repositório</Label>
              <Input
                value={formData.repository_url}
                onChange={(e) => setFormData({ ...formData, repository_url: e.target.value })}
                placeholder="https://github.com/..."
              />
            </div>

            <div>
              <Label>URL da Demonstração</Label>
              <Input
                value={formData.demo_url}
                onChange={(e) => setFormData({ ...formData, demo_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label>URL da Imagem de Capa</Label>
              <Input
                value={formData.thumbnail_url}
                onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
                {editingProject ? 'Atualizar' : 'Criar Projeto'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
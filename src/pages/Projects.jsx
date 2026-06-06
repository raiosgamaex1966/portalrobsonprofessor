import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Code2, ExternalLink, Github, Plus, Home } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [user, setUser] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    category: 'web',
    technologies: '',
    repository_url: '',
    demo_url: ''
  });
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      await loadProjects();
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const allProjects = await base44.entities.Project.filter({ is_active: true });
      setProjects(allProjects.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim() || !newProject.description.trim()) return;

    try {
      const techArray = newProject.technologies
        ? newProject.technologies.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      const project = await base44.entities.Project.create({
        ...newProject,
        technologies: techArray,
        is_active: true
      });
      
      setProjects([project, ...projects]);
      setShowCreateDialog(false);
      setNewProject({
        name: '',
        description: '',
        category: 'web',
        technologies: '',
        repository_url: '',
        demo_url: ''
      });
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const filteredProjects = filter === 'all' 
    ? projects 
    : projects.filter(p => p.category === filter);

  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
  const paginatedProjects = filteredProjects.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  const categoryColors = {
    web: 'bg-blue-100 text-blue-700',
    mobile: 'bg-green-100 text-green-700',
    desktop: 'bg-purple-100 text-purple-700',
    backend: 'bg-orange-100 text-orange-700',
    fullstack: 'bg-indigo-100 text-indigo-700',
    outros: 'bg-slate-100 text-slate-700'
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
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#d4a853]/20 rounded-full mb-4">
              <Code2 className="w-4 h-4" />
              <span className="text-sm font-medium">Portfólio de Projetos</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              Projetos de Teste de Software
            </h1>
            <p className="text-blue-200 text-lg max-w-2xl mx-auto">
              Explore códigos, tecnologias e soluções desenvolvidas
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Create Button and Filters */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex flex-wrap gap-2">
          {['all', 'web', 'mobile', 'desktop', 'backend', 'fullstack', 'outros'].map(cat => (
            <Button
              key={cat}
              variant={filter === cat ? 'default' : 'outline'}
              onClick={() => setFilter(cat)}
              className={filter === cat ? 'bg-[#1e3a5f]' : ''}
            >
              {cat === 'all' ? 'Todos' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Button>
          ))}
          </div>

          <div className="flex gap-2">
            {user && (
              <Link to={createPageUrl('StudentDashboard')}>
                <Button variant="outline" className="border-[#1e3a5f] text-[#1e3a5f]">
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            )}
            {user && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Projeto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Criar Novo Projeto</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
                  <div>
                    <Label htmlFor="name">Nome do Projeto *</Label>
                    <Input
                      id="name"
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      placeholder="Meu Projeto Incrível"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descrição *</Label>
                    <Input
                      id="description"
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      placeholder="Descreva seu projeto"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <Select value={newProject.category} onValueChange={(value) => setNewProject({ ...newProject, category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="web">Web</SelectItem>
                        <SelectItem value="mobile">Mobile</SelectItem>
                        <SelectItem value="desktop">Desktop</SelectItem>
                        <SelectItem value="backend">Backend</SelectItem>
                        <SelectItem value="fullstack">Fullstack</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="technologies">Tecnologias (separadas por vírgula)</Label>
                    <Input
                      id="technologies"
                      value={newProject.technologies}
                      onChange={(e) => setNewProject({ ...newProject, technologies: e.target.value })}
                      placeholder="React, Node.js, MongoDB"
                    />
                  </div>
                  <div>
                    <Label htmlFor="repository">URL do Repositório</Label>
                    <Input
                      id="repository"
                      value={newProject.repository_url}
                      onChange={(e) => setNewProject({ ...newProject, repository_url: e.target.value })}
                      placeholder="https://github.com/..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="demo">URL da Demo</Label>
                    <Input
                      id="demo"
                      value={newProject.demo_url}
                      onChange={(e) => setNewProject({ ...newProject, demo_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <Button onClick={handleCreateProject} className="w-full bg-[#1e3a5f]">
                    Criar Projeto
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Code2 className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Nenhum projeto encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index % 6) * 0.05 }}
                >
                <Link to={createPageUrl('ProjectView') + `?id=${project.id}`}>
                  <Card className="h-full hover:shadow-xl transition-all duration-300 group">
                    {project.thumbnail_url ? (
                      <img
                        src={project.thumbnail_url}
                        alt={project.name}
                        className="w-full h-48 object-cover rounded-t-xl"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] flex items-center justify-center rounded-t-xl">
                        <Code2 className="w-16 h-16 text-white/30" />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <CardTitle className="text-lg group-hover:text-[#1e3a5f] transition-colors">
                          {project.name}
                        </CardTitle>
                        <Badge className={categoryColors[project.category || 'web']}>
                          {project.category || 'web'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-slate-600 line-clamp-3">
                        {project.description}
                      </p>
                      
                      {project.technologies?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {project.technologies.slice(0, 4).map((tech, idx) => (
                            <span key={idx} className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">
                              {tech}
                            </span>
                          ))}
                          {project.technologies.length > 4 && (
                            <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">
                              +{project.technologies.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        {project.repository_url && (
                          <a
                            href={project.repository_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-600 hover:text-[#1e3a5f]"
                          >
                            <Github className="w-5 h-5" />
                          </a>
                        )}
                        {project.demo_url && (
                          <a
                            href={project.demo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-600 hover:text-[#1e3a5f]"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
              ))}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
               <Button
                 variant="outline"
                 onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                 disabled={currentPage === 0}
               >
                 Anterior
               </Button>
               <div className="flex gap-1">
                 {Array.from({ length: totalPages }, (_, i) => (
                   <Button
                     key={i}
                     variant={currentPage === i ? "default" : "outline"}
                     onClick={() => setCurrentPage(i)}
                     className={currentPage === i ? "bg-[#1e3a5f]" : ""}
                     size="sm"
                   >
                     {i + 1}
                   </Button>
                 ))}
               </div>
               <Button
                 variant="outline"
                 onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                 disabled={currentPage === totalPages - 1}
               >
                 Próxima
               </Button>
              </div>
              )}
              </>
              )}
              </div>
              </div>
              );
              }
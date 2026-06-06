import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { FileCode, Plus, Edit, Trash2, ArrowLeft } from 'lucide-react';
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

export default function AdminProjectFiles() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const projectId = params.get('id');

  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [formData, setFormData] = useState({
    file_name: '',
    file_path: '',
    language: 'javascript',
    content: '',
    order: 0
  });

  useEffect(() => {
    if (!projectId) {
      window.location.replace(createPageUrl('AdminProjects'));
      return;
    }
    loadData();
  }, [projectId]);

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

      const projects = await base44.entities.Project.list();
      const currentProject = projects.find(p => p.id === projectId);
      setProject(currentProject);

      await loadFiles();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async () => {
    const projectFiles = await base44.entities.ProjectFile.filter({ project_id: projectId });
    setFiles(projectFiles.sort((a, b) => (a.order || 0) - (b.order || 0)));
  };

  const handleOpenDialog = (file = null) => {
    if (file) {
      setEditingFile(file);
      setFormData({
        file_name: file.file_name,
        file_path: file.file_path || '',
        language: file.language || 'javascript',
        content: file.content,
        order: file.order || 0
      });
    } else {
      setEditingFile(null);
      setFormData({
        file_name: '',
        file_path: '',
        language: 'javascript',
        content: '',
        order: files.length
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        project_id: projectId,
        file_name: formData.file_name,
        file_path: formData.file_path || null,
        language: formData.language,
        content: formData.content,
        order: parseInt(formData.order) || 0
      };

      if (editingFile) {
        await base44.entities.ProjectFile.update(editingFile.id, data);
      } else {
        await base44.entities.ProjectFile.create(data);
      }

      setDialogOpen(false);
      loadFiles();
    } catch (error) {
      alert('Erro ao salvar arquivo: ' + error.message);
    }
  };

  const handleDelete = async (fileId) => {
    if (!confirm('Deseja realmente excluir este arquivo?')) return;
    
    try {
      await base44.entities.ProjectFile.delete(fileId);
      loadFiles();
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

  if (!user || user.role !== 'admin' || !project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-slate-600">Projeto não encontrado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const languageColors = {
    javascript: 'bg-yellow-100 text-yellow-700',
    typescript: 'bg-blue-100 text-blue-700',
    python: 'bg-green-100 text-green-700',
    java: 'bg-red-100 text-red-700',
    csharp: 'bg-purple-100 text-purple-700',
    php: 'bg-indigo-100 text-indigo-700',
    html: 'bg-orange-100 text-orange-700',
    css: 'bg-pink-100 text-pink-700',
    sql: 'bg-cyan-100 text-cyan-700',
    outros: 'bg-slate-100 text-slate-700'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <Link to={createPageUrl('AdminProjects')} className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Projetos
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Arquivos: {project.name}</h1>
              <p className="text-blue-200">Gerenciar código-fonte do projeto</p>
            </div>
            <Button onClick={() => handleOpenDialog()} className="bg-[#d4a853] hover:bg-[#c49743] text-[#1e3a5f]">
              <Plus className="w-4 h-4 mr-2" />
              Novo Arquivo
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {files.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileCode className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Nenhum arquivo cadastrado ainda.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {files.map((file, index) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileCode className="w-5 h-5 text-[#1e3a5f]" />
                        <div>
                          <CardTitle className="text-base">{file.file_name}</CardTitle>
                          {file.file_path && (
                            <p className="text-xs text-slate-500">{file.file_path}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={languageColors[file.language || 'javascript']}>
                          {file.language}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => handleOpenDialog(file)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(file.id)} className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{file.content}</code>
                    </pre>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFile ? 'Editar Arquivo' : 'Novo Arquivo'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do Arquivo *</Label>
                <Input
                  value={formData.file_name}
                  onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
                  placeholder="exemplo.js"
                  required
                />
              </div>

              <div>
                <Label>Linguagem</Label>
                <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="typescript">TypeScript</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                    <SelectItem value="csharp">C#</SelectItem>
                    <SelectItem value="php">PHP</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="css">CSS</SelectItem>
                    <SelectItem value="sql">SQL</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Caminho (opcional)</Label>
                <Input
                  value={formData.file_path}
                  onChange={(e) => setFormData({ ...formData, file_path: e.target.value })}
                  placeholder="src/components/"
                />
              </div>

              <div>
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Código *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={15}
                className="font-mono text-sm"
                placeholder="Cole o código aqui..."
                required
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
                {editingFile ? 'Atualizar' : 'Criar Arquivo'}
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
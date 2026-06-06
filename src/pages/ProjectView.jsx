import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Code2, ArrowLeft, Github, ExternalLink, FileCode, Home } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ProjectView() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const projectId = params.get('id');

  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!projectId) {
      window.location.replace(createPageUrl('Projects'));
      return;
    }
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const projects = await base44.entities.Project.list();
      const currentProject = projects.find(p => p.id === projectId);
      setProject(currentProject);

      const projectFiles = await base44.entities.ProjectFile.filter({ project_id: projectId });
      const sortedFiles = projectFiles.sort((a, b) => (a.order || 0) - (b.order || 0));
      setFiles(sortedFiles);
      
      if (sortedFiles.length > 0) {
        setSelectedFile(sortedFiles[0]);
      }
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-slate-600">Projeto não encontrado.</p>
            <Link to={createPageUrl('Projects')} className="text-[#1e3a5f] hover:underline mt-4 inline-block">
              Voltar para Projetos
            </Link>
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
          <div className="flex items-center gap-4 mb-4">
            <Link to={createPageUrl('Projects')} className="inline-flex items-center gap-2 text-blue-200 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Voltar para Projetos
            </Link>
            {user && (
              <Link to={createPageUrl('StudentDashboard')}>
                <Button variant="outline" className="border-white text-white hover:bg-white/10">
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            )}
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-4xl font-bold mb-3">{project.name}</h1>
                <p className="text-blue-200 text-lg mb-4">{project.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className={categoryColors[project.category || 'web']}>
                    {project.category || 'web'}
                  </Badge>
                  {project.technologies?.map((tech, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-white/20 text-white">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                {project.repository_url && (
                  <a href={project.repository_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="border-white text-white hover:bg-white/10">
                      <Github className="w-4 h-4 mr-2" />
                      Repositório
                    </Button>
                  </a>
                )}
                {project.demo_url && (
                  <a href={project.demo_url} target="_blank" rel="noopener noreferrer">
                    <Button className="bg-[#d4a853] hover:bg-[#c49743] text-[#1e3a5f]">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Demo
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {files.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileCode className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Nenhum arquivo de código disponível para este projeto.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-4 gap-6">
            {/* File List */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileCode className="w-4 h-4" />
                    Arquivos ({files.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {files.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedFile?.id === file.id
                          ? 'bg-[#1e3a5f] text-white'
                          : 'hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{file.file_name}</span>
                        <Badge className={`text-xs ${selectedFile?.id === file.id ? 'bg-white/20 text-white' : languageColors[file.language || 'javascript']}`}>
                          {file.language}
                        </Badge>
                      </div>
                      {file.file_path && (
                        <span className={`text-xs ${selectedFile?.id === file.id ? 'text-blue-200' : 'text-slate-500'}`}>
                          {file.file_path}
                        </span>
                      )}
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Code Viewer */}
            <div className="lg:col-span-3">
              {selectedFile && (
                <motion.div
                  key={selectedFile.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{selectedFile.file_name}</CardTitle>
                          {selectedFile.file_path && (
                            <p className="text-sm text-slate-500 mt-1">{selectedFile.file_path}</p>
                          )}
                        </div>
                        <Badge className={languageColors[selectedFile.language || 'javascript']}>
                          {selectedFile.language}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="relative">
                        <pre className="bg-slate-900 text-slate-100 p-6 rounded-lg overflow-x-auto">
                          <code className="text-sm leading-relaxed">{selectedFile.content}</code>
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
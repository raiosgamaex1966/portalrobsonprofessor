import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { 
  Settings, BookOpen, FileText, ClipboardList, 
  FileQuestion, Users, TrendingUp, Activity,
  BarChart3, MessageSquare, Code2, Trello, Video, GraduationCap, Megaphone, Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    disciplines: 0,
    materials: 0,
    activities: 0,
    tests: 0,
    submissions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      let currentUser;
      const isTestAuthEnabled = import.meta.env.VITE_ENABLE_TEST_AUTH === 'true';

      if (isTestAuthEnabled) {
        const storedEmail = localStorage.getItem('test_auth_user_email');
        const storedRole = localStorage.getItem('test_auth_user_role');
        const storedName = localStorage.getItem('test_auth_user_name');
        if (storedEmail) {
          currentUser = { email: storedEmail, role: storedRole, name: storedName };
        }
      } else {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          currentUser = await base44.auth.me();
        }
      }

      if (!currentUser) {
        window.location.replace(createPageUrl('Home'));
        return;
      }
      setUser(currentUser);

      if (currentUser?.role !== 'admin') {
        return;
      }

      // No modo teste, as chamadas de entidades podem falhar se não houver dados reais.
      // Vamos envolver em um try/catch específico para não travar a página se a API falhar.
      try {
        const [disciplines, materials, activities, tests, submissions] = await Promise.all([
          base44.entities.Discipline.list(),
          base44.entities.Material.list(),
          base44.entities.Activity.list(),
          base44.entities.Test.list(),
          base44.entities.TestSubmission.list()
        ]);

        setStats({
          disciplines: disciplines.length,
          materials: materials.length,
          activities: activities.length,
          tests: tests.length,
          submissions: submissions.length
        });
      } catch (apiError) {
        console.warn('API data loading skipped or failed in test mode:', apiError);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
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

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
            <p className="text-slate-600 mb-4">
              Esta área é exclusiva para administradores.
            </p>
            <Link to={createPageUrl('Home')} className="text-[#1e3a5f] hover:underline">
              Voltar para Home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const menuItems = [
    { 
      title: 'Configurações do Site', 
      icon: Settings, 
      page: 'AdminSettings',
      description: 'Gerencie nome, cores e Bdz Tutor',
      color: 'from-blue-500 to-blue-600'
    },
    { 
      title: 'Gerenciar Usuários', 
      icon: Users, 
      page: 'AdminUsers',
      description: 'Convidar e excluir usuários',
      color: 'from-violet-500 to-violet-600'
    },
    { 
      title: 'Disciplinas', 
      icon: BookOpen, 
      page: 'AdminDisciplines',
      description: 'Criar e editar disciplinas',
      color: 'from-emerald-500 to-emerald-600',
      count: stats.disciplines
    },
    { 
      title: 'Turmas', 
      icon: Users, 
      page: 'AdminClasses',
      description: 'Gerenciar turmas e alunos',
      color: 'from-indigo-500 to-indigo-600'
    },
    { 
      title: 'Turmas por Disciplina', 
      icon: Activity, 
      page: 'AdminDisciplineClasses',
      description: 'Vincular turmas a disciplinas',
      color: 'from-pink-500 to-pink-600'
    },
    { 
      title: 'Cadastros Pendentes', 
      icon: Users, 
      page: 'AdminPendingStudents',
      description: 'Aprovar novos cadastros',
      color: 'from-amber-500 to-amber-600'
    },
    { 
      title: 'Perfis de Alunos', 
      icon: Users, 
      page: 'AdminStudentProfiles',
      description: 'Gerenciar perfis aprovados',
      color: 'from-teal-500 to-teal-600'
    },
    { 
      title: 'Materiais', 
      icon: FileText, 
      page: 'AdminMaterials',
      description: 'Upload de materiais de aula',
      color: 'from-purple-500 to-purple-600',
      count: stats.materials
    },
    { 
      title: 'Vídeos', 
      icon: Video, 
      page: 'AdminVideos',
      description: 'Gerenciar vídeos educacionais',
      color: 'from-red-500 to-red-600'
    },
    { 
      title: 'Atividades', 
      icon: ClipboardList, 
      page: 'AdminActivities',
      description: 'Criar atividades para alunos',
      color: 'from-orange-500 to-orange-600',
      count: stats.activities
    },
    { 
      title: 'Testes', 
      icon: FileQuestion, 
      page: 'AdminTests',
      description: 'Criar e gerenciar testes',
      color: 'from-rose-500 to-rose-600',
      count: stats.tests
    },
    { 
      title: 'Resultados', 
      icon: BarChart3, 
      page: 'AdminResults',
      description: 'Ver resultados dos testes',
      color: 'from-cyan-500 to-cyan-600',
      count: stats.submissions
    },
    { 
      title: 'Criar Tópico no Fórum', 
      icon: MessageSquare, 
      page: 'AdminForumCreate',
      description: 'Iniciar nova discussão',
      color: 'from-blue-500 to-blue-600'
    },
    { 
      title: 'Moderar Fórum', 
      icon: MessageSquare, 
      page: 'AdminForum',
      description: 'Gerenciar discussões e tópicos',
      color: 'from-slate-500 to-slate-600'
    },
    { 
      title: 'Gerenciar Projetos', 
      icon: Code2, 
      page: 'AdminProjects',
      description: 'Projetos de teste de software',
      color: 'from-teal-500 to-teal-600'
    },
    { 
      title: 'Quadros de Tarefas', 
      icon: Trello, 
      page: 'AdminBoards',
      description: 'Gerenciar quadros estilo Trello',
      color: 'from-blue-500 to-blue-600'
    },
    { 
      title: 'Cursos Externos', 
      icon: GraduationCap, 
      page: 'AdminExternalCourses',
      description: 'Gerenciar cursos externos e certificados',
      color: 'from-yellow-500 to-yellow-600'
    },
    { 
      title: 'Submissões de Cursos', 
      icon: GraduationCap, 
      page: 'AdminExternalCourseSubmissions',
      description: 'Aprovar certificados enviados',
      color: 'from-lime-500 to-lime-600'
    },
    { 
      title: 'Chat com Alunos', 
      icon: MessageSquare, 
      page: 'AdminChat',
      description: 'Converse em tempo real',
      color: 'from-blue-500 to-blue-600'
    },
    { 
      title: 'Agendamentos', 
      icon: Calendar, 
      page: 'Appointments',
      description: 'Gerencie horários com alunos',
      color: 'from-indigo-500 to-indigo-600'
    },
    { 
      title: 'Mensagens dos Alunos', 
      icon: MessageSquare, 
      page: 'AdminMessages',
      description: 'Ver e responder mensagens',
      color: 'from-purple-500 to-purple-600'
    },
    { 
      title: 'Anúncios', 
      icon: Megaphone, 
      page: 'AdminAnnouncements',
      description: 'Avisos exibidos ao fazer login',
      color: 'from-orange-500 to-orange-600'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#d4a853] flex items-center justify-center">
                <Settings className="w-6 h-6 text-[#1e3a5f]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Painel Administrativo</h1>
                <p className="text-blue-200">Bem-vindo, {user.full_name}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-6 -mt-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'Disciplinas', value: stats.disciplines, icon: BookOpen, color: 'text-emerald-600' },
            { label: 'Materiais', value: stats.materials, icon: FileText, color: 'text-purple-600' },
            { label: 'Testes', value: stats.tests, icon: FileQuestion, color: 'text-rose-600' },
            { label: 'Submissões', value: stats.submissions, icon: TrendingUp, color: 'text-cyan-600' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="shadow-lg border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{stat.label}</p>
                      <p className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
                    </div>
                    <stat.icon className={`w-10 h-10 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item, index) => (
            <motion.div
              key={item.page}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
            >
              <Link to={createPageUrl(item.page)}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 group overflow-hidden">
                  <div className={`h-2 bg-gradient-to-r ${item.color}`} />
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <item.icon className="w-7 h-7 text-white" />
                      </div>
                      {item.count !== undefined && (
                        <div className="text-2xl font-bold text-slate-300">
                          {item.count}
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-[#1e3a5f] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-slate-500 text-sm">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
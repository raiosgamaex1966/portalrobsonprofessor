import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { 
  LayoutDashboard, BookOpen, FileQuestion, ClipboardList, 
  Settings, Users, FolderOpen, Plus, BarChart3, Brain
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    disciplines: 0,
    materials: 0,
    tests: 0,
    activities: 0,
    submissions: 0
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);

    if (currentUser?.role !== 'admin') {
      setLoading(false);
      return;
    }

    const [disciplines, materials, tests, activities, submissions] = await Promise.all([
      base44.entities.Discipline.list(),
      base44.entities.Material.list(),
      base44.entities.Test.list(),
      base44.entities.Activity.list(),
      base44.entities.TestSubmission.list()
    ]);

    setStats({
      disciplines: disciplines.length,
      materials: materials.length,
      tests: tests.length,
      activities: activities.length,
      submissions: submissions.length
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <Settings className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
            <p className="text-slate-500 mb-4">
              Apenas administradores podem acessar o painel de controle.
            </p>
            <Link to={createPageUrl('Home')}>
              <Button>Voltar para Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const menuItems = [
    { 
      label: 'Disciplinas', 
      icon: FolderOpen, 
      href: 'AdminDisciplines',
      count: stats.disciplines,
      color: 'from-blue-500 to-blue-600'
    },
    { 
      label: 'Materiais', 
      icon: BookOpen, 
      href: 'AdminMaterials',
      count: stats.materials,
      color: 'from-emerald-500 to-emerald-600'
    },
    { 
      label: 'Testes', 
      icon: FileQuestion, 
      href: 'AdminTests',
      count: stats.tests,
      color: 'from-purple-500 to-purple-600'
    },
    { 
      label: 'Atividades', 
      icon: ClipboardList, 
      href: 'AdminActivities',
      count: stats.activities,
      color: 'from-orange-500 to-orange-600'
    },
    { 
      label: 'Resultados', 
      icon: BarChart3, 
      href: 'AdminResults',
      count: stats.submissions,
      color: 'from-rose-500 to-rose-600'
    },
    { 
      label: 'Configurações', 
      icon: Settings, 
      href: 'AdminSettings',
      color: 'from-slate-500 to-slate-600'
    },
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
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-4">
              <LayoutDashboard className="w-4 h-4 text-[#d4a853]" />
              <span className="text-sm font-medium">Painel Administrativo</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">Bem-vindo, {user?.full_name}</h1>
            <p className="text-blue-200">Gerencie o conteúdo do portal de forma simples e rápida.</p>
          </motion.div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-6 -mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Disciplinas', value: stats.disciplines, icon: FolderOpen },
            { label: 'Materiais', value: stats.materials, icon: BookOpen },
            { label: 'Testes', value: stats.tests, icon: FileQuestion },
            { label: 'Respostas', value: stats.submissions, icon: Users }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-white shadow-lg border-0">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-[#1e3a5f]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Gerenciamento</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={createPageUrl(item.href)}>
                <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden border-0 shadow-lg">
                  <div className={`h-2 bg-gradient-to-r ${item.color}`} />
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${item.color} flex items-center justify-center`}>
                          <item.icon className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800 group-hover:text-[#1e3a5f] transition-colors">
                            {item.label}
                          </h3>
                          {item.count !== undefined && (
                            <p className="text-sm text-slate-500">{item.count} cadastrados</p>
                          )}
                        </div>
                      </div>
                      <Plus className="w-5 h-5 text-slate-400 group-hover:text-[#d4a853] transition-colors" />
                    </div>
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
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { 
  BarChart3, ArrowLeft, User, Mail, Calendar, CheckCircle,
  Download, Search, Filter
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminResults() {
  const [submissions, setSubmissions] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [testFilter, setTestFilter] = useState('all');

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      base44.auth.redirectToLogin(createPageUrl('Admin'));
      return;
    }

    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      window.location.href = createPageUrl('Home');
      return;
    }

    loadData();
  };

  const loadData = async () => {
    const [submissionsData, testsData] = await Promise.all([
      base44.entities.TestSubmission.list('-created_date'),
      base44.entities.Test.list()
    ]);
    setSubmissions(submissionsData);
    setTests(testsData);
    setLoading(false);
  };

  const getTestTitle = (id) => tests.find(t => t.id === id)?.title || 'Teste desconhecido';

  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = sub.student_name?.toLowerCase().includes(search.toLowerCase()) ||
                          sub.student_email?.toLowerCase().includes(search.toLowerCase());
    const matchesTest = testFilter === 'all' || sub.test_id === testFilter;
    return matchesSearch && matchesTest;
  });

  const getScoreColor = (percentage) => {
    if (percentage >= 70) return 'bg-green-100 text-green-700';
    if (percentage >= 50) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const stats = {
    total: submissions.length,
    average: submissions.length > 0 
      ? Math.round(submissions.reduce((acc, s) => acc + (s.score / s.total_points * 100), 0) / submissions.length)
      : 0,
    passed: submissions.filter(s => (s.score / s.total_points * 100) >= 70).length
  };

  const exportCSV = () => {
    const headers = ['Aluno', 'Email', 'Teste', 'Pontuação', 'Total', 'Percentual', 'Data'];
    const rows = filteredSubmissions.map(sub => [
      sub.student_name,
      sub.student_email,
      getTestTitle(sub.test_id),
      sub.score,
      sub.total_points,
      Math.round((sub.score / sub.total_points) * 100) + '%',
      format(new Date(sub.completed_at || sub.created_date), 'dd/MM/yyyy HH:mm')
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resultados-testes.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <Link to={createPageUrl('Admin')} className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Painel
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Resultados dos Testes</h1>
              <p className="text-blue-200">Acompanhe o desempenho dos alunos</p>
            </div>
            <Button 
              onClick={exportCSV}
              className="bg-[#d4a853] hover:bg-[#c49743] text-[#1e3a5f]"
            >
              <Download className="w-5 h-5 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-6 -mt-6">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total de Respostas', value: stats.total, icon: BarChart3 },
            { label: 'Média Geral', value: `${stats.average}%`, icon: CheckCircle },
            { label: 'Aprovados (≥70%)', value: stats.passed, icon: User },
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

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={testFilter} onValueChange={setTestFilter}>
            <SelectTrigger className="w-full sm:w-64">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar por teste" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os testes</SelectItem>
              {tests.map((test) => (
                <SelectItem key={test.id} value={test.id}>{test.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="shadow-lg">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : filteredSubmissions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Teste</TableHead>
                    <TableHead>Pontuação</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission, index) => {
                    const percentage = Math.round((submission.score / submission.total_points) * 100);
                    return (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center">
                              <User className="w-5 h-5 text-[#1e3a5f]" />
                            </div>
                            <div>
                              <p className="font-medium">{submission.student_name}</p>
                              <p className="text-sm text-slate-500">{submission.student_email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {getTestTitle(submission.test_id)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{submission.score}</span>
                          <span className="text-slate-400"> / {submission.total_points}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getScoreColor(percentage)}>
                            {percentage}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {format(new Date(submission.completed_at || submission.created_date), "d/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="p-16 text-center">
                <BarChart3 className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">
                  {search || testFilter !== 'all' 
                    ? 'Nenhum resultado encontrado com os filtros aplicados.' 
                    : 'Nenhuma resposta de teste ainda.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
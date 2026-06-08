import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { UserPlus, Trash2, Users, ArrowLeft, Search, Mail } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function AdminClassStudents() {
  const [user, setUser] = useState(null);
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const classId = new URLSearchParams(window.location.search).get('id');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
        return;
      }

      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (currentUser?.role !== 'admin') return;

      const [classInfo, classStudents, allUsers] = await Promise.all([
        base44.entities.Class.filter({ id: classId }),
        base44.entities.ClassStudent.filter({ class_id: classId }),
        base44.entities.User.list()
      ]);

      setClassData(classInfo[0]);
      setStudents(classStudents);

      // Get all users with role "user" (alunos) not yet in this class
      const studentUserIds = classStudents.map(s => s.user_id);
      const availableUsers = allUsers.filter(u => 
        u.role !== 'admin' && !studentUserIds.includes(u.id)
      );
      
      // Map users to profile format
      const enriched = availableUsers.map(user => ({
        user_id: user.id,
        full_name: user.full_name,
        email: user.email
      }));
      
      setAvailableProfiles(enriched);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addStudent = async (profile) => {
    try {
      await base44.entities.ClassStudent.create({
        class_id: classId,
        user_id: profile.user_id,
        student_name: profile.full_name,
        student_email: profile.email,
        enrollment_date: new Date().toISOString()
      });

      toast.success(`${profile.full_name} adicionado à turma!`);
      setShowDialog(false);
      loadData();
    } catch (error) {
      console.error('Error adding student:', error);
      toast.error('Erro ao adicionar aluno');
    }
  };

  const removeStudent = async (studentId, studentName) => {
    if (confirm(`Deseja remover ${studentName} da turma?`)) {
      try {
        await base44.entities.ClassStudent.delete(studentId);
        toast.success('Aluno removido da turma!');
        loadData();
      } catch (error) {
        console.error('Error removing student:', error);
        toast.error('Erro ao remover aluno');
      }
    }
  };

  const filteredProfiles = availableProfiles.filter(profile =>
    profile.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin' || !classData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-slate-600">Turma não encontrada ou acesso negado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <Link to={createPageUrl('AdminClasses')}>
            <Button variant="ghost" className="text-white mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Turmas
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Alunos da Turma: {classData.name}</h1>
              <p className="text-blue-200">{students.length} aluno(s) matriculado(s)</p>
            </div>
            <Button
              onClick={() => setShowDialog(true)}
              className="bg-[#d4a853] hover:bg-[#c49743] text-[#1e3a5f]"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar Aluno
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {students.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map((student, index) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{student.student_name}</CardTitle>
                        <p className="text-sm text-slate-500 mt-1">{student.student_email}</p>
                        {student.enrollment_date && (
                          <p className="text-xs text-slate-400 mt-2">
                            Matriculado em {new Date(student.enrollment_date).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeStudent(student.id, student.student_name)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Nenhum aluno matriculado nesta turma ainda.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Aluno à Turma</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar aluno por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredProfiles.length > 0 ? (
              <div className="space-y-2">
                {filteredProfiles.map(profile => (
                  <div key={profile.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-[#1e3a5f]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800">{profile.full_name}</p>
                        <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                          <Mail className="w-3 h-3" />
                          {profile.email}
                        </div>
                        {profile.registration_number && (
                          <p className="text-xs text-slate-400 mt-1">Matrícula: {profile.registration_number}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => addStudent(profile)}
                      size="sm"
                      className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
                    >
                      Adicionar
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">
                  {searchTerm 
                    ? 'Nenhum aluno encontrado com esse termo de busca.' 
                    : 'Nenhum aluno disponível para adicionar.'}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
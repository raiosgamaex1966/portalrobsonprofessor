import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { GraduationCap, ArrowLeft, Clock, CheckCircle, X, ExternalLink, Calendar, User, Download } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminExternalCourseSubmissions() {
  const [user, setUser] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showCertificateDialog, setShowCertificateDialog] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      base44.auth.redirectToLogin(createPageUrl('Admin'));
      return;
    }

    const currentUser = await base44.auth.me();
    if (currentUser?.role !== 'admin') {
      window.location.href = createPageUrl('Home');
      return;
    }

    setUser(currentUser);
    loadData();
  };

  const loadData = async () => {
    try {
      const [allSubmissions, allCourses] = await Promise.all([
        base44.entities.ExternalCourseCompletion.list('-created_date'),
        base44.entities.ExternalCourse.list()
      ]);

      setSubmissions(allSubmissions);
      setCourses(allCourses);
    } catch (error) {
      console.error('Error loading submissions data:', error);
      toast.error('Erro ao carregar submissões');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (submissionId) => {
    try {
      const submission = submissions.find(s => s.id === submissionId);
      
      await base44.entities.ExternalCourseCompletion.update(submissionId, {
        status: 'approved'
      });

      // Criar notificação para o aluno
      await base44.entities.StudentNotification.create({
        user_id: submission.user_id,
        user_email: submission.user_email,
        title: '🎉 Certificado Aprovado!',
        message: `Seu certificado do curso "${getCourseName(submission.course_id)}" foi aprovado com sucesso!`,
        type: 'success',
        link: 'StudentExternalCourses'
      });

      toast.success('Submissão aprovada e aluno notificado!');
      loadData();
    } catch (error) {
      toast.error('Erro ao aprovar submissão');
    }
  };

  const handleDownloadCertificate = (certificateUrl, courseName) => {
    const link = document.createElement('a');
    link.href = certificateUrl;
    link.download = `Certificado_${courseName.replace(/\s+/g, '_')}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download iniciado');
  };

  const handleReject = async (submissionId) => {
    if (!confirm('Tem certeza que deseja rejeitar esta submissão? Ela será excluída.')) {
      return;
    }

    try {
      await base44.entities.ExternalCourseCompletion.delete(submissionId);
      toast.success('Submissão rejeitada');
      loadData();
    } catch (error) {
      toast.error('Erro ao rejeitar submissão');
    }
  };

  const handleViewCertificate = (submission) => {
    setSelectedSubmission(submission);
    setShowCertificateDialog(true);
  };

  const getCourseName = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    return course?.title || 'Curso não encontrado';
  };

  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const approvedSubmissions = submissions.filter(s => s.status === 'approved');

  const SubmissionCard = ({ submission }) => {
    const isApproved = submission.status === 'approved';

    return (
      <Card className="hover:shadow-lg transition-all">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-bold text-lg">{getCourseName(submission.course_id)}</h3>
                <Badge className={isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                  {isApproved ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Aprovado
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3 mr-1" />
                      Pendente
                    </>
                  )}
                </Badge>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{submission.user_name}</span>
                  <span className="text-slate-400">•</span>
                  <span>{submission.user_email}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Submetido em {format(new Date(submission.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleViewCertificate(submission)}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Ver
            </Button>

            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleDownloadCertificate(submission.certificate_url, getCourseName(submission.course_id))}
            >
              <Download className="w-4 h-4 mr-1" />
              Baixar
            </Button>

            {!isApproved && (
              <>
                <Button 
                  size="sm" 
                  onClick={() => handleApprove(submission.id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Aprovar
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => handleReject(submission.id)}
                >
                  <X className="w-4 h-4 mr-1" />
                  Rejeitar
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
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
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <Link to={createPageUrl('Admin')} className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Painel
          </Link>
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">Submissões de Cursos Externos</h1>
              <p className="text-blue-100 mt-1">Gerencie os certificados enviados pelos alunos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="pending">
              Pendentes ({pendingSubmissions.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Aprovadas ({approvedSubmissions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingSubmissions.length > 0 ? (
              pendingSubmissions.map((submission, index) => (
                <motion.div
                  key={submission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <SubmissionCard submission={submission} />
                </motion.div>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <GraduationCap className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Nenhuma submissão pendente</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedSubmissions.length > 0 ? (
              approvedSubmissions.map((submission, index) => (
                <motion.div
                  key={submission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <SubmissionCard submission={submission} />
                </motion.div>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <GraduationCap className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Nenhuma submissão aprovada</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Ver Certificado */}
      <Dialog open={showCertificateDialog} onOpenChange={setShowCertificateDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Certificado Enviado</DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="py-4">
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-slate-500 mb-1">Curso:</p>
                <p className="font-bold text-lg mb-3">{getCourseName(selectedSubmission.course_id)}</p>
                <p className="text-sm text-slate-500 mb-1">Aluno:</p>
                <p className="text-sm font-medium">{selectedSubmission.user_name} • {selectedSubmission.user_email}</p>
              </div>
              
              <div className="bg-white border-2 border-slate-200 rounded-lg overflow-hidden">
                {selectedSubmission.certificate_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img 
                    src={selectedSubmission.certificate_url} 
                    alt="Certificado" 
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="p-12 text-center">
                    <ExternalLink className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-600 mb-4">Este arquivo não pode ser visualizado diretamente</p>
                    <a 
                      href={selectedSubmission.certificate_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Button>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Abrir em Nova Aba
                      </Button>
                    </a>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setShowCertificateDialog(false)}>
                  Fechar
                </Button>
                {selectedSubmission.status === 'pending' && (
                  <>
                    <Button 
                      variant="destructive"
                      onClick={() => {
                        handleReject(selectedSubmission.id);
                        setShowCertificateDialog(false);
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Rejeitar
                    </Button>
                    <Button 
                      onClick={() => {
                        handleApprove(selectedSubmission.id);
                        setShowCertificateDialog(false);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprovar
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
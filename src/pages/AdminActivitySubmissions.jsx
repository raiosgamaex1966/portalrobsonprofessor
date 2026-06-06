import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { ArrowLeft, FileText, Send, CheckCircle, Clock, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function AdminActivitySubmissions() {
  const [user, setUser] = useState(null);
  const [activity, setActivity] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [grade, setGrade] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const activityId = urlParams.get('id');

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

      const [activityData, submissionsData] = await Promise.all([
        base44.entities.Activity.filter({ id: activityId }),
        base44.entities.ActivitySubmission.filter({ activity_id: activityId })
      ]);

      setActivity(activityData[0]);
      setSubmissions(submissionsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openReviewDialog = (submission) => {
    setSelectedSubmission(submission);
    setFeedback(submission.teacher_feedback || '');
    setGrade(submission.grade?.toString() || '');
    setShowDialog(true);
  };

  const handleReview = async () => {
    if (!feedback.trim()) {
      toast.error('Por favor, escreva um feedback');
      return;
    }

    try {
      await base44.entities.ActivitySubmission.update(selectedSubmission.id, {
        status: 'reviewed',
        teacher_feedback: feedback,
        grade: grade ? parseFloat(grade) : null,
        reviewed_at: new Date().toISOString()
      });

      toast.success('Feedback enviado com sucesso!');
      setShowDialog(false);
      loadData();
    } catch (error) {
      console.error('Error reviewing submission:', error);
      toast.error('Erro ao enviar feedback');
    }
  };

  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const reviewedSubmissions = submissions.filter(s => s.status === 'reviewed');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin' || !activity) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-slate-600">Atividade não encontrada ou acesso negado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <Link to={createPageUrl('AdminActivities')}>
            <Button variant="ghost" className="text-white mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Atividades
            </Button>
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold mb-2">Submissões: {activity.title}</h1>
            <p className="text-blue-200">
              {submissions.length} submissão(ões) • {pendingSubmissions.length} pendente(s)
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="pending">
              Pendentes ({pendingSubmissions.length})
            </TabsTrigger>
            <TabsTrigger value="reviewed">
              Revisadas ({reviewedSubmissions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {pendingSubmissions.length > 0 ? (
              <div className="grid gap-4">
                {pendingSubmissions.map((submission, index) => (
                  <motion.div
                    key={submission.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <User className="w-5 h-5" />
                              {submission.student_name}
                            </CardTitle>
                            <p className="text-sm text-slate-500 mt-1">{submission.student_email}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              Enviado em: {new Date(submission.submitted_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <Badge variant="secondary">
                            <Clock className="w-3 h-3 mr-1" />
                            Pendente
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-2">Resposta:</p>
                          <p className="text-slate-600 whitespace-pre-wrap bg-slate-50 p-3 rounded">
                            {submission.content}
                          </p>
                        </div>
                        {submission.attachments?.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-slate-700 mb-2">Anexos:</p>
                            <div className="space-y-1">
                              {submission.attachments.map((file, idx) => (
                                <a
                                  key={idx}
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-[#1e3a5f] hover:underline"
                                >
                                  <FileText className="w-4 h-4" />
                                  {file.name}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        <Button
                          onClick={() => openReviewDialog(submission)}
                          className="w-full bg-[#1e3a5f] hover:bg-[#2d4a6f]"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Revisar e Dar Feedback
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Clock className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Nenhuma submissão pendente.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reviewed" className="mt-6">
            {reviewedSubmissions.length > 0 ? (
              <div className="grid gap-4">
                {reviewedSubmissions.map((submission, index) => (
                  <motion.div
                    key={submission.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <User className="w-5 h-5" />
                              {submission.student_name}
                            </CardTitle>
                            <p className="text-sm text-slate-500 mt-1">{submission.student_email}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              Revisado em: {new Date(submission.reviewed_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Revisado
                            </Badge>
                            {submission.grade !== null && submission.grade !== undefined && (
                              <p className="text-lg font-bold text-[#1e3a5f] mt-2">
                                Nota: {submission.grade}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-2">Resposta:</p>
                          <p className="text-slate-600 whitespace-pre-wrap bg-slate-50 p-3 rounded">
                            {submission.content}
                          </p>
                        </div>
                        {submission.attachments?.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-slate-700 mb-2">Anexos:</p>
                            <div className="space-y-1">
                              {submission.attachments.map((file, idx) => (
                                <a
                                  key={idx}
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-[#1e3a5f] hover:underline"
                                >
                                  <FileText className="w-4 h-4" />
                                  {file.name}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm font-medium text-slate-700 mb-2">Feedback:</p>
                          <p className="text-slate-600 whitespace-pre-wrap">{submission.teacher_feedback}</p>
                        </div>
                        <Button
                          onClick={() => openReviewDialog(submission)}
                          variant="outline"
                          className="w-full"
                        >
                          Editar Feedback
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Nenhuma submissão revisada ainda.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisar Submissão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Feedback *</Label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Escreva seu feedback para o aluno..."
                className="min-h-[150px] mt-2"
              />
            </div>
            <div>
              <Label>Nota (opcional)</Label>
              <Input
                type="number"
                step="0.1"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="Ex: 8.5"
                className="mt-2"
              />
            </div>
            <Button
              onClick={handleReview}
              className="w-full bg-[#1e3a5f] hover:bg-[#2d4a6f]"
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar Feedback
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
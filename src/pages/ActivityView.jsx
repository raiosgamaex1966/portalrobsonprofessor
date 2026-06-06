import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Upload, FileText, Send, CheckCircle, Clock, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function ActivityView() {
  const [activity, setActivity] = useState(null);
  const [user, setUser] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const activityId = urlParams.get('id');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [activityData, submissions, completions] = await Promise.all([
        base44.entities.Activity.filter({ id: activityId }),
        base44.entities.ActivitySubmission.filter({ 
          activity_id: activityId, 
          user_id: currentUser.id 
        }),
        base44.entities.ActivityCompletion.filter({
          activity_id: activityId,
          user_email: currentUser.email
        })
      ]);

      setActivity(activityData[0]);
      setIsCompleted(completions.length > 0);
      if (submissions.length > 0) {
        setSubmission(submissions[0]);
        setContent(submissions[0].content);
        setAttachments(submissions[0].attachments || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        const result = await base44.integrations.Core.UploadFile({ file });
        return {
          url: result.file_url,
          name: file.name
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setAttachments([...attachments, ...uploadedFiles]);
      toast.success('Arquivos enviados!');
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Erro ao enviar arquivos');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('Por favor, escreva sua resposta');
      return;
    }

    try {
      if (submission) {
        await base44.entities.ActivitySubmission.update(submission.id, {
          content,
          attachments,
          submitted_at: new Date().toISOString()
        });
        toast.success('Resposta atualizada!');
      } else {
        await base44.entities.ActivitySubmission.create({
          activity_id: activityId,
          user_id: user.id,
          student_name: user.full_name,
          student_email: user.email,
          content,
          attachments,
          submitted_at: new Date().toISOString()
        });
        toast.success('Resposta enviada com sucesso!');
      }
      loadData();
    } catch (error) {
      console.error('Error submitting:', error);
      toast.error('Erro ao enviar resposta');
    }
  };

  const handleCompleteActivity = async () => {
    if (!submission) {
      toast.error('Você precisa enviar sua resposta antes de finalizar');
      return;
    }

    setCompleting(true);
    try {
      // Registrar conclusão
      await base44.entities.ActivityCompletion.create({
        activity_id: activityId,
        user_email: user.email,
        completed_at: new Date().toISOString()
      });

      // Atualizar pontos do aluno
      const studentPoints = await base44.entities.StudentPoints.filter({ user_id: user.id });
      if (studentPoints.length > 0) {
        await base44.entities.StudentPoints.update(studentPoints[0].id, {
          total_points: (studentPoints[0].total_points || 0) + 10,
          activity_completions: (studentPoints[0].activity_completions || 0) + 1,
          last_activity_date: new Date().toISOString().split('T')[0]
        });
      } else {
        await base44.entities.StudentPoints.create({
          user_id: user.id,
          user_email: user.email,
          total_points: 10,
          activity_completions: 1,
          last_activity_date: new Date().toISOString().split('T')[0]
        });
      }

      // Verificar e conceder badges
      await base44.functions.invoke('checkAndAwardBadges', {
        user_id: user.id,
        user_email: user.email
      });

      toast.success('🎉 Atividade finalizada! +10 pontos ganhos!');
      loadData();
    } catch (error) {
      console.error('Error completing activity:', error);
      toast.error('Erro ao finalizar atividade');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-slate-600">Atividade não encontrada.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <Link to={createPageUrl('Activities')}>
            <Button variant="ghost" className="text-white mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Atividades
            </Button>
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold mb-2">{activity.title}</h1>
            {activity.due_date && (
              <p className="text-blue-200">
                Prazo: {new Date(activity.due_date).toLocaleDateString('pt-BR')}
              </p>
            )}
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-6">
        {/* Descrição da Atividade */}
        <Card>
          <CardHeader>
            <CardTitle>Descrição</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 whitespace-pre-wrap">{activity.description}</p>
            {activity.attachment_url && (
              <div className="mt-4">
                <a
                  href={activity.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#1e3a5f] hover:text-[#2d4a6f]"
                >
                  <FileText className="w-4 h-4" />
                  {activity.attachment_name || 'Arquivo anexo'}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status da Submissão */}
        {submission && (
          <Card className={`border-2 ${
            submission.status === 'reviewed' 
              ? 'border-green-200 bg-green-50' 
              : 'border-blue-200 bg-blue-50'
          }`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Status da Submissão</CardTitle>
                <Badge variant={submission.status === 'reviewed' ? 'default' : 'secondary'}>
                  {submission.status === 'reviewed' ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Revisado
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3 mr-1" />
                      Aguardando revisão
                    </>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Enviado em: {new Date(submission.submitted_at).toLocaleString('pt-BR')}
              </p>
              {submission.status === 'reviewed' && submission.teacher_feedback && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200">
                  <p className="text-sm font-medium text-slate-700 mb-2">Feedback do Professor:</p>
                  <p className="text-slate-600 whitespace-pre-wrap">{submission.teacher_feedback}</p>
                  {submission.grade !== null && submission.grade !== undefined && (
                    <p className="text-lg font-bold text-[#1e3a5f] mt-3">
                      Nota: {submission.grade}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Formulário de Submissão */}
        <Card>
          <CardHeader>
            <CardTitle>
              {submission ? 'Atualizar Resposta' : 'Enviar Resposta'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Sua Resposta
              </label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Digite sua resposta aqui..."
                className="min-h-[200px]"
                disabled={submission?.status === 'reviewed'}
              />
            </div>

            {/* Anexos */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Anexos
              </label>
              <div className="space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#1e3a5f] hover:underline flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      {file.name}
                    </a>
                    {submission?.status !== 'reviewed' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {submission?.status !== 'reviewed' && (
                <div className="mt-2">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    disabled={uploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => document.getElementById('file-upload').click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Enviando...' : 'Adicionar Arquivos'}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {submission?.status !== 'reviewed' && (
                <Button
                  onClick={handleSubmit}
                  className="w-full bg-[#1e3a5f] hover:bg-[#2d4a6f]"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submission ? 'Atualizar Resposta' : 'Enviar Resposta'}
                </Button>
              )}

              {submission && !isCompleted && submission?.status !== 'reviewed' && (
                <Button
                  onClick={handleCompleteActivity}
                  disabled={completing}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {completing ? 'Finalizando...' : 'Finalizar Atividade'}
                </Button>
              )}

              {isCompleted && (
                <div className="flex items-center justify-center gap-2 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-700 font-medium">Atividade Finalizada!</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
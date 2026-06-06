import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { GraduationCap, ExternalLink, Upload, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function StudentExternalCourses() {
  const [courses, setCourses] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [certificateFile, setCertificateFile] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        base44.auth.redirectToLogin(createPageUrl('StudentExternalCourses'));
        return;
      }

      const currentUser = await base44.auth.me();
      if (!currentUser) {
        base44.auth.redirectToLogin(createPageUrl('StudentExternalCourses'));
        return;
      }
      setUser(currentUser);

      const [coursesData, completionsData] = await Promise.all([
        base44.entities.ExternalCourse.filter({ is_active: true }),
        base44.entities.ExternalCourseCompletion.filter({ user_email: currentUser.email })
      ]);

      setCourses(coursesData);
      setCompletions(completionsData);
    } catch (error) {
      console.error('Error loading external courses:', error);
      toast.error('Erro ao carregar os cursos externos');
    } finally {
      setLoading(false);
    }
  };

  const getCourseCompletion = (courseId) => {
    return completions.find(c => c.course_id === courseId);
  };

  const isDeadlinePassed = (deadline) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const handleOpenCompletionDialog = (course) => {
    setSelectedCourse(course);
    setCertificateFile(null);
    setShowCompletionDialog(true);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCertificateFile(file);
    }
  };

  const handleSubmitCompletion = async () => {
    if (!certificateFile) {
      toast.error('Por favor, envie o certificado');
      return;
    }

    if (isDeadlinePassed(selectedCourse.deadline)) {
      toast.error('O prazo para conclusão deste curso já passou');
      setShowCompletionDialog(false);
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: certificateFile });
      
      await base44.entities.ExternalCourseCompletion.create({
        course_id: selectedCourse.id,
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        certificate_url: file_url,
        completed_at: new Date().toISOString(),
        status: 'pending'
      });

      toast.success('Conclusão enviada para aprovação!');
      setShowCompletionDialog(false);
      loadData();
    } catch (error) {
      toast.error('Erro ao enviar conclusão');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Cursos Externos</h1>
          </div>
          <p className="text-blue-100 text-lg">
            Complete os cursos externos e envie seus certificados para validação
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {courses.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, index) => {
              const completion = getCourseCompletion(course.id);
              const deadlinePassed = isDeadlinePassed(course.deadline);

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-lg transition-all overflow-hidden h-full flex flex-col">
                    {course.thumbnail_url && (
                      <img 
                        src={course.thumbnail_url} 
                        alt={course.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <CardContent className="p-6 flex-1 flex flex-col">
                      <h3 className="font-bold text-xl mb-2">{course.title}</h3>
                      {course.description && (
                        <p className="text-sm text-slate-600 mb-4 line-clamp-3">{course.description}</p>
                      )}
                      
                      {course.deadline && (
                        <div className={`text-sm mb-4 flex items-center gap-2 ${deadlinePassed ? 'text-red-600' : 'text-orange-600'}`}>
                          <Clock className="w-4 h-4" />
                          Prazo: {format(new Date(course.deadline), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}
                          {deadlinePassed && <Badge className="bg-red-600">Vencido</Badge>}
                        </div>
                      )}

                      {completion ? (
                        <div className="mt-auto">
                          <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg mb-3">
                            {completion.status === 'pending' ? (
                              <>
                                <Clock className="w-5 h-5 text-orange-600" />
                                <div className="flex-1">
                                  <p className="text-sm font-semibold">Aguardando Aprovação</p>
                                  <p className="text-xs text-slate-500">Certificado enviado</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-green-700">Curso Concluído</p>
                                  <p className="text-xs text-slate-500">Certificado aprovado</p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-auto space-y-2">
                          <a 
                            href={course.external_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Button className="w-full bg-[#1e3a5f] hover:bg-[#2d4a6f]">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Acessar Curso
                            </Button>
                          </a>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleOpenCompletionDialog(course)}
                            disabled={deadlinePassed}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {deadlinePassed ? 'Prazo Expirado' : 'Marcar como Concluído'}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <GraduationCap className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Nenhum curso externo disponível no momento.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog Enviar Certificado */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir Curso</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-600">
              Envie o certificado de conclusão do curso <strong>{selectedCourse?.title}</strong> para validação.
            </p>
            
            <div>
              <label className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                {certificateFile ? (
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-2" />
                    <p className="text-sm font-medium">{certificateFile.name}</p>
                    <p className="text-xs text-slate-500 mt-1">Clique para trocar o arquivo</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-slate-400" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-700">Clique para enviar certificado</p>
                      <p className="text-xs text-slate-500 mt-1">PDF, JPG ou PNG</p>
                    </div>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCompletionDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmitCompletion}
              disabled={!certificateFile || uploading}
              className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Enviar Conclusão
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
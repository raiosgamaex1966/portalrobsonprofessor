import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { 
  BookOpen, ClipboardList, FileQuestion, TrendingUp, 
  Calendar, CheckCircle, Clock, AlertCircle, GraduationCap,
  ChevronRight, Target, MessageSquare, User, Upload, X, Award, Sparkles,
  Code2, Trello, Bot, Video, ExternalLink, Megaphone
} from 'lucide-react';
import PointsDisplay from "@/components/gamification/PointsDisplay.jsx";
import BadgeCard from "@/components/gamification/BadgeCard.jsx";
import BdzTutor from "@/components/home/BdzTutor.jsx";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [activities, setActivities] = useState([]);
  const [tests, setTests] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [forumTopics, setForumTopics] = useState([]);
  const [studentProfile, setStudentProfile] = useState(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    full_name: '',
    phone: '',
    birth_date: '',
    registration_number: '',
    photo_url: ''
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [studentPoints, setStudentPoints] = useState(null);
  const [studentBadges, setStudentBadges] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [siteSettings, setSiteSettings] = useState(null);
  const [showBdzTutorModal, setShowBdzTutorModal] = useState(false);
  const [videos, setVideos] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        base44.auth.redirectToLogin(createPageUrl('StudentDashboard'));
        return;
      }

      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Load student's enrolled classes and profile
      const [
        classStudents,
        allActivities,
        allTests,
        allMaterials,
        allSubmissions,
        allDisciplines,
        allForumTopics,
        profiles,
        points,
        badges,
        earnedBadges,
        settings,
        allVideos,
        activeAnnouncements,
        viewedAnnouncements
      ] = await Promise.all([
        base44.entities.ClassStudent.filter({ user_id: currentUser.id }),
        base44.entities.Activity.filter({ is_active: true }),
        base44.entities.Test.filter({ is_active: true }),
        base44.entities.Material.filter({ is_active: true }),
        base44.entities.TestSubmission.filter({ student_email: currentUser.email }),
        base44.entities.Discipline.list(),
        base44.entities.ForumTopic.list('-created_date'),
        base44.entities.StudentProfile.filter({ user_id: currentUser.id }),
        base44.entities.StudentPoints.filter({ user_id: currentUser.id }),
        base44.entities.Badge.filter({ is_active: true }),
        base44.entities.StudentBadge.filter({ user_id: currentUser.id }),
        base44.entities.SiteSettings.list(),
        base44.entities.VideoResource.filter({ is_active: true }),
        base44.entities.Announcement.filter({ is_active: true }),
        base44.entities.AnnouncementView.filter({ user_email: currentUser.email })
        ]);

      // Set student profile if exists
      if (profiles.length > 0) {
        const prof = profiles[0];
        setStudentProfile(prof);
        setProfileFormData({
          full_name: prof.full_name || currentUser.full_name || '',
          phone: prof.phone || '',
          birth_date: prof.birth_date || '',
          registration_number: prof.registration_number || '',
          photo_url: prof.photo_url || ''
        });
      } else {
        // Initialize form with user's current data
        setProfileFormData({
          full_name: currentUser.full_name || '',
          phone: '',
          birth_date: '',
          registration_number: '',
          photo_url: ''
        });
      }

      // Set gamification data
      if (points.length > 0) {
        setStudentPoints(points[0]);
      } else {
        // Create initial points record
        const newPoints = await base44.entities.StudentPoints.create({
          user_id: currentUser.id,
          user_email: currentUser.email,
          total_points: 0,
          level: 1
        });
        setStudentPoints(newPoints);
      }

      setAllBadges(badges);
      setStudentBadges(earnedBadges);

      if (settings.length > 0) {
        setSiteSettings(settings[0]);
      }

      const enrolledClasses = await Promise.all(
        classStudents.map(cs => base44.entities.Class.list().then(classes => 
          classes.find(c => c.id === cs.class_id)
        ))
      );

      setClasses(enrolledClasses.filter(Boolean));
      setDisciplines(allDisciplines);

      // Get discipline IDs from student's classes via DisciplineClass entity
      const classIds = classStudents.map(cs => cs.class_id);
      const disciplineClasses = await base44.entities.DisciplineClass.list();
      
      const studentDisciplineIds = disciplineClasses
        .filter(dc => classIds.includes(dc.class_id))
        .map(dc => dc.discipline_id);

      // Filter forum topics to show only from student's disciplines
      const relevantTopics = allForumTopics
        .filter(topic => studentDisciplineIds.includes(topic.discipline_id))
        .slice(0, 5);

      setForumTopics(relevantTopics);

      // Filter videos by student's disciplines
      const relevantVideos = allVideos.filter(v => studentDisciplineIds.includes(v.discipline_id));
      setVideos(relevantVideos);

      // Show all active announcements in the dashboard
      setAnnouncements(activeAnnouncements);

      // Filter announcements that haven't been viewed (if show_once is true) for modal
      const unviewedAnnouncements = activeAnnouncements.filter(ann => {
        if (!ann.show_once) return true;
        return !viewedAnnouncements.some(v => v.announcement_id === ann.id);
      });

      // Show modal only for unviewed announcements
      if (unviewedAnnouncements.length > 0) {
        setShowAnnouncementsModal(true);
      }

      // Load notifications
      try {
        const userNotifications = await base44.entities.StudentNotification.filter(
          { user_email: currentUser.email, is_read: false },
          '-created_date'
        );
        setNotifications(userNotifications);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }

      // Filter activities and tests by student's classes
      const relevantActivities = allActivities.filter(a => 
        !a.class_id || classIds.includes(a.class_id)
      );
      const relevantTests = allTests.filter(t => 
        !t.class_id || classIds.includes(t.class_id)
      );

      setActivities(relevantActivities);
      setTests(relevantTests);
      setMaterials(allMaterials);
      setSubmissions(allSubmissions);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Erro ao carregar o painel: ' + (error.message || JSON.stringify(error)));
    } finally {
      setLoading(false);
    }
  };

  const getDisciplineName = (id) => {
    return disciplines.find(d => d.id === id)?.name || 'Disciplina';
  };

  const getClassDiscipline = (classId) => {
    // Find discipline linked to this class through DisciplineClass entity
    const disciplineClass = disciplines.find(d => {
      // This will be populated correctly when we load the data
      return true; // Placeholder - actual matching happens in loadData
    });
    return disciplineClass;
  };

  const getMandatoryMaterials = () => {
    return materials.filter(m => m.material_type === 'mandatory');
  };

  const getUpcomingDeadlines = () => {
    const now = new Date();
    const deadlines = [];

    activities.forEach(activity => {
      if (activity.due_date && isAfter(new Date(activity.due_date), now)) {
        deadlines.push({
          type: 'activity',
          title: activity.title,
          date: activity.due_date,
          discipline: getDisciplineName(activity.discipline_id)
        });
      }
    });

    tests.forEach(test => {
      if (test.due_date && isAfter(new Date(test.due_date), now)) {
        const submitted = submissions.some(s => s.test_id === test.id);
        if (!submitted) {
          deadlines.push({
            type: 'test',
            title: test.title,
            date: test.due_date,
            discipline: getDisciplineName(test.discipline_id)
          });
        }
      }
    });

    return deadlines.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);
  };

  const getOverdueItems = () => {
    const now = new Date();
    let overdue = 0;

    activities.forEach(activity => {
      if (activity.due_date && isBefore(new Date(activity.due_date), now)) {
        overdue++;
      }
    });

    tests.forEach(test => {
      if (test.due_date && isBefore(new Date(test.due_date), now)) {
        const submitted = submissions.some(s => s.test_id === test.id);
        if (!submitted) overdue++;
      }
    });

    return overdue;
  };

  const getAverageScore = () => {
    if (submissions.length === 0) return 0;
    const total = submissions.reduce((sum, s) => sum + (s.score / s.total_points * 100), 0);
    return Math.round(total / submissions.length);
  };

  const mandatoryMaterials = getMandatoryMaterials();
  const upcomingDeadlines = getUpcomingDeadlines();
  const overdueCount = getOverdueItems();
  const averageScore = getAverageScore();
  const progressPercentage = mandatoryMaterials.length > 0 ? 70 : 0; // Simplified

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      const photoUrl = result.file_url || result.data?.file_url;
      setProfileFormData({ ...profileFormData, photo_url: photoUrl });
      toast.success('Foto enviada!');
    } catch (error) {
      toast.error('Erro ao enviar foto: ' + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileFormData.full_name.trim()) {
      toast.error('Nome completo é obrigatório');
      return;
    }

    const dataToSave = {
      full_name: profileFormData.full_name.trim(),
      phone: profileFormData.phone?.trim() || null,
      birth_date: profileFormData.birth_date || null,
      registration_number: profileFormData.registration_number?.trim() || null,
      photo_url: profileFormData.photo_url || null
    };

    try {
      if (studentProfile) {
        await base44.entities.StudentProfile.update(studentProfile.id, dataToSave);
        toast.success('Perfil atualizado!');
      } else {
        await base44.entities.StudentProfile.create({
          ...dataToSave,
          user_id: user.id
        });
        toast.success('Perfil criado!');
      }
      setShowProfileForm(false);
      setShowSuccessBanner(true);
      setTimeout(() => setShowSuccessBanner(false), 5000);
      loadData();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Erro ao salvar perfil: ' + (error.message || error.details || JSON.stringify(error)));
    }
  };

  const isProfileIncomplete = !studentProfile || !studentProfile.phone || !studentProfile.birth_date;

  const handleMarkNotificationAsRead = async (notificationId) => {
    try {
      await base44.entities.StudentNotification.update(notificationId, { is_read: true });
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error marking notification as read');
    }
  };

  const handleCloseAnnouncements = async () => {
    try {
      await Promise.all(
        announcements.map(ann => 
          base44.entities.AnnouncementView.create({
            announcement_id: ann.id,
            user_email: user.email,
            viewed_at: new Date().toISOString()
          })
        )
      );
    } catch (error) {
      console.error('Error marking announcements as viewed:', error);
    }
    setShowAnnouncementsModal(false);
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
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-bold mb-2">Meu Dashboard</h1>
            <p className="text-blue-200">Olá, {user?.full_name}! Acompanhe seu progresso acadêmico</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Success Banner */}
        {showSuccessBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <Card className="border-2 border-green-400 bg-gradient-to-r from-green-50 to-emerald-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-800 mb-1">
                      Perfil atualizado com sucesso!
                    </h3>
                    <p className="text-sm text-slate-600">
                      Suas informações foram salvas e estão atualizadas no sistema.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSuccessBanner(false)}
                    className="hover:bg-green-100"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Profile Completion Banner */}
        {isProfileIncomplete && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-800 mb-1">
                      Complete seu perfil
                    </h3>
                    <p className="text-sm text-slate-600 mb-3">
                      Adicione informações como telefone, data de nascimento e foto para ter uma experiência completa na plataforma.
                    </p>
                    <Button 
                      onClick={() => setShowProfileForm(true)}
                      className="bg-amber-500 hover:bg-amber-600"
                    >
                      Completar Perfil
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Profile Info Card */}
        {studentProfile && (
          <Card className="shadow-lg border-2 border-[#1e3a5f] mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {studentProfile.photo_url ? (
                  <img 
                    src={studentProfile.photo_url} 
                    alt="Foto de perfil" 
                    className="w-20 h-20 rounded-full object-cover border-2 border-[#1e3a5f]"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] flex items-center justify-center">
                    <User className="w-10 h-10 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-800 mb-1">{studentProfile.full_name}</h3>
                  <div className="grid md:grid-cols-3 gap-3 text-sm">
                    {studentProfile.registration_number && (
                      <div>
                        <p className="text-slate-500">Matrícula</p>
                        <p className="font-medium text-slate-800">{studentProfile.registration_number}</p>
                      </div>
                    )}
                    {studentProfile.phone && (
                      <div>
                        <p className="text-slate-500">Telefone</p>
                        <p className="font-medium text-slate-800">{studentProfile.phone}</p>
                      </div>
                    )}
                    {studentProfile.birth_date && (
                      <div>
                        <p className="text-slate-500">Nascimento</p>
                        <p className="font-medium text-slate-800">
                          {(() => {
                            const parts = studentProfile.birth_date.split('-');
                            if (parts.length === 3) {
                              return `${parts[2]}/${parts[1]}/${parts[0]}`;
                            }
                            return studentProfile.birth_date;
                          })()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setProfileFormData({
                      full_name: studentProfile.full_name || '',
                      phone: studentProfile.phone || '',
                      birth_date: studentProfile.birth_date || '',
                      registration_number: studentProfile.registration_number || '',
                      photo_url: studentProfile.photo_url || ''
                    });
                    setShowProfileForm(true);
                  }}
                >
                  Editar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Turmas', value: classes.length, icon: GraduationCap, color: 'bg-blue-500' },
            { label: 'Atividades', value: activities.length, icon: ClipboardList, color: 'bg-green-500' },
            { label: 'Testes Feitos', value: submissions.length, icon: FileQuestion, color: 'bg-purple-500' },
            { label: 'Média Geral', value: `${averageScore}%`, icon: TrendingUp, color: 'bg-amber-500' },
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
                      <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                    </div>
                    <div className={`w-14 h-14 rounded-xl ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Gamification Section */}
            {studentPoints && (
              <PointsDisplay studentPoints={studentPoints} />
            )}

            {/* Badges Section */}
            {allBadges.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-[#d4a853]" />
                    Conquistas ({studentBadges.length}/{allBadges.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {allBadges.slice(0, 6).map((badge) => {
                      const earned = studentBadges.find(sb => sb.badge_id === badge.id);
                      return (
                        <BadgeCard
                          key={badge.id}
                          badge={badge}
                          earned={!!earned}
                          earnedDate={earned?.earned_at}
                        />
                      );
                    })}
                  </div>
                  {allBadges.length > 6 && (
                    <p className="text-center text-sm text-slate-500 mt-4">
                      +{allBadges.length - 6} conquistas adicionais
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Ferramentas e Recursos */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#1e3a5f]" />
                  Ferramentas de Estudo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <Link to={createPageUrl('StudentVideos')}>
                    <Card className="hover:shadow-md transition-all border-2 border-transparent hover:border-[#1e3a5f] cursor-pointer h-full">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                            <Video className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-800 mb-1">Vídeos</h4>
                            <p className="text-sm text-slate-600">Assista vídeos educacionais das suas disciplinas</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to={createPageUrl('Projects')}>
                    <Card className="hover:shadow-md transition-all border-2 border-transparent hover:border-[#1e3a5f] cursor-pointer h-full">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <Code2 className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-800 mb-1">Projetos</h4>
                            <p className="text-sm text-slate-600">Explore projetos de código e exemplos práticos</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to={createPageUrl('Boards')}>
                    <Card className="hover:shadow-md transition-all border-2 border-transparent hover:border-[#1e3a5f] cursor-pointer h-full">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                            <Trello className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-800 mb-1">Quadros</h4>
                            <p className="text-sm text-slate-600">Organize seus estudos e projetos com quadros Kanban</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  {siteSettings?.bdz_tutor_enabled && (
                    <Card 
                      onClick={() => setShowBdzTutorModal(true)}
                      className="hover:shadow-md transition-all border-2 border-transparent hover:border-[#1e3a5f] cursor-pointer h-full"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                            <Bot className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-800 mb-1">RCS Tutor</h4>
                            <p className="text-sm text-slate-600">Assistente inteligente para ajudar você a aprender</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Link to={createPageUrl('StudentQuizGenerator')}>
                    <Card className="hover:shadow-md transition-all border-2 border-transparent hover:border-[#1e3a5f] cursor-pointer h-full">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-800 mb-1">Simulado com IA</h4>
                            <p className="text-sm text-slate-600">Gere provas, quizzes ou questionários de qualquer matéria com inteligência artificial</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to={createPageUrl('StudentMessages')}>
                    <Card className="hover:shadow-md transition-all border-2 border-transparent hover:border-[#1e3a5f] cursor-pointer h-full">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-800 mb-1">Mensagens</h4>
                            <p className="text-sm text-slate-600">Converse com seus professores</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to={createPageUrl('StudentExternalCourses')}>
                    <Card className="hover:shadow-md transition-all border-2 border-transparent hover:border-[#1e3a5f] cursor-pointer h-full">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                            <ExternalLink className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-800 mb-1">Cursos Externos</h4>
                            <p className="text-sm text-slate-600">Acesse cursos externos e envie certificados</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to={createPageUrl('Chat')}>
                    <Card className="hover:shadow-md transition-all border-2 border-transparent hover:border-[#1e3a5f] cursor-pointer h-full">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-800 mb-1">Chat ao Vivo</h4>
                            <p className="text-sm text-slate-600">Converse com seu professor em tempo real</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Link to={createPageUrl('Appointments')}>
                    <Card className="hover:shadow-md transition-all border-2 border-transparent hover:border-[#1e3a5f] cursor-pointer h-full">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-800 mb-1">Agendamentos</h4>
                            <p className="text-sm text-slate-600">Agende horários para dúvidas e aulas online</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                  </div>
                  </CardContent>
                  </Card>
            {/* Progress Section */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#1e3a5f]" />
                  Progresso de Materiais Obrigatórios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Conclusão Geral</span>
                      <span className="text-sm font-bold text-[#1e3a5f]">{progressPercentage}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-3" />
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{mandatoryMaterials.length}</p>
                      <p className="text-xs text-slate-500">Obrigatórios</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-600">{upcomingDeadlines.length}</p>
                      <p className="text-xs text-slate-500">Próximos Prazos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
                      <p className="text-xs text-slate-500">Atrasados</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enrolled Classes */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-[#1e3a5f]" />
                  Minhas Turmas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {classes.length > 0 ? (
                  <div className="space-y-3">
                    {classes.map((cls) => (
                      <div key={cls.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div>
                          <h4 className="font-semibold text-slate-800">{cls.name}</h4>
                          {cls.description && (
                            <p className="text-sm text-slate-500">{cls.description}</p>
                          )}
                        </div>
                        <Badge variant="secondary">{cls.year || new Date().getFullYear()}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-slate-500">Você ainda não está matriculado em nenhuma turma.</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Activities */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-[#1e3a5f]" />
                    Atividades Recentes
                  </div>
                  <Link to={createPageUrl('Activities')}>
                    <Button variant="ghost" size="sm">
                      Ver todas
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length > 0 ? (
                  <div className="space-y-3">
                    {activities.slice(0, 4).map((activity) => {
                      const isOverdue = activity.due_date && isBefore(new Date(activity.due_date), new Date());
                      return (
                        <Link key={activity.id} to={createPageUrl('ActivityView') + '?id=' + activity.id}>
                          <div className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOverdue ? 'bg-red-100' : 'bg-blue-100'}`}>
                              {isOverdue ? <AlertCircle className="w-5 h-5 text-red-600" /> : <ClipboardList className="w-5 h-5 text-blue-600" />}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-sm group-hover:text-[#1e3a5f] transition-colors">{activity.title}</h4>
                              <p className="text-xs text-slate-500">{getDisciplineName(activity.discipline_id)}</p>
                              {activity.due_date && (
                                <p className={`text-xs mt-1 ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                                  {isOverdue ? 'Atrasado - ' : 'Prazo: '}
                                  {format(new Date(activity.due_date), "d 'de' MMM", { locale: ptBR })}
                                </p>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#1e3a5f] transition-colors" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center py-8 text-slate-500">Nenhuma atividade disponível.</p>
                )}
              </CardContent>
            </Card>

            {/* Videos Section */}
            {videos.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-[#1e3a5f]" />
                    Vídeos das Minhas Disciplinas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {videos.slice(0, 4).map((video) => (
                      <a
                        key={video.id}
                        href={video.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group"
                      >
                        <Card className="hover:shadow-md transition-all border-2 border-transparent hover:border-[#1e3a5f] cursor-pointer h-full">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0">
                                <Video className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-slate-800 mb-1 group-hover:text-[#1e3a5f] transition-colors line-clamp-2">
                                  {video.title}
                                </h4>
                                <p className="text-xs text-slate-500 mb-2 line-clamp-2">{video.description}</p>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="px-2 py-1 bg-[#1e3a5f] text-white rounded">
                                    {getDisciplineName(video.discipline_id)}
                                  </span>
                                  {video.duration && (
                                    <span className="text-slate-500">{video.duration}</span>
                                  )}
                                  <ExternalLink className="w-3 h-3 text-slate-400 ml-auto" />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Forum Topics */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#1e3a5f]" />
                    Fórum das Minhas Disciplinas
                  </div>
                  <Link to={createPageUrl('Forum')}>
                    <Button variant="ghost" size="sm">
                      Ver todos
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {forumTopics.length > 0 ? (
                  <div className="space-y-3">
                    {forumTopics.map((topic) => (
                      <Link key={topic.id} to={createPageUrl('ForumTopic') + '?id=' + topic.id}>
                        <div className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm truncate">{topic.title}</h4>
                              {topic.is_pinned && (
                                <Badge className="bg-amber-100 text-amber-700 text-xs">Fixado</Badge>
                              )}
                              {topic.is_resolved && (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                            <p className="text-xs text-slate-500">{getDisciplineName(topic.discipline_id)}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                              <span>{topic.reply_count || 0} respostas</span>
                              <span>•</span>
                              <span>{format(new Date(topic.created_date), "d 'de' MMM", { locale: ptBR })}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-slate-500">Nenhum tópico no fórum das suas disciplinas.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Notifications Section */}
            {notifications.length > 0 && (
              <Card className="shadow-lg border-2 border-green-400">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Notificações
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id}
                        className={`p-4 rounded-lg border-2 ${
                          notification.type === 'success' ? 'bg-green-50 border-green-300' :
                          notification.type === 'warning' ? 'bg-yellow-50 border-yellow-300' :
                          notification.type === 'error' ? 'bg-red-50 border-red-300' :
                          'bg-blue-50 border-blue-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-slate-800 mb-1">
                              {notification.title}
                            </h4>
                            <p className="text-xs text-slate-700 mb-2">
                              {notification.message}
                            </p>
                            {notification.link && (
                              <Link to={createPageUrl(notification.link)}>
                                <Button size="sm" variant="outline" className="text-xs">
                                  Ver Detalhes
                                </Button>
                              </Link>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMarkNotificationAsRead(notification.id)}
                            className="flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Announcements Section */}
            {announcements.length > 0 && (
              <Card className="shadow-lg border-2 border-orange-400">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-orange-600" />
                    Avisos do Professor
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {announcements.map((announcement) => (
                      <div 
                        key={announcement.id}
                        className={`p-4 rounded-lg border-2 ${
                          announcement.priority === 'urgent' 
                            ? 'bg-red-50 border-red-300' 
                            : 'bg-blue-50 border-blue-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            announcement.priority === 'urgent' 
                              ? 'bg-red-500' 
                              : 'bg-blue-500'
                          }`}>
                            <Megaphone className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-sm text-slate-800 line-clamp-1">
                                {announcement.title}
                              </h4>
                              {announcement.priority === 'urgent' && (
                                <Badge className="bg-red-600 text-white text-xs">Urgente</Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-700 line-clamp-2">
                              {announcement.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {announcements.length > 3 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowAnnouncementsModal(true)}
                      className="w-full mt-3"
                    >
                      Ver Todos os Avisos
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Upcoming Deadlines */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#1e3a5f]" />
                  Próximos Prazos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingDeadlines.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingDeadlines.map((deadline, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-slate-800 truncate">{deadline.title}</h4>
                          <p className="text-xs text-slate-500 truncate">{deadline.discipline}</p>
                          <p className="text-xs text-orange-600 font-semibold mt-1">
                            {format(new Date(deadline.date), "d 'de' MMMM", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge className="bg-orange-100 text-orange-700 text-xs">
                          {deadline.type === 'test' ? 'Teste' : 'Atividade'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                    <p className="text-sm text-slate-500">Nenhum prazo próximo!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test Results */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileQuestion className="w-5 h-5 text-[#1e3a5f]" />
                    Testes Realizados
                  </div>
                  <Link to={createPageUrl('Tests')}>
                    <Button variant="ghost" size="sm">
                      Ver todos
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {submissions.length > 0 ? (
                  <div className="space-y-3">
                    {submissions.slice(0, 5).map((submission) => {
                      const percentage = Math.round((submission.score / submission.total_points) * 100);
                      const test = tests.find(t => t.id === submission.test_id);
                      return (
                        <div key={submission.id} className="p-3 border border-slate-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm truncate">{test?.title || 'Teste'}</h4>
                            <Badge className={
                              percentage >= 70 ? 'bg-green-100 text-green-700' :
                              percentage >= 50 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }>
                              {percentage}%
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500">
                            {submission.score} / {submission.total_points} pontos
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center py-8 text-slate-500">Nenhum teste realizado ainda.</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-lg border-[#d4a853] border-2">
              <CardHeader className="bg-gradient-to-r from-[#d4a853]/10 to-[#f0c674]/10">
                <CardTitle className="text-base">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                <Link to={createPageUrl('Materials')}>
                  <Button variant="outline" className="w-full justify-start">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Ver Materiais
                  </Button>
                </Link>
                <Link to={createPageUrl('Tests')}>
                  <Button variant="outline" className="w-full justify-start">
                    <FileQuestion className="w-4 h-4 mr-2" />
                    Fazer Testes
                  </Button>
                </Link>
                <Link to={createPageUrl('Activities')}>
                  <Button variant="outline" className="w-full justify-start">
                    <ClipboardList className="w-4 h-4 mr-2" />
                    Ver Atividades
                  </Button>
                </Link>
                <Link to={createPageUrl('StudentProgress')}>
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Meu Progresso
                  </Button>
                </Link>
                <Link to={createPageUrl('Forum')}>
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Fórum
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bdz Tutor Modal */}
      <Dialog open={showBdzTutorModal} onOpenChange={setShowBdzTutorModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-[#1e3a5f] mb-3">
                Conheça o Bdz Tutor
              </h2>
              <p className="text-slate-600 text-lg">
                Seu assistente de estudos que não dá respostas prontas - ele te ajuda a{' '}
                <span className="font-bold text-[#1e3a5f]">pensar, analisar e construir</span>{' '}
                seu próprio conhecimento.
              </p>
            </div>

            {/* Bdz Tutor Component */}
            <BdzTutor 
              isEnabled={siteSettings?.bdz_tutor_enabled} 
              greeting={siteSettings?.bdz_tutor_greeting}
              llmSettings={siteSettings}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Announcements Modal */}
      <Dialog open={showAnnouncementsModal} onOpenChange={handleCloseAnnouncements}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-[#1e3a5f]" />
              Avisos Importantes
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {announcements.map((announcement) => (
              <div 
                key={announcement.id}
                className={`p-4 rounded-lg border-2 ${
                  announcement.priority === 'urgent' 
                    ? 'bg-red-50 border-red-400' 
                    : 'bg-blue-50 border-blue-400'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    announcement.priority === 'urgent' 
                      ? 'bg-red-500' 
                      : 'bg-blue-500'
                  }`}>
                    <Megaphone className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-800 mb-2">
                      {announcement.title}
                    </h3>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {announcement.message}
                    </p>
                    {announcement.priority === 'urgent' && (
                      <Badge className="mt-3 bg-red-600">Urgente</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleCloseAnnouncements} className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Form Dialog */}
      <Dialog open={showProfileForm} onOpenChange={setShowProfileForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete suas Informações</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Photo Upload */}
            <div className="flex flex-col items-center gap-4 pb-4 border-b">
              {profileFormData.photo_url ? (
                <div className="relative">
                  <img 
                    src={profileFormData.photo_url} 
                    alt="Foto de perfil" 
                    className="w-32 h-32 rounded-full object-cover border-4 border-[#1e3a5f]"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 p-0"
                    onClick={() => setProfileFormData({ ...profileFormData, photo_url: '' })}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-slate-200 flex items-center justify-center">
                  <User className="w-16 h-16 text-slate-400" />
                </div>
              )}
              <label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploadingPhoto}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  disabled={uploadingPhoto}
                  asChild
                >
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingPhoto ? 'Enviando...' : 'Enviar Foto (Opcional)'}
                  </span>
                </Button>
              </label>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={profileFormData.full_name}
                  onChange={(e) => setProfileFormData({ ...profileFormData, full_name: e.target.value })}
                  placeholder="Seu nome completo"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Telefone (Opcional)</Label>
                <Input
                  value={profileFormData.phone}
                  onChange={(e) => setProfileFormData({ ...profileFormData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Data de Nascimento (Opcional)</Label>
                <Input
                  type="date"
                  value={profileFormData.birth_date}
                  onChange={(e) => setProfileFormData({ ...profileFormData, birth_date: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="col-span-2">
                <Label>Número de Matrícula (Opcional)</Label>
                <Input
                  value={profileFormData.registration_number}
                  onChange={(e) => setProfileFormData({ ...profileFormData, registration_number: e.target.value })}
                  placeholder="Sua matrícula"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowProfileForm(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveProfile}
                className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
              >
                Salvar Perfil
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
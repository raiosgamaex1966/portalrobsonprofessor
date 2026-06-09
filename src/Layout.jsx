import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import { 
  Home, BookOpen, FileQuestion, Shield, Menu, X, 
  GraduationCap, LogOut, User, Settings, Sparkles, ClipboardList, MessageSquare, Code2, Trello, Upload, Edit
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Layout({ children, currentPageName }) {
  const { user: authUser, navigateToLogin, logout: authLogout } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(authUser);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    full_name: '',
    phone: '',
    birth_date: '',
    photo_url: ''
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    setUser(authUser);
    if (authUser) {
      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();
          if (error) throw error;
          if (data) {
            setUserProfile({
              full_name: data.full_name || authUser.name || authUser.email.split('@')[0],
              photo_url: data.photo_url || '',
              phone: data.phone || '',
              birth_date: data.birth_date || ''
            });
          } else {
            setUserProfile({
              full_name: authUser.name || authUser.email.split('@')[0],
              photo_url: ''
            });
          }
        } catch (err) {
          console.error("Erro ao carregar perfil:", err);
          setUserProfile({
            full_name: authUser.name || authUser.email.split('@')[0],
            photo_url: ''
          });
        }
      };
      fetchProfile();
    } else {
      setUserProfile(null);
    }
  }, [authUser]);

  const handleLogout = () => {
    authLogout();
  };

  const handleRcsTutorClick = (e) => {
    e.preventDefault();
    if (currentPageName !== 'Home') {
      window.location.href = createPageUrl('Home') + '#bdz-tutor';
    } else {
      document.getElementById('bdz-tutor')?.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const handleEditProfile = () => {
    setProfileFormData({
      full_name: userProfile?.full_name || user?.full_name || '',
      phone: userProfile?.phone || '',
      birth_date: userProfile?.birth_date || '',
      photo_url: userProfile?.photo_url || ''
    });
    setShowProfileDialog(true);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfileFormData(prev => ({ ...prev, photo_url: file_url }));
      toast.success('Foto enviada com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar foto:', error);
      toast.error('Erro ao enviar foto: ' + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (profileFormData.password) {
        const { error } = await supabase.auth.updateUser({ password: profileFormData.password });
        if (error) throw error;
      }

      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: profileFormData.full_name,
            phone: profileFormData.phone,
            birth_date: profileFormData.birth_date || null,
            photo_url: profileFormData.photo_url
          })
          .eq('id', user.id);
        if (profileError) throw profileError;
      }
      
      setUserProfile({ ...userProfile, ...profileFormData });
      setShowProfileDialog(false);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar perfil: ' + error.message);
    }
  };

  const handleAcademicClick = (e, item) => {
    if (currentPageName === 'Home') {
      e.preventDefault();
      const sectionId = item.name === 'Materials' ? 'materiais' : 
                        item.name === 'Activities' ? 'atividades' :
                        item.name === 'Tests' ? 'testes' :
                        item.name === 'Forum' ? 'forum' :
                        item.name === 'Projects' ? 'projetos' :
                        item.name === 'Boards' ? 'quadros' : null;
      if (sectionId) {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
        setMobileMenuOpen(false);
      }
    } else if (currentPageName !== 'Home' && (item.name === 'Projects' || item.name === 'Boards')) {
      e.preventDefault();
      const hash = item.name === 'Projects' ? 'projetos' : 'quadros';
      window.location.href = createPageUrl('Home') + '#' + hash;
    }
  };

  const menuCategories = [
    {
      label: 'Acadêmico',
      icon: GraduationCap,
      items: [
        { name: 'Materials', icon: BookOpen, label: 'Materiais' },
        { name: 'Activities', icon: ClipboardList, label: 'Atividades' },
        { name: 'Tests', icon: FileQuestion, label: 'Testes' },
        { name: 'Forum', icon: MessageSquare, label: 'Fórum' }
      ]
    },
    {
      label: 'Ferramentas',
      icon: Settings,
      items: [
        { name: 'Projects', icon: Code2, label: 'Projetos' },
        { name: 'Boards', icon: Trello, label: 'Quadros' }
      ]
    }
  ];

  const loggedInPages = user ? [
    ...(user.role === 'admin' 
      ? [
          { name: 'Admin', icon: Shield, label: 'Admin' },
          { name: 'AdminAiAgents', icon: Settings, label: 'Tutores IA' },
          { name: 'StudentAiAgents', icon: Sparkles, label: 'Estudo IA' }
        ]
      : (user.role === 'alunos' || user.role === 'aluno' || user.role === 'user' || user.role === 'student')
      ? [
          { name: 'StudentDashboard', icon: GraduationCap, label: 'Meu Dashboard' },
          { name: 'StudentExternalCourses', icon: GraduationCap, label: 'Cursos Externos' },
          { name: 'StudentMessages', icon: MessageSquare, label: 'Mensagens' }
        ]
      : []
    )
  ] : [];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to={createPageUrl('Home')} className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-[#1e3a5f] hidden sm:inline-block">
                Portal Robson Cordeiro
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link
                to={createPageUrl('Home')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPageName === 'Home' 
                  ? 'bg-[#1e3a5f]/10 text-[#1e3a5f]' 
                  : 'text-slate-600 hover:text-[#1e3a5f] hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Início
                </div>
              </Link>

              {menuCategories.map((category) => (
                <DropdownMenu key={category.label}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="text-slate-600 hover:text-[#1e3a5f] gap-2">
                      <category.icon className="w-4 h-4" />
                      {category.label}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {category.items.map((item) => (
                      <DropdownMenuItem key={item.name} asChild>
                        <Link 
                          to={createPageUrl(item.name)}
                          onClick={(e) => handleAcademicClick(e, item)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ))}

              <a
                href="#"
                onClick={handleRcsTutorClick}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-[#1e3a5f] hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  RCS Tutor
                </div>
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="hidden md:flex items-center gap-1 mr-2">
                  {loggedInPages.map((page) => (
                    <Link
                      key={page.name}
                      to={createPageUrl(page.name)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentPageName === page.name
                        ? 'bg-[#1e3a5f]/10 text-[#1e3a5f]'
                        : 'text-slate-600 hover:text-[#1e3a5f] hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <page.icon className="w-4 h-4" />
                        {page.label}
                      </div>
                    </Link>
                  ))}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                        {userProfile?.photo_url ? (
                          <img 
                            src={userProfile.photo_url} 
                            alt={userProfile.full_name} 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {userProfile?.full_name || user.email}
                        </p>
                        <p className="text-xs leading-none text-slate-500">
                          {user.email}
                        </p>
                        {user.role && (
                          <span className="inline-flex items-center rounded-full bg-[#1e3a5f]/10 px-2 py-0.5 text-xs font-medium text-[#1e3a5f] w-fit">
                            {user.role}
                          </span>
                        )}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleEditProfile} className="cursor-pointer">
                      <Edit className="w-4 h-4 mr-2" />
                      Editar Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => navigateToLogin()}
                  className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
                >
                  Entrar
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200 bg-white">
            <div className="container mx-auto px-4 space-y-4">
              <div className="space-y-1">
                <Link
                  to={createPageUrl('Home')}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
                    currentPageName === 'Home'
                    ? 'bg-[#1e3a5f]/10 text-[#1e3a5f]'
                    : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  Início
                </Link>

                {menuCategories.map((category) => (
                  <div key={category.label} className="py-2">
                    <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <category.icon className="w-3 h-3" />
                      {category.label}
                    </div>
                    {category.items.map((item) => (
                      <Link
                        key={item.name}
                        to={createPageUrl(item.name)}
                        onClick={(e) => {
                          handleAcademicClick(e, item);
                          setMobileMenuOpen(false);
                        }}
                        className={`flex items-center gap-2 px-8 py-2 rounded-lg text-sm font-medium ${
                          currentPageName === item.name
                          ? 'text-[#1e3a5f]'
                          : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ))}

                <a
                  href="#"
                  onClick={handleRcsTutorClick}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Sparkles className="w-4 h-4" />
                  RCS Tutor
                </a>

                {user && (
                  <div className="pt-4 border-t border-slate-100 mt-4">
                    {loggedInPages.map((page) => (
                      <Link
                        key={page.name}
                        to={createPageUrl(page.name)}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
                          currentPageName === page.name
                          ? 'bg-[#1e3a5f]/10 text-[#1e3a5f]'
                          : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <page.icon className="w-4 h-4" />
                        {page.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col items-center gap-4 mb-4">
              <div className="relative h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200 overflow-hidden group">
                {profileFormData.photo_url ? (
                  <img 
                    src={profileFormData.photo_url} 
                    alt="Preview" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-10 w-10 text-slate-400" />
                )}
                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Upload className="w-6 h-6 text-white" />
                  <input type="file" className="hidden" onChange={handlePhotoUpload} accept="image/*" />
                </label>
              </div>
              <p className="text-xs text-slate-500">Clique para alterar a foto</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input 
                id="full_name" 
                value={profileFormData.full_name} 
                onChange={(e) => setProfileFormData({ ...profileFormData, full_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input 
                id="phone" 
                value={profileFormData.phone} 
                onChange={(e) => setProfileFormData({ ...profileFormData, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="birth_date">Data de Nascimento</Label>
              <Input 
                id="birth_date" 
                type="date"
                value={profileFormData.birth_date} 
                onChange={(e) => setProfileFormData({ ...profileFormData, birth_date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Alterar Senha</Label>
              <Input 
                id="password" 
                type="password"
                placeholder="Nova senha (mínimo 6 caracteres)"
                autoComplete="new-password"
                value={profileFormData.password || ''} 
                onChange={(e) => setProfileFormData({ ...profileFormData, password: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowProfileDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProfile} className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

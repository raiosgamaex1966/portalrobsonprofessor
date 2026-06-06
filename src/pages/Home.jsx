import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import HeroSection from "@/components/home/HeroSection";
import BdzTutor from "@/components/home/BdzTutor";
import DisciplineCard from "@/components/materials/DisciplineCard";
import { BookOpen, Sparkles, Shield, ArrowRight, ClipboardList, Calendar, FileText, ChevronLeft, ChevronRight, FileQuestion, MessageSquare, Trello, Code2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";

export default function Home() {
  const [settings, setSettings] = useState(null);
  const [disciplines, setDisciplines] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSetupBanner, setShowSetupBanner] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentActivityPage, setCurrentActivityPage] = useState(0);
  const [user, setUser] = useState(null);
  const DISCIPLINES_PER_PAGE = 3;
  const ACTIVITIES_PER_PAGE = 3;

  useEffect(() => {
    checkUserAndRedirect();
    loadData();
  }, []);

  const checkUserAndRedirect = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      }
    } catch (error) {
      // Usuário não autenticado, continua na Home
      setUser(null);
    }
  };

  const loadData = async () => {
    const [settingsData, disciplinesData, activitiesData] = await Promise.all([
      base44.entities.SiteSettings.list(),
      base44.entities.Discipline.filter({ is_active: true }),
      base44.entities.Activity.filter({ is_active: true })
    ]);

    setSettings(settingsData[0] || {});
    setDisciplines(disciplinesData);
    setActivities(activitiesData);

    // Check if admin exists
    try {
      const users = await base44.entities.User.filter({ role: 'admin' });
      setShowSetupBanner(users.length === 0);
    } catch (error) {
      console.error('Error checking admin:', error);
    }

    setLoading(false);
  };



  const totalPages = Math.ceil(disciplines.length / DISCIPLINES_PER_PAGE);
  const startIndex = currentPage * DISCIPLINES_PER_PAGE;
  const paginatedDisciplines = disciplines.slice(startIndex, startIndex + DISCIPLINES_PER_PAGE);

  const goToPrevious = () => {
    setCurrentPage((prev) => (prev > 0 ? prev - 1 : totalPages - 1));
  };

  const goToNext = () => {
    setCurrentPage((prev) => (prev < totalPages - 1 ? prev + 1 : 0));
  };

  const totalActivityPages = Math.ceil(activities.length / ACTIVITIES_PER_PAGE);
  const startActivityIndex = currentActivityPage * ACTIVITIES_PER_PAGE;
  const paginatedActivities = activities.slice(startActivityIndex, startActivityIndex + ACTIVITIES_PER_PAGE);

  const goToActivityPrevious = () => {
    setCurrentActivityPage((prev) => (prev > 0 ? prev - 1 : totalActivityPages - 1));
  };

  const goToActivityNext = () => {
    setCurrentActivityPage((prev) => (prev < totalActivityPages - 1 ? prev + 1 : 0));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Setup Banner */}
      {showSetupBanner && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#d4a853] to-[#f0c674] text-[#1e3a5f] py-3 px-6"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5" />
              <span className="font-medium">Configure o primeiro administrador do portal</span>
            </div>
            <Link to={createPageUrl('AdminSetup')}>
              <Button size="sm" variant="outline" className="bg-white/20 border-[#1e3a5f]/20 hover:bg-white/30">
                Configurar Agora
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </motion.div>
      )}

      <HeroSection />

      {/* Bdz Tutor Section */}
      <section id="bdz-tutor" className="py-16 lg:py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#d4a853]/10 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-[#d4a853]" />
              <span className="text-sm font-medium text-[#1e3a5f]">Inteligência Artificial</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#1e3a5f] mb-4">
              Conheça o RCS Tutor
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              Seu assistente de estudos que não dá respostas prontas - ele te ajuda a 
              <span className="font-semibold text-[#1e3a5f]"> pensar, analisar e construir</span> seu próprio conhecimento.
            </p>
          </motion.div>

          <BdzTutor 
            isEnabled={settings?.bdz_tutor_enabled !== false} 
            greeting={settings?.bdz_tutor_greeting}
            llmSettings={settings}
          />
        </div>
      </section>

      {/* Materiais Section */}
      <section id="materiais" className="py-16 lg:py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Image */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex justify-center"
            >
              <img 
                src="https://media.base44.com/images/public/6a0d80dad9912f00febb90bc/947831105_generated_image.png"
                alt="RCS Tutor - Materiais"
                className="w-full max-w-md h-auto drop-shadow-2xl"
              />
            </motion.div>

            {/* Right side - Content */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-6">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Biblioteca Digital</span>
              </div>
              
              <h2 className="text-3xl lg:text-4xl font-bold text-[#1e3a5f] mb-6">
                Materiais Organizados e de Fácil Acesso
              </h2>
              
              <p className="text-slate-600 text-lg mb-6 leading-relaxed">
                Todos os materiais de estudo estão organizados por disciplina e disponíveis 24 horas por dia. 
                Acesse de qualquer lugar, a qualquer momento.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-1">PDFs, Vídeos e Documentos</h4>
                    <p className="text-sm text-slate-600">Variedade de formatos para facilitar seu aprendizado</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-1">Organização por Disciplina</h4>
                    <p className="text-sm text-slate-600">Encontre rapidamente o que precisa</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-1">Disponível 24/7</h4>
                    <p className="text-sm text-slate-600">Acesse quando e onde quiser</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Atividades Section */}
      <section id="atividades" className="py-16 lg:py-24 px-6 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-full mb-6">
                <ClipboardList className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">Atividades Práticas</span>
              </div>
              
              <h2 className="text-3xl lg:text-4xl font-bold text-[#1e3a5f] mb-6">
                Pratique e Aprimore Seus Conhecimentos
              </h2>
              
              <p className="text-slate-600 text-lg mb-6 leading-relaxed">
                Resolva atividades práticas, envie suas respostas e receba feedback do professor. 
                Tudo de forma simples e organizada em um só lugar.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-1">Envio Fácil de Respostas</h4>
                    <p className="text-sm text-slate-600">Anexe arquivos e envie suas soluções com poucos cliques</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-1">Prazos Claros</h4>
                    <p className="text-sm text-slate-600">Acompanhe as datas de entrega de cada atividade</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-1">Feedback do Professor</h4>
                    <p className="text-sm text-slate-600">Receba correções e orientações personalizadas</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right side - Image */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex justify-center"
            >
              <img 
                src="https://media.base44.com/images/public/6a0d80dad9912f00febb90bc/71e5577f4_generated_image.png"
                alt="RCS Tutor - Atividades"
                className="w-full max-w-md h-auto drop-shadow-2xl"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testes Section */}
      <section id="testes" className="py-16 lg:py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full mb-6">
                <FileQuestion className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Avaliações Online</span>
              </div>
              
              <h2 className="text-3xl lg:text-4xl font-bold text-[#1e3a5f] mb-6">
                Teste Seus Conhecimentos de Forma Prática
              </h2>
              
              <p className="text-slate-600 text-lg mb-6 leading-relaxed">
                Realize testes e avaliações online de forma rápida e intuitiva. Receba 
                feedback instantâneo e acompanhe seu desempenho em cada disciplina.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <FileQuestion className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-1">Interface Intuitiva</h4>
                    <p className="text-sm text-slate-600">Responda questões de forma simples e organizada</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-1">Resultado Imediato</h4>
                    <p className="text-sm text-slate-600">Veja sua nota e desempenho assim que finalizar</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-1">Prazos Flexíveis</h4>
                    <p className="text-sm text-slate-600">Acesse os testes dentro do período estabelecido</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right side - Image */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex justify-center"
            >
              <img 
                src="https://media.base44.com/images/public/6a0d80dad9912f00febb90bc/476f0c8ae_generated_image.png"
                alt="RCS Tutor - Testes"
                className="w-full max-w-md h-auto drop-shadow-2xl"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Fóruns Section */}
          <section id="forum" className="py-16 lg:py-24 px-6 bg-gradient-to-br from-violet-50 to-purple-50">
            <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left side - Content */}
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full mb-6">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Fóruns de Discussão</span>
                  </div>

                  <h2 className="text-3xl lg:text-4xl font-bold text-[#1e3a5f] mb-6">
                    Tire Dúvidas e Compartilhe Conhecimento
                  </h2>

                  <p className="text-slate-600 text-lg mb-6 leading-relaxed">
                    Nosso fórum de discussão é o espaço perfeito para interagir com colegas e professores. 
                    Interface simples e organizada por disciplina para facilitar suas conversas.
                  </p>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-1">Discussões Organizadas</h4>
                        <p className="text-sm text-slate-600">Tópicos organizados por disciplina para você encontrar o que precisa</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-1">Interação Fácil</h4>
                        <p className="text-sm text-slate-600">Crie tópicos, responda dúvidas e acompanhe discussões com facilidade</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-1">Aprendizado Colaborativo</h4>
                        <p className="text-sm text-slate-600">Aprenda com seus colegas e contribua com seu conhecimento</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Right side - Image */}
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="flex justify-center"
                >
                  <img 
                    src="https://media.base44.com/images/public/6a0d80dad9912f00febb90bc/6462d7081_generated_image.png"
                    alt="RCS Tutor - Fórum"
                    className="w-full max-w-md h-auto drop-shadow-2xl"
                  />
                </motion.div>
              </div>
            </div>
          </section>

          {/* Quadros de Backlog Section */}
          <section id="quadros" className="py-16 lg:py-24 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Image */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex justify-center"
            >
              <img 
                src="https://media.base44.com/images/public/6a0d80dad9912f00febb90bc/9a35a0fef_generated_image.png"
                alt="RCS Tutor - Quadros Kanban"
                className="w-full max-w-md h-auto drop-shadow-2xl"
              />
            </motion.div>

            {/* Right side - Content */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 rounded-full mb-6">
                <Trello className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-800">Gestão de Tarefas</span>
              </div>

              <h2 className="text-3xl lg:text-4xl font-bold text-[#1e3a5f] mb-6">
                Organize Suas Tarefas com Quadros Kanban
              </h2>

              <p className="text-slate-600 text-lg mb-6 leading-relaxed">
                Gerencie suas atividades acadêmicas de forma visual e prática com nossos 
                quadros de backlog. Organize tarefas, defina prioridades e acompanhe seu progresso.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Trello className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-1">Organização Visual</h4>
                    <p className="text-sm text-slate-600">Visualize suas tarefas em formato Kanban intuitivo</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-1">Gestão de Prioridades</h4>
                    <p className="text-sm text-slate-600">Defina prioridades e organize suas atividades por importância</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-1">Acompanhamento em Tempo Real</h4>
                    <p className="text-sm text-slate-600">Veja seu progresso e gerencie prazos com facilidade</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
          </div>
          </section>

          {/* Projetos Section */}
          <section id="projetos" className="py-16 lg:py-24 px-6 bg-gradient-to-br from-cyan-50 to-teal-50">
            <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left side - Content */}
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-100 rounded-full mb-6">
                    <Code2 className="w-4 h-4 text-cyan-600" />
                    <span className="text-sm font-medium text-cyan-800">Gestão de Projetos</span>
                  </div>

                  <h2 className="text-3xl lg:text-4xl font-bold text-[#1e3a5f] mb-6">
                    Desenvolva Projetos de Forma Colaborativa
                  </h2>

                  <p className="text-slate-600 text-lg mb-6 leading-relaxed">
                    Crie e gerencie projetos acadêmicos com facilidade. Organize arquivos, 
                    acompanhe o progresso e colabore com seus colegas em um ambiente integrado.
                  </p>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
                        <Code2 className="w-5 h-5 text-cyan-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-1">Organização de Arquivos</h4>
                        <p className="text-sm text-slate-600">Mantenha todos os arquivos do projeto organizados em um só lugar</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
                        <ClipboardList className="w-5 h-5 text-cyan-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-1">Trabalho Colaborativo</h4>
                        <p className="text-sm text-slate-600">Trabalhe em equipe de forma eficiente e organizada</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-cyan-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-1">Acompanhamento de Progresso</h4>
                        <p className="text-sm text-slate-600">Visualize o andamento e gerencie prazos com facilidade</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Right side - Image */}
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="flex justify-center"
                >
                  <img 
                    src="https://media.base44.com/images/public/6a0d80dad9912f00febb90bc/aff480232_generated_image.png"
                    alt="RCS Tutor - Projetos"
                    className="w-full max-w-md h-auto drop-shadow-2xl"
                  />
                </motion.div>
              </div>
            </div>
          </section>

                  {/* Footer */}
                  <footer className="bg-[#1e3a5f] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="text-2xl font-bold mb-2">Portal do Professor Robson Cordeiro</h3>
          <p className="text-blue-200">Educação com tecnologia e inovação</p>
          <div className="mt-6 pt-6 border-t border-white/10 text-sm text-blue-300">
            © {new Date().getFullYear()} Todos os direitos reservados
          </div>
        </div>
      </footer>
    </div>
  );
}
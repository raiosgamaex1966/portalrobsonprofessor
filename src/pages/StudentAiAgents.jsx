import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Sparkles, BookOpen, FileText, CheckCircle, AlertTriangle, ArrowRight, ShieldAlert, Cpu } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from '@/api/supabaseClient';
import { createPageUrl } from "@/utils";

const getEmojiIcon = (iconKey) => {
  const mapping = {
    cranio: "🧠",
    torax: "🫁",
    abdomen: "🫃",
    coluna: "🦴",
    face: "😷",
    msup: "💪",
    minf: "🦵",
    pelve: "⚕️",
    generic: "🔬",
    math: "📐",
    logic: "🧩",
  };
  return mapping[iconKey] || "🔬";
};

export default function StudentAiAgents() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [materialsCount, setMaterialsCount] = useState({});
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setProfile(prof);
      }

      const { data: agentsData, error: agentsErr } = await supabase
        .from('custom_agents')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: true });

      if (agentsErr) throw agentsErr;
      setAgents(agentsData || []);

      const { data: matsData, error: matsErr } = await supabase
        .from('agent_materials')
        .select('agent_id');
      
      if (matsErr) throw matsErr;

      const counts = {};
      matsData?.forEach(m => {
        counts[m.agent_id] = (counts[m.agent_id] || 0) + 1;
      });
      setMaterialsCount(counts);

    } catch (err) {
      console.error("Erro ao carregar agentes:", err);
      toast.error("Erro ao carregar tutores de IA.");
    } finally {
      setLoading(false);
    }
  };

  const hasMaterials = (agentId) => (materialsCount[agentId] || 0) > 0;

  return (
    <div className="min-h-screen bg-[#090d16] text-[#f3f4f6] py-6 px-4 sm:py-10 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Hero Section */}
        <div className="relative overflow-hidden bg-[#0f1626] rounded-3xl p-6 sm:p-10 text-white shadow-2xl border border-slate-800">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tecnologia Conversacional RAG Avançada</span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Centro de Estudos IA
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Estude com tutores inteligentes especializados em cada área da Radiologia e Concursos. Os tutores respondem com base exclusiva nos PDFs fornecidos e preparam simulados e flashcards.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs sm:text-sm font-medium text-slate-300">
                  {agents.filter(a => hasMaterials(a.id)).length} Tutores com Material
                </span>
              </div>
              
              {profile?.role === 'admin' && (
                <Link to={createPageUrl('AdminAiAgents')}>
                  <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white rounded-xl text-xs sm:text-sm transition-all h-auto py-2">
                    ⚙️ Painel do Tutor
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-slate-700 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-400 text-xs sm:text-sm">Carregando seus tutores inteligentes...</p>
          </div>
        ) : agents.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-800 bg-[#0f1626] p-8 sm:p-12 text-center rounded-2xl max-w-xl mx-auto shadow-sm">
            <CardHeader className="flex items-center justify-center pb-2">
              <Cpu className="w-12 h-12 text-slate-500 mb-4 animate-pulse" />
              <CardTitle className="text-lg sm:text-xl font-bold text-slate-200">Nenhum Tutor Ativo</CardTitle>
              <CardDescription className="text-slate-400 text-xs sm:text-sm">
                O administrador ainda não inicializou os agentes de estudo no banco de dados.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {profile?.role === 'admin' ? (
                <Link to={createPageUrl('AdminAiAgents')}>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all text-xs sm:text-sm px-6 py-2.5">
                    Ir para Configuração de Agentes
                  </Button>
                </Link>
              ) : (
                <p className="text-slate-500 text-xs sm:text-sm italic">
                  Por favor, avise o seu professor para configurar os tutores do portal.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
                <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300" />
                Selecione um Tutor Especialista
              </h2>
              <span className="text-[10px] sm:text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-full font-medium">
                {agents.length} Disponíveis
              </span>
            </div>

            {/* Grid of Agents */}
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {agents.map((agent) => {
                const active = hasMaterials(agent.id);
                return (
                  <motion.div
                    key={agent.id}
                    whileHover={{ y: -3, transition: { duration: 0.1 } }}
                    className="relative cursor-pointer"
                    onClick={() => {
                      if (!active) {
                        toast.error(`O tutor ${agent.label} ainda não tem material de leitura carregado pelo professor.`);
                        return;
                      }
                      navigate(`${createPageUrl('StudentAiStudyRoom')}?agent=${agent.id}`);
                    }}
                  >
                    <div className={`h-full rounded-2xl bg-[#131b2e] border border-slate-800 p-4 sm:p-5 shadow-lg transition-all hover:border-slate-700/80 ${
                      !active ? 'opacity-50 grayscale-[40%]' : ''
                    }`}>
                      {/* Top Header info */}
                      <div className="flex items-center justify-between mb-4">
                        <div 
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl shadow-inner flex-shrink-0"
                          style={{ background: agent.gradient || 'linear-gradient(135deg, #cbd5e1, #94a3b8)' }}
                        >
                          {getEmojiIcon(agent.icon)}
                        </div>
                        <Badge 
                          className={`rounded-full text-[9px] py-0.5 px-2 font-bold ${
                            active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {active ? 'Com Material' : 'Aguardando PDF'}
                        </Badge>
                      </div>

                      {/* Info body */}
                      <h3 className="font-extrabold text-sm sm:text-base mb-1 line-clamp-1" style={{ color: agent.color }}>
                        {agent.label}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-400 font-semibold mb-4 line-clamp-2 leading-relaxed">
                        {agent.title || 'Preparatório especializado'}
                      </p>

                      {/* Footer link indicator */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-[10px] sm:text-xs mt-auto">
                        <span className="text-slate-400 font-medium">
                          {active ? 'Acessar sala de estudos' : 'Aguardando carga'}
                        </span>
                        {active && <ArrowRight className="w-3.5 h-3.5 text-slate-400" />}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

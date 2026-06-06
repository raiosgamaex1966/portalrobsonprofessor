import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Star, TrendingUp, Zap } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

export default function PointsDisplay({ studentPoints }) {
  const pointsForNextLevel = studentPoints.level * 100;
  const currentLevelPoints = studentPoints.total_points % 100;
  const progressToNextLevel = (currentLevelPoints / pointsForNextLevel) * 100;

  return (
    <Card className="shadow-lg border-2 border-[#d4a853] bg-gradient-to-br from-amber-50 to-yellow-50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#d4a853] to-[#f0c674] flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-800">
                Nível {studentPoints.level}
              </h3>
              <p className="text-sm text-slate-600">{studentPoints.total_points} pontos totais</p>
            </div>
          </div>
          
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Star className="w-8 h-8 text-[#d4a853]" />
          </motion.div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-600 mb-1">
            <span>Progresso para Nível {studentPoints.level + 1}</span>
            <span>{currentLevelPoints} / {pointsForNextLevel}</span>
          </div>
          <Progress value={progressToNextLevel} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3 text-center">
            <TrendingUp className="w-5 h-5 mx-auto text-green-600 mb-1" />
            <p className="text-xs text-slate-500">Atividades</p>
            <p className="font-bold text-slate-800">{studentPoints.activity_completions || 0}</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <Zap className="w-5 h-5 mx-auto text-purple-600 mb-1" />
            <p className="text-xs text-slate-500">Sequência</p>
            <p className="font-bold text-slate-800">{studentPoints.streak_days || 0} dias</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
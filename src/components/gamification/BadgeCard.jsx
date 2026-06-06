import React from 'react';
import { motion } from 'framer-motion';
import { 
  Award, CheckCircle, BookOpen, Star, Trophy, MessageSquare, 
  Flame, Target, Zap, Crown, Medal, Gift 
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const iconMap = {
  CheckCircle, BookOpen, Star, Trophy, MessageSquare, 
  Flame, Target, Zap, Crown, Medal, Gift, Award
};

export default function BadgeCard({ badge, earned, earnedDate }) {
  const Icon = iconMap[badge.icon] || Award;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: earned ? 1.05 : 1 }}
      className="relative"
    >
      <Card 
        className={`transition-all ${
          earned 
            ? 'border-2 shadow-lg' 
            : 'opacity-50 grayscale border-slate-200'
        }`}
        style={earned ? { borderColor: badge.color } : {}}
      >
        <CardContent className="p-4 text-center">
          <div 
            className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${
              earned ? 'bg-gradient-to-br shadow-md' : 'bg-slate-100'
            }`}
            style={earned ? { 
              background: `linear-gradient(to bottom right, ${badge.color}, ${badge.color}CC)` 
            } : {}}
          >
            <Icon className={`w-8 h-8 ${earned ? 'text-white' : 'text-slate-400'}`} />
          </div>
          
          <h4 className="font-bold text-sm mb-1">{badge.name}</h4>
          <p className="text-xs text-slate-500 mb-2">{badge.description}</p>
          
          {earned ? (
            <>
              <Badge className="text-xs" style={{ backgroundColor: badge.color }}>
                +{badge.points_reward} pts
              </Badge>
              {earnedDate && (
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(earnedDate).toLocaleDateString('pt-BR')}
                </p>
              )}
            </>
          ) : (
            <Badge variant="outline" className="text-xs">
              Bloqueado
            </Badge>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
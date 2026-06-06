import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, Brain, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";

export default function HeroSection() {
  const scrollToBdzTutor = () => {
    document.getElementById('bdz-tutor')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#1e3a5f] via-[#2d4a6f] to-[#1e3a5f] text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#d4a853] rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#d4a853] rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-sm mb-6">
              <GraduationCap className="w-4 h-4 text-[#d4a853]" />
              <span className="text-sm font-medium">Plataforma Educacional</span>
            </div>

            <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-6">
              Portal do Professor
              <span className="block text-[#d4a853] mt-2">Robson Cordeiro</span>
            </h1>

            <p className="text-lg lg:text-xl text-blue-100 leading-relaxed max-w-xl">
              Um espaço dedicado ao aprendizado colaborativo, onde conhecimento encontra 
              tecnologia para transformar a educação.
            </p>
          </motion.div>

          {/* Right - Mascot */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center justify-center"
          >
            <img 
              src="https://media.base44.com/images/public/6a0d80dad9912f00febb90bc/67f6eb953_generated_image.png" 
              alt="Mascote RCS Tutor"
              className="w-full max-w-lg object-contain"
            />
          </motion.div>
        </div>
      </div>

      {/* Wave Divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#f8fafc"/>
        </svg>
      </div>
    </section>
  );
}
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from "@/api/base44Client";
import { FileQuestion, Clock, ArrowLeft, ArrowRight, CheckCircle, User, Mail, AlertCircle, Upload, FileEdit } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Link } from 'react-router-dom';
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TakeTest() {
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('identify'); // identify, test, result
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [practicalDescription, setPracticalDescription] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const testId = urlParams.get('id');

  useEffect(() => {
    if (testId) {
      loadTest();
      loadUserData();
    }
  }, [testId]);

  const loadUserData = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const currentUser = await base44.auth.me();
        setStudentName(currentUser.full_name || '');
        setStudentEmail(currentUser.email || '');
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  useEffect(() => {
    if (step === 'test' && timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft]);

  const loadTest = async () => {
    const testsData = await base44.entities.Test.filter({ id: testId });
    setTest(testsData[0]);
    if (testsData[0]?.time_limit_minutes) {
      setTimeLeft(testsData[0].time_limit_minutes * 60);
    }
    setLoading(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTest = () => {
    if (studentName.trim() && studentEmail.trim()) {
      setStep('test');
    }
  };

  const handleSelectAnswer = (questionIndex, answerIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAttachments([...attachments, file_url]);
    setUploading(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    
    try {
      const isAuth = await base44.auth.isAuthenticated();
      let userId = null;
      
      if (isAuth) {
        const currentUser = await base44.auth.me();
        userId = currentUser.id;
      }

      if (test.test_type === 'practical') {
        await base44.entities.PracticalSubmission.create({
          test_id: test.id,
          student_name: studentName,
          student_email: studentEmail,
          description: practicalDescription,
          attachments,
          submitted_at: new Date().toISOString(),
          status: 'pending',
          user_id: userId
        });

        setResult({ practical: true });
        setStep('result');
      } else {
        let score = 0;
        let totalPoints = 0;
        const answersArray = [];

        test.questions?.forEach((question, index) => {
          const points = question.points || 1;
          totalPoints += points;
          
          answersArray.push({
            question_index: index,
            selected_answer: answers[index] ?? -1
          });

          if (answers[index] === question.correct_answer) {
            score += points;
          }
        });

        await base44.entities.TestSubmission.create({
          test_id: test.id,
          student_name: studentName,
          student_email: studentEmail,
          answers: answersArray,
          score,
          total_points: totalPoints,
          completed_at: new Date().toISOString(),
          user_id: userId
        });

        setResult({
          score,
          totalPoints,
          percentage: Math.round((score / totalPoints) * 100)
        });
        setStep('result');
      }
    } catch (error) {
      console.error('Error submitting test:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <FileQuestion className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 mb-4">Teste não encontrado</p>
          <Link to={createPageUrl('Tests')}>
            <Button>Voltar para Testes</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Identification Step */}
      <AnimatePresence mode="wait">
        {step === 'identify' && (
          <motion.div
            key="identify"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center p-6"
          >
            <Card className="w-full max-w-md shadow-2xl border-0">
              <CardHeader className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3">
                  <FileQuestion className="w-6 h-6" />
                  {test.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="text-center mb-6">
                  <p className="text-slate-600">
                    Por favor, identifique-se para iniciar {test.test_type === 'practical' ? 'o trabalho' : 'o teste'}.
                  </p>
                  <div className="flex items-center justify-center gap-4 mt-4 text-sm text-slate-400">
                    {test.test_type === 'objective' ? (
                      <>
                        <span>{test.questions?.length || 0} questões</span>
                        {test.time_limit_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {test.time_limit_minutes} min
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="flex items-center gap-1">
                        <FileEdit className="w-4 h-4" />
                        Trabalho Prático
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Seu Nome Completo
                    </Label>
                    <Input
                      id="name"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Digite seu nome"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Seu E-mail
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      placeholder="Digite seu e-mail"
                      className="mt-1"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleStartTest}
                  disabled={!studentName.trim() || !studentEmail.trim()}
                  className="w-full bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] hover:from-[#2d4a6f] hover:to-[#3d5a7f]"
                >
                  {test.test_type === 'practical' ? 'Iniciar Trabalho' : 'Iniciar Teste'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <Link to={createPageUrl('Tests')} className="block text-center">
                  <Button variant="ghost" className="text-slate-500">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Test Step */}
        {step === 'test' && (
          <motion.div
            key="test"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {test.test_type === 'practical' ? (
              /* Practical Test */
              <div className="max-w-4xl mx-auto px-6 py-8">
                <Card className="shadow-lg border-0">
                  <CardHeader className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white">
                    <CardTitle className="flex items-center gap-2">
                      <FileEdit className="w-6 h-6" />
                      {test.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    {/* Instructions */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-3">Instruções do Trabalho</h3>
                      {test.practical_instructions ? (
                        <div 
                          className="prose prose-slate max-w-none p-4 bg-blue-50 rounded-lg"
                          dangerouslySetInnerHTML={{ __html: test.practical_instructions }}
                        />
                      ) : (
                        <p className="text-slate-600 p-4 bg-slate-50 rounded-lg">{test.description}</p>
                      )}
                    </div>

                    {/* Response Area */}
                    <div>
                      <Label htmlFor="description" className="text-base font-semibold">
                        Descrição do seu Trabalho *
                      </Label>
                      <p className="text-sm text-slate-500 mb-2">
                        Descreva como você realizou o trabalho, explique suas escolhas e conclusões
                      </p>
                      <Textarea
                        id="description"
                        value={practicalDescription}
                        onChange={(e) => setPracticalDescription(e.target.value)}
                        placeholder="Digite aqui a descrição do seu trabalho..."
                        className="mt-2 min-h-[300px]"
                      />
                    </div>

                    {/* File Upload */}
                    <div>
                      <Label className="text-base font-semibold mb-2 block">
                        Anexar Arquivos (opcional)
                      </Label>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            type="file"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="flex-1"
                          />
                          {uploading && <span className="text-sm text-slate-500">Enviando...</span>}
                        </div>
                        {attachments.length > 0 && (
                          <div className="space-y-2">
                            {attachments.map((url, i) => (
                              <div key={i} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="text-sm text-green-700 flex-1">Arquivo {i + 1} anexado</span>
                                <button
                                  onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <AlertCircle className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Link to={createPageUrl('Tests')}>
                        <Button variant="outline">
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Cancelar
                        </Button>
                      </Link>
                      <Button
                        onClick={handleSubmit}
                        disabled={!practicalDescription.trim() || submitting}
                        className="bg-gradient-to-r from-[#d4a853] to-[#f0c674] text-[#1e3a5f] hover:from-[#c49743] hover:to-[#e0b664]"
                      >
                        {submitting ? 'Enviando...' : 'Enviar Trabalho'}
                        <Upload className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Objective Test */
              <>
                {/* Timer Header */}
                <div className="sticky top-0 z-10 bg-white shadow-md">
                  <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="font-bold text-lg text-[#1e3a5f]">{test.title}</h2>
                        <p className="text-sm text-slate-500">Questão {currentQuestion + 1} de {test.questions?.length}</p>
                      </div>
                      {timeLeft !== null && (
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                          timeLeft < 60 ? 'bg-red-100 text-red-600' : 'bg-[#1e3a5f]/10 text-[#1e3a5f]'
                        }`}>
                          <Clock className="w-4 h-4" />
                          <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
                        </div>
                      )}
                    </div>
                    <Progress 
                      value={((currentQuestion + 1) / (test.questions?.length || 1)) * 100} 
                      className="mt-4 h-2"
                    />
                  </div>
                </div>

                {/* Question */}
                <div className="max-w-4xl mx-auto px-6 py-8">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentQuestion}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <Card className="shadow-lg border-0">
                        <CardContent className="p-8">
                          <h3 className="text-xl font-semibold text-slate-800 mb-6">
                            {test.questions?.[currentQuestion]?.question}
                          </h3>

                          <RadioGroup
                            value={answers[currentQuestion]?.toString()}
                            onValueChange={(value) => handleSelectAnswer(currentQuestion, parseInt(value))}
                            className="space-y-3"
                          >
                            {test.questions?.[currentQuestion]?.options?.map((option, index) => (
                              <motion.div
                                key={index}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                              >
                                <Label
                                  htmlFor={`option-${index}`}
                                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                    answers[currentQuestion] === index
                                      ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                                      : 'border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                                  <span>{option}</span>
                                </Label>
                              </motion.div>
                            ))}
                          </RadioGroup>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </AnimatePresence>

                  {/* Navigation */}
                  <div className="flex items-center justify-between mt-8">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentQuestion(prev => prev - 1)}
                      disabled={currentQuestion === 0}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Anterior
                    </Button>

                    {currentQuestion < (test.questions?.length || 0) - 1 ? (
                      <Button
                        onClick={() => setCurrentQuestion(prev => prev + 1)}
                        className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
                      >
                        Próxima
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="bg-gradient-to-r from-[#d4a853] to-[#f0c674] text-[#1e3a5f] hover:from-[#c49743] hover:to-[#e0b664]"
                      >
                        {submitting ? 'Enviando...' : 'Finalizar Teste'}
                        <CheckCircle className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>

                  {/* Question Navigator */}
                  <div className="mt-8 p-4 bg-white rounded-xl shadow">
                    <p className="text-sm font-medium text-slate-500 mb-3">Navegação rápida:</p>
                    <div className="flex flex-wrap gap-2">
                      {test.questions?.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentQuestion(index)}
                          className={`w-10 h-10 rounded-lg font-medium transition-all ${
                            currentQuestion === index
                              ? 'bg-[#1e3a5f] text-white'
                              : answers[index] !== undefined
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Result Step */}
        {step === 'result' && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-screen flex items-center justify-center p-6"
          >
            <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
              {result.practical ? (
                <>
                  <div className="p-8 text-center bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Trabalho Enviado!</h2>
                    <p className="opacity-90">{studentName}</p>
                  </div>
                  
                  <CardContent className="p-8 text-center">
                    <p className="text-slate-600 mb-6">
                      Seu trabalho foi enviado com sucesso e está aguardando avaliação do professor.
                    </p>

                    <div className="p-4 rounded-xl bg-blue-50 text-blue-700">
                      📝 Você receberá um feedback assim que o trabalho for avaliado.
                    </div>

                    <Link to={createPageUrl('Tests')} className="block mt-6">
                      <Button className="w-full bg-[#1e3a5f] hover:bg-[#2d4a6f]">
                        Voltar para Testes
                      </Button>
                    </Link>
                  </CardContent>
                </>
              ) : (
                <>
                  <div className={`p-8 text-center ${
                    result.percentage >= 70 
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                      : result.percentage >= 50
                        ? 'bg-gradient-to-br from-yellow-500 to-orange-500'
                        : 'bg-gradient-to-br from-red-500 to-rose-600'
                  } text-white`}>
                    <CheckCircle className="w-16 h-16 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Teste Concluído!</h2>
                    <p className="opacity-90">{studentName}</p>
                  </div>
                  
                  <CardContent className="p-8 text-center">
                    <div className="text-6xl font-bold text-[#1e3a5f] mb-2">
                      {result.percentage}%
                    </div>
                    <p className="text-slate-600 mb-6">
                      Você acertou {result.score} de {result.totalPoints} pontos
                    </p>

                    <div className={`p-4 rounded-xl ${
                      result.percentage >= 70 
                        ? 'bg-green-50 text-green-700' 
                        : result.percentage >= 50
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-red-50 text-red-700'
                    }`}>
                      {result.percentage >= 70 
                        ? '🎉 Excelente trabalho! Continue assim!'
                        : result.percentage >= 50
                          ? '📚 Bom esforço! Revise os conteúdos para melhorar.'
                          : '💪 Não desanime! Estude mais e tente novamente.'}
                    </div>

                    <Link to={createPageUrl('Tests')} className="block mt-6">
                      <Button className="w-full bg-[#1e3a5f] hover:bg-[#2d4a6f]">
                        Voltar para Testes
                      </Button>
                    </Link>
                  </CardContent>
                </>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
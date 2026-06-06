import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, GraduationCap, BookOpen, Lock, Mail } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { login, isLoadingAuth } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const success = await login(email, password);
    if (!success) {
      setError('E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.');
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0f2342 0%, #1e3a5f 50%, #2d5487 100%)' }}>
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        {/* Background decorative circles */}
        <div style={{
          position: 'absolute', width: '400px', height: '400px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)', top: '-100px', left: '-100px'
        }} />
        <div style={{
          position: 'absolute', width: '300px', height: '300px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)', bottom: '-50px', right: '-50px'
        }} />

        <div className="relative z-10 text-center">
          <div style={{
            width: '96px', height: '96px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #d4a853, #f0c878)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 2rem', boxShadow: '0 20px 60px rgba(212,168,83,0.3)'
          }}>
            <GraduationCap size={48} color="#1e3a5f" />
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Portal do Professor
          </h1>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#d4a853', marginBottom: '1.5rem' }}>
            Robson Cordeiro
          </h2>
          <p style={{ fontSize: '1.1rem', opacity: 0.8, lineHeight: '1.7', maxWidth: '360px' }}>
            Sua plataforma completa de ensino. Acesse materiais, atividades e muito mais.
          </p>

          <div style={{ marginTop: '3rem', display: 'flex', gap: '2rem', justifyContent: 'center' }}>
            {[
              { icon: BookOpen, label: 'Materiais' },
              { icon: GraduationCap, label: 'Atividades' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                background: 'rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1rem 1.5rem',
                backdropFilter: 'blur(10px)'
              }}>
                <Icon size={24} color="#d4a853" />
                <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div style={{
          width: '100%', maxWidth: '440px',
          background: 'rgba(255,255,255,0.97)',
          borderRadius: '24px',
          padding: '2.5rem',
          boxShadow: '0 25px 80px rgba(0,0,0,0.3)'
        }}>
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-6">
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #d4a853, #f0c878)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <GraduationCap size={32} color="#1e3a5f" />
            </div>
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1e3a5f', marginBottom: '0.4rem', textAlign: 'center' }}>
            Bem-vindo!
          </h2>
          <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: '2rem', fontSize: '0.95rem' }}>
            Acesse sua conta para continuar
          </p>

          {error && (
            <Alert variant="destructive" style={{ marginBottom: '1.5rem', borderRadius: '12px' }}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <Label htmlFor="email" style={{ color: '#374151', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                E-mail
              </Label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    paddingLeft: '2.75rem', height: '48px', borderRadius: '12px',
                    border: '2px solid #e5e7eb', fontSize: '0.95rem',
                    transition: 'border-color 0.2s'
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <Label htmlFor="password" style={{ color: '#374151', fontWeight: '500', display: 'block' }}>
                  Senha
                </Label>
                <a
                  href="/forgot-password"
                  style={{ color: '#1e3a5f', fontWeight: '500', fontSize: '0.85rem', textDecoration: 'none', cursor: 'pointer' }}
                >
                  Esqueceu?
                </a>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    paddingLeft: '2.75rem', height: '48px', borderRadius: '12px',
                    border: '2px solid #e5e7eb', fontSize: '0.95rem'
                  }}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoadingAuth}
              style={{
                width: '100%', height: '52px', borderRadius: '12px',
                background: isLoadingAuth
                  ? '#94a3b8'
                  : 'linear-gradient(135deg, #1e3a5f, #2d5487)',
                color: 'white', fontWeight: '600', fontSize: '1rem',
                border: 'none', cursor: isLoadingAuth ? 'not-allowed' : 'pointer',
                marginTop: '0.5rem',
                boxShadow: '0 4px 15px rgba(30,58,95,0.3)',
                transition: 'all 0.2s'
              }}
            >
              {isLoadingAuth ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span style={{
                    width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite'
                  }} />
                  Entrando...
                </span>
              ) : 'Entrar'}
            </Button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.95rem' }}>
            <span style={{ color: '#6b7280' }}>Não tem uma conta? </span>
            <a 
              href="/PublicRegister" 
              style={{ color: '#1e3a5f', fontWeight: '600', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Cadastre-se como Aluno
            </a>
          </div>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: '#9ca3af' }}>
            © {new Date().getFullYear()} Portal do Professor Robson Cordeiro
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { border-color: #1e3a5f !important; outline: none; box-shadow: 0 0 0 3px rgba(30,58,95,0.1); }
      `}</style>
    </div>
  );
};

export default Login;

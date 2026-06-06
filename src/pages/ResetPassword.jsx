import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Lock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [sessionValid, setSessionValid] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Verifica se há uma sessão de recuperação válida
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSessionValid(false);
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('As senhas não correspondem');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        setError(updateError.message || 'Erro ao redefinir senha');
      } else {
        setSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (err) {
      setError('Erro ao redefinir senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!sessionValid) {
    return (
      <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0f2342 0%, #1e3a5f 50%, #2d5487 100%)' }}>
        <div className="w-full flex items-center justify-center p-6">
          <div style={{
            width: '100%', maxWidth: '440px',
            background: 'rgba(255,255,255,0.97)',
            borderRadius: '24px',
            padding: '2.5rem',
            boxShadow: '0 25px 80px rgba(0,0,0,0.3)'
          }}>
            <Alert variant="destructive" style={{ marginBottom: '1.5rem', borderRadius: '12px' }}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Link de recuperação inválido ou expirado. Solicite um novo link.
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => navigate('/forgot-password')}
              style={{
                width: '100%', height: '52px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #1e3a5f, #2d5487)',
                color: 'white', fontWeight: '600', fontSize: '1rem',
                border: 'none', cursor: 'pointer',
                marginTop: '1rem',
                boxShadow: '0 4px 15px rgba(30,58,95,0.3)',
              }}
            >
              Solicitar novo link
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0f2342 0%, #1e3a5f 50%, #2d5487 100%)' }}>
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white relative overflow-hidden">
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
            <Lock size={48} color="#1e3a5f" />
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Redefinir Senha
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.8, lineHeight: '1.7', maxWidth: '360px' }}>
            Crie uma nova senha para sua conta e recupere o acesso ao seu portal.
          </p>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div style={{
          width: '100%', maxWidth: '440px',
          background: 'rgba(255,255,255,0.97)',
          borderRadius: '24px',
          padding: '2.5rem',
          boxShadow: '0 25px 80px rgba(0,0,0,0.3)'
        }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1e3a5f', marginBottom: '0.4rem' }}>
            Definir Nova Senha
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.95rem' }}>
            Escolha uma senha forte e segura
          </p>

          {error && (
            <Alert variant="destructive" style={{ marginBottom: '1.5rem', borderRadius: '12px' }}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert style={{
              marginBottom: '1.5rem', borderRadius: '12px',
              background: '#ecfdf5', border: '1px solid #d1fae5'
            }}>
              <CheckCircle2 className="h-4 w-4" style={{ color: '#059669' }} />
              <AlertDescription style={{ color: '#059669' }}>
                Senha redefinida com sucesso! Redirecionando para login...
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <Label htmlFor="password" style={{ color: '#374151', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                Nova Senha
              </Label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || success}
                  required
                  style={{
                    paddingLeft: '2.75rem', height: '48px', borderRadius: '12px',
                    border: '2px solid #e5e7eb', fontSize: '0.95rem',
                    transition: 'border-color 0.2s'
                  }}
                />
              </div>
              <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                Mínimo 6 caracteres
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword" style={{ color: '#374151', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                Confirmar Senha
              </Label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading || success}
                  required
                  style={{
                    paddingLeft: '2.75rem', height: '48px', borderRadius: '12px',
                    border: '2px solid #e5e7eb', fontSize: '0.95rem',
                    transition: 'border-color 0.2s'
                  }}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || success}
              style={{
                width: '100%', height: '52px', borderRadius: '12px',
                background: loading || success
                  ? '#94a3b8'
                  : 'linear-gradient(135deg, #1e3a5f, #2d5487)',
                color: 'white', fontWeight: '600', fontSize: '1rem',
                border: 'none', cursor: loading || success ? 'not-allowed' : 'pointer',
                marginTop: '0.5rem',
                boxShadow: '0 4px 15px rgba(30,58,95,0.3)',
                transition: 'all 0.2s'
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span style={{
                    width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite'
                  }} />
                  Redefinindo...
                </span>
              ) : 'Redefinir Senha'}
            </Button>
          </form>

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

export default ResetPassword;

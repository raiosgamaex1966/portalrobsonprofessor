import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function AcceptInvite() {
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');
  const [inviteData, setInviteData] = useState(null);

  useEffect(() => {
    processInvite();
  }, []);

  const processInvite = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Link de convite inválido');
        return;
      }

      // Processa o convite através da função backend
      const response = await base44.functions.invoke('createUserWithPassword', { token });

      if (response.data.error) {
        setStatus('error');
        setMessage(response.data.error);
        return;
      }

      setInviteData({
        email: response.data.email,
        initial_password: response.data.password
      });
      setStatus('success');
      setMessage('Conta ativada! Use suas credenciais abaixo para fazer login.');

    } catch (error) {
      console.error('Erro ao processar convite:', error);
      setStatus('error');
      setMessage('Erro ao processar convite: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 mx-auto text-[#1e3a5f] mb-4 animate-spin" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Processando Convite...
              </h2>
              <p className="text-slate-600">Aguarde um momento</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Convite Aceito!
              </h2>
              <p className="text-slate-600 mb-6">{message}</p>
              {inviteData && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    🔑 <strong>Suas credenciais:</strong><br/>
                    Email: <strong>{inviteData.email}</strong><br/>
                    Senha: <strong className="font-mono bg-white px-2 py-1 rounded">{inviteData.initial_password}</strong>
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    💡 Você pode alterar sua senha após o primeiro acesso
                  </p>
                </div>
              )}
              <Button
                onClick={() => base44.auth.redirectToLogin()}
                className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
              >
                Ir para Login
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Erro no Convite
              </h2>
              <p className="text-slate-600 mb-6">{message}</p>
              <Button
                onClick={() => window.location.href = createPageUrl('Home')}
                variant="outline"
                className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
              >
                Voltar para Home
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
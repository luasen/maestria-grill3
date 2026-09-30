import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../services/supabase';
import SupabaseConfigModal from './SupabaseConfigModal';
import { Mail, Lock, User, Phone, X, AlertCircle, ArrowLeft, LogOut, CheckCircle, Chrome, Database, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type AuthMode = 'login' | 'register' | 'recovery' | 'profile';

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { user, profile, login, register, resetPassword, logout, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<AuthMode>(user ? 'profile' : 'login');
  
  // Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // States
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      setSuccessMsg('Login efetuado com sucesso!');
      setTimeout(() => {
        setSuccessMsg(null);
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      const errMsg = err?.message || '';
      if (errMsg.toLowerCase().includes('invalid login credentials') || errMsg.toLowerCase().includes('invalid credential')) {
        setError('E-mail ou senha inválidos.');
      } else if (errMsg.toLowerCase().includes('email not confirmed')) {
        setError(
          <div className="flex flex-col gap-1 text-left text-xs">
            <span className="font-bold text-amber-800">⚠️ Confirmação de E-mail Pendente:</span>
            <span>Seu e-mail ainda não foi confirmado no Supabase. Verifique sua caixa de entrada ou desative a confirmação de e-mail em Supabase &gt; Authentication &gt; Providers &gt; Email.</span>
          </div>
        );
      } else {
        setError(errMsg || 'Erro ao fazer login. Verifique seus dados.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      setSuccessMsg('Redirecionando para o Google...');
      setTimeout(() => {
        setSuccessMsg(null);
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      if (!isSupabaseConfigured) {
        setError(
          <div className="flex flex-col gap-2 text-left text-xs">
            <span className="font-bold text-amber-800 flex items-center gap-1.5">
              <Database className="h-4 w-4 text-emerald-600" />
              Configure seu Supabase para ativar o Google OAuth:
            </span>
            <p className="text-gray-600 text-[11px]">
              Para utilizar o login com Google via Supabase, informe a URL e a Anon Key do seu projeto.
            </p>
            <button
              type="button"
              onClick={() => setIsSupabaseModalOpen(true)}
              className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white font-bold py-2 px-3 text-xs hover:bg-emerald-700 transition"
            >
              <Settings className="h-3.5 w-3.5" />
              Configurar Supabase Agora
            </button>
          </div>
        );
      } else {
        setError(err?.message || 'Falha ao iniciar login com o Google no Supabase.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !password) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register(name, email, phone, password);
      setSuccessMsg('Cadastro realizado com sucesso!');
      setTimeout(() => {
        setSuccessMsg(null);
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      const errMsg = err?.message || '';
      if (errMsg.toLowerCase().includes('already registered') || errMsg.toLowerCase().includes('unique')) {
        setError('Este e-mail já está cadastrado no sistema.');
      } else {
        setError(errMsg || 'Erro ao realizar cadastro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, digite seu e-mail.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await resetPassword(email);
      setSuccessMsg('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      setTimeout(() => {
        setSuccessMsg(null);
        setMode('login');
      }, 3000);
    } catch (err: any) {
      setError(err?.message || 'E-mail não encontrado ou inválido.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      setMode('login');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentMode = user ? 'profile' : (mode === 'profile' ? 'login' : mode);

  return (
    <>
      <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 backdrop-blur-sm">
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md rounded-3xl border border-white/40 bg-white/95 p-6 shadow-2xl backdrop-blur-md text-left my-8"
          >
            {/* Supabase Status Pill & Close Button */}
            <div className="absolute right-4 top-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSupabaseModalOpen(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold border transition ${
                  isSupabaseConfigured
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                }`}
                title="Configurar Supabase"
              >
                <Database className="h-3 w-3" />
                <span>{isSupabaseConfigured ? 'Supabase Conectado' : 'Configurar Supabase'}</span>
              </button>

              <button
                onClick={onClose}
                id="btn-close-auth-modal"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition text-gray-500 hover:text-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Header Title */}
            <div className="mb-6 pt-1">
              {currentMode === 'recovery' && (
                <button
                  onClick={() => setMode('login')}
                  className="flex items-center gap-1 text-xs text-orange-600 font-bold hover:underline mb-2"
                >
                  <ArrowLeft className="h-3 w-3" /> Voltar ao Login
                </button>
              )}
              <h2 className="font-sans text-xl font-extrabold text-gray-900">
                {currentMode === 'login' && 'Seja Bem-vindo! 🥩'}
                {currentMode === 'register' && 'Criar Nova Conta 🥩'}
                {currentMode === 'recovery' && 'Recuperar Senha'}
                {currentMode === 'profile' && 'Sua Conta'}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {currentMode === 'login' && 'Acesse sua conta para fazer pedidos e salvar seus endereços.'}
                {currentMode === 'register' && 'Cadastre-se rapidamente para aproveitar a melhor brasa.'}
                {currentMode === 'recovery' && 'Digite seu e-mail cadastrado para redefinir sua senha.'}
                {currentMode === 'profile' && 'Gerencie seus dados de acesso e configurações.'}
              </p>
            </div>

            {/* Error / Success Alerts */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 flex items-start gap-2 rounded-2xl bg-rose-500/10 border border-rose-500/15 p-3 text-xs text-rose-800"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 flex items-start gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/15 p-3 text-xs text-emerald-800"
                >
                  <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Modes Content */}
            {currentMode === 'login' && (
              <div className="flex flex-col gap-4">
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      placeholder="Seu e-mail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-200 bg-white/70 py-2.5 pl-10 pr-3.5 text-xs text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                    />
                  </div>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type="password"
                      placeholder="Sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-200 bg-white/70 py-2.5 pl-10 pr-3.5 text-xs text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                    />
                  </div>

                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setMode('recovery')}
                      className="text-[11px] font-bold text-gray-500 hover:text-orange-600 transition"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 w-full rounded-2xl bg-orange-600 py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/10 hover:bg-orange-700 transition disabled:opacity-50"
                  >
                    {loading ? 'Entrando...' : 'Entrar na Conta'}
                  </button>
                </form>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-300/40"></div>
                  <span className="flex-shrink mx-4 text-gray-400 text-[10px] font-bold uppercase tracking-wider">Ou continue com</span>
                  <div className="flex-grow border-t border-gray-300/40"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 py-3 text-xs font-bold text-gray-700 transition shadow-sm disabled:opacity-50"
                >
                  <Chrome className="h-4 w-4 text-red-500" />
                  <span>Entrar com o Google</span>
                </button>

                <div className="mt-2 text-center text-xs text-gray-500">
                  Não tem uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="font-bold text-orange-600 hover:underline"
                  >
                    Cadastre-se
                  </button>
                </div>
              </div>
            )}

            {currentMode === 'register' && (
              <div className="flex flex-col gap-3.5">
                <form onSubmit={handleRegister} className="flex flex-col gap-3.5">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Nome completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-200 bg-white/70 py-2.5 pl-10 pr-3.5 text-xs text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                    />
                  </div>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      placeholder="Seu e-mail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-200 bg-white/70 py-2.5 pl-10 pr-3.5 text-xs text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                    />
                  </div>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                      <Phone className="h-4 w-4" />
                    </span>
                    <input
                      type="tel"
                      placeholder="Telefone / WhatsApp"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-200 bg-white/70 py-2.5 pl-10 pr-3.5 text-xs text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                    />
                  </div>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type="password"
                      placeholder="Crie uma senha (mínimo 6 dígitos)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-200 bg-white/70 py-2.5 pl-10 pr-3.5 text-xs text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 w-full rounded-2xl bg-orange-600 py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/10 hover:bg-orange-700 transition disabled:opacity-50"
                  >
                    {loading ? 'Cadastrando...' : 'Criar Conta'}
                  </button>
                </form>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-300/40"></div>
                  <span className="flex-shrink mx-4 text-gray-400 text-[10px] font-bold uppercase tracking-wider">Ou</span>
                  <div className="flex-grow border-t border-gray-300/40"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 py-3 text-xs font-bold text-gray-700 transition shadow-sm disabled:opacity-50"
                >
                  <Chrome className="h-4 w-4 text-red-500" />
                  <span>Cadastrar com o Google</span>
                </button>

                <div className="mt-2 text-center text-xs text-gray-500">
                  Já possui uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="font-bold text-orange-600 hover:underline"
                  >
                    Faça Login
                  </button>
                </div>
              </div>
            )}

            {currentMode === 'recovery' && (
              <form onSubmit={handleRecovery} className="flex flex-col gap-4">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    placeholder="Digite seu e-mail cadastrado"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white/70 py-2.5 pl-10 pr-3.5 text-xs text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-orange-600 py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/10 hover:bg-orange-700 transition disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Enviar Instruções'}
                </button>
              </form>
            )}

            {currentMode === 'profile' && (
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 text-xs text-gray-600 flex flex-col gap-2">
                  <div>
                    <span className="font-bold text-gray-400 uppercase tracking-wide block text-[10px]">Nome</span>
                    <span className="text-gray-800 font-semibold">{profile?.name}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-400 uppercase tracking-wide block text-[10px]">E-mail</span>
                    <span className="text-gray-800 font-semibold">{profile?.email}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-400 uppercase tracking-wide block text-[10px]">Telefone</span>
                    <span className="text-gray-800 font-semibold">{profile?.phone || 'Não informado'}</span>
                  </div>
                  {profile?.address && (
                    <div>
                      <span className="font-bold text-gray-400 uppercase tracking-wide block text-[10px]">Endereço Salvo</span>
                      <span className="text-gray-800 font-semibold block leading-tight">
                        {profile.address.street}, {profile.address.number}
                        {profile.address.complement && ` - ${profile.address.complement}`}
                        <br />
                        {profile.address.neighborhood}, {profile.address.city} - CEP {profile.address.cep}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleLogout}
                  disabled={loading}
                  className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 py-3 text-xs font-bold text-rose-600 hover:bg-rose-500/20 transition flex items-center justify-center gap-2"
                >
                  <LogOut className="h-4 w-4" /> Sair da Conta
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Supabase Configuration Modal */}
      <SupabaseConfigModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </>
  );
}

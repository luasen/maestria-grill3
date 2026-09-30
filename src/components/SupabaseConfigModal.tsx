import React, { useState, useEffect } from 'react';
import { 
  SUPABASE_URL, 
  SUPABASE_ANON_KEY, 
  isSupabaseConfigured, 
  saveSupabaseConfig, 
  clearSupabaseConfig,
  testSupabaseConnection 
} from '../services/supabase';
import { 
  Database, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  Key, 
  Link as LinkIcon, 
  Sparkles,
  HelpCircle,
  Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupabaseConfigModal({ isOpen, onClose }: SupabaseConfigModalProps) {
  const [url, setUrl] = useState(SUPABASE_URL || '');
  const [anonKey, setAnonKey] = useState(SUPABASE_ANON_KEY || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    tablesFound?: boolean;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  useEffect(() => {
    setUrl(SUPABASE_URL || '');
    setAnonKey(SUPABASE_ANON_KEY || '');
    setTestResult(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection();
      setTestResult(res);
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e?.message || 'Erro ao testar conexão.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      alert('Por favor preencha a URL e a Anon Key do seu projeto Supabase.');
      return;
    }
    saveSupabaseConfig(url.trim(), anonKey.trim());
  };

  const handleReset = () => {
    if (confirm('Deseja remover as chaves personalizadas do Supabase salvas no navegador?')) {
      clearSupabaseConfig();
    }
  };

  const handleCopySql = () => {
    const sqlScript = `-- ==============================================================================
-- MAESTRIA GRILL - ESQUEMA COMPLETO SUPABASE (POSTGRESQL)
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'cliente' CHECK (role IN ('cliente', 'motoboy', 'admin', 'superadmin')),
  address JSONB,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public profiles insert" ON public.profiles;
CREATE POLICY "Public profiles insert" ON public.profiles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public profiles update" ON public.profiles;
CREATE POLICY "Public profiles update" ON public.profiles FOR UPDATE USING (true);

-- 2. TABELA CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Categories all read" ON public.categories;
CREATE POLICY "Categories all read" ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Categories all insert" ON public.categories;
CREATE POLICY "Categories all insert" ON public.categories FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Categories all update" ON public.categories;
CREATE POLICY "Categories all update" ON public.categories FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Categories all delete" ON public.categories;
CREATE POLICY "Categories all delete" ON public.categories FOR DELETE USING (true);

-- 3. TABELA PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  image TEXT,
  category_id TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Products all read" ON public.products;
CREATE POLICY "Products all read" ON public.products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Products all insert" ON public.products;
CREATE POLICY "Products all insert" ON public.products FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Products all update" ON public.products;
CREATE POLICY "Products all update" ON public.products FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Products all delete" ON public.products;
CREATE POLICY "Products all delete" ON public.products FOR DELETE USING (true);

-- 4. TABELA ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  address TEXT,
  complement TEXT,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'pending',
  subtotal NUMERIC(10, 2) DEFAULT 0.00,
  delivery_fee NUMERIC(10, 2) DEFAULT 0.00,
  total NUMERIC(10, 2) DEFAULT 0.00,
  tipo_pedido TEXT,
  forma_entrega TEXT,
  endereco JSONB,
  items JSONB DEFAULT '[]'::jsonb,
  user_id TEXT,
  horario_pedido TEXT,
  cupom TEXT,
  desconto NUMERIC(10, 2) DEFAULT 0.00,
  motoboy_id TEXT,
  mercadopago_payment_id TEXT,
  mercadopago_status TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Orders all read" ON public.orders;
CREATE POLICY "Orders all read" ON public.orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "Orders all insert" ON public.orders;
CREATE POLICY "Orders all insert" ON public.orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Orders all update" ON public.orders;
CREATE POLICY "Orders all update" ON public.orders FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Orders all delete" ON public.orders;
CREATE POLICY "Orders all delete" ON public.orders FOR DELETE USING (true);

-- 5. TABELA SETTINGS
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  name TEXT,
  description TEXT,
  delivery_fee NUMERIC(10, 2) DEFAULT 7.00,
  phone TEXT,
  address TEXT,
  whatsapp TEXT,
  email TEXT,
  maintenance_mode BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Settings read" ON public.settings;
CREATE POLICY "Settings read" ON public.settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Settings write" ON public.settings;
CREATE POLICY "Settings write" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- 6. TABELA ORDER_MESSAGES
CREATE TABLE IF NOT EXISTS public.order_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  text TEXT NOT NULL,
  read_by JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Msg read" ON public.order_messages;
CREATE POLICY "Msg read" ON public.order_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Msg write" ON public.order_messages;
CREATE POLICY "Msg write" ON public.order_messages FOR ALL USING (true) WITH CHECK (true);

-- 7. REALTIME
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders, public.order_messages;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 8. DADOS INICIAIS
INSERT INTO public.categories (id, name, slug, image) VALUES
  ('cat-1', 'Pratos', 'pratos', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80'),
  ('cat-2', 'Lanches', 'lanches', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80'),
  ('cat-3', 'Bebidas', 'bebidas', 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=600&auto=format&fit=crop&q=80'),
  ('cat-4', 'Sobremesas', 'sobremesas', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id, name, description, price, image, category_id, active) VALUES
  ('prod-1', 'Filé Mignon Grelhado', 'Medalhão de filé mignon na brasa com batatas rústicas e chimichurri.', 68.90, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80', 'cat-1', true),
  ('prod-2', 'Risoto de Cogumelos', 'Arroz arbóreo cremoso com cogumelos frescos e azeite trufado.', 54.00, 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&auto=format&fit=crop&q=80', 'cat-1', true),
  ('prod-3', 'Smash Burger Duplo', 'Dois burgers angus de 90g com cheddar e cebola caramelizada.', 34.90, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80', 'cat-2', true),
  ('prod-4', 'Chicken Club Sandwich', 'Frango grelhado desfiado com bacon e queijo prato.', 29.90, 'https://images.unsplash.com/photo-1521390188846-e2a3a97453a0?w=600&auto=format&fit=crop&q=80', 'cat-2', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.settings (id, name, description, delivery_fee, phone, address, whatsapp, email, maintenance_mode) VALUES
  ('main', 'Maestria Grill', 'O autêntico sabor da brasa com carnes nobres grelhadas com perfeição.', 7.00, '(11) 99999-8888', 'Av. Paulista, 1000', '(11) 99999-8888', 'contato@maestriagrill.com.br', false)
ON CONFLICT (id) DO NOTHING;`;

    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleCopyEnv = () => {
    const envText = `VITE_SUPABASE_URL="${url || 'https://seu-projeto.supabase.co'}"\nVITE_SUPABASE_ANON_KEY="${anonKey || 'sua-chave-anon-key'}"`;
    navigator.clipboard.writeText(envText);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 my-8"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-white/15 flex items-center justify-center text-white backdrop-blur-sm border border-white/20">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black flex items-center gap-2">
                  Configuração Supabase (Banco de Dados & Auth)
                </h3>
                <p className="text-xs text-emerald-100 font-medium mt-0.5">
                  Conecte seu banco de dados PostgreSQL e autenticação do Supabase
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Status Card */}
            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
              isSupabaseConfigured
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              {isSupabaseConfigured ? (
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="text-xs">
                <span className="font-black block uppercase text-[10px] tracking-wider mb-0.5">
                  {isSupabaseConfigured ? '✅ Supabase Ativo' : '⚠️ Aguardando Credenciais do Supabase'}
                </span>
                <p className="leading-relaxed text-gray-700">
                  {isSupabaseConfigured
                    ? `Conectado ao projeto: ${SUPABASE_URL.replace('https://', '')}`
                    : 'Cole a URL do seu projeto e a chave anônima (anon key) abaixo para ativar o banco de dados e autenticação oficial do Supabase.'}
                </p>
              </div>
            </div>

            {/* Step by Step Guide */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs space-y-3">
              <span className="font-extrabold text-gray-900 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                Como conectar seu projeto Supabase em 2 minutos:
              </span>
              <ol className="list-decimal list-inside space-y-1.5 text-gray-600 leading-relaxed text-[11px]">
                <li>Acesse <strong>supabase.com</strong>, crie uma conta gratuita e crie um novo projeto.</li>
                <li>Vá em <strong>Project Settings &gt; API</strong> e copie a <strong>Project URL</strong> e a chave <strong>anon / public</strong>.</li>
                <li>Cole ambas nos campos abaixo e clique em <strong>"Salvar Configuração"</strong>.</li>
                <li>Vá no menu <strong>SQL Editor</strong> no Supabase, clique em <strong>"Copiar Script SQL"</strong> abaixo, cole e clique em <strong>Run</strong>!</li>
              </ol>
            </div>

            {/* Credentials Form */}
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1 flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5 text-emerald-600" />
                  Project URL (VITE_SUPABASE_URL)
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://xyzabcdefg.supabase.co"
                  value={url}
                  onChange={(e) => {
                    let val = e.target.value.trim();
                    if (val && !val.startsWith('http') && val.includes('.supabase.co')) {
                      val = 'https://' + val;
                    }
                    setUrl(val);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-800 outline-none focus:border-emerald-600 focus:bg-white font-mono"
                />

                {(url.startsWith('sb_') || url.startsWith('eyJ')) && (
                  <div className="mt-1.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex flex-col gap-1.5">
                    <span className="font-bold flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                      Atenção: Você colou a chave de API neste campo!
                    </span>
                    <span>
                      A <strong>URL do Projeto</strong> fica em <strong>Project Settings &gt; API &gt; Project URL</strong> e é no formato <code className="bg-amber-100 px-1 rounded">https://xxxx.supabase.co</code>.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAnonKey(url);
                        setUrl('');
                      }}
                      className="self-start mt-0.5 px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold text-[10px] hover:bg-amber-700 transition"
                    >
                      Mover para o campo "API Anon Key" abaixo ↓
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-emerald-600" />
                  API Anon Key (VITE_SUPABASE_ANON_KEY)
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-800 outline-none focus:border-emerald-600 focus:bg-white font-mono"
                />
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  {testResult.success ? <Check className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 px-4 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  Salvar Configuração e Conectar
                </button>

                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing || !url || !anonKey}
                  className="rounded-xl border border-gray-200 hover:bg-gray-50 py-3 px-4 text-xs font-bold text-gray-700 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${testing ? 'animate-spin' : ''}`} />
                  Testar Conexão
                </button>

                {isSupabaseConfigured && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 py-3 px-3 text-xs font-bold transition"
                    title="Remover configuração salva"
                  >
                    Desconectar
                  </button>
                )}
              </div>
            </form>

            {/* Quick Actions: Copy SQL & Env */}
            <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleCopySql}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white py-2.5 px-3 text-xs font-bold transition shadow-sm"
              >
                {copiedSql ? <Check className="h-4 w-4 text-emerald-400" /> : <Terminal className="h-4 w-4 text-orange-400" />}
                {copiedSql ? 'Copiado para a Área de Transferência!' : 'Copiar Script SQL para Supabase'}
              </button>

              <button
                type="button"
                onClick={handleCopyEnv}
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 hover:bg-gray-50 py-2.5 px-3 text-xs font-bold text-gray-700 transition shadow-sm"
              >
                {copiedEnv ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {copiedEnv ? 'Variáveis Copiadas!' : 'Copiar para .env'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

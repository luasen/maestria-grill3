import { createClient } from '@supabase/supabase-js';

// Supabase environment keys with optional localStorage override for instant setup
const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Local storage keys to allow runtime configuration if not defined in env
const localUrl = (typeof window !== 'undefined' ? localStorage.getItem('supabase_project_url') || '' : '').trim();
const localKey = (typeof window !== 'undefined' ? localStorage.getItem('supabase_anon_key') || '' : '').trim();

// Detect if an API key (like sb_publishable_...) was mistakenly placed in the URL field
const isEnvUrlActuallyAKey = envUrl.startsWith('sb_publishable_') || envUrl.startsWith('sb_secret_') || envUrl.startsWith('eyJ');
const effectiveUrl = localUrl || (!isEnvUrlActuallyAKey ? envUrl : '');
const effectiveKey = localKey || envKey || (isEnvUrlActuallyAKey ? envUrl : '');

export const SUPABASE_URL = effectiveUrl;
export const SUPABASE_ANON_KEY = effectiveKey;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('your-project') &&
  !SUPABASE_URL.includes('placeholder')
);

// Fallback dummy client if credentials aren't set yet (prevents crashing on import)
const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase = createClient(
  isSupabaseConfigured ? SUPABASE_URL : fallbackUrl,
  isSupabaseConfigured ? SUPABASE_ANON_KEY : fallbackKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  }
);

// Helper to save Supabase keys from the UI
export function saveSupabaseConfig(url: string, key: string) {
  if (typeof window !== 'undefined') {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && cleanUrl.includes('.supabase.co')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    localStorage.setItem('supabase_project_url', cleanUrl);
    localStorage.setItem('supabase_anon_key', key.trim());
    window.location.reload();
  }
}

// Helper to remove custom keys and revert to env
export function clearSupabaseConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('supabase_project_url');
    localStorage.removeItem('supabase_anon_key');
    window.location.reload();
  }
}

// Health check function to test Supabase connection and tables
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  tablesFound?: boolean;
}> {
  if (envUrl.startsWith('sb_') && !localUrl) {
    return {
      success: false,
      message: 'Atenção: A chave de API (' + envUrl.slice(0, 16) + '...) foi inserida no lugar da URL. A URL precisa ser no formato https://[id-do-projeto].supabase.co. Encontre-a no Supabase em Project Settings > API > Project URL.',
    };
  }

  if (!isSupabaseConfigured) {
    return {
      success: false,
      message: 'Supabase URL ou Anon Key não configurados. A URL deve começar com https:// e terminar com .supabase.co.',
    };
  }

  try {
    // 1. Test ping to database
    const { data, error } = await supabase.from('categories').select('id').limit(1);
    
    if (error) {
      if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
        return {
          success: true,
          tablesFound: false,
          message: 'Conectado ao Supabase com sucesso, mas as tabelas ainda não foram criadas. Execute o script SQL no SQL Editor.',
        };
      }
      return {
        success: false,
        message: `Erro ao consultar Supabase: ${error.message} (Código: ${error.code || 'desconhecido'})`,
      };
    }

    return {
      success: true,
      tablesFound: true,
      message: 'Conexão com Supabase e tabelas verificada com sucesso! O banco de dados e autenticação estão prontos.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Falha de conexão com os servidores do Supabase.',
    };
  }
}

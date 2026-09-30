// Helper to perform API requests with support for custom backend URL (VITE_API_URL), Render production backend fallback, or relative host
export const RENDER_API_URL = 'https://maestriagrill-backend.onrender.com';
export const CLOUD_RUN_API_URL = RENDER_API_URL;

export async function fetchApi(endpoint: string, options: RequestInit = {}): Promise<any> {
  const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();
  const isAbsolute = endpoint.startsWith('http://') || endpoint.startsWith('https://');

  // Supabase URLs (e.g. https://xxxx.supabase.co) are for the database/auth, not our Node Express backend.
  // If VITE_API_URL was set to Supabase, ignore it for backend API routes.
  const isSupabaseUrl = rawApiUrl.includes('supabase.co');
  const customApiUrl = isSupabaseUrl ? '' : rawApiUrl;

  const isLocalOrPreview = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('run.app')
  );

  const isExternalHost = typeof window !== 'undefined' &&
    !isLocalOrPreview &&
    !window.location.hostname.endsWith('onrender.com');

  let primaryUrl = endpoint;
  if (!isAbsolute) {
    const cleanPath = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    
    // In local dev and Google AI Studio preview (*.run.app), the backend runs on the exact same origin.
    // Always use same-origin relative path first.
    if (isLocalOrPreview) {
      primaryUrl = cleanPath;
    } else if (customApiUrl) {
      primaryUrl = `${customApiUrl.replace(/\/$/, '')}${cleanPath}`;
    } else if (isExternalHost) {
      primaryUrl = `${RENDER_API_URL.replace(/\/$/, '')}${cleanPath}`;
    } else {
      primaryUrl = cleanPath;
    }
  }

  // Attempt request with primary URL, and fallback to Render or relative if necessary
  try {
    const res = await fetch(primaryUrl, options);
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || `Erro na API (${res.status})`);
      }
      return data;
    }

    // If primary returned non-JSON (e.g. 404 index.html on static Hostinger site) and we haven't tried Render directly yet
    if (!isAbsolute && !primaryUrl.startsWith(RENDER_API_URL)) {
      const cleanPath = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
      const fallbackUrl = `${RENDER_API_URL.replace(/\/$/, '')}${cleanPath}`;
      console.warn(`[fetchApi] Resposta não-JSON de ${primaryUrl}. Tentando fallback: ${fallbackUrl}`);
      
      const fallbackRes = await fetch(fallbackUrl, options);
      const fallbackContentType = fallbackRes.headers.get('content-type') || '';
      
      if (fallbackContentType.includes('application/json')) {
        const fallbackData = await fallbackRes.json();
        if (!fallbackRes.ok) {
          throw new Error(fallbackData.details || fallbackData.error || `Erro na API (${fallbackRes.status})`);
        }
        return fallbackData;
      }
    }

    if (!res.ok) {
      throw new Error(`Erro de comunicação com o servidor (${res.status}).`);
    }

    throw new Error('Resposta do servidor em formato inesperado (não é JSON).');
  } catch (err: any) {
    // If network error occurred, try relative / same-origin if primary was external, or vice-versa
    if (!isAbsolute && primaryUrl !== endpoint) {
      try {
        console.warn(`[fetchApi Retry] Tentando requisição direta em ${endpoint}`);
        const retryRes = await fetch(endpoint, options);
        const retryContentType = retryRes.headers.get('content-type') || '';
        if (retryContentType.includes('application/json')) {
          const retryData = await retryRes.json();
          if (retryRes.ok) return retryData;
        }
      } catch (retryErr) {
        // silent
      }
    }

    console.error('[fetchApi Error]:', err);
    throw err;
  }
}

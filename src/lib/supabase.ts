import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GroupState } from '@/types';

const SUPABASE_CONFIG_KEY = 'EQUIPAY_SUPABASE_CONFIG_V1';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  if (typeof window !== 'undefined') {
    try {
      // 1. Kiểm tra query parameters từ URL (Magic Link: ?supa_url=...&supa_key=...)
      const urlParams = new URLSearchParams(window.location.search);
      const queryUrl = urlParams.get('supa_url');
      const queryKey = urlParams.get('supa_key');

      if (queryUrl && queryKey) {
        const magicConfig = { url: queryUrl.trim(), anonKey: queryKey.trim() };
        localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(magicConfig));
        window.history.replaceState({}, document.title, window.location.pathname);
        return magicConfig;
      }

      // 2. Kiểm tra localStorage đã lưu
      const stored = localStorage.getItem(SUPABASE_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.url && parsed.anonKey) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
  }

  // 3. Sử dụng Environment Variables từ Vercel
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
    cachedClient = null; // reset client cache
  } catch {
    // Ignore
  }
}

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;

  if (cachedClient && lastUrl === url && lastKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
    lastUrl = url;
    lastKey = anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to init Supabase client:', err);
    return null;
  }
}

/**
 * Tải dữ liệu mới nhất từ Supabase Cloud Database về web
 * (Ưu tiên gọi qua Server API Route /api/sync để tự động nhận biến Vercel Integration)
 */
export async function fetchCloudState(): Promise<{ state: GroupState | null; error?: string }> {
  // 1. Thử gọi qua Server Route /api/sync
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/sync', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.state && json.state.members) {
          return { state: json.state as GroupState };
        }
      }
    } catch {
      // Fallback sang Client SDK bên dưới
    }
  }

  // 2. Client SDK Fallback
  const client = getSupabaseClient();
  if (!client) return { state: null, error: 'Chưa kết nối Supabase Cloud' };

  try {
    const { data, error } = await client
      .from('equipay_group_data')
      .select('state_data')
      .eq('id', 'default_group')
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetch error:', error.message);
      return { state: null, error: error.message };
    }

    if (data && data.state_data) {
      return { state: data.state_data as GroupState };
    }

    return { state: null, error: 'Chưa có bản ghi nào trên bảng equipay_group_data' };
  } catch (err: any) {
    console.warn('Cloud fetch exception:', err);
    return { state: null, error: err.message || String(err) };
  }
}

/**
 * Đẩy dữ liệu từ web lên Supabase Cloud Database để 3 người còn lại cùng thấy
 */
export async function pushCloudState(state: GroupState): Promise<{ success: boolean; error?: string }> {
  let serverSuccess = false;

  // 1. Đẩy qua Server Route /api/sync
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          serverSuccess = true;
        }
      }
    } catch {
      // Fallback
    }
  }

  // 2. Đẩy qua Client SDK
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client
        .from('equipay_group_data')
        .upsert({
          id: 'default_group',
          state_data: state,
          updated_at: new Date().toISOString(),
        });

      if (!error) {
        return { success: true };
      }
    } catch {
      // Ignore
    }
  }

  if (serverSuccess) {
    return { success: true };
  }

  return { success: false, error: 'Không thể kết nối lưu trữ Supabase' };
}

/**
 * Lắng nghe thay đổi Realtime từ Supabase khi có thành viên khác vừa thêm chi tiêu
 */
export function subscribeToCloudChanges(
  onUpdate: (newState: GroupState) => void
): (() => void) | null {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const channel = client
      .channel('equipay_realtime_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipay_group_data',
          filter: 'id=eq.default_group',
        },
        (payload: any) => {
          if (payload.new && payload.new.state_data) {
            onUpdate(payload.new.state_data as GroupState);
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return null;
  }
}

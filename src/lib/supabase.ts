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
 */
export async function fetchCloudState(): Promise<{ state: GroupState | null; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { state: null, error: 'Chưa cấu hình Supabase URL / Key' };

  try {
    // 1. Thử lấy từ bảng equipay_group_data
    const { data, error } = await client
      .from('equipay_group_data')
      .select('state_data')
      .eq('id', 'default_group')
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetch equipay_group_data error:', error.message);
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
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Chưa cấu hình Supabase URL / Key' };

  try {
    // 1. Upsert vào bảng equipay_group_data
    const { error } = await client
      .from('equipay_group_data')
      .upsert({
        id: 'default_group',
        state_data: state,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Supabase push error:', error.message);
      return { success: false, error: error.message };
    }

    // 2. Đồng bộ phụ vào bảng members và expenses nếu bảng tồn tại
    try {
      if (state.members && state.members.length > 0) {
        const memberRows = state.members.map((m) => ({
          id: m.id,
          name: m.name,
          avatar: m.avatar,
          color: m.color,
          bank_bin: m.bankBin,
          bank_name: m.bankName,
          account_number: m.accountNumber,
          account_name: m.accountName,
          is_admin: m.isAdmin || false,
        }));
        await client.from('members').upsert(memberRows);
      }
    } catch {
      // Bỏ qua lỗi phụ
    }

    return { success: true };
  } catch (err: any) {
    console.error('Cloud push exception:', err);
    return { success: false, error: err.message || String(err) };
  }
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

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GroupState } from '@/types';

function getSupabaseClientFromReq(req?: NextRequest): { client: SupabaseClient | null; source: string } {
  let url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_REST_URL ||
    '';

  let key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    '';

  let source = 'vercel_environment';

  // Nếu Vercel chưa có biến, nhận từ Client Header gửi lên
  if ((!url || !key) && req) {
    const headerUrl = req.headers.get('x-supabase-url');
    const headerKey = req.headers.get('x-supabase-key');
    if (headerUrl && headerKey) {
      url = headerUrl.trim();
      key = headerKey.trim();
      source = 'client_headers';
    }
  }

  if (!url || !key) {
    return { client: null, source: 'none' };
  }

  try {
    const client = createClient(url, key, {
      auth: { persistSession: false },
    });
    return { client, source };
  } catch (err) {
    console.error('Supabase client init error:', err);
    return { client: null, source: 'error' };
  }
}

/**
 * GET /api/sync : Tải dữ liệu toàn bộ nhóm
 */
export async function GET(req: NextRequest) {
  const { client: supabase, source } = getSupabaseClientFromReq(req);

  if (!supabase) {
    return NextResponse.json(
      {
        success: false,
        error: 'Chưa cấu hình Supabase URL hoặc Anon Key trên Vercel / Client.',
        envDetected: {
          has_NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
          has_SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
          has_POSTGRES_URL: Boolean(process.env.POSTGRES_URL),
          has_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY),
        },
      },
      { status: 200 }
    );
  }

  try {
    const { data, error } = await supabase
      .from('equipay_group_data')
      .select('state_data, updated_at')
      .eq('id', 'default_group')
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          hint: 'Vui lòng chạy lại file supabase_schema.sql trong Supabase SQL Editor!',
          source,
        },
        { status: 200 }
      );
    }

    if (data && data.state_data) {
      return NextResponse.json({
        success: true,
        state: data.state_data as GroupState,
        updatedAt: data.updated_at,
        source,
      });
    }

    return NextResponse.json({
      success: true,
      state: null,
      message: 'Bảng equipay_group_data đã sẵn sàng nhưng chưa có bản ghi.',
      source,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || String(err), source },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sync : Lưu toàn bộ dữ liệu lên Supabase
 */
export async function POST(req: NextRequest) {
  const { client: supabase, source } = getSupabaseClientFromReq(req);

  if (!supabase) {
    return NextResponse.json(
      {
        success: false,
        error: 'Chưa cấu hình Supabase URL hoặc Anon Key trên Vercel / Client.',
      },
      { status: 200 }
    );
  }

  try {
    const body = await req.json();
    const state: GroupState = body.state;

    if (!state) {
      return NextResponse.json(
        { success: false, error: 'Thiếu dữ liệu state trong request' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('equipay_group_data')
      .upsert({
        id: 'default_group',
        state_data: state,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          hint: 'Đảm bảo bạn đã chạy file supabase_schema.sql trong Supabase SQL Editor!',
          source,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Đã lưu dữ liệu thành công vào bảng equipay_group_data!',
      source,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || String(err), source },
      { status: 500 }
    );
  }
}

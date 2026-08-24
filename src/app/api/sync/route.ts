import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GroupState } from '@/types';

// Lấy biến môi trường từ cả dạng NEXT_PUBLIC_ và dạng tiêu chuẩn của Vercel Supabase Integration
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  '';

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

function getServerSupabase() {
  if (!supabaseUrl || !supabaseKey) return null;
  try {
    return createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  } catch (err) {
    console.error('Server Supabase client init error:', err);
    return null;
  }
}

/**
 * GET /api/sync : Tải dữ liệu toàn bộ nhóm (bao gồm tài khoản, chi tiêu, thành viên)
 */
export async function GET() {
  const supabase = getServerSupabase();

  if (!supabase) {
    return NextResponse.json(
      {
        success: false,
        error: 'Supabase server credentials not configured in Vercel environment.',
        envDetected: {
          hasUrl: Boolean(supabaseUrl),
          hasKey: Boolean(supabaseKey),
        },
      },
      { status: 200 }
    );
  }

  try {
    const { data, error } = await supabase
      .from('equipay_group_data')
      .select('state_data')
      .eq('id', 'default_group')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }

    if (data && data.state_data) {
      return NextResponse.json({
        success: true,
        state: data.state_data as GroupState,
      });
    }

    return NextResponse.json({
      success: true,
      state: null,
      message: 'No record found in equipay_group_data table yet.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || String(err) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sync : Lưu toàn bộ dữ liệu (tài khoản mới, chi tiêu, ngân hàng) lên Supabase
 */
export async function POST(req: NextRequest) {
  const supabase = getServerSupabase();

  if (!supabase) {
    return NextResponse.json(
      {
        success: false,
        error: 'Supabase server credentials not configured in Vercel environment.',
      },
      { status: 200 }
    );
  }

  try {
    const body = await req.json();
    const state: GroupState = body.state;

    if (!state) {
      return NextResponse.json(
        { success: false, error: 'Missing state payload in request body' },
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
      return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }

    return NextResponse.json({ success: true, message: 'Saved successfully to Supabase!' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || String(err) },
      { status: 500 }
    );
  }
}

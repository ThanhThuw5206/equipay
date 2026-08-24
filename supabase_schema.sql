-- ==============================================================================
-- BẢNG CƠ SỞ DỮ LIỆU SUPABASE CHO ỨNG DỤNG CHIA TIỀN 4 NGƯỜI & KẾT TOÁN VIETQR
-- Hướng dẫn: Copy toàn bộ nội dung này và dán vào Supabase SQL Editor rồi bấm "RUN"
-- ==============================================================================

-- 1. Bảng nhóm chi tiêu
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Hội 4 Anh Em',
  admin_pin TEXT DEFAULT '1234',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng thông tin 4 thành viên & Ngân hàng
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '👤',
  color TEXT NOT NULL DEFAULT '#3B82F6',
  bank_bin TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bảng các khoản chi tiêu đang hoạt động (Chưa kết toán)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payer_id TEXT NOT NULL,
  beneficiary_ids TEXT[] NOT NULL,
  category TEXT NOT NULL DEFAULT 'FOOD',
  date TIMESTAMPTZ DEFAULT NOW(),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bảng lưu trữ lịch sử các kỳ đã kết toán
CREATE TABLE IF NOT EXISTS settlement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ DEFAULT NOW(),
  total_amount NUMERIC NOT NULL,
  expenses_data JSONB NOT NULL,
  debts_data JSONB NOT NULL,
  status TEXT DEFAULT 'COMPLETED',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kích hoạt Realtime cho các bảng (để cập nhật trực tiếp trên điện thoại)
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE settlement_history;

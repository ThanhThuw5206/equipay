-- ==============================================================================
-- BẢNG CƠ SỞ DỮ LIỆU SUPABASE CHO EQUIPAY (CHIA TIỀN 4 NGƯỜI & VIETQR NAPAS 247)
-- Hướng dẫn: Copy toàn bộ nội dung này và dán vào Supabase SQL Editor rồi bấm "RUN"
-- ==============================================================================

-- 1. Bảng đồng bộ trạng thái chính của toàn bộ nhóm (Chi tiêu, 4 thành viên, tài khoản, lịch sử)
CREATE TABLE IF NOT EXISTS equipay_group_data (
  id TEXT PRIMARY KEY DEFAULT 'default_group',
  state_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng nhóm chi tiêu
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Hội 4 Anh Em',
  admin_pin TEXT DEFAULT '1234',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bảng thông tin 4 thành viên & Ngân hàng
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  group_id UUID,
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

-- 4. Bảng các khoản chi tiêu đang hoạt động (Chưa kết toán)
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  group_id UUID,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payer_id TEXT NOT NULL,
  beneficiary_ids TEXT[] NOT NULL,
  category TEXT NOT NULL DEFAULT 'FOOD',
  date TIMESTAMPTZ DEFAULT NOW(),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Bảng lưu trữ lịch sử các kỳ đã kết toán
CREATE TABLE IF NOT EXISTS settlement_history (
  id TEXT PRIMARY KEY,
  group_id UUID,
  title TEXT NOT NULL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ DEFAULT NOW(),
  total_amount NUMERIC NOT NULL,
  expenses_data JSONB NOT NULL,
  debts_data JSONB NOT NULL,
  status TEXT DEFAULT 'COMPLETED',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- CẤU HÌNH QUYỀN ĐỌC / GHI (ROW LEVEL SECURITY POLICIES CHO PHÉP CLIENT GHI ĐƯỢC)
-- ==============================================================================

-- Tắt hoặc cấp quyền Full Access cho tất cả các bảng
ALTER TABLE equipay_group_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access on equipay_group_data" ON equipay_group_data;
CREATE POLICY "Allow all access on equipay_group_data" ON equipay_group_data FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access on groups" ON groups;
CREATE POLICY "Allow all access on groups" ON groups FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access on members" ON members;
CREATE POLICY "Allow all access on members" ON members FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access on expenses" ON expenses;
CREATE POLICY "Allow all access on expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE settlement_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access on settlement_history" ON settlement_history;
CREATE POLICY "Allow all access on settlement_history" ON settlement_history FOR ALL USING (true) WITH CHECK (true);

-- Cấp quyền truy cập cho Role anon và authenticated
GRANT ALL ON TABLE equipay_group_data TO anon, authenticated;
GRANT ALL ON TABLE groups TO anon, authenticated;
GRANT ALL ON TABLE members TO anon, authenticated;
GRANT ALL ON TABLE expenses TO anon, authenticated;
GRANT ALL ON TABLE settlement_history TO anon, authenticated;

-- Kích hoạt Realtime cho tất cả các bảng
ALTER PUBLICATION supabase_realtime ADD TABLE equipay_group_data;

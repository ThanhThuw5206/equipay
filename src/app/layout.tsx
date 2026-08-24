import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chia Tiền Nhóm 4 Người - Kết Toán & VietQR Tự Động",
  description: "Ứng dụng quản lý chi tiêu nhóm 4 người, tự động tính toán bù trừ công nợ tối ưu (Min-Cash-Flow) và sinh mã VietQR Napas 247 chuyển khoản chính xác.",
  keywords: ["chia tien", "vietqr", "ket toan no", "splitwise viet nam", "napas 247", "quan ly chi tieu nhom"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark h-full antialiased">
      <body className="min-h-full bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}

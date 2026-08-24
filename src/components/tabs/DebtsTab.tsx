'use client';

import React, { useState } from 'react';
import { DebtPayment, Expense, Member, UserAccount } from '@/types';
import { calculatePairwiseDebts, formatVND } from '@/lib/settlement-algorithm';
import { generateVietQRUrl, generateTransferDescription } from '@/lib/vietqr';
import { POPULAR_BANK_APPS, openBankingApp } from '@/lib/bank-deeplinks';
import {
  Scale,
  ArrowRight,
  Filter,
  Receipt,
  QrCode,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Building,
  Copy,
  Check,
  X,
} from 'lucide-react';

interface DebtsTabProps {
  members: Member[];
  expenses: Expense[];
  currentUser: UserAccount | null;
  onNavigateToPayment: () => void;
}

export const DebtsTab: React.FC<DebtsTabProps> = ({
  members,
  expenses,
  currentUser,
  onNavigateToPayment,
}) => {
  // Mặc định hiển thị TẤT CẢ công nợ của cả 4 người để không bị ẩn lệnh
  const [filterMemberId, setFilterMemberId] = useState<string>('ALL');
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);
  const [selectedQRDebt, setSelectedQRDebt] = useState<DebtPayment | null>(null);
  const [copiedStkId, setCopiedStkId] = useState<string | null>(null);

  const debts = calculatePairwiseDebts(members, expenses);
  const memberMap = new Map(members.map((m) => [m.id, m]));

  const filteredDebts = debts.filter((d) => {
    if (filterMemberId === 'ALL') return true;
    return d.fromMemberId === filterMemberId || d.toMemberId === filterMemberId;
  });

  const handleCopySTK = (debtId: string, stk: string) => {
    navigator.clipboard.writeText(stk);
    setCopiedStkId(debtId);
    setTimeout(() => setCopiedStkId(null), 2000);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header & Filter */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 text-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-400" />
            <span>Công Nợ &amp; Lệnh Trả Tiền 1-1 ({debts.length} giao dịch)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Bù trừ chính xác giữa người chi và người thụ hưởng • Kèm mã QR quét trả ngay
          </p>
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={filterMemberId}
            onChange={(e) => setFilterMemberId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Hiển thị tất cả ({debts.length} lệnh)</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.avatar} {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Debts List */}
      <div className="space-y-3">
        {filteredDebts.length === 0 ? (
          <div className="py-12 text-center text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800/80">
            <p className="text-2xl mb-1">🎉</p>
            <p className="text-sm font-bold text-slate-300">
              {expenses.length === 0
                ? 'Chưa có khoản chi nào được thêm vào hệ thống.'
                : 'Không có khoản nợ nào cần thanh toán!'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {expenses.length === 0
                ? 'Hãy vào tab "Trang chủ" hoặc "Chi tiết" để thêm khoản chi đầu tiên.'
                : 'Tất cả các thành viên đang ở trạng thái cân bằng chi tiêu.'}
            </p>
          </div>
        ) : (
          filteredDebts.map((debt) => {
            const fromMem = memberMap.get(debt.fromMemberId);
            const toMem = memberMap.get(debt.toMemberId);
            const isExpanded = expandedDebtId === debt.id;

            return (
              <div
                key={debt.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition text-slate-100 shadow-sm"
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base">{fromMem?.avatar}</span>
                      <div>
                        <span className="font-bold text-slate-200 text-xs sm:text-sm block truncate">
                          {fromMem?.name}
                        </span>
                        <span className="text-[10px] text-rose-400 font-medium">Người trả tiền</span>
                      </div>
                    </div>

                    <div className="flex items-center text-slate-500 shrink-0 px-1">
                      <ArrowRight className="w-4 h-4 text-amber-400" />
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base">{toMem?.avatar}</span>
                      <div>
                        <span className="font-bold text-emerald-300 text-xs sm:text-sm block truncate">
                          {toMem?.name}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-medium">Người nhận tiền</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base sm:text-lg font-black text-amber-400 font-mono">
                      {formatVND(debt.amount)}
                    </span>
                  </div>
                </div>

                {/* Bank Preview & Quick Actions */}
                <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                      <Building className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">{toMem?.bankName || 'Chưa cài ngân hàng'}</span>
                      <span className="text-slate-500">•</span>
                      <span className="font-mono text-emerald-400 select-all font-bold">
                        {toMem?.accountNumber || 'Chưa có STK'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      Chủ TK: <strong className="text-slate-200 uppercase">{toMem?.accountName || 'N/A'}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {toMem?.accountNumber && (
                      <button
                        type="button"
                        onClick={() => handleCopySTK(debt.id, toMem.accountNumber)}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition"
                        title="Sao chép số tài khoản"
                      >
                        {copiedStkId === debt.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Chép STK</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Show VietQR Modal right here */}
                    <button
                      onClick={() => setSelectedQRDebt(debt)}
                      className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 transition shadow-sm"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Quét VietQR</span>
                    </button>
                  </div>
                </div>

                {/* Detailed Breakdown Toggle */}
                {debt.breakdown && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/60">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedDebtId(isExpanded ? null : debt.id)
                      }
                      className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 font-medium transition"
                    >
                      <Receipt className="w-3 h-3 text-slate-500" />
                      <span>
                        {isExpanded
                          ? 'Thu gọn diễn giải chi tiết'
                          : 'Xem chi tiết các khoản chi tạo nên số nợ này'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 animate-fadeIn">
                        <div>
                          <p className="font-semibold text-emerald-400 text-[11px] mb-1">
                            + {toMem?.name} đã chi giúp {fromMem?.name}:{' '}
                            <span className="font-bold">
                              {formatVND(debt.breakdown.totalTheyOweMe)}
                            </span>
                          </p>
                          <ul className="space-y-0.5 pl-3 border-l border-slate-800 text-[11px] text-slate-300">
                            {debt.breakdown.theyOweMe.map((item, i) => (
                              <li key={i} className="flex justify-between">
                                <span>• {item.title}</span>
                                <span className="font-medium text-slate-400">
                                  {formatVND(item.amount)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {debt.breakdown.iOweThem.length > 0 && (
                          <div className="pt-1 border-t border-slate-900">
                            <p className="font-semibold text-rose-400 text-[11px] mb-1">
                              - Trừ lại khoản {fromMem?.name} đã chi giúp {toMem?.name}:{' '}
                              <span className="font-bold">
                                {formatVND(debt.breakdown.totalIOweThem)}
                              </span>
                            </p>
                            <ul className="space-y-0.5 pl-3 border-l border-slate-800 text-[11px] text-slate-400">
                              {debt.breakdown.iOweThem.map((item, i) => (
                                <li key={i} className="flex justify-between">
                                  <span>• {item.title}</span>
                                  <span>{formatVND(item.amount)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="pt-1 border-t border-slate-800 flex justify-between font-bold text-slate-200 text-[11px]">
                          <span>
                            = Số tiền {fromMem?.name} cần trả {toMem?.name}:
                          </span>
                          <span className="text-amber-400 font-mono">
                            {formatVND(debt.amount)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Individual VietQR Fullscreen Modal */}
      {selectedQRDebt && (() => {
        const toMember = memberMap.get(selectedQRDebt.toMemberId);
        const fromMember = memberMap.get(selectedQRDebt.fromMemberId);
        const desc = generateTransferDescription(
          fromMember?.name || 'BAN',
          toMember?.name || 'BAN'
        );
        const qrUrl = toMember
          ? generateVietQRUrl({
              bankBin: toMember.bankBin,
              accountNumber: toMember.accountNumber,
              amount: selectedQRDebt.amount,
              description: desc,
              accountName: toMember.accountName,
              template: 'compact2',
            })
          : '';

        return (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl text-slate-100 text-center relative">
              <button
                onClick={() => setSelectedQRDebt(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-center gap-1 text-xs text-emerald-400 font-bold mb-1">
                <span>Quét mã VietQR Napas 247</span>
              </div>
              <h3 className="font-bold text-base text-slate-100">
                {fromMember?.name} ➔ Trả {toMember?.name}
              </h3>
              <p className="text-xl font-black text-emerald-400 mt-1 font-mono">
                {formatVND(selectedQRDebt.amount)}
              </p>

              <div className="my-4 p-2 bg-white rounded-2xl shadow-inner inline-block max-w-full">
                {qrUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrUrl}
                    alt={`VietQR ${toMember?.name}`}
                    className="w-64 h-auto mx-auto rounded-lg"
                  />
                ) : (
                  <div className="p-8 text-slate-800 text-xs">
                    Chưa có thông tin số tài khoản
                  </div>
                )}
              </div>

              <div className="text-xs bg-slate-950 rounded-xl p-3 border border-slate-800 text-left space-y-1 mb-4">
                <p className="text-slate-400">
                  Người nhận: <strong className="text-emerald-300 font-bold">{toMember?.name}</strong>
                </p>
                <p className="text-slate-400">
                  Ngân hàng: <strong className="text-slate-200">{toMember?.bankName}</strong>
                </p>
                <p className="text-slate-400 flex items-center justify-between">
                  <span>
                    STK: <strong className="text-emerald-400 font-mono text-sm">{toMember?.accountNumber || 'Chưa điền'}</strong>
                  </span>
                  {toMember?.accountNumber && (
                    <button
                      onClick={() => handleCopySTK('qr_modal', toMember.accountNumber)}
                      className="text-[10px] text-blue-400 hover:underline"
                    >
                      Sao chép
                    </button>
                  )}
                </p>
                <p className="text-slate-400">
                  Chủ TK: <strong className="text-slate-200 uppercase">{toMember?.accountName || 'N/A'}</strong>
                </p>
                <p className="text-slate-400 truncate">
                  Nội dung: <strong className="text-slate-200">{desc}</strong>
                </p>
              </div>

              {/* Quick 1-Click Banking App Opener */}
              <div className="mb-4 space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    <span>⚡</span>
                    <span>Mở thẳng App Ngân hàng (1 chạm):</span>
                  </span>
                  <span className="text-[10px] text-emerald-400">Tự động chép STK</span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {POPULAR_BANK_APPS.map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => {
                        if (toMember?.accountNumber) {
                          navigator.clipboard.writeText(toMember.accountNumber);
                        }
                        openBankingApp(app);
                      }}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold text-slate-200 transition active:scale-95 group"
                    >
                      <span className="text-base">{app.icon}</span>
                      <span className="truncate max-w-[70px] group-hover:text-emerald-400">
                        {app.shortName}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {qrUrl && (
                  <a
                    href={qrUrl}
                    download={`VietQR_${toMember?.name || 'ChuyenTien'}.png`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 transition"
                  >
                    <span>Lưu ảnh QR</span>
                  </a>
                )}

                <button
                  onClick={() => setSelectedQRDebt(null)}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold text-xs transition"
                >
                  Đã chuyển &amp; Đóng
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

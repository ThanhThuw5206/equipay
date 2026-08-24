'use client';

import React, { useState } from 'react';
import { Expense, Member, UserAccount } from '@/types';
import { calculatePairwiseDebts, formatVND } from '@/lib/settlement-algorithm';
import {
  Scale,
  ArrowRight,
  Filter,
  Receipt,
  QrCode,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
  const [filterMemberId, setFilterMemberId] = useState<string>(
    currentUser?.memberId || 'ALL'
  );
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);

  const debts = calculatePairwiseDebts(members, expenses);
  const memberMap = new Map(members.map((m) => [m.id, m]));

  const filteredDebts = debts.filter((d) => {
    if (filterMemberId === 'ALL') return true;
    return d.fromMemberId === filterMemberId || d.toMemberId === filterMemberId;
  });

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header & Filter */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 text-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-400" />
            <span>Ma Trận Công Nợ Trực Tiếp 1-1 ({debts.length})</span>
          </h2>
          <p className="text-xs text-slate-400">
            Bù trừ đúng người chi và người thụ hưởng • Không cấn trừ bắc cầu
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
            <option value="ALL">Tất cả 4 thành viên</option>
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
                ? 'Chưa có khoản chi nào để tính công nợ.'
                : 'Không có khoản nợ nào cần thanh toán!'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Tất cả các thành viên đang ở trạng thái cân bằng.
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
                      <span className="font-bold text-slate-200 text-xs sm:text-sm truncate">
                        {fromMem?.name}
                      </span>
                    </div>

                    <div className="flex items-center text-slate-500 shrink-0 px-1">
                      <ArrowRight className="w-4 h-4 text-amber-400" />
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base">{toMem?.avatar}</span>
                      <span className="font-bold text-emerald-300 text-xs sm:text-sm truncate">
                        {toMem?.name}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base sm:text-lg font-black text-amber-400 font-mono">
                      {formatVND(debt.amount)}
                    </span>
                  </div>
                </div>

                {/* Bank Preview & Jump to QR button */}
                <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Chuyển vào: </span>
                    <strong className="text-slate-200">{toMem?.bankName}</strong> •{' '}
                    <span className="text-emerald-400 font-mono font-bold">
                      {toMem?.accountNumber || 'Chưa có STK'}
                    </span>
                  </div>

                  <button
                    onClick={onNavigateToPayment}
                    className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 transition shadow-sm"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Quét mã VietQR trả tiền</span>
                  </button>
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
    </div>
  );
};

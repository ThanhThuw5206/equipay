export interface Bank {
  id: string;
  code: string; // e.g. 'VCB', 'MB'
  name: string; // Ngân hàng TMCP Ngoại Thương Việt Nam
  shortName: string; // Vietcombank
  bin: string; // 970436
  logo?: string;
}

export interface Member {
  id: string;
  name: string;
  avatar: string; // emoji or image url
  color: string; // hex or tailwind color
  bankBin: string; // BIN or code for VietQR
  bankName: string;
  accountNumber: string;
  accountName: string;
  isAdmin?: boolean;
}

export type ExpenseCategory = 
  | 'FOOD' 
  | 'DRINK' 
  | 'SHOPPING' 
  | 'TRANSPORT' 
  | 'ACCOMMODATION' 
  | 'ENTERTAINMENT' 
  | 'UTILITIES' 
  | 'OTHER';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  payerId: string;
  beneficiaryIds: string[]; // IDs of members who share this expense
  category: ExpenseCategory;
  date: string; // ISO string
  note?: string;
}

export interface DebtExpenseDetail {
  expenseId: string;
  title: string;
  amount: number; // phần tiền người này chịu trong khoản chi đó
  payerName: string;
}

export interface DebtPayment {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  isPaid: boolean;
  paidAt?: string;
  breakdown?: {
    theyOweMe: { title: string; amount: number }[];
    iOweThem: { title: string; amount: number }[];
    totalTheyOweMe: number;
    totalIOweThem: number;
  };
}

export interface SettlementPeriod {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  expenses: Expense[];
  debts: DebtPayment[];
  status: 'PENDING' | 'COMPLETED';
  settledAt?: string;
  closedBy?: string;
}

export interface GroupState {
  groupName: string;
  members: Member[];
  expenses: Expense[];
  history: SettlementPeriod[];
  adminPin?: string;
  settlementMode?: 'PAIRWISE' | 'OPTIMAL'; // Mặc định PAIRWISE (trừ nợ đúng từng cặp 1-1)
}

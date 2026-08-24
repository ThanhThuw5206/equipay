import { Bank, ExpenseCategory, Member } from '@/types';

export const VIETNAM_BANKS: Bank[] = [
  { id: 'MB', code: 'MB', name: 'Ngân hàng TMCP Quân đội', shortName: 'MBBank', bin: '970422' },
  { id: 'VCB', code: 'VCB', name: 'Ngân hàng TMCP Ngoại Thương Việt Nam', shortName: 'Vietcombank', bin: '970436' },
  { id: 'TCB', code: 'TCB', name: 'Ngân hàng TMCP Kỹ Thương Việt Nam', shortName: 'Techcombank', bin: '970407' },
  { id: 'ACB', code: 'ACB', name: 'Ngân hàng TMCP Á Châu', shortName: 'ACB', bin: '970416' },
  { id: 'VPB', code: 'VPB', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', shortName: 'VPBank', bin: '970432' },
  { id: 'TPB', code: 'TPB', name: 'Ngân hàng TMCP Tiên Phong', shortName: 'TPBank', bin: '970423' },
  { id: 'BIDV', code: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', shortName: 'BIDV', bin: '970418' },
  { id: 'CTG', code: 'CTG', name: 'Ngân hàng TMCP Công Thương Việt Nam', shortName: 'VietinBank', bin: '970415' },
  { id: 'VBA', code: 'VBA', name: 'Ngân hàng Nông nghiệp & PT Nông thôn VN', shortName: 'Agribank', bin: '970405' },
  { id: 'STB', code: 'STB', name: 'Ngân hàng TMCP Sài Gòn Thương Tín', shortName: 'Sacombank', bin: '970403' },
  { id: 'VIB', code: 'VIB', name: 'Ngân hàng TMCP Quốc tế Việt Nam', shortName: 'VIB', bin: '970441' },
  { id: 'HDB', code: 'HDB', name: 'Ngân hàng TMCP Phát triển TP.HCM', shortName: 'HDBank', bin: '970437' },
  { id: 'MSB', code: 'MSB', name: 'Ngân hàng TMCP Hàng Hải Việt Nam', shortName: 'MSB', bin: '970426' },
  { id: 'OCB', code: 'OCB', name: 'Ngân hàng TMCP Phương Đông', shortName: 'OCB', bin: '970448' },
  { id: 'SHB', code: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội', shortName: 'SHB', bin: '970443' },
  { id: 'SEAB', code: 'SEAB', name: 'Ngân hàng TMCP Đông Nam Á', shortName: 'SeABank', bin: '970440' },
  { id: 'TIMO', code: 'TIMO', name: 'Ngân hàng số Timo by BVBank', shortName: 'Timo', bin: '963388' },
  { id: 'CAKE', code: 'CAKE', name: 'Ngân hàng số Cake by VPBank', shortName: 'Cake', bin: '546034' },
  { id: 'VIETTELMONEY', code: 'VIETTELMONEY', name: 'Viettel Money', shortName: 'ViettelMoney', bin: '971005' },
];

export const DEFAULT_MEMBERS: Member[] = [
  {
    id: 'mem_1',
    name: 'Thành viên 1 (Admin)',
    avatar: '👨‍💼',
    color: '#3B82F6', // Blue
    bankBin: '970422', // MBBank
    bankName: 'MBBank',
    accountNumber: '',
    accountName: '',
    isAdmin: true,
  },
  {
    id: 'mem_2',
    name: 'Thành viên 2',
    avatar: '🏄‍♂️',
    color: '#10B981', // Emerald
    bankBin: '970436', // Vietcombank
    bankName: 'Vietcombank',
    accountNumber: '',
    accountName: '',
    isAdmin: false,
  },
  {
    id: 'mem_3',
    name: 'Thành viên 3',
    avatar: '👩‍🎨',
    color: '#EC4899', // Pink
    bankBin: '970407', // Techcombank
    bankName: 'Techcombank',
    accountNumber: '',
    accountName: '',
    isAdmin: false,
  },
  {
    id: 'mem_4',
    name: 'Thành viên 4',
    avatar: '🚀',
    color: '#8B5CF6', // Purple
    bankBin: '970432', // VPBank
    bankName: 'VPBank',
    accountNumber: '',
    accountName: '',
    isAdmin: false,
  },
];

export const CATEGORIES_CONFIG: Record<
  ExpenseCategory,
  { label: string; icon: string; color: string; bg: string }
> = {
  FOOD: { label: 'Ăn uống', icon: '🍲', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  DRINK: { label: 'Cà phê & Nước', icon: '☕', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  SHOPPING: { label: 'Mua sắm', icon: '🛒', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  TRANSPORT: { label: 'Đi lại & Xăng xe', icon: '🚗', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ACCOMMODATION: { label: 'Khách sạn / Nhà', icon: '🏨', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  ENTERTAINMENT: { label: 'Giải trí & Vui chơi', icon: '🎮', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  UTILITIES: { label: 'Điện nước / Wifi', icon: '⚡', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  OTHER: { label: 'Khoản chi khác', icon: '📌', color: 'text-gray-500', bg: 'bg-gray-500/10' },
};

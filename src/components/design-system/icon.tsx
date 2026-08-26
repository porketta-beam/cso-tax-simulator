import {
  BatteryFull,
  Building2,
  Calculator,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardCopy,
  CreditCard,
  Download,
  House,
  FileText,
  Info,
  Landmark,
  LogOut,
  Lock,
  Menu,
  Pencil,
  PiggyBank,
  Plus,
  Printer,
  Receipt,
  Settings,
  Share,
  ShoppingBag,
  Signal,
  Smartphone,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Trash2,
  Upload,
  User,
  Users,
  Wallet,
  Wifi,
  X,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Icon (CTveiw core/Icon 포팅)
 *
 * 원본은 Lucide SVG 를 CDN 에서 받아 CSS mask-image 로 칠했다. 디자인
 * 시스템은 빌드 단계가 없는 환경이라 그 방법이 맞았지만, 앱에서는
 * lucide-react 를 쓴다 — 인라인 SVG 라 네트워크 요청이 없고, 쓰는 아이콘만
 * 번들에 들어가며, `currentColor` 를 그대로 상속한다.
 *
 * 이름 기반 API 는 원본 그대로 유지한다. 화면 코드가 `<Icon name="receipt" />`
 * 로 읽히는 편이 컴포넌트를 직접 import 하는 것보다 명세와 대조하기 쉽다.
 *
 * ⚠️ Lucide 는 대체재다. 클라이언트 아이콘 세트가 나오면 이 레지스트리만
 * 교체하면 된다.
 */
const REGISTRY = {
  receipt: Receipt,
  "credit-card": CreditCard,
  users: Users,
  "building-2": Building2,
  calculator: Calculator,
  wallet: Wallet,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  "piggy-bank": PiggyBank,
  landmark: Landmark,
  "file-text": FileText,
  "chevron-right": ChevronRight,
  "chevron-left": ChevronLeft,
  check: Check,
  x: X,
  plus: Plus,
  "trash-2": Trash2,
  "circle-alert": CircleAlert,
  "triangle-alert": TriangleAlert,
  info: Info,
  download: Download,
  upload: Upload,
  "clipboard-copy": ClipboardCopy,
  share: Share,
  smartphone: Smartphone,
  lock: Lock,
  pencil: Pencil,
  printer: Printer,
  signal: Signal,
  wifi: Wifi,
  "battery-full": BatteryFull,

  /* v2 앱 셸 — 하단 탭 4개와 ☰ 메뉴 시트 */
  house: House,
  "shopping-bag": ShoppingBag,
  menu: Menu,
  settings: Settings,
  user: User,
  "log-out": LogOut,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof REGISTRY;

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "ref"> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, className, ...rest }: IconProps) {
  const Glyph = REGISTRY[name];
  return (
    <Glyph
      aria-hidden="true"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      {...rest}
    />
  );
}

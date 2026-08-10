/**
 * CTveiw 디자인 시스템 — 앱 포팅본
 *
 * 화면 코드는 이 배럴에서만 import 한다. shadcn 프리미티브(`@/components/ui`)를
 * 화면에서 직접 쓰지 말 것 — 디자인 시스템이 강제하는 규칙(금액은 role 로만,
 * 카드는 elevation 으로 구분)을 우회하게 된다.
 */

// core
export { Icon, type IconName, type IconProps } from "./icon";
export { Money, type MoneyProps } from "./money";
export { Button, buttonVariants } from "@/components/ui/button";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
export { Badge } from "@/components/ui/badge";

// form
export { MoneyInput, type MoneyInputProps } from "./money-input";
export { FieldBlock, type FieldBlockProps } from "./field-block";
export { StepIndicator, type StepIndicatorProps } from "./step-indicator";
export {
  SegmentedToggle,
  type SegmentedOption,
  type SegmentedToggleProps,
} from "./segmented-toggle";

// ledger
export { LineItemRow, type LineItemRowProps } from "./line-item-row";

// result
export { NetCashHero, type NetCashHeroProps } from "./net-cash-hero";
export { BreakdownRow, type BreakdownRowProps } from "./breakdown-row";
export { BracketBar, type BracketBarProps } from "./bracket-bar";
export { ReserveCard, type ReserveCardProps } from "./reserve-card";

// system
export {
  StorageBanner,
  type StorageBannerProps,
  type StorageBannerVariant,
} from "./storage-banner";

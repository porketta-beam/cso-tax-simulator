import { redirect } from "next/navigation";

/** T0 진입 시 기본 탭은 장부다 (기능정의 v2 §3) */
export default function TaxIndex() {
  redirect("/tax/ledger");
}

import {
  parseBackupPayload,
  toBackupPayload,
  type SimulatorState,
} from "./simulator-reducer";

/**
 * 로컬 저장 (M1-b)
 *
 * 로그인 여부와 무관하게 **모두** 이 계층을 쓴다. 예전에는 새로고침 한 번에
 * 입력이 통째로 사라졌다.
 *
 * 백업 파일과 같은 모양(`toBackupPayload`)을 그대로 넣는다 — 검증기를
 * 하나만 두면 손상된 값이 화면으로 새어 나갈 길도 하나뿐이다. IndexedDB 가
 * 아니라 localStorage 인 이유는 담는 게 JSON 한 덩어리라서다.
 *
 * ponytail: 값 하나 · 동기 API. 명세가 수천 건이 되어 저장이 눈에 띄게
 * 밀리면 그때 IndexedDB 로 옮긴다.
 */
export const LOCAL_KEY = "cso-tax:state";

/** 저장소 접근은 통째로 막힐 수 있다 — Safari 프라이빗, 용량 초과, 쿠키 차단 */
export function loadLocal(now: Date = new Date()): SimulatorState | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? parseBackupPayload(raw, now) : null;
  } catch (err) {
    console.warn("[persistence] 로컬 저장소를 읽지 못했습니다", err);
    return null;
  }
}

/**
 * 저장 시각을 찍어 넣고, 찍힌 상태를 돌려준다.
 *
 * `updatedAt` 은 reducer 가 아니라 여기서 붙는다 (충돌 판정용). 돌려받은
 * 값이 서버와 비교할 "내 쪽" 이다.
 */
export function saveLocal(state: SimulatorState, now: Date = new Date()): SimulatorState {
  const stamped: SimulatorState = { ...state, updatedAt: now.toISOString() };
  try {
    localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify(toBackupPayload(stamped, stamped.updatedAt)),
    );
  } catch (err) {
    console.warn("[persistence] 로컬 저장소에 쓰지 못했습니다", err);
  }
  return stamped;
}

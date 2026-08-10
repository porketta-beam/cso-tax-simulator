import { cn } from "@/lib/utils";

/**
 * FieldBlock — 번호가 붙은 입력 묶음 (CTveiw form/FieldBlock 포팅)
 *
 * 목업의 ①②③④ 넘버링은 살릴 가치가 있다. "네 칸만 채우면 된다"는 약속을
 * 시각적으로 붙잡아 주기 때문이다.
 *
 * ⚠️ 사용자가 채워야 할 입력에만 번호를 붙이고, 자동 계산 결과에는 절대
 * 붙이지 않는다. 번호가 붙으면 사용자는 "내가 채워야 하는 칸"으로 읽는다.
 */
export interface FieldBlockProps
  extends Omit<React.ComponentProps<"section">, "title"> {
  num?: React.ReactNode;
  title: React.ReactNode;
  desc?: React.ReactNode;
  footer?: React.ReactNode;
}

export function FieldBlock({
  num,
  title,
  desc,
  footer,
  children,
  className,
  ...rest
}: FieldBlockProps) {
  return (
    <section className={cn("w-full", className)} {...rest}>
      <header className="mb-3 flex items-start gap-2.5">
        {num != null && (
          <span
            aria-hidden="true"
            className={cn(
              "num mt-px inline-flex size-6 shrink-0 items-center justify-center",
              "rounded-pill bg-ink-900 text-caption leading-none font-black text-fg-on-color",
            )}
          >
            {num}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-h3 leading-snug font-bold text-fg-strong">{title}</h3>
          {desc && (
            <p className="mt-1 text-caption leading-normal text-fg-secondary">{desc}</p>
          )}
        </div>
      </header>

      {children}

      {footer && <div className="mt-3">{footer}</div>}
    </section>
  );
}

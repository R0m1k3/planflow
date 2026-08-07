import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

export type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'danger' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-3 text-ink-2 border-line-2',
  accent: 'bg-accent-soft text-accent-soft-ink border-accent',
  ok: 'bg-ok-soft text-ok-soft-ink border-ok',
  warn: 'bg-warn-soft text-warn-soft-ink border-warn',
  danger: 'bg-danger-soft text-danger-soft-ink border-danger',
  info: 'bg-info-soft text-info-soft-ink border-info',
};

export interface BadgeProps {
  tone?: Tone;
  /** Sans liseré : pour les compteurs discrets de la navigation. */
  subtle?: boolean;
  children: ReactNode;
  className?: string;
}

/** Pastille compacte. Porte un état ou un décompte, jamais une action. */
export function Badge({
  tone = 'neutral',
  subtle = false,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center rounded-full px-2 py-px text-micro font-semibold',
        subtle ? 'border-transparent' : 'border',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

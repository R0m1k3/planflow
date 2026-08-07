import { posteShort, posteTokens, type PosteCode } from '@/lib/design/postes';
import { cx } from '@/lib/cx';

/**
 * États d'un créneau, repris du design system.
 *
 * `alert` ajoute un liseré danger de 1,5 px : la couleur du poste occupe déjà
 * le fond, l'alerte doit donc passer par la forme, pas par une seconde teinte
 * qui entrerait en concurrence avec la palette catégorielle.
 */
export type ShiftState =
  | 'published'
  | 'validated'
  | 'draft'
  | 'unpublished'
  | 'alert'
  | 'unassigned';

export interface ShiftChipProps {
  poste: PosteCode;
  /** « 09:00–17:00 ». */
  time: string;
  state?: ShiftState;
  /** Écart affiché en pastille, ex. « +2 h 55 ». */
  delta?: string;
  /** Motif de l'alerte, ex. « Repos < 11 h ». */
  alert?: string;
  /** Durée de pause, en minutes. */
  breakMinutes?: number;
  className?: string;
}

export function ShiftChip({
  poste,
  time,
  state = 'published',
  delta,
  alert,
  breakMinutes,
  className,
}: ShiftChipProps) {
  const tokens = posteTokens(poste);
  const ghost = state === 'unassigned';

  return (
    <div
      className={cx(
        'flex min-w-0 flex-col gap-px rounded-2 px-1.5 py-1 text-micro',
        state === 'draft' && 'border-dashed',
        className,
      )}
      style={{
        background: ghost ? 'transparent' : tokens.bg,
        color: ghost ? 'var(--color-ink-2)' : tokens.fg,
        border:
          state === 'alert'
            ? '1.5px solid var(--color-danger)'
            : ghost
              ? `1px dashed ${tokens.edge}`
              : state === 'draft'
                ? `1px dashed ${tokens.edge}`
                : state === 'unpublished'
                  ? `1px dotted ${tokens.edge}`
                  : '1px solid transparent',
      }}
    >
      <span className="flex items-center gap-1">
        {/* Le code du poste est le second canal : la couleur ne suffit pas. */}
        <span className="font-semibold tracking-wide">{posteShort(poste)}</span>
        {state === 'validated' ? (
          <span className="text-ok" title="Validé" aria-label="Validé">
            ✓
          </span>
        ) : null}
        {delta ? (
          <span className="tnum ml-auto rounded-full bg-warn-soft px-1 font-semibold text-warn-soft-ink">
            {delta}
          </span>
        ) : null}
      </span>

      <span className="tnum truncate">
        {time}
        {breakMinutes ? (
          <span className="opacity-70"> ({breakMinutes} mn)</span>
        ) : null}
      </span>

      {alert ? (
        <span className="mt-px flex items-center gap-1 font-medium text-danger-soft-ink">
          <span aria-hidden>▲</span>
          <span className="truncate">{alert}</span>
        </span>
      ) : null}
    </div>
  );
}

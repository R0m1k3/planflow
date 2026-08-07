'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { ThemeToggle } from '@/components/shell/ThemeToggle';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cx } from '@/lib/cx';
import {
  isActive,
  NAVIGATION,
  sectionForPath,
  type NavItem,
} from '@/components/shell/navigation';

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const section = sectionForPath(pathname);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink-1">
      <header className="flex h-13 flex-none items-center gap-5 border-b border-line-2 bg-surface px-5">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-2 text-lg font-semibold tracking-[-0.015em]"
        >
          <span aria-hidden className="size-5 rounded-2 bg-accent" />
          PlanFlow
        </Link>

        <nav aria-label="Sections" className="flex h-full gap-0.5">
          {NAVIGATION.map((entry) => {
            const target = entry.items.find((item) => item.href);
            const current = entry.id === section.id;
            return (
              <Link
                key={entry.id}
                href={target?.href ?? '/'}
                aria-current={current ? 'page' : undefined}
                className={cx(
                  'flex h-full items-center border-b-2 px-3.5 text-sm font-medium whitespace-nowrap',
                  current
                    ? 'border-accent text-ink-1'
                    : 'border-transparent text-ink-3 hover:text-ink-1',
                )}
              >
                {entry.label}
              </Link>
            );
          })}
        </nav>

        <span className="flex-1" />

        <Button size="sm">
          Nantes Atlantis
          <span aria-hidden className="text-[10px] text-ink-3">
            ▾
          </span>
        </Button>
        <ThemeToggle />
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-soft-ink"
        >
          MR
        </span>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-57 flex-none flex-col gap-0.5 overflow-auto border-r border-line-1 bg-surface p-3 pt-4">
          <p className="px-2.5 pb-2.5 text-micro font-semibold tracking-[0.08em] text-ink-3 uppercase">
            {section.label}
          </p>
          {section.items.map((item) => (
            <SidebarLink key={item.id} item={item} pathname={pathname} />
          ))}
          <span className="flex-1" />
          <p className="border-t border-line-1 px-2.5 pt-3 text-micro leading-relaxed text-ink-3">
            Instance auto-hébergée
            <br />
            Maison Rivage · 34 établissements
          </p>
        </aside>

        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const current = item.href ? isActive(item.href, pathname) : false;
  const className = cx(
    'flex w-full items-center justify-between gap-2 rounded-2 px-2.5 py-1.5 text-left text-sm',
    'transition-colors duration-[var(--d-1)] ease-organic',
    current
      ? 'bg-accent-soft font-semibold text-accent-soft-ink'
      : 'text-ink-2 hover:bg-surface-2',
  );

  const content = (
    <>
      <span className="truncate">{item.label}</span>
      {item.badge ? (
        <Badge subtle tone={current ? 'neutral' : 'neutral'}>
          {item.badge}
        </Badge>
      ) : null}
    </>
  );

  if (!item.href) {
    return (
      <Link
        href={`/bientot?ecran=${encodeURIComponent(item.label)}`}
        className={cx(className, 'text-ink-3')}
      >
        {content}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={current ? 'page' : undefined}
      className={className}
    >
      {content}
    </Link>
  );
}

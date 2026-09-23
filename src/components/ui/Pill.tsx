import type { HTMLAttributes } from 'react'
import clsx from '../../lib/clsx'

/** Tag pequena e discreta — contagens, categorias ("tagpill" nos wireframes). */
export function TagPill({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'blue' | 'terracota'
}) {
  const toneClasses = {
    neutral: 'bg-[#f2ede3] text-text-muted',
    blue: 'bg-blue-tint text-blue-dark',
    terracota: 'bg-terracota-tint text-terracota-dark',
  }[tone]
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-pill px-[9px] py-[2px] text-[10px] font-bold',
        toneClasses,
        className
      )}
      {...props}
    />
  )
}

/** Pill de status de ação — "Realizado / Remarcado", etc. */
export function StatusPill({
  active = false,
  className,
  ...props
}: HTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex items-center gap-[5px] rounded-pill border px-3 py-[7px] text-[11px] font-bold transition-colors',
        active
          ? 'border-transparent bg-gradient-to-br from-blue to-blue-dark text-white'
          : 'border-border text-text-soft hover:bg-[#f7f4ee]',
        className
      )}
      {...props}
    />
  )
}

/** Chip de filtro/seleção — "Hoje / Esta semana", etc. */
export function Chip({
  active = false,
  className,
  ...props
}: HTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={clsx(
        'rounded-pill border px-4 py-2 text-xs font-bold transition-colors',
        active
          ? 'border-ink bg-ink text-[#fdfbf8]'
          : 'border-border text-text-soft hover:bg-[#f7f4ee]',
        className
      )}
      {...props}
    />
  )
}

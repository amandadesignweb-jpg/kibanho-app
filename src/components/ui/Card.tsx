import type { HTMLAttributes } from 'react'
import clsx from '../../lib/clsx'

type Tone = 'default' | 'blue' | 'terracota'

export function Card({
  tone = 'default',
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: Tone }) {
  const toneClasses: Record<Tone, string> = {
    default: 'bg-card shadow-card',
    blue: 'bg-gradient-to-br from-blue-mid to-blue-deep text-white',
    terracota: 'bg-terracota-tint2 border border-terracota-border',
  }
  return (
    <div
      className={clsx('rounded-card', toneClasses[tone], className)}
      {...props}
    />
  )
}

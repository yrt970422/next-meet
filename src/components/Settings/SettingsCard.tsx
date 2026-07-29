import type { ReactNode } from 'react'

interface SettingsCardProps {
  icon: string
  title: string
  children: ReactNode
  className?: string
}

export function SettingsCard({
  icon,
  title,
  children,
  className,
}: SettingsCardProps) {
  return (
    <section
      className={['settings-card', className].filter(Boolean).join(' ')}
    >
      <div className="settings-card__heading">
        <span aria-hidden="true">{icon}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  )
}

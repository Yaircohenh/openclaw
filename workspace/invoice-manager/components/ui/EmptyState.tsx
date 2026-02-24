import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-16 h-16 bg-[var(--color-muted)] rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[var(--color-muted-foreground)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-1">{title}</h3>
      <p className="text-sm text-[var(--color-muted-foreground)] max-w-sm mb-6">{description}</p>
      {action}
    </div>
  )
}

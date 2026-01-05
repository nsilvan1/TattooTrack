import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 flex items-center justify-center rounded-full bg-surface text-text-secondary mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-text-primary mb-1">{title}</h3>
      <p className="text-text-secondary text-center max-w-sm mb-6">{description}</p>
      {action}
    </div>
  )
}

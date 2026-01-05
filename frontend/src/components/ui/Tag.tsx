import { X } from 'lucide-react'

interface TagProps {
  name: string
  color: string
  onRemove?: () => void
  onClick?: () => void
  size?: 'sm' | 'md'
  selected?: boolean
}

export default function Tag({ name, color, onRemove, onClick, size = 'md', selected }: TagProps) {
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
  }

  const baseStyles = `
    inline-flex items-center gap-1.5 rounded-full font-medium transition-all duration-200
    ${sizes[size]}
    ${onClick ? 'cursor-pointer' : ''}
    ${selected ? 'ring-2 ring-offset-2 ring-offset-bg' : ''}
  `

  return (
    <span
      className={baseStyles}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        borderColor: color,
        ringColor: selected ? color : undefined,
      }}
      onClick={onClick}
    >
      {name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="p-0.5 hover:bg-black/10 rounded-full transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}

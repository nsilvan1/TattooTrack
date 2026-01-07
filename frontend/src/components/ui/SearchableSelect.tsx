import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, X, User } from 'lucide-react'

export interface SearchableSelectOption {
  value: string
  label: string
  sublabel?: string
  icon?: React.ReactNode
}

interface SearchableSelectProps {
  label?: string
  placeholder?: string
  options: SearchableSelectOption[]
  value: string
  onChange: (value: string) => void
  error?: string
  showIcon?: boolean
}

export default function SearchableSelect({
  label,
  placeholder = 'Pesquisar...',
  options,
  value,
  onChange,
  error,
  showIcon = true,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    opt.sublabel?.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setSearch('')
  }

  const handleInputClick = () => {
    setIsOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {/* Campo principal */}
        <div
          onClick={handleInputClick}
          className={`
            w-full px-3 py-2.5 glass rounded-xl cursor-pointer
            text-text-primary
            focus-within:outline-none focus-within:ring-2 focus-within:ring-violet-500/50 focus-within:bg-white/10
            transition-all duration-300
            flex items-center gap-3
            ${error ? 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500' : ''}
          `}
        >
          {showIcon && (
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-violet-400" />
            </div>
          )}

          {isOpen ? (
            <div className="flex-1 flex items-center gap-2">
              <Search className="w-4 h-4 text-text-secondary/50 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                className="flex-1 bg-transparent outline-none placeholder:text-text-secondary/50 text-sm"
                placeholder={placeholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              {selectedOption ? (
                <>
                  <div className="text-sm font-medium text-text-primary truncate">{selectedOption.label}</div>
                  {selectedOption.sublabel && (
                    <div className="text-xs text-text-secondary/70 truncate">{selectedOption.sublabel}</div>
                  )}
                </>
              ) : (
                <span className="text-sm text-text-secondary/50">{placeholder}</span>
              )}
            </div>
          )}

          {value && !isOpen ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-text-secondary/70" />
            </button>
          ) : (
            <ChevronDown className={`w-4 h-4 text-text-secondary/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 py-1 rounded-xl border border-white/20 shadow-2xl max-h-48 overflow-y-auto bg-[#1a1a2e]/95 backdrop-blur-xl">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-text-secondary/70 text-center">
                <User className="w-6 h-6 mx-auto mb-1 opacity-50" />
                <span className="text-xs">Nenhum cliente encontrado</span>
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`
                    w-full px-3 py-2 text-left transition-colors flex items-center gap-2.5
                    hover:bg-violet-500/20
                    ${option.value === value ? 'bg-violet-500/30' : ''}
                  `}
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                    option.value === value ? 'bg-violet-500/40' : 'bg-white/10'
                  }`}>
                    <User className={`w-3.5 h-3.5 ${option.value === value ? 'text-violet-300' : 'text-text-secondary'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${option.value === value ? 'text-violet-300' : 'text-text-primary'}`}>
                      {option.label}
                    </div>
                    {option.sublabel && (
                      <div className="text-[11px] text-text-secondary/60 truncate">{option.sublabel}</div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  )
}



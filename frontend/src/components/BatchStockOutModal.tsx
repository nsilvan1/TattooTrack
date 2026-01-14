import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Package,
  Search,
  AlertTriangle,
  Check,
  Trash2,
} from 'lucide-react'
import { Modal, Button } from './ui'
import { productsApi, stockMovementsApi } from '../services/api'
import type { Appointment, Product, BatchStockMovementData } from '../types'

interface BatchStockOutModalProps {
  isOpen: boolean
  appointment: Pick<Appointment, 'id' | 'title' | 'client'> | null
  onComplete: () => void
  onSkip: () => void
}

interface SelectedProduct {
  product: Product
  quantity: number
  unit: string
}

// Unidades de uso
const USAGE_UNIT_LABELS: Record<string, string> = {
  un: 'Unidade',
  ml: 'ml',
  g: 'g',
  par: 'Par',
  cx: 'Caixa',
  pct: 'Pacote',
  fr: 'Frasco',
  kit: 'Kit',
}

const getUnitLabel = (value: string) => USAGE_UNIT_LABELS[value] || value

export default function BatchStockOutModal({
  isOpen,
  appointment,
  onComplete,
  onSkip,
}: BatchStockOutModalProps) {
  const queryClient = useQueryClient()
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showProductList, setShowProductList] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products', { isActive: true }],
    queryFn: () => productsApi.list({ isActive: true }),
    enabled: isOpen,
  })

  // Fetch recent movements to suggest frequent products
  const { data: recentMovements = [] } = useQuery({
    queryKey: ['stockMovements', { type: 'out', limit: 50 }],
    queryFn: () => stockMovementsApi.list({ type: 'out', limit: 50 }),
    enabled: isOpen,
  })

  // Get frequently used products (top 5 by occurrence in recent out movements)
  const frequentProducts = products.filter(p => {
    const occurrences = recentMovements.filter(m => m.productId === p.id).length
    return occurrences > 0
  }).sort((a, b) => {
    const aOccurrences = recentMovements.filter(m => m.productId === a.id).length
    const bOccurrences = recentMovements.filter(m => m.productId === b.id).length
    return bOccurrences - aOccurrences
  }).slice(0, 5)

  // Batch mutation
  const batchMutation = useMutation({
    mutationFn: stockMovementsApi.createBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] })
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] })
      onComplete()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Erro ao registrar saídas')
    },
  })

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedProducts([])
      setSearchTerm('')
      setShowProductList(false)
      setError(null)
    }
  }, [isOpen])

  // Filter products for search
  const filteredProducts = products.filter(p =>
    !selectedProducts.some(sp => sp.product.id === p.id) &&
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     p.brand?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const addProduct = (product: Product) => {
    setSelectedProducts(prev => [
      ...prev,
      {
        product,
        quantity: 1,
        unit: product.usageUnit,
      }
    ])
    setSearchTerm('')
    setShowProductList(false)
  }

  const removeProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(sp => sp.product.id !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    setSelectedProducts(prev =>
      prev.map(sp =>
        sp.product.id === productId
          ? { ...sp, quantity: Math.max(0.01, quantity) }
          : sp
      )
    )
  }

  const updateUnit = (productId: string, unit: string) => {
    setSelectedProducts(prev =>
      prev.map(sp =>
        sp.product.id === productId
          ? { ...sp, unit }
          : sp
      )
    )
  }

  const calculateQuantityInUsageUnit = (sp: SelectedProduct) => {
    if (sp.unit === sp.product.purchaseUnit && sp.product.purchaseUnit !== sp.product.usageUnit) {
      return sp.quantity * sp.product.quantityPerPurchaseUnit
    }
    return sp.quantity
  }

  const hasStockError = (sp: SelectedProduct) => {
    const qtyInUsageUnit = calculateQuantityInUsageUnit(sp)
    return qtyInUsageUnit > sp.product.currentStock
  }

  const handleSubmit = () => {
    if (!appointment || selectedProducts.length === 0) return

    // Check for stock errors
    const hasErrors = selectedProducts.some(hasStockError)
    if (hasErrors) {
      setError('Corrija os erros de estoque antes de continuar')
      return
    }

    const batchData: BatchStockMovementData = {
      appointmentId: appointment.id,
      movements: selectedProducts.map(sp => ({
        productId: sp.product.id,
        quantity: sp.quantity,
        unit: sp.unit,
      })),
    }

    batchMutation.mutate(batchData)
  }

  if (!appointment) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onSkip}
      title="Registrar Materiais Usados"
      size="lg"
    >
      <div className="space-y-4">
        {/* Appointment info */}
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <p className="text-sm text-text-secondary">Sessao com</p>
          <p className="font-medium text-text-primary">{appointment.client.name}</p>
          <p className="text-sm text-text-secondary">{appointment.title}</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Product search */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                placeholder="Buscar produto para adicionar..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setShowProductList(true)
                }}
                onFocus={() => setShowProductList(true)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent/50 text-sm"
              />
            </div>
          </div>

          {/* Product dropdown */}
          {showProductList && (searchTerm || filteredProducts.length > 0) && (
            <div className="absolute z-50 w-full mt-1 py-1 rounded-lg border border-white/20 shadow-2xl max-h-48 overflow-y-auto bg-[#1a1a2e]/95 backdrop-blur-xl">
              {filteredProducts.length === 0 ? (
                <div className="px-3 py-4 text-sm text-text-secondary text-center">
                  Nenhum produto encontrado
                </div>
              ) : (
                filteredProducts.slice(0, 10).map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    className="w-full px-3 py-2 text-left transition-colors flex items-center gap-3 hover:bg-violet-500/20"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${product.category.color}20` }}
                    >
                      <Package className="w-4 h-4" style={{ color: product.category.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">{product.name}</div>
                      <div className="text-xs text-text-secondary">
                        Estoque: {product.currentStock} {product.usageUnit}
                        {product.isLowStock && (
                          <span className="ml-2 text-amber-400">Baixo</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Click outside to close dropdown */}
        {showProductList && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowProductList(false)}
          />
        )}

        {/* Frequent products chips */}
        {frequentProducts.length > 0 && selectedProducts.length === 0 && (
          <div>
            <p className="text-xs text-text-secondary mb-2">Usados frequentemente:</p>
            <div className="flex flex-wrap gap-2">
              {frequentProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => addProduct(product)}
                  className="px-3 py-1.5 rounded-full text-xs bg-white/5 border border-white/10 text-text-primary hover:bg-white/10 transition-colors flex items-center gap-1.5"
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: product.category.color }}
                  />
                  {product.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected products list */}
        {selectedProducts.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-primary">
              Produtos selecionados ({selectedProducts.length})
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedProducts.map(sp => {
                const stockError = hasStockError(sp)
                const qtyInUsageUnit = calculateQuantityInUsageUnit(sp)

                return (
                  <div
                    key={sp.product.id}
                    className={`p-3 rounded-lg border ${
                      stockError
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${sp.product.category.color}20` }}
                      >
                        <Package className="w-4 h-4" style={{ color: sp.product.category.color }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {sp.product.name}
                        </p>
                        <p className="text-xs text-text-secondary">
                          Disponivel: {sp.product.currentStock} {sp.product.usageUnit}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={sp.quantity}
                          onChange={(e) => updateQuantity(sp.product.id, parseFloat(e.target.value) || 0.01)}
                          className="w-20 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-text-primary text-sm text-center focus:outline-none focus:border-accent/50"
                        />

                        <select
                          value={sp.unit}
                          onChange={(e) => updateUnit(sp.product.id, e.target.value)}
                          className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-text-primary text-sm focus:outline-none focus:border-accent/50"
                        >
                          <option value={sp.product.usageUnit}>
                            {getUnitLabel(sp.product.usageUnit)}
                          </option>
                          {sp.product.purchaseUnit !== sp.product.usageUnit && (
                            <option value={sp.product.purchaseUnit}>
                              {getUnitLabel(sp.product.purchaseUnit)}
                            </option>
                          )}
                        </select>

                        <button
                          onClick={() => removeProduct(sp.product.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-text-secondary hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Conversion info or error */}
                    {sp.unit === sp.product.purchaseUnit && sp.product.purchaseUnit !== sp.product.usageUnit && (
                      <div className={`mt-2 text-xs ${stockError ? 'text-red-400' : 'text-cyan-400'}`}>
                        = {qtyInUsageUnit} {sp.product.usageUnit}
                      </div>
                    )}

                    {stockError && (
                      <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Estoque insuficiente
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {selectedProducts.length === 0 && (
          <div className="py-8 text-center">
            <Package className="w-12 h-12 mx-auto text-text-secondary/30 mb-3" />
            <p className="text-text-secondary">
              Adicione os produtos usados nesta sessao
            </p>
            <p className="text-xs text-text-secondary/70 mt-1">
              Use a busca acima ou clique nos produtos frequentes
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-white/10">
          <Button variant="secondary" onClick={onSkip}>
            Pular
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedProducts.length === 0 || selectedProducts.some(hasStockError) || batchMutation.isPending}
          >
            {batchMutation.isPending ? (
              'Registrando...'
            ) : (
              <>
                <Check className="w-4 h-4" />
                Registrar e Concluir
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

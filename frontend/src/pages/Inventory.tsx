import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Box,
  Tag,
  Layers,
  DollarSign,
  Edit,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  RotateCcw,
  LayoutGrid,
  List,
  History,
} from 'lucide-react'
import { Button, Card, CardContent, Input, Modal, EmptyState } from '../components/ui'
import { inventoryApi, productsApi, productCategoriesApi, stockMovementsApi } from '../services/api'
import type { Product, ProductCategory, CreateProductData, StockMovementType } from '../types'

type ViewMode = 'cards' | 'table'
type TabView = 'products' | 'categories' | 'movements'

// Unidades de compra (embalagem)
const PURCHASE_UNIT_OPTIONS = [
  { value: 'un', label: 'Unidade' },
  { value: 'cx', label: 'Caixa' },
  { value: 'pct', label: 'Pacote' },
  { value: 'fr', label: 'Frasco' },
  { value: 'kit', label: 'Kit' },
]

// Unidades de uso (consumo)
const USAGE_UNIT_OPTIONS = [
  { value: 'un', label: 'Unidade' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'g', label: 'Gramas (g)' },
  { value: 'par', label: 'Par' },
]

// Helper para obter label da unidade
const getUnitLabel = (value: string) => {
  const allUnits = [...PURCHASE_UNIT_OPTIONS, ...USAGE_UNIT_OPTIONS]
  return allUnits.find(u => u.value === value)?.label || value
}

const COLOR_PALETTE = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
]

export default function Inventory() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabView>('products')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)

  // Product modal state
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState<CreateProductData>({
    name: '',
    categoryId: '',
    purchaseUnit: 'un',
    usageUnit: 'un',
    quantityPerPurchaseUnit: 1,
    currentStock: 0,
    minStock: 5,
  })

  // Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null)
  const [categoryForm, setCategoryForm] = useState({ name: '', color: '#3b82f6' })

  // Movement modal state
  const [showMovementModal, setShowMovementModal] = useState(false)
  const [selectedProductForMovement, setSelectedProductForMovement] = useState<Product | null>(null)
  const [movementForm, setMovementForm] = useState({
    type: 'in' as StockMovementType,
    quantity: 1,
    unit: 'un', // Pode ser purchaseUnit ou usageUnit
    reason: '',
    notes: '',
    costPerUnit: 0,
  })

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ type: 'product' | 'category'; id: string; name: string } | null>(null)

  // Queries
  const { data: stats } = useQuery({
    queryKey: ['inventoryStats'],
    queryFn: inventoryApi.getStats,
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products', searchTerm, selectedCategoryFilter, showLowStockOnly],
    queryFn: () => productsApi.list({
      search: searchTerm || undefined,
      categoryId: selectedCategoryFilter || undefined,
      lowStock: showLowStockOnly || undefined,
    }),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['productCategories'],
    queryFn: productCategoriesApi.list,
  })

  const { data: movements = [] } = useQuery({
    queryKey: ['stockMovements'],
    queryFn: () => stockMovementsApi.list({ limit: 50 }),
  })

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] })
      closeProductModal()
    },
  })

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProductData> }) => productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] })
      closeProductModal()
    },
  })

  const deleteProductMutation = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] })
      setShowDeleteModal(false)
      setItemToDelete(null)
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: productCategoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productCategories'] })
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] })
      closeCategoryModal()
    },
  })

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; color: string } }) => productCategoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productCategories'] })
      closeCategoryModal()
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: productCategoriesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productCategories'] })
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] })
      setShowDeleteModal(false)
      setItemToDelete(null)
    },
  })

  const createMovementMutation = useMutation({
    mutationFn: stockMovementsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] })
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] })
      closeMovementModal()
    },
  })

  // Modal handlers
  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      setProductForm({
        name: product.name,
        description: product.description,
        sku: product.sku,
        categoryId: product.categoryId,
        brand: product.brand,
        purchaseUnit: product.purchaseUnit,
        usageUnit: product.usageUnit,
        quantityPerPurchaseUnit: product.quantityPerPurchaseUnit,
        currentStock: product.currentStock,
        minStock: product.minStock,
        costPrice: product.costPrice,
        supplier: product.supplier,
        notes: product.notes,
      })
    } else {
      setEditingProduct(null)
      setProductForm({
        name: '',
        categoryId: categories[0]?.id || '',
        purchaseUnit: 'un',
        usageUnit: 'un',
        quantityPerPurchaseUnit: 1,
        currentStock: 0,
        minStock: 5,
      })
    }
    setShowProductModal(true)
  }

  const closeProductModal = () => {
    setShowProductModal(false)
    setEditingProduct(null)
    setProductForm({
      name: '',
      categoryId: '',
      purchaseUnit: 'un',
      usageUnit: 'un',
      quantityPerPurchaseUnit: 1,
      currentStock: 0,
      minStock: 5,
    })
  }

  const openCategoryModal = (category?: ProductCategory) => {
    if (category) {
      setEditingCategory(category)
      setCategoryForm({ name: category.name, color: category.color })
    } else {
      setEditingCategory(null)
      setCategoryForm({ name: '', color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)] })
    }
    setShowCategoryModal(true)
  }

  const closeCategoryModal = () => {
    setShowCategoryModal(false)
    setEditingCategory(null)
    setCategoryForm({ name: '', color: '#3b82f6' })
  }

  const openMovementModal = (product: Product) => {
    setSelectedProductForMovement(product)
    setMovementForm({
      type: 'in',
      quantity: 1,
      unit: product.usageUnit, // Default para unidade de uso
      reason: '',
      notes: '',
      costPerUnit: product.costPrice || 0,
    })
    setShowMovementModal(true)
  }

  const closeMovementModal = () => {
    setShowMovementModal(false)
    setSelectedProductForMovement(null)
    setMovementForm({
      type: 'in',
      quantity: 1,
      unit: 'un',
      reason: '',
      notes: '',
      costPerUnit: 0,
    })
  }

  const handleSaveProduct = () => {
    if (!productForm.name || !productForm.categoryId) return

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: productForm })
    } else {
      createProductMutation.mutate(productForm)
    }
  }

  const handleSaveCategory = () => {
    if (!categoryForm.name) return

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: categoryForm })
    } else {
      createCategoryMutation.mutate(categoryForm)
    }
  }

  const handleSaveMovement = () => {
    if (!selectedProductForMovement || movementForm.quantity < 0.01) return

    createMovementMutation.mutate({
      productId: selectedProductForMovement.id,
      type: movementForm.type,
      quantity: movementForm.quantity,
      unit: movementForm.unit,
      reason: movementForm.reason || undefined,
      notes: movementForm.notes || undefined,
      costPerUnit: movementForm.costPerUnit || undefined,
    })
  }

  // Calcula a quantidade em usageUnit para exibição
  const calculateQuantityInUsageUnit = (quantity: number, unit: string, product: Product) => {
    if (unit === product.purchaseUnit && product.purchaseUnit !== product.usageUnit) {
      return quantity * product.quantityPerPurchaseUnit
    }
    return quantity
  }

  const handleDelete = () => {
    if (!itemToDelete) return

    if (itemToDelete.type === 'product') {
      deleteProductMutation.mutate(itemToDelete.id)
    } else {
      deleteCategoryMutation.mutate(itemToDelete.id)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getMovementTypeInfo = (type: StockMovementType) => {
    switch (type) {
      case 'in':
        return { label: 'Entrada', icon: ArrowUpCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20' }
      case 'out':
        return { label: 'Saída', icon: ArrowDownCircle, color: 'text-red-400', bg: 'bg-red-500/20' }
      case 'adjustment':
        return { label: 'Ajuste', icon: RotateCcw, color: 'text-amber-400', bg: 'bg-amber-500/20' }
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Estoque</h1>
          <p className="text-sm text-text-secondary">Gerencie seus produtos e materiais</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'categories' && (
            <Button size="sm" onClick={() => openCategoryModal()}>
              <Plus className="w-4 h-4" />
              Nova Categoria
            </Button>
          )}
          {activeTab === 'products' && (
            <Button size="sm" onClick={() => openProductModal()}>
              <Plus className="w-4 h-4" />
              Novo Produto
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="glass-strong">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/20">
              <Package className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{stats?.overview.totalProducts || 0}</p>
              <p className="text-xs text-text-secondary">Produtos</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{stats?.overview.totalCategories || 0}</p>
              <p className="text-xs text-text-secondary">Categorias</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <Box className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{stats?.overview.activeProducts || 0}</p>
              <p className="text-xs text-text-secondary">Ativos</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`glass-strong ${(stats?.overview.lowStockCount || 0) > 0 ? 'border-amber-500/50' : ''}`}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-amber-400">{stats?.overview.lowStockCount || 0}</p>
              <p className="text-xs text-text-secondary">Estoque Baixo</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong col-span-2 lg:col-span-1">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/20">
              <DollarSign className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{formatCurrency(stats?.overview.totalValue || 0)}</p>
              <p className="text-xs text-text-secondary">Valor Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-white/5 w-fit">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'products'
              ? 'bg-accent text-white'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
          }`}
        >
          <Package className="w-4 h-4 inline-block mr-2" />
          Produtos
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'categories'
              ? 'bg-accent text-white'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
          }`}
        >
          <Tag className="w-4 h-4 inline-block mr-2" />
          Categorias
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'movements'
              ? 'bg-accent text-white'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
          }`}
        >
          <History className="w-4 h-4 inline-block mr-2" />
          Movimentações
        </button>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  <input
                    type="text"
                    placeholder="Buscar produto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent/50 text-sm"
                  />
                </div>

                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary text-sm focus:outline-none focus:border-accent/50"
                >
                  <option value="">Todas categorias</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>

                <button
                  onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                  className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-2 transition-colors ${
                    showLowStockOnly
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                      : 'bg-white/5 border-white/10 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Estoque Baixo
                </button>

                <div className="flex items-center gap-1 ml-auto">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'cards' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'table' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products List */}
          {products.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Package className="w-8 h-8" />}
                title="Nenhum produto encontrado"
                description="Comece adicionando seus materiais e produtos"
                action={
                  <Button onClick={() => openProductModal()}>
                    <Plus className="w-4 h-4" />
                    Adicionar Produto
                  </Button>
                }
              />
            </Card>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {products.map((product) => (
                <Card
                  key={product.id}
                  className={`hover:border-white/20 transition-all cursor-pointer ${
                    product.isLowStock ? 'border-amber-500/30' : ''
                  }`}
                  onClick={() => openProductModal(product)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${product.category.color}20` }}
                      >
                        <Package className="w-5 h-5" style={{ color: product.category.color }} />
                      </div>
                      {product.isLowStock && (
                        <span className="px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Baixo
                        </span>
                      )}
                    </div>

                    <h3 className="font-medium text-text-primary mb-1 line-clamp-1">{product.name}</h3>
                    <p className="text-xs text-text-secondary mb-3">
                      {product.category.name}
                      {product.brand && ` • ${product.brand}`}
                    </p>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-lg font-bold ${product.isLowStock ? 'text-amber-400' : 'text-text-primary'}`}>
                          {product.currentStock} <span className="text-xs font-normal text-text-secondary">{product.usageUnit}</span>
                        </p>
                        <p className="text-xs text-text-secondary">
                          Mín: {product.minStock} {product.usageUnit}
                          {product.purchaseUnit !== product.usageUnit && (
                            <span className="ml-1">• {product.quantityPerPurchaseUnit}{product.usageUnit}/{product.purchaseUnit}</span>
                          )}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          openMovementModal(product)
                        }}
                      >
                        <ArrowUpCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary">Produto</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary">Categoria</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-text-secondary">SKU</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-text-secondary">Estoque</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-text-secondary">Custo</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-text-secondary">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                        onClick={() => openProductModal(product)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${product.category.color}20` }}
                            >
                              <Package className="w-4 h-4" style={{ color: product.category.color }} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-text-primary">{product.name}</p>
                              {product.brand && <p className="text-xs text-text-secondary">{product.brand}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="px-2 py-1 rounded-full text-xs"
                            style={{ backgroundColor: `${product.category.color}20`, color: product.category.color }}
                          >
                            {product.category.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-text-secondary">{product.sku || '-'}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`text-sm font-medium ${product.isLowStock ? 'text-amber-400' : 'text-text-primary'}`}>
                            {product.currentStock} {product.usageUnit}
                          </span>
                          {product.isLowStock && (
                            <AlertTriangle className="w-3 h-3 text-amber-400 inline-block ml-1" />
                          )}
                          {product.purchaseUnit !== product.usageUnit && (
                            <span className="block text-xs text-text-secondary">
                              {product.quantityPerPurchaseUnit}{product.usageUnit}/{product.purchaseUnit}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-text-secondary">
                          {product.costPrice ? formatCurrency(product.costPrice) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              openMovementModal(product)
                            }}
                          >
                            <ArrowUpCircle className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {categories.length === 0 ? (
            <Card className="col-span-full">
              <EmptyState
                icon={<Tag className="w-8 h-8" />}
                title="Nenhuma categoria encontrada"
                description="Crie categorias para organizar seus produtos"
                action={
                  <Button onClick={() => openCategoryModal()}>
                    <Plus className="w-4 h-4" />
                    Criar Categoria
                  </Button>
                }
              />
            </Card>
          ) : (
            categories.map((category) => (
              <Card
                key={category.id}
                className="hover:border-white/20 transition-all cursor-pointer"
                onClick={() => openCategoryModal(category)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <Tag className="w-6 h-6" style={{ color: category.color }} />
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openCategoryModal(category)
                        }}
                        className="p-2 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setItemToDelete({ type: 'category', id: category.id, name: category.name })
                          setShowDeleteModal(true)
                        }}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-text-secondary hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-medium text-text-primary mb-1">{category.name}</h3>
                  <p className="text-sm text-text-secondary">
                    {category.productCount || 0} produto{(category.productCount || 0) !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Movements Tab */}
      {activeTab === 'movements' && (
        <Card>
          {movements.length === 0 ? (
            <EmptyState
              icon={<History className="w-8 h-8" />}
              title="Nenhuma movimentação"
              description="Movimentações de estoque aparecerão aqui"
            />
          ) : (
            <div className="divide-y divide-white/5">
              {movements.map((movement) => {
                const typeInfo = getMovementTypeInfo(movement.type as StockMovementType)
                const Icon = typeInfo.icon
                return (
                  <div key={movement.id} className="p-4 flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${typeInfo.bg}`}>
                      <Icon className={`w-5 h-5 ${typeInfo.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        {movement.product.name}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {typeInfo.label}
                        {movement.reason && ` • ${movement.reason}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${typeInfo.color}`}>
                        {movement.type === 'out' ? '-' : '+'}
                        {Math.abs(movement.quantity)} {movement.unit}
                      </p>
                      <p className="text-xs text-text-secondary">{formatDate(movement.createdAt)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* Product Modal */}
      <Modal
        isOpen={showProductModal}
        onClose={closeProductModal}
        title={editingProduct ? 'Editar Produto' : 'Novo Produto'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input
                label="Nome do Produto"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="Ex: Tinta preta"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Categoria</label>
              <select
                value={productForm.categoryId}
                onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary text-sm focus:outline-none focus:border-accent/50"
              >
                <option value="">Selecione...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <Input
              label="Código (SKU)"
              value={productForm.sku || ''}
              onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
              placeholder="Ex: TNT-001"
            />

            <Input
              label="Marca"
              value={productForm.brand || ''}
              onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
              placeholder="Ex: Intenze"
            />

            {/* Seção de Unidades */}
            <div className="col-span-2 p-3 rounded-lg bg-white/5 space-y-3">
              <p className="text-sm font-medium text-text-primary">Unidades de Medida</p>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Compra em</label>
                  <select
                    value={productForm.purchaseUnit}
                    onChange={(e) => setProductForm({ ...productForm, purchaseUnit: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary text-sm focus:outline-none focus:border-accent/50"
                  >
                    {PURCHASE_UNIT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Uso em</label>
                  <select
                    value={productForm.usageUnit}
                    onChange={(e) => setProductForm({ ...productForm, usageUnit: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary text-sm focus:outline-none focus:border-accent/50"
                  >
                    {USAGE_UNIT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Qtd por {getUnitLabel(productForm.purchaseUnit || 'un')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={productForm.quantityPerPurchaseUnit || 1}
                    onChange={(e) => setProductForm({ ...productForm, quantityPerPurchaseUnit: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary text-sm focus:outline-none focus:border-accent/50"
                    disabled={productForm.purchaseUnit === productForm.usageUnit}
                  />
                </div>
              </div>

              {productForm.purchaseUnit !== productForm.usageUnit && (
                <p className="text-xs text-text-secondary">
                  Exemplo: 1 {getUnitLabel(productForm.purchaseUnit || 'un')} = {productForm.quantityPerPurchaseUnit || 1} {productForm.usageUnit}
                </p>
              )}
            </div>

            <Input
              label={`Estoque Atual (${productForm.usageUnit})`}
              type="number"
              step="0.01"
              value={productForm.currentStock || 0}
              onChange={(e) => setProductForm({ ...productForm, currentStock: parseFloat(e.target.value) || 0 })}
            />

            <Input
              label={`Estoque Mínimo (${productForm.usageUnit})`}
              type="number"
              step="0.01"
              value={productForm.minStock || 5}
              onChange={(e) => setProductForm({ ...productForm, minStock: parseFloat(e.target.value) || 0 })}
            />

            <Input
              label={`Preço de Custo (por ${getUnitLabel(productForm.purchaseUnit || 'un')})`}
              type="number"
              step="0.01"
              value={productForm.costPrice || ''}
              onChange={(e) => setProductForm({ ...productForm, costPrice: parseFloat(e.target.value) || undefined })}
              placeholder="0,00"
            />

            <Input
              label="Fornecedor"
              value={productForm.supplier || ''}
              onChange={(e) => setProductForm({ ...productForm, supplier: e.target.value })}
              placeholder="Ex: Amazon"
            />

            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Descrição</label>
              <textarea
                value={productForm.description || ''}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Detalhes do produto..."
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:border-accent/50 resize-none"
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-between pt-2">
            {editingProduct && (
              <Button
                variant="danger"
                onClick={() => {
                  setItemToDelete({ type: 'product', id: editingProduct.id, name: editingProduct.name })
                  setShowDeleteModal(true)
                  closeProductModal()
                }}
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </Button>
            )}
            <div className="flex gap-3 ml-auto">
              <Button variant="secondary" onClick={closeProductModal}>Cancelar</Button>
              <Button
                onClick={handleSaveProduct}
                disabled={!productForm.name || !productForm.categoryId}
              >
                {editingProduct ? 'Salvar' : 'Criar Produto'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={closeCategoryModal}
        title={editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
      >
        <div className="space-y-4">
          <Input
            label="Nome da Categoria"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
            placeholder="Ex: Tintas"
          />

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Cor</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  onClick={() => setCategoryForm({ ...categoryForm, color })}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    categoryForm.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-primary scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${categoryForm.color}20` }}
            >
              <Tag className="w-5 h-5" style={{ color: categoryForm.color }} />
            </div>
            <span className="text-text-primary font-medium">
              {categoryForm.name || 'Nome da categoria'}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={closeCategoryModal}>Cancelar</Button>
            <Button onClick={handleSaveCategory} disabled={!categoryForm.name}>
              {editingCategory ? 'Salvar' : 'Criar Categoria'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Movement Modal */}
      <Modal
        isOpen={showMovementModal}
        onClose={closeMovementModal}
        title="Movimentação de Estoque"
      >
        {selectedProductForMovement && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-white/5 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${selectedProductForMovement.category.color}20` }}
              >
                <Package className="w-5 h-5" style={{ color: selectedProductForMovement.category.color }} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-text-primary">{selectedProductForMovement.name}</p>
                <p className="text-sm text-text-secondary">
                  Estoque atual: {selectedProductForMovement.currentStock} {selectedProductForMovement.usageUnit}
                </p>
                {selectedProductForMovement.purchaseUnit !== selectedProductForMovement.usageUnit && (
                  <p className="text-xs text-text-secondary">
                    (1 {selectedProductForMovement.purchaseUnit} = {selectedProductForMovement.quantityPerPurchaseUnit} {selectedProductForMovement.usageUnit})
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Tipo de Movimentação</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setMovementForm({ ...movementForm, type: 'in' })}
                  className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                    movementForm.type === 'in'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : 'bg-white/5 border-white/10 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <ArrowUpCircle className="w-5 h-5" />
                  <span className="text-xs font-medium">Entrada</span>
                </button>
                <button
                  onClick={() => setMovementForm({ ...movementForm, type: 'out' })}
                  className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                    movementForm.type === 'out'
                      ? 'bg-red-500/20 border-red-500/50 text-red-400'
                      : 'bg-white/5 border-white/10 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <ArrowDownCircle className="w-5 h-5" />
                  <span className="text-xs font-medium">Saída</span>
                </button>
                <button
                  onClick={() => setMovementForm({ ...movementForm, type: 'adjustment' })}
                  className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                    movementForm.type === 'adjustment'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                      : 'bg-white/5 border-white/10 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <RotateCcw className="w-5 h-5" />
                  <span className="text-xs font-medium">Ajuste</span>
                </button>
              </div>
            </div>

            {/* Quantidade e Unidade */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  {movementForm.type === 'adjustment' ? 'Novo Estoque' : 'Quantidade'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={movementForm.type === 'adjustment' ? 0 : 0.01}
                  value={movementForm.quantity}
                  onChange={(e) => setMovementForm({ ...movementForm, quantity: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary text-sm focus:outline-none focus:border-accent/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Unidade</label>
                <select
                  value={movementForm.unit}
                  onChange={(e) => setMovementForm({ ...movementForm, unit: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary text-sm focus:outline-none focus:border-accent/50"
                  disabled={movementForm.type === 'adjustment'}
                >
                  <option value={selectedProductForMovement.usageUnit}>
                    {getUnitLabel(selectedProductForMovement.usageUnit)} (uso)
                  </option>
                  {selectedProductForMovement.purchaseUnit !== selectedProductForMovement.usageUnit && (
                    <option value={selectedProductForMovement.purchaseUnit}>
                      {getUnitLabel(selectedProductForMovement.purchaseUnit)} (compra)
                    </option>
                  )}
                </select>
              </div>
            </div>

            {/* Mostra conversão se necessário */}
            {movementForm.unit === selectedProductForMovement.purchaseUnit &&
             selectedProductForMovement.purchaseUnit !== selectedProductForMovement.usageUnit && (
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <p className="text-xs text-cyan-400">
                  {movementForm.quantity} {getUnitLabel(movementForm.unit)} = {' '}
                  {movementForm.quantity * selectedProductForMovement.quantityPerPurchaseUnit} {selectedProductForMovement.usageUnit}
                </p>
              </div>
            )}

            <Input
              label="Motivo"
              value={movementForm.reason}
              onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
              placeholder={
                movementForm.type === 'in'
                  ? 'Ex: Compra, Reposição...'
                  : movementForm.type === 'out'
                  ? 'Ex: Uso em sessão, Perda...'
                  : 'Ex: Correção de inventário...'
              }
            />

            {movementForm.type === 'in' && (
              <Input
                label="Custo Unitário"
                type="number"
                step="0.01"
                value={movementForm.costPerUnit || ''}
                onChange={(e) => setMovementForm({ ...movementForm, costPerUnit: parseFloat(e.target.value) || 0 })}
                placeholder="0,00"
              />
            )}

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Observações</label>
              <textarea
                value={movementForm.notes}
                onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
                placeholder="Notas adicionais..."
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:border-accent/50 resize-none"
                rows={2}
              />
            </div>

            <div className="p-3 rounded-lg bg-white/5 text-sm">
              <p className="text-text-secondary">Após a movimentação:</p>
              <p className="text-text-primary font-medium">
                {(() => {
                  const quantityInUsageUnit = calculateQuantityInUsageUnit(
                    movementForm.quantity,
                    movementForm.unit,
                    selectedProductForMovement
                  )

                  if (movementForm.type === 'adjustment') {
                    return `${movementForm.quantity} ${selectedProductForMovement.usageUnit}`
                  } else if (movementForm.type === 'in') {
                    return `${(selectedProductForMovement.currentStock + quantityInUsageUnit).toFixed(2)} ${selectedProductForMovement.usageUnit}`
                  } else {
                    return `${(selectedProductForMovement.currentStock - quantityInUsageUnit).toFixed(2)} ${selectedProductForMovement.usageUnit}`
                  }
                })()}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={closeMovementModal}>Cancelar</Button>
              <Button
                onClick={handleSaveMovement}
                disabled={(() => {
                  if (movementForm.quantity < (movementForm.type === 'adjustment' ? 0 : 0.01)) return true

                  if (movementForm.type === 'out') {
                    const quantityInUsageUnit = calculateQuantityInUsageUnit(
                      movementForm.quantity,
                      movementForm.unit,
                      selectedProductForMovement
                    )
                    return quantityInUsageUnit > selectedProductForMovement.currentStock
                  }

                  return false
                })()}
              >
                Confirmar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setItemToDelete(null)
        }}
        title="Confirmar Exclusão"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Tem certeza que deseja excluir{' '}
            <span className="text-text-primary font-medium">"{itemToDelete?.name}"</span>?
          </p>
          {itemToDelete?.type === 'category' && (
            <p className="text-sm text-amber-400">
              Categorias com produtos vinculados não podem ser excluídas.
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

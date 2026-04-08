"use client"

import { type ChangeEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Product } from '@/lib/types'

interface ProductFormData {
  name: string
  sku: string | null
  barcode: string | null
  description: string | null
  price: number
  cost: number
  min_stock: number
  current_stock: number
  product_type: 'accessory' | 'device'
  category_id: number | null
  is_active: boolean
}

interface ProductDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ProductFormData, productId?: number) => Promise<void>
  isLoading?: boolean
  error?: string | null
  product?: Product | null
}

type ProductFormState = {
  id: number | null
  name: string
  sku: string
  barcode: string
  description: string
  price: string
  cost: string
  min_stock: string
  current_stock: string
  product_type: 'accessory' | 'device'
  category_id: string
  is_active: boolean
}

const emptyForm: ProductFormState = {
  id: null,
  name: '',
  sku: '',
  barcode: '',
  description: '',
  price: '0',
  cost: '0',
  min_stock: '0',
  current_stock: '0',
  product_type: 'accessory',
  category_id: '',
  is_active: true,
}

export default function ProductDialog({
  isOpen,
  onClose,
  onSave,
  isLoading = false,
  error = null,
  product = null,
}: ProductDialogProps) {
  const [formData, setFormData] = useState<ProductFormState>(emptyForm)

  useEffect(() => {
    console.log('[ProductDialog] useEffect product:', product)
    if (product) {
      setFormData({
        id: product.id,
        name: product.name || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        description: product.description || '',
        price: product.price?.toString() || '0',
        cost: product.cost?.toString() || '0',
        min_stock: product.min_stock?.toString() || '0',
        current_stock: product.current_stock?.toString() || '0',
        product_type: product.product_type,
        category_id: product.category_id?.toString() || '',
        is_active: product.is_active ?? true,
      })
    } else {
      setFormData(emptyForm)
    }
  }, [product])

  const resetForm = () => {
    setFormData(emptyForm)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target

    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('El nombre del producto es obligatorio')
      return
    }

    if (!formData.product_type) {
      alert('El tipo de producto es obligatorio')
      return
    }

    const payload: ProductFormData = {
      name: formData.name.trim(),
      sku: formData.sku.trim() || null,
      barcode: formData.barcode.trim() || null,
      description: formData.description.trim() || null,
      price: Number(formData.price) || 0,
      cost: Number(formData.cost) || 0,
      min_stock: Number(formData.min_stock) || 0,
      current_stock: Number(formData.current_stock) || 0,
      product_type: formData.product_type,
      category_id: formData.category_id ? Number(formData.category_id) : null,
      is_active: formData.is_active,
    }

    console.log('[ProductDialog] Submitting form:', payload, 'product?.id:', product?.id, 'formData.id:', formData.id)

    if (product && (!product.id || typeof product.id !== 'number' || isNaN(product.id))) {
      alert('Producto sin ID válido para editar')
      return
    }

    try {
      await onSave(payload, formData.id || undefined)
      resetForm()
      handleClose()
    } catch (err) {
      console.error('[ProductDialog] Error saving product:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="sticky top-0 border-b p-6 bg-white rounded-t-lg">
          <h2 className="text-xl font-bold">{product ? 'Editar Producto' : 'Agregar Producto'}</h2>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: iPhone 15"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">SKU</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Código SKU"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Código de Barras</label>
              <input
                type="text"
                name="barcode"
                value={formData.barcode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Código de barras"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Precio *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Costo *</label>
              <input
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Stock Mínimo *</label>
              <input
                type="number"
                name="min_stock"
                value={formData.min_stock}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Stock Actual *</label>
              <input
                type="number"
                name="current_stock"
                value={formData.current_stock}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Producto *</label>
              <select
                name="product_type"
                value={formData.product_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="accessory">Accesorio</option>
                <option value="device">Dispositivo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Categoría ID</label>
              <input
                type="text"
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ID de categoría"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descripción del producto"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="w-4 h-4"
              />
              <label className="text-sm font-medium">Activo</label>
            </div>
          </div>

          <div className="sticky bottom-0 border-t bg-white p-6 flex gap-2 justify-end rounded-b-lg">
            <Button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-100"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              {isLoading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

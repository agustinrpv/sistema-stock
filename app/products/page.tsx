"use client"

import React from 'react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Product } from '@/lib/types'
import { Button } from '@/components/ui/button'
import ProductDialog from '@/components/products/product-dialog'

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const fetchProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('[ProductsPage] Error fetching products:', error)
    } else {
      setProducts((data as Product[]) ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleAddProduct = () => {
    setEditingProduct(null)
    setSaveError(null)
    setIsDialogOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    console.log('[ProductsPage] Editing product:', product.id, product)
    if (!product.id || typeof product.id !== 'number' || isNaN(product.id)) {
      alert('Producto sin ID válido para editar')
      return
    }
    setEditingProduct(product)
    setSaveError(null)
    setIsDialogOpen(true)
  }

  const handleDeleteProduct = async (product: Product) => {
    console.log('[ProductsPage] Deleting product:', product.id, product)
    if (!product.id || typeof product.id !== 'number' || isNaN(product.id)) {
      alert('Producto sin ID válido para eliminar')
      return
    }
    if (!confirm(`¿Estás seguro de que quieres eliminar el producto "${product.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar el producto')
      }

      console.log('[ProductsPage] Product deleted successfully')
      await fetchProducts()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('[ProductsPage] Error deleting product:', errorMessage)
      alert(`Error al eliminar: ${errorMessage}`)
    }
  }

  const handleSaveProduct = async (formData: any, productId?: number) => {
    console.log('[ProductsPage] handleSaveProduct called with productId:', productId, 'type:', typeof productId)
    if (productId && (typeof productId !== 'number' || isNaN(productId))) {
      const errorMsg = 'ID de producto inválido para guardar'
      console.error('[ProductsPage] ' + errorMsg)
      setSaveError(errorMsg)
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      console.log('[ProductsPage] Saving product:', formData, 'ID:', productId)

      const url = productId ? `/api/products/${productId}` : '/api/products'
      const method = productId ? 'PUT' : 'POST'

      console.log('[ProductsPage] Calling', method, 'to', url)

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al guardar el producto')
      }

      const result = await response.json()
      console.log('[ProductsPage] Product saved successfully:', result)

      setIsDialogOpen(false)
      setEditingProduct(null)
      await fetchProducts()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('[ProductsPage] Error saving product:', errorMessage)
      setSaveError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Gestión de Productos</h1>
      <Button onClick={handleAddProduct} className="mb-4 bg-blue-600 text-white hover:bg-blue-700">
        Agregar Producto
      </Button>

      {loading ? (
        <p>Cargando productos...</p>
      ) : (
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="border-b p-2">Nombre</th>
              <th className="border-b p-2">SKU</th>
              <th className="border-b p-2">Código de Barras</th>
              <th className="border-b p-2">Precio</th>
              <th className="border-b p-2">Stock Actual</th>
              <th className="border-b p-2">Tipo</th>
              <th className="border-b p-2">Activo</th>
              <th className="border-b p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td className="border-b p-2">{product.name}</td>
                <td className="border-b p-2">{product.sku || '-'}</td>
                <td className="border-b p-2">{product.barcode || '-'}</td>
                <td className="border-b p-2">${product.price.toFixed(2)}</td>
                <td className="border-b p-2">{product.current_stock}</td>
                <td className="border-b p-2">{product.product_type}</td>
                <td className="border-b p-2">{product.is_active ? 'Sí' : 'No'}</td>
                <td className="border-b p-2">
                  <Button
                    onClick={() => handleEditProduct(product)}
                    className="mr-2 bg-yellow-500 text-white hover:bg-yellow-600"
                  >
                    Editar
                  </Button>
                  <Button
                    onClick={() => handleDeleteProduct(product)}
                    className="bg-red-500 text-white hover:bg-red-600"
                  >
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ProductDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false)
          setEditingProduct(null)
          setSaveError(null)
        }}
        onSave={handleSaveProduct}
        isLoading={isSaving}
        error={saveError}
        product={editingProduct}
      />
    </div>
  )
}

export default ProductsPage
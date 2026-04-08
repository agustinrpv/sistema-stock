"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { StockEntry, Product } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'

interface StockEntryWithProduct extends StockEntry {
  products: {
    name: string
    sku: string | null
  }
}

export default function IngresosPage() {
  const [entries, setEntries] = useState<StockEntryWithProduct[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: '',
    unit_cost: '',
    supplier: '',
    reference_number: '',
    notes: ''
  })

  useEffect(() => {
    fetchEntries()
    fetchProducts()
  }, [])

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from('stock_entries')
      .select(`
        *,
        products (
          name,
          sku
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[IngresosPage] Error:', error)
      setError('Error al cargar ingresos')
    } else {
      setEntries((data as StockEntryWithProduct[]) ?? [])
      setError(null)
    }
    setLoading(false)
  }

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching products:', error)
    } else {
      setProducts(data ?? [])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/ingresos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: parseInt(formData.product_id),
          quantity: parseInt(formData.quantity),
          unit_cost: parseFloat(formData.unit_cost) || 0,
          supplier: formData.supplier,
          reference_number: formData.reference_number,
          notes: formData.notes
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al registrar ingreso')
      }

      // Reset form and close modal
      setFormData({
        product_id: '',
        quantity: '',
        unit_cost: '',
        supplier: '',
        reference_number: '',
        notes: ''
      })
      setIsModalOpen(false)
      fetchEntries() // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return <div className="p-4">Cargando...</div>
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Ingresos de Stock</h1>
        <Button onClick={() => setIsModalOpen(true)}>Registrar Ingreso</Button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Ingreso</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="product_id">Producto</Label>
                <Select
                  id="product_id"
                  value={formData.product_id}
                  onChange={(e) => handleInputChange('product_id', e.target.value)}
                  required
                >
                  <option value="">Seleccionar producto</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id.toString()}>
                      {product.name} {product.sku ? `(${product.sku})` : ''}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="quantity">Cantidad</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="unit_cost">Costo Unitario</Label>
                <Input
                  id="unit_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unit_cost}
                  onChange={(e) => handleInputChange('unit_cost', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="supplier">Proveedor</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => handleInputChange('supplier', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="reference_number">Número de Referencia</Label>
                <Input
                  id="reference_number"
                  value={formData.reference_number}
                  onChange={(e) => handleInputChange('reference_number', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                />
              </div>
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Registrando...' : 'Registrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      {entries.length === 0 ? (
        <div className="p-4 bg-gray-100 rounded text-gray-600 text-center">
          No hay ingresos cargados
        </div>
      ) : (
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b text-left">Producto</th>
              <th className="py-2 px-4 border-b text-left">SKU</th>
              <th className="py-2 px-4 border-b text-left">Cantidad</th>
              <th className="py-2 px-4 border-b text-left">Costo Unitario</th>
              <th className="py-2 px-4 border-b text-left">Proveedor</th>
              <th className="py-2 px-4 border-b text-left">Referencia</th>
              <th className="py-2 px-4 border-b text-left">Notas</th>
              <th className="py-2 px-4 border-b text-left">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="py-2 px-4 border-b">{entry.products?.name || 'N/A'}</td>
                <td className="py-2 px-4 border-b">{entry.products?.sku || '-'}</td>
                <td className="py-2 px-4 border-b">{entry.quantity}</td>
                <td className="py-2 px-4 border-b">${entry.unit_cost.toFixed(2)}</td>
                <td className="py-2 px-4 border-b">{entry.supplier || '-'}</td>
                <td className="py-2 px-4 border-b">{entry.reference_number || '-'}</td>
                <td className="py-2 px-4 border-b">{entry.notes || '-'}</td>
                <td className="py-2 px-4 border-b">{new Date(entry.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

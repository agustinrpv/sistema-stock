"use client"

import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { type Product } from '@/lib/types'

interface Sale {
  id: number
  customer_name: string | null
  total: number
  payment_method: string | null
  created_at: string
}

interface ProductUnit {
  id: number
  product_id: number
  imei: string | null
  serial_number: string | null
  status: string
}

interface CartItem {
  product: Product
  quantity: number
  unit?: ProductUnit
}

export default function VentasPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [units, setUnits] = useState<ProductUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null)
  const [unitSearch, setUnitSearch] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [cart, setCart] = useState<CartItem[]>([])

  const availableUnits = useMemo(
    () => units.filter((unit) => unit.status === 'available'),
    [units]
  )

  const filteredProducts = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return products

    return products.filter((product) => {
      const matchName = product.name.toLowerCase().includes(normalized)
      const matchSku = product.sku?.toLowerCase().includes(normalized)
      const matchBarcode = product.barcode?.toLowerCase().includes(normalized)
      return matchName || matchSku || matchBarcode
    })
  }, [products, search])

  const selectedProductUnits = useMemo(() => {
    if (!selectedProduct || selectedProduct.product_type !== 'device') return []
    let filtered = availableUnits.filter((unit) => unit.product_id === selectedProduct.id)
    
    if (unitSearch.trim()) {
      const normalized = unitSearch.trim().toLowerCase()
      filtered = filtered.filter((unit) => 
        unit.imei?.toLowerCase().includes(normalized) || 
        unit.serial_number?.toLowerCase().includes(normalized)
      )
    }
    
    return filtered
  }, [availableUnits, selectedProduct, unitSearch])

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.product.price, 0),
    [cart]
  )

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    const [salesRes, productsRes, unitsRes] = await Promise.all([
      supabase.from('sales').select('id,customer_name,total,payment_method,created_at').order('created_at', { ascending: false }).limit(50),
      supabase
        .from('products')
        .select('id,name,sku,product_type,price,current_stock,is_active')
        .eq('is_active', true)
        .order('name', { ascending: true }),
      supabase
        .from('product_units')
        .select('id,product_id,imei,serial_number,status')
        .eq('status', 'available')
        .order('created_at', { ascending: false }),
    ])

    if (salesRes.error) {
      console.error('[VentasPage] fetch sales error:', salesRes.error)
      setError('No se pudieron cargar las ventas registradas.')
    } else {
      setSales((salesRes.data as Sale[]) ?? [])
    }

    if (productsRes.error) {
      console.error('[VentasPage] fetch products error:', productsRes.error)
      setError((prev) => prev ?? 'No se pudieron cargar los productos.')
    } else {
      setProducts((productsRes.data as Product[]) ?? [])
    }

    if (unitsRes.error) {
      console.error('[VentasPage] fetch units error:', unitsRes.error)
      setError((prev) => prev ?? 'No se pudieron cargar las unidades disponibles.')
    } else {
      setUnits((unitsRes.data as ProductUnit[]) ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    void fetchData()
  }, [])

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value)
  }

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // Si hay exactamente un producto filtrado, seleccionarlo automáticamente
      if (filteredProducts.length === 1) {
        handleSelectProduct(filteredProducts[0])
        setSearch('')
      }
    }
  }

  const handleUnitSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUnitSearch(event.target.value)
  }

  const handleUnitSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // Si hay exactamente una unidad filtrada, seleccionarla automáticamente
      if (selectedProductUnits.length === 1) {
        setSelectedUnitId(selectedProductUnits[0].id)
        setUnitSearch('')
      }
    }
  }

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    setSelectedUnitId(null)
    setUnitSearch('')
    setQuantity(product.product_type === 'accessory' ? 1 : 1)
  }

  const handleAddToCart = () => {
    if (!selectedProduct) {
      setSubmitError('Selecciona un producto para agregar al carrito.')
      return
    }

    if (selectedProduct.product_type === 'device') {
      if (!selectedUnitId) {
        setSubmitError('Selecciona una unidad disponible para el dispositivo.')
        return
      }

      const selectedUnit = selectedProductUnits.find((unit) => unit.id === selectedUnitId)
      if (!selectedUnit) {
        setSubmitError('Unidad no válida seleccionada.')
        return
      }

      if (cart.some((item) => item.unit?.id === selectedUnitId)) {
        setSubmitError('Esa unidad ya está en el carrito.')
        return
      }

      setCart((prev) => [...prev, { product: selectedProduct, quantity: 1, unit: selectedUnit }])
      setSelectedProduct(null)
      setSelectedUnitId(null)
      setSubmitError(null)
      return
    }

    if (quantity <= 0) {
      setSubmitError('La cantidad debe ser mayor a cero.')
      return
    }

    if (selectedProduct.current_stock < quantity) {
      setSubmitError('No hay stock suficiente para ese accesorio.')
      return
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === selectedProduct.id && !item.unit)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex].quantity += quantity
        return updated
      }
      return [...prev, { product: selectedProduct, quantity, unit: undefined }]
    })

    setSelectedProduct(null)
    setQuantity(1)
    setSubmitError(null)
  }

  const handleRemoveCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleConfirmSale = async () => {
    if (cart.length === 0) {
      setSubmitError('Agrega al menos un artículo al carrito antes de confirmar la venta.')
      return
    }

    setSaving(true)
    setSubmitError(null)

    const payload = {
      items: cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        product_unit_id: item.unit?.id ?? null,
      })),
    }

    console.log('[VentasPage] confirm sale payload:', payload)

    try {
      const response = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      console.log('[VentasPage] confirm sale request url:', '/api/ventas')
      console.log('[VentasPage] confirm sale request method:', 'POST')
      console.log('[VentasPage] confirm sale response status:', response.status, response.statusText)
      console.log('[VentasPage] confirm sale response url:', response.url)
      console.log('[VentasPage] confirm sale response headers:', Object.fromEntries(response.headers.entries()))

      let rawBody = ''
      let result: any = null

      try {
        rawBody = await response.text()
        console.log('[VentasPage] confirm sale raw body:', rawBody)
        if (rawBody.trim() !== '') {
          result = JSON.parse(rawBody)
          console.log('[VentasPage] confirm sale parsed JSON:', result)
        }
      } catch (parseError) {
        console.error('[VentasPage] confirm sale JSON parse error:', parseError)
        result = null
      }

      if (!response.ok) {
        console.error('[VentasPage] confirm sale error response:', result)
        const errorMsg = result?.error || result?.message || rawBody || 'Error desconocido en el servidor.'
        const stepInfo = result?.step ? ` (Paso: ${result.step})` : ''
        setSubmitError(`Error al procesar la venta: ${errorMsg}${stepInfo}`)
      } else {
        if (!result || typeof result.id !== 'number') {
          console.error('[VentasPage] confirm sale invalid success response:', result, 'rawBody:', rawBody)
          const fallbackError = result?.error || rawBody || 'Respuesta de éxito inválida del servidor (falta ID de venta).'
          setSubmitError(`Error al procesar la venta: ${fallbackError}`)
        } else {
          console.log('[VentasPage] confirm sale success:', result)
          setCart([])
          setSelectedProduct(null)
          setSelectedUnitId(null)
          setQuantity(1)
          await fetchData()
        }
      }
    } catch (fetchError) {
      console.error('[VentasPage] confirm sale fetch exception:', fetchError)
      setSubmitError(`Error de conexión: ${fetchError instanceof Error ? fetchError.message : 'Desconocido'}. Intenta nuevamente.`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-4">Cargando ventas y productos...</div>
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Ventas / POS</h1>
        <p className="text-sm text-gray-600">Usa este módulo para registrar ventas de accesorios y dispositivos individuales.</p>
      </div>

      {(error || submitError) && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {submitError || error}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Buscar producto</h2>
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            placeholder="Buscar por nombre, SKU o código de barras"
            className="w-full rounded-md border border-gray-300 px-3 py-2 mb-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />

          {filteredProducts.length === 0 ? (
            <div className="rounded-md bg-gray-50 p-4 text-gray-600">No se encontraron productos para la búsqueda.</div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelectProduct(product)}
                  className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm hover:border-blue-300"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">SKU: {product.sku || 'Sin SKU'}</p>
                    </div>
                    <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                      {product.product_type}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    Precio: ${product.price.toFixed(2)} · Stock: {product.current_stock}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Detalles del artículo</h2>

          {!selectedProduct ? (
            <div className="rounded-md bg-gray-50 p-4 text-gray-600">Selecciona un producto para agregar al carrito.</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="font-semibold text-gray-900">{selectedProduct.name}</p>
                <p className="text-sm text-gray-500">SKU: {selectedProduct.sku || 'Sin SKU'}</p>
                <p className="text-sm text-gray-500">Tipo: {selectedProduct.product_type}</p>
                <p className="text-sm text-gray-500">Precio: ${selectedProduct.price.toFixed(2)}</p>
              </div>

              {selectedProduct.product_type === 'accessory' ? (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Cantidad</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Buscar unidad por IMEI o serial</label>
                  <input
                    type="text"
                    value={unitSearch}
                    onChange={handleUnitSearchChange}
                    onKeyDown={handleUnitSearchKeyDown}
                    placeholder="Escanea o ingresa IMEI/serial"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <label className="block text-sm font-medium text-gray-700">Unidad disponible</label>
                  {selectedProductUnits.length === 0 ? (
                    <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-600">
                      {unitSearch.trim() ? 'No se encontraron unidades con ese IMEI/serial.' : 'No hay unidades disponibles para este producto.'}
                    </div>
                  ) : (
                    <select
                      value={selectedUnitId ?? ''}
                      onChange={(event) => setSelectedUnitId(Number(event.target.value))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">Selecciona una unidad</option>
                      {selectedProductUnits.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.imei || unit.serial_number || `Unidad ${unit.id}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleAddToCart}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Agregar al carrito
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Carrito</h2>
            <p className="text-sm text-gray-500">Revisa los artículos antes de confirmar la venta.</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Total estimado</p>
            <p className="text-2xl font-bold">${cartTotal.toFixed(2)}</p>
          </div>
        </div>

        {cart.length === 0 ? (
          <div className="mt-4 rounded-md bg-gray-50 p-4 text-gray-600">El carrito está vacío.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {cart.map((item, index) => (
              <div key={`${item.product.id}-${item.unit?.id ?? 'accessory'}-${index}`} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{item.product.name}</p>
                    <p className="text-sm text-gray-500">
                      {item.product.product_type === 'device'
                        ? `Unidad: ${item.unit?.imei || item.unit?.serial_number || item.unit?.id}`
                        : `Cantidad: ${item.quantity}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCartItem(index)}
                    className="text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    Eliminar
                  </button>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  Precio unitario: ${item.product.price.toFixed(2)} · Subtotal: ${(item.product.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleConfirmSale}
            disabled={cart.length === 0 || saving}
            className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {saving ? 'Procesando venta...' : 'Confirmar venta'}
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Ventas registradas</h2>

        {sales.length === 0 ? (
          <div className="rounded-md bg-gray-50 p-4 text-gray-600">Aún no hay ventas registradas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border-b px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                  <th className="border-b px-4 py-3 text-left text-sm font-medium text-gray-700">Total</th>
                  <th className="border-b px-4 py-3 text-left text-sm font-medium text-gray-700">Método</th>
                  <th className="border-b px-4 py-3 text-left text-sm font-medium text-gray-700">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="odd:bg-white even:bg-gray-50">
                    <td className="border-b px-4 py-3 text-sm text-gray-800">{sale.id}</td>
                    <td className="border-b px-4 py-3 text-sm text-gray-800">${sale.total.toFixed(2)}</td>
                    <td className="border-b px-4 py-3 text-sm text-gray-800">{sale.payment_method || 'N/A'}</td>
                    <td className="border-b px-4 py-3 text-sm text-gray-800">{new Date(sale.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

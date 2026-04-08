"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface StockMovement {
  id: number
  product_id: number
  movement_type: string
  quantity: number
  notes: string | null
  created_at: string
  product: {
    id: number
    name: string
    sku: string | null
  }[]
  product_unit?: {
    id: number
    imei: string | null
    serial_number: string | null
  }
}

export default function HistorialPage() {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMovements = async () => {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          id,
          product_id,
          movement_type,
          quantity,
          notes,
          created_at,
          product:products(id, name, sku)
        `)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) {
        console.error('[HistorialPage] Error fetching movements:', error)
        setError('No se pudieron cargar los movimientos. Intenta nuevamente.')
        setLoading(false)
        return
      }

      // Para movimientos que involucran unidades, intentar obtener info de la unidad
      const movementsWithUnits = await Promise.all(
        (data || []).map(async (movement) => {
          const unitMatch = movement.notes?.match(/unidad ID (\d+)/)
          if (unitMatch) {
            const unitId = parseInt(unitMatch[1])
            const { data: unitData } = await supabase
              .from('product_units')
              .select('id, imei, serial_number')
              .eq('id', unitId)
              .single()

            return {
              ...movement,
              product_unit: unitData || undefined
            }
          }
          return movement
        })
      )

      setMovements(movementsWithUnits as StockMovement[])
      setLoading(false)
    }

    fetchMovements()
  }, [])

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'entry': 'Entrada',
      'sale': 'Venta',
      'adjustment': 'Ajuste',
      'return': 'Devolución'
    }
    return labels[type] || type
  }

  if (loading) {
    return <div className="p-4">Cargando movimientos...</div>
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Movimientos de Stock</h1>
        <p className="text-sm text-gray-600">Historial completo de movimientos de inventario y unidades.</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Historial de Movimientos</h2>

        {movements.length === 0 ? (
          <div className="rounded-md bg-gray-50 p-6 text-center text-gray-600">
            No hay movimientos registrados. Los movimientos aparecerán aquí cuando se realicen ingresos, ventas o ajustes de stock.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border-b px-4 py-3 text-left text-sm font-medium text-gray-700">Fecha</th>
                  <th className="border-b px-4 py-3 text-left text-sm font-medium text-gray-700">Tipo</th>
                  <th className="border-b px-4 py-3 text-left text-sm font-medium text-gray-700">Producto</th>
                  <th className="border-b px-4 py-3 text-left text-sm font-medium text-gray-700">Unidad/IMEI</th>
                  <th className="border-b px-4 py-3 text-left text-sm font-medium text-gray-700">Cantidad</th>
                  <th className="border-b px-4 py-3 text-left text-sm font-medium text-gray-700">Notas</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id} className="odd:bg-white even:bg-gray-50">
                    <td className="border-b px-4 py-3 text-sm text-gray-800">
                      {new Date(movement.created_at).toLocaleString()}
                    </td>
                    <td className="border-b px-4 py-3 text-sm text-gray-800">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        movement.movement_type === 'entry' ? 'bg-green-100 text-green-800' :
                        movement.movement_type === 'sale' ? 'bg-red-100 text-red-800' :
                        movement.movement_type === 'adjustment' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {getMovementTypeLabel(movement.movement_type)}
                      </span>
                    </td>
                    <td className="border-b px-4 py-3 text-sm text-gray-800">
                      {movement.product?.[0] ? (
                        <div>
                          <p className="font-medium">{movement.product[0].name}</p>
                          {movement.product[0].sku && (
                            <p className="text-xs text-gray-500">SKU: {movement.product[0].sku}</p>
                          )}
                        </div>
                      ) : (
                        `Producto ID ${movement.product_id}`
                      )}
                    </td>
                    <td className="border-b px-4 py-3 text-sm text-gray-800">
                      {movement.product_unit ? (
                        <div>
                          {movement.product_unit.imei && <p>IMEI: {movement.product_unit.imei}</p>}
                          {movement.product_unit.serial_number && <p>Serial: {movement.product_unit.serial_number}</p>}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="border-b px-4 py-3 text-sm text-gray-800">
                      <span className={`font-medium ${
                        movement.movement_type === 'entry' ? 'text-green-600' :
                        movement.movement_type === 'sale' ? 'text-red-600' :
                        'text-gray-800'
                      }`}>
                        {movement.movement_type === 'entry' ? '+' : movement.movement_type === 'sale' ? '-' : ''}
                        {movement.quantity}
                      </span>
                    </td>
                    <td className="border-b px-4 py-3 text-sm text-gray-800">
                      {movement.notes || '-'}
                    </td>
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

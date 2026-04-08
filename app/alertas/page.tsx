"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface ProductAlert {
  id: number
  name: string
  current_stock: number
  min_stock: number
  sku: string | null
  product_type: string
}

export default function AlertasPage() {
  const [alerts, setAlerts] = useState<ProductAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id,name,current_stock,min_stock,sku,product_type')
          .eq('is_active', true)

        if (error) {
          console.error('[AlertasPage] Error:', error)
          setAlerts([])
        } else {
          const lowStockProducts = (data as ProductAlert[])?.filter(
            (p) => p.current_stock <= p.min_stock
          ) || []
          setAlerts(lowStockProducts)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [])

  if (loading) {
    return <div className="p-4">Cargando...</div>
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Alertas de Stock</h1>

      {alerts.length === 0 ? (
        <div className="p-4 bg-green-100 rounded text-green-700 text-center">
          No hay alertas de stock bajo
        </div>
      ) : (
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b text-left bg-red-50">Producto</th>
              <th className="py-2 px-4 border-b text-left bg-red-50">SKU</th>
              <th className="py-2 px-4 border-b text-left bg-red-50">Stock Actual</th>
              <th className="py-2 px-4 border-b text-left bg-red-50">Stock Mínimo</th>
              <th className="py-2 px-4 border-b text-left bg-red-50">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr key={alert.id} className="bg-red-50 hover:bg-red-100">
                <td className="py-2 px-4 border-b font-semibold">{alert.name}</td>
                <td className="py-2 px-4 border-b">{alert.sku || '-'}</td>
                <td className="py-2 px-4 border-b text-red-600 font-bold">{alert.current_stock}</td>
                <td className="py-2 px-4 border-b">{alert.min_stock}</td>
                <td className="py-2 px-4 border-b">{alert.product_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
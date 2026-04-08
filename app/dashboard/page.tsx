"use client"

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockAlerts: 0,
    totalStockEntries: 0,
    dailySalesTotal: 0,
    totalStockValue: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [productsRes, entriesRes, salesRes] = await Promise.all([
          supabase.from('products').select('id,current_stock,min_stock,price', { count: 'exact' }).eq('is_active', true),
          supabase.from('stock_entries').select('id', { count: 'exact' }),
          supabase.from('sales').select('total').gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        ])

        let totalProducts = 0
        let lowStockAlerts = 0
        let totalStockValue = 0

        if (productsRes.data) {
          totalProducts = productsRes.count || 0
          lowStockAlerts = productsRes.data.filter((p) => p.current_stock <= p.min_stock).length
          totalStockValue = productsRes.data.reduce((sum, p) => sum + (p.price * p.current_stock), 0)
        }

        const totalStockEntries = entriesRes.count || 0
        const dailySalesTotal = salesRes.data?.reduce((sum, s) => sum + (s.total || 0), 0) || 0

        setStats({
          totalProducts,
          lowStockAlerts,
          totalStockEntries,
          dailySalesTotal,
          totalStockValue,
        })
      } catch (error) {
        console.error('[Dashboard] Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>
  }

  return (
    <div className="flex flex-col p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Total Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalProducts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Alertas Stock Bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{stats.lowStockAlerts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Ingresos Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalStockEntries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Ventas del Día</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${stats.dailySalesTotal.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Valor Total Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${stats.totalStockValue.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage
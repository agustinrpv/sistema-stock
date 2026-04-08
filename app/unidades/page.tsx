"use client"

import { type ChangeEvent, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface DeviceProduct {
  id: number
  name: string
}

interface ProductUnit {
  id: number
  product_id: number
  imei: string | null
  serial_number: string | null
  status: 'available' | 'sold' | 'reserved'
  notes: string | null
  created_at: string
  product: { id: number; name: string }[] | null
}

interface UnitFormState {
  product_id: string
  imei: string
  serial_number: string
  status: 'available' | 'sold' | 'reserved'
  notes: string
}

const initialFormState: UnitFormState = {
  product_id: '',
  imei: '',
  serial_number: '',
  status: 'available',
  notes: '',
}

export default function UnidadesPage() {
  const [units, setUnits] = useState<ProductUnit[]>([])
  const [devices, setDevices] = useState<DeviceProduct[]>([])
  const [form, setForm] = useState<UnitFormState>(initialFormState)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    const [unitsResponse, devicesResponse] = await Promise.all([
      supabase
        .from('product_units')
        .select('id, product_id, imei, serial_number, status, notes, created_at, product:products(id, name, product_type)')
        .order('created_at', { ascending: false }),
      supabase
        .from('products')
        .select('id, name')
        .eq('product_type', 'device')
        .eq('is_active', true)
        .order('name', { ascending: true }),
    ])

    if (unitsResponse.error) {
      console.error('[UnidadesPage] Error fetching units:', unitsResponse.error)
      setError('No se pudieron cargar las unidades. Intenta nuevamente.')
    } else {
      setUnits((unitsResponse.data as ProductUnit[]) ?? [])
    }

    if (devicesResponse.error) {
      console.error('[UnidadesPage] Error fetching devices:', devicesResponse.error)
      setError((prev) => prev ?? 'No se pudieron cargar los productos tipo device.')
    } else {
      setDevices((devicesResponse.data as DeviceProduct[]) ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    void fetchData()
  }, [])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // Si IMEI o serial está lleno, puede auto-enfocar al siguiente o algo, pero por ahora solo prevenir submit accidental
      event.preventDefault()
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)

    if (!form.product_id) {
      setSubmitError('Debes seleccionar un producto tipo device.')
      return
    }

    if (!form.imei.trim() && !form.serial_number.trim()) {
      setSubmitError('Debes ingresar IMEI o número de serie.')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/unidades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: Number(form.product_id),
          imei: form.imei.trim() || null,
          serial_number: form.serial_number.trim() || null,
          status: form.status,
          notes: form.notes.trim() || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('[UnidadesPage] Create unit error:', result)
        setSubmitError(result.error || 'No se pudo registrar la unidad.')
      } else {
        setForm(initialFormState)
        await fetchData()
      }
    } catch (fetchError) {
      console.error('[UnidadesPage] Submit error:', fetchError)
      setSubmitError('Error de conexión. Intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-4">Cargando unidades...</div>
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Unidades / IMEI</h1>
        <p className="text-sm text-gray-600">Registra y consulta cada unidad individual asociada a un producto tipo device.</p>
      </div>

      {(error || submitError) && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {submitError || error}
        </div>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Registrar nueva unidad</h2>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
            <select
              name="product_id"
              value={form.product_id}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Selecciona un producto device</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
            {devices.length === 0 && (
              <p className="mt-2 text-sm text-gray-500">No hay productos tipo device activos disponibles.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IMEI</label>
            <input
              type="text"
              name="imei"
              value={form.imei}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Escanea o ingresa IMEI"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número de serie</label>
            <input
              type="text"
              name="serial_number"
              value={form.serial_number}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Escanea o ingresa número de serie"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="available">available</option>
              <option value="reserved">reserved</option>
              <option value="sold">sold</option>
            </select>
          </div>

          <div className="col-span-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Notas opcionales"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || devices.length === 0}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {saving ? 'Guardando...' : 'Registrar unidad'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Unidades registradas</h2>

        {units.length === 0 ? (
          <div className="rounded-md bg-gray-50 p-6 text-center text-gray-600">
            No hay unidades registradas. Registra la primera unidad usando el formulario.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border-b px-4 py-3 text-left text-sm font-medium text-gray-700">Producto</th>
                  <th className="border-b px-4 py-3 text-left text-sm font-medium text-gray-700">IMEI</th>
                  <th className="border-b px-4 py-3 text-left text-sm font-medium text-gray-700">Serial</th>
                  <th className="border-b px-4 py-3 text-left text-sm font-medium text-gray-700">Estado</th>
                  <th className="border-b px-4 py-3 text-left text-sm font-medium text-gray-700">Notas</th>
                  <th className="border-b px-4 py-3 text-left text-sm font-medium text-gray-700">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => (
                  <tr key={unit.id} className="odd:bg-white even:bg-gray-50">
                    <td className="border-b px-4 py-3 text-sm text-gray-800">{unit.product?.[0]?.name || `ID ${unit.product_id}`}</td>
                    <td className="border-b px-4 py-3 text-sm text-gray-800">{unit.imei || '-'}</td>
                    <td className="border-b px-4 py-3 text-sm text-gray-800">{unit.serial_number || '-'}</td>
                    <td className="border-b px-4 py-3 text-sm text-gray-800 capitalize">{unit.status}</td>
                    <td className="border-b px-4 py-3 text-sm text-gray-800">{unit.notes || '-'}</td>
                    <td className="border-b px-4 py-3 text-sm text-gray-800">{new Date(unit.created_at).toLocaleDateString()}</td>
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

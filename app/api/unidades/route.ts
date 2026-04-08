import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

const ALLOWED_STATUSES = ['available', 'sold', 'reserved'] as const
type UnitStatus = (typeof ALLOWED_STATUSES)[number]

export async function GET() {
  const { data, error } = await supabase
    .from('product_units')
    .select('id, product_id, imei, serial_number, status, notes, created_at, product:products(id, name, product_type)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[API GET /unidades] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const product_id = Number(body.product_id)
    const imei = body.imei?.trim() || null
    const serial_number = body.serial_number?.trim() || null
    const status = (body.status as UnitStatus) || 'available'
    const notes = body.notes?.trim() || null

    if (!product_id || Number.isNaN(product_id)) {
      return NextResponse.json(
        { error: 'El product_id es obligatorio y debe ser numérico' },
        { status: 400 }
      )
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'El estado debe ser available, sold o reserved' },
        { status: 400 }
      )
    }

    if (!imei && !serial_number) {
      return NextResponse.json(
        { error: 'Debe ingresar IMEI o número de serie' },
        { status: 400 }
      )
    }

    // Validar que el producto existe y es de tipo device
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, product_type, name')
      .eq('id', product_id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    if (product.product_type !== 'device') {
      return NextResponse.json(
        { error: `Solo se pueden registrar unidades para productos tipo "device". "${product.name}" es de tipo "${product.product_type}"` },
        { status: 400 }
      )
    }

    const { data: insertedUnits, error: insertError } = await supabase
      .from('product_units')
      .insert([{ product_id, imei, serial_number, status, notes }])
      .select()

    if (insertError) {
      console.error('[API POST /unidades] Insert error:', insertError.message)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const createdUnit = Array.isArray(insertedUnits) ? insertedUnits[0] : insertedUnits

    // FIX: usar product_unit_id en lugar de unit_id
    const { error: movementError } = await supabase.from('stock_movements').insert([{
      product_id,
      product_unit_id: createdUnit.id,
      movement_type: 'entry',
      quantity: 1,
      previous_stock: null,
      new_stock: null,
      notes: `Alta de unidad: ${imei ? `IMEI ${imei}` : `Serial ${serial_number}`}`,
    }])

    if (movementError) {
      console.error('[API POST /unidades] Movement error:', movementError.message)
      // No falla el alta por esto
    }

    return NextResponse.json(createdUnit, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[API POST /unidades] Exception:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('[API GET /products] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      name,
      sku = null,
      barcode = null,
      description = null,
      price,
      cost,
      min_stock,
      current_stock,
      product_type,
      category_id = null,
      is_active = true,
    } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }

    if (!['accessory', 'device'].includes(product_type)) {
      return NextResponse.json(
        { error: 'El tipo debe ser "accessory" o "device"' },
        { status: 400 }
      )
    }

    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json({ error: 'El precio debe ser un número >= 0' }, { status: 400 })
    }

    if (typeof cost !== 'number' || cost < 0) {
      return NextResponse.json({ error: 'El costo debe ser un número >= 0' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('products')
      .insert([{
        name: name.trim(),
        sku: sku?.trim() || null,
        barcode: barcode?.trim() || null,
        description: description?.trim() || null,
        price,
        cost,
        min_stock: Number(min_stock) || 0,
        current_stock: Number(current_stock) || 0,
        product_type,
        category_id: category_id || null,
        is_active,
      }])
      .select()

    if (error) {
      console.error('[API POST /products] Error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[API POST /products] Exception:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
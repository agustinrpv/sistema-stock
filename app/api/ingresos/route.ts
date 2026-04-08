import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request: NextRequest) {
  try {
    const { product_id, quantity, unit_cost, supplier, reference_number, notes } = await request.json()

    if (!product_id || !quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Producto y cantidad válida requeridos' }, { status: 400 })
    }

    // Insertar en stock_entries
    const { data: entry, error: entryError } = await supabase
      .from('stock_entries')
      .insert({
        product_id,
        quantity,
        unit_cost: unit_cost || 0,
        supplier: supplier || '',
        reference_number: reference_number || '',
        notes: notes || null
      })
      .select()
      .single()

    if (entryError) {
      console.error('Error inserting stock entry:', entryError)
      return NextResponse.json({ error: 'Error al registrar ingreso' }, { status: 500 })
    }

    // Obtener stock actual del producto
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('current_stock')
      .eq('id', product_id)
      .single()

    if (productError) {
      console.error('Error fetching product:', productError)
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    const previousStock = product.current_stock
    const newStock = previousStock + quantity

    // Actualizar stock del producto
    const { error: updateError } = await supabase
      .from('products')
      .update({ current_stock: newStock })
      .eq('id', product_id)

    if (updateError) {
      console.error('Error updating product stock:', updateError)
      return NextResponse.json({ error: 'Error al actualizar stock' }, { status: 500 })
    }

    // Registrar movimiento
    const { error: movementError } = await supabase
      .from('stock_movements')
      .insert({
        product_id,
        movement_type: 'entry',
        quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        notes: `Ingreso: ${supplier || 'Sin proveedor'} - ${reference_number || 'Sin referencia'}`
      })

    if (movementError) {
      console.error('Error inserting movement:', movementError)
      // No fallar la operación por esto, pero loggear
    }

    return NextResponse.json({ success: true, entry })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function GET() {
  try {
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
      console.error('Error fetching stock entries:', error)
      return NextResponse.json({ error: 'Error al obtener ingresos' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
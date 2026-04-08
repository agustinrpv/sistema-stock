import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request: NextRequest) {
  try {
    const { product_id, new_stock, notes } = await request.json()

    if (!product_id || new_stock === undefined || new_stock < 0) {
      return NextResponse.json({ error: 'Producto y stock válido requeridos' }, { status: 400 })
    }

    // Obtener stock actual
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

    // Actualizar stock
    const { error: updateError } = await supabase
      .from('products')
      .update({ current_stock: new_stock })
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
        movement_type: 'adjustment',
        quantity: new_stock - previousStock, // Puede ser positivo o negativo
        previous_stock: previousStock,
        new_stock: new_stock,
        notes: notes || 'Ajuste manual de stock'
      })

    if (movementError) {
      console.error('Error inserting movement:', movementError)
      // No fallar por esto
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
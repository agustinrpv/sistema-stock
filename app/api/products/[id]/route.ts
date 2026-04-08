import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('[API PUT /products/[id]] params.id:', params.id)
    const productId = parseInt(params.id)
    if (isNaN(productId)) {
      console.log('[API PUT /products/[id]] Invalid product ID:', params.id)
      return NextResponse.json({ error: 'ID de producto inválido' }, { status: 400 })
    }

    const body = await request.json()
    console.log('[API PUT /products/[id]] Request body:', body)

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

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'El nombre del producto es obligatorio' },
        { status: 400 }
      )
    }

    if (!product_type || !['accessory', 'device'].includes(product_type)) {
      return NextResponse.json(
        { error: 'El tipo de producto debe ser "accessory" o "device"' },
        { status: 400 }
      )
    }

    if (price === undefined || typeof price !== 'number') {
      return NextResponse.json(
        { error: 'El precio es obligatorio y debe ser un número' },
        { status: 400 }
      )
    }

    if (cost === undefined || typeof cost !== 'number') {
      return NextResponse.json(
        { error: 'El costo es obligatorio y debe ser un número' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('products')
      .update({
        name: name.trim(),
        sku: sku ? sku.trim() : null,
        barcode: barcode ? barcode.trim() : null,
        description: description ? description.trim() : null,
        price,
        cost,
        min_stock: min_stock || 0,
        current_stock: current_stock || 0,
        product_type,
        category_id,
        is_active,
      })
      .eq('id', productId)
      .select()

    if (error) {
      console.error('[API PUT /products/[id]] Supabase error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    console.log('[API PUT /products/[id]] Product updated successfully:', data[0])
    return NextResponse.json(data[0])
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[API PUT /products/[id]] Exception:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('[API DELETE /products/[id]] params.id:', params.id)
    const productId = parseInt(params.id)
    if (isNaN(productId)) {
      console.log('[API DELETE /products/[id]] Invalid product ID:', params.id)
      return NextResponse.json({ error: 'ID de producto inválido' }, { status: 400 })
    }

    console.log('[API DELETE /products/[id]] Deleting product:', productId)

    // Soft delete: set is_active = false
    const { data, error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', productId)
      .select()

    if (error) {
      console.error('[API DELETE /products/[id]] Supabase error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    console.log('[API DELETE /products/[id]] Product soft deleted successfully:', data[0])
    return NextResponse.json({ message: 'Producto eliminado correctamente' })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[API DELETE /products/[id]] Exception:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
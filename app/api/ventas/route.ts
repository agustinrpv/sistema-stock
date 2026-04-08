import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET() {
  const { data, error } = await supabase
    .from('sales')
    .select('id,sale_number,customer_name,total,payment_method,created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[API GET /ventas] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  let step = 'init'
  try {
    console.log('[API sales] payload received')
    step = 'parse_body'
    const body = await request.json()
    console.log('[API sales] payload:', JSON.stringify(body))

    const items = Array.isArray(body.items) ? body.items : []

    step = 'validate_items'
    if (items.length === 0) {
      console.error('[API sales] carrito vacío')
      return NextResponse.json({ error: 'La venta debe contener al menos un artículo', step }, { status: 400 })
    }

    type SaleItemPayload = {
      product_id: number
      quantity: number
      unit_price: number
      product_unit_id: number | null
    }

    const validatedItems: SaleItemPayload[] = items.map((item: any) => ({
      product_id: Number(item.product_id),
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      product_unit_id: item.product_unit_id ? Number(item.product_unit_id) : null,
    }))

    if (validatedItems.some((item) => !item.product_id || item.quantity <= 0 || item.unit_price < 0)) {
      console.error('[API sales] item inválido en carrito', validatedItems)
      return NextResponse.json(
        { error: 'Los artículos deben tener product_id, cantidad mayor a 0 y precio válido', step: 'validate_items' },
        { status: 400 }
      )
    }

    const discount = body.discount === undefined ? 0 : Number(body.discount)
    if (isNaN(discount) || discount < 0) {
      console.error('[API sales] discount inválido', body.discount)
      return NextResponse.json(
        { error: 'El descuento debe ser un número válido mayor o igual a 0', step: 'validate_discount' },
        { status: 400 }
      )
    }

    const customer_name = body.customer_name ? String(body.customer_name).trim() : null
    const customer_phone = body.customer_phone ? String(body.customer_phone).trim() : null
    const payment_method = body.payment_method ? String(body.payment_method).trim() : null
    const notes = body.notes ? String(body.notes).trim() : null

    step = 'load_products'
    const productIds = Array.from(new Set(validatedItems.map((item) => item.product_id)))
    console.log('[API sales] product IDs:', productIds)

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, product_type, current_stock, name')
      .in('id', productIds)

    if (productsError) {
      console.error('[API sales] Product lookup error:', productsError.message)
      return NextResponse.json(
        { error: `Error al consultar productos: ${productsError.message}`, step, details: productsError },
        { status: 500 }
      )
    }

    if (!products || products.length !== productIds.length) {
      console.error('[API sales] producto faltante', products)
      return NextResponse.json({ error: 'Uno o más productos no existen', step: 'load_products' }, { status: 400 })
    }

    step = 'validate_stock_and_units'
    for (const item of validatedItems) {
      const product = products.find((p) => p.id === item.product_id)
      if (!product) {
        console.error('[API sales] Producto no encontrado en validación:', item.product_id)
        return NextResponse.json(
          { error: `Producto ${item.product_id} no encontrado`, step: 'validate_product_id' },
          { status: 400 }
        )
      }

      if (product.product_type === 'accessory') {
        if (product.current_stock < item.quantity) {
          console.error('[API sales] stock insuficiente:', product.id, product.current_stock, item.quantity)
          return NextResponse.json(
            { error: `Stock insuficiente para "${product.name}". Stock actual: ${product.current_stock}`, step: 'validate_stock' },
            { status: 400 }
          )
        }
      }

      if (product.product_type === 'device' && !item.product_unit_id) {
        console.error('[API sales] device sin product_unit_id:', product.id)
        return NextResponse.json(
          { error: `El dispositivo "${product.name}" requiere seleccionar una unidad específica`, step: 'validate_device_unit' },
          { status: 400 }
        )
      }
    }

    const deviceUnitIds = validatedItems
      .filter((item) => item.product_unit_id)
      .map((item) => item.product_unit_id as number)

    if (deviceUnitIds.length > 0) {
      step = 'load_unit'
      console.log('[API sales] device unit IDs:', deviceUnitIds)
      const { data: units, error: unitsError } = await supabase
        .from('product_units')
        .select('id, status')
        .in('id', deviceUnitIds)

      if (unitsError) {
        console.error('[API sales] Unit lookup error:', unitsError.message)
        return NextResponse.json(
          { error: `Error al consultar unidades: ${unitsError.message}`, step, details: unitsError },
          { status: 500 }
        )
      }

      const missingUnitId = deviceUnitIds.find((id) => !units?.some((unit) => unit.id === id))
      if (missingUnitId) {
        console.error('[API sales] unidad no encontrada:', missingUnitId)
        return NextResponse.json(
          { error: `La unidad con ID ${missingUnitId} no existe`, step: 'load_unit' },
          { status: 400 }
        )
      }

      const unavailableUnit = units?.find((unit) => unit.status !== 'available')
      if (unavailableUnit) {
        console.error('[API sales] unidad no disponible:', unavailableUnit.id, unavailableUnit.status)
        return NextResponse.json(
          { error: `La unidad con ID ${unavailableUnit.id} no está disponible (estado: ${unavailableUnit.status})`, step: 'validate_unit_status' },
          { status: 400 }
        )
      }
    }

    step = 'calculate_total'
    const subtotal = validatedItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    const total = subtotal - discount
    if (total < 0) {
      console.error('[API sales] total inválido:', total)
      return NextResponse.json(
        { error: 'El total de la venta no puede ser negativo', step: 'validate_total' },
        { status: 400 }
      )
    }

    step = 'insert_sale'
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert([
        {
          subtotal,
          discount,
          total,
          customer_name,
          customer_phone,
          payment_method,
          notes,
        },
      ])
      .select()

    if (saleError || !saleData || saleData.length === 0) {
      console.error('[API sales] sale insert error:', saleError?.message)
      return NextResponse.json(
        { error: `Error al crear venta: ${saleError?.message || 'Sin datos devueltos'}`, step: 'insert_sale', details: saleError },
        { status: 500 }
      )
    }

    const sale = saleData[0]
    console.log('[API sales] sale inserted:', sale)

    step = 'insert_sale_items'
    const saleItems = validatedItems.map((item) => ({
      sale_id: sale.id,
      product_id: item.product_id,
      product_unit_id: item.product_unit_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.quantity * item.unit_price,
    }))

    const { error: itemsError } = await supabase.from('sale_items').insert(saleItems)
    if (itemsError) {
      console.error('[API sales] sale_items insert error:', itemsError.message)
      return NextResponse.json(
        { error: `Error al insertar ítems de venta: ${itemsError.message}`, step: 'insert_sale_items', details: itemsError },
        { status: 500 }
      )
    }

    step = 'update_stock_and_units'
    for (const item of validatedItems) {
      const product = products.find((p) => p.id === item.product_id)
      if (!product) {
        console.error('[API sales] producto no encontrado en update loop:', item.product_id)
        return NextResponse.json(
          { error: `Producto ${item.product_id} no encontrado`, step: 'load_product' },
          { status: 400 }
        )
      }

      const previousStock = product.current_stock
      let newStock = previousStock

      if (product.product_type === 'accessory') {
        newStock = previousStock - item.quantity
        const { error: stockError } = await supabase
          .from('products')
          .update({ current_stock: newStock })
          .eq('id', item.product_id)

        if (stockError) {
          console.error('[API sales] update stock error:', stockError.message)
          return NextResponse.json(
            { error: `Error al actualizar stock: ${stockError.message}`, step: 'update_stock', details: stockError },
            { status: 500 }
          )
        }
      }

      if (item.product_unit_id) {
        const { error: unitUpdateError } = await supabase
          .from('product_units')
          .update({ status: 'sold' })
          .eq('id', item.product_unit_id)

        if (unitUpdateError) {
          console.error('[API sales] update unit error:', unitUpdateError.message)
          return NextResponse.json(
            { error: `Error al actualizar unidad: ${unitUpdateError.message}`, step: 'update_unit_status', details: unitUpdateError },
            { status: 500 }
          )
        }
      }

      const movementPayload: any = {
        product_id: item.product_id,
        movement_type: 'sale',
        quantity: item.quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        reference_id: sale.id,
        notes: item.product_unit_id
          ? `Venta #${sale.id} - unidad ID ${item.product_unit_id}`
          : `Venta #${sale.id}`,
      }

      if (item.product_unit_id) {
        movementPayload.product_unit_id = item.product_unit_id
      }

      const { error: movementError } = await supabase.from('stock_movements').insert([movementPayload])
      if (movementError) {
        console.error('[API sales] movement insert error:', movementError.message)
        return NextResponse.json(
          { error: `Error al registrar movimiento: ${movementError.message}`, step: item.product_unit_id ? 'insert_movement_device' : 'insert_movement_accessory', details: movementError },
          { status: 500 }
        )
      }
    }

    console.log('[API sales] Sale completed successfully:', sale.id)
    return NextResponse.json({
      success: true,
      id: sale.id,
      sale_number: sale.sale_number || `V-${sale.id}`,
      message: 'Venta registrada correctamente',
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[API sales] Exception at step:', step, 'error:', errorMessage, error)
    return NextResponse.json(
      { error: `Error interno: ${errorMessage}`, step: 'catch', details: error },
      { status: 500 }
    )
  }
}
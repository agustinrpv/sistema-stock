export interface StockItem {
  id: number
  name: string
  sku: string
  current_stock: number
  min_stock: number
  product_type: string
  is_active: boolean
}

export interface Product {
  id: number
  category_id: number | null
  name: string
  sku: string | null
  barcode: string | null
  description: string | null
  price: number
  cost: number
  min_stock: number
  current_stock: number
  product_type: 'accessory' | 'device'
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface StockEntry {
  id: number
  product_id: number
  quantity: number
  unit_cost: number
  supplier: string
  reference_number: string
  notes: string | null
  created_at: string
}

export interface StockMovement {
  id: number
  product_id: number
  unit_id: number | null
  movement_type: 'entry' | 'sale' | 'adjustment'
  quantity: number
  previous_stock: number | null
  new_stock: number | null
  notes: string | null
  created_at: string
}

export interface Movimiento {
  id: number
  fecha: string
  producto: string
  cantidad: number
  tipo: string
  comentario?: string
}

export interface Unidad {
  id: number
  imei: string
  producto: string
  estado: string
}

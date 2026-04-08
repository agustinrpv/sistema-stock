"use client"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { StockItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const StockPage = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustingProduct, setAdjustingProduct] = useState<StockItem | null>(null);
  const [newStock, setNewStock] = useState('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStockItems();
  }, []);

  const fetchStockItems = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id,name,sku,current_stock,min_stock,product_type,is_active')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching stock items:', error.message || error);
      setStockItems([]);
    } else {
      setStockItems((data as StockItem[]) ?? []);
    }
    setLoading(false);
  };

  const handleAdjustStock = async () => {
    if (!adjustingProduct || !newStock) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/stock-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: adjustingProduct.id,
          new_stock: parseInt(newStock),
          notes: adjustmentNotes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al ajustar stock');
      }

      // Reset and close modal
      setAdjustingProduct(null);
      setNewStock('');
      setAdjustmentNotes('');
      fetchStockItems(); // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  };

  const openAdjustModal = (product: StockItem) => {
    setAdjustingProduct(product);
    setNewStock(product.current_stock.toString());
    setAdjustmentNotes('');
    setError(null);
  };

  if (loading) {
    return <div className="p-4">Cargando...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Stock Management</h1>
      <table className="min-w-full bg-white border border-gray-300">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">Producto</th>
            <th className="py-2 px-4 border-b">SKU</th>
            <th className="py-2 px-4 border-b">Stock Actual</th>
            <th className="py-2 px-4 border-b">Stock Mínimo</th>
            <th className="py-2 px-4 border-b">Tipo</th>
            <th className="py-2 px-4 border-b">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {stockItems.map(item => (
            <tr key={item.id}>
              <td className="py-2 px-4 border-b">{item.name}</td>
              <td className="py-2 px-4 border-b">{item.sku}</td>
              <td className="py-2 px-4 border-b">{item.current_stock}</td>
              <td className="py-2 px-4 border-b">{item.min_stock}</td>
              <td className="py-2 px-4 border-b">{item.product_type}</td>
              <td className="py-2 px-4 border-b">
                <Button variant="outline" size="sm" onClick={() => openAdjustModal(item)}>
                  Ajustar Stock
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={!!adjustingProduct} onOpenChange={(open) => !open && setAdjustingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Stock - {adjustingProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="current_stock">Stock Actual</Label>
              <Input
                id="current_stock"
                type="number"
                value={adjustingProduct?.current_stock || 0}
                disabled
              />
            </div>
            <div>
              <Label htmlFor="new_stock">Nuevo Stock</Label>
              <Input
                id="new_stock"
                type="number"
                min="0"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="notes">Motivo del Ajuste</Label>
              <Textarea
                id="notes"
                value={adjustmentNotes}
                onChange={(e) => setAdjustmentNotes(e.target.value)}
                placeholder="Ej: Corrección de inventario, pérdida, etc."
              />
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setAdjustingProduct(null)}>
                Cancelar
              </Button>
              <Button onClick={handleAdjustStock} disabled={submitting}>
                {submitting ? 'Ajustando...' : 'Confirmar Ajuste'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockPage;
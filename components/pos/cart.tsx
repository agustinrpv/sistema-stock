import React from 'react';
import { useCart } from './cartContext'; // Assuming you have a context for managing cart state
import Button from '../ui/button';

const Cart = () => {
    const { items, total, removeItem } = useCart();

    return (
        <div className="flex flex-col bg-white shadow-md rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Carrito de Compras</h2>
            <div className="flex-grow overflow-y-auto">
                {items.length === 0 ? (
                    <p className="text-gray-500">El carrito está vacío.</p>
                ) : (
                    items.map(item => (
                        <div key={item.id} className="flex justify-between items-center mb-2">
                            <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                                <p className="text-sm text-gray-500">Cantidad: {item.quantity}</p>
                            </div>
                            <Button onClick={() => removeItem(item.id)} className="text-red-500">
                                Eliminar
                            </Button>
                        </div>
                    ))
                )}
            </div>
            <div className="mt-4">
                <h3 className="text-lg font-semibold">Total: ${total.toFixed(2)}</h3>
            </div>
        </div>
    );
};

export default Cart;
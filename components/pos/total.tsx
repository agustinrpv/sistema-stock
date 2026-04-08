import React from 'react';

interface TotalProps {
  totalAmount: number;
}

const Total: React.FC<TotalProps> = ({ totalAmount }) => {
  return (
    <div className="flex flex-col items-center justify-center p-4 border-t border-gray-300">
      <h2 className="text-xl font-semibold">Total</h2>
      <p className="text-2xl font-bold text-green-600">${totalAmount.toFixed(2)}</p>
    </div>
  );
};

export default Total;
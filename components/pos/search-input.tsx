"use client"

import { useState } from 'react';
import { Input } from '@/components/ui/input';

const SearchInput = ({ onSearch }) => {
    const [query, setQuery] = useState('');

    const handleChange = (event) => {
        setQuery(event.target.value);
        onSearch(event.target.value);
    };

    return (
        <div className="flex items-center">
            <Input
                type="text"
                placeholder="Buscar por nombre, SKU o código de barras"
                value={query}
                onChange={handleChange}
                className="w-full p-2 border rounded"
            />
        </div>
    );
};

export default SearchInput;
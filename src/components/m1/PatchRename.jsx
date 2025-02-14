import React, { useState } from 'react';
import { formatCase } from '../../utils/midi';

export function PatchRename({ patch, onRename, onCancel }) {
    const currentName = patch.split(': ')[1];
    const [newName, setNewName] = useState(currentName);

    const handleFormat = (format) => {
        setNewName(formatCase(newName, format));
    };

    const handleSave = () => {
        const trimmedName = newName.slice(0, 10);
        onRename(patch.id, trimmedName);
    };

    return (
        <div className="space-y-3">
            <div className="flex space-x-2">
                <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    maxLength={10}
                    className="flex-1 px-3 py-1 rounded border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <button
                    onClick={handleSave}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                    Save
                </button>
                <button
                    onClick={onCancel}
                    className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200"
                >
                    Cancel
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {[
                    { label: 'Title Case', format: 'title' },
                    { label: 'snake_case', format: 'snake' },
                    { label: 'kebab-case', format: 'kebab' },
                    { label: 'camelCase', format: 'camel' },
                    { label: 'PascalCase', format: 'pascal' },
                    { label: 'UPPER CASE', format: 'upper' },
                    { label: 'lower case', format: 'lower' }
                ].map(({ label, format }) => (
                    <button
                        key={format}
                        onClick={() => handleFormat(format)}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}

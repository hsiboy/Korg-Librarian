import React, { useState } from 'react';
import { PatchRename } from './PatchRename';

export function PatchDisplay({ patch, bank, onRename }) {
    const [isRenaming, setIsRenaming] = useState(false);

    const handleRename = async (id, newName) => {
        try {
            await onRename(id, newName, bank.id);
            setIsRenaming(false);
        } catch (error) {
            console.error('Failed to rename patch:', error);
            // Error handling is delegated to the parent component
        }
    };

    return (
        <div className="p-3 rounded-md border border-gray-200 bg-white hover:border-blue-200 hover:shadow-sm transition-all">
            {isRenaming ? (
                <PatchRename
                    patch={patch}
                    onRename={handleRename}
                    onCancel={() => setIsRenaming(false)}
                />
            ) : (
                <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">{patch}</span>
                    <button
                        onClick={() => setIsRenaming(true)}
                        className="px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                    >
                        Rename
                    </button>
                </div>
            )}
        </div>
    );
}

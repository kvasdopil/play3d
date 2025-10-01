import { useEffect, useState } from 'react';
import { IoClose, IoTimeOutline } from 'react-icons/io5';
import { entries } from 'idb-keyval';

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddToScene?: (item: {
        id: string;
        modelUrl: string;
        prompt?: string;
        timestamp?: number;
    }) => void;
}

export function HistoryModal({ isOpen, onClose, onAddToScene }: HistoryModalProps) {
    interface HistoryItem {
        id: string;
        modelUrl: string;
        prompt?: string;
        timestamp?: number;
    }

    const [items, setItems] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        let isCancelled = false;
        const load = async () => {
            setIsLoading(true);
            try {
                const all = await entries();
                if (isCancelled) return;
                const collected: HistoryItem[] = [];
                for (const [key, value] of all) {
                    if (value && typeof value === 'object') {
                        if (Array.isArray(value)) {
                            for (let i = 0; i < value.length; i++) {
                                const v = value[i];
                                if (v && typeof v === 'object' && 'modelUrl' in v) {
                                    const id = typeof (v as any).id === 'string' ? (v as any).id : `${String(key)}::${i}`;
                                    collected.push({
                                        id,
                                        modelUrl: (v as any).modelUrl as string,
                                        prompt: (v as any).prompt as string | undefined,
                                        timestamp: (v as any).timestamp as number | undefined,
                                    });
                                }
                            }
                        } else if ('modelUrl' in (value as any)) {
                            collected.push({
                                id: String(key),
                                modelUrl: (value as any).modelUrl as string,
                                prompt: (value as any).prompt as string | undefined,
                                timestamp: (value as any).timestamp as number | undefined,
                            });
                        }
                    }
                }
                collected.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
                setItems(collected);
            } finally {
                if (!isCancelled) setIsLoading(false);
            }
        };
        load();
        return () => {
            isCancelled = true;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 p-6 pointer-events-auto">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <IoTimeOutline size={22} className="text-gray-700" />
                        <h2 className="text-xl font-semibold text-gray-900">History</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Close history"
                    >
                        <IoClose size={24} />
                    </button>
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-auto pr-1">
                    {isLoading && (
                        <div className="py-10 text-center text-gray-500">Loading…</div>
                    )}
                    {!isLoading && items.length === 0 && (
                        <div className="py-10 text-center text-gray-500">No saved objects yet.</div>
                    )}
                    {!isLoading &&
                        items.map((obj) => (
                            <div
                                key={obj.id}
                                className="border border-gray-200 rounded-md p-3 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-900 line-clamp-3 break-words">
                                            {obj.prompt}
                                        </p>
                                        <div className="mt-2 text-xs text-gray-500">
                                            <span>{new Date(obj.timestamp).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onAddToScene?.(obj)}
                                        className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors whitespace-nowrap"
                                    >
                                        Add to scene
                                    </button>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}



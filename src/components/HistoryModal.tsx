import { useEffect, useState } from 'react';
import { IoClose, IoTimeOutline } from 'react-icons/io5';
import { listHistoryRecords } from '../services/storage';

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

export function HistoryModal({
  isOpen,
  onClose,
  onAddToScene,
}: HistoryModalProps) {
  interface HistoryItem {
    id: string;
    modelUrl: string;
    prompt?: string;
    timestamp?: number;
    imageData?: string; // base64 image data for thumbnail
  }

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const rows = await listHistoryRecords();
        if (isCancelled) return;
        const collected: HistoryItem[] = rows.map(({ key, value }) => ({
          id: key,
          modelUrl: value.modelUrl,
          prompt: value.prompt,
          timestamp: value.time,
          imageData: value.imageUrl.startsWith('data:')
            ? value.imageUrl.replace(/^data:\w+\/\w+;base64,/, '')
            : value.imageUrl,
        }));
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
            <div className="py-10 text-center text-gray-500">
              No saved objects yet.
            </div>
          )}
          {!isLoading &&
            items.map((obj) => (
              <div
                key={obj.id}
                className="border border-gray-200 rounded-md p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {obj.imageData ? (
                      <img
                        src={`data:image/png;base64,${obj.imageData}`}
                        alt="Thumbnail"
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-gray-100 border flex items-center justify-center text-xs text-gray-400">
                        N/A
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 line-clamp-2 break-words">
                        {obj.prompt}
                      </p>
                      <div className="mt-1 text-xs text-gray-500">
                        <span>
                          {obj.timestamp
                            ? new Date(obj.timestamp).toLocaleString()
                            : ''}
                        </span>
                      </div>
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

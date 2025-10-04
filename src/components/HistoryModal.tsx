import { useEffect, useRef, useState } from 'react';
import { IoClose, IoTimeOutline } from 'react-icons/io5';
import { addHistoryRecord, listHistoryRecords } from '../services/storage';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToScene?: (item: {
    id: string;
    modelUrl: string;
    prompt?: string;
    timestamp?: number;
  }) => void;
  onOpenPrompt?: (args: { prompt: string; imageData: string }) => void;
}

export function HistoryModal({
  isOpen,
  onClose,
  onAddToScene,
  onOpenPrompt,
}: HistoryModalProps) {
  interface HistoryItem {
    id: string;
    modelUrl?: string;
    prompt?: string;
    timestamp?: number;
    imageData?: string; // base64 image data for thumbnail
    provider?: 'Synexa' | 'Tripo';
    taskId?: string;
  }

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onUploadClick = () => {
    fileInputRef.current?.click();
  };

  const onFileSelected: React.ChangeEventHandler<HTMLInputElement> = async (
    e
  ) => {
    const file = e.target.files?.[0] || null;
    // Allow re-selecting the same file later
    e.currentTarget.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.glb')) {
      alert('Please select a .glb file');
      return;
    }
    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload the file
      const uploadResponse = await fetch('/api/upload/glb', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadResult = await uploadResponse.json();
      const { fileUrl, uuid } = uploadResult;

      // Filename (without extension) becomes the prompt
      const nameNoExt = file.name.replace(/\.[^/.]+$/, '');
      const prompt = nameNoExt
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const time = Date.now();
      const key = await addHistoryRecord({
        id: uuid,
        modelUrl: fileUrl,
        imageUrl: '',
        prompt,
        time,
      });

      // Prepend new item to the list
      setItems((prev) => [
        {
          id: key,
          modelUrl: fileUrl,
          prompt,
          timestamp: time,
          imageData: undefined,
        },
        ...prev,
      ]);
    } catch (err) {
      console.error('Failed to import .glb into history:', err);
      alert('Failed to import .glb');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const rows = await listHistoryRecords();
        if (isCancelled) return;
        const collected: HistoryItem[] = rows.map(({ key, value }) => {
          const img = value.imageUrl;
          const imageData =
            typeof img === 'string'
              ? img.startsWith('data:')
                ? img.replace(/^data:\w+\/[A-Za-z0-9.+-]+;base64,/, '')
                : img
              : undefined;
          return {
            id: key,
            modelUrl: value.modelUrl,
            prompt: value.prompt,
            timestamp: value.time,
            imageData,
            provider: value.provider as 'Synexa' | 'Tripo' | undefined,
            taskId: value.taskId as string | undefined,
          };
        });
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
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".glb"
              className="hidden"
              onChange={onFileSelected}
            />
            <button
              onClick={onUploadClick}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-md transition-colors"
              aria-label="Upload .glb to history"
              title="Upload .glb to history"
            >
              Upload .glb
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close history"
            >
              <IoClose size={24} />
            </button>
          </div>
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
                className="border border-gray-200 rounded-md p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => {
                  if (obj.imageData) {
                    onOpenPrompt?.({
                      prompt: obj.prompt ?? '',
                      imageData: obj.imageData,
                    });
                  }
                }}
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
                  {(obj.modelUrl ||
                    (obj.provider === 'Tripo' && obj.taskId)) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const url =
                          obj.modelUrl ||
                          (obj.provider === 'Tripo' && obj.taskId
                            ? `/api/gen/3d/tripo/${encodeURIComponent(obj.taskId)}/download`
                            : undefined);
                        if (!url) return;
                        onAddToScene?.({
                          id: obj.id,
                          modelUrl: url,
                          prompt: obj.prompt,
                          timestamp: obj.timestamp,
                        });
                      }}
                      className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors whitespace-nowrap"
                    >
                      Add to scene
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

import { IoClose } from 'react-icons/io5';
import { useEffect, useState } from 'react';
import { MdEdit } from 'react-icons/md';

interface PromptModalProps {
  isOpen: boolean;
  prompt: string;
  imageData?: string; // base64 encoded image
  isLoading?: boolean;
  error?: string;
  modelUrl?: string; // URL to 3D model
  isGenerating3D?: boolean;
  error3D?: string;
  onClose: () => void;
  onGenerate3D?: () => void;
  onUpdatePrompt?: (newPrompt: string) => void | Promise<void>;
}

export function PromptModal({
  isOpen,
  prompt,
  imageData,
  isLoading,
  error,
  modelUrl,
  isGenerating3D,
  error3D,
  onClose,
  onGenerate3D,
  onUpdatePrompt,
}: PromptModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(prompt);
  const hasChanges = editedPrompt.trim() !== prompt.trim();
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // When prompt prop changes or modal opens, sync local state if not actively editing
    if (!isEditing) {
      setEditedPrompt(prompt);
    }
  }, [prompt, isEditing]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 p-8 pointer-events-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <IoClose size={24} />
        </button>

        {/* Content */}
        <div className="pr-8 space-y-6">
          {/* Prompt editable header */}
          <div className="flex items-start gap-2">
            {!isEditing ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <p className="text-lg text-gray-800 break-words">{prompt}</p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Edit prompt"
                  title="Edit"
                >
                  <MdEdit size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  onBlur={() => {
                    if (!hasChanges) {
                      setIsEditing(false);
                    }
                  }}
                  rows={3}
                  className="flex-1 border border-gray-300 rounded-md p-2 text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={async () => {
                    if (hasChanges && onUpdatePrompt) {
                      // Immediately return to view mode
                      setIsEditing(false);
                      try {
                        setIsUpdating(true);
                        await onUpdatePrompt(editedPrompt.trim());
                      } finally {
                        setIsUpdating(false);
                      }
                    }
                  }}
                  disabled={!hasChanges || isUpdating}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    hasChanges && !isUpdating
                      ? 'text-white bg-indigo-600 hover:bg-indigo-700'
                      : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  }`}
                >
                  {isUpdating ? 'Updating…' : 'Update'}
                </button>
              </div>
            )}
          </div>
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Generated image */}
          {imageData && !isLoading && !error && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden">
                <img
                  src={`data:image/png;base64,${imageData}`}
                  alt="Generated image"
                  className="w-full h-auto"
                />
              </div>

              {/* Generate 3D button */}
              {!modelUrl && onGenerate3D && (
                <button
                  onClick={onGenerate3D}
                  disabled={isGenerating3D}
                  className="w-full px-4 py-3 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  {isGenerating3D
                    ? 'Generating 3D Model...'
                    : 'Generate 3D Model'}
                </button>
              )}

              {/* 3D generation error */}
              {error3D && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{error3D}</p>
                </div>
              )}

              {/* 3D Model preview */}
              {modelUrl && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">
                    3D Model Generated!
                  </p>
                  <a
                    href={modelUrl}
                    download="model.glb"
                    className="inline-block px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                  >
                    Download 3D Model (.glb)
                  </a>
                </div>
              )}
            </div>
          )}

          {/* (Prompt is displayed/edited in header above) */}
        </div>
      </div>
    </div>
  );
}

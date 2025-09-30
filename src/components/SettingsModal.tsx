import { useState, useEffect } from 'react';
import { IoClose } from 'react-icons/io5';
import { usePersistedState } from '../hooks/usePersistedState';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = usePersistedState<string>('gemini-api-key', '');
  const [localValue, setLocalValue] = useState(apiKey);

  // Update local value when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalValue(apiKey);
    }
  }, [isOpen, apiKey]);

  const handleSave = () => {
    setApiKey(localValue);
    onClose();
  };

  const handleCancel = () => {
    setLocalValue(apiKey);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <IoClose size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="api-key"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Gemini API Key
            </label>
            <input
              id="api-key"
              type="password"
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

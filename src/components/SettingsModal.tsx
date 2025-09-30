import { useState, useEffect } from 'react';
import { IoClose } from 'react-icons/io5';
import { usePersistedState } from '../hooks/usePersistedState';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [geminiApiKey, setGeminiApiKey] = usePersistedState<string>(
    'gemini-api-key',
    ''
  );
  const [synexaApiKey, setSynexaApiKey] = usePersistedState<string>(
    'synexa-api-key',
    ''
  );
  const [localGeminiValue, setLocalGeminiValue] = useState(geminiApiKey);
  const [localSynexaValue, setLocalSynexaValue] = useState(synexaApiKey);

  // Update local values when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalGeminiValue(geminiApiKey);
      setLocalSynexaValue(synexaApiKey);
    }
  }, [isOpen, geminiApiKey, synexaApiKey]);

  const handleSave = () => {
    setGeminiApiKey(localGeminiValue);
    setSynexaApiKey(localSynexaValue);
    onClose();
  };

  const handleCancel = () => {
    setLocalGeminiValue(geminiApiKey);
    setLocalSynexaValue(synexaApiKey);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 pointer-events-auto">
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
              htmlFor="gemini-api-key"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Gemini API Key
            </label>
            <input
              id="gemini-api-key"
              type="password"
              value={localGeminiValue}
              onChange={(e) => setLocalGeminiValue(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="synexa-api-key"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              FAL API Key (for 3D generation)
            </label>
            <input
              id="synexa-api-key"
              type="password"
              value={localSynexaValue}
              onChange={(e) => setLocalSynexaValue(e.target.value)}
              placeholder="Enter your FAL API key"
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

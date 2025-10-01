import { useEffect, useRef } from 'react';

interface PromptInputProps {
  isOpen: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function PromptInput({
  isOpen,
  value,
  onChange,
  onSubmit,
  onClose,
}: PromptInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your prompt..."
          className="w-full px-6 py-4 text-lg rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}


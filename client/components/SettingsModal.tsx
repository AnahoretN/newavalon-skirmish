import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { AVAILABLE_LANGUAGES, LANGUAGE_NAMES } from '@/locales'
import type { LanguageCode } from '@/locales/types'

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (url: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const { language, setLanguage, t } = useLanguage()
  const [serverUrl, setServerUrl] = useState(window.location.href)

  useEffect(() => {
    if (isOpen) {
      const savedUrl = localStorage.getItem('custom_ws_url') || ''
      setServerUrl(savedUrl)
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const handleSave = () => {
    localStorage.setItem('custom_ws_url', serverUrl)
    window.dispatchEvent(new Event('storage'))
    onSave(serverUrl)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-8 shadow-xl w-full max-w-xl">
        <h2 className="text-2xl font-bold mb-6">{t('settings')}</h2>

        <div className="space-y-6">
          <div>
            <label htmlFor="language-select" className="block text-sm font-medium text-gray-300 mb-1">
              {t('language')}
            </label>
            <select
              id="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="w-full bg-gray-700 border border-gray-600 text-white font-sans rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {AVAILABLE_LANGUAGES.map((code) => (
                <option key={code} value={code}>{LANGUAGE_NAMES[code]}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="server-url" className="block text-sm font-medium text-gray-300 mb-1">
              {t('serverAddress')}
            </label>
            <input
              id="server-url"
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="e.g., ws://localhost:8080 or wss://my-server.com"
              className="w-full bg-gray-700 border border-gray-600 text-white font-mono rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
        </div>

        <div className="flex justify-end mt-8 space-x-3">
          <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            {t('saveApply')}
          </button>
        </div>
      </div>
    </div>
  )
}

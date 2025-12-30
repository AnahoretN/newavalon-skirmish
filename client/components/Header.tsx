
import React, { memo, useState, useCallback, useMemo } from 'react'
import { GameMode } from '@/types'
import type { GridSize } from '@/types'
import type { ConnectionStatus } from '@/hooks/useGameState'
import { TURN_PHASES, MAX_PLAYERS } from '@/constants'
import { useLanguage } from '@/contexts/LanguageContext'
import type { TranslationResource } from '@/locales/types'

interface HeaderProps {
  gameId: string | null;
  isGameStarted: boolean;
  onStartGame: () => void;
  onResetGame: () => void;
  activeGridSize: GridSize;
  onGridSizeChange: (size: GridSize) => void;
  dummyPlayerCount: number;
  onDummyPlayerCountChange: (count: number) => void;
  realPlayerCount: number;
  connectionStatus: ConnectionStatus;
  onExitGame: () => void;
  onOpenTokensModal: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onOpenCountersModal: (event: React.MouseEvent<HTMLButtonElement>) => void;
  gameMode: GameMode;
  onGameModeChange: (mode: GameMode) => void;
  isPrivate: boolean;
  onPrivacyChange: (isPrivate: boolean) => void;
  isHost: boolean;
  onSyncGame: () => void;
  currentPhase: number;
  onNextPhase: () => void;
  onPrevPhase: () => void;
  onSetPhase: (index: number) => void;
  isAutoAbilitiesEnabled: boolean;
  onToggleAutoAbilities: (enabled: boolean) => void;
  isAutoDrawEnabled: boolean;
  onToggleAutoDraw: (enabled: boolean) => void;
  isScoringStep?: boolean; // New prop
  currentRound?: number;
  turnNumber?: number;
}

const StatusIndicator = memo<{ connectionStatus: ConnectionStatus; t: (key: keyof TranslationResource['ui']) => string }>(({ connectionStatus, t }) => {
  const config = useMemo(() => {
    switch (connectionStatus) {
    case 'Connected':
      return { color: 'bg-green-500 animate-pulse', text: t('connected') }
    case 'Disconnected':
      return { color: 'bg-red-500', text: t('disconnected') }
    default:
      return { color: 'bg-gray-500', text: t('loading') }
    }
  }, [connectionStatus, t])

  return (
    <div className="flex items-center space-x-2" title={config.text}>
      <div className={`w-3 h-3 rounded-full ${config.color} transition-colors`} />
      <span className="text-sm text-gray-400 hidden sm:block">{config.text}</span>
    </div>
  )
})

StatusIndicator.displayName = 'StatusIndicator'

const RoundTracker = memo<{
  currentRound: number;
  turnNumber: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  showTooltip: boolean;
  t: (key: keyof TranslationResource['ui']) => string;
    }>(({ currentRound, turnNumber, onMouseEnter, onMouseLeave, showTooltip, t }) => {
      const threshold = useMemo(() => (currentRound * 10) + 10, [currentRound])

      return (
        <div className="relative">
          <div
            className="flex items-center bg-gray-800 rounded-lg px-3 py-1.5 border border-gray-700 shadow-md cursor-help"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            <span className="text-yellow-500 font-bold text-sm tracking-wider">{t('round').toUpperCase()} {currentRound}</span>
            <span className="text-gray-500 mx-2">|</span>
            <span className="text-gray-300 text-xs font-mono">{t('turn').toUpperCase()} {turnNumber}</span>
          </div>

          {showTooltip && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-[100] bg-gray-900 text-white p-3 rounded-lg shadow-xl border border-gray-700 text-sm whitespace-nowrap min-w-max">
              <div className="text-center">
                <p className="font-bold text-yellow-400 mb-1 whitespace-nowrap">{t('round')} {currentRound} {t('roundVictoryCondition')}</p>
                <p className="whitespace-nowrap">{t('reach')} <span className="font-bold text-white">{threshold} {t('scorePoints')}</span> {t('toWinRound')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('checkedAtFirstPlayer')}</p>
              </div>
            </div>
          )}
        </div>
      )
    })

RoundTracker.displayName = 'RoundTracker'

const Header = memo<HeaderProps>(({
  gameId,
  isGameStarted,
  onStartGame,
  onResetGame,
  activeGridSize,
  onGridSizeChange,
  dummyPlayerCount,
  onDummyPlayerCountChange,
  realPlayerCount,
  connectionStatus,
  onExitGame,
  onOpenTokensModal,
  onOpenCountersModal,
  gameMode,
  onGameModeChange,
  isPrivate,
  onPrivacyChange,
  isHost,
  onSyncGame,
  currentPhase,
  onNextPhase,
  onPrevPhase,
  isAutoAbilitiesEnabled,
  onToggleAutoAbilities,
  isAutoDrawEnabled,
  onToggleAutoDraw,
  isScoringStep,
  currentRound = 1,
  turnNumber = 1,
}) => {
  const { t } = useLanguage()
  const dummyOptions = useMemo(() => [0, 1, 2, 3], [])
  const [showRoundTooltip, setShowRoundTooltip] = useState(false)

  const handleRoundMouseEnter = useCallback(() => {
    setShowRoundTooltip(true)
  }, [])

  const handleRoundMouseLeave = useCallback(() => {
    setShowRoundTooltip(false)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-panel-bg bg-opacity-80 backdrop-blur-sm z-50 flex items-center justify-between px-4 shadow-lg">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-indigo-400 hidden lg:block">{t('newAvalon')}</h1>
        <StatusIndicator connectionStatus={connectionStatus} t={t} />
        <div className="flex items-center space-x-3">
          {gameId && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400 hidden md:inline">ID:</span>
              <span className="font-mono bg-gray-700 px-2 py-1 rounded text-indigo-300 w-24 md:w-44 text-center truncate">{gameId}</span>
            </div>
          )}
          <label className="flex items-center space-x-1.5 cursor-pointer hidden md:flex" title={t('hiddenGameTooltip')}>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => onPrivacyChange(e.target.checked)}
              disabled={isGameStarted || !isHost}
              className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-gray-300">{t('hidden')}</span>
          </label>
          <span className="text-gray-600 hidden md:inline">|</span>
          <button
            onClick={onOpenTokensModal}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-3 rounded text-sm"
          >
            {t('tokens')}
          </button>
          <button
            onClick={onOpenCountersModal}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-3 rounded text-sm"
          >
            {t('counters')}
          </button>
        </div>
      </div>

      {isGameStarted && (
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
          <RoundTracker
            currentRound={currentRound}
            turnNumber={turnNumber}
            onMouseEnter={handleRoundMouseEnter}
            onMouseLeave={handleRoundMouseLeave}
            showTooltip={showRoundTooltip}
            t={t}
          />

          {/* Phase Controls */}
          <div className="flex items-center bg-gray-800 rounded-lg p-1 border border-gray-700 shadow-md">
            <button
              onClick={onPrevPhase}
              className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M15 6 L8 12 L15 18 Z" /></svg>
            </button>
            <div className="bg-gray-800 text-white font-bold text-sm text-center px-2 min-w-[120px] uppercase">
              {isScoringStep ? (
                <span className="text-yellow-400 animate-pulse">{t('scoring')}</span>
              ) : (
                TURN_PHASES[currentPhase]
              )}
            </div>
            <button
              onClick={onNextPhase}
              className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M9 6 L16 12 L9 18 Z" /></svg>
            </button>
          </div>
        </div>
      )}


      <div className="flex items-center space-x-3">
        {isGameStarted && (
          <div className="flex items-center space-x-2">
            {/* Auto-Abilities (AA) button */}
            <button
              onClick={() => onToggleAutoAbilities(!isAutoAbilitiesEnabled)}
              className={`w-10 h-10 font-bold rounded text-sm flex items-center justify-center transition-colors ${
                isAutoAbilitiesEnabled
                  ? 'bg-gray-600 hover:bg-gray-700 text-white border-2 border-green-500'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-400 border-2 border-gray-600'
              }`}
              title={t('autoAbilitiesTooltip')}
              aria-label={t('autoAbility')}
            >
              AA
            </button>
            {/* Auto-Draw (AD) button */}
            <button
              onClick={() => onToggleAutoDraw(!isAutoDrawEnabled)}
              className={`w-10 h-10 font-bold rounded text-sm flex items-center justify-center transition-colors ${
                isAutoDrawEnabled
                  ? 'bg-gray-600 hover:bg-gray-700 text-white border-2 border-green-500'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-400 border-2 border-gray-600'
              }`}
              title={t('autoDrawTooltip')}
              aria-label={t('autoDraw')}
            >
              AD
            </button>
          </div>
        )}

        {isGameStarted ? (
          isHost && (
            <button
              onClick={onResetGame}
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded text-sm hidden md:block"
            >
              {t('newGame')}
            </button>
          )
        ) : (
          <button
            onClick={onStartGame}
            disabled={!isHost}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-sm animate-pulse disabled:bg-gray-600 disabled:opacity-70 disabled:cursor-not-allowed disabled:animate-none"
          >
            {t('startGame')}
          </button>
        )}
        <div className="flex items-center space-x-2 hidden lg:flex">
          <label htmlFor="game-mode" className="text-sm font-medium text-gray-300">{t('mode')}:</label>
          <select
            id="game-mode"
            value={gameMode}
            onChange={(e) => onGameModeChange(e.target.value as GameMode)}
            disabled={isGameStarted || !isHost}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg block w-full p-2 disabled:opacity-70"
          >
            <option value={GameMode.FreeForAll}>{t('ffa')}</option>
            <option value={GameMode.TwoVTwo}>{t('team2v2')}</option>
            <option value={GameMode.ThreeVOne}>{t('team3v1')}</option>
          </select>
        </div>
        <div className="flex items-center space-x-2 hidden xl:flex">
          <label htmlFor="grid-size" className="text-sm font-medium text-gray-300">{t('size')}:</label>
          <select
            id="grid-size"
            value={activeGridSize}
            onChange={(e) => onGridSizeChange(parseInt(e.target.value, 10) as GridSize)}
            disabled={isGameStarted || !isHost}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg block w-full p-2 disabled:opacity-70"
          >
            <option value="4">4x4</option>
            <option value="5">5x5</option>
            <option value="6">6x6</option>
            <option value="7">7x7</option>
          </select>
        </div>
        <div className="flex items-center space-x-2 hidden xl:flex">
          <label htmlFor="dummy-players" className="text-sm font-medium text-gray-300">{t('dummies')}:</label>
          <select
            id="dummy-players"
            value={dummyPlayerCount}
            onChange={(e) => onDummyPlayerCountChange(parseInt(e.target.value, 10))}
            disabled={isGameStarted || !isHost}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg block w-full p-2 disabled:opacity-70"
          >
            {dummyOptions.map(option => (
              <option key={option} value={option} disabled={realPlayerCount + option > MAX_PLAYERS}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-2">
          {isHost && isGameStarted && (
            <button onClick={onSyncGame} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold p-2 rounded text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          <button onClick={onExitGame} className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded text-sm ${isGameStarted ? 'bg-red-600 hover:bg-red-700' : ''}`}>
            {isGameStarted ? t('surrender') : t('exit')}
          </button>
        </div>
      </div>
    </header>
  )
})

export { Header }

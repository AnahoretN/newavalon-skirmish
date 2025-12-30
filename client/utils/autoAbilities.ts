import type { Card, GameState } from '@/types'
import { canActivateAbility as serverCanActivateAbility } from '@server/utils/autoAbilities'

// Ready status constants
export const READY_STATUS_DEPLOY = 'readyDeploy'
export const READY_STATUS_SETUP = 'readySetup'
export const READY_STATUS_COMMIT = 'readyCommit'

/**
 * Checks if a card has a specific ready status
 */
export const hasReadyStatus = (card: Card, statusType: string): boolean => {
  if (!card.statuses || card.statuses.length === 0) {
    return false
  }
  return card.statuses.some(s => s.type === statusType)
}

/**
 * Checks if a card has any ready status
 */
export const hasAnyReadyStatus = (card: Card): boolean => {
  return hasReadyStatus(card, READY_STATUS_DEPLOY) ||
         hasReadyStatus(card, READY_STATUS_SETUP) ||
         hasReadyStatus(card, READY_STATUS_COMMIT)
}

/**
 * Checks if a card's ability text contains a specific keyword
 * Case-insensitive to match "Deploy:" with "deploy:"
 */
const hasAbilityKeyword = (abilityText: string, keyword: string): boolean => {
  if (!abilityText) {
    return false
  }
  // Case-insensitive check
  const lowerAbility = abilityText.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  return lowerAbility.includes(lowerKeyword)
}

/**
 * Gets the ready status that should be used for the current phase
 * Returns null if no ready status is available for this phase
 */
export const getReadyStatusForPhase = (card: Card, phaseIndex: number): string | null => {
  const abilityText = card.ability || ''

  // Check deploy first (highest priority)
  if (hasReadyStatus(card, READY_STATUS_DEPLOY) && hasAbilityKeyword(abilityText, 'deploy:')) {
    return READY_STATUS_DEPLOY
  }

  // Then check phase-specific ready statuses
  // Setup abilities only work in Setup phase (phase 0)
  // Commit abilities only work in Commit phase (phase 2)
  // Main phase (phase 1) is for manual actions, no phase abilities
  if (phaseIndex === 0) {
    // Setup phase only
    if (hasReadyStatus(card, READY_STATUS_SETUP) && hasAbilityKeyword(abilityText, 'setup:')) {
      return READY_STATUS_SETUP
    }
  } else if (phaseIndex === 2) {
    // Commit phase
    if (hasReadyStatus(card, READY_STATUS_COMMIT) && hasAbilityKeyword(abilityText, 'commit:')) {
      return READY_STATUS_COMMIT
    }
  }

  return null
}

/**
 * Checks if a card should show visual ready highlighting based on:
 * 1. Card's owner is the active player
 * 2. Card has a ready status that matches the current phase
 * 3. Card doesn't have Stun status
 * 4. If ability requires Support, card has Support status
 *
 * Uses server-side canActivateAbility for consistent logic.
 *
 * @param card - The card to check
 * @param phaseOrGameState - Either current phase index (0-4) or full GameState
 * @param activePlayerId - ID of active player (only used if first param is phase number)
 * @returns true if card should highlight with ready effect
 */
export const hasReadyAbilityInCurrentPhase = (
  card: Card,
  phaseOrGameState: GameState | number,
  activePlayerId?: number | null
): boolean => {
  // Handle both call styles:
  // - hasReadyAbilityInCurrentPhase(card, gameState)
  // - hasReadyAbilityInCurrentPhase(card, phaseIndex, activePlayerId)
  let phaseIndex: number
  let gameState: GameState | undefined
  if (typeof phaseOrGameState === 'object') {
    phaseIndex = phaseOrGameState.currentPhase
    activePlayerId = phaseOrGameState.activePlayerId ?? undefined
    gameState = phaseOrGameState
  } else {
    phaseIndex = phaseOrGameState
  }

  // Use server-side logic which includes:
  // - Active player ownership check
  // - Stun status check
  // - Support requirement check
  // - Phase-appropriate ready status check
  return serverCanActivateAbility(card, phaseIndex, activePlayerId ?? undefined, gameState)
}

/**
 * Checks if a card can activate any ability in the current phase
 * This is the client-side version that checks ready statuses
 * @deprecated Use hasReadyAbilityInCurrentPhase instead for UI highlighting
 */
export const canActivateAbility = (card: Card, phaseIndex: number, _activePlayerId: number | undefined): boolean => {
  return getReadyStatusForPhase(card, phaseIndex) !== null
}

/**
 * Gets all available ready statuses for a card
 */
export const getAvailableReadyStatuses = (card: Card): string[] => {
  const available: string[] = []
  const abilityText = card.ability || ''

  if (hasReadyStatus(card, READY_STATUS_DEPLOY) && hasAbilityKeyword(abilityText, 'deploy:')) {
    available.push(READY_STATUS_DEPLOY)
  }
  if (hasReadyStatus(card, READY_STATUS_SETUP) && hasAbilityKeyword(abilityText, 'setup:')) {
    available.push(READY_STATUS_SETUP)
  }
  if (hasReadyStatus(card, READY_STATUS_COMMIT) && hasAbilityKeyword(abilityText, 'commit:')) {
    available.push(READY_STATUS_COMMIT)
  }

  return available
}

/**
 * Initializes ready statuses for a card entering the battlefield.
 * Only adds statuses for abilities that the card actually has.
 */
export const initializeReadyStatuses = (card: Card, ownerId: number): void => {
  if (!card.statuses) {
    card.statuses = []
  }

  const abilityText = card.ability || ''

  // Add readyDeploy only if card has deploy: ability
  if (hasAbilityKeyword(abilityText, 'deploy:')) {
    if (!card.statuses.some(s => s.type === READY_STATUS_DEPLOY)) {
      card.statuses.push({ type: READY_STATUS_DEPLOY, addedByPlayerId: ownerId })
    }
  }

  // Add readySetup only if card has setup: ability
  if (hasAbilityKeyword(abilityText, 'setup:')) {
    if (!card.statuses.some(s => s.type === READY_STATUS_SETUP)) {
      card.statuses.push({ type: READY_STATUS_SETUP, addedByPlayerId: ownerId })
    }
  }

  // Add readyCommit only if card has commit: ability
  if (hasAbilityKeyword(abilityText, 'commit:')) {
    if (!card.statuses.some(s => s.type === READY_STATUS_COMMIT)) {
      card.statuses.push({ type: READY_STATUS_COMMIT, addedByPlayerId: ownerId })
    }
  }
}

/**
 * Removes all ready statuses from a card (when leaving battlefield)
 */
export const removeAllReadyStatuses = (card: Card): void => {
  if (!card.statuses) {return}
  card.statuses = card.statuses.filter(s =>
    s.type !== READY_STATUS_DEPLOY &&
    s.type !== READY_STATUS_SETUP &&
    s.type !== READY_STATUS_COMMIT
  )
}

/**
 * Resets phase-specific ready statuses (readySetup, readyCommit) for a player's cards at turn start.
 * Does NOT reset readyDeploy (only once per game when entering battlefield).
 */
export const resetPhaseReadyStatuses = (card: Card, ownerId: number): void => {
  if (!card.statuses) {
    card.statuses = []
  }

  const abilityText = card.ability || ''

  // Add readySetup only if card has setup: ability
  if (hasAbilityKeyword(abilityText, 'setup:')) {
    if (!card.statuses.some(s => s.type === READY_STATUS_SETUP)) {
      card.statuses.push({ type: READY_STATUS_SETUP, addedByPlayerId: ownerId })
    }
  }

  // Add readyCommit only if card has commit: ability
  if (hasAbilityKeyword(abilityText, 'commit:')) {
    if (!card.statuses.some(s => s.type === READY_STATUS_COMMIT)) {
      card.statuses.push({ type: READY_STATUS_COMMIT, addedByPlayerId: ownerId })
    }
  }
}

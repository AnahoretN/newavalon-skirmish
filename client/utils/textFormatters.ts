/**
 * @file Centralized text formatting utilities for card abilities.
 */

import React from 'react'
import type { AbilityKeywordTranslations } from '@/locales/types'

/**
 * Parses a single line of ability text for keywords and applies styling.
 * This function is case-insensitive.
 * @param {string} line - A single line of text.
 * @param {AbilityKeywordTranslations} keywords - Translated keywords for highlighting
 * @returns {React.ReactNodeArray} An array of React nodes with formatted text.
 */
const formatLine = (line: string, keywords: AbilityKeywordTranslations): (React.ReactNode | string | null)[] => {
  // Extract English base keywords for matching (we match English but display translated)
  const baseKeywords = {
    // Keywords are formatted: one group bold, another group italic, matching is case-insensitive.
    // All lowercase since matching is case-insensitive
    bold: ['deploy', 'setup', 'commit', 'support', 'pass', 'pas'],
    italic: ['threat', 'aim', 'exploit', 'stun', 'shield',
      'gain', 'point', 'points', 'reveal', 'move', 'draw', 'push', 'sacrifice', 'discard'],
  }

  // Split the line by common delimiters while keeping them.
  const parts = line.split(/(\s+|[.,:⇒()])/)

  return parts.map((part, index) => {
    if (!part) {
      return null
    }

    // Clean the part for keyword matching (remove punctuation, convert to lowercase).
    const cleanedPartLower = part.replace(/[.,:()]/g, '').toLowerCase()

    // Check if this part matches any keyword
    const matchedBoldKeyword = baseKeywords.bold.find(k => k.toLowerCase() === cleanedPartLower)
    const matchedItalicKeyword = baseKeywords.italic.find(k => k.toLowerCase() === cleanedPartLower)

    if (matchedBoldKeyword) {
      // Use translated keyword if available, otherwise use original part
      const translatedText = keywords[matchedBoldKeyword as keyof AbilityKeywordTranslations] || part
      return React.createElement('strong', { key: index, className: 'text-white' }, translatedText)
    }
    if (matchedItalicKeyword) {
      // Use translated keyword if available, otherwise use original part
      const translatedText = keywords[matchedItalicKeyword as keyof AbilityKeywordTranslations] || part
      return React.createElement('em', { key: index, className: 'text-white italic font-semibold' }, translatedText)
    }

    return part
  })
}


/**
 * Parses and formats a card's entire ability text, supporting keywords and newlines.
 * This is the main export to be used by components.
 * @param {string} ability - The raw ability string from card data.
 * @param {AbilityKeywordTranslations} keywords - Translated keywords for highlighting
 * @returns {React.ReactNode} A React node with fully formatted text.
 */
export const formatAbilityText = (
  ability: string,
  keywords: AbilityKeywordTranslations
): React.ReactNode => {
  if (!ability) {
    return ''
  }

  // FIX: Replaced JSX syntax with React.createElement calls to make the function valid in a .ts file.
  return ability.split('\n').map((line, i) => {
    const children: React.ReactNode[] = []
    if (i > 0) {
      children.push(React.createElement('br', { key: `br-${i}` }))
    }
    children.push(...formatLine(line, keywords))

    // Use React.createElement for Fragment, spreading the children array as arguments.
    // filter(Boolean) will remove any nulls returned from formatLine.
    return React.createElement(React.Fragment, { key: i }, ...children.filter(Boolean))
  })
}

/**
 * Legacy version that uses English keywords (for backward compatibility)
 * @deprecated Use formatAbilityText with keywords parameter instead
 */
export const formatAbilityTextLegacy = (ability: string): React.ReactNode => {
  const englishKeywords: AbilityKeywordTranslations = {
    deploy: 'Deploy',
    setup: 'Setup',
    commit: 'Commit',
    support: 'Support',
    threat: 'Threat',
    pass: 'Pass',
    aim: 'Aim',
    exploit: 'Exploit',
    stun: 'Stun',
    shield: 'Shield',
    gain: 'Gain',
    point: 'Point',
    points: 'Points',
    reveal: 'Reveal',
    move: 'Move',
    draw: 'Draw',
    push: 'Push',
    sacrifice: 'Sacrifice',
    discard: 'Discard',
  }
  return formatAbilityText(ability, englishKeywords)
}

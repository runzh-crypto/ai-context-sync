/**
 * AI Tool Handler Architecture
 * 
 * Simplified to use a single universal handler that works purely based on
 * configuration from ai-context-sync.config.json. No hard-coded tool-specific logic.
 */

export { BaseTargetHandler } from './base-target-handler';
export { TargetManager } from './target-manager';

// Universal Handler - works for all AI tools based on config
export { UniversalHandler } from './universal-handler';

// Re-export types for convenience
export type { ITargetHandler, AIToolType, TargetConfig } from '../../types';
/**
 * AI Tool Handler Base Architecture
 * 
 * This module provides the foundation for handling different AI tools
 * in the AiSync system. It includes:
 * 
 * - BaseTargetHandler: Abstract base class for all target handlers
 * - TargetManager: Registry and manager for different handlers
 * - ITargetHandler: Interface that all handlers must implement
 */

export { BaseTargetHandler } from './base-target-handler';
export { TargetManager } from './target-manager';

// Re-export types for convenience
export type { ITargetHandler, AIToolType, TargetConfig } from '../../types';
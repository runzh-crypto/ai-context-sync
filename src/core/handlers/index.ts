/**
 * AI Tool Handler Base Architecture
 * 
 * This module provides the foundation for handling different AI tools
 * in the AiSync system. It includes:
 * 
 * - BaseTargetHandler: Abstract base class for all target handlers
 * - TargetManager: Registry and manager for different handlers
 * - ITargetHandler: Interface that all handlers must implement
 * - Specific handlers for each AI tool (Kiro, Cursor, Claude Code, Gemini CLI)
 */

export { BaseTargetHandler } from './base-target-handler';
export { TargetManager } from './target-manager';

// AI Tool Specific Handlers
export { KiroHandler } from './kiro-handler';
export { CursorHandler } from './cursor-handler';
export { ClaudeCodeHandler } from './claudecode-handler';
export { GeminiCLIHandler } from './gemini-cli-handler';

// Re-export types for convenience
export type { ITargetHandler, AIToolType, TargetConfig } from '../../types';
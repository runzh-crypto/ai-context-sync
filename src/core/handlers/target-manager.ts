import { ITargetHandler, AIToolType, TargetConfig, SyncResult } from '../../types';

/**
 * Manager class for handling different AI tool target handlers
 * Implements the registry pattern for managing handlers
 */
export class TargetManager {
  private handlers: Map<AIToolType, ITargetHandler> = new Map();
  private static instance: TargetManager;

  /**
   * Get singleton instance of TargetManager
   */
  static getInstance(): TargetManager {
    if (!TargetManager.instance) {
      TargetManager.instance = new TargetManager();
    }
    return TargetManager.instance;
  }

  /**
   * Register a handler for AI tool types
   * Universal handlers are stored with a special key
   */
  register(handler: ITargetHandler): void {
    // Check if this is a universal handler (can handle any type)
    if (this.isUniversalHandler(handler)) {
      this.handlers.set('*', handler);
    } else {
      // For specific handlers, we would need them to declare their supported types
      // This is a placeholder for future specific handlers
      throw new Error('Specific handlers must implement type declaration');
    }
  }

  /**
   * Get handler for a specific AI tool type
   */
  getHandler(type: AIToolType): ITargetHandler | undefined {
    // First check for specific handler
    const specificHandler = this.handlers.get(type);
    if (specificHandler) {
      return specificHandler;
    }
    
    // Fall back to universal handler
    const universalHandler = this.handlers.get('*');
    if (universalHandler && universalHandler.canHandle(type)) {
      return universalHandler;
    }
    
    return undefined;
  }

  /**
   * Get all registered handlers
   */
  getAllHandlers(): ITargetHandler[] {
    return Array.from(new Set(this.handlers.values()));
  }

  /**
   * Unregister handler for a specific AI tool type
   */
  unregister(type: AIToolType): boolean {
    return this.handlers.delete(type);
  }

  /**
   * Check if a handler is registered for the given type
   */
  hasHandler(type: AIToolType): boolean {
    // Check for specific handler first
    if (this.handlers.has(type)) {
      return true;
    }
    
    // Check if universal handler can handle this type
    const universalHandler = this.handlers.get('*');
    return universalHandler ? universalHandler.canHandle(type) : false;
  }

  /**
   * Check if a handler is universal (can handle any AI tool type)
   */
  private isUniversalHandler(handler: ITargetHandler): boolean {
    // Test with a few different types to see if it's universal
    const testTypes = ['test-type-1', 'test-type-2', 'unknown-ai-tool'];
    return testTypes.every(type => handler.canHandle(type));
  }

  /**
   * Get all supported AI tool types
   */
  getSupportedTypes(handler?: ITargetHandler): AIToolType[] {
    if (handler) {
      if (this.isUniversalHandler(handler)) {
        return ['*']; // Indicates universal support
      }
      // For specific handlers, they would need to declare their types
      return [];
    }
    
    // Return all types that have registered handlers
    return Array.from(this.handlers.keys());
  }

  /**
   * Sync a source file to a target using the appropriate handler
   */
  async sync(source: string, target: TargetConfig): Promise<SyncResult> {
    const handler = this.getHandler(target.type);
    
    if (!handler) {
      return {
        success: false,
        message: `No handler registered for AI tool type: ${target.type}`,
        files: [],
        errors: [`Unsupported target type: ${target.type}`],
        timestamp: new Date(),
        duration: 0
      };
    }

    try {
      return await handler.sync(source, target);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Handler failed to sync ${source} to ${target.name}`,
        files: [],
        errors: [errorMessage],
        timestamp: new Date(),
        duration: 0
      };
    }
  }

  /**
   * Sync multiple sources to multiple targets
   */
  async syncMultiple(sources: string[], targets: TargetConfig[]): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    
    for (const source of sources) {
      for (const target of targets) {
        if (!target.enabled && target.enabled !== undefined) {
          // Skip disabled targets
          continue;
        }
        
        const result = await this.sync(source, target);
        results.push(result);
      }
    }
    
    return results;
  }

  /**
   * Validate all targets have registered handlers
   */
  validateTargets(targets: TargetConfig[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const target of targets) {
      if (!this.hasHandler(target.type)) {
        errors.push(`No handler registered for target type: ${target.type} (${target.name})`);
      } else {
        const handler = this.getHandler(target.type)!;
        if (!handler.validate(target)) {
          errors.push(`Invalid configuration for target: ${target.name}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Clear all registered handlers
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Get statistics about registered handlers
   */
  getStats(): {
    totalHandlers: number;
    supportedTypes: AIToolType[];
    handlersByType: Record<string, string>;
  } {
    const handlersByType: Record<string, string> = {};
    
    for (const [type, handler] of this.handlers.entries()) {
      handlersByType[type] = handler.constructor.name;
    }
    
    return {
      totalHandlers: this.getAllHandlers().length,
      supportedTypes: this.getSupportedTypes(),
      handlersByType
    };
  }
}
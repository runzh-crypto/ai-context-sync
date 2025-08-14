import { BaseTargetHandler } from './base-target-handler';
import { AIToolType, TargetConfig } from '../../types';
import * as path from 'path';

/**
 * Universal Handler - handles all AI tool types based purely on config mapping
 * No hard-coded file names, directories, or tool-specific logic
 */
export class UniversalHandler extends BaseTargetHandler {
  /**
   * Can handle any AI tool type - configuration drives everything
   */
  canHandle(type: AIToolType): boolean {
    return true; // Universal handler works for all types
  }

  /**
   * Get the target path based purely on config mapping
   * Returns the destination path directly from config for easy debugging
   */
  getTargetPath(target: TargetConfig, source: string): string {
    const sourceFileName = path.basename(source);
    
    // Find matching mapping in config
    if (target.mapping) {
      for (const mapping of target.mapping) {
        if (this.matchesSourcePattern(source, mapping.source)) {
          // Return destination path directly from config
          return mapping.destination;
        }
      }
    }
    
    // If no mapping found, this is a configuration error
    throw new Error(
      `No mapping found for source file: ${sourceFileName} in target: ${target.name}. ` +
      `Please add a mapping in ai-context-sync.config.json for this file.`
    );
  }

  /**
   * Transform content based purely on config mapping transformations
   */
  transform(content: string, target: TargetConfig, source?: string): string {
    // Only apply transformations specified in config
    if (target.mapping && source) {
      for (const mapping of target.mapping) {
        if (this.matchesSourcePattern(source, mapping.source) && mapping.transform) {
          content = this.applyTransformRules(content, mapping.transform);
        }
      }
    }
    
    return content;
  }

  /**
   * Basic validation - no tool-specific requirements
   */
  protected validateSpecific(target: TargetConfig): boolean {
    // Require mapping with valid source and destination
    if (!target.mapping || target.mapping.length === 0) {
      return false;
    }
    
    for (const mapping of target.mapping) {
      if (!mapping.source || !mapping.destination) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if source matches a pattern (supports simple wildcards)
   */
  private matchesSourcePattern(source: string, pattern: string): boolean {
    const sourceFileName = path.basename(source);
    
    // Simple pattern matching with wildcard support
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(sourceFileName);
    }
    
    // Exact match
    return sourceFileName === pattern || source.endsWith(pattern);
  }

  /**
   * Apply transformation rules from config
   */
  private applyTransformRules(content: string, transformRules: any[]): string {
    for (const rule of transformRules) {
      switch (rule.type) {
        case 'replace':
          if (rule.pattern && rule.replacement !== undefined) {
            const regex = new RegExp(rule.pattern, 'g');
            content = content.replace(regex, rule.replacement);
          }
          break;
        case 'prepend':
          if (rule.replacement) {
            content = rule.replacement + content;
          }
          break;
        case 'append':
          if (rule.replacement) {
            content = content + rule.replacement;
          }
          break;
      }
    }
    
    return content;
  }
}
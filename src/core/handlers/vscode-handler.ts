import { BaseTargetHandler } from './base-target-handler';
import { AIToolType, TargetConfig, FileMapping } from '../../types';
import * as path from 'path';

/**
 * Handler for VSCode AI extensions
 * Manages synchronization to .vscode/ directory
 */
export class VSCodeHandler extends BaseTargetHandler {
  /**
   * Check if this handler can handle VSCode AI tool type
   */
  canHandle(type: AIToolType): boolean {
    return type === AIToolType.VSCODE;
  }

  /**
   * Get the target path for a source file in VSCode structure
   */
  getTargetPath(target: TargetConfig, source: string): string {
    const sourceFileName = path.basename(source);
    const sourceExt = path.extname(source);
    
    // Handle custom file mappings if specified
    if (target.mapping) {
      for (const mapping of target.mapping) {
        if (this.matchesSourcePattern(source, mapping.source)) {
          return path.join(target.path, mapping.destination);
        }
      }
    }
    
    // Default: place markdown files directly in .vscode directory
    if (sourceExt === '.md') {
      return path.join(target.path, sourceFileName);
    }
    
    // Default: place other files in root of target path
    return path.join(target.path, sourceFileName);
  }

  /**
   * Transform content for VSCode-specific requirements
   */
  transform(content: string, target: TargetConfig): string {
    const isJsonContent = this.isJsonContent(content);
    
    // For VSCode, we generally don't need special transformations
    // Just apply custom transformations if specified
    if (target.mapping) {
      for (const mapping of target.mapping) {
        if (mapping.transform) {
          content = this.applyTransformRules(content, mapping.transform);
        }
      }
    }
    
    // Add VSCode-specific header for markdown files
    if (!isJsonContent && !content.includes('# VSCode')) {
      const vscodeHeader = `# VSCode AI Extension Rules

This file contains rules and guidelines for VSCode AI extensions.

---

`;
      content = vscodeHeader + content;
    }
    
    return content;
  }

  /**
   * Validate VSCode-specific target configuration
   */
  protected validateSpecific(target: TargetConfig): boolean {
    // Ensure target path is specified
    if (!target.path) {
      return false;
    }
    
    // Validate custom mappings if present
    if (target.mapping) {
      for (const mapping of target.mapping) {
        if (!mapping.source || !mapping.destination) {
          return false;
        }
        
        // Validate VSCode-specific paths
        if (!this.isValidVSCodePath(mapping.destination)) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Check if source matches a pattern
   */
  private matchesSourcePattern(source: string, pattern: string): boolean {
    const sourceFileName = path.basename(source);
    
    // Simple pattern matching - can be enhanced with glob patterns
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(sourceFileName);
    }
    
    return sourceFileName === pattern || source.endsWith(pattern);
  }

  /**
   * Check if content is JSON
   */
  private isJsonContent(content: string): boolean {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Apply transformation rules to content
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
        // Custom transformations can be added here
      }
    }
    
    return content;
  }

  /**
   * Validate if a path is valid for VSCode structure
   */
  private isValidVSCodePath(destinationPath: string): boolean {
    // VSCode expects files in .vscode directory - accept both relative and absolute paths
    const validVSCodePaths = [
      'settings/',
      'extensions/',
      '.vscode/',
      '.vscode/settings/',
      '.vscode/extensions/'
    ];
    
    return validVSCodePaths.some(validPath => 
      destinationPath.includes(validPath) || destinationPath.startsWith(validPath)
    ) || destinationPath.endsWith('.md') || destinationPath.endsWith('.json');
  }
}
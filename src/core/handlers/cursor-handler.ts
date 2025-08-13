import { BaseTargetHandler } from './base-target-handler';
import { AIToolType, TargetConfig, FileMapping } from '../../types';
import * as path from 'path';

/**
 * Handler for Cursor AI IDE
 * Manages synchronization to .cursor/ directory and Cursor-specific MCP configuration
 */
export class CursorHandler extends BaseTargetHandler {
  /**
   * Check if this handler can handle Cursor AI tool type
   */
  canHandle(type: AIToolType): boolean {
    return type === AIToolType.CURSOR;
  }

  /**
   * Get the target path for a source file in Cursor structure
   */
  getTargetPath(target: TargetConfig, source: string): string {
    const sourceFileName = path.basename(source);
    const sourceExt = path.extname(source);
    
    // Handle custom file mappings first (highest priority)
    if (target.mapping) {
      for (const mapping of target.mapping) {
        if (this.matchesSourcePattern(source, mapping.source)) {
          return path.join(target.path, mapping.destination);
        }
      }
    }
    
    // Handle MCP configuration files - Cursor uses different location
    if (this.isMcpConfigFile(source)) {
      return path.join(target.path, 'mcp.json');
    }
    
    // Handle rules files - place in cursor directory
    if (this.isRulesFile(source)) {
      // Convert global_rules.md to cursor-rules.md for clarity
      const targetFileName = sourceFileName === 'global_rules.md' ? 'cursor-rules.md' : sourceFileName;
      return path.join(target.path, targetFileName);
    }
    
    // Default: place markdown files in cursor directory
    if (sourceExt === '.md') {
      return path.join(target.path, sourceFileName);
    }
    
    // Default: place other files in root of target path
    return path.join(target.path, sourceFileName);
  }

  /**
   * Transform content for Cursor-specific requirements
   */
  transform(content: string, target: TargetConfig): string {
    const isJsonContent = this.isJsonContent(content);
    
    // Transform MCP configuration for Cursor format
    if (isJsonContent && this.looksLikeMcpConfig(content)) {
      return this.transformMcpConfig(content);
    }
    
    // Transform rules files for Cursor format (markdown content)
    if (!isJsonContent) {
      return this.transformRulesContent(content);
    }
    
    // Apply custom transformations if specified
    if (target.mapping) {
      for (const mapping of target.mapping) {
        if (mapping.transform) {
          content = this.applyTransformRules(content, mapping.transform);
        }
      }
    }
    
    return content;
  }

  /**
   * Validate Cursor-specific target configuration
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
        
        // Validate Cursor-specific paths
        if (!this.isValidCursorPath(mapping.destination)) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Check if source file is an MCP configuration file
   */
  private isMcpConfigFile(source: string): boolean {
    const fileName = path.basename(source).toLowerCase();
    return fileName === 'mcp.json' || fileName === 'global_mcp.json';
  }

  /**
   * Check if source file is a rules file
   */
  private isRulesFile(source: string): boolean {
    const fileName = path.basename(source).toLowerCase();
    return fileName.includes('rules') && path.extname(source) === '.md';
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
   * Transform MCP configuration for Cursor format
   */
  private transformMcpConfig(content: string): string {
    try {
      const config = JSON.parse(content);
      
      // Cursor may have different MCP configuration structure
      // Adapt the configuration to Cursor's expected format
      const cursorMcpConfig = {
        // Cursor might expect 'servers' instead of 'mcpServers'
        servers: config.mcpServers || config.servers || {},
        ...config
      };
      
      // Remove Kiro-specific fields that Cursor doesn't use
      delete cursorMcpConfig.mcpServers;
      
      // Ensure Cursor-specific fields are present
      if (!cursorMcpConfig.version) {
        cursorMcpConfig.version = '1.0.0';
      }
      
      return JSON.stringify(cursorMcpConfig, null, 2);
    } catch (error) {
      // If JSON parsing fails, return original content
      console.warn('Failed to parse MCP config for Cursor transformation:', error);
      return content;
    }
  }

  /**
   * Transform rules content for Cursor format
   */
  private transformRulesContent(content: string): string {
    // Add Cursor-specific header if not present
    if (!content.includes('# Cursor') && !content.includes('# AI IDE')) {
      const cursorHeader = `# Cursor AI IDE Rules

This file contains rules and guidelines for the Cursor AI IDE.

---

`;
      content = cursorHeader + content;
    }
    
    // Convert Kiro-specific references to Cursor equivalents
    content = content.replace(/Kiro/g, 'Cursor');
    content = content.replace(/\.kiro\//g, '.cursor/');
    
    // Ensure proper formatting for Cursor
    return content;
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
   * Check if JSON content looks like MCP configuration
   */
  private looksLikeMcpConfig(content: string): boolean {
    try {
      const parsed = JSON.parse(content);
      return parsed.mcpServers || parsed.servers || parsed.tools;
    } catch {
      return false;
    }
  }

  /**
   * Validate if a path is valid for Cursor structure
   */
  private isValidCursorPath(destinationPath: string): boolean {
    // Cursor expects files in specific directories - accept both relative and absolute paths
    const validCursorPaths = [
      'rules/',
      'settings/',
      'extensions/',
      '.cursor/',
      '.cursor/rules/',
      '.cursor/settings/',
      '.cursor/extensions/'
    ];
    
    return validCursorPaths.some(validPath => 
      destinationPath.includes(validPath) || destinationPath.startsWith(validPath)
    ) || destinationPath.endsWith('.md') || destinationPath.endsWith('.json');
  }
}
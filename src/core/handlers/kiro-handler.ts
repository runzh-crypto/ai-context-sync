import { BaseTargetHandler } from './base-target-handler';
import { AIToolType, TargetConfig, FileMapping } from '../../types';
import * as path from 'path';

/**
 * Handler for Kiro AI IDE
 * Manages synchronization to .kiro/steering/ and .kiro/settings/ directories
 */
export class KiroHandler extends BaseTargetHandler {
  /**
   * Check if this handler can handle Kiro AI tool type
   */
  canHandle(type: AIToolType): boolean {
    return type === AIToolType.KIRO;
  }

  /**
   * Get the target path for a source file in Kiro structure
   */
  getTargetPath(target: TargetConfig, source: string): string {
    const sourceFileName = path.basename(source);
    const sourceExt = path.extname(source);
    
    // Handle MCP configuration files
    if (this.isMcpConfigFile(source)) {
      return path.join(target.path, 'settings', 'mcp.json');
    }
    
    // Handle rules files - place in steering directory
    if (this.isRulesFile(source)) {
      // Convert global_rules.md to rules.md for Kiro
      const targetFileName = sourceFileName === 'global_rules.md' ? 'rules.md' : sourceFileName;
      return path.join(target.path, 'steering', targetFileName);
    }
    
    // Handle custom file mappings if specified
    if (target.mapping) {
      for (const mapping of target.mapping) {
        if (this.matchesSourcePattern(source, mapping.source)) {
          return path.join(target.path, mapping.destination);
        }
      }
    }
    
    // Default: place markdown files in steering directory
    if (sourceExt === '.md') {
      return path.join(target.path, 'steering', sourceFileName);
    }
    
    // Default: place other files in root of target path
    return path.join(target.path, sourceFileName);
  }

  /**
   * Transform content for Kiro-specific requirements
   */
  transform(content: string, target: TargetConfig, source?: string): string {
    // We need to determine the source file type from the content or context
    const isJsonContent = this.isJsonContent(content);
    
    // Transform MCP configuration for Kiro format
    if (isJsonContent && this.looksLikeMcpConfig(content)) {
      return this.transformMcpConfig(content);
    }
    
    // Transform rules files for Kiro format (markdown content)
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
   * Validate Kiro-specific target configuration
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
        
        // Validate Kiro-specific paths
        if (!this.isValidKiroPath(mapping.destination)) {
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
   * Transform MCP configuration for Kiro format
   */
  private transformMcpConfig(content: string): string {
    try {
      const config = JSON.parse(content);
      
      // Kiro expects MCP configuration in a specific format
      // Ensure the structure matches Kiro's expectations
      const kiroMcpConfig = {
        mcpServers: config.mcpServers || config.servers || {},
        ...config
      };
      
      // Remove any non-Kiro specific fields
      delete kiroMcpConfig.servers;
      
      return JSON.stringify(kiroMcpConfig, null, 2);
    } catch (error) {
      // If JSON parsing fails, return original content
      console.warn('Failed to parse MCP config for Kiro transformation:', error);
      return content;
    }
  }

  /**
   * Transform rules content for Kiro format
   */
  private transformRulesContent(content: string): string {
    // Add Kiro-specific header if not present
    if (!content.includes('# Kiro') && !content.includes('# AI IDE')) {
      const kiroHeader = `# Kiro AI IDE Rules

This file contains rules and guidelines for the Kiro AI IDE.

---

`;
      content = kiroHeader + content;
    }
    
    // Ensure proper formatting for Kiro steering files
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
   * Validate if a path is valid for Kiro structure
   */
  private isValidKiroPath(destinationPath: string): boolean {
    // Kiro expects files in specific directories
    const validKiroPaths = [
      'steering/',
      'settings/',
      'hooks/',
      'specs/',
      '.kiro/steering/',
      '.kiro/settings/',
      '.kiro/hooks/',
      '.kiro/specs/'
    ];
    
    return validKiroPaths.some(validPath => 
      destinationPath.includes(validPath) || destinationPath.startsWith(validPath)
    );
  }
}
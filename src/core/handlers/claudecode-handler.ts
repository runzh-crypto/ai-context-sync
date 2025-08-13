import { BaseTargetHandler } from './base-target-handler';
import { AIToolType, TargetConfig, FileMapping } from '../../types';
import * as path from 'path';

/**
 * Handler for Claude Code AI IDE
 * Manages synchronization to .claudecode/ directory and Claude Code-specific MCP configuration
 */
export class ClaudeCodeHandler extends BaseTargetHandler {
  /**
   * Check if this handler can handle Claude Code AI tool type
   */
  canHandle(type: AIToolType): boolean {
    return type === AIToolType.CLAUDECODE;
  }

  /**
   * Get the target path for a source file in Claude Code structure
   */
  getTargetPath(target: TargetConfig, source: string): string {
    const sourceFileName = path.basename(source);
    const sourceExt = path.extname(source);
    
    // Handle MCP configuration files - Claude Code uses different location
    if (this.isMcpConfigFile(source)) {
      return path.join(target.path, 'config', 'mcp.json');
    }
    
    // Handle rules files - place in claudecode directory
    if (this.isRulesFile(source)) {
      // Convert global_rules.md to claude-rules.md for clarity
      const targetFileName = sourceFileName === 'global_rules.md' ? 'claude-rules.md' : sourceFileName;
      return path.join(target.path, 'rules', targetFileName);
    }
    
    // Handle custom file mappings if specified
    if (target.mapping) {
      for (const mapping of target.mapping) {
        if (this.matchesSourcePattern(source, mapping.source)) {
          return path.join(target.path, mapping.destination);
        }
      }
    }
    
    // Default: place markdown files in claudecode/rules directory
    if (sourceExt === '.md') {
      return path.join(target.path, 'rules', sourceFileName);
    }
    
    // Default: place other files in root of target path
    return path.join(target.path, sourceFileName);
  }

  /**
   * Transform content for Claude Code-specific requirements
   */
  transform(content: string, target: TargetConfig): string {
    const sourceFileName = path.basename(target.path);
    
    // Transform MCP configuration for Claude Code format
    if (this.isMcpConfigFile(sourceFileName)) {
      return this.transformMcpConfig(content);
    }
    
    // Transform rules files for Claude Code format
    if (this.isRulesFile(sourceFileName)) {
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
   * Validate Claude Code-specific target configuration
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
        
        // Validate Claude Code-specific paths
        if (!this.isValidClaudeCodePath(mapping.destination)) {
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
   * Transform MCP configuration for Claude Code format
   */
  private transformMcpConfig(content: string): string {
    try {
      const config = JSON.parse(content);
      
      // Claude Code may have specific MCP configuration structure
      // Adapt the configuration to Claude Code's expected format
      const claudeCodeMcpConfig = {
        // Claude Code might use 'mcpServers' similar to Kiro
        mcpServers: config.mcpServers || config.servers || {},
        // Add Claude Code specific configuration
        claudeCode: {
          version: '1.0.0',
          enableMcp: true,
          ...config.claudeCode
        },
        ...config
      };
      
      // Remove other IDE-specific fields
      delete claudeCodeMcpConfig.servers;
      
      return JSON.stringify(claudeCodeMcpConfig, null, 2);
    } catch (error) {
      // If JSON parsing fails, return original content
      console.warn('Failed to parse MCP config for Claude Code transformation:', error);
      return content;
    }
  }

  /**
   * Transform rules content for Claude Code format
   */
  private transformRulesContent(content: string): string {
    // Add Claude Code-specific header if not present
    if (!content.includes('# Claude Code') && !content.includes('# AI IDE')) {
      const claudeCodeHeader = `# Claude Code AI IDE Rules

This file contains rules and guidelines for the Claude Code AI IDE.

---

`;
      content = claudeCodeHeader + content;
    }
    
    // Convert other IDE-specific references to Claude Code equivalents
    content = content.replace(/Kiro/g, 'Claude Code');
    content = content.replace(/Cursor/g, 'Claude Code');
    content = content.replace(/\.kiro\//g, '.claudecode/');
    content = content.replace(/\.cursor\//g, '.claudecode/');
    
    // Add Claude Code-specific formatting and guidelines
    if (!content.includes('## Claude Code Specific')) {
      content += `

## Claude Code Specific Guidelines

- Use Claude Code's built-in code analysis features
- Leverage Claude's natural language understanding for better code documentation
- Follow Claude Code's project structure conventions
`;
    }
    
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
   * Validate if a path is valid for Claude Code structure
   */
  private isValidClaudeCodePath(destinationPath: string): boolean {
    // Claude Code expects files in specific directories - accept both relative and absolute paths
    const validClaudeCodePaths = [
      'rules/',
      'config/',
      'settings/',
      'extensions/',
      '.claudecode/',
      '.claudecode/rules/',
      '.claudecode/config/',
      '.claudecode/settings/',
      '.claudecode/extensions/'
    ];
    
    return validClaudeCodePaths.some(validPath => 
      destinationPath.includes(validPath) || destinationPath.startsWith(validPath)
    ) || destinationPath.endsWith('.md') || destinationPath.endsWith('.json');
  }
}
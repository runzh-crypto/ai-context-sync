import { BaseTargetHandler } from './base-target-handler';
import { AIToolType, TargetConfig, FileMapping } from '../../types';
import * as path from 'path';

/**
 * Handler for Gemini CLI AI tool
 * Manages synchronization to Gemini CLI-specific configuration directory structure
 */
export class GeminiCLIHandler extends BaseTargetHandler {
  /**
   * Check if this handler can handle Gemini CLI AI tool type
   */
  canHandle(type: AIToolType): boolean {
    return type === AIToolType.GEMINI_CLI;
  }

  /**
   * Get the target path for a source file in Gemini CLI structure
   */
  getTargetPath(target: TargetConfig, source: string): string {
    const sourceFileName = path.basename(source);
    const sourceExt = path.extname(source);
    
    // Handle MCP configuration files - Gemini CLI uses different location
    if (this.isMcpConfigFile(source)) {
      return path.join(target.path, '.gemini', 'mcp', 'config.json');
    }
    
    // Handle rules files - place in .gemini directory
    if (this.isRulesFile(source)) {
      // Convert global_rules.md to gemini-rules.md for clarity
      const targetFileName = sourceFileName === 'global_rules.md' ? 'gemini-rules.md' : sourceFileName;
      return path.join(target.path, '.gemini', 'prompts', targetFileName);
    }
    
    // Handle custom file mappings if specified
    if (target.mapping) {
      for (const mapping of target.mapping) {
        if (this.matchesSourcePattern(source, mapping.source)) {
          return path.join(target.path, mapping.destination);
        }
      }
    }
    
    // Default: place markdown files in .gemini/prompts directory
    if (sourceExt === '.md') {
      return path.join(target.path, '.gemini', 'prompts', sourceFileName);
    }
    
    // Default: place other files in root of target path
    return path.join(target.path, sourceFileName);
  }

  /**
   * Transform content for Gemini CLI-specific requirements
   */
  transform(content: string, target: TargetConfig): string {
    const isJsonContent = this.isJsonContent(content);
    
    // Transform MCP configuration for Gemini CLI format
    if (isJsonContent && this.looksLikeMcpConfig(content)) {
      return this.transformMcpConfig(content);
    }
    
    // Transform rules files for Gemini CLI format (markdown content)
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
   * Validate Gemini CLI-specific target configuration
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
        
        // Validate Gemini CLI-specific paths
        if (!this.isValidGeminiCLIPath(mapping.destination)) {
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
   * Transform MCP configuration for Gemini CLI format
   */
  private transformMcpConfig(content: string): string {
    try {
      const config = JSON.parse(content);
      
      // Gemini CLI may have specific MCP configuration structure
      // Adapt the configuration to Gemini CLI's expected format
      const geminiMcpConfig = {
        // Gemini CLI might use 'tools' instead of 'mcpServers'
        tools: this.convertServersToTools(config.mcpServers || config.servers || {}),
        // Add Gemini CLI specific configuration
        gemini: {
          version: '1.0.0',
          enableMcp: true,
          model: 'gemini-pro',
          ...config.gemini
        },
        ...config
      };
      
      // Remove other IDE-specific fields
      delete geminiMcpConfig.mcpServers;
      delete geminiMcpConfig.servers;
      
      return JSON.stringify(geminiMcpConfig, null, 2);
    } catch (error) {
      // If JSON parsing fails, return original content
      console.warn('Failed to parse MCP config for Gemini CLI transformation:', error);
      return content;
    }
  }

  /**
   * Convert MCP servers configuration to Gemini CLI tools format
   */
  private convertServersToTools(servers: any): any {
    const tools: any = {};
    
    for (const [serverName, serverConfig] of Object.entries(servers)) {
      if (typeof serverConfig === 'object' && serverConfig !== null) {
        const config = serverConfig as any;
        tools[serverName] = {
          type: 'mcp-server',
          command: config.command,
          args: config.args || [],
          env: config.env || {},
          enabled: !config.disabled,
          autoApprove: config.autoApprove || []
        };
      }
    }
    
    return tools;
  }

  /**
   * Transform rules content for Gemini CLI format
   */
  private transformRulesContent(content: string): string {
    // Add Gemini CLI-specific header if not present
    if (!content.includes('# Gemini CLI') && !content.includes('# AI IDE')) {
      const geminiHeader = `# Gemini CLI Rules

This file contains rules and guidelines for the Gemini CLI tool.

---

`;
      content = geminiHeader + content;
    }
    
    // Convert other IDE-specific references to Gemini CLI equivalents
    content = content.replace(/Kiro/g, 'Gemini CLI');
    content = content.replace(/Cursor/g, 'Gemini CLI');
    content = content.replace(/Claude Code/g, 'Gemini CLI');
    content = content.replace(/\.kiro\//g, '.gemini/');
    content = content.replace(/\.cursor\//g, '.gemini/');
    content = content.replace(/\.claudecode\//g, '.gemini/');
    
    // Add Gemini CLI-specific formatting and guidelines
    if (!content.includes('## Gemini CLI Specific')) {
      content += `

## Gemini CLI Specific Guidelines

- Use Gemini's multimodal capabilities for code analysis
- Leverage Gemini's large context window for comprehensive code understanding
- Follow Gemini CLI's command-line interface conventions
- Use appropriate model selection (gemini-pro, gemini-pro-vision) based on task requirements
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
   * Validate if a path is valid for Gemini CLI structure
   */
  private isValidGeminiCLIPath(destinationPath: string): boolean {
    // Gemini CLI expects files in specific directories
    const validGeminiPaths = [
      '.gemini/',
      '.gemini/prompts/',
      '.gemini/mcp/',
      '.gemini/config/',
      '.gemini/templates/',
      '.gemini/history/'
    ];
    
    return validGeminiPaths.some(validPath => 
      destinationPath.includes(validPath) || destinationPath.startsWith(validPath)
    );
  }
}
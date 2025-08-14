import * as fs from 'fs-extra';
import * as path from 'path';
import { 
  SyncConfig, 
  ValidationResult, 
  ConfigCreationOptions,
  SyncMode
} from '../types';
import { ConfigValidator } from './validator';

export class ConfigLoader {
  /**
   * Load configuration from file
   */
  static async load(configPath: string): Promise<SyncConfig> {
    const fullPath = path.resolve(configPath);
    
    if (!await fs.pathExists(fullPath)) {
      throw new Error(`Configuration file not found: ${fullPath}`);
    }

    const rawConfig = await fs.readJson(fullPath);
    
    // Handle legacy configuration format
    if (ConfigValidator.isLegacyConfig(rawConfig)) {
      console.warn('Legacy configuration format detected. Consider migrating to new format.');
      return ConfigValidator.convertLegacyConfig(rawConfig);
    }

    const validation = this.validate(rawConfig);
    if (!validation.valid) {
      throw new Error(`Configuration validation failed:\n${validation.errors.join('\n')}`);
    }

    return rawConfig as SyncConfig;
  }

  /**
   * Save configuration to file
   */
  static async save(config: SyncConfig, configPath: string): Promise<void> {
    const validation = this.validate(config);
    if (!validation.valid) {
      throw new Error(`Configuration validation failed:\n${validation.errors.join('\n')}`);
    }

    const fullPath = path.resolve(configPath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeJson(fullPath, config, { spaces: 2 });
  }

  /**
   * Validate configuration
   */
  static validate(config: any): ValidationResult {
    return ConfigValidator.validate(config);
  }

  /**
   * Create default configuration file
   */
  static async createDefault(outputPath: string, options: ConfigCreationOptions = {}): Promise<void> {
    const config = await this.buildDefaultConfig(options);
    await this.save(config, outputPath);
  }

  /**
   * Build default configuration based on options
   * Reads from existing ai-context-sync.config.json if available, otherwise creates minimal config
   */
  private static async buildDefaultConfig(options: ConfigCreationOptions): Promise<SyncConfig> {
    try {
      // Try to read from existing ai-context-sync.config.json as template
      const existingConfigPath = path.resolve('./ai-context-sync.config.json');
      if (await fs.pathExists(existingConfigPath)) {
        const existingConfig = await fs.readJson(existingConfigPath);
        
        // Use existing config as base, override with options if provided
        return {
          ...existingConfig,
          sources: options.sources || existingConfig.sources,
          targets: options.targets || existingConfig.targets,
          mode: options.mode || existingConfig.mode || SyncMode.INCREMENTAL,
          global: options.globalConfig ? (existingConfig.global || {
            rulesFile: 'global_rules.md',
            mcpFile: 'global_mcp.json'
          }) : existingConfig.global
        };
      }
    } catch (error) {
      console.warn('Could not read existing config, creating minimal default');
    }

    // Fallback: create minimal config that user must customize
    return {
      sources: options.sources || ['./global_rules.md', './global_mcp.json'],
      targets: options.targets || [
        {
          name: 'kiro',
          type: 'kiro',
          path: '.kiro',
          mapping: [
            {
              source: 'global_rules.md',
              destination: 'steering/global_rules.md'
            },
            {
              source: 'global_mcp.json',
              destination: 'settings/global_mcp.json'
            }
          ],
          enabled: true
        }
      ],
      mode: options.mode || SyncMode.INCREMENTAL,
      global: options.globalConfig ? {
        rulesFile: 'global_rules.md',
        mcpFile: 'global_mcp.json'
      } : undefined
    };
  }

  /**
   * Create configuration template by reading from existing ai-context-sync.config.json
   */
  static async createTemplate(templateName: string): Promise<SyncConfig> {
    try {
      // Try to read from existing ai-context-sync.config.json as template
      const templatePath = path.resolve('./ai-context-sync.config.json');
      if (await fs.pathExists(templatePath)) {
        const templateConfig = await fs.readJson(templatePath);
        
        // Modify based on template type
        switch (templateName.toLowerCase()) {
          case 'minimal':
            // Keep only first target and rules file
            return {
              ...templateConfig,
              sources: templateConfig.sources.filter((s: string) => s.includes('rules')),
              targets: templateConfig.targets.slice(0, 1).map((t: any) => ({
                ...t,
                mapping: t.mapping.filter((m: any) => m.source.includes('rules'))
              }))
            };
            
          case 'multi-tool':
            // Use all targets from template
            return templateConfig;
            
          case 'basic':
          default:
            // Use first 3 targets from template
            return {
              ...templateConfig,
              targets: templateConfig.targets.slice(0, 3)
            };
        }
      }
    } catch (error) {
      console.warn('Could not read template from ai-context-sync.config.json, using built-in defaults');
    }
    
    // Fallback to built-in default if no template file exists
    return await this.buildDefaultConfig({
      sources: ['./global_rules.md', './global_mcp.json'],
      globalConfig: templateName === 'multi-tool'
    });
  }

  /**
   * Get available template names and descriptions
   */
  static getAvailableTemplates(): { name: string; description: string }[] {
    return [
      {
        name: 'basic',
        description: 'Standard configuration with common AI tools (Kiro, Cursor, VSCode)'
      },
      {
        name: 'minimal',
        description: 'Minimal configuration with only Kiro support'
      },
      {
        name: 'multi-tool',
        description: 'Full configuration with all supported AI tools and global config'
      }
    ];
  }
}
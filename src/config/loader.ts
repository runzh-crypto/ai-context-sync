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
   * Reads from template file and applies user options
   */
  private static async buildDefaultConfig(options: ConfigCreationOptions): Promise<SyncConfig> {
    let defaultConfig: SyncConfig;

    try {
      // Read default template from file
      const templatePath = path.join(__dirname, '../templates/default.config.json');
      defaultConfig = await fs.readJson(templatePath);
    } catch (error) {
      throw new Error(`Failed to load default configuration template: ${error}`);
    }

    // Apply user options to override defaults
    const config: SyncConfig = {
      ...defaultConfig,
      sources: options.sources || defaultConfig.sources,
      targets: options.targets || defaultConfig.targets,
      mode: options.mode || defaultConfig.mode,
      global: options.globalConfig ? (defaultConfig.global || {
        rulesFile: 'global_rules.md',
        mcpFile: 'global_mcp.json'
      }) : defaultConfig.global
    };

    // If there's an existing config file, merge with it (for updates)
    try {
      const existingConfigPath = path.resolve('./ai-context-sync.config.json');
      if (await fs.pathExists(existingConfigPath)) {
        const existingConfig = await fs.readJson(existingConfigPath);
        
        // Merge existing config with template, preserving user customizations
        return {
          ...config,
          ...existingConfig,
          sources: options.sources || existingConfig.sources || config.sources,
          targets: options.targets || existingConfig.targets || config.targets,
          mode: options.mode || existingConfig.mode || config.mode,
          global: options.globalConfig ? (existingConfig.global || config.global) : existingConfig.global || config.global
        };
      }
    } catch (error) {
      // If we can't read existing config, just use the template-based config
      console.warn('Could not read existing config, using default template');
    }

    return config;
  }

  /**
   * Create configuration template by reading from template files
   */
  static async createTemplate(templateName: string): Promise<SyncConfig> {
    try {
      // Map template names to file names
      const templateFileMap: { [key: string]: string } = {
        'basic': 'default.config.json',
        'minimal': 'minimal.config.json',
        'multi-tool': 'multi-tool.config.json'
      };

      const templateFileName = templateFileMap[templateName.toLowerCase()] || 'default.config.json';
      const templatePath = path.join(__dirname, '../templates', templateFileName);
      
      if (await fs.pathExists(templatePath)) {
        return await fs.readJson(templatePath);
      } else {
        throw new Error(`Template file not found: ${templatePath}`);
      }
    } catch (error) {
      console.warn(`Could not read template '${templateName}', using default template`);
      // Fallback to default template
      const defaultTemplatePath = path.join(__dirname, '../templates/default.config.json');
      return await fs.readJson(defaultTemplatePath);
    }
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
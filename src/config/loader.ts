import * as fs from 'fs-extra';
import * as path from 'path';
import { 
  SyncConfig, 
  ValidationResult, 
  ConfigCreationOptions,
  DEFAULT_CONFIG,
  DEFAULT_TARGETS,
  AIToolType,
  TargetConfig,
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
   */
  private static async buildDefaultConfig(options: ConfigCreationOptions): Promise<SyncConfig> {
    // Use default sources (project-local global files)
    let sources = options.sources || DEFAULT_CONFIG.sources || [];

    const targets: TargetConfig[] = [];

    // Add default targets if none specified
    if (!options.targets || options.targets.length === 0) {
      // Create targets with correct source references based on actual sources
      const hasRules = sources.some(s => s.includes('rules.md'));
      const hasMcp = sources.some(s => s.includes('mcp.json'));
      
      // Kiro target
      const kiroMapping = [];
      if (hasRules) {
        kiroMapping.push({
          source: path.basename(sources.find(s => s.includes('rules.md')) || 'global_rules.md'),
          destination: "steering/rules.md"
        });
      }
      if (hasMcp) {
        kiroMapping.push({
          source: path.basename(sources.find(s => s.includes('mcp.json')) || 'global_mcp.json'),
          destination: "settings/mcp.json"
        });
      }
      
      targets.push({
        name: 'kiro',
        type: AIToolType.KIRO,
        path: '.kiro',
        mapping: kiroMapping,
        enabled: true
      } as TargetConfig);

      // Cursor target (only rules)
      if (hasRules) {
        targets.push({
          name: 'cursor',
          type: AIToolType.CURSOR,
          path: '.cursor',
          mapping: [{
            source: path.basename(sources.find(s => s.includes('rules.md')) || 'global_rules.md'),
            destination: "rules.md"
          }],
          enabled: true
        } as TargetConfig);
      }

      // VSCode target (only rules)
      if (hasRules) {
        targets.push({
          name: 'vscode',
          type: AIToolType.VSCODE,
          path: '.vscode',
          mapping: [{
            source: path.basename(sources.find(s => s.includes('rules.md')) || 'global_rules.md'),
            destination: "rules.md"
          }],
          enabled: true
        } as TargetConfig);
      }
    } else {
      targets.push(...options.targets);
    }

    const config: SyncConfig = {
      sources,
      targets,
      mode: options.mode || DEFAULT_CONFIG.mode || SyncMode.INCREMENTAL,
      watch: {
        enabled: options.enableWatch || false,
        interval: DEFAULT_CONFIG.watch?.interval || 1000,
        debounce: DEFAULT_CONFIG.watch?.debounce || 500
      }
    };

    // Add global configuration if requested
    if (options.globalConfig) {
      config.global = {
        rulesFile: 'global_rules.md',
        mcpFile: 'global_mcp.json',
        installPath: process.env.HOME || process.env.USERPROFILE || '~'
      };
    }

    return config;
  }

  /**
   * Create configuration template
   */
  static async createTemplate(templateName: string): Promise<SyncConfig> {
    switch (templateName) {
      case 'minimal':
        return {
          sources: ['./rules.md'],
          targets: [
            {
              name: 'kiro',
              type: AIToolType.KIRO,
              path: '.kiro',
              mapping: [
                {
                  source: 'rules.md',
                  destination: 'steering/rules.md'
                }
              ]
            }
          ],
          mode: SyncMode.INCREMENTAL
        };

      case 'multi-tool':
        return await this.buildDefaultConfig({
          sources: ['./global_rules.md', './global_mcp.json'],
          enableWatch: true,
          globalConfig: true
        });

      case 'watch-mode':
        return {
          sources: ['./rules.md', './mcp.json'],
          targets: [
            {
              name: 'kiro',
              type: AIToolType.KIRO,
              path: '.kiro',
              mapping: [
                {
                  source: 'rules.md',
                  destination: 'steering/rules.md'
                },
                {
                  source: 'mcp.json',
                  destination: 'settings/mcp.json'
                }
              ]
            }
          ],
          mode: SyncMode.WATCH,
          watch: {
            enabled: true,
            interval: 500,
            debounce: 200
          }
        };

      default:
        return await this.buildDefaultConfig({});
    }
  }
}
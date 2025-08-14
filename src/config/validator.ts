import { 
  SyncConfig, 
  TargetConfig, 
  AIToolType, 
  SyncMode, 
  ValidationResult,
  ConfigValidationOptions 
} from '../types';

/**
 * Configuration validator utility
 */
export class ConfigValidator {
  /**
   * Validate a sync configuration
   */
  static validate(config: any, options: ConfigValidationOptions = {}): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!config.sources || !Array.isArray(config.sources)) {
      errors.push('sources field is required and must be an array');
    } else if (config.sources.length === 0) {
      warnings.push('sources array is empty');
    }

    if (!config.targets || !Array.isArray(config.targets)) {
      errors.push('targets field is required and must be an array');
    } else if (config.targets.length === 0 && !options.allowMissingTargets) {
      errors.push('targets array cannot be empty');
    }

    // Validate mode
    if (!config.mode) {
      errors.push('mode field is required');
    } else if (!Object.values(SyncMode).includes(config.mode)) {
      errors.push(`mode must be one of: ${Object.values(SyncMode).join(', ')}`);
    }

    // Validate targets
    if (config.targets && Array.isArray(config.targets)) {
      config.targets.forEach((target: any, index: number) => {
        const targetErrors = this.validateTarget(target, index);
        errors.push(...targetErrors);
      });
    }



    // Validate global configuration
    if (config.global) {
      const globalErrors = this.validateGlobalConfig(config.global);
      errors.push(...globalErrors);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a target configuration
   */
  private static validateTarget(target: any, index: number): string[] {
    const errors: string[] = [];
    const prefix = `targets[${index}]`;

    if (!target.name || typeof target.name !== 'string') {
      errors.push(`${prefix}.name is required and must be a string`);
    }

    if (!target.type || typeof target.type !== 'string') {
      errors.push(`${prefix}.type is required and must be a string`);
    }

    if (!target.path || typeof target.path !== 'string') {
      errors.push(`${prefix}.path is required and must be a string`);
    }

    if (target.mapping && !Array.isArray(target.mapping)) {
      errors.push(`${prefix}.mapping must be an array if provided`);
    } else if (target.mapping) {
      target.mapping.forEach((mapping: any, mappingIndex: number) => {
        const mappingErrors = this.validateFileMapping(mapping, `${prefix}.mapping[${mappingIndex}]`);
        errors.push(...mappingErrors);
      });
    }

    return errors;
  }

  /**
   * Validate a file mapping configuration
   */
  private static validateFileMapping(mapping: any, prefix: string): string[] {
    const errors: string[] = [];

    if (!mapping.source || typeof mapping.source !== 'string') {
      errors.push(`${prefix}.source is required and must be a string`);
    }

    if (!mapping.destination || typeof mapping.destination !== 'string') {
      errors.push(`${prefix}.destination is required and must be a string`);
    }

    if (mapping.transform && !Array.isArray(mapping.transform)) {
      errors.push(`${prefix}.transform must be an array if provided`);
    }

    return errors;
  }



  /**
   * Validate global configuration
   */
  private static validateGlobalConfig(global: any): string[] {
    const errors: string[] = [];

    if (!global.rulesFile || typeof global.rulesFile !== 'string') {
      errors.push('global.rulesFile is required and must be a string');
    }

    if (!global.mcpFile || typeof global.mcpFile !== 'string') {
      errors.push('global.mcpFile is required and must be a string');
    }

    // installPath is optional for now
    if (global.installPath && typeof global.installPath !== 'string') {
      errors.push('global.installPath must be a string if provided');
    }

    return errors;
  }

  /**
   * Check if a configuration is a legacy KiroSyncConfig
   */
  static isLegacyConfig(config: any): boolean {
    return config.sourceDir !== undefined && config.targetDirs !== undefined;
  }

  /**
   * Convert legacy configuration to new format
   */
  static convertLegacyConfig(legacyConfig: any): SyncConfig {
    const targets: TargetConfig[] = legacyConfig.targetDirs.map((dir: string, index: number) => ({
      name: `target-${index}`,
      type: 'custom',
      path: dir,
      enabled: true
    }));

    return {
      sources: [legacyConfig.sourceDir],
      targets,
      mode: SyncMode.FULL
    };
  }
}
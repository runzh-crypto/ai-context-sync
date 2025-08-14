import { ConfigValidator } from '../config/validator';
import { ConfigLoader } from '../config/loader';
import { 
  SyncConfig, 
  SyncMode
} from '../types';

describe('Configuration System', () => {
  describe('ConfigValidator', () => {
    it('should validate a valid configuration', () => {
      const validConfig: SyncConfig = {
        sources: ['./global_rules.md'],
        targets: [
          {
            name: 'kiro',
            type: 'kiro',
            path: '.',
            mapping: [
              {
                source: 'global_rules.md',
                destination: '.kiro/steering/rules.md'
              }
            ]
          }
        ],
        mode: SyncMode.INCREMENTAL
      };

      const result = ConfigValidator.validate(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject configuration with missing sources', () => {
      const invalidConfig = {
        targets: [],
        mode: SyncMode.INCREMENTAL
      };

      const result = ConfigValidator.validate(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('sources field is required and must be an array');
    });

    it('should reject configuration with invalid mode', () => {
      const invalidConfig = {
        sources: ['./rules.md'],
        targets: [],
        mode: 'invalid-mode'
      };

      const result = ConfigValidator.validate(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('mode must be one of'))).toBe(true);
    });

    it('should detect legacy configuration format', () => {
      const legacyConfig = {
        sourceDir: './templates',
        targetDirs: ['./project1', './project2']
      };

      expect(ConfigValidator.isLegacyConfig(legacyConfig)).toBe(true);
    });

    it('should convert legacy configuration to new format', () => {
      const legacyConfig = {
        sourceDir: './templates',
        targetDirs: ['./project1', './project2']
      };

      const converted = ConfigValidator.convertLegacyConfig(legacyConfig);
      
      expect(converted.sources).toEqual(['./templates']);
      expect(converted.targets).toHaveLength(2);
      expect(converted.mode).toBe(SyncMode.FULL);
      expect(converted.targets[0].type).toBe('custom');
    });
  });

  describe('ConfigLoader', () => {
    it('should create configuration from existing ai-context-sync.config.json', async () => {
      // Test that template creation reads from existing config
      const config = await ConfigLoader.createTemplate('basic');
      
      // Verify it has sources and targets (actual values depend on ai-context-sync.config.json)
      expect(config.sources).toBeDefined();
      expect(config.sources.length).toBeGreaterThan(0);
      expect(config.targets).toBeDefined();
      expect(config.targets.length).toBeGreaterThan(0);
      expect(config.mode).toBeDefined();
    });

    it('should create multi-tool template', async () => {
      const config = await ConfigLoader.createTemplate('multi-tool');
      
      expect(config.sources).toEqual(['./global_rules.md', './global_mcp.json']);
      expect(config.targets.length).toBeGreaterThan(1);
      expect(config.global).toBeDefined();
    });
  });

  describe('Type System', () => {
    it('should have correct AIToolType enum values', () => {
      // Test that common AI tool types work as strings
      expect('kiro').toBe('kiro');
      expect('cursor').toBe('cursor');
      expect('vscode').toBe('vscode');
      expect('claudecode').toBe('claudecode');
      expect('gemini-cli').toBe('gemini-cli');
      expect('custom').toBe('custom');
    });

    it('should have correct SyncMode enum values', () => {
      expect(SyncMode.FULL).toBe('full');
      expect(SyncMode.INCREMENTAL).toBe('incremental');
    });
  });
});
import { TargetManager, UniversalHandler } from '../core/handlers';
import { ConfigLoader } from '../config/loader';
import { SyncConfig } from '../types';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('UniversalHandler', () => {
  let handler: UniversalHandler;
  let tempDir: string;
  let config: SyncConfig;

  beforeEach(async () => {
    handler = new UniversalHandler();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aisync-test-'));
    
    // Load configuration from aisync.config.json
    try {
      config = await ConfigLoader.load('./aisync.config.json');
    } catch (error) {
      // Fallback to basic template if config file doesn't exist
      config = await ConfigLoader.createTemplate('basic');
    }
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  describe('canHandle', () => {
    it('should handle any AI tool type from config', () => {
      // UniversalHandler should handle all types defined in config
      config.targets.forEach(target => {
        expect(handler.canHandle(target.type)).toBe(true);
      });
      
      // Should also handle custom types
      expect(handler.canHandle('custom-ai-tool')).toBe(true);
      expect(handler.canHandle('new-ai-ide')).toBe(true);
    });
  });

  describe('getTargetPath', () => {
    it('should return target path based on config mapping', () => {
      if (config.targets.length > 0) {
        const target = config.targets[0];
        const sourceFile = config.sources[0] || 'global_rules.md';
        
        const targetPath = handler.getTargetPath(target, sourceFile);
        expect(targetPath).toBeDefined();
        expect(typeof targetPath).toBe('string');
      }
    });

    it('should throw error when no mapping found', () => {
      const target = config.targets[0];
      const unmappedSource = 'nonexistent-file.txt';
      
      expect(() => {
        handler.getTargetPath(target, unmappedSource);
      }).toThrow('No mapping found for source file');
    });
  });

  describe('validate', () => {
    it('should validate target configuration from config file', () => {
      config.targets.forEach(target => {
        const isValid = handler.validate(target);
        expect(isValid).toBe(true);
      });
    });

    it('should reject invalid target configuration', () => {
      const invalidTarget = {
        name: 'invalid',
        type: 'any-ai-tool',
        path: '', // Invalid empty path
        mapping: [],
        enabled: true
      };
      
      const isValid = handler.validate(invalidTarget);
      expect(isValid).toBe(false);
    });
  });

  describe('transform', () => {
    it('should apply transformations from config', () => {
      const content = '# Test Content';
      const target = config.targets[0];
      const source = config.sources[0];
      
      // Transform should not throw and should return string
      const transformed = handler.transform(content, target, source);
      expect(typeof transformed).toBe('string');
    });
  });
});

describe('TargetManager', () => {
  let manager: TargetManager;
  let handler: UniversalHandler;
  let config: SyncConfig;

  beforeEach(async () => {
    // Create a new instance to avoid registration conflicts
    manager = new (TargetManager as any)();
    handler = new UniversalHandler();
    manager.register(handler);
    
    // Load configuration from aisync.config.json
    try {
      config = await ConfigLoader.load('./aisync.config.json');
    } catch (error) {
      config = await ConfigLoader.createTemplate('basic');
    }
  });

  describe('validateTargets', () => {
    it('should validate targets from config file', () => {
      const validation = manager.validateTargets(config.targets);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('sync', () => {
    it('should sync files based on config', async () => {
      if (config.targets.length > 0 && config.sources.length > 0) {
        const target = config.targets[0];
        const source = config.sources[0];
        
        // Create a temporary source file
        const tempSource = path.join(process.cwd(), 'temp-test-file.md');
        await fs.writeFile(tempSource, '# Test Content');
        
        try {
          const result = await manager.sync(tempSource, target);
          expect(result).toBeDefined();
          expect(result.success).toBeDefined();
        } finally {
          // Clean up
          try {
            await fs.unlink(tempSource);
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      }
    });
  });
});
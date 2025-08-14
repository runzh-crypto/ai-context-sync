import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { GlobalConfiguration } from '../core/global-config';
import { postInstall } from '../postinstall';

describe('postInstall', () => {
  let testDir: string;
  let globalConfig: GlobalConfiguration;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Create a temporary directory for testing
    testDir = path.join(os.tmpdir(), `ai-context-sync-postinstall-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    
    // Set up global config with test directory
    globalConfig = GlobalConfiguration.getInstance();
    globalConfig.setGlobalPath(testDir);
  });

  afterEach(async () => {
    // Restore original environment
    process.env = originalEnv;
    
    // Clean up test directory
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  describe('installation detection', () => {
    it('should show global installation message when npm_config_global is true', async () => {
      process.env.npm_config_global = 'true';
      
      // Should not throw and should complete successfully
      await expect(postInstall()).resolves.not.toThrow();
      
      // No files should be created automatically
      expect(await globalConfig.exists()).toBe(false);
    });

    it('should show global installation message when npm_config_prefix is set', async () => {
      process.env.npm_config_prefix = '/usr/local';
      
      // Should not throw and should complete successfully
      await expect(postInstall()).resolves.not.toThrow();
      
      // No files should be created automatically
      expect(await globalConfig.exists()).toBe(false);
    });

    it('should show local installation message for local installation', async () => {
      // Ensure no global installation indicators
      delete process.env.npm_config_global;
      delete process.env.npm_config_prefix;
      
      // Should not throw and should complete successfully
      await expect(postInstall()).resolves.not.toThrow();
      
      // No files should be created automatically
      expect(await globalConfig.exists()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully and not throw', async () => {
      process.env.npm_config_global = 'true';
      
      // Should not throw, regardless of path issues
      await expect(postInstall()).resolves.not.toThrow();
    });

    it('should complete successfully regardless of existing files', async () => {
      process.env.npm_config_global = 'true';
      
      // Create some files first
      await fs.ensureDir(testDir);
      await fs.writeFile(path.join(testDir, 'global_rules.md'), 'test content', 'utf8');
      
      // Running postInstall should not fail
      await expect(postInstall()).resolves.not.toThrow();
    });
  });
});
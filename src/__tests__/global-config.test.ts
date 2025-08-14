import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { GlobalConfiguration } from '../core/global-config';

describe('GlobalConfiguration', () => {
  let globalConfig: GlobalConfiguration;
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary directory path for testing (but don't create the directory yet)
    testDir = path.join(os.tmpdir(), `ai-context-sync-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    
    // Get singleton instance and set test path
    globalConfig = GlobalConfiguration.getInstance();
    globalConfig.setGlobalPath(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = GlobalConfiguration.getInstance();
      const instance2 = GlobalConfiguration.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('path management', () => {
    it('should return correct global path', () => {
      expect(globalConfig.getGlobalPath()).toBe(testDir);
    });

    it('should return correct rules file path', () => {
      const expectedPath = path.join(testDir, 'global_rules.md');
      expect(globalConfig.getRulesPath()).toBe(expectedPath);
    });

    it('should return correct MCP file path', () => {
      const expectedPath = path.join(testDir, 'global_mcp.json');
      expect(globalConfig.getMcpPath()).toBe(expectedPath);
    });

    it('should return complete config object', () => {
      const config = globalConfig.getConfig();
      expect(config).toEqual({
        rulesFile: path.join(testDir, 'global_rules.md'),
        mcpFile: path.join(testDir, 'global_mcp.json')
      });
    });
  });

  describe('createDefaults', () => {
    it('should create global configuration directory', async () => {
      await globalConfig.createDefaults(true);
      
      const dirExists = await fs.pathExists(testDir);
      expect(dirExists).toBe(true);
    });

    it('should create default rules file', async () => {
      await globalConfig.createDefaults(true);
      
      const rulesPath = globalConfig.getRulesPath();
      const rulesExists = await fs.pathExists(rulesPath);
      expect(rulesExists).toBe(true);

      const content = await fs.readFile(rulesPath, 'utf8');
      expect(content).toContain('# Global AI Rules');
      expect(content).toContain('## Code Style');
      expect(content).toContain('## Documentation');
    });

    it('should create default MCP file', async () => {
      await globalConfig.createDefaults(true);
      
      const mcpPath = globalConfig.getMcpPath();
      const mcpExists = await fs.pathExists(mcpPath);
      expect(mcpExists).toBe(true);

      const content = await fs.readFile(mcpPath, 'utf8');
      const mcpConfig = JSON.parse(content);
      expect(mcpConfig).toHaveProperty('mcpServers');
      expect(mcpConfig.mcpServers).toHaveProperty('filesystem');
      expect(mcpConfig.mcpServers).toHaveProperty('git');
    });

    it('should not overwrite existing files', async () => {
      // Create initial files
      await globalConfig.createDefaults(true);
      
      // Modify the rules file
      const rulesPath = globalConfig.getRulesPath();
      const customContent = '# Custom Rules\nThis is modified content';
      await fs.writeFile(rulesPath, customContent, 'utf8');

      // Call createDefaults again
      await globalConfig.createDefaults(true);

      // Verify file was not overwritten
      const content = await fs.readFile(rulesPath, 'utf8');
      expect(content).toBe(customContent);
    });

    it('should handle errors gracefully', async () => {
      // Test with a path that will cause issues during file creation
      // Use a path with invalid characters for Windows
      const invalidPath = path.join(testDir, 'invalid<>|path');
      globalConfig.setGlobalPath(invalidPath);

      // This should handle the error gracefully
      await expect(globalConfig.createDefaults(true)).rejects.toThrow(
        'Failed to create default global configuration'
      );
    });
  });

  describe('existence checks', () => {
    it('should return false when directory does not exist', async () => {
      const exists = await globalConfig.exists();
      expect(exists).toBe(false);
    });

    it('should return true when global files exist', async () => {
      await globalConfig.createDefaults(true);
      const exists = await globalConfig.exists();
      expect(exists).toBe(true);
    });

    it('should return false when rules file does not exist', async () => {
      const exists = await globalConfig.rulesFileExists();
      expect(exists).toBe(false);
    });

    it('should return true when rules file exists', async () => {
      await globalConfig.createDefaults(true);
      const exists = await globalConfig.rulesFileExists();
      expect(exists).toBe(true);
    });

    it('should return false when MCP file does not exist', async () => {
      const exists = await globalConfig.mcpFileExists();
      expect(exists).toBe(false);
    });

    it('should return true when MCP file exists', async () => {
      await globalConfig.createDefaults(true);
      const exists = await globalConfig.mcpFileExists();
      expect(exists).toBe(true);
    });
  });

  describe('reset functionality', () => {
    it('should remove global configuration directory', async () => {
      await globalConfig.createDefaults(true);
      
      // Verify directory exists
      let exists = await globalConfig.exists();
      expect(exists).toBe(true);

      // Reset configuration
      await globalConfig.reset();

      // Verify directory is removed
      exists = await globalConfig.exists();
      expect(exists).toBe(false);
    });

    it('should handle reset when directory does not exist', async () => {
      // Should not throw error when directory doesn't exist
      await expect(globalConfig.reset()).resolves.not.toThrow();
    });
  });
});
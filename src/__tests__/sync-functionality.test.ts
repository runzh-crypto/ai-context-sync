import { SyncManager } from '../core/SyncManager';
import { ConfigLoader } from '../config/loader';
import { SyncConfig, SyncMode } from '../types';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Core Sync Functionality', () => {
  let syncManager: SyncManager;
  let tempDir: string;
  let testConfig: SyncConfig;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-context-sync-core-test-'));
    
    // Create a minimal test configuration with direct destination paths
    testConfig = {
      sources: ['test-rules.md', 'test-mcp.json'],
      targets: [
        {
          name: 'test-ai-tool-1',
          type: 'test-ai-1',
          path: '.',
          mapping: [
            {
              source: 'test-rules.md',
              destination: path.join(tempDir, 'ai1', 'rules.md')
            },
            {
              source: 'test-mcp.json',
              destination: path.join(tempDir, 'ai1', 'mcp.json')
            }
          ],
          enabled: true
        },
        {
          name: 'test-ai-tool-2',
          type: 'test-ai-2',
          path: '.',
          mapping: [
            {
              source: 'test-rules.md',
              destination: path.join(tempDir, 'ai2', 'rules.md')
            },
            {
              source: 'test-mcp.json',
              destination: path.join(tempDir, 'ai2', 'mcp.json')
            }
          ],
          enabled: true
        }
      ],
      mode: SyncMode.INCREMENTAL
    };

    syncManager = new SyncManager();
  });

  afterEach(async () => {
    await syncManager.stop();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Full Sync Mode', () => {
    it('should sync all files regardless of modification time', async () => {
      // Create source files
      const rulesContent = '# Test Rules\nThis is a test rule file.';
      const mcpContent = '{"servers": {"test": {"command": "test"}}}';
      
      await fs.writeFile('test-rules.md', rulesContent);
      await fs.writeFile('test-mcp.json', mcpContent);

      try {
        testConfig.mode = SyncMode.FULL;
        const result = await syncManager.sync(testConfig);

        expect(result.success).toBe(true);
        expect(result.files).toBeDefined();
        expect(result.files!.length).toBeGreaterThan(0);

        // Verify files were created in target locations
        const ai1Rules = await fs.readFile(path.join(tempDir, 'ai1', 'rules.md'), 'utf8');
        const ai2Rules = await fs.readFile(path.join(tempDir, 'ai2', 'rules.md'), 'utf8');
        
        expect(ai1Rules).toBe(rulesContent);
        expect(ai2Rules).toBe(rulesContent);
      } finally {
        // Cleanup
        await fs.unlink('test-rules.md').catch(() => {});
        await fs.unlink('test-mcp.json').catch(() => {});
      }
    });
  });

  describe('Incremental Sync Mode', () => {
    it('should only sync modified files', async () => {
      const rulesContent = '# Test Rules\nThis is a test rule file.';
      const mcpContent = '{"servers": {"test": {"command": "test"}}}';
      
      await fs.writeFile('test-rules.md', rulesContent);
      await fs.writeFile('test-mcp.json', mcpContent);

      try {
        testConfig.mode = SyncMode.INCREMENTAL;
        
        // First sync - should sync all files
        const firstResult = await syncManager.sync(testConfig);
        expect(firstResult.success).toBe(true);

        // Wait a bit to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 100));

        // Modify only one file
        const updatedRulesContent = '# Updated Test Rules\nThis is an updated rule file.';
        await fs.writeFile('test-rules.md', updatedRulesContent);

        // Second sync - should only sync the modified file
        const secondResult = await syncManager.sync(testConfig);
        expect(secondResult.success).toBe(true);

        // Verify the updated content
        const ai1Rules = await fs.readFile(path.join(tempDir, 'ai1', 'rules.md'), 'utf8');
        expect(ai1Rules).toBe(updatedRulesContent);
      } finally {
        // Cleanup
        await fs.unlink('test-rules.md').catch(() => {});
        await fs.unlink('test-mcp.json').catch(() => {});
      }
    });
  });

  describe('Configuration-Driven Behavior', () => {
    it('should work with any AI tool type specified in config', async () => {
      // Test with completely custom AI tool types
      const customConfig: SyncConfig = {
        sources: ['test-file.txt'],
        targets: [
          {
            name: 'future-ai-tool',
            type: 'future-ai-v2024',
            path: '.',
            mapping: [
              {
                source: 'test-file.txt',
                destination: path.join(tempDir, 'future-ai', 'config.txt')
              }
            ],
            enabled: true
          },
          {
            name: 'another-custom-ai',
            type: 'custom-ai-platform',
            path: '.',
            mapping: [
              {
                source: 'test-file.txt',
                destination: path.join(tempDir, 'custom-ai', 'settings.txt')
              }
            ],
            enabled: true
          }
        ],
        mode: SyncMode.FULL
      };

      const testContent = 'This is a test file for custom AI tools.';
      await fs.writeFile('test-file.txt', testContent);

      try {
        const result = await syncManager.sync(customConfig);
        expect(result.success).toBe(true);

        // Verify files were synced to custom locations
        const futureAiContent = await fs.readFile(path.join(tempDir, 'future-ai', 'config.txt'), 'utf8');
        const customAiContent = await fs.readFile(path.join(tempDir, 'custom-ai', 'settings.txt'), 'utf8');
        
        expect(futureAiContent).toBe(testContent);
        expect(customAiContent).toBe(testContent);
      } finally {
        await fs.unlink('test-file.txt').catch(() => {});
      }
    });

    it('should handle disabled targets correctly', async () => {
      const testContent = 'Test content for enabled/disabled targets.';
      await fs.writeFile('test-file.txt', testContent);

      // Disable one target
      testConfig.targets[1].enabled = false;
      testConfig.sources = ['test-file.txt'];
      testConfig.targets[0].mapping = [{
        source: 'test-file.txt',
        destination: path.join(tempDir, 'enabled-ai', 'file.txt')
      }];
      testConfig.targets[1].mapping = [{
        source: 'test-file.txt',
        destination: path.join(tempDir, 'disabled-ai', 'file.txt')
      }];

      try {
        const result = await syncManager.sync(testConfig);
        expect(result.success).toBe(true);

        // Verify only enabled target was synced
        const enabledExists = await fs.access(path.join(tempDir, 'enabled-ai', 'file.txt')).then(() => true).catch(() => false);
        const disabledExists = await fs.access(path.join(tempDir, 'disabled-ai', 'file.txt')).then(() => true).catch(() => false);
        
        expect(enabledExists).toBe(true);
        expect(disabledExists).toBe(false);
      } finally {
        await fs.unlink('test-file.txt').catch(() => {});
      }
    });
  });
});
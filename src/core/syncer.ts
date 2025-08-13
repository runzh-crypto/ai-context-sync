import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { SyncConfig, SyncResult, KiroSyncConfig } from '../types';

export class Syncer {
  constructor(private config: SyncConfig | KiroSyncConfig) {}

  async sync(): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      const results: string[] = [];
      const errors: string[] = [];

      // Handle legacy configuration format
      if (this.isLegacyConfig(this.config)) {
        return this.syncLegacy(this.config as KiroSyncConfig);
      }

      // Handle new configuration format
      const newConfig = this.config as SyncConfig;
      
      // TODO: Implement new sync logic in future tasks
      // For now, return a placeholder result
      return {
        success: true,
        message: 'New configuration system ready',
        files: [],
        errors: [],
        timestamp: new Date(),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        message: `Sync failed: ${error}`,
        files: [],
        errors: [String(error)],
        timestamp: new Date(),
        duration: Date.now() - startTime
      };
    }
  }

  private isLegacyConfig(config: any): boolean {
    return 'sourceDir' in config && 'targetDirs' in config;
  }

  private async syncLegacy(config: KiroSyncConfig): Promise<SyncResult> {
    const startTime = Date.now();
    const results: string[] = [];
    const errors: string[] = [];

    try {
      // Sync rules files
      if (config.steering?.enabled) {
        const rulesResult = await this.syncRules(config);
        results.push(...rulesResult.files || []);
        errors.push(...rulesResult.errors || []);
      }

      // Sync MCP configuration
      if (config.mcp?.enabled) {
        const mcpResult = await this.syncMcp(config);
        results.push(...mcpResult.files || []);
        errors.push(...mcpResult.errors || []);
      }

      return {
        success: errors.length === 0,
        message: `Sync completed: ${results.length} files`,
        files: results,
        errors,
        timestamp: new Date(),
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        message: `Sync failed: ${error}`,
        files: [],
        errors: [String(error)],
        timestamp: new Date(),
        duration: Date.now() - startTime
      };
    }
  }

  private async syncRules(config: KiroSyncConfig): Promise<SyncResult> {
    const files: string[] = [];
    const errors: string[] = [];

    try {
      const patterns = config.steering?.patterns || ['**/*.md', '**/*.json'];
      const sourceFiles = await glob(patterns, {
        cwd: config.sourceDir,
        ignore: config.steering?.exclude || ['node_modules/**']
      });

      for (const targetDir of config.targetDirs) {
        for (const file of sourceFiles) {
          const sourcePath = path.join(config.sourceDir, file);
          const targetPath = path.join(targetDir, '.kiro', 'steering', file);

          await fs.ensureDir(path.dirname(targetPath));
          await fs.copy(sourcePath, targetPath);
          files.push(targetPath);
        }
      }

      return { 
        success: true, 
        message: 'Rules sync completed', 
        files,
        errors: [],
        timestamp: new Date(),
        duration: 0
      };
    } catch (error) {
      errors.push(`Rules sync failed: ${error}`);
      return { 
        success: false, 
        message: 'Rules sync failed', 
        files: [],
        errors,
        timestamp: new Date(),
        duration: 0
      };
    }
  }

  private async syncMcp(config: KiroSyncConfig): Promise<SyncResult> {
    const files: string[] = [];
    const errors: string[] = [];

    try {
      const mcpConfigPath = path.join(config.sourceDir, config.mcp?.configFile || 'mcp.json');
      
      if (!await fs.pathExists(mcpConfigPath)) {
        errors.push(`MCP config file not found: ${mcpConfigPath}`);
        return { 
          success: false, 
          message: 'MCP config file not found', 
          files: [],
          errors,
          timestamp: new Date(),
          duration: 0
        };
      }

      for (const targetDir of config.targetDirs) {
        const targetPath = path.join(targetDir, '.kiro', 'settings', 'mcp.json');
        
        await fs.ensureDir(path.dirname(targetPath));
        await fs.copy(mcpConfigPath, targetPath);
        files.push(targetPath);
      }

      return { 
        success: true, 
        message: 'MCP config sync completed', 
        files,
        errors: [],
        timestamp: new Date(),
        duration: 0
      };
    } catch (error) {
      errors.push(`MCP config sync failed: ${error}`);
      return { 
        success: false, 
        message: 'MCP config sync failed', 
        files: [],
        errors,
        timestamp: new Date(),
        duration: 0
      };
    }
  }
}
import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { SyncConfig, SyncResult, KiroSyncConfig } from '../types';
import { TargetManager, KiroHandler, CursorHandler, ClaudeCodeHandler, GeminiCLIHandler, VSCodeHandler } from './handlers';

export class Syncer {
  private targetManager: TargetManager;

  constructor(private config: SyncConfig | KiroSyncConfig) {
    this.targetManager = TargetManager.getInstance();
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // Register all available handlers
    this.targetManager.register(new KiroHandler());
    this.targetManager.register(new CursorHandler());
    this.targetManager.register(new ClaudeCodeHandler());
    this.targetManager.register(new GeminiCLIHandler());
    this.targetManager.register(new VSCodeHandler());
  }

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
      
      // Sync using the new handler system
      const syncResults = await this.syncWithHandlers(newConfig);
      
      return {
        success: syncResults.every(r => r.success),
        message: `Sync completed: ${syncResults.filter(r => r.success).length}/${syncResults.length} targets successful`,
        files: syncResults.flatMap(r => r.files || []),
        errors: syncResults.flatMap(r => r.errors || []),
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

  private async syncWithHandlers(config: SyncConfig): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    // Validate that all targets have registered handlers
    const validation = this.targetManager.validateTargets(config.targets);
    if (!validation.valid) {
      return [{
        success: false,
        message: `Invalid target configuration: ${validation.errors.join(', ')}`,
        files: [],
        errors: validation.errors,
        timestamp: new Date(),
        duration: 0
      }];
    }

    // Sync each source file to all enabled targets
    for (const source of config.sources) {
      // Check if source file exists
      if (!await fs.pathExists(source)) {
        results.push({
          success: false,
          message: `Source file not found: ${source}`,
          files: [],
          errors: [`Source file not found: ${source}`],
          timestamp: new Date(),
          duration: 0
        });
        continue;
      }

      // Sync to each target
      for (const target of config.targets) {
        if (target.enabled === false) {
          continue; // Skip disabled targets
        }

        const result = await this.targetManager.sync(source, target);
        results.push(result);
      }
    }

    return results;
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
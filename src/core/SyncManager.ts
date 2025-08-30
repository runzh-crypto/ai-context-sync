import * as fs from 'fs-extra';
import * as path from 'path';
import { SyncConfig, SyncResult, SyncMode, TargetConfig } from '../types';
import { TargetManager, UniversalHandler } from './handlers';
import { FileChangeTracker } from './file-change-tracker';

/**
 * SyncManager class that handles different sync modes
 * Supports full sync mode (complete replacement) and incremental sync mode
 */
export class SyncManager {
  private targetManager: TargetManager;
  private fileChangeTracker: FileChangeTracker;

  private config?: SyncConfig;

  constructor(config?: SyncConfig) {
    this.config = config;
    this.targetManager = TargetManager.getInstance();
    this.fileChangeTracker = new FileChangeTracker();
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // Register universal handler that works for all AI tools based on config
    this.targetManager.register(new UniversalHandler());
  }

  /**
   * Execute sync based on the configured mode
   * @param config Optional config to use for this sync operation
   * @returns Promise<SyncResult>
   */
  async sync(config?: SyncConfig): Promise<SyncResult> {
    const syncConfig = config || this.config;
    if (!syncConfig) {
      throw new Error('No configuration provided for sync operation');
    }
    const startTime = Date.now();

    try {
      let result: SyncResult;

      switch (syncConfig.mode) {
        case SyncMode.FULL:
          result = await this.fullSync(syncConfig);
          break;
        case SyncMode.INCREMENTAL:
          result = await this.incrementalSync(syncConfig);
          break;
        default:
          throw new Error(`Unsupported sync mode: ${syncConfig.mode}`);
      }

      result.duration = Date.now() - startTime;
      return result;
    } catch (error) {
      return {
        success: false,
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        files: [],
        errors: [String(error)],
        timestamp: new Date(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Full sync mode - completely replaces target files
   * Clears target directories and copies all source files
   * @param config Configuration to use for sync
   * @returns Promise<SyncResult>
   */
  private async fullSync(config: SyncConfig): Promise<SyncResult> {
    const results: string[] = [];
    const errors: string[] = [];

    try {
      // Validate targets
      const validation = this.targetManager.validateTargets(config.targets);
      if (!validation.valid) {
        return {
          success: false,
          message: `Invalid target configuration: ${validation.errors.join(', ')}`,
          files: [],
          errors: validation.errors,
          timestamp: new Date(),
          duration: 0
        };
      }

      // Clean target directories first
      await this.cleanTargetDirectories(config);

      // Sync all source files to all targets
      for (const source of config.sources) {
        if (!await fs.pathExists(source)) {
          errors.push(`Source file not found: ${source}`);
          continue;
        }

        for (const target of config.targets) {
          if (target.enabled === false) {
            continue;
          }

          try {
            const syncResult = await this.targetManager.sync(source, target);
            if (syncResult.success) {
              results.push(...(syncResult.files || []));
            } else {
              errors.push(...(syncResult.errors || []));
            }
          } catch (error) {
            errors.push(`Failed to sync ${source} to ${target.name}: ${error}`);
          }
        }
      }

      return {
        success: errors.length === 0,
        message: `Full sync completed: ${results.length} files processed`,
        files: results,
        errors,
        timestamp: new Date(),
        duration: 0
      };
    } catch (error) {
      return {
        success: false,
        message: `Full sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        files: [],
        errors: [String(error)],
        timestamp: new Date(),
        duration: 0
      };
    }
  }

  /**
   * Clean target directories before full sync
   * Removes existing files in target directories to ensure clean state
   */
  private async cleanTargetDirectories(config: SyncConfig): Promise<void> {
    for (const target of config.targets) {
      if (target.enabled === false) continue;

      try {
        // Clean each mapped destination file
        if (target.mapping) {
          for (const mapping of target.mapping) {
            if (await fs.pathExists(mapping.destination)) {
              await fs.remove(mapping.destination);
            }
          }
        }
      } catch (error) {
        // Log warning but don't fail the entire sync
        console.warn(`Failed to clean target files for ${target.name}: ${error}`);
      }
    }
  }



  /**
   * Incremental sync mode - only syncs changed files
   * Uses FileChangeTracker to detect changes and optimize sync
   * @param config Configuration to use for sync
   * @returns Promise<SyncResult>
   */
  private async incrementalSync(config: SyncConfig): Promise<SyncResult> {
    const results: string[] = [];
    const errors: string[] = [];

    try {
      // Validate targets
      const validation = this.targetManager.validateTargets(config.targets);
      if (!validation.valid) {
        return {
          success: false,
          message: `Invalid target configuration: ${validation.errors.join(', ')}`,
          files: [],
          errors: validation.errors,
          timestamp: new Date(),
          duration: 0
        };
      }

      // Get changed files using FileChangeTracker
      const changedFiles = await this.getChangedSourceFiles(config);

      if (changedFiles.length === 0) {
        return {
          success: true,
          message: 'No changes detected, sync skipped',
          files: [],
          errors: [],
          timestamp: new Date(),
          duration: 0
        };
      }

      // Sync only changed files
      for (const sourceFile of changedFiles) {
        for (const target of config.targets) {
          if (target.enabled === false) {
            continue;
          }

          try {
            const syncResult = await this.targetManager.sync(sourceFile, target);
            if (syncResult.success) {
              results.push(...(syncResult.files || []));
              // Update tracking for successfully synced file
              await this.fileChangeTracker.updateTracking(sourceFile);
            } else {
              errors.push(...(syncResult.errors || []));
            }
          } catch (error) {
            errors.push(`Failed to sync ${sourceFile} to ${target.name}: ${error}`);
          }
        }
      }

      return {
        success: errors.length === 0,
        message: `Incremental sync completed: ${changedFiles.length} changed files, ${results.length} files processed`,
        files: results,
        errors,
        timestamp: new Date(),
        duration: 0
      };
    } catch (error) {
      return {
        success: false,
        message: `Incremental sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        files: [],
        errors: [String(error)],
        timestamp: new Date(),
        duration: 0
      };
    }
  }

  /**
   * Get source files that have changed since last sync
   * @param config Configuration containing source files to check
   * @returns Promise<string[]> - Array of changed source file paths
   */
  private async getChangedSourceFiles(config: SyncConfig): Promise<string[]> {
    const changedFiles: string[] = [];

    for (const source of config.sources) {
      try {
        if (await fs.pathExists(source)) {
          // Check if file has changed
          if (await this.fileChangeTracker.hasChanged(source)) {
            changedFiles.push(source);
          }
        } else {
          // If source file doesn't exist, it's considered a change (deletion)
          changedFiles.push(source);
        }
      } catch (error) {
        // If there's an error checking the file, include it as changed
        changedFiles.push(source);
      }
    }

    return changedFiles;
  }

  /**
   * Initialize file tracking for all source files
   * Should be called after initial sync to establish baseline
   * @param config Configuration containing source files to track
   */
  async initializeTracking(config?: SyncConfig): Promise<void> {
    const syncConfig = config || this.config;
    if (!syncConfig) {
      throw new Error('No configuration provided for tracking initialization');
    }

    for (const source of syncConfig.sources) {
      try {
        if (await fs.pathExists(source)) {
          await this.fileChangeTracker.track(source);
        }
      } catch (error) {
        console.warn(`Failed to initialize tracking for ${source}: ${error}`);
      }
    }
  }

  /**
   * Stop the sync manager and cleanup resources
   */
  async stop(): Promise<void> {
    // Currently no cleanup needed, but method exists for interface compatibility
    return Promise.resolve();
  }

  /**
   * Get the file change tracker instance
   * @returns FileChangeTracker
   */
  getFileChangeTracker(): FileChangeTracker {
    return this.fileChangeTracker;
  }
}
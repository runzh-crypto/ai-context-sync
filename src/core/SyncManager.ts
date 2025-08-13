import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { SyncConfig, SyncResult, SyncMode, TargetConfig } from '../types';
import { TargetManager } from './handlers';
import { FileChangeTracker } from './file-change-tracker';

/**
 * SyncManager class that handles different sync modes
 * Supports full sync mode (complete replacement) and incremental sync mode
 */
export class SyncManager {
  private targetManager: TargetManager;
  private fileChangeTracker: FileChangeTracker;

  constructor(private config: SyncConfig) {
    this.targetManager = TargetManager.getInstance();
    this.fileChangeTracker = new FileChangeTracker();
  }

  /**
   * Execute sync based on the configured mode
   * @returns Promise<SyncResult>
   */
  async sync(): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      let result: SyncResult;

      switch (this.config.mode) {
        case SyncMode.FULL:
          result = await this.fullSync();
          break;
        case SyncMode.INCREMENTAL:
          result = await this.incrementalSync();
          break;
        default:
          throw new Error(`Unsupported sync mode: ${this.config.mode}`);
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
   * @returns Promise<SyncResult>
   */
  private async fullSync(): Promise<SyncResult> {
    const results: string[] = [];
    const errors: string[] = [];

    try {
      // Validate targets
      const validation = this.targetManager.validateTargets(this.config.targets);
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
      await this.cleanTargetDirectories();

      // Sync all source files to all targets
      for (const source of this.config.sources) {
        if (!await fs.pathExists(source)) {
          errors.push(`Source file not found: ${source}`);
          continue;
        }

        for (const target of this.config.targets) {
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
  private async cleanTargetDirectories(): Promise<void> {
    for (const target of this.config.targets) {
      if (target.enabled === false) {
        continue;
      }

      try {
        const handler = this.targetManager.getHandler(target.type);
        if (!handler) {
          continue;
        }

        // Get the target directory path
        const targetPath = this.getTargetDirectoryPath(target);
        
        if (await fs.pathExists(targetPath)) {
          // Remove all files in the target directory but keep the directory structure
          await this.cleanDirectory(targetPath);
        }
      } catch (error) {
        // Log warning but don't fail the entire sync
        console.warn(`Failed to clean target directory for ${target.name}: ${error}`);
      }
    }
  }

  /**
   * Get the target directory path for a given target configuration
   * @param target - Target configuration
   * @returns string - Target directory path
   */
  private getTargetDirectoryPath(target: TargetConfig): string {
    // This is a simplified implementation - in practice, this would depend on the target type
    switch (target.type) {
      case 'kiro':
        return path.join(target.path, '.kiro', 'steering');
      case 'cursor':
        return path.join(target.path, '.cursor');
      case 'vscode':
        return path.join(target.path, '.vscode');
      case 'claudecode':
        return path.join(target.path, '.claudecode', 'rules');
      case 'gemini-cli':
        return path.join(target.path, '.gemini', 'prompts');
      default:
        return target.path;
    }
  }

  /**
   * Clean a directory by removing all files but preserving directory structure
   * @param dirPath - Directory path to clean
   */
  private async cleanDirectory(dirPath: string): Promise<void> {
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isFile()) {
          await fs.remove(itemPath);
        } else if (stats.isDirectory()) {
          // Recursively clean subdirectories
          await this.cleanDirectory(itemPath);
        }
      }
    } catch (error) {
      throw new Error(`Failed to clean directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Batch copy files from source to target directories
   * @param sourceFiles - Array of source file paths
   * @param targetConfigs - Array of target configurations
   * @returns Promise<{ files: string[], errors: string[] }>
   */
  private async batchCopyFiles(
    sourceFiles: string[], 
    targetConfigs: TargetConfig[]
  ): Promise<{ files: string[], errors: string[] }> {
    const files: string[] = [];
    const errors: string[] = [];

    for (const sourceFile of sourceFiles) {
      for (const target of targetConfigs) {
        if (target.enabled === false) {
          continue;
        }

        try {
          const result = await this.targetManager.sync(sourceFile, target);
          if (result.success) {
            files.push(...(result.files || []));
          } else {
            errors.push(...(result.errors || []));
          }
        } catch (error) {
          errors.push(`Failed to copy ${sourceFile} to ${target.name}: ${error}`);
        }
      }
    }

    return { files, errors };
  }

  /**
   * Incremental sync mode - only syncs changed files
   * Uses FileChangeTracker to detect changes and optimize sync
   * @returns Promise<SyncResult>
   */
  private async incrementalSync(): Promise<SyncResult> {
    const results: string[] = [];
    const errors: string[] = [];

    try {
      // Validate targets
      const validation = this.targetManager.validateTargets(this.config.targets);
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
      const changedFiles = await this.getChangedSourceFiles();

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
        for (const target of this.config.targets) {
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
   * @returns Promise<string[]> - Array of changed source file paths
   */
  private async getChangedSourceFiles(): Promise<string[]> {
    const changedFiles: string[] = [];

    for (const source of this.config.sources) {
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
   */
  async initializeTracking(): Promise<void> {
    for (const source of this.config.sources) {
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
   * Get the file change tracker instance
   * @returns FileChangeTracker
   */
  getFileChangeTracker(): FileChangeTracker {
    return this.fileChangeTracker;
  }
}
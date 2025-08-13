import { ITargetHandler, AIToolType, TargetConfig, SyncResult } from '../../types';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Abstract base class for all target handlers
 * Provides common functionality and enforces interface implementation
 */
export abstract class BaseTargetHandler implements ITargetHandler {
  /**
   * Check if this handler can handle the specified AI tool type
   */
  abstract canHandle(type: AIToolType): boolean;

  /**
   * Get the target path for a source file
   */
  abstract getTargetPath(target: TargetConfig, source: string): string;

  /**
   * Validate target configuration
   */
  validate(target: TargetConfig): boolean {
    if (!target.name || !target.type || !target.path) {
      return false;
    }
    
    // Check if this handler can handle the target type
    if (!this.canHandle(target.type)) {
      return false;
    }
    
    return this.validateSpecific(target);
  }

  /**
   * Sync a source file to the target configuration
   */
  async sync(source: string, target: TargetConfig): Promise<SyncResult> {
    const startTime = Date.now();
    const syncedFiles: string[] = [];
    const errors: string[] = [];

    try {
      // Validate target configuration
      if (!this.validate(target)) {
        throw new Error(`Invalid target configuration for ${target.name}`);
      }

      // Check if source file exists
      if (!await this.fileExists(source)) {
        throw new Error(`Source file does not exist: ${source}`);
      }

      // Read source content
      const content = await this.readFile(source);
      
      // Transform content if needed
      const transformedContent = this.transform ? this.transform(content, target) : content;
      
      // Get target path
      const targetPath = this.getTargetPath(target, source);
      
      // Ensure target directory exists
      await this.ensureDirectoryExists(path.dirname(targetPath));
      
      // Write to target
      await this.writeFile(targetPath, transformedContent);
      
      syncedFiles.push(targetPath);

      return {
        success: true,
        message: `Successfully synced ${source} to ${target.name}`,
        files: syncedFiles,
        errors: [],
        timestamp: new Date(),
        duration: Date.now() - startTime
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);
      
      return {
        success: false,
        message: `Failed to sync ${source} to ${target.name}: ${errorMessage}`,
        files: [],
        errors: errors,
        timestamp: new Date(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Transform content before writing to target
   * Can be overridden by specific handlers
   */
  transform?(content: string, target: TargetConfig): string {
    // Default implementation - no transformation
    return content;
  }

  /**
   * Handler-specific validation logic
   * Can be overridden by specific handlers
   */
  protected validateSpecific(target: TargetConfig): boolean {
    // Default implementation - always valid
    return true;
  }

  /**
   * Check if a file exists
   */
  protected async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read file content
   */
  protected async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  /**
   * Write file content
   */
  protected async writeFile(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Ensure directory exists
   */
  protected async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Ignore error if directory already exists
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }
}


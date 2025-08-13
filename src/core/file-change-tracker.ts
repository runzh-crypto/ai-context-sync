import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { FileChangeInfo } from '../types';

/**
 * FileChangeTracker class for detecting and tracking file changes
 * Implements file hash calculation, modification time tracking, and size detection
 */
export class FileChangeTracker {
  private changes: Map<string, FileChangeInfo> = new Map();
  private readonly hashAlgorithm = 'sha256';

  /**
   * Track a file for changes
   * @param filePath - Path to the file to track
   */
  async track(filePath: string): Promise<void> {
    try {
      const absolutePath = path.resolve(filePath);
      const changeInfo = await this.getFileChangeInfo(absolutePath);
      this.changes.set(absolutePath, changeInfo);
    } catch (error) {
      throw new Error(`Failed to track file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a file has changed since last tracking
   * @param filePath - Path to the file to check
   * @returns true if file has changed, false otherwise
   */
  async hasChanged(filePath: string): Promise<boolean> {
    try {
      const absolutePath = path.resolve(filePath);
      const previousInfo = this.changes.get(absolutePath);
      
      if (!previousInfo) {
        // File not tracked before, consider it as changed
        return true;
      }

      const currentInfo = await this.getFileChangeInfo(absolutePath);
      
      // Compare hash, modification time, and size
      return (
        currentInfo.hash !== previousInfo.hash ||
        currentInfo.lastModified.getTime() !== previousInfo.lastModified.getTime() ||
        currentInfo.size !== previousInfo.size
      );
    } catch (error) {
      // If file doesn't exist or can't be read, consider it as changed
      return true;
    }
  }

  /**
   * Get all tracked file changes
   * @returns Array of FileChangeInfo for all tracked files
   */
  getChanges(): FileChangeInfo[] {
    return Array.from(this.changes.values());
  }

  /**
   * Get change info for a specific file
   * @param filePath - Path to the file
   * @returns FileChangeInfo if file is tracked, undefined otherwise
   */
  getChangeInfo(filePath: string): FileChangeInfo | undefined {
    const absolutePath = path.resolve(filePath);
    return this.changes.get(absolutePath);
  }

  /**
   * Clear all tracked changes
   */
  clear(): void {
    this.changes.clear();
  }

  /**
   * Remove a specific file from tracking
   * @param filePath - Path to the file to remove from tracking
   */
  untrack(filePath: string): void {
    const absolutePath = path.resolve(filePath);
    this.changes.delete(absolutePath);
  }

  /**
   * Get the number of tracked files
   * @returns Number of tracked files
   */
  getTrackedFileCount(): number {
    return this.changes.size;
  }

  /**
   * Check if a file is being tracked
   * @param filePath - Path to the file to check
   * @returns true if file is tracked, false otherwise
   */
  isTracked(filePath: string): boolean {
    const absolutePath = path.resolve(filePath);
    return this.changes.has(absolutePath);
  }

  /**
   * Update tracking information for a file
   * @param filePath - Path to the file to update
   */
  async updateTracking(filePath: string): Promise<void> {
    await this.track(filePath);
  }

  /**
   * Get file change information including hash, modification time, and size
   * @param filePath - Path to the file
   * @returns FileChangeInfo object
   */
  private async getFileChangeInfo(filePath: string): Promise<FileChangeInfo> {
    const stats = await fs.promises.stat(filePath);
    
    if (!stats.isFile()) {
      throw new Error(`Path ${filePath} is not a file`);
    }

    const hash = await this.calculateFileHash(filePath);
    
    return {
      path: filePath,
      lastModified: stats.mtime,
      size: stats.size,
      hash: hash
    };
  }

  /**
   * Calculate SHA256 hash of a file
   * @param filePath - Path to the file
   * @returns Hash string
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash(this.hashAlgorithm);
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', (data) => {
        hash.update(data);
      });
      
      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });
      
      stream.on('error', (error) => {
        reject(new Error(`Failed to calculate hash for ${filePath}: ${error.message}`));
      });
    });
  }

  /**
   * Get changed files since last tracking
   * @param filePaths - Array of file paths to check
   * @returns Array of file paths that have changed
   */
  async getChangedFiles(filePaths: string[]): Promise<string[]> {
    const changedFiles: string[] = [];
    
    for (const filePath of filePaths) {
      try {
        if (await this.hasChanged(filePath)) {
          changedFiles.push(filePath);
        }
      } catch (error) {
        // If there's an error checking the file, include it as changed
        changedFiles.push(filePath);
      }
    }
    
    return changedFiles;
  }

  /**
   * Track multiple files at once
   * @param filePaths - Array of file paths to track
   * @returns Array of successfully tracked file paths
   */
  async trackMultiple(filePaths: string[]): Promise<string[]> {
    const trackedFiles: string[] = [];
    
    for (const filePath of filePaths) {
      try {
        await this.track(filePath);
        trackedFiles.push(filePath);
      } catch (error) {
        // Log error but continue with other files
        console.warn(`Failed to track file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return trackedFiles;
  }
}
import { AIToolType, TargetConfig, SyncResult, FileChangeEvent } from './index';

/**
 * Base interface for target handlers
 */
export interface ITargetHandler {
  canHandle(type: AIToolType): boolean;
  sync(source: string, target: TargetConfig): Promise<SyncResult>;
  validate(target: TargetConfig): boolean;
  getTargetPath(target: TargetConfig, source: string): string;
  transform?(content: string, target: TargetConfig): string;
}

/**
 * File monitoring interface
 */
export interface IFileMonitor {
  watch(paths: string[], callback: FileChangeCallback): void;
  stop(): void;
  isWatching(): boolean;
}

/**
 * Sync manager interface
 */
export interface ISyncManager {
  sync(config: SyncConfig): Promise<SyncResult>;
  watch(config: SyncConfig): Promise<void>;
  stop(): Promise<void>;
  getStatus(): SyncStatus;
}

/**
 * File change callback type
 */
export type FileChangeCallback = (event: FileChangeEvent) => void;

/**
 * Sync status information
 */
export interface SyncStatus {
  isRunning: boolean;
  isWatching: boolean;
  lastSync?: Date;
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  errors: string[];
}

/**
 * Target handler registry interface
 */
export interface ITargetHandlerRegistry {
  register(handler: ITargetHandler): void;
  getHandler(type: AIToolType): ITargetHandler | undefined;
  getAllHandlers(): ITargetHandler[];
  unregister(type: AIToolType): boolean;
}

/**
 * File operation interface
 */
export interface IFileOperations {
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  copy(source: string, destination: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  getStats(path: string): Promise<FileStats>;
}

/**
 * File statistics
 */
export interface FileStats {
  size: number;
  lastModified: Date;
  isDirectory: boolean;
  isFile: boolean;
}

/**
 * Configuration loader interface
 */
export interface IConfigLoader {
  load(path: string): Promise<SyncConfig>;
  save(config: SyncConfig, path: string): Promise<void>;
  validate(config: any): ValidationResult;
  createDefault(path: string, options?: ConfigCreationOptions): Promise<void>;
}

// Re-export types that handlers need
import { SyncConfig, ValidationResult } from './index';
import { ConfigCreationOptions } from './config';
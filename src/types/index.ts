// AI Tool Types - now flexible string-based
export type AIToolType = string;

export enum SyncMode {
  FULL = 'full',
  INCREMENTAL = 'incremental'
}

// File Mapping Configuration
export interface FileMapping {
  source: string;
  destination: string;
  transform?: TransformRule[];
}

export interface TransformRule {
  type: 'replace' | 'append' | 'prepend' | 'custom';
  pattern?: string;
  replacement?: string;
  customFunction?: string;
}

// Target Configuration
export interface TargetConfig {
  name: string;
  type: AIToolType;
  path?: string; // Optional - destination paths can be complete
  mapping?: FileMapping[];
  enabled?: boolean;
}

// Global Configuration
export interface GlobalConfig {
  rulesFile: string;
  mcpFile: string;
  installPath?: string; // Optional - for future use
}

// Main Sync Configuration
export interface SyncConfig {
  sources: string[];
  targets: TargetConfig[];
  mode: SyncMode;
  global?: GlobalConfig;
}

// Legacy interface for backward compatibility
export interface KiroSyncConfig {
  sourceDir: string;
  targetDirs: string[];
  steering?: SteeringConfig;
  mcp?: McpConfig;
}

export interface SteeringConfig {
  enabled: boolean;
  patterns: string[];
  exclude?: string[];
}

export interface McpConfig {
  enabled: boolean;
  configFile: string;
  servers?: McpServer[];
}

export interface McpServer {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  disabled?: boolean;
  autoApprove?: string[];
}

// Results and Status
export interface SyncResult {
  success: boolean;
  message: string;
  files?: string[];
  errors?: string[];
  timestamp: Date;
  duration: number;
}

// File Change Tracking
export interface FileChangeInfo {
  path: string;
  lastModified: Date;
  size: number;
  hash: string;
}

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  timestamp: number;
}

// Error Handling
export enum ErrorType {
  CONFIG_ERROR = 'CONFIG_ERROR',
  FILE_ERROR = 'FILE_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// Re-export from other type files
export * from './config';
export * from './handlers';
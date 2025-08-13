export { Syncer } from './core/syncer';
export { GlobalConfiguration } from './core/global-config';
export { ConfigLoader } from './config/loader';
export { ConfigValidator } from './config/validator';
export { postInstall } from './postinstall';
export * from './types';

// Main exports for programmatic use
export { 
  SyncConfig, 
  SyncResult, 
  TargetConfig, 
  FileMapping, 
  AIToolType,
  SyncMode,
  WatchConfig,
  GlobalConfig,
  McpConfig,
  ValidationResult,
  ErrorType,
  DEFAULT_CONFIG,
  DEFAULT_TARGETS
} from './types';
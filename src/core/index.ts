/**
 * Core module exports
 * 
 * This module exports all core functionality of the AI Context Sync system
 */

// Handler architecture
export * from './handlers';

// Global configuration
export { GlobalConfiguration } from './global-config';

// Sync functionality
export { Syncer } from './syncer';
export { SyncManager } from './SyncManager';

// File change tracking
export { FileChangeTracker } from './file-change-tracker';
import { Syncer } from '../core/syncer';
import { SyncConfig, KiroSyncConfig, AIToolType, SyncMode } from '../types';
import * as fs from 'fs-extra';
import * as path from 'path';

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = {
  pathExists: jest.fn(),
  copy: jest.fn(),
  ensureDir: jest.fn()
} as any;

describe('Syncer', () => {
  const mockLegacyConfig: KiroSyncConfig = {
    sourceDir: './test-source',
    targetDirs: ['./test-target1', './test-target2'],
    steering: {
      enabled: true,
      patterns: ['**/*.md']
    },
    mcp: {
      enabled: true,
      configFile: 'mcp.json'
    }
  };

  const mockNewConfig: SyncConfig = {
    sources: ['./global_rules.md', './global_mcp.json'],
    targets: [
      {
        name: 'kiro',
        type: AIToolType.KIRO,
        path: '.kiro',
        mapping: [
          {
            source: 'global_rules.md',
            destination: 'steering/rules.md'
          }
        ]
      }
    ],
    mode: SyncMode.INCREMENTAL
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create syncer instance with legacy config', () => {
    const syncer = new Syncer(mockLegacyConfig);
    expect(syncer).toBeInstanceOf(Syncer);
  });

  it('should create syncer instance with new config', () => {
    const syncer = new Syncer(mockNewConfig);
    expect(syncer).toBeInstanceOf(Syncer);
  });

  it('should handle sync errors gracefully with legacy config', async () => {
    mockedFs.pathExists.mockResolvedValue(false);
    
    const syncer = new Syncer(mockLegacyConfig);
    const result = await syncer.sync();
    
    expect(result.success).toBeDefined();
    expect(result.errors).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(typeof result.duration).toBe('number');
  });

  it('should handle new config format', async () => {
    const syncer = new Syncer(mockNewConfig);
    const result = await syncer.sync();
    
    expect(result.success).toBe(true);
    expect(result.message).toBe('New configuration system ready');
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(typeof result.duration).toBe('number');
  });
});
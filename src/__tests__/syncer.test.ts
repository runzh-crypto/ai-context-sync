import { Syncer } from '../core/syncer';
import { SyncConfig, KiroSyncConfig, SyncMode } from '../types';
import { TargetManager } from '../core/handlers';

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
        type: 'kiro',
        path: '.',
        mapping: [
          {
            source: 'global_rules.md',
            destination: '.kiro/steering/rules.md'
          }
        ]
      }
    ],
    mode: SyncMode.INCREMENTAL
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear handlers before each test to avoid registration conflicts
    TargetManager.getInstance().clear();
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
    // Mock source file exists
    mockedFs.pathExists.mockResolvedValue(true);
    mockedFs.copy.mockResolvedValue(undefined);
    mockedFs.ensureDir.mockResolvedValue(undefined);
    
    const syncer = new Syncer(mockNewConfig);
    const result = await syncer.sync();
    
    expect(result.success).toBeDefined();
    expect(result.message).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(typeof result.duration).toBe('number');
  });
});
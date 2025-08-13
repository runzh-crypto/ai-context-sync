import { BaseTargetHandler, TargetManager } from '../core/handlers';
import { SyncResult } from '../types';
import { AIToolType, TargetConfig } from '../types';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock handler for testing
class TestHandler extends BaseTargetHandler {
  canHandle(type: AIToolType): boolean {
    return type === AIToolType.KIRO;
  }

  getTargetPath(target: TargetConfig, source: string): string {
    const filename = path.basename(source);
    return path.join(target.path, 'steering', filename);
  }

  protected validateSpecific(target: TargetConfig): boolean {
    return target.path.length > 0;
  }
}

// Another mock handler for testing
class CursorTestHandler extends BaseTargetHandler {
  canHandle(type: AIToolType): boolean {
    return type === AIToolType.CURSOR;
  }

  getTargetPath(target: TargetConfig, source: string): string {
    const filename = path.basename(source);
    return path.join(target.path, filename);
  }
}

describe('BaseTargetHandler', () => {
  let handler: TestHandler;
  let tempDir: string;
  let sourceFile: string;
  let targetConfig: TargetConfig;

  beforeEach(async () => {
    handler = new TestHandler();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aisync-test-'));
    
    // Create a test source file
    sourceFile = path.join(tempDir, 'test-rules.md');
    await fs.writeFile(sourceFile, '# Test Rules\nThis is a test file.');
    
    targetConfig = {
      name: 'test-kiro',
      type: AIToolType.KIRO,
      path: path.join(tempDir, '.kiro'),
      enabled: true
    };
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('should handle KIRO type', () => {
    expect(handler.canHandle(AIToolType.KIRO)).toBe(true);
    expect(handler.canHandle(AIToolType.CURSOR)).toBe(false);
  });

  test('should validate target configuration', () => {
    expect(handler.validate(targetConfig)).toBe(true);
    
    const invalidConfig = { ...targetConfig, path: '' };
    expect(handler.validate(invalidConfig)).toBe(false);
  });

  test('should sync file successfully', async () => {
    const result = await handler.sync(sourceFile, targetConfig);
    
    expect(result.success).toBe(true);
    expect(result.files).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
    
    // Verify file was created
    const targetPath = handler.getTargetPath(targetConfig, sourceFile);
    const content = await fs.readFile(targetPath, 'utf-8');
    expect(content).toBe('# Test Rules\nThis is a test file.');
  });

  test('should fail when source file does not exist', async () => {
    const nonExistentFile = path.join(tempDir, 'non-existent.md');
    const result = await handler.sync(nonExistentFile, targetConfig);
    
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]).toContain('Source file does not exist');
  });
});

describe('TargetManager', () => {
  let manager: TargetManager;
  let kiroHandler: TestHandler;
  let cursorHandler: CursorTestHandler;

  beforeEach(() => {
    manager = new TargetManager();
    kiroHandler = new TestHandler();
    cursorHandler = new CursorTestHandler();
  });

  afterEach(() => {
    manager.clear();
  });

  test('should register handlers', () => {
    manager.register(kiroHandler);
    manager.register(cursorHandler);
    
    expect(manager.hasHandler(AIToolType.KIRO)).toBe(true);
    expect(manager.hasHandler(AIToolType.CURSOR)).toBe(true);
    expect(manager.hasHandler(AIToolType.VSCODE)).toBe(false);
  });

  test('should get registered handler', () => {
    manager.register(kiroHandler);
    
    const handler = manager.getHandler(AIToolType.KIRO);
    expect(handler).toBe(kiroHandler);
    
    const nonExistentHandler = manager.getHandler(AIToolType.VSCODE);
    expect(nonExistentHandler).toBeUndefined();
  });

  test('should prevent duplicate handler registration', () => {
    manager.register(kiroHandler);
    
    expect(() => {
      manager.register(new TestHandler());
    }).toThrow('Handler for kiro is already registered');
  });

  test('should unregister handlers', () => {
    manager.register(kiroHandler);
    expect(manager.hasHandler(AIToolType.KIRO)).toBe(true);
    
    const result = manager.unregister(AIToolType.KIRO);
    expect(result).toBe(true);
    expect(manager.hasHandler(AIToolType.KIRO)).toBe(false);
  });

  test('should validate targets', () => {
    manager.register(kiroHandler);
    
    const targets: TargetConfig[] = [
      {
        name: 'valid-kiro',
        type: AIToolType.KIRO,
        path: '/valid/path',
        enabled: true
      },
      {
        name: 'invalid-vscode',
        type: AIToolType.VSCODE,
        path: '/some/path',
        enabled: true
      }
    ];
    
    const validation = manager.validateTargets(targets);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toHaveLength(1);
    expect(validation.errors[0]).toContain('No handler registered for target type: vscode');
  });

  test('should get statistics', () => {
    manager.register(kiroHandler);
    manager.register(cursorHandler);
    
    const stats = manager.getStats();
    expect(stats.totalHandlers).toBe(2);
    expect(stats.supportedTypes).toContain(AIToolType.KIRO);
    expect(stats.supportedTypes).toContain(AIToolType.CURSOR);
    expect(stats.handlersByType[AIToolType.KIRO]).toBe('TestHandler');
    expect(stats.handlersByType[AIToolType.CURSOR]).toBe('CursorTestHandler');
  });

  test('should return failure result for unregistered handler type', async () => {
    const targetConfig: TargetConfig = {
      name: 'unregistered',
      type: AIToolType.VSCODE,
      path: '/some/path',
      enabled: true
    };
    
    const result = await manager.sync('source.md', targetConfig);
    expect(result.success).toBe(false);
    expect(result.errors?.[0]).toContain('Unsupported target type: vscode');
  });
});

describe('SyncResult', () => {
  test('should create success result', () => {
    const result: SyncResult = {
      success: true,
      message: 'Test success',
      files: ['file1.md'],
      errors: [],
      timestamp: new Date(),
      duration: 100
    };
    
    expect(result.success).toBe(true);
    expect(result.message).toBe('Test success');
    expect(result.files).toEqual(['file1.md']);
    expect(result.errors).toEqual([]);
    expect(result.duration).toBe(100);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  test('should create failure result', () => {
    const result: SyncResult = {
      success: false,
      message: 'Test failure',
      files: [],
      errors: ['Error 1'],
      timestamp: new Date(),
      duration: 50
    };
    
    expect(result.success).toBe(false);
    expect(result.message).toBe('Test failure');
    expect(result.files).toEqual([]);
    expect(result.errors).toEqual(['Error 1']);
    expect(result.duration).toBe(50);
    expect(result.timestamp).toBeInstanceOf(Date);
  });
});
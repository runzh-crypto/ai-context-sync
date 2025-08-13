import { SyncManager } from '../SyncManager';
import { SyncConfig, SyncMode, AIToolType } from '../../types';

// Mock fs-extra
jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  remove: jest.fn()
}));

// Mock handlers
const mockTargetManager = {
  validateTargets: jest.fn(),
  sync: jest.fn(),
  getHandler: jest.fn(() => ({}))
};

jest.mock('../handlers', () => ({
  TargetManager: {
    getInstance: () => mockTargetManager
  }
}));

describe('SyncManager', () => {
  let syncManager: SyncManager;
  let mockConfig: SyncConfig;

  beforeEach(() => {
    mockConfig = {
      sources: ['global_rules.md', 'global_mcp.json'],
      targets: [
        {
          name: 'kiro',
          type: AIToolType.KIRO,
          path: './test-project',
          enabled: true
        },
        {
          name: 'cursor',
          type: AIToolType.CURSOR,
          path: './test-project',
          enabled: true
        }
      ],
      mode: SyncMode.FULL
    };

    syncManager = new SyncManager(mockConfig);

    // Reset mocks
    jest.clearAllMocks();
    const fs = require('fs-extra');
    fs.pathExists.mockReset();
    fs.readdir.mockReset();
    fs.stat.mockReset();
    fs.remove.mockReset();
    
    fs.pathExists.mockResolvedValue(true);
    fs.readdir.mockResolvedValue([]);
    fs.stat.mockResolvedValue({ isFile: () => true, isDirectory: () => false });
    fs.remove.mockResolvedValue(undefined);
    
    mockTargetManager.validateTargets.mockReset();
    mockTargetManager.sync.mockReset();
    mockTargetManager.validateTargets.mockReturnValue({ valid: true, errors: [] });
    mockTargetManager.sync.mockResolvedValue({
      success: true,
      message: 'Sync successful',
      files: ['test-file.md'],
      errors: [],
      timestamp: new Date(),
      duration: 0
    });
  });

  describe('Full Sync Mode', () => {
    it('should perform full sync successfully', async () => {
      const result = await syncManager.sync();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Full sync completed');
      expect(result.files).toEqual(['test-file.md', 'test-file.md', 'test-file.md', 'test-file.md']);
    });

    it('should clean target directories before sync', async () => {
      const fs = require('fs-extra');
      fs.readdir.mockResolvedValue(['old-file.md']);
      
      await syncManager.sync();

      expect(fs.remove).toHaveBeenCalled();
    });

    it('should handle missing source files', async () => {
      const fs = require('fs-extra');
      // Mock pathExists calls in order:
      // 1-2: cleanTargetDirectories calls for each target
      // 3: First source file check (should be false)
      // 4: Second source file check (should be true)
      fs.pathExists
        .mockResolvedValueOnce(true)  // Target directory exists (kiro)
        .mockResolvedValueOnce(true)  // Target directory exists (cursor)
        .mockResolvedValueOnce(false) // First source file doesn't exist
        .mockResolvedValueOnce(true)  // Second source exists
        .mockResolvedValue(true); // Other calls return true

      const result = await syncManager.sync();

      expect(result.errors).toContain('Source file not found: global_rules.md');
    });

    it('should skip disabled targets', async () => {
      mockConfig.targets[1].enabled = false;
      syncManager = new SyncManager(mockConfig);

      const result = await syncManager.sync();

      // Should only sync to one target (kiro)
      expect(result.files?.length).toBeLessThan(4); // Less than 2 sources * 2 targets
    });

    it('should handle sync errors gracefully', async () => {
      mockTargetManager.sync
        .mockRejectedValueOnce(new Error('Sync failed'))
        .mockResolvedValue({
          success: true,
          message: 'Sync successful',
          files: ['test-file.md'],
          errors: [],
          timestamp: new Date(),
          duration: 0
        });

      const result = await syncManager.sync();

      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('Failed to sync')
      ]));
    });
  });

  describe('Incremental Sync Mode', () => {
    beforeEach(() => {
      mockConfig.mode = SyncMode.INCREMENTAL;
      syncManager = new SyncManager(mockConfig);
    });

    it('should perform incremental sync for changed files', async () => {
      // Mock file change tracker to return changed files
      const fileChangeTracker = syncManager.getFileChangeTracker();
      jest.spyOn(fileChangeTracker, 'hasChanged').mockResolvedValue(true);

      const result = await syncManager.sync();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Incremental sync completed');
      expect(result.message).toContain('2 changed files');
    });

    it('should skip sync when no files have changed', async () => {
      const fileChangeTracker = syncManager.getFileChangeTracker();
      jest.spyOn(fileChangeTracker, 'hasChanged').mockResolvedValue(false);

      const result = await syncManager.sync();

      expect(result.success).toBe(true);
      expect(result.message).toBe('No changes detected, sync skipped');
      expect(result.files).toEqual([]);
    });

    it('should update tracking after successful sync', async () => {
      const fileChangeTracker = syncManager.getFileChangeTracker();
      const updateTrackingSpy = jest.spyOn(fileChangeTracker, 'updateTracking').mockResolvedValue();
      jest.spyOn(fileChangeTracker, 'hasChanged').mockResolvedValue(true);

      await syncManager.sync();

      expect(updateTrackingSpy).toHaveBeenCalledWith('global_rules.md');
      expect(updateTrackingSpy).toHaveBeenCalledWith('global_mcp.json');
    });

    it('should handle deleted source files as changes', async () => {
      const fs = require('fs-extra');
      const fileChangeTracker = syncManager.getFileChangeTracker();
      
      // Mock first file as non-existent (deleted)
      fs.pathExists
        .mockResolvedValueOnce(false) // First source doesn't exist
        .mockResolvedValue(true); // Other calls return true
      
      jest.spyOn(fileChangeTracker, 'hasChanged').mockResolvedValue(false);

      const result = await syncManager.sync();

      expect(result.success).toBe(true);
      expect(result.message).toContain('1 changed files'); // Deleted file counts as changed
    });

    it('should optimize sync by only processing changed files', async () => {
      const fileChangeTracker = syncManager.getFileChangeTracker();
      
      // Mock only first file as changed
      jest.spyOn(fileChangeTracker, 'hasChanged')
        .mockResolvedValueOnce(true)  // First file changed
        .mockResolvedValueOnce(false); // Second file unchanged

      const result = await syncManager.sync();

      expect(result.success).toBe(true);
      expect(result.message).toContain('1 changed files'); // Only 1 file should be processed
      expect(mockTargetManager.sync).toHaveBeenCalledTimes(2); // 1 file * 2 targets
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid sync mode', async () => {
      mockConfig.mode = 'invalid' as any;
      syncManager = new SyncManager(mockConfig);

      const result = await syncManager.sync();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unsupported sync mode');
    });

    it('should handle target validation errors', async () => {
      mockTargetManager.validateTargets.mockReturnValueOnce({
        valid: false,
        errors: ['Invalid target configuration']
      });

      const result = await syncManager.sync();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid target configuration');
    });

    it('should handle directory cleaning errors gracefully', async () => {
      const fs = require('fs-extra');
      fs.readdir.mockRejectedValue(new Error('Permission denied'));

      // Should not throw, but log warning
      const result = await syncManager.sync();

      // Sync should still proceed despite cleaning error
      expect(result.success).toBe(true);
    });
  });

  describe('File Tracking', () => {
    it('should initialize tracking for all source files', async () => {
      const fileChangeTracker = syncManager.getFileChangeTracker();
      const trackSpy = jest.spyOn(fileChangeTracker, 'track').mockResolvedValue();

      await syncManager.initializeTracking();

      expect(trackSpy).toHaveBeenCalledWith('global_rules.md');
      expect(trackSpy).toHaveBeenCalledWith('global_mcp.json');
    });

    it('should handle tracking errors gracefully', async () => {
      const fileChangeTracker = syncManager.getFileChangeTracker();
      jest.spyOn(fileChangeTracker, 'track').mockRejectedValue(new Error('Tracking failed'));

      // Should not throw
      await expect(syncManager.initializeTracking()).resolves.not.toThrow();
    });

    it('should return file change tracker instance', () => {
      const tracker = syncManager.getFileChangeTracker();
      expect(tracker).toBeDefined();
      expect(typeof tracker.track).toBe('function');
    });
  });

  describe('Target Directory Management', () => {
    it('should get correct target directory paths for different AI tools', async () => {
      // This tests the private getTargetDirectoryPath method indirectly
      // by checking if the correct paths are used during cleaning
      const fs = require('fs-extra');
      fs.readdir.mockResolvedValue(['test-file.md']);
      
      await syncManager.sync();

      // Verify that remove was called (indicating directories were cleaned)
      expect(fs.remove).toHaveBeenCalled();
    });

    it('should handle non-existent target directories', async () => {
      const fs = require('fs-extra');
      // Mock pathExists calls in order:
      // 1-2: cleanTargetDirectories calls for each target (should be false)
      // 3-4: Source file checks (should be true)
      fs.pathExists
        .mockResolvedValueOnce(false) // Target directory doesn't exist (kiro)
        .mockResolvedValueOnce(false) // Target directory doesn't exist (cursor)
        .mockResolvedValueOnce(true)  // First source exists
        .mockResolvedValueOnce(true)  // Second source exists
        .mockResolvedValue(true); // Other calls return true
      
      // Mock successful sync operations
      mockTargetManager.sync.mockResolvedValue({
        success: true,
        message: 'Sync successful',
        files: ['test-file.md'],
        errors: [],
        timestamp: new Date(),
        duration: 0
      });

      const result = await syncManager.sync();

      // Should still succeed even if target directories don't exist
      expect(result.success).toBe(true);
    });
  });
});
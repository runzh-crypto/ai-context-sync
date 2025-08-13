import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FileChangeTracker } from '../core/file-change-tracker';

describe('FileChangeTracker', () => {
  let tracker: FileChangeTracker;
  let tempDir: string;
  let testFile1: string;
  let testFile2: string;

  beforeEach(async () => {
    tracker = new FileChangeTracker();
    
    // Create temporary directory for tests
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'file-tracker-test-'));
    testFile1 = path.join(tempDir, 'test1.txt');
    testFile2 = path.join(tempDir, 'test2.txt');
    
    // Create test files
    await fs.promises.writeFile(testFile1, 'Initial content 1');
    await fs.promises.writeFile(testFile2, 'Initial content 2');
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('track', () => {
    it('should track a file successfully', async () => {
      await tracker.track(testFile1);
      
      expect(tracker.isTracked(testFile1)).toBe(true);
      expect(tracker.getTrackedFileCount()).toBe(1);
    });

    it('should handle absolute and relative paths', async () => {
      const relativePath = path.relative(process.cwd(), testFile1);
      await tracker.track(relativePath);
      
      expect(tracker.isTracked(testFile1)).toBe(true);
      expect(tracker.isTracked(relativePath)).toBe(true);
    });

    it('should throw error for non-existent file', async () => {
      const nonExistentFile = path.join(tempDir, 'non-existent.txt');
      
      await expect(tracker.track(nonExistentFile)).rejects.toThrow();
    });

    it('should throw error for directory', async () => {
      await expect(tracker.track(tempDir)).rejects.toThrow('is not a file');
    });
  });

  describe('hasChanged', () => {
    it('should return true for untracked file', async () => {
      const hasChanged = await tracker.hasChanged(testFile1);
      expect(hasChanged).toBe(true);
    });

    it('should return false for unchanged file', async () => {
      await tracker.track(testFile1);
      
      const hasChanged = await tracker.hasChanged(testFile1);
      expect(hasChanged).toBe(false);
    });

    it('should return true for modified file content', async () => {
      await tracker.track(testFile1);
      
      // Modify file content
      await fs.promises.writeFile(testFile1, 'Modified content');
      
      const hasChanged = await tracker.hasChanged(testFile1);
      expect(hasChanged).toBe(true);
    });

    it('should return true for file with updated modification time', async () => {
      await tracker.track(testFile1);
      
      // Wait a bit and touch the file to update modification time
      await new Promise(resolve => setTimeout(resolve, 10));
      const now = new Date();
      await fs.promises.utimes(testFile1, now, now);
      
      const hasChanged = await tracker.hasChanged(testFile1);
      expect(hasChanged).toBe(true);
    });

    it('should return true for non-existent file', async () => {
      const nonExistentFile = path.join(tempDir, 'non-existent.txt');
      
      const hasChanged = await tracker.hasChanged(nonExistentFile);
      expect(hasChanged).toBe(true);
    });
  });

  describe('getChanges', () => {
    it('should return empty array when no files tracked', () => {
      const changes = tracker.getChanges();
      expect(changes).toEqual([]);
    });

    it('should return tracked file information', async () => {
      await tracker.track(testFile1);
      await tracker.track(testFile2);
      
      const changes = tracker.getChanges();
      expect(changes).toHaveLength(2);
      
      const file1Info = changes.find(info => info.path === path.resolve(testFile1));
      expect(file1Info).toBeDefined();
      expect(file1Info?.hash).toBeDefined();
      expect(typeof file1Info?.lastModified).toBe('object');
      expect(file1Info?.lastModified).toBeTruthy();
      expect(file1Info?.size).toBeGreaterThan(0);
    });
  });

  describe('getChangeInfo', () => {
    it('should return undefined for untracked file', () => {
      const info = tracker.getChangeInfo(testFile1);
      expect(info).toBeUndefined();
    });

    it('should return change info for tracked file', async () => {
      await tracker.track(testFile1);
      
      const info = tracker.getChangeInfo(testFile1);
      expect(info).toBeDefined();
      expect(info?.path).toBe(path.resolve(testFile1));
      expect(info?.hash).toBeDefined();
      expect(typeof info?.lastModified).toBe('object');
      expect(info?.lastModified).toBeTruthy();
      expect(info?.size).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should clear all tracked files', async () => {
      await tracker.track(testFile1);
      await tracker.track(testFile2);
      
      expect(tracker.getTrackedFileCount()).toBe(2);
      
      tracker.clear();
      
      expect(tracker.getTrackedFileCount()).toBe(0);
      expect(tracker.getChanges()).toEqual([]);
    });
  });

  describe('untrack', () => {
    it('should remove specific file from tracking', async () => {
      await tracker.track(testFile1);
      await tracker.track(testFile2);
      
      expect(tracker.getTrackedFileCount()).toBe(2);
      
      tracker.untrack(testFile1);
      
      expect(tracker.getTrackedFileCount()).toBe(1);
      expect(tracker.isTracked(testFile1)).toBe(false);
      expect(tracker.isTracked(testFile2)).toBe(true);
    });
  });

  describe('updateTracking', () => {
    it('should update tracking information for existing file', async () => {
      await tracker.track(testFile1);
      const originalInfo = tracker.getChangeInfo(testFile1);
      
      // Modify file
      await fs.promises.writeFile(testFile1, 'Updated content');
      
      await tracker.updateTracking(testFile1);
      const updatedInfo = tracker.getChangeInfo(testFile1);
      
      expect(updatedInfo?.hash).not.toBe(originalInfo?.hash);
    });
  });

  describe('getChangedFiles', () => {
    it('should return all files when none are tracked', async () => {
      const files = [testFile1, testFile2];
      const changedFiles = await tracker.getChangedFiles(files);
      
      expect(changedFiles).toEqual(files);
    });

    it('should return only changed files', async () => {
      await tracker.track(testFile1);
      await tracker.track(testFile2);
      
      // Modify only testFile1
      await fs.promises.writeFile(testFile1, 'Modified content');
      
      const files = [testFile1, testFile2];
      const changedFiles = await tracker.getChangedFiles(files);
      
      expect(changedFiles).toEqual([testFile1]);
    });

    it('should include files that cannot be checked', async () => {
      const nonExistentFile = path.join(tempDir, 'non-existent.txt');
      const files = [testFile1, nonExistentFile];
      
      await tracker.track(testFile1);
      
      const changedFiles = await tracker.getChangedFiles(files);
      
      expect(changedFiles).toContain(nonExistentFile);
      expect(changedFiles).not.toContain(testFile1);
    });
  });

  describe('trackMultiple', () => {
    it('should track multiple files successfully', async () => {
      const files = [testFile1, testFile2];
      const trackedFiles = await tracker.trackMultiple(files);
      
      expect(trackedFiles).toEqual(files);
      expect(tracker.getTrackedFileCount()).toBe(2);
    });

    it('should continue tracking other files when one fails', async () => {
      const nonExistentFile = path.join(tempDir, 'non-existent.txt');
      const files = [testFile1, nonExistentFile, testFile2];
      
      // Mock console.warn to avoid test output
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const trackedFiles = await tracker.trackMultiple(files);
      
      expect(trackedFiles).toEqual([testFile1, testFile2]);
      expect(tracker.getTrackedFileCount()).toBe(2);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to track file')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('hash calculation', () => {
    it('should generate consistent hashes for same content', async () => {
      const content = 'Test content for hash calculation';
      
      await fs.promises.writeFile(testFile1, content);
      await fs.promises.writeFile(testFile2, content);
      
      await tracker.track(testFile1);
      await tracker.track(testFile2);
      
      const info1 = tracker.getChangeInfo(testFile1);
      const info2 = tracker.getChangeInfo(testFile2);
      
      expect(info1?.hash).toBe(info2?.hash);
    });

    it('should generate different hashes for different content', async () => {
      await fs.promises.writeFile(testFile1, 'Content 1');
      await fs.promises.writeFile(testFile2, 'Content 2');
      
      await tracker.track(testFile1);
      await tracker.track(testFile2);
      
      const info1 = tracker.getChangeInfo(testFile1);
      const info2 = tracker.getChangeInfo(testFile2);
      
      expect(info1?.hash).not.toBe(info2?.hash);
    });
  });

  describe('edge cases', () => {
    it('should handle empty files', async () => {
      const emptyFile = path.join(tempDir, 'empty.txt');
      await fs.promises.writeFile(emptyFile, '');
      
      await tracker.track(emptyFile);
      
      const info = tracker.getChangeInfo(emptyFile);
      expect(info?.size).toBe(0);
      expect(info?.hash).toBeDefined();
    });

    it('should handle large files', async () => {
      const largeFile = path.join(tempDir, 'large.txt');
      const largeContent = 'x'.repeat(10000); // 10KB file
      
      await fs.promises.writeFile(largeFile, largeContent);
      await tracker.track(largeFile);
      
      const info = tracker.getChangeInfo(largeFile);
      expect(info?.size).toBe(10000);
      expect(info?.hash).toBeDefined();
    });
  });
});
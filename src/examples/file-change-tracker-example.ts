import { FileChangeTracker } from '../core/file-change-tracker';

/**
 * Example demonstrating FileChangeTracker usage
 */
async function demonstrateFileChangeTracker() {
  const tracker = new FileChangeTracker();
  
  console.log('=== FileChangeTracker Example ===\n');
  
  const testFiles = ['global_rules.md', 'global_mcp.json'];
  
  try {
    // 1. Track multiple files
    console.log('1. Tracking files...');
    const trackedFiles = await tracker.trackMultiple(testFiles);
    console.log(`Successfully tracked ${trackedFiles.length} files:`);
    trackedFiles.forEach(file => console.log(`  - ${file}`));
    console.log();
    
    // 2. Check tracking status
    console.log('2. Checking tracking status...');
    console.log(`Total tracked files: ${tracker.getTrackedFileCount()}`);
    testFiles.forEach(file => {
      console.log(`  ${file}: ${tracker.isTracked(file) ? 'TRACKED' : 'NOT TRACKED'}`);
    });
    console.log();
    
    // 3. Check for changes
    console.log('3. Checking for changes...');
    for (const file of testFiles) {
      try {
        const hasChanged = await tracker.hasChanged(file);
        console.log(`  ${file}: ${hasChanged ? 'CHANGED' : 'UNCHANGED'}`);
      } catch (error) {
        console.log(`  ${file}: ERROR - ${error}`);
      }
    }
    console.log();
    
    // 4. Get all changes
    console.log('4. Getting all changes...');
    const changedFiles = await tracker.getChangedFiles(testFiles);
    if (changedFiles.length > 0) {
      console.log(`Found ${changedFiles.length} changed files:`);
      changedFiles.forEach(file => console.log(`  - ${file}`));
    } else {
      console.log('No changes detected.');
    }
    console.log();
    
    // 5. Demonstrate untracking
    console.log('5. Untracking a file...');
    if (trackedFiles.length > 0) {
      const fileToUntrack = trackedFiles[0];
      tracker.untrack(fileToUntrack);
      console.log(`Untracked: ${fileToUntrack}`);
      console.log(`Remaining tracked files: ${tracker.getTrackedFileCount()}`);
    }
    console.log();
    
    // 6. Clear all tracking
    console.log('6. Clearing all tracking...');
    tracker.clear();
    console.log(`Tracked files after clear: ${tracker.getTrackedFileCount()}`);
    
  } catch (error) {
    console.error('Error during demonstration:', error);
  }
}

/**
 * Example of using FileChangeTracker in a sync workflow
 */
async function syncWorkflowExample() {
  const tracker = new FileChangeTracker();
  
  console.log('\n=== Sync Workflow Example ===\n');
  
  const sourceFiles = ['global_rules.md', 'global_mcp.json'];
  
  try {
    // Initial tracking
    console.log('Setting up initial file tracking...');
    await tracker.trackMultiple(sourceFiles);
    
    // Simulate a sync check workflow
    console.log('Checking for changes before sync...');
    const changedFiles = await tracker.getChangedFiles(sourceFiles);
    
    if (changedFiles.length > 0) {
      console.log(`Found ${changedFiles.length} changed files:`);
      changedFiles.forEach(file => console.log(`  - ${file}`));
      
      // In a real sync workflow, you would:
      // 1. Process each changed file
      // 2. Copy/sync to target locations
      // 3. Update tracking after successful sync
      
      console.log('Simulating sync process...');
      for (const file of changedFiles) {
        console.log(`  Processing ${file}...`);
        // Simulate sync work
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Update tracking after successful sync
        await tracker.updateTracking(file);
        console.log(`  Updated tracking for ${file}`);
      }
      
      console.log('Sync completed successfully!');
    } else {
      console.log('No changes detected, skipping sync.');
    }
    
  } catch (error) {
    console.error('Error in sync workflow:', error);
  }
}

// Export functions for use in other modules
export {
  demonstrateFileChangeTracker,
  syncWorkflowExample
};

// Run examples if this file is executed directly
if (require.main === module) {
  (async () => {
    await demonstrateFileChangeTracker();
    await syncWorkflowExample();
  })().catch(console.error);
}
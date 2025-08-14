#!/usr/bin/env node

import { GlobalConfiguration } from './core/global-config';

/**
 * Post-installation script for ai-context-sync
 * This script runs after npm/pnpm install and sets up global configuration
 */
async function postInstall(): Promise<void> {
  try {
    // Check if we're being installed globally
    const isGlobalInstall = process.env.npm_config_global === 'true' || 
                           process.env.npm_config_prefix !== undefined ||
                           process.argv.includes('--global') ||
                           process.argv.includes('-g');

    if (isGlobalInstall) {
      console.log('✅ ai-context-sync installed globally!');
      console.log('To set up global configuration files in a project, run:');
      console.log('  ai-context-sync init --global');
    } else {
      console.log('✅ ai-context-sync installed locally!');
      console.log('To set up project configuration, run:');
      console.log('  ai-context-sync init');
      console.log('To create global configuration files, run:');
      console.log('  ai-context-sync init --global');
    }
  } catch (error) {
    // Don't fail the installation
    console.warn('Post-install completed with warnings:', error instanceof Error ? error.message : String(error));
  }
}

// Only run if this script is executed directly (not imported)
if (require.main === module) {
  postInstall().catch(error => {
    console.error('Post-install script failed:', error);
    // Exit with 0 to not fail the installation
    process.exit(0);
  });
}

export { postInstall };
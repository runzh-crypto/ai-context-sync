#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { Syncer } from './core/syncer';
import { SyncManager } from './core/SyncManager';
import { ConfigLoader } from './config/loader';
import { SyncMode } from './types';

const program = new Command();

program
  .name('aisync')
  .description('Sync AI tool configurations and rules files to multiple project directories')
  .version('1.0.0')
  .addHelpText('after', `
Examples:
  $ aisync sync                           # Sync with default config (incremental mode)
  $ aisync sync --mode full               # Full sync (replace all files)
  $ aisync sync --mode incremental        # Incremental sync (only changed files)
  $ aisync sync --verbose                 # Detailed output
  $ aisync sync -c custom.config.json     # Use custom config file
  $ aisync init                           # Create default project config
  $ aisync init --global                  # Create global config files
  $ aisync init --template basic          # Use specific template

Sync Modes:
  full         Complete replacement of target files (slower but thorough)
  incremental  Only sync files that have changed (faster, default)

Supported AI Tools:
  - Kiro (.kiro/steering/, .kiro/settings/)
  - Cursor (.cursor/)
  - VSCode (.vscode/)
  - Claude Code (.claudecode/rules/, .claudecode/config/)
  - Gemini CLI (.gemini/prompts/, .gemini/mcp/)
`);

program
  .command('sync')
  .description('Execute synchronization operation')
  .option('-c, --config <path>', 'Configuration file path', './aisync.config.json')
  .option('-m, --mode <mode>', 'Sync mode: full (complete replacement) or incremental (only changed files)', 'incremental')
  .option('-v, --verbose', 'Enable verbose output with detailed information')
  .action(async (options) => {
    try {
      if (options.verbose) {
        console.log(chalk.blue('🚀 Starting sync...'));
        console.log(chalk.gray(`Config file: ${options.config}`));
        console.log(chalk.gray(`Sync mode: ${options.mode}`));
      } else {
        console.log(chalk.blue('🚀 Starting sync...'));
      }
      
      const config = await ConfigLoader.load(options.config);
      
      // Override config mode if specified via CLI
      if (options.mode) {
        const mode = options.mode.toLowerCase();
        if (mode === 'full' || mode === 'incremental') {
          config.mode = mode === 'full' ? SyncMode.FULL : SyncMode.INCREMENTAL;
          if (options.verbose) {
            console.log(chalk.gray(`Mode overridden to: ${config.mode}`));
          }
        } else {
          console.error(chalk.red('❌ Invalid sync mode. Use "full" or "incremental"'));
          process.exit(1);
        }
      }

      // Use SyncManager for new config format, fallback to Syncer for legacy
      let result;
      if ('mode' in config && config.mode) {
        // New config format with SyncManager
        const syncManager = new SyncManager(config);
        result = await syncManager.sync();
        
        // Initialize tracking after successful sync for incremental mode
        if (result.success && config.mode === SyncMode.INCREMENTAL) {
          await syncManager.initializeTracking();
        }
      } else {
        // Legacy config format with Syncer
        const syncer = new Syncer(config);
        result = await syncer.sync();
      }

      if (result.success) {
        console.log(chalk.green('✅ ' + result.message));
        if (options.verbose && result.files?.length) {
          console.log(chalk.gray('Synced files:'));
          result.files.forEach((file: string) => console.log(chalk.gray(`  - ${file}`)));
        } else if (!options.verbose && result.files?.length) {
          console.log(chalk.gray(`${result.files.length} files synced`));
        }
        
        if (options.verbose) {
          console.log(chalk.gray(`Duration: ${result.duration}ms`));
          console.log(chalk.gray(`Completed at: ${result.timestamp.toISOString()}`));
        }
      } else {
        console.log(chalk.red('❌ ' + result.message));
        if (result.errors?.length) {
          if (options.verbose) {
            console.log(chalk.red('Errors:'));
            result.errors.forEach((error: string) => console.log(chalk.red(`  - ${error}`)));
          } else {
            console.log(chalk.red(`${result.errors.length} errors occurred. Use --verbose for details.`));
          }
        }
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('❌ Sync failed:'), error);
      if (options.verbose) {
        console.error(chalk.red('Stack trace:'), error);
      }
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Create default configuration file and global config files')
  .option('-o, --output <path>', 'Output path for config file', './aisync.config.json')
  .option('-g, --global', 'Create global_rules.md and global_mcp.json files')
  .option('-t, --template <name>', 'Configuration template to use (basic, minimal, multi-tool)', 'basic')
  .option('-v, --verbose', 'Enable verbose output')
  .action(async (options) => {
    try {
      if (options.verbose) {
        console.log(chalk.blue('🔧 Initializing AiSync configuration...'));
        console.log(chalk.gray(`Template: ${options.template}`));
        console.log(chalk.gray(`Output: ${options.output}`));
        console.log(chalk.gray(`Global files: ${options.global ? 'Yes' : 'No'}`));
      }

      // Create global configuration files if requested
      if (options.global) {
        const { GlobalConfiguration } = await import('./core/global-config');
        const globalConfig = GlobalConfiguration.getInstance();
        
        console.log(chalk.blue('📁 Creating global configuration files...'));
        await globalConfig.createDefaults();
        
        if (options.verbose) {
          console.log(chalk.green('✅ Global configuration files created!'));
          console.log(chalk.gray(`Global rules file: ${globalConfig.getRulesPath()}`));
          console.log(chalk.gray(`Global MCP config: ${globalConfig.getMcpPath()}`));
        } else {
          console.log(chalk.green('✅ Global files created'));
        }
      }

      // Create project configuration based on template
      let config;
      if (options.template && options.template !== 'basic') {
        if (options.verbose) {
          console.log(chalk.blue(`📋 Creating configuration from template: ${options.template}`));
        }
        
        try {
          config = await ConfigLoader.createTemplate(options.template);
        } catch (error) {
          console.warn(chalk.yellow(`⚠️  Template '${options.template}' not found, using default template`));
          config = null;
        }
      }

      if (!config) {
        // Create default configuration
        const creationOptions = {
          template: options.template === 'basic' ? undefined : options.template,
          globalConfig: options.global
        };
        
        if (options.verbose) {
          console.log(chalk.blue('📋 Creating default configuration...'));
        }
        
        await ConfigLoader.createDefault(options.output, creationOptions);
      } else {
        // Save template-based configuration
        await ConfigLoader.save(config, options.output);
      }

      console.log(chalk.green(`✅ Configuration file created: ${options.output}`));
      
      if (options.verbose) {
        console.log(chalk.gray('\nConfiguration details:'));
        const loadedConfig = await ConfigLoader.load(options.output);
        console.log(chalk.gray(`  Sources: ${loadedConfig.sources.length} files`));
        console.log(chalk.gray(`  Targets: ${loadedConfig.targets.length} AI tools`));
        console.log(chalk.gray(`  Mode: ${loadedConfig.mode}`));
        
        console.log(chalk.gray('\nConfigured AI tools:'));
        loadedConfig.targets.forEach((target: any) => {
          const status = target.enabled !== false ? '✓' : '✗';
          console.log(chalk.gray(`  ${status} ${target.name} (${target.type})`));
        });
      }

      console.log(chalk.gray('\nNext steps:'));
      if (!options.global) {
        console.log(chalk.gray('1. Create global files: aisync init --global'));
      } else {
        console.log(chalk.gray('1. Customize global_rules.md and global_mcp.json files'));
      }
      console.log(chalk.gray('2. Review and customize the configuration file'));
      console.log(chalk.gray('3. Run "aisync sync" to sync files to AI tool directories'));
      
      if (options.verbose) {
        console.log(chalk.gray('\nAvailable templates:'));
        console.log(chalk.gray('  basic     - Standard configuration with common AI tools'));
        console.log(chalk.gray('  minimal   - Minimal configuration with only Kiro support'));
        console.log(chalk.gray('  multi-tool - Full configuration with all supported AI tools'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize configuration:'), error);
      if (options.verbose) {
        console.error(chalk.red('Stack trace:'), error);
      }
      process.exit(1);
    }
  });

program.parse();
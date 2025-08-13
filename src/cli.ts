#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { Syncer } from './core/syncer';
import { ConfigLoader } from './config/loader';

const program = new Command();

program
  .name('aisync')
  .description('Sync AI tool configurations and rules files to multiple project directories')
  .version('1.0.0');

program
  .command('sync')
  .description('Execute synchronization operation')
  .option('-c, --config <path>', 'Configuration file path', './aisync.config.json')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 Starting sync...'));
      
      const config = await ConfigLoader.load(options.config);
      const syncer = new Syncer(config);
      const result = await syncer.sync();

      if (result.success) {
        console.log(chalk.green('✅ ' + result.message));
        if (result.files?.length) {
          console.log(chalk.gray('Synced files:'));
          result.files.forEach(file => console.log(chalk.gray(`  - ${file}`)));
        }
      } else {
        console.log(chalk.red('❌ ' + result.message));
        if (result.errors?.length) {
          result.errors.forEach(error => console.log(chalk.red(`  ${error}`)));
        }
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('❌ Sync failed:'), error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Create default configuration file')
  .option('-o, --output <path>', 'Output path', './aisync.config.json')
  .option('-g, --global', 'Create global_rules.md and global_mcp.json files')
  .option('-t, --template <name>', 'Configuration template to use')
  .action(async (options) => {
    try {
      if (options.global) {
        // Create global configuration files in current project
        const { GlobalConfiguration } = await import('./core/global-config');
        const globalConfig = GlobalConfiguration.getInstance();
        
        console.log(chalk.blue('📁 Creating global configuration files...'));
        await globalConfig.createDefaults();
        
        console.log(chalk.green('✅ Global configuration files created!'));
        console.log(chalk.gray(`Global rules file: ${globalConfig.getRulesPath()}`));
        console.log(chalk.gray(`Global MCP config: ${globalConfig.getMcpPath()}`));
        console.log(chalk.gray('\nNext steps:'));
        console.log(chalk.gray('1. Customize the global_rules.md and global_mcp.json files'));
        console.log(chalk.gray('2. Run "aisync init" to create project configuration'));
        console.log(chalk.gray('3. Run "aisync sync" to sync to AI tool directories'));
      } else {
        // Create local project configuration
        await ConfigLoader.createDefault(options.output);
        console.log(chalk.green(`✅ Configuration file created: ${options.output}`));
        console.log(chalk.gray('\nNext steps:'));
        console.log(chalk.gray('1. Review and customize the configuration'));
        console.log(chalk.gray('2. Ensure global_rules.md and global_mcp.json exist (run "aisync init --global" if needed)'));
        console.log(chalk.gray('3. Run "aisync sync" to sync files to AI tool directories'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to create configuration file:'), error);
      process.exit(1);
    }
  });

program.parse();
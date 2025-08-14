import * as fs from 'fs-extra';
import * as path from 'path';
import { GlobalConfig } from '../types';

/**
 * GlobalConfiguration singleton class for managing global configuration
 * Handles creation and management of global configuration directory and default files
 */
export class GlobalConfiguration {
  private static instance: GlobalConfiguration;
  private globalPath: string;
  private config: GlobalConfig;

  private constructor() {
    // Initialize global configuration path in current working directory
    this.globalPath = process.cwd();
    this.config = {
      rulesFile: path.join(this.globalPath, 'global_rules.md'),
      mcpFile: path.join(this.globalPath, 'global_mcp.json')
    };
  }

  /**
   * Get singleton instance of GlobalConfiguration
   */
  public static getInstance(): GlobalConfiguration {
    if (!GlobalConfiguration.instance) {
      GlobalConfiguration.instance = new GlobalConfiguration();
    }
    return GlobalConfiguration.instance;
  }

  /**
   * Get the global configuration directory path
   */
  public getGlobalPath(): string {
    return this.globalPath;
  }

  /**
   * Get the global rules file path
   */
  public getRulesPath(): string {
    return this.config.rulesFile;
  }

  /**
   * Get the global MCP configuration file path
   */
  public getMcpPath(): string {
    return this.config.mcpFile;
  }

  /**
   * Get the complete global configuration object
   */
  public getConfig(): GlobalConfig {
    return { ...this.config };
  }

  /**
   * Create default global configuration files in the current project directory
   * This method creates global_rules.md and global_mcp.json in the project root
   */
  public async createDefaults(silent: boolean = false): Promise<void> {
    try {
      // Ensure the directory exists
      await fs.ensureDir(this.globalPath);

      // Create default global_rules.md if it doesn't exist
      await this.createDefaultRulesFile(silent);

      // Create default global_mcp.json if it doesn't exist
      await this.createDefaultMcpFile(silent);

      if (!silent) {
        console.log(`Global configuration files created in project directory: ${this.globalPath}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create default global configuration: ${errorMessage}`);
    }
  }

  /**
   * Create default global_rules.md file
   */
  private async createDefaultRulesFile(silent: boolean = false): Promise<void> {
    const rulesPath = this.getRulesPath();
    
    // Only create if file doesn't exist
    if (await fs.pathExists(rulesPath)) {
      return;
    }

    const defaultRulesContent = `# Global AI Rules

## Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Write comprehensive tests
- Use meaningful variable and function names
- Keep functions small and focused

## Documentation
- Document all public APIs
- Include usage examples in README
- Keep documentation up to date
- Use JSDoc comments for complex functions

## Best Practices
- Follow SOLID principles
- Write unit tests for all business logic
- Use dependency injection where appropriate
- Handle errors gracefully
- Log important operations

## Project Structure
- Organize code into logical modules
- Separate concerns (business logic, data access, UI)
- Use consistent naming conventions
- Keep configuration files organized

## Git Workflow
- Write clear commit messages
- Use feature branches for new development
- Review code before merging
- Keep commits atomic and focused

## AI Development Guidelines
- Be explicit about requirements and constraints
- Provide context for complex business logic
- Ask for clarification when requirements are unclear
- Test AI-generated code thoroughly
`;

    await fs.writeFile(rulesPath, defaultRulesContent, 'utf8');
    if (!silent) {
      console.log(`Created default global rules file: ${rulesPath}`);
    }
  }

  /**
   * Create default global_mcp.json file
   */
  private async createDefaultMcpFile(silent: boolean = false): Promise<void> {
    const mcpPath = this.getMcpPath();
    
    // Only create if file doesn't exist
    if (await fs.pathExists(mcpPath)) {
      return;
    }

    const defaultMcpConfig = {
      mcpServers: {
        "filesystem": {
          "command": "uvx",
          "args": ["mcp-server-filesystem", "--"],
          "env": {
            "FASTMCP_LOG_LEVEL": "ERROR"
          },
          "disabled": false,
          "autoApprove": []
        },
        "git": {
          "command": "uvx", 
          "args": ["mcp-server-git", "--repository", "."],
          "env": {
            "FASTMCP_LOG_LEVEL": "ERROR"
          },
          "disabled": false,
          "autoApprove": []
        }
      }
    };

    await fs.writeFile(mcpPath, JSON.stringify(defaultMcpConfig, null, 2), 'utf8');
    if (!silent) {
      console.log(`Created default global MCP configuration: ${mcpPath}`);
    }
  }

  /**
   * Check if global configuration files exist in the project
   */
  public async exists(): Promise<boolean> {
    const rulesExist = await this.rulesFileExists();
    const mcpExist = await this.mcpFileExists();
    return rulesExist || mcpExist;
  }

  /**
   * Check if global rules file exists
   */
  public async rulesFileExists(): Promise<boolean> {
    return await fs.pathExists(this.getRulesPath());
  }

  /**
   * Check if global MCP file exists
   */
  public async mcpFileExists(): Promise<boolean> {
    return await fs.pathExists(this.getMcpPath());
  }

  /**
   * Reset global configuration (for testing purposes)
   * WARNING: This will delete global configuration files
   */
  public async reset(): Promise<void> {
    if (await this.rulesFileExists()) {
      await fs.remove(this.getRulesPath());
    }
    if (await this.mcpFileExists()) {
      await fs.remove(this.getMcpPath());
    }
  }

  /**
   * Update global configuration path (for testing purposes)
   */
  public setGlobalPath(newPath: string): void {
    this.globalPath = newPath;
    this.config = {
      rulesFile: path.join(this.globalPath, 'global_rules.md'),
      mcpFile: path.join(this.globalPath, 'global_mcp.json')
    };
  }
}
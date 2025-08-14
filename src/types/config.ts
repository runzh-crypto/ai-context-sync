import {
  SyncMode,
  TargetConfig,
  SyncConfig,
} from "./index";

/**
 * Configuration validation and creation utilities
 */
export interface ConfigValidationOptions {
  strict?: boolean;
  allowMissingTargets?: boolean;
  validatePaths?: boolean;
}

/**
 * Default configuration templates
 */
export interface ConfigTemplate {
  name: string;
  description: string;
  config: Partial<SyncConfig>;
}

/**
 * Configuration creation options
 */
export interface ConfigCreationOptions {
  template?: string;
  sources?: string[];
  targets?: TargetConfig[];
  mode?: SyncMode;
  globalConfig?: boolean;
}

/**
 * Extended sync configuration with metadata
 */
export interface ExtendedSyncConfig extends SyncConfig {
  version?: string;
  created?: Date;
  lastModified?: Date;
  metadata?: Record<string, any>;
}

/**
 * Configuration schema for validation
 */
export interface ConfigSchema {
  sources: {
    required: boolean;
    type: "array";
    items: {
      type: "string";
      pattern?: string;
    };
  };
  targets: {
    required: boolean;
    type: "array";
    items: {
      type: "object";
      properties: Record<string, any>;
    };
  };
  mode: {
    required: boolean;
    type: "string";
    enum: SyncMode[];
  };
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<SyncConfig> = {
  mode: SyncMode.INCREMENTAL,
  sources: ["./global_rules.md", "./global_mcp.json"],
};

/**
 * Default target configurations for common AI tools
 * Based on official documentation paths
 * Each tool includes both rules and MCP configuration where applicable
 */
export const DEFAULT_TARGETS: Record<string, Partial<TargetConfig>> = {
  'kiro': {
    type: 'kiro',
    path: ".",
    mapping: [
      {
        source: "global_rules.md",
        destination: ".kiro/steering/rules.md",
      },
      {
        source: "global_mcp.json",
        destination: ".kiro/settings/mcp.json",
      },
    ],
  },
  'cursor': {
    type: 'cursor',
    path: ".",
    mapping: [
      {
        source: "global_rules.md",
        destination: ".cursor/rules/global_rules.md",
      },
      {
        source: "global_mcp.json",
        destination: ".cursor/mcp.json",
      },
    ],
  },
  'vscode': {
    type: 'vscode',
    path: ".",
    mapping: [
      {
        source: "global_rules.md",
        destination: ".vscode/instructions.md",
      },
      {
        source: "global_mcp.json",
        destination: ".vscode/settings.json",
      },
    ],
  },
  'claudecode': {
    type: 'claudecode',
    path: ".",
    mapping: [
      {
        source: "global_rules.md",
        destination: ".claudecode/claudecode.md",
      },
      {
        source: "global_mcp.json",
        destination: ".claudecode/mcp.json",
      },
    ],
  },
  'gemini-cli': {
    type: 'gemini-cli',
    path: ".",
    mapping: [
      {
        source: "global_rules.md",
        destination: ".gemini/gemini.md",
      },
      {
        source: "global_mcp.json",
        destination: ".gemini/settings.json",
      },
    ],
  },
  'custom': {
    type: 'custom',
    path: ".",
    mapping: [],
  },
};

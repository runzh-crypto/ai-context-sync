import {
  AIToolType,
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
 */
export const DEFAULT_TARGETS: Record<AIToolType, Partial<TargetConfig>> = {
  [AIToolType.KIRO]: {
    type: AIToolType.KIRO,
    path: ".kiro",
    mapping: [
      {
        source: "global_rules.md",
        destination: "steering/rules.md",
      },
      {
        source: "global_mcp.json",
        destination: "settings/mcp.json",
      },
    ],
  },
  [AIToolType.CURSOR]: {
    type: AIToolType.CURSOR,
    path: ".cursor",
    mapping: [
      {
        source: "global_rules.md",
        destination: "rules.md",
      },
      {
        source: "global_mcp.json",
        destination: "mcp.json",
      },
    ],
  },
  [AIToolType.VSCODE]: {
    type: AIToolType.VSCODE,
    path: ".vscode",
    mapping: [
      {
        source: "global_rules.md",
        destination: "rules.md",
      },
    ],
  },
  [AIToolType.CLAUDECODE]: {
    type: AIToolType.CLAUDECODE,
    path: ".claudecode",
    mapping: [
      {
        source: "global_rules.md",
        destination: "rules/claude-rules.md",
      },
      {
        source: "global_mcp.json",
        destination: "config/mcp.json",
      },
    ],
  },
  [AIToolType.GEMINI_CLI]: {
    type: AIToolType.GEMINI_CLI,
    path: ".gemini",
    mapping: [
      {
        source: "global_rules.md",
        destination: "prompts/gemini-rules.md",
      },
      {
        source: "global_mcp.json",
        destination: "mcp/config.json",
      },
    ],
  },

  [AIToolType.CUSTOM]: {
    type: AIToolType.CUSTOM,
    path: "",
    mapping: [],
  },
};

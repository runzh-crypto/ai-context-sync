# Configuration System Documentation

## Overview

The AiSync configuration system supports multiple AI tools and provides flexible file mapping capabilities. It supports both legacy and new configuration formats for backward compatibility.

## Configuration Formats

### New Format (Recommended)

The new configuration format provides enhanced flexibility and supports multiple AI tools:

```json
{
  "sources": ["./global_rules.md", "./global_mcp.json"],
  "targets": [
    {
      "name": "kiro",
      "type": "kiro",
      "path": ".kiro",
      "enabled": true,
      "mapping": [
        {
          "source": "global_rules.md",
          "destination": "steering/rules.md"
        }
      ]
    }
  ],
  "mode": "incremental",
  "watch": {
    "enabled": false,
    "interval": 1000,
    "debounce": 500
  },
  "global": {
    "rulesFile": "global_rules.md",
    "mcpFile": "global_mcp.json",
    "installPath": "~/.aisync"
  }
}
```

### Legacy Format (Backward Compatible)

The legacy format is still supported for existing configurations:

```json
{
  "sourceDir": "./templates",
  "targetDirs": ["../project1", "../project2"],
  "steering": {
    "enabled": true,
    "patterns": ["**/*.md", "**/*.json"],
    "exclude": ["node_modules/**", ".git/**"]
  },
  "mcp": {
    "enabled": true,
    "configFile": "mcp.json"
  }
}
```

## Configuration Schema

### SyncConfig Interface

```typescript
interface SyncConfig {
  sources: string[];           // Source files to sync
  targets: TargetConfig[];     // Target configurations
  mode: SyncMode;             // Sync mode: 'full' | 'incremental' | 'watch'
  watch?: WatchConfig;        // Watch configuration (optional)
  global?: GlobalConfig;      // Global configuration (optional)
}
```

### TargetConfig Interface

```typescript
interface TargetConfig {
  name: string;               // Target name
  type: AIToolType;          // AI tool type
  path: string;              // Target path
  mapping?: FileMapping[];   // File mappings (optional)
  enabled?: boolean;         // Enable/disable target (optional)
}
```

### FileMapping Interface

```typescript
interface FileMapping {
  source: string;            // Source file path
  destination: string;       // Destination file path
  transform?: TransformRule[]; // Transformation rules (optional)
}
```

## Supported AI Tools

### AIToolType Enum

- `KIRO`: Kiro IDE (`.kiro/`)
- `CURSOR`: Cursor IDE (`.cursor/`)
- `VSCODE`: Visual Studio Code (`.vscode/`)
- `MCP`: Model Context Protocol (`.mcp/`)
- `CUSTOM`: Custom tool with user-defined paths

## Sync Modes

### SyncMode Enum

- `FULL`: Complete replacement of target files
- `INCREMENTAL`: Update only changed files
- `WATCH`: Real-time file watching and synchronization

## Configuration Templates

The system provides built-in templates for common use cases:

### Minimal Template
Basic single-tool setup for Kiro IDE.

### Multi-tool Template
Comprehensive setup supporting multiple AI tools with global configuration.

### Watch Mode Template
Real-time synchronization with file watching enabled.

## Validation

The configuration system includes comprehensive validation:

- Required field validation
- Type checking for all configuration options
- AI tool type validation
- File mapping validation
- Watch configuration validation
- Global configuration validation

## Migration

Legacy configurations are automatically detected and converted to the new format when loaded. The system provides warnings when legacy format is detected and suggests migration to the new format.

## Error Handling

The system provides detailed error messages for configuration issues:

- `CONFIG_ERROR`: Configuration file errors
- `FILE_ERROR`: File operation errors
- `PERMISSION_ERROR`: Permission-related errors
- `NETWORK_ERROR`: Network-related errors
- `VALIDATION_ERROR`: Configuration validation errors

## Usage Examples

### Programmatic Usage

```typescript
import { ConfigLoader, ConfigValidator, Syncer } from 'aisync';

// Load configuration
const config = await ConfigLoader.load('./config.json');

// Validate configuration
const validation = ConfigValidator.validate(config);
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
}

// Create syncer and execute
const syncer = new Syncer(config);
const result = await syncer.sync();
```

### CLI Usage

```bash
# Initialize configuration
aisync init

# Sync with default configuration
aisync sync

# Sync with custom configuration
aisync sync -c ./my-config.json
```
# AISync

CLI tool for syncing AI tool configurations and rules files across multiple AI development environments.

## Overview

AISync provides a simple, configuration-driven approach to keep your AI tool settings synchronized across different IDEs and AI assistants. Instead of manually copying configuration files to each AI tool's directory, AISync uses a single `aisync.config.json` file to define how files should be mapped and synced.

## Key Features

- **Configuration-Driven**: Everything is controlled by `aisync.config.json` - no hardcoded paths or tool-specific logic
- **Universal AI Tool Support**: Works with any AI tool by specifying custom file mappings
- **Two Sync Modes**: Full sync (clean slate) and incremental sync (only changed files)
- **Intelligent Change Detection**: Tracks file modifications for efficient incremental syncing
- **Flexible File Mapping**: Map any source file to any destination path

## Installation

```bash
npm install -g aisync
```

## Quick Start

1. Initialize configuration:
```bash
aisync init
```

2. Edit `aisync.config.json` to match your needs
3. Run sync:
```bash
aisync sync
```

## Configuration

The core concept is simple: define source files and map them to destination paths for each AI tool.

### Basic Configuration Example

```json
{
  "sources": [
    "./global_rules.md",
    "./global_mcp.json"
  ],
  "targets": [
    {
      "name": "kiro",
      "type": "kiro",
      "path": ".",
      "mapping": [
        {
          "source": "global_rules.md",
          "destination": ".kiro/steering/global_rules.md"
        },
        {
          "source": "global_mcp.json",
          "destination": ".kiro/settings/mcp.json"
        }
      ],
      "enabled": true
    },
    {
      "name": "cursor",
      "type": "cursor", 
      "path": ".",
      "mapping": [
        {
          "source": "global_rules.md",
          "destination": ".cursor/rules"
        }
      ],
      "enabled": true
    }
  ],
  "mode": "incremental"
}
```

### Configuration Structure

- **sources**: List of source files to sync from
- **targets**: Array of AI tool configurations
  - **name**: Friendly identifier
  - **type**: AI tool type (can be any string)
  - **path**: Base directory (usually ".")
  - **mapping**: Source-to-destination file mappings
  - **enabled**: Whether to sync to this target
- **mode**: "full" or "incremental"

## Supported AI Tools & Paths

Based on official documentation, here are the recommended paths for popular AI tools:

### Kiro
- **Rules**: `.kiro/steering/rules.md`
- **MCP Config**: `.kiro/settings/mcp.json`
- [Documentation](https://kiro.dev/docs/steering/)

### Cursor
- **Rules**: `.cursor/rules` 
- **Instructions**: `.cursor/instructions`
- [Documentation](https://docs.cursor.com/zh/context/rules)

### VSCode Copilot
- **Instructions**: `.vscode/copilot-instructions.md`
- [Documentation](https://code.visualstudio.com/docs/copilot/copilot-customization)

### Claude Code
- **Instructions**: `.claude/instructions.md`
- **Context**: `.claude/context/`
- [Documentation](https://www.anthropic.com/engineering/claude-code-best-practices)

### Gemini Code Assist
- **MCP Config**: `.gemini/mcp-config.json`
- [Documentation](https://cloud.google.com/gemini/docs/codeassist/use-agentic-chat-pair-programmer#configure-mcp-servers)

### Custom AI Tools
You can add any AI tool by specifying custom mappings:

```json
{
  "name": "my-custom-ai",
  "type": "custom-ai-v2",
  "path": ".",
  "mapping": [
    {
      "source": "global_rules.md",
      "destination": ".my-ai/config/rules.txt"
    }
  ],
  "enabled": true
}
```

## Sync Modes

### Incremental Sync (Recommended)
- Only syncs files that have changed
- Fast and efficient for regular use
- Automatically tracks file modifications

### Full Sync
- Cleans target directories and syncs all files
- Use when you want a completely fresh sync
- Useful for initial setup or troubleshooting

## Commands

### `aisync init [--template <name>]`
Creates initial configuration file. Templates available:
- `basic`: Kiro, Cursor, VSCode
- `minimal`: Kiro only  
- `multi-tool`: All supported AI tools

### `aisync sync [--mode <mode>] [--config <path>]`
Syncs files according to configuration.

### `aisync status`
Shows current sync status and tracked file changes.

## Example Workflows

### Multi-AI Development Setup
```bash
# Initialize with all AI tools
aisync init --template multi-tool

# Customize aisync.config.json for your needs
# Run initial full sync
aisync sync --mode full

# Daily incremental syncs
aisync sync
```

### Single AI Tool Setup
```bash
# Initialize minimal config
aisync init --template minimal

# Edit config to add your specific mappings
# Sync
aisync sync
```

## File Structure Example

```
project/
├── aisync.config.json          # Configuration file
├── global_rules.md             # Your global rules
├── global_mcp.json            # Your MCP configuration
├── .kiro/
│   ├── steering/
│   │   └── global_rules.md    # ← Synced from global_rules.md
│   └── settings/
│       └── mcp.json           # ← Synced from global_mcp.json
├── .cursor/
│   └── rules                  # ← Synced from global_rules.md
└── .vscode/
    └── copilot-instructions.md # ← Synced from global_rules.md
```

## Development

```bash
npm install
npm run build
npm test
npm run dev  # Watch mode
```

## License

MIT
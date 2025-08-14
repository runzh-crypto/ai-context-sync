# AI Context Sync

CLI tool for syncing AI tool configurations and rules files across multiple AI development environments.

## Overview

AI Context Sync provides a simple, configuration-driven approach to keep your AI tool settings synchronized across different IDEs and AI assistants. Instead of manually copying configuration files to each AI tool's directory, AI Context Sync uses a single `ai-context-sync.config.json` file to define how files should be mapped and synced.

## Key Features

- **Configuration-Driven**: Everything is controlled by `ai-context-sync.config.json` - no hardcoded paths or tool-specific logic
- **Universal AI Tool Support**: Works with any AI tool by specifying custom file mappings
- **Two Sync Modes**: Full sync (clean slate) and incremental sync (only changed files)
- **Intelligent Change Detection**: Tracks file modifications for efficient incremental syncing
- **Flexible File Mapping**: Map any source file to any destination path

## Installation

```bash
npm install -g ai-context-sync
```

## Quick Start

1. Initialize configuration:
```bash
ai-context-sync init
```

2. Edit `ai-context-sync.config.json` to match your needs
3. Run sync:
```bash
ai-context-sync sync
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
          "destination": ".kiro/steering/rules.md"
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
          "destination": ".cursor/rules/global_rules.md"
        },
        {
          "source": "global_mcp.json",
          "destination": ".cursor/mcp.json"
        }
      ],
      "enabled": true
    },
    {
      "name": "vscode",
      "type": "vscode",
      "path": ".",
      "mapping": [
        {
          "source": "global_rules.md",
          "destination": ".vscode/instructions.md"
        },
        {
          "source": "global_mcp.json",
          "destination": ".vscode/settings.json"
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
- **Rules**: `.cursor/rules/global_rules.md` 
- **MCP Config**: `.cursor/mcp.json`
- [Documentation](https://docs.cursor.com/zh/context/rules)

### VSCode Copilot
- **Instructions**: `.vscode/instructions.md`
- **Settings**: `.vscode/settings.json`
- [Documentation](https://code.visualstudio.com/docs/copilot/copilot-customization)

### Claude Code
- **Instructions**: `.claudecode/claudecode.md`
- **Settings**: `.claudecode/settings.json`
- [Documentation](https://www.anthropic.com/engineering/claude-code-best-practices)

### Gemini Code Assist
- **Instructions**: `.gemini/gemini.md`
- **Settings**: `.gemini/settings.json`
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

### `ai-context-sync init [--template <name>]`
Creates initial configuration file. Templates available:
- `basic`: Kiro, Cursor, VSCode
- `minimal`: Kiro only  
- `multi-tool`: All supported AI tools

### `ai-context-sync sync [--mode <mode>] [--config <path>]`
Syncs files according to configuration.

### `ai-context-sync status`
Shows current sync status and tracked file changes.

## Example Workflows

### Multi-AI Development Setup
```bash
# Initialize with all AI tools
ai-context-sync init --template multi-tool

# Customize ai-context-sync.config.json for your needs
# Run initial full sync
ai-context-sync sync --mode full

# Daily incremental syncs
ai-context-sync sync
```

### Single AI Tool Setup
```bash
# Initialize minimal config
ai-context-sync init --template minimal

# Edit config to add your specific mappings
# Sync
ai-context-sync sync
```

## File Structure Example

```
project/
├── ai-context-sync.config.json # Configuration file
├── global_rules.md             # Your global rules
├── global_mcp.json            # Your MCP configuration
├── .kiro/
│   ├── steering/
│   │   └── rules.md           # ← Synced from global_rules.md
│   └── settings/
│       └── mcp.json           # ← Synced from global_mcp.json
├── .cursor/
│   ├── rules/
│   │   └── global_rules.md    # ← Synced from global_rules.md
│   └── mcp.json               # ← Synced from global_mcp.json
├── .vscode/
│   ├── instructions.md        # ← Synced from global_rules.md
│   └── settings.json          # ← Synced from global_mcp.json
├── .claudecode/
│   ├── claudecode.md          # ← Synced from global_rules.md
│   └── settings.json          # ← Synced from global_mcp.json
└── .gemini/
    ├── gemini.md              # ← Synced from global_rules.md
    └── settings.json          # ← Synced from global_mcp.json
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
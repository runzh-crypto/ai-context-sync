# AiSync

A TypeScript CLI tool for syncing AI tool configurations and rules files to multiple project directories.

## Features

- 🔄 Sync AI tool rules files to multiple project directories
- ⚙️ Sync MCP (Model Context Protocol) configurations
- 🤖 Support for multiple AI tools (Kiro IDE, Cursor, VSCode, etc.)
- 📝 Support for custom file pattern matching
- 🎯 Full TypeScript support
- 🚀 Simple and easy-to-use CLI interface
- 🔧 Extensible configuration system
- 👀 Watch mode for real-time synchronization

## Installation

```bash
npm install -g aisync
# or
pnpm add -g aisync
```

## Usage

### 1. Initialize Configuration File

```bash
aisync init
```

This will create a default `aisync.config.json` configuration file.

### 2. Configuration File Examples

#### Legacy Format (Backward Compatible)
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

#### New Format (Recommended)
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
      "path": ".kiro",
      "enabled": true,
      "mapping": [
        {
          "source": "global_rules.md",
          "destination": "steering/rules.md"
        },
        {
          "source": "global_mcp.json",
          "destination": "settings/mcp.json"
        }
      ]
    },
    {
      "name": "cursor",
      "type": "cursor",
      "path": ".cursor",
      "enabled": true,
      "mapping": [
        {
          "source": "global_rules.md",
          "destination": "rules.md"
        }
      ]
    }
  ],
  "mode": "incremental",
  "watch": {
    "enabled": false,
    "interval": 1000,
    "debounce": 500
  }
}
```

### 3. Execute Synchronization

```bash
aisync sync
# or specify configuration file
aisync sync -c ./my-config.json
```

## Directory Structure

Target directory structure after synchronization:

```
project/
├── .kiro/
│   ├── steering/          # Rules files
│   │   ├── rules.md
│   │   └── config.json
│   └── settings/          # MCP configuration
│       └── mcp.json
├── .cursor/
│   └── rules.md           # Cursor rules
└── .vscode/
    └── rules.md           # VSCode rules
```

## Supported AI Tools

- **Kiro IDE**: `.kiro/steering/` and `.kiro/settings/`
- **Cursor**: `.cursor/`
- **VSCode**: `.vscode/`
- **MCP**: `.mcp/`
- **Custom**: User-defined paths

## Configuration Templates

The tool provides several built-in templates:

- `minimal`: Basic single-tool setup
- `multi-tool`: Support for multiple AI tools
- `watch-mode`: Real-time file watching

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Test
npm test
```

## API

The tool can also be used programmatically:

```typescript
import { Syncer, ConfigLoader, SyncConfig } from 'aisync';

const config: SyncConfig = await ConfigLoader.load('./config.json');
const syncer = new Syncer(config);
const result = await syncer.sync();
```

## Documentation

For detailed documentation, see:

- [Configuration System](./docs/configuration-system.md) - Comprehensive configuration guide
- [API Reference](./docs/api-reference.md) - Programmatic usage guide (coming soon)
- [Migration Guide](./docs/migration-guide.md) - Legacy to new format migration (coming soon)

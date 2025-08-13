import { KiroHandler, CursorHandler, ClaudeCodeHandler, GeminiCLIHandler } from '../index';
import { AIToolType, TargetConfig } from '../../../types';
import * as path from 'path';

describe('AI Tool Handlers', () => {
  describe('KiroHandler', () => {
    const handler = new KiroHandler();

    test('should handle Kiro AI tool type', () => {
      expect(handler.canHandle(AIToolType.KIRO)).toBe(true);
      expect(handler.canHandle(AIToolType.CURSOR)).toBe(false);
    });

    test('should generate correct target paths for rules files', () => {
      const target: TargetConfig = {
        name: 'kiro-test',
        type: AIToolType.KIRO,
        path: '.kiro'
      };

      const rulesPath = handler.getTargetPath(target, 'global_rules.md');
      expect(rulesPath).toBe(path.join('.kiro', 'steering', 'rules.md'));
    });

    test('should generate correct target paths for MCP config', () => {
      const target: TargetConfig = {
        name: 'kiro-test',
        type: AIToolType.KIRO,
        path: '.kiro'
      };

      const mcpPath = handler.getTargetPath(target, 'global_mcp.json');
      expect(mcpPath).toBe(path.join('.kiro', 'settings', 'mcp.json'));
    });

    test('should validate target configuration', () => {
      const validTarget: TargetConfig = {
        name: 'kiro-test',
        type: AIToolType.KIRO,
        path: '/project'
      };

      const invalidTarget: TargetConfig = {
        name: 'kiro-test',
        type: AIToolType.KIRO,
        path: ''
      };

      expect(handler.validate(validTarget)).toBe(true);
      expect(handler.validate(invalidTarget)).toBe(false);
    });
  });

  describe('CursorHandler', () => {
    const handler = new CursorHandler();

    test('should handle Cursor AI tool type', () => {
      expect(handler.canHandle(AIToolType.CURSOR)).toBe(true);
      expect(handler.canHandle(AIToolType.KIRO)).toBe(false);
    });

    test('should generate correct target paths for rules files', () => {
      const target: TargetConfig = {
        name: 'cursor-test',
        type: AIToolType.CURSOR,
        path: '.cursor'
      };

      const rulesPath = handler.getTargetPath(target, 'global_rules.md');
      expect(rulesPath).toBe(path.join('.cursor', 'cursor-rules.md'));
    });

    test('should generate correct target paths for MCP config', () => {
      const target: TargetConfig = {
        name: 'cursor-test',
        type: AIToolType.CURSOR,
        path: '.cursor'
      };

      const mcpPath = handler.getTargetPath(target, 'global_mcp.json');
      expect(mcpPath).toBe(path.join('.cursor', 'mcp.json'));
    });
  });

  describe('ClaudeCodeHandler', () => {
    const handler = new ClaudeCodeHandler();

    test('should handle Claude Code AI tool type', () => {
      expect(handler.canHandle(AIToolType.CLAUDECODE)).toBe(true);
      expect(handler.canHandle(AIToolType.KIRO)).toBe(false);
    });

    test('should generate correct target paths for rules files', () => {
      const target: TargetConfig = {
        name: 'claudecode-test',
        type: AIToolType.CLAUDECODE,
        path: '.claudecode'
      };

      const rulesPath = handler.getTargetPath(target, 'global_rules.md');
      expect(rulesPath).toBe(path.join('.claudecode', 'rules', 'claude-rules.md'));
    });

    test('should generate correct target paths for MCP config', () => {
      const target: TargetConfig = {
        name: 'claudecode-test',
        type: AIToolType.CLAUDECODE,
        path: '.claudecode'
      };

      const mcpPath = handler.getTargetPath(target, 'global_mcp.json');
      expect(mcpPath).toBe(path.join('.claudecode', 'config', 'mcp.json'));
    });
  });

  describe('GeminiCLIHandler', () => {
    const handler = new GeminiCLIHandler();

    test('should handle Gemini CLI AI tool type', () => {
      expect(handler.canHandle(AIToolType.GEMINI_CLI)).toBe(true);
      expect(handler.canHandle(AIToolType.KIRO)).toBe(false);
    });

    test('should generate correct target paths for rules files', () => {
      const target: TargetConfig = {
        name: 'gemini-test',
        type: AIToolType.GEMINI_CLI,
        path: '.gemini'
      };

      const rulesPath = handler.getTargetPath(target, 'global_rules.md');
      expect(rulesPath).toBe(path.join('.gemini', 'prompts', 'gemini-rules.md'));
    });

    test('should generate correct target paths for MCP config', () => {
      const target: TargetConfig = {
        name: 'gemini-test',
        type: AIToolType.GEMINI_CLI,
        path: '.gemini'
      };

      const mcpPath = handler.getTargetPath(target, 'global_mcp.json');
      expect(mcpPath).toBe(path.join('.gemini', 'mcp', 'config.json'));
    });
  });

  describe('MCP Configuration Processing', () => {
    test('KiroHandler should transform MCP config correctly', () => {
      const handler = new KiroHandler();
      const target: TargetConfig = {
        name: 'kiro-test',
        type: AIToolType.KIRO,
        path: '/project'
      };

      const originalConfig = JSON.stringify({
        servers: {
          'test-server': {
            command: 'test-command',
            args: ['--test']
          }
        }
      });

      const transformed = handler.transform!(originalConfig, target);
      const parsedTransformed = JSON.parse(transformed);
      
      expect(parsedTransformed.mcpServers).toBeDefined();
      expect(parsedTransformed.servers).toBeUndefined();
    });

    test('CursorHandler should transform MCP config correctly', () => {
      const handler = new CursorHandler();
      const target: TargetConfig = {
        name: 'cursor-test',
        type: AIToolType.CURSOR,
        path: '/project'
      };

      const originalConfig = JSON.stringify({
        mcpServers: {
          'test-server': {
            command: 'test-command',
            args: ['--test']
          }
        }
      });

      const transformed = handler.transform!(originalConfig, target);
      const parsedTransformed = JSON.parse(transformed);
      
      expect(parsedTransformed.servers).toBeDefined();
      expect(parsedTransformed.mcpServers).toBeUndefined();
      expect(parsedTransformed.version).toBeDefined();
    });

    test('GeminiCLIHandler should transform MCP config to tools format', () => {
      const handler = new GeminiCLIHandler();
      const target: TargetConfig = {
        name: 'gemini-test',
        type: AIToolType.GEMINI_CLI,
        path: '/project'
      };

      const originalConfig = JSON.stringify({
        mcpServers: {
          'test-server': {
            command: 'test-command',
            args: ['--test'],
            disabled: false
          }
        }
      });

      const transformed = handler.transform!(originalConfig, target);
      const parsedTransformed = JSON.parse(transformed);
      
      expect(parsedTransformed.tools).toBeDefined();
      expect(parsedTransformed.tools['test-server']).toBeDefined();
      expect(parsedTransformed.tools['test-server'].type).toBe('mcp-server');
      expect(parsedTransformed.tools['test-server'].enabled).toBe(true);
      expect(parsedTransformed.gemini).toBeDefined();
    });
  });
});
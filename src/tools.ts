import * as vscode from 'vscode';
import * as path from 'path';
import { ContextGatherer } from './contextGatherer';
import { getOutputPreview } from './terminalOutputCleaner';

/**
 * Tool execution functions for Claude
 */

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Read file contents at a given path
 */
export async function readFile(filePath: string): Promise<ToolResult> {
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return {
        success: false,
        error: 'No workspace folder open',
      };
    }

    // Resolve path relative to workspace
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(workspaceFolder.uri.fsPath, filePath);

    const uri = vscode.Uri.file(absolutePath);
    const fileData = await vscode.workspace.fs.readFile(uri);
    const content = Buffer.from(fileData).toString('utf-8');

    return {
      success: true,
      data: {
        path: filePath,
        content,
        lines: content.split('\n').length,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to read file: ${error.message}`,
    };
  }
}

/**
 * Search for text in the workspace
 */
export async function searchProject(
  searchTerm: string,
  options?: {
    filePattern?: string;
    maxResults?: number;
  }
): Promise<ToolResult> {
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return {
        success: false,
        error: 'No workspace folder open',
      };
    }

    const maxResults = options?.maxResults || 50;
    const results: Array<{
      file: string;
      line: number;
      column: number;
      text: string;
    }> = [];

    // Use VSCode's findTextInFiles API
    const searchPattern = new vscode.RelativePattern(
      workspaceFolder,
      options?.filePattern || '**/*'
    );

    const exclude = new vscode.RelativePattern(
      workspaceFolder,
      '{**/node_modules/**,**/dist/**,**/.git/**}'
    );

    // Find files matching the pattern
    const files = await vscode.workspace.findFiles(searchPattern, exclude, 1000);

    // Search each file
    for (const fileUri of files) {
      if (results.length >= maxResults) break;

      try {
        const document = await vscode.workspace.openTextDocument(fileUri);
        const text = document.getText();
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const index = line.toLowerCase().indexOf(searchTerm.toLowerCase());

          if (index !== -1) {
            results.push({
              file: vscode.workspace.asRelativePath(fileUri),
              line: i + 1,
              column: index + 1,
              text: line.trim(),
            });

            if (results.length >= maxResults) break;
          }
        }
      } catch (e) {
        // Skip files we can't read
        continue;
      }
    }

    return {
      success: true,
      data: {
        searchTerm,
        results,
        totalMatches: results.length,
        maxResultsReached: results.length >= maxResults,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Search failed: ${error.message}`,
    };
  }
}

/**
 * Get recent terminal output from last few executions
 */
export function getTerminalOutput(
  contextGatherer: ContextGatherer,
  options?: {
    maxExecutions?: number;
    maxLinesPerExecution?: number;
  }
): ToolResult {
  try {
    const terminalContext = contextGatherer.getTerminalContext();
    const maxExecutions = options?.maxExecutions || 5;
    const maxLines = options?.maxLinesPerExecution || 50;

    const executions = terminalContext.recentExecutions
      .slice(-maxExecutions)
      .map((exec) => {
        let output = exec.output || '';

        // Clean and truncate output
        const cleanedOutput = getOutputPreview(output, false, maxLines * 80); // ~80 chars per line
        const lines = cleanedOutput.split('\n').slice(0, maxLines);

        return {
          command: exec.commandLine,
          cwd: exec.cwd,
          exitCode: exec.exitCode,
          status: exec.status,
          duration: exec.endTime && exec.startTime
            ? ((exec.endTime.getTime() - exec.startTime.getTime()) / 1000).toFixed(2) + 's'
            : undefined,
          output: lines.join('\n'),
          outputTruncated: output.split('\n').length > maxLines,
        };
      });

    return {
      success: true,
      data: {
        shellIntegrationAvailable: terminalContext.shellIntegrationAvailable,
        executions,
        runningCommands: terminalContext.runningCommands.map((cmd) => ({
          command: cmd.commandLine,
          cwd: cmd.cwd,
          elapsedSeconds: Math.floor((Date.now() - cmd.startTime.getTime()) / 1000),
        })),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to get terminal output: ${error.message}`,
    };
  }
}

/**
 * Get current editor state (open tabs, active file, cursor position)
 */
export function getEditorState(contextGatherer: ContextGatherer): ToolResult {
  try {
    const editorContext = contextGatherer.getEditorContext();

    return {
      success: true,
      data: {
        activeFile: editorContext.activeFile
          ? {
              path: editorContext.activeFile.path,
              language: editorContext.activeFile.language,
              cursor: editorContext.activeFile.cursorPosition,
              selection: editorContext.activeFile.selection,
              visibleRange: editorContext.activeFile.visibleRange,
            }
          : null,
        openTabs: editorContext.openTabs.map((tab) => ({
          path: tab.path,
          isDirty: tab.isDirty,
        })),
        openTabsCount: editorContext.openTabs.length,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to get editor state: ${error.message}`,
    };
  }
}

/**
 * Tool definitions for Claude API
 */
export const TOOL_DEFINITIONS = [
  {
    name: 'read_file',
    description:
      'Read the contents of a file in the workspace. Use this to examine code, configuration files, or any text file the student is working with.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description:
            'Path to the file, relative to workspace root (e.g., "src/index.ts" or "package.json")',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_project',
    description:
      'Search for a text string across all files in the project. Use this to find where something is defined, used, or mentioned.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The text to search for',
        },
        file_pattern: {
          type: 'string',
          description:
            'Optional glob pattern to limit search (e.g., "**/*.ts" for TypeScript files only)',
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of results to return (default: 50)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_terminal_output',
    description:
      'Get the output from recent terminal commands. Use this to see errors, test results, build output, or any other terminal activity.',
    input_schema: {
      type: 'object',
      properties: {
        max_executions: {
          type: 'number',
          description: 'Number of recent command executions to retrieve (default: 5)',
        },
        max_lines_per_execution: {
          type: 'number',
          description: 'Maximum lines of output per command (default: 50)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_editor_state',
    description:
      "Get the current state of the editor: which file is active, cursor position, open tabs. Use this to understand what the student is currently looking at.",
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

/**
 * Execute a tool call from Claude
 */
export async function executeTool(
  toolName: string,
  toolInput: any,
  contextGatherer: ContextGatherer
): Promise<ToolResult> {
  switch (toolName) {
    case 'read_file':
      return await readFile(toolInput.path);

    case 'search_project':
      return await searchProject(toolInput.query, {
        filePattern: toolInput.file_pattern,
        maxResults: toolInput.max_results,
      });

    case 'get_terminal_output':
      return getTerminalOutput(contextGatherer, {
        maxExecutions: toolInput.max_executions,
        maxLinesPerExecution: toolInput.max_lines_per_execution,
      });

    case 'get_editor_state':
      return getEditorState(contextGatherer);

    default:
      return {
        success: false,
        error: `Unknown tool: ${toolName}`,
      };
  }
}

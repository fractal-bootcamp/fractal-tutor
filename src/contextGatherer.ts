import * as vscode from 'vscode';

export interface EditorContext {
  activeFile?: {
    path: string;
    language: string;
    cursorPosition: { line: number; column: number };
    selection?: string;
    visibleRange?: { start: number; end: number };
  };
  openTabs: Array<{
    path: string;
    isDirty: boolean;
  }>;
}

export interface WorkspaceContext {
  rootPath?: string;
  recentFiles: string[];
  unsavedChanges: Array<{
    path: string;
    changeCount: number;
  }>;
}

export interface TerminalExecution {
  commandLine: string;
  cwd?: string;
  exitCode?: number;
  output?: string;
  status: 'running' | 'completed';
  startTime: Date;
  endTime?: Date;
}

export interface TerminalContext {
  hasActiveTerminal: boolean;
  terminalCount: number;
  shellIntegrationAvailable: boolean;
  runningCommands: TerminalExecution[];
  recentExecutions: TerminalExecution[];
  limitations: string[];
}

export class ContextGatherer {
  private runningCommands: Map<string, TerminalExecution> = new Map();
  private recentExecutions: TerminalExecution[] = [];
  private terminalSubscriptions: vscode.Disposable[] = [];
  private readonly MAX_EXECUTIONS = 20;

  constructor() {
    this.setupTerminalListener();
  }

  /**
   * Gather editor context (active file, cursor, selection, open tabs)
   */
  getEditorContext(): EditorContext {
    const context: EditorContext = {
      openTabs: [],
    };

    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const doc = activeEditor.document;
      const position = activeEditor.selection.active;

      context.activeFile = {
        path: vscode.workspace.asRelativePath(doc.uri),
        language: doc.languageId,
        cursorPosition: {
          line: position.line + 1, // 1-indexed for user
          column: position.character + 1,
        },
      };

      // Get selection if any
      if (!activeEditor.selection.isEmpty) {
        context.activeFile.selection = doc.getText(activeEditor.selection);
      }

      // Get visible range
      const visibleRanges = activeEditor.visibleRanges;
      if (visibleRanges.length > 0) {
        context.activeFile.visibleRange = {
          start: visibleRanges[0].start.line + 1,
          end: visibleRanges[0].end.line + 1,
        };
      }
    }

    // Get all open tabs
    vscode.window.tabGroups.all.forEach(group => {
      group.tabs.forEach(tab => {
        if (tab.input instanceof vscode.TabInputText) {
          context.openTabs.push({
            path: vscode.workspace.asRelativePath(tab.input.uri),
            isDirty: tab.isDirty,
          });
        }
      });
    });

    return context;
  }

  /**
   * Gather workspace context
   */
  getWorkspaceContext(): WorkspaceContext {
    const context: WorkspaceContext = {
      recentFiles: [],
      unsavedChanges: [],
    };

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      context.rootPath = workspaceFolder.uri.fsPath;
    }

    // Get unsaved changes
    vscode.workspace.textDocuments.forEach(doc => {
      if (doc.isDirty && !doc.isUntitled) {
        context.unsavedChanges.push({
          path: vscode.workspace.asRelativePath(doc.uri),
          changeCount: doc.version, // Rough proxy for change count
        });
      }
    });

    // Note: VSCode doesn't have a "recent files" API
    // We can only see currently open documents
    vscode.workspace.textDocuments.forEach(doc => {
      if (!doc.isUntitled) {
        context.recentFiles.push(vscode.workspace.asRelativePath(doc.uri));
      }
    });

    return context;
  }

  /**
   * Setup terminal listener using Shell Integration API
   *
   * Shell Integration (VSCode 1.93+) allows us to:
   * - Track when commands start/end
   * - Get command text, cwd, exit code
   * - Read command output via the stream
   *
   * REQUIREMENTS:
   * - Shell integration must be enabled in user's shell (zsh, bash, fish, pwsh)
   * - We can only see commands run AFTER extension activates
   * - No access to historical scrollback from before activation
   */
  private setupTerminalListener() {
    // Listen for shell executions starting
    this.terminalSubscriptions.push(
      vscode.window.onDidStartTerminalShellExecution(async (event) => {
        const execution = event.execution;
        const executionId = `${execution.commandLine.value}-${Date.now()}`;

        // Track running command
        const termExec: TerminalExecution = {
          commandLine: execution.commandLine.value,
          cwd: execution.cwd?.fsPath,
          status: 'running',
          startTime: new Date(),
        };

        this.runningCommands.set(executionId, termExec);
        console.log(`Command started: ${execution.commandLine.value}`);

        // Start reading output stream in background
        this.captureOutputStream(execution, executionId);
      })
    );

    // Listen for shell executions ending
    this.terminalSubscriptions.push(
      vscode.window.onDidEndTerminalShellExecution(async (event) => {
        const execution = event.execution;

        // Find the running command
        let executionId: string | undefined;
        for (const [id, exec] of this.runningCommands.entries()) {
          if (exec.commandLine === execution.commandLine.value && exec.status === 'running') {
            executionId = id;
            break;
          }
        }

        // Update execution with exit code and completion time
        if (executionId && this.runningCommands.has(executionId)) {
          const termExec = this.runningCommands.get(executionId)!;
          termExec.exitCode = event.exitCode;
          termExec.status = 'completed';
          termExec.endTime = new Date();

          // Move to recent executions
          this.recentExecutions.push(termExec);
          this.runningCommands.delete(executionId);

          // Keep only recent executions
          if (this.recentExecutions.length > this.MAX_EXECUTIONS) {
            this.recentExecutions.shift();
          }

          console.log(`Command completed: ${execution.commandLine.value} (exit: ${event.exitCode})`);
        }
      })
    );
  }

  /**
   * Capture output stream from a terminal execution
   * Note: execution.read() can only be called once per execution
   */
  private async captureOutputStream(
    execution: vscode.TerminalShellExecution,
    executionId: string
  ) {
    try {
      const stream = execution.read();
      let output = '';

      for await (const data of stream) {
        output += data;

        // Update the running command with accumulated output
        const termExec = this.runningCommands.get(executionId);
        if (termExec) {
          termExec.output = output;
        }
      }

      console.log(`Captured ${output.length} bytes of output for: ${execution.commandLine.value}`);
    } catch (e) {
      console.error('Failed to read terminal output:', e);
    }
  }

  /**
   * Get terminal context using Shell Integration
   */
  getTerminalContext(): TerminalContext {
    const terminals = vscode.window.terminals;
    const activeTerminal = vscode.window.activeTerminal;

    // Check if shell integration is available
    const hasShellIntegration = terminals.some(
      (t) => t.shellIntegration !== undefined
    );

    const limitations: string[] = [];
    if (!hasShellIntegration) {
      limitations.push(
        'Shell Integration not detected - terminal output unavailable',
        'Enable shell integration in your shell (zsh/bash/fish/pwsh)',
        'See: https://code.visualstudio.com/docs/terminal/shell-integration'
      );
    } else {
      limitations.push(
        'Only commands run after extension activation are captured',
        'Historical scrollback from before activation is not available'
      );
    }

    return {
      hasActiveTerminal: activeTerminal !== undefined,
      terminalCount: terminals.length,
      shellIntegrationAvailable: hasShellIntegration,
      runningCommands: Array.from(this.runningCommands.values()),
      recentExecutions: this.recentExecutions,
      limitations,
    };
  }


  /**
   * Get ALL context in one call
   */
  getAllContext() {
    return {
      editor: this.getEditorContext(),
      workspace: this.getWorkspaceContext(),
      terminal: this.getTerminalContext(),
      timestamp: new Date().toISOString(),
    };
  }

  dispose() {
    this.terminalSubscriptions.forEach(sub => sub.dispose());
  }
}

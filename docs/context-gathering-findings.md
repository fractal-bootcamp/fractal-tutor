# Context Gathering - Research Findings

## Summary

We've implemented comprehensive context gathering including **terminal output via Shell Integration**! The VSCode API (1.93+) provides `TerminalShellExecution` which gives us access to command output when shell integration is enabled.

## What We CAN Gather

### ✅ Editor Context
- **Active file**: Path, language, cursor position (line/column)
- **Selection**: Currently selected text
- **Visible range**: Which lines are visible in the viewport
- **Open tabs**: All open files, their paths, and dirty state

### ✅ Workspace Context
- **Root path**: Workspace folder location
- **Open documents**: All currently open files
- **Unsaved changes**: Which files have unsaved edits

### ✅ Terminal Context - Shell Integration

**Via `TerminalShellExecution` API (VSCode 1.93+), we CAN get:**
- Command text that was executed
- Working directory (cwd) where command ran
- Exit code (success/failure)
- **Full command output** via async stream (`execution.read()`)
- Timing information (start/end times, duration)
- **Running commands** (via `onDidStartTerminalShellExecution`)
- **Completed commands** (via `onDidEndTerminalShellExecution`)

**Key APIs:**
- `onDidStartTerminalShellExecution` - Fires when command starts, tracks running commands
- `onDidEndTerminalShellExecution` - Fires when command completes with exit code
- `execution.read()` - Async stream that yields output data as it's produced

**Requirements:**
- User must have shell integration enabled (auto-enabled in zsh/bash/fish/pwsh)
- We only capture commands run AFTER extension activation
- No access to historical scrollback from before activation
- `execution.read()` can only be called once per execution (start reading on start event)

**Implementation pattern:**
```typescript
// Track when commands start
window.onDidStartTerminalShellExecution(async (event) => {
  const execution = event.execution;

  // IMPORTANT: Start reading output immediately!
  // execution.read() can only be called once
  const stream = execution.read();
  for await (const data of stream) {
    console.log(data); // Full command output as it streams!
  }
});

// Track when commands complete
window.onDidEndTerminalShellExecution(async (event) => {
  console.log({
    command: event.execution.commandLine.value,
    cwd: event.execution.cwd?.fsPath,
    exitCode: event.exitCode // 0 = success
  });
});
```

**Critical Discoveries:**

1. **Output streaming timing**: Must call `execution.read()` in `onDidStartTerminalShellExecution`, NOT in the end event. The stream must be consumed as the command runs.
   - ✅ Start event + immediate `read()` = full output captured
   - ❌ End event + `read()` = stream already closed, no output
   - ✅ Long-running commands (`bun dev`, `npm start`) show up in running commands list
   - ✅ Quick commands (`ls`, `echo`) captured with full output

2. **ANSI escape sequences**: Raw terminal output includes formatting codes and shell integration markers that need cleaning:
   - Shell Integration sequences: `]633;C`, `]133;C` (protocol markers)
   - Color/formatting: `[1m` (bold), `[0m` (reset), etc.
   - Cursor movement and control characters
   - Solution: Strip all ANSI codes for clean, readable output (see `terminalOutputCleaner.ts`)
   - Future: Could parse semantic info (bold, colors) and convert to markdown

**Limitations:**
- Shell integration must be enabled (it usually is by default in modern shells)
- Can't read scrollback from before extension loaded
- Some older shells or custom configurations may not have it enabled

## How Shell Integration Works

Shell Integration is automatically injected by VSCode into supported shells (zsh, bash, fish, PowerShell). It adds invisible escape sequences that mark:
- Command start/end boundaries
- Command text
- Working directory
- Exit codes

This happens transparently - users don't see these sequences, but extensions can listen for them.

**To check if it's working:**
1. Open VSCode terminal
2. Run any command (e.g., `ls`)
3. Our extension will capture it automatically

**If shell integration is not available:**
- User might be using an unsupported shell
- Shell config might have disabled it
- See troubleshooting: https://code.visualstudio.com/docs/terminal/shell-integration

## Recommendation for Fractal Tutor

**✅ Shell Integration provides excellent terminal context!**

With this API, we get:
1. **Recent command history** - Last 20 commands with full output
2. **Error detection** - Can see failed commands (non-zero exit codes)
3. **Context awareness** - Know what directory commands ran in
4. **Build/test failures** - See the actual error output

**Graceful fallbacks:**
- If shell integration unavailable: UI shows clear message
- Students can still paste terminal output manually
- Problems panel still provides compiler errors
- File content is always accessible

**This is a huge win for the tutor's effectiveness!**

## Testing the Context Gathering

### Testing Shell Integration
1. Press F5 to run the extension
2. Open a terminal in VSCode
3. Run some commands (e.g., `ls`, `npm test`, etc.)
4. Open Fractal Tutor sidebar and send a message
5. Response will show captured terminal commands and output!

### Testing Editor Context
1. Open any file
2. Make some edits (don't save)
3. Open multiple tabs
4. Send a chat message - see all context captured

### Via Command Palette
1. Open Command Palette (Cmd+Shift+P)
2. Type "Fractal Tutor: Show Current Context"
3. See full JSON of all gathered context including terminal executions

## Code Reference

Context gathering is implemented in:
- `src/contextGatherer.ts:153` - Shell Integration listener setup
- `src/contextGatherer.ts:192` - Terminal context gathering
- `src/extension.ts:20` - Debug command registration
- `src/chatViewProvider.ts:36` - Integration with chat

Key API used:
- `vscode.window.onDidEndTerminalShellExecution()` - Captures command completions
- `execution.read()` - Async stream of command output

## Next Steps

1. ✅ Context gathering works for editor/workspace/terminal
2. ⏭️ Send this context to Claude API
3. ⏭️ Design prompt that uses context effectively (especially terminal errors!)
4. ⏭️ Add file reading tools so Claude can request specific files
5. ⏭️ Consider Problems panel integration for compiler errors

## References

- [Terminal Shell Integration Docs](https://code.visualstudio.com/docs/terminal/shell-integration)
- [VSCode API: TerminalShellExecution](https://code.visualstudio.com/api/references/vscode-api#TerminalShellExecution)
- [GitHub: Shell Integration Issues](https://github.com/microsoft/vscode/issues?q=shell+integration)

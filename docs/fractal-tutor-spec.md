# Fractal AI Tutor - VSCode Extension Specification

## Overview

An AI tutor VSCode extension for Fractal Tech bootcamp students (weeks 1-6), designed to help beginners avoid common pitfalls when learning to code. The tutor has ambient awareness of the student's workspace and acts as a thoughtful guide rather than a solution dispenser.

## Core Problems Being Solved

1. **XY Problem / Smuggled Assumptions**: Students ask narrow questions based on faulty mental models (e.g., "how do I split strings?" when they should be parsing JSON)
2. **AI as Crutch**: Students smooth away friction by asking AI for every small thing, preventing tacit knowledge formation
3. **No Memory Consolidation**: Students solve a problem with AI help, then forget it completely when they encounter it again

## User Experience

### Primary Workflow

1. Student is coding in VSCode on a project
2. Student hits a problem and opens the Fractal Tutor sidebar
3. Student asks a question
4. Tutor sees: their question, open files, cursor position, unsaved changes, terminal output, project structure
5. Tutor responds with guidance, asks clarifying questions, and helps build mental models (does NOT just give answers)
6. Conversation persists per-project

### UI Location

- Sidebar panel in VSCode activity bar
- Custom icon for Fractal Tutor
- Chat interface similar to GitHub Copilot Chat or Continue
- Conversations are saved per-workspace

## Technical Architecture

### Stack

- **Extension Host** (Node.js/TypeScript): VSCode extension that gathers context and manages API calls
- **Webview UI** (React/TypeScript): Chat interface rendered in sidebar
- **LLM**: Anthropic Claude API (Sonnet 4 or 4.5)
- **Build**: esbuild or Vite for fast bundling

### High-Level Flow

```
User types message
    ↓
Webview sends to Extension Host
    ↓
Extension gathers context (files, editor state, terminal)
    ↓
Extension builds Anthropic API request with:
    - Custom tutor system prompt
    - Context as tools/resources
    - User's message
    ↓
Extension calls Anthropic API
    ↓
API response (may include tool calls)
    ↓
Extension executes tools if requested
    ↓
Response sent back to Webview
    ↓
Webview displays in chat UI
```

### Communication Pattern

- Extension ↔ Webview: `postMessage` API
- Extension ↔ Anthropic: HTTP API calls
- Extension ↔ VSCode APIs: Direct function calls

## Feature Requirements

### 1. Context Gathering (Automatic)

The extension automatically gathers and provides this context with every request:

#### Editor Context
- Currently active file path and language
- Cursor position (line, column)
- Current selection (if any)
- All open editor tabs with file paths

#### Workspace Context
- Workspace root path
- List of recent files (last 10 viewed)
- Unsaved changes in open editors

#### Terminal Context
- Last 50 lines of terminal output (if terminal is visible)
- Current working directory from terminal

#### Project Context (Optional Enhancement)
- Check for existence of `project-context.md` in workspace root
- If exists, include contents in context

### 2. Tools for LLM

Provide these tools to the LLM (implemented as TypeScript functions in extension):

#### `read_file(path: string): string`
- Reads file contents from workspace
- Uses `vscode.workspace.fs.readFile()`
- Returns error if file doesn't exist or is too large (>100KB)

#### `search_files(pattern: string, maxResults?: number): Array<{path: string, matches: number}>`
- Searches for files matching glob pattern
- Uses `vscode.workspace.findFiles()`
- Returns paths + match counts
- Default maxResults: 20

#### `list_directory(path: string): Array<{name: string, type: 'file' | 'directory'}>`
- Lists contents of directory
- Uses `vscode.workspace.fs.readDirectory()`

#### `get_file_info(path: string): {size: number, modified: Date, language: string}`
- Gets metadata about a file without reading full contents

#### `get_editor_context(): EditorContext`
- Returns structured snapshot of current editor state
- Called automatically but LLM can request refresh

#### `get_terminal_output(lines?: number): string`
- Gets recent terminal output
- Default: last 50 lines

### 3. Custom Tutor Prompt

The extension includes a carefully crafted system prompt that instructs Claude to:

- Act as a thoughtful tutor, not a solution dispenser
- Ask clarifying questions to understand the student's actual goal
- Detect XY problems by cross-referencing the question with visible context
- Help build mental models through explanation, not just answers
- Encourage the student to try things and learn through experimentation
- Point out when the student is working around a fundamental misunderstanding
- Be concise but not terse - friendly and encouraging tone

**Prompt should be easily editable** (stored in extension settings or a separate file) for iteration.

### 4. Chat Interface (React Webview)

#### Features
- Message history display (user messages, assistant responses)
- Text input with send button
- Loading indicator during API calls
- Error handling (API errors, rate limits, network issues)
- Markdown rendering for code blocks and formatting
- Syntax highlighting for code blocks
- Copy button for code blocks

#### Optional Nice-to-Haves
- Conversation branching (start new conversation from any message)
- Export conversation to markdown
- Clear conversation button
- Token usage display

### 5. Conversation Persistence

- Save conversation history per workspace
- Use VSCode's `globalState` or `workspaceState` API
- Format: JSON array of messages
- Load previous conversation when sidebar opens
- Provide "New Conversation" button to start fresh

### 6. Settings/Configuration

Expose these in VSCode settings:

- `fractalTutor.apiKey`: Anthropic API key (stored securely)
- `fractalTutor.model`: Which Claude model to use (default: claude-sonnet-4-20250514)
- `fractalTutor.maxTokens`: Max tokens per response (default: 4096)
- `fractalTutor.temperature`: Temperature setting (default: 1.0)
- `fractalTutor.includeTerminal`: Whether to include terminal output (default: true)
- `fractalTutor.systemPrompt`: Path to custom system prompt file (optional)

## Tool Call Handling

When Claude requests to use a tool:

1. Extension receives tool call in API response
2. Extension executes corresponding TypeScript function
3. Extension sends tool result back to API
4. API provides final response
5. Display to user

Handle tool errors gracefully - if a tool fails, report error to LLM so it can recover.

## Error Handling

### API Errors
- Rate limit (429): Display friendly message, suggest waiting
- Invalid API key: Prompt user to configure in settings
- Network error: Display error, provide retry button
- Token limit exceeded: Truncate context and retry (or inform user)

### Tool Errors
- File not found: Return error message to LLM
- Permission denied: Return error to LLM
- Workspace not open: Disable extension, show message

## Out of Scope (For Initial Version)

- MCP server integration
- Screenshot/browser capture
- Memory/Anki integration
- Code execution
- Multi-turn agentic workflows
- Voice input/output
- Integration with external APIs besides Anthropic

## Success Criteria

The extension is successful if:

1. Students can open sidebar, ask questions, and get thoughtful responses
2. The tutor successfully detects when students are asking the wrong question (XY problem)
3. Conversations feel natural and helpful (not mechanical like Cursor/Copilot)
4. Students report that it helps them build understanding, not just solve immediate problems
5. Extension is stable and doesn't crash or hang

## Development Phases

### Phase 1: Core Chat (Week 1)
- Basic extension scaffold
- Sidebar with React chat UI
- API integration with simple prompt
- Message persistence

### Phase 2: Context Gathering (Week 1-2)
- Implement all context gathering (editor, workspace, terminal)
- Implement file tools (read, search, list)
- Send context with API requests

### Phase 3: Tutor Prompt Iteration (Week 2-3)
- Craft and test tutor system prompt
- Test with real students on real problems
- Iterate based on feedback

### Phase 4: Polish (Week 3-4)
- Error handling
- Settings UI
- Documentation
- Packaging for distribution

## Distribution

- Package as `.vsix` file
- Install manually via "Install from VSIX"
- OR publish to VSCode marketplace (if appropriate)
- Provide API key setup instructions

## Technical Notes

### VSCode APIs to Use

```typescript
// Workspace
vscode.workspace.fs.readFile()
vscode.workspace.fs.readDirectory()
vscode.workspace.findFiles()
vscode.workspace.textDocuments
vscode.workspace.rootPath

// Window/Editor
vscode.window.activeTextEditor
vscode.window.visibleTextEditors
vscode.window.terminals

// Storage
context.globalState
context.workspaceState
```

### Anthropic API Request Format

```typescript
{
  model: "claude-sonnet-4-20250514",
  max_tokens: 4096,
  system: [
    { type: "text", text: TUTOR_SYSTEM_PROMPT }
  ],
  messages: [
    { role: "user", content: userMessage },
    // ... conversation history
  ],
  tools: [
    { name: "read_file", description: "...", input_schema: {...} },
    // ... other tools
  ]
}
```

### Recommended Starter Templates

- https://github.com/githubnext/vscode-react-webviews (polished, best practices)
- https://github.com/anubra266/vscode-sidebar-extension (simpler)

## Open Questions / Future Enhancements

1. Should conversations be stored locally or sync across devices?
2. Add screenshot/browser inspection later if needed?
3. Integrate with Anki for spaced repetition once we validate core concept?
4. Build custom MCP servers if we want to make this portable to other platforms?
5. Add telemetry to understand what questions students ask most?

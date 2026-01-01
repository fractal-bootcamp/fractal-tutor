# Fractal Tutor - VSCode Extension

An AI tutor VSCode extension for Fractal Tech bootcamp students, designed to help beginners avoid common pitfalls when learning to code.

## Important Context

[**technical-spec.md**](docs/technical-spec.md): contains the technical details on the structure of the project.
[**overview.md**](docs/overview.md): an overview of the philosophy, use, and future plans for this tutor.

## Setup

### Prerequisites

- [Bun](https://bun.sh) - Fast JavaScript runtime and package manager
- VSCode

### Installation

1. Install Bun if you haven't already:
```bash
curl -fsSL https://bun.sh/install | bash
```

2. Install dependencies:
```bash
bun install
```

3. Build the extension:
```bash
bun run build
```

## Development

### Watch mode

Run this in one terminal to rebuild on file changes:
```bash
bun run watch
```

### Running the extension

1. Open this folder in VSCode
2. Press `F5` to open a new Extension Development Host window
3. The Fractal Tutor icon should appear in the activity bar (left sidebar)
4. Click it to open the chat interface

## Project Structure

```
fractal-tutor/
├── src/
│   ├── extension.ts           # Extension entry point
│   ├── chatViewProvider.ts    # Manages the sidebar webview
│   └── webview/
│       ├── main.tsx            # Webview entry point
│       ├── ChatUI.tsx          # React chat interface
│       └── styles.css          # Tailwind CSS input
├── scripts/
│   └── build.ts                # Custom build script
├── resources/
│   └── icon.svg                # Extension icon
├── dist/                       # Built files (generated)
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

## Configuration

### Setting up your API Key

1. Get an API key from [Anthropic Console](https://console.anthropic.com/)
2. Open VSCode Settings (Cmd+, or Ctrl+,)
3. Search for "Fractal Tutor"
4. Enter your API key in **Fractal Tutor: Api Key**

### Available Settings

- **Api Key**: Your Anthropic API key
- **Model**: Claude model to use (default: `claude-sonnet-4-20250514`)
- **Max Tokens**: Maximum response length (default: 4096)
- **Temperature**: Randomness (0.0-1.0, default: 1.0)
- **Include Terminal**: Whether to capture terminal output (default: true)

## Using the Extension

1. Press F5 to launch Extension Development Host
2. Click the Fractal Tutor icon in the activity bar
3. Type your question and press Send
4. Claude will respond based on the system prompt in `prompts/system-prompt.md`

## Current Status

✅ **Ready for Testing!**

**Completed Features:**
- ✅ VSCode extension structure
- ✅ Sidebar webview panel with React + Tailwind
- ✅ Context gathering (editor, workspace, terminal with Shell Integration)
- ✅ Claude API integration (Sonnet 4)
- ✅ Conversation history management
- ✅ Tool use system with 4 tools:
  - `read_file` - Read file contents
  - `search_project` - Search across workspace
  - `get_terminal_output` - Recent terminal commands and output
  - `get_editor_state` - Active file, cursor, open tabs
- ✅ Comprehensive system prompt for tutoring
- ✅ ANSI escape sequence cleaning for terminal output

**Next Steps:**
- [ ] Test with real students and iterate on prompt
- [ ] Add conversation persistence (save per workspace)
- [ ] Add Problems panel integration (compiler errors)
- [ ] Streaming responses for better UX
- [ ] Polish error handling and edge cases

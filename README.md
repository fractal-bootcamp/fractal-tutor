# Fractal Tutor - VSCode Extension

An AI tutor VSCode extension for Fractal Tech bootcamp students, designed to help beginners avoid common pitfalls when learning to code.

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

## Next Steps

- [ ] Configure your Anthropic API key in VSCode settings
- [ ] Implement Claude API integration
- [ ] Add context gathering (editor state, terminal output, etc.)
- [ ] Implement tool calls for file operations
- [ ] Craft and iterate on the tutor system prompt
- [ ] Add conversation persistence

## Current Status

✅ **Phase 1 Complete!**

Basic extension scaffold with:
- ✅ VSCode extension structure
- ✅ Sidebar webview panel
- ✅ React + Tailwind CSS chat UI
- ✅ Bun build system
- ✅ Successfully builds and bundles

**Ready to test!** Press F5 in VSCode to launch the extension.

Next: Claude API integration

# JSON Text Expander

Open a JSON string as decoded, read-only plain text in a tab beside the source document. The extension supports JSON, JSON with comments (JSONC), and JSON Lines (JSONL).

## Get started

1. Package the extension with `npm install` followed by `npx @vscode/vsce package`, then use **Extensions: Install from VSIX...** in desktop VS Code to install the generated file.
2. Open a document with the `json`, `jsonc`, or `jsonl` language mode.
3. Place the cursor inside a string, including an object key or a top-level string.
4. Run **JSON Text Expander: Open String as Text** from the Command Palette or the editor context menu.

The command opens strings of any length. It shows a message when the cursor is not on a string or the string is invalid. JSONL support requires a language extension that provides the `jsonl` language ID.

The text tab is a snapshot. If the source changes, run the command again to open the updated value.

## Remote and web support

The extension runs in the local UI extension host when you use a remote workspace. Install it locally in desktop VS Code. Browser-based VS Code is not supported.

## Development

Run `npm install` in the extension directory, open it in desktop VS Code, and press F5 to launch an Extension Development Host. The extension uses JavaScript and does not require a compilation step.

'use strict';

const vscode = require('vscode');
const { createScanner, SyntaxKind } = require('jsonc-parser');

const snapshotScheme = 'json-text-expander';

function activate(context) {
  const snapshots = new Map();
  const changingLanguage = new Set();
  let nextSnapshot = 0;

  // A text document content provider serves virtual documents from memory. VS Code
  // treats them as read-only because this scheme has no writable file system provider.
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(snapshotScheme, {
      provideTextDocumentContent(uri) {
        return snapshots.get(uri.toString());
      },
    }),
    vscode.workspace.onDidCloseTextDocument((document) => {
      if (document.uri.scheme === snapshotScheme && !changingLanguage.has(document.uri.toString())) {
        snapshots.delete(document.uri.toString());
      }
    }),
    vscode.commands.registerCommand('jsonTextExpander.openStringAsText', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !['json', 'jsonc', 'jsonl'].includes(editor.document.languageId)) {
        return;
      }

      const document = editor.document;
      const cursor = editor.selection.active;
      // JSONL records occupy one physical line. JSONC requires scanning from the
      // beginning so the scanner can recognize strings and multiline comments.
      const isJsonLines = document.languageId === 'jsonl';
      const source = isJsonLines ? document.lineAt(cursor.line).text : document.getText();
      const offset = isJsonLines ? cursor.character : document.offsetAt(cursor);
      const scanner = createScanner(source);
      let raw;
      while (scanner.scan() !== SyntaxKind.EOF) {
        const start = scanner.getTokenOffset();
        if (start > offset) break;
        if (scanner.getToken() === SyntaxKind.StringLiteral && offset < start + scanner.getTokenLength()) {
          raw = source.slice(start, start + scanner.getTokenLength());
          break;
        }
      }
      if (raw === undefined) {
        vscode.window.showInformationMessage('Place the cursor on a JSON string.');
        return;
      }

      let value;
      try {
        // Parsing the literal validates it and converts JSON escapes to actual text.
        value = JSON.parse(raw);
      } catch {
        vscode.window.showInformationMessage('The JSON string at the cursor is incomplete or invalid.');
        return;
      }
      // Each URI identifies a snapshot, so opening another value never changes an
      // existing tab. Removing closed documents keeps the in-memory snapshots bounded.
      const uri = vscode.Uri.from({ scheme: snapshotScheme, path: `/JSON text ${++nextSnapshot}.txt` });
      snapshots.set(uri.toString(), value);
      try {
        let snapshot = await vscode.workspace.openTextDocument(uri);
        // Changing a document's language emits a close event followed by an open
        // event. Retain the snapshot during that transition, including when a user
        // has associated .txt files with a language other than plaintext.
        if (snapshot.languageId !== 'plaintext') {
          changingLanguage.add(uri.toString());
          try {
            snapshot = await vscode.languages.setTextDocumentLanguage(snapshot, 'plaintext');
          } finally {
            changingLanguage.delete(uri.toString());
          }
        }
        await vscode.window.showTextDocument(snapshot, { viewColumn: vscode.ViewColumn.Beside, preview: false });
      } catch (error) {
        snapshots.delete(uri.toString());
        vscode.window.showErrorMessage(`Could not open the JSON text: ${error.message}`);
      }
    }),
  );
}

// package.json declares extensionKind: ["ui"], so desktop VS Code runs this
// entry point in the local UI extension host even for remote workspace documents.
// The main entry point uses CommonJS and has no browser entry point. VS Code for
// the web cannot load it unless a compatible browser bundle is provided.
module.exports = { activate };

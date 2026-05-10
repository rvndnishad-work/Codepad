"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useActiveCode, useSandpack } from "@codesandbox/sandpack-react";
import { X } from "lucide-react";
import { setupTypeAcquisition } from "@typescript/ata";
import typescript from "typescript";
import type { Monaco } from "@monaco-editor/react";
import { customSnippets } from "@/lib/snippets";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const EXT_LANG: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  json: "json",
  html: "html",
  css: "css",
  svelte: "html",
  vue: "html",
};

function languageFor(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXT_LANG[ext] ?? "plaintext";
}

export default function MonacoEditor({ fontSize }: { fontSize: number }) {
  const { code, updateCode } = useActiveCode();
  const { sandpack } = useSandpack();
  const { activeFile, visibleFiles, setActiveFile } = sandpack;

  const language = useMemo(() => languageFor(activeFile), [activeFile]);

  const [monacoInstance, setMonacoInstance] = useState<Monaco | null>(null);
  const editorRef = useRef<any>(null);

  // ── Multi-file sync: keep Monaco's virtual file system in sync with Sandpack ──
  useEffect(() => {
    if (!monacoInstance) return;
    const models = monacoInstance.editor.getModels();
    const existingUris = new Set(models.map((m: any) => m.uri.toString()));

    for (const [path, file] of Object.entries(sandpack.files)) {
      // Skip hidden/tombstoned files
      if (typeof file !== "string" && (file as any).hidden) continue;

      const fileCode = typeof file === "string" ? file : (file as { code: string }).code;
      const lang = languageFor(path);
      const uri = monacoInstance.Uri.parse(`file://${path}`);
      const uriStr = uri.toString();

      if (existingUris.has(uriStr)) {
        // Update existing model if code differs (but skip active file — it's managed by the editor)
        const model = monacoInstance.editor.getModel(uri);
        if (model && path !== activeFile && model.getValue() !== fileCode) {
          model.setValue(fileCode);
        }
      } else {
        // Create a new model for this file so cross-file IntelliSense works
        monacoInstance.editor.createModel(fileCode, lang, uri);
      }
    }
  }, [monacoInstance, sandpack.files, activeFile]);

  // ── Custom snippets ──
  useEffect(() => {
    if (!monacoInstance) return;

    const disposable = monacoInstance.languages.registerCompletionItemProvider(
      ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'],
      {
        provideCompletionItems: (model: any, position: any) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const suggestions = customSnippets.map(s => ({
            label: s.label,
            kind: monacoInstance.languages.CompletionItemKind.Snippet,
            insertText: s.insertText,
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: s.documentation,
            range
          }));
          return { suggestions };
        }
      }
    );

    return () => disposable.dispose();
  }, [monacoInstance]);

  // ── ATA: Automatic Type Acquisition for npm packages ──
  const ata = useMemo(() => {
    if (!monacoInstance) return null;

    return setupTypeAcquisition({
      projectName: "codepad",
      typescript: typescript,
      logger: console,
      delegate: {
        receivedFile: (code: string, path: string) => {
          monacoInstance.languages.typescript.typescriptDefaults.addExtraLib(code, `file://${path}`);
          monacoInstance.languages.typescript.javascriptDefaults.addExtraLib(code, `file://${path}`);
        },
      },
    });
  }, [monacoInstance]);

  useEffect(() => {
    if (ata && code) {
      const timer = setTimeout(() => {
        ata(code);
      }, 1500); // 1.5s debounce for type acquisition (heavy task)
      return () => clearTimeout(timer);
    }
  }, [ata, code]);

  const handleEditorDidMount = useCallback((editor: any, monaco: Monaco) => {
    setMonacoInstance(monaco);
    editorRef.current = editor;

    const compilerOptions: any = {
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      esModuleInterop: true,
      allowJs: true,
      checkJs: false,
      strict: false,
      allowSyntheticDefaultImports: true,
    };

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);

    // Enable richer diagnostics
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    // Add global browser + Node type definitions
    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);

    // ── Nano Banana Pro Decoration Engine ──
    // Monaco's Monarch tokenizer doesn't distinguish JSX tags/attributes,
    // method calls, or property accesses from plain identifiers.
    // We apply inline decorations via regex to match the Nano Banana Pro styling
    // across ALL file types and templates.
    let decorationIds: string[] = [];

    function applyNanoBananaDecorations() {
      const model = editor.getModel();
      if (!model) return;
      const text = model.getValue();
      const newDecorations: any[] = [];

      function addDecoration(start: number, length: number, className: string) {
        const startPos = model.getPositionAt(start);
        const endPos = model.getPositionAt(start + length);
        newDecorations.push({
          range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
          options: { inlineClassName: className },
        });
      }

      let match;

      // 1. JSX/HTML tags: <TagName or </TagName (but NOT inside template literals or strings too aggressively)
      const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9.]*)/g;
      while ((match = tagRegex.exec(text)) !== null) {
        const tagName = match[1];
        const tagStart = match.index + match[0].length - tagName.length;
        addDecoration(tagStart, tagName.length, 'nbp-jsx-tag');
      }

      // 2. JSX/HTML attributes: word= inside tags
      const attrRegex = /(?<=<[a-zA-Z][a-zA-Z0-9.\s\n]*?)(\b[a-zA-Z_][\w-]*)(?=\s*=)/g;
      while ((match = attrRegex.exec(text)) !== null) {
        addDecoration(match.index, match[1].length, 'nbp-jsx-attr');
      }

      // 3. Function declarations: function Name
      const funcDeclRegex = /\bfunction\s+([a-zA-Z_$][\w$]*)/g;
      while ((match = funcDeclRegex.exec(text)) !== null) {
        const nameStart = match.index + match[0].length - match[1].length;
        addDecoration(nameStart, match[1].length, 'nbp-func-name');
      }

      // 4. Method calls: .methodName( → gold (definition/property color)
      const methodCallRegex = /\.([a-zA-Z_$][\w$]*)(?=\s*\()/g;
      while ((match = methodCallRegex.exec(text)) !== null) {
        const nameStart = match.index + 1; // skip the dot
        addDecoration(nameStart, match[1].length, 'nbp-method');
      }

      // 5. Property access: .propertyName (not followed by opening paren) → gold
      const propAccessRegex = /\.([a-zA-Z_$][\w$]*)(?!\s*\()/g;
      while ((match = propAccessRegex.exec(text)) !== null) {
        const nameStart = match.index + 1;
        addDecoration(nameStart, match[1].length, 'nbp-property');
      }

      // 6. Standalone function calls: functionName( (not preceded by dot or keyword)
      const funcCallRegex = /(?<![.\w$])([a-zA-Z_$][\w$]*)(?=\s*\()/g;
      while ((match = funcCallRegex.exec(text)) !== null) {
        const name = match[1];
        // Skip keywords that look like function calls
        const keywords = new Set([
          'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
          'continue', 'return', 'throw', 'try', 'catch', 'finally',
          'new', 'delete', 'typeof', 'void', 'in', 'instanceof',
          'import', 'export', 'from', 'default', 'class', 'extends',
          'super', 'yield', 'await', 'async', 'function', 'var', 'let',
          'const', 'of', 'with', 'debugger',
        ]);
        if (keywords.has(name)) continue;
        addDecoration(match.index, name.length, 'nbp-func-call');
      }

      // 7. Class declarations: class Name → pink #fb94ff
      const classDeclRegex = /\bclass\s+([a-zA-Z_$][\w$]*)/g;
      while ((match = classDeclRegex.exec(text)) !== null) {
        const nameStart = match.index + match[0].length - match[1].length;
        addDecoration(nameStart, match[1].length, 'nbp-class-name');
      }

      // 8. Variable function assignments: const Name = () => → gold #ffc600
      const varFuncRegex = /\b(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_$][\w$]*)\s*=>/g;
      while ((match = varFuncRegex.exec(text)) !== null) {
        const name = match[1];
        const nameStart = match.index + match[0].indexOf(name);
        addDecoration(nameStart, name.length, 'nbp-func-name');
      }

      // 9. Object keys: { key: value } → gold #ffc600
      const objKeyRegex = /([{,]\s*)([a-zA-Z_$][\w$]*)\s*:/g;
      while ((match = objKeyRegex.exec(text)) !== null) {
        const key = match[2];
        const keyStart = match.index + match[1].length;
        addDecoration(keyStart, key.length, 'nbp-property');
      }

      decorationIds = editor.deltaDecorations(decorationIds, newDecorations);
    }

    applyNanoBananaDecorations();
    editor.onDidChangeModelContent(() => {
      clearTimeout((applyNanoBananaDecorations as any)._t);
      (applyNanoBananaDecorations as any)._t = setTimeout(applyNanoBananaDecorations, 250); // Increased debounce to 250ms
    });
    editor.onDidChangeModel(() => {
      decorationIds = [];
      setTimeout(applyNanoBananaDecorations, 50);
    });
  }, []);

  const handleEditorWillMount = useCallback((monaco: Monaco) => {
    // Nano Banana Pro Theme Definition
    monaco.editor.defineTheme("nano-banana-pro", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "D2A8FF" },
        { token: "type", foreground: "D2A8FF" },
        { token: "struct", foreground: "D2A8FF" },
        { token: "interface", foreground: "D2A8FF" },
        { token: "class", foreground: "FB94FF" },
        { token: "string", foreground: "A5D6FF" },
        { token: "number", foreground: "FF9B71" },
        { token: "comment", foreground: "6B7280" },
        { token: "operator", foreground: "79C0FF" },
        { token: "delimiter", foreground: "E0E0E0" },
        { token: "identifier.function", foreground: "FFE600" },
      ],
      colors: {
        "editor.background": "#050505",
        "editor.foreground": "#E0E0E0",
        "editorLineNumber.foreground": "#374151",
        "editorLineNumber.activeForeground": "#FFE600",
        "editor.lineHighlightBackground": "#ffffff05",
        "editor.selectionBackground": "#FFE60020",
        "editorCursor.foreground": "#FFE600",
        "editorBracketMatch.background": "#FFE60020",
        "editorBracketMatch.border": "#FFE60040",
      }
    });
  }, []);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) updateCode(value);
    },
    [updateCode]
  );

  return (
    <div className="flex flex-col h-full bg-[#050505]">
      {/* Nano Banana Pro decoration CSS — applied via deltaDecorations engine */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* JSX/HTML tag names → light purple #D2A8FF */
        .nbp-jsx-tag { color: #D2A8FF !important; }
        /* JSX/HTML attribute names → soft blue italic #A5D6FF */
        .nbp-jsx-attr { color: #A5D6FF !important; font-style: italic !important; }
        /* Function declaration names → Nano Banana Yellow #FFE600 */
        .nbp-func-name { color: #FFE600 !important; }
        /* Method calls .methodName() → Nano Banana Yellow #FFE600 */
        .nbp-method { color: #FFE600 !important; }
        /* Property access .propertyName → Nano Banana Yellow #FFE600 */
        .nbp-property { color: #FFE600 !important; }
        /* Standalone function calls name() → Nano Banana Yellow #FFE600 */
        .nbp-func-call { color: #FFE600 !important; }
        /* Class names → pink #fb94ff */
        .nbp-class-name { color: #FB94FF !important; }
      ` }} />
      <div className="flex items-center border-b border-white/[0.03] bg-[#0A0A0A] overflow-x-auto" style={{ minHeight: 36 }}>
        {visibleFiles.filter(f => f === activeFile).map((f) => (
          <div
            key={f}
            className={`group flex items-center gap-2 px-3 py-2 text-xs whitespace-nowrap transition-colors border-b-2 ${
              f === activeFile
                ? "bg-[#050505] text-white border-b-[#FFE600]"
                : "text-[#aaaaaa] hover:text-white hover:bg-white/[0.02] border-b-transparent"
            }`}
          >
            <button onClick={() => setActiveFile(f)} className="flex-1 text-left">
              {f.replace(/^\//, "")}
            </button>
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                sandpack.closeFile(f); 
              }}
              className="p-0.5 rounded hover:bg-white/10 text-white/30 hover:text-white transition-all ml-1"
              title="Close file"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          theme="nano-banana-pro"
          language={language}
          path={activeFile}
          value={code}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          beforeMount={handleEditorWillMount}
          options={{
            minimap: { enabled: false },
            fontSize: fontSize,
            fontFamily: "'JetBrains Mono', monospace",
            fontLigatures: true,
            automaticLayout: true,
            mouseWheelZoom: false,
            scrollBeyondLastLine: false,
            tabSize: 2,
            wordWrap: "on",
            renderLineHighlight: "line",
            lineNumbersMinChars: 3,
            folding: true,
            padding: { top: 8 },
            // ── Semantic Highlighting ──
            'semanticHighlighting.enabled': true,
            // ── IntelliSense enhancements ──
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true,
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: "on",
            tabCompletion: "on",
            wordBasedSuggestions: "currentDocument",
            parameterHints: { enabled: true, cycle: true },
            suggest: {
              showKeywords: true,
              showSnippets: true,
              showClasses: true,
              showFunctions: true,
              showVariables: true,
              showInterfaces: true,
              showModules: true,
              showProperties: true,
              showConstants: true,
              showOperators: true,
              showValues: true,
              showEnums: true,
              showEnumMembers: true,
              showTypeParameters: true,
              showWords: true,
              showMethods: true,
              showConstructors: true,
              showFields: true,
              showEvents: true,
              showUnits: true,
              showReferences: true,
              showIssues: true,
              showDeprecated: true,
              preview: true,
              shareSuggestSelections: true,
              insertMode: "insert",
              filterGraceful: true,
              localityBonus: true,
              snippetsPreventQuickSuggestions: false,
            },
            inlineSuggest: { enabled: true },
            bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },
            guides: {
              bracketPairs: true,
              indentation: true,
              highlightActiveBracketPair: true,
              highlightActiveIndentation: true,
            },
            matchBrackets: "always",
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoSurround: "languageDefined",
            formatOnPaste: true,
            smoothScrolling: true,
            cursorSmoothCaretAnimation: "on",
            cursorBlinking: "smooth",
            renderWhitespace: "selection",
            linkedEditing: true,
            lineHeight: Math.floor(fontSize * 1.6),
          }}
        />
      </div>
    </div>
  );
}

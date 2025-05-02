import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SidebarProvider } from './sidebar';

interface BlurData {
  [filePath: string]: {
    [range: string]: {
      intensity: number;
    };
  };
}

export function activate(context: vscode.ExtensionContext) {
  const blurData: BlurData = {};
  const decorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();

  // Create sidebar
  const sidebarProvider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("codeBlurControls", sidebarProvider)
  );

  // Initialize from storage
  loadBlurData(context).then(data => {
    Object.assign(blurData, data);
    applyBlurEffectsToActiveEditor();
  });

  // Apply blur to selected text
  const applyBlur = vscode.commands.registerCommand('codeBlur.applyBlur', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    vscode.window.showInputBox({
      prompt: 'Enter blur intensity (0-1)',
      value: '0.5',
      validateInput: value => {
        const num = parseFloat(value);
        return (isNaN(num) || num < 0 || num > 1) 
          ? 'Please enter a number between 0 and 1' 
          : null;
      }
    }).then(input => {
      if (input === undefined) {
        return;
      }
      
      const intensity = parseFloat(input);
      const selections = editor.selections;
      
      // Save file path
      const filePath = editor.document.uri.fsPath;
      if (!blurData[filePath]) {
        blurData[filePath] = {};
      }
      
      // Apply blur to each selection
      selections.forEach(selection => {
        const range = formatRange(selection);
        blurData[filePath][range] = { intensity };
      });
      
      // Apply decorations
      applyBlurEffectsToActiveEditor();
      
      // Save blur data
      saveBlurData(context, blurData);
      
      // Notify sidebar of update
      sidebarProvider.updateBlurData(blurData);
    });
  });

  // Remove blur from selected text
  const removeBlur = vscode.commands.registerCommand('codeBlur.removeBlur', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const filePath = editor.document.uri.fsPath;
    if (!blurData[filePath]) {
      return;
    }

    const selections = editor.selections;
    let changed = false;

    selections.forEach(selection => {
      // Look for any overlapping ranges, not just exact matches
      const rangesToRemove = findOverlappingRanges(filePath, selection);
      
      rangesToRemove.forEach(rangeStr => {
        delete blurData[filePath][rangeStr];
        changed = true;
      });
    });

    if (changed) {
      applyBlurEffectsToActiveEditor();
      saveBlurData(context, blurData);
      sidebarProvider.updateBlurData(blurData);
    }
  });

  // Increase blur intensity
  const increaseBlur = vscode.commands.registerCommand('codeBlur.increaseBlur', () => {
    adjustBlurIntensity(0.1);
  });

  // Decrease blur intensity
  const decreaseBlur = vscode.commands.registerCommand('codeBlur.decreaseBlur', () => {
    adjustBlurIntensity(-0.1);
  });

  // Clear all blur effects
  const clearAllBlur = vscode.commands.registerCommand('codeBlur.clearAllBlur', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const filePath = editor.document.uri.fsPath;
    if (blurData[filePath]) {
      delete blurData[filePath];
      applyBlurEffectsToActiveEditor();
      saveBlurData(context, blurData);
      sidebarProvider.updateBlurData(blurData);
    }
  });

  // Handle editor changes
  const changeActiveEditor = vscode.window.onDidChangeActiveTextEditor(() => {
    applyBlurEffectsToActiveEditor();
  });

  // Add to subscriptions
  context.subscriptions.push(
    applyBlur, 
    removeBlur, 
    increaseBlur, 
    decreaseBlur, 
    clearAllBlur, 
    changeActiveEditor
  );

  // Functions
  
  // Helper function to find overlapping ranges
  function findOverlappingRanges(filePath: string, selection: vscode.Selection): string[] {
    if (!blurData[filePath]) {
      return [];
    }
    
    const result: string[] = [];
    const selectionRange = new vscode.Range(selection.start, selection.end);
    
    for (const rangeStr in blurData[filePath]) {
      const storedRange = parseRange(rangeStr);
      
      // Check if ranges overlap
      if (storedRange.intersection(selectionRange)) {
        result.push(rangeStr);
      }
    }
    
    return result;
  }

  function adjustBlurIntensity(delta: number) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const filePath = editor.document.uri.fsPath;
    if (!blurData[filePath]) {
      return;
    }

    const selections = editor.selections;
    let changed = false;

    selections.forEach(selection => {
      // Find any overlapping ranges
      const rangesToAdjust = findOverlappingRanges(filePath, selection);
      
      rangesToAdjust.forEach(rangeStr => {
        if (blurData[filePath][rangeStr]) {
          let newIntensity = blurData[filePath][rangeStr].intensity + delta;
          newIntensity = Math.max(0, Math.min(1, newIntensity));
          blurData[filePath][rangeStr].intensity = newIntensity;
          changed = true;
        }
      });
    });

    if (changed) {
      applyBlurEffectsToActiveEditor();
      saveBlurData(context, blurData);
      sidebarProvider.updateBlurData(blurData);
    }
  }

  function formatRange(range: vscode.Range | vscode.Selection): string {
    return `${range.start.line},${range.start.character},${range.end.line},${range.end.character}`;
  }

  function parseRange(rangeStr: string): vscode.Range {
    const [startLine, startChar, endLine, endChar] = rangeStr.split(',').map(Number);
    return new vscode.Range(
      new vscode.Position(startLine, startChar),
      new vscode.Position(endLine, endChar)
    );
  }

  function applyBlurEffectsToActiveEditor() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    // Clear existing decorations
    decorationTypes.forEach(type => {
      editor.setDecorations(type, []);
      type.dispose();
    });
    decorationTypes.clear();

    const filePath = editor.document.uri.fsPath;
    if (!blurData[filePath]) {
      return;
    }

    // Group ranges by intensity for efficiency
    const intensityRanges: { [intensity: string]: vscode.Range[] } = {};

    for (const rangeStr in blurData[filePath]) {
      const intensity = blurData[filePath][rangeStr].intensity;
      const intensityKey = intensity.toString();
      
      if (!intensityRanges[intensityKey]) {
        intensityRanges[intensityKey] = [];
      }
      
      intensityRanges[intensityKey].push(parseRange(rangeStr));
    }

    // Apply decorations for each intensity
    for (const intensityKey in intensityRanges) {
      const intensity = parseFloat(intensityKey);
      
      // Create decoration type for this intensity
      const decorationType = vscode.window.createTextEditorDecorationType({
        textDecoration: `none; filter: blur(${intensity * 5}px)`,
      });
      
      // Store for cleanup later
      decorationTypes.set(intensityKey, decorationType);
      
      // Apply decoration
      editor.setDecorations(decorationType, intensityRanges[intensityKey]);
    }
  }

  async function loadBlurData(context: vscode.ExtensionContext): Promise<BlurData> {
    try {
      // Get global storage path for extension
      const storagePath = context.globalStorageUri.fsPath;
      const dataPath = path.join(storagePath, 'blur-data.json');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
      }
      
      // Read data if file exists
      if (fs.existsSync(dataPath)) {
        const data = await fs.promises.readFile(dataPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.error('Failed to load blur data:', err);
    }
    
    return {};
  }

  async function saveBlurData(context: vscode.ExtensionContext, data: BlurData): Promise<void> {
    try {
      // Get storage path
      const storagePath = context.globalStorageUri.fsPath;
      const dataPath = path.join(storagePath, 'blur-data.json');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
      }
      
      // Write data
      await fs.promises.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save blur data:', err);
      vscode.window.showErrorMessage('Failed to save blur data');
    }
  }
}

export function deactivate() {
  // Clean up resources when extension is deactivated
}
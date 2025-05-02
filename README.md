# Code Blur

A Visual Studio Code extension that lets you apply blur effects to selected code sections. This helps during the learning process by allowing you to gradually reduce blur as you understand code sections better.

## Features

- Apply blur effects to selected code with customizable intensity (0-1)
- Control blur intensity via sidebar UI and context menu
- Store and restore blur positions when reopening files
- Customizable blur levels for different code sections
- Visual indication of blurred regions

## Usage

### Applying Blur

1. Select a code section you want to blur
2. Right-click and choose "Apply Blur Effect" or use the sidebar button
3. Enter a blur intensity value between 0 and 1 (higher = more blur)

### Controlling Blur

- Use the sidebar controls to:
  - Apply blur to selected text
  - Remove blur from selected text
  - Increase/decrease blur intensity
  - Clear all blur effects

- Alternatively, use the context menu options when text is selected:
  - "Apply Blur Effect"
  - "Remove Blur Effect"
  - "Increase Blur Intensity"
  - "Decrease Blur Intensity"

### Tracking Progress

As you understand code sections better, gradually decrease the blur intensity until you no longer need the blur effect.

## Extension Settings

This extension doesn't add any VS Code settings yet.

## Keyboard Shortcuts

No default keyboard shortcuts are provided, but you can add your own by customizing keybindings.json:

```json
[
  {
    "key": "ctrl+alt+b",
    "command": "codeBlur.applyBlur",
    "when": "editorHasSelection"
  },
  {
    "key": "ctrl+alt+n",
    "command": "codeBlur.removeBlur",
    "when": "editorHasSelection"
  }
]
```

## Installation

1. Download the .vsix file from the releases section
2. Open VS Code
3. Go to Extensions view (Ctrl+Shift+X)
4. Click the "..." menu in the top-right
5. Select "Install from VSIX..." and choose the downloaded file

## Building from Source

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to compile the extension
4. Run `npm run package` to create the .vsix file

## License

MIT
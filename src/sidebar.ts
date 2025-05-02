import * as vscode from 'vscode';

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _blurData: any = {};

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "media")
      ]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(message => {
      switch (message.command) {
        case 'applyBlur':
          vscode.commands.executeCommand('codeBlur.applyBlur');
          break;
        case 'removeBlur':
          vscode.commands.executeCommand('codeBlur.removeBlur');
          break;
        case 'increaseBlur':
          vscode.commands.executeCommand('codeBlur.increaseBlur');
          break;
        case 'decreaseBlur':
          vscode.commands.executeCommand('codeBlur.decreaseBlur');
          break;
        case 'clearAllBlur':
          vscode.commands.executeCommand('codeBlur.clearAllBlur');
          break;
      }
    });
  }

  public updateBlurData(blurData: any) {
    this._blurData = blurData;
    if (this._view) {
      this._view.webview.postMessage({ 
        command: 'blurDataUpdated', 
        data: blurData
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Get path to media files
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "sidebar-view.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "sidebar-view.css")
    );

    // Use a nonce to whitelist scripts that we trust
    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${webview.cspSource};">
        <link href="${styleUri}" rel="stylesheet">
        <title>Code Blur Controls</title>
      </head>
      <body>
        <div class="container">
          <h2>Code Blur Controls</h2>
          
          <div class="button-group">
            <button id="apply-blur" class="control-button">Apply Blur</button>
            <button id="remove-blur" class="control-button">Remove Blur</button>
          </div>
          
          <div class="button-group">
            <button id="increase-blur" class="control-button">Increase Blur</button>
            <button id="decrease-blur" class="control-button">Decrease Blur</button>
          </div>
          
          <div class="button-group">
            <button id="clear-all-blur" class="control-button danger">Clear All Blur</button>
          </div>
          
          <div id="blur-info">
            <h3>Blur Information</h3>
            <div id="blur-stats">
              <p>No blur effects applied</p>
            </div>
          </div>
        </div>
        
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
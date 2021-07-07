import * as vscode from 'vscode'
import * as path from 'path'

export function activate(context: vscode.ExtensionContext) {
    const provider = new ViewProvider(context.extensionUri)

    context.subscriptions.push(
        vscode.commands.registerCommand('sourcegraph.showExploreUsage', () => {
            provider.show()
            provider.updateToCurrent()
        })
    )

    if (false)
        context.subscriptions.push(
            vscode.window.onDidChangeTextEditorSelection(e => {
                provider.update(e.textEditor.document, e.selections)
            })
        )

    context.subscriptions.push(vscode.window.registerWebviewViewProvider(ViewProvider.viewType, provider))
}

class ViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'sourcegraph.exploreUsage'

    private _view?: vscode.WebviewView

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        }

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview)

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'usageSelected': {
                    vscode.window.activeTextEditor?.insertSnippet(
                        new vscode.SnippetString('Append(${1:err}, ${2:errors.New("bar")})')
                    )
                    break
                }
            }
        })
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this.updateToCurrent()
            }
        })
    }

    public update(document: vscode.TextDocument, selections: vscode.Selection[]): void {
        const wordRange = document.getWordRangeAtPosition(selections[0].active)
        if (!wordRange) {
            return
        }
        const relpath = document.fileName.replace('/home/sqs/src/', '').replace('sourcegraph.tmp', 'sourcegraph')
        const repo = relpath.split('/', 4).slice(0, 3).join('/')
        const rev = repo === 'github.com/hashicorp/go-multierror' ? 'v1.1.0' : 'HEAD'
        const filePath = relpath.slice(repo.length + 1)

        const goModule = path.join(repo, path.dirname(filePath))
        const moniker = { scheme: 'gomod', identifier: `${goModule}:${document.getText(wordRange)}` }

        const url = `https://sourcegraph.test:3443/${repo}@${rev}/-/usage/symbol/${moniker.scheme}/${moniker.identifier}`
        this._view!.webview.postMessage({ type: 'cursor', url })
    }

    public updateToCurrent(): void {
        if (vscode.window.activeTextEditor) {
            this.update(vscode.window.activeTextEditor.document, vscode.window.activeTextEditor.selections)
        }
    }

    public show(): void {
        if (!this._view?.visible) {
            this._view!.show(true)
            this.updateToCurrent()
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'))

        // Do the same for the stylesheet.
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'))
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'))
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'))

        // Use a nonce to only allow a specific script to be run.
        const nonce = getNonce()

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy-TODO-OFF" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">

				<title>Cat Colors</title>
			</head>
			<body>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`
    }
}

function getNonce() {
    let text = ''
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return text
}
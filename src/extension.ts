import * as vscode from 'vscode';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('Chatbot extension is now active');

    let disposable = vscode.commands.registerCommand('coding-jr-chat.openChat', () => {
        ChatPanel.createOrShow(context.extensionUri);
    });

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

// Core ChatPanel class for handling the webview interface
class ChatPanel {
    public static currentPanel: ChatPanel | undefined;
    private static readonly viewType = 'chatbot';
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            ChatPanel.viewType,
            'Chat Bot',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media')
                ]
            }
        );

        ChatPanel.currentPanel = new ChatPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'prompt':
                        try {
                            const response = await this._callGeminiAPI(message.text, message.files || {});
                            this._panel.webview.postMessage({ 
                                command: 'response', 
                                text: response.text 
                            });
                        } catch (error) {
                            console.error('Error processing request:', error);
                            this._panel.webview.postMessage({ 
                                command: 'error', 
                                text: `Failed to process your request: ${(error as Error).message}` 
                            });
                        }
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    private _update() {
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css')
        );

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Chat Bot</title>
                <link href="${styleUri}" rel="stylesheet">
            </head>
            <body>
                <div id="chat-container">
                    <div id="chat-messages"></div>
                    <div id="input-container">
                        <textarea id="prompt-input" placeholder="Type your message..."></textarea>
                        <button id="send-button">Send</button>
                    </div>
                </div>
                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }

    private async _callGeminiAPI(
        prompt: string,
        files: Record<string, { content: string; language?: string }> = {}
    ): Promise<{ text: string }> {
        try {
            const config = vscode.workspace.getConfiguration('codingJrChat');
            const apiKey = config.get<string>('geminiApiKey');

            if (!apiKey) {
                const action = await vscode.window.showErrorMessage(
                    'Gemini API key not found. Please set your API key in settings.',
                    'Open Settings'
                );
                
                if (action === 'Open Settings') {
                    await vscode.commands.executeCommand(
                        'workbench.action.openSettings',
                        'codingJrChat.geminiApiKey'
                    );
                }
                
                throw new Error('Please set your Gemini API key in VS Code settings (codingJrChat.geminiApiKey)');
            }

            // Let's try with the AI Studio compatible endpoint format
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: prompt }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        topP: 0.8,
                        topK: 40,
                        maxOutputTokens: 2048
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                console.error('Gemini API Error:', JSON.stringify(errorData, null, 2));
                const errorMessage = errorData?.error?.message || `Gemini API request failed: ${response.statusText}`;
                vscode.window.showErrorMessage(`Gemini API error: ${errorMessage}`);
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('Gemini API Response:', JSON.stringify(data, null, 2)); // Debug log

            if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                throw new Error('Invalid response format from Gemini API');
            }

            return { text: data.candidates[0].content.parts[0].text };
        } catch (error) {
            console.error('Error in _callGeminiAPI:', error);
            const errorMessage = (error as Error).message;
            const sanitizedMessage = errorMessage.replace(/Bearer [a-zA-Z0-9._-]+/, 'Bearer [REDACTED]');
            throw new Error('Failed to process the request: ' + sanitizedMessage);
        }
    }

    public dispose() {
        ChatPanel.currentPanel = undefined;
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}

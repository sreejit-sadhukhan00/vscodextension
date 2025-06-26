// @ts-check

(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    /** @typedef {{ text: string, isUser: boolean }} ChatMessage */
    /** @type {{ messages: ChatMessage[] }} */
    let state = {
        messages: []
    };

    // Try to get elements, with error handling
    /** @type {HTMLDivElement} */
    const chatMessages = /** @type {HTMLDivElement} */ (document.getElementById('chat-messages'));
    /** @type {HTMLTextAreaElement} */
    const promptInput = /** @type {HTMLTextAreaElement} */ (document.getElementById('prompt-input'));
    /** @type {HTMLButtonElement} */
    const sendButton = /** @type {HTMLButtonElement} */ (document.getElementById('send-button'));

    if (!chatMessages || !promptInput || !sendButton) {
        console.error('Required elements not found in the DOM');
        return;
    }

    // Initialize with previous state
    try {
        const previousState = vscode.getState();
        if (previousState) {
            state = previousState;
            // Restore previous messages
            state.messages.forEach(msg => addMessage(msg.text, msg.isUser));
        }
    } catch (err) {
        console.error('Failed to restore state:', err);
    }

    function addMessage(text, isUser = false) {
        try {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message');
            messageDiv.classList.add(isUser ? 'user-message' : 'bot-message');
            
            if (text.includes('```')) {
                // Handle code blocks
                const parts = text.split('```');
                parts.forEach((part, index) => {
                    if (index % 2 === 0) {
                        // Regular text
                        if (part.trim()) {
                            const textNode = document.createElement('div');
                            textNode.textContent = part.trim();
                            messageDiv.appendChild(textNode);
                        }
                    } else {
                        // Code block
                        const pre = document.createElement('pre');
                        const code = document.createElement('code');
                        
                        // Try to detect language
                        const firstLine = part.split('\n')[0].trim().toLowerCase();
                        const language = firstLine.match(/^(javascript|typescript|html|css|jsx|tsx|python|java|cpp|c\+\+|csharp|c#|ruby|go|rust|php|swift|kotlin|scala|sql|shell|bash|powershell|yaml|json|xml|markdown|md)$/)?.[1] || '';
                        
                        if (language) {
                            code.classList.add(`language-${language}`);
                            // Remove the language line from the code
                            code.textContent = part.split('\n').slice(1).join('\n').trim();
                        } else {
                            code.textContent = part.trim();
                        }
                        
                        pre.appendChild(code);
                        messageDiv.appendChild(pre);
                    }
                });
            } else {
                messageDiv.textContent = text;
            }

            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // Save message to state
            state.messages.push({ text, isUser });
            vscode.setState(state);

        } catch (err) {
            console.error('Failed to add message:', err);
            // Try to show a simple error message
            const errorDiv = document.createElement('div');
            errorDiv.classList.add('message', 'error-message');
            errorDiv.textContent = 'Failed to display message';
            chatMessages.appendChild(errorDiv);
        }
    }

    function sendMessage() {
        try {
            const text = promptInput.value.trim();
            if (!text) return;

            addMessage(text, true);
            vscode.postMessage({
                command: 'prompt',
                text: text
            });

            promptInput.value = '';
            promptInput.focus();
        } catch (err) {
            console.error('Failed to send message:', err);
            addMessage('Failed to send message. Please try again.', false);
        }
    }

    // Event Listeners
    sendButton.addEventListener('click', sendMessage);
    
    promptInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Add loading indicator
    let loadingIndicator = null;

    function showLoading() {
        loadingIndicator = document.createElement('div');
        loadingIndicator.classList.add('message', 'bot-message', 'loading');
        loadingIndicator.textContent = 'Thinking...';
        chatMessages.appendChild(loadingIndicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function hideLoading() {
        if (loadingIndicator && loadingIndicator.parentNode) {
            loadingIndicator.parentNode.removeChild(loadingIndicator);
        }
        loadingIndicator = null;
    }

    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        
        try {
            switch (message.command) {
                case 'response':
                    hideLoading();
                    addMessage(message.text);
                    break;
                case 'error':
                    hideLoading();
                    addMessage(`Error: ${message.text}`);
                    break;
                default:
                    console.warn('Unknown command received:', message.command);
            }
        } catch (err) {
            console.error('Failed to handle extension message:', err);
            hideLoading();
            addMessage('An error occurred while processing the response.');
        }
    });

    // Show initial greeting
    addMessage('Hello! I am a chatbot that can help you with UI components. Ask me to create or design components for you!');
})();

// This hook provides a consistent way to use the VS Code API in React components
// It handles the initialization of the API and provides a typed interface

interface VSCodeApi {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

// Declare vscode API globally so TS doesn't complain
declare global {
  function acquireVsCodeApi(): VSCodeApi;
}

// Create a reference to hold our instance of the VS Code API
let vscodeApi: VSCodeApi | undefined;

/**
 * Returns the VS Code API instance, initializing it if necessary
 */
export function useVsCodeApi(): VSCodeApi {
  if (!vscodeApi) {
    try {
      vscodeApi = acquireVsCodeApi();
    } catch (error) {
      console.error('Failed to acquire VS Code API', error);
      // Provide a mock implementation for testing in browser
      vscodeApi = {
        postMessage: (message: any) => {
          console.log('Mock postMessage:', message);
        },
        getState: () => ({}),
        setState: () => {},
      };
    }
  }
  return vscodeApi;
}

/**
 * Utility for communicating with the Google Gemini API
 * This is only used for browser development.
 * In the extension, API calls will be proxied through the extension host
 */

const API_URL = 'http://localhost:4000/api/gemini/generate';

interface GenerateRequest {
  prompt: string;
  files?: Record<string, {
    content: string;
    language?: string;
  }>;
}

interface GenerateResponse {
  text: string;
}

export async function generateCompletion(
  request: GenerateRequest
): Promise<GenerateResponse> {
  try {
    // In the browser environment, we'd call our API directly
    // but in the extension, this will be proxied through the extension host
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    return { text: 'Sorry, I encountered an error processing your request.' };
  }
}

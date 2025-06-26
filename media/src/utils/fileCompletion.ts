/**
 * Handles file path completion when user types @ followed by a prefix
 * 
 * @param currentInput The current input text
 * @param prefix The current file prefix (after the @ symbol)
 * @param suggestion The selected file suggestion
 * @returns The updated input text with the file reference
 */
export function completeFilePath(
  currentInput: string,
  prefix: string,
  suggestion: string
): string {
  // Replace the @prefix with the selected suggestion
  const atIndex = currentInput.lastIndexOf('@' + prefix);
  if (atIndex !== -1) {
    return (
      currentInput.substring(0, atIndex) +
      `@[${suggestion}]` +
      currentInput.substring(atIndex + prefix.length + 1)
    );
  }
  
  return currentInput;
}

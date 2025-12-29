/**
 * Utility to clean terminal output by removing/converting ANSI escape sequences
 */

/**
 * Strip ANSI escape sequences from terminal output
 *
 * Terminal output includes:
 * - Shell Integration sequences (]633;C, ]133;C, etc.)
 * - Color/formatting codes ([1m, [0m, etc.)
 * - Cursor movement sequences
 * - Other control characters
 *
 * For now, we simply strip them all out. In the future, we could:
 * - Parse semantic info (bold, colors) and convert to markdown
 * - Extract shell integration markers for better parsing
 * - Preserve structure with proper line breaks
 */
export function cleanTerminalOutput(raw: string): string {
  let cleaned = raw;

  // Remove OSC (Operating System Command) sequences
  // These include shell integration markers like ]633;C and ]133;C
  cleaned = cleaned.replace(/\x1b\][^\x07]*\x07/g, '');
  cleaned = cleaned.replace(/\x1b\][^\x1b]*\x1b\\/g, '');

  // Remove CSI (Control Sequence Introducer) sequences
  // These handle colors, cursor movement, text formatting
  cleaned = cleaned.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');

  // Remove other control characters except newlines/tabs
  cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize whitespace
  // Remove trailing whitespace from each line
  cleaned = cleaned.split('\n').map(line => line.trimEnd()).join('\n');

  // Remove excessive blank lines (more than 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Trim leading/trailing whitespace from entire output
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Truncate output to a reasonable length with ellipsis
 */
export function truncateOutput(text: string, maxLength: number = 500): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Try to break at a line boundary
  const truncated = text.slice(0, maxLength);
  const lastNewline = truncated.lastIndexOf('\n');

  if (lastNewline > maxLength * 0.7) {
    // If we can find a newline in the last 30%, use that
    return truncated.slice(0, lastNewline) + '\n...';
  }

  return truncated + '...';
}

/**
 * Get a preview of command output suitable for display in context
 *
 * For completed commands: show beginning of output
 * For running commands: show end of output (most recent)
 */
export function getOutputPreview(
  output: string,
  isRunning: boolean,
  maxLength: number = 200
): string {
  const cleaned = cleanTerminalOutput(output);

  if (cleaned.length === 0) {
    return '';
  }

  if (isRunning) {
    // For running commands, show the tail (most recent output)
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    return '...' + cleaned.slice(-maxLength);
  } else {
    // For completed commands, show the head
    return truncateOutput(cleaned, maxLength);
  }
}

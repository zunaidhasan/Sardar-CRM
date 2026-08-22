import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Undo-able toast actions.
//
// When a user changes a lead's status, score, or other fields, we show a
// toast notification with an "Undo" button that reverts the change within
// a short window (default 8 seconds).
// ---------------------------------------------------------------------------

interface UndoableActionParams {
  /** Description shown in the toast */
  message: string;
  /** The undo function to call when the user clicks Undo */
  onUndo: () => Promise<void>;
  /** How long the undo button stays visible (default 8000ms) */
  duration?: number;
}

/**
 * Show a toast with an Undo button. The undo function is called
 * within the duration window if the user clicks Undo.
 */
export function showUndoToast({
  message,
  onUndo,
  duration = 8000,
}: UndoableActionParams): void {
  toast(message, {
    duration,
    action: {
      label: "Undo",
      onClick: async () => {
        try {
          await onUndo();
          toast.success("Action undone");
        } catch {
          toast.error("Failed to undo");
        }
      },
    },
  });
}

/**
 * Wrap an async action with undo support.
 * Shows a success toast with undo button, and calls onUndo if clicked.
 */
export async function withUndo<T>(
  action: () => Promise<T>,
  options: {
    successMessage: string;
    onUndo: () => Promise<void>;
    errorMessage?: string;
  },
): Promise<T | null> {
  try {
    const result = await action();
    showUndoToast({
      message: options.successMessage,
      onUndo: options.onUndo,
    });
    return result;
  } catch (e) {
    toast.error(options.errorMessage ?? "Action failed");
    return null;
  }
}

import { toast } from "sonner";

/**
 * Extract a user-friendly error message from an Axios error or generic error.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMessage(err: any): string {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.response?.data?.error) return err.response.data.error;
  if (err?.message) return err.message;
  return "Something went wrong";
}

/** Show a success toast */
export function toastSuccess(message: string) {
  toast.success(message);
}

/** Show an error toast from a caught error */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toastError(err: any, fallback = "Operation failed") {
  toast.error(extractMessage(err) || fallback);
}

/** Show an info toast */
export function toastInfo(message: string) {
  toast.info(message);
}

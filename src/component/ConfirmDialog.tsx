"use client";

import { ReactNode } from "react";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title = "ยืนยันการดำเนินการ",
  message = "คุณแน่ใจหรือไม่ที่จะดำเนินการนี้?",
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  loading = false,
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // ESC Key Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && !loading) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-9999 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            onClick={!loading ? onCancel : undefined}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-description"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="relative w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
          >
            {/* Close Button */}
            <button
              onClick={onCancel}
              disabled={loading}
              aria-label="ปิด"
              className="absolute right-3 top-3 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={16} />
            </button>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-start gap-3.5">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    danger ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                  }`}
                >
                  <AlertTriangle size={18} />
                </div>

                <div className="min-w-0 flex-1 pr-6">
                  <h2
                    id="confirm-title"
                    className="text-[15px] font-semibold tracking-tight text-zinc-900"
                  >
                    {title}
                  </h2>
                  <div
                    id="confirm-description"
                    className="mt-1 text-sm leading-6 text-zinc-500"
                  >
                    {message}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  onClick={onCancel}
                  disabled={loading}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cancelText}
                </button>

                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-70 ${
                    danger
                      ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500/40"
                      : "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500/40"
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="3"
                          opacity="0.25"
                        />
                        <path
                          d="M22 12a10 10 0 00-10-10"
                          stroke="currentColor"
                          strokeWidth="3"
                        />
                      </svg>
                      กำลังดำเนินการ...
                    </span>
                  ) : (
                    confirmText
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

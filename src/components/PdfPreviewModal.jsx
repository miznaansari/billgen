import { X, Download } from "lucide-react";

export default function PdfPreviewModal({ url, title = "Invoice Preview", onClose, onDownload }) {
  if (!url) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-2 sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-base-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-base-300 px-4 py-3">
          <h3 className="truncate text-sm font-semibold">{title}</h3>
          <div className="flex items-center gap-2">
            {onDownload && (
              <button onClick={onDownload} className="btn btn-primary btn-sm gap-1.5">
                <Download className="h-4 w-4" /> Download
              </button>
            )}
            <button onClick={onClose} className="btn btn-ghost btn-sm btn-square" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <iframe src={url} title={title} className="h-full w-full flex-1 bg-base-300" />
      </div>
    </div>
  );
}

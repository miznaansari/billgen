import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Search,
  FilePlus2,
  Download,
  Copy,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  Receipt,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import PdfPreviewModal from "../components/PdfPreviewModal";
import { listBills, deleteBill, getCompanyProfile, bumpDownloadCount } from "../lib/billsService";
import { generateInvoicePdf, loadPdfAssets, invoiceFileName } from "../lib/pdf";
import { formatINR, formatDateHuman } from "../lib/format";

export default function Bills() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [bills, setBills] = useState(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState(null); // { url, bill }

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const list = await listBills(user.uid);
        if (active) setBills(list);
      } catch (err) {
        console.error("Bills load failed:", err);
        if (active) {
          setBills([]);
          toast("error", "Could not load your bills.");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [user, toast]);

  const filtered = useMemo(() => {
    if (!bills) return [];
    const q = search.trim().toLowerCase();
    if (!q) return bills;
    return bills.filter((b) =>
      [b.billno, b.billto, b.projectname, b.campaign]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [bills, search]);

  const makePdf = async (bill) => {
    const [assets, companyInfo] = await Promise.all([loadPdfAssets(), getCompanyProfile(user.uid)]);
    return generateInvoicePdf({
      formData: bill,
      companyInfo,
      signatureType: bill.signatureType || "text",
      pdfDesign: bill.pdfDesign || "current",
      assets,
    });
  };

  const handleDownload = async (bill) => {
    setBusyId(bill.id);
    try {
      (await makePdf(bill)).save(invoiceFileName(bill.billno));
      bumpDownloadCount(user.uid);
    } catch (err) {
      console.error("Download failed:", err);
      toast("error", "Could not generate the PDF.");
    } finally {
      setBusyId(null);
    }
  };

  const handlePreview = async (bill) => {
    setBusyId(bill.id);
    try {
      const doc = await makePdf(bill);
      setPreview({ url: doc.output("dataurlstring"), bill });
    } catch (err) {
      console.error("Preview failed:", err);
      toast("error", "Could not build the preview.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteBill(user.uid, confirmDelete.id);
      setBills((b) => b.filter((x) => x.id !== confirmDelete.id));
      toast("success", `Bill #${confirmDelete.billno} deleted.`);
      setConfirmDelete(null);
    } catch (err) {
      console.error("Delete failed:", err);
      toast("error", "Could not delete the bill.");
    } finally {
      setDeleting(false);
    }
  };

  const Actions = ({ bill }) => (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => handlePreview(bill)}
        className="btn btn-ghost btn-sm btn-square text-base-content/55"
        title="Preview"
        disabled={busyId === bill.id}
      >
        {busyId === bill.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
      </button>
      <button
        onClick={() => handleDownload(bill)}
        className="btn btn-ghost btn-sm btn-square text-base-content/55"
        title="Download PDF"
        disabled={busyId === bill.id}
      >
        <Download className="h-4 w-4" />
      </button>
      <button
        onClick={() => navigate(`/bill?from=${bill.id}`)}
        className="btn btn-ghost btn-sm btn-square text-base-content/55"
        title="Duplicate — start a new bill with these details"
      >
        <Copy className="h-4 w-4" />
      </button>
      <button
        onClick={() => navigate(`/bill?edit=${bill.id}`)}
        className="btn btn-ghost btn-sm btn-square text-base-content/55"
        title="Edit"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        onClick={() => setConfirmDelete(bill)}
        className="btn btn-ghost btn-sm btn-square text-base-content/40 hover:text-error"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  if (!bills) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">My Bills</h1>
          <p className="mt-0.5 text-sm text-base-content/55">
            {bills.length} saved bill{bills.length === 1 ? "" : "s"} — duplicate any of them to skip retyping.
          </p>
        </div>
        <Link to="/bill" className="btn btn-primary gap-2">
          <FilePlus2 className="h-4 w-4" /> New Bill
        </Link>
      </div>

      {/* Search */}
      {bills.length > 0 && (
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/35" />
          <input
            type="text"
            className="input w-full pl-9 pr-8"
            placeholder="Search by bill no, client or project…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-base-content/40 hover:text-base-content"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Empty states */}
      {bills.length === 0 ? (
        <div className="surface flex flex-col items-center gap-3 px-4 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Receipt className="h-7 w-7" />
          </span>
          <div>
            <p className="font-semibold">No bills saved yet</p>
            <p className="mt-1 text-sm text-base-content/55">
              Every bill you create is stored here with one-click duplicate & re-download.
            </p>
          </div>
          <Link to="/bill" className="btn btn-primary btn-sm gap-1.5 mt-1">
            <FilePlus2 className="h-4 w-4" /> Create your first bill
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface px-4 py-10 text-center text-sm text-base-content/55">
          No bills match “{search}”.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="surface hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-300 text-left text-[11px] font-semibold uppercase tracking-wide text-base-content/45">
                  <th className="px-5 py-3">Bill No.</th>
                  <th className="px-3 py-3">Client</th>
                  <th className="px-3 py-3">Project</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3">Design</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-200">
                {filtered.map((bill) => (
                  <tr key={bill.id} className="hover:bg-base-200/50">
                    <td className="px-5 py-3 font-semibold">#{bill.billno || "—"}</td>
                    <td className="max-w-[180px] truncate px-3 py-3">{bill.billto || "—"}</td>
                    <td className="max-w-[160px] truncate px-3 py-3 text-base-content/60">
                      {bill.projectname || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-base-content/60">
                      {formatDateHuman(bill.billdate || bill.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-bold">
                      {formatINR(bill.totalamount)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`badge badge-sm font-medium ${
                          bill.pdfDesign === "new"
                            ? "border-accent/40 bg-accent/15 text-accent-content"
                            : "border-base-300 bg-base-200 text-base-content/60"
                        }`}
                      >
                        {bill.pdfDesign === "new" ? "Premium" : "Classic"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Actions bill={bill} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {filtered.map((bill) => (
              <li key={bill.id} className="surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{bill.billto || "Untitled client"}</p>
                    <p className="mt-0.5 text-xs text-base-content/50">
                      #{bill.billno || "—"} • {formatDateHuman(bill.billdate || bill.createdAt)}
                    </p>
                    {bill.projectname && (
                      <p className="mt-0.5 truncate text-xs text-base-content/50">{bill.projectname}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-base font-extrabold text-primary">
                    {formatINR(bill.totalamount)}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-base-200 pt-2.5">
                  <span
                    className={`badge badge-sm font-medium ${
                      bill.pdfDesign === "new"
                        ? "border-accent/40 bg-accent/15 text-accent-content"
                        : "border-base-300 bg-base-200 text-base-content/60"
                    }`}
                  >
                    {bill.pdfDesign === "new" ? "Premium" : "Classic"}
                  </span>
                  <Actions bill={bill} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
          onClick={() => !deleting && setConfirmDelete(null)}
        >
          <div className="surface w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold">Delete bill #{confirmDelete.billno}?</h3>
            <p className="mt-1.5 text-sm text-base-content/60">
              This removes the bill for <b>{confirmDelete.billto || "this client"}</b> (
              {formatINR(confirmDelete.totalamount)}) permanently. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="btn btn-ghost border border-base-300"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button className="btn btn-error text-error-content gap-1.5" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <PdfPreviewModal
        url={preview?.url}
        title={`Invoice ${preview?.bill?.billno || ""}`}
        onClose={() => setPreview(null)}
        onDownload={() => {
          handleDownload(preview.bill);
          setPreview(null);
        }}
      />
    </div>
  );
}

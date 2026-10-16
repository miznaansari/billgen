import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  Users,
  FileText,
  CalendarDays,
  Receipt,
  PenLine,
  Palette,
  Eye,
  Download,
  Plus,
  Trash2,
  TriangleAlert,
  Loader2,
  Building2,
  Check,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AutocompleteInput from "../components/AutocompleteInput";
import PdfPreviewModal from "../components/PdfPreviewModal";
import {
  listBills,
  saveBill,
  updateBill,
  getSuggestions,
  recordBillUsage,
  getCompanyProfile,
  bumpDownloadCount,
  suggestNextBillNo,
} from "../lib/billsService";
import { generateInvoicePdf, loadPdfAssets, invoiceFileName } from "../lib/pdf";
import { amountInWords } from "../lib/numberToWords";
import { formatINR, formatDateHuman, todayISO } from "../lib/format";
import { track } from "../firebase";

const ROW_FIELDS = ["shootdate", "shootlabel", "extrasheet", "conveyance", "rateperday", "amount"];

const EMPTY_FORM = {
  billto: "",
  projectname: "",
  campaign: "",
  billno: "",
  billdate: todayISO(),
  gst: "",
  pan: "",
  address: "",
  amountinword: "",
  totalamount: "",
  shootdate: [""],
  shootlabel: [""],
  extrasheet: [""],
  conveyance: [""],
  rateperday: [""],
  amount: [""],
};

/** Recalculate total + words from the amount column. */
function withTotals(data) {
  const total = data.amount.reduce((sum, val) => sum + (parseFloat(String(val).trim()) || 0), 0);
  return { ...data, totalamount: total.toFixed(2), amountinword: amountInWords(total) };
}

function SectionCard({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="surface p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-bold leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-base-content/50">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function OptionPill({ active, onClick, title, desc }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl border p-3 text-left transition-colors ${
        active
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-base-300 hover:border-base-content/25"
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{title}</span>
        {active && <Check className="h-4 w-4 text-primary" />}
      </span>
      <span className="mt-0.5 block text-xs text-base-content/50">{desc}</span>
    </button>
  );
}

export default function BillForm() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromId = params.get("from");
  const editId = params.get("edit");

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [signatureType, setSignatureType] = useState("text");
  const [pdfDesign, setPdfDesign] = useState("current");
  const [companyInfo, setCompanyInfo] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [bills, setBills] = useState(null);
  const [assets, setAssets] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [errors, setErrors] = useState({});

  // ---- Load profile, suggestions, bills and PDF assets once ----
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const [profile, sugg, billList, pdfAssets] = await Promise.all([
          getCompanyProfile(user.uid),
          getSuggestions(user.uid),
          listBills(user.uid),
          loadPdfAssets(),
        ]);
        if (!active) return;
        setCompanyInfo(profile ?? undefined);
        setSuggestions(sugg);
        setBills(billList);
        setAssets(pdfAssets);
      } catch (err) {
        console.error("Bill form load failed:", err);
        if (active) toast("error", "Could not load your saved data. Autofill may be unavailable.");
      }
    })();
    return () => {
      active = false;
    };
  }, [user, toast]);

  // ---- Prefill when duplicating or editing ----
  useEffect(() => {
    if (!bills || (!fromId && !editId)) return;
    const source = bills.find((b) => b.id === (fromId || editId));
    if (!source) {
      toast("error", "That bill could not be found.");
      return;
    }
    const copyArr = (v) => (Array.isArray(v) && v.length ? [...v] : [""]);
    const base = {
      ...EMPTY_FORM,
      billto: source.billto || "",
      projectname: source.projectname || "",
      campaign: source.campaign || "",
      gst: source.gst || "",
      pan: source.pan || "",
      address: source.address || "",
      shootdate: copyArr(source.shootdate),
      extrasheet: copyArr(source.extrasheet),
      conveyance: copyArr(source.conveyance),
      rateperday: copyArr(source.rateperday),
      amount: copyArr(source.amount),
    };
    // Older bills were saved without labels — keep the array in step with the dates.
    base.shootlabel = base.shootdate.map((_, i) => source.shootlabel?.[i] || "");
    if (editId) {
      base.billno = source.billno || "";
      base.billdate = source.billdate || todayISO();
    } else {
      base.billno = "";
      base.billdate = todayISO();
    }
    setFormData(withTotals(base));
    if (source.signatureType) setSignatureType(source.signatureType);
    if (source.pdfDesign) setPdfDesign(source.pdfDesign);
  }, [bills, fromId, editId, toast]);

  // ---- Field helpers ----
  const setField = (name, value) => {
    setFormData((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: false }));
  };

  const setCell = (field, index, value) => {
    setFormData((f) => {
      const updated = [...f[field]];
      updated[index] = value;
      const next = { ...f, [field]: updated };
      return field === "amount" ? withTotals(next) : next;
    });
  };

  const addRow = () => {
    setFormData((f) => {
      const next = { ...f };
      ROW_FIELDS.forEach((k) => (next[k] = [...f[k], ""]));
      return next;
    });
  };

  const removeRow = (index) => {
    setFormData((f) => {
      const next = { ...f };
      ROW_FIELDS.forEach((k) => {
        const arr = [...f[k]];
        arr.splice(index, 1);
        next[k] = arr.length ? arr : [""];
      });
      return withTotals(next);
    });
  };

  const rowCount = formData.shootdate.length;

  // ---- Autocomplete sources ----
  const clientOptions = suggestions?.clients || [];
  const projectOptions = suggestions?.projects || [];
  const campaignOptions = suggestions?.campaigns || [];

  const handleClientSelect = (client) => {
    setFormData((f) => ({
      ...f,
      billto: client.name || f.billto,
      address: client.address || f.address,
      gst: client.gst || f.gst,
      pan: client.pan || f.pan,
    }));
  };

  // ---- Bill number: suggestion + duplicate check ----
  const suggestedBillNo = useMemo(() => {
    const fromSuggestions = suggestions?.lastBillNo;
    const fromBills = bills?.[0]?.billno;
    const next = suggestNextBillNo(fromSuggestions || fromBills || "");
    return next || "";
  }, [suggestions, bills]);

  const duplicateOf = useMemo(() => {
    const no = (formData.billno || "").trim().toLowerCase();
    if (!no || !bills) return null;
    return bills.find((b) => b.id !== editId && (b.billno || "").trim().toLowerCase() === no) || null;
  }, [formData.billno, bills, editId]);

  // ---- Build / validate / save ----
  const buildPdf = () =>
    generateInvoicePdf({ formData, companyInfo, signatureType, pdfDesign, assets });

  const validate = () => {
    const bad = {};
    if (!formData.billto.trim()) bad.billto = true;
    if (!formData.billno.trim()) bad.billno = true;
    setErrors(bad);
    if (Object.keys(bad).length) {
      toast("error", "Please fill in the client name and bill number.");
      return false;
    }
    return true;
  };

  const persistBill = async () => {
    const payload = { ...withTotals(formData), signatureType, pdfDesign };
    let saved;
    if (editId) {
      saved = await updateBill(user.uid, editId, payload);
    } else {
      saved = await saveBill(user.uid, payload);
    }
    const sugg = await recordBillUsage(user.uid, payload);
    setSuggestions(sugg);
    track(editId ? "bill_updated" : "bill_created", { design: pdfDesign });
    return saved;
  };

  const handleSave = async (download) => {
    if (!validate() || saving) return;
    setSaving(true);
    try {
      await persistBill();
      if (download) {
        buildPdf().save(invoiceFileName(formData.billno));
        bumpDownloadCount(user.uid);
      }
      toast("success", `Bill #${formData.billno} ${editId ? "updated" : "saved"}${download ? " & downloaded" : ""}.`);
      navigate("/bills");
    } catch (err) {
      console.error("Save failed:", err);
      toast("error", "Could not save the bill. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    try {
      setPdfUrl(buildPdf().output("dataurlstring"));
    } catch (err) {
      console.error("Preview failed:", err);
      toast("error", "Could not build the preview.");
    }
  };

  const total = parseFloat(formData.totalamount) || 0;
  const pageTitle = editId ? "Edit Bill" : fromId ? "Duplicate Bill" : "New Bill";

  return (
    <div className="space-y-5 pb-16 lg:pb-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">{pageTitle}</h1>
          <p className="mt-0.5 text-sm text-base-content/55">
            {editId
              ? "Update the details and re-download the PDF."
              : "Fields autofill from your previous bills as you type."}
          </p>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <button type="button" onClick={handlePreview} className="btn btn-ghost gap-2 border border-base-300">
            <Eye className="h-4 w-4" /> Preview
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="btn btn-primary gap-2"
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {editId ? "Update & Download" : "Save & Download"}
          </button>
        </div>
      </div>

      {/* Company profile nudge */}
      {companyInfo === undefined && (
        <div className="surface flex flex-wrap items-center gap-3 border-warning/40 bg-warning/10 p-4">
          <Building2 className="h-5 w-5 shrink-0 text-warning-content" />
          <p className="min-w-0 flex-1 text-sm">
            Your company profile is empty — the PDF will show placeholder details.
          </p>
          <Link to="/profile" className="btn btn-warning btn-sm">Set up company</Link>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ---- Left column: the form ---- */}
        <div className="space-y-5">
          <SectionCard icon={Users} title="Client & Project" subtitle="Pick a saved client or add a new one">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="billto">Bill To (Client / Production House) *</label>
                <AutocompleteInput
                  id="billto"
                  value={formData.billto}
                  onChange={(v) => setField("billto", v)}
                  onSelect={handleClientSelect}
                  options={clientOptions}
                  getLabel={(c) => c.name}
                  getSub={(c) => [c.address, c.gst && `GST ${c.gst}`].filter(Boolean).join(" • ")}
                  placeholder="e.g. Dharma Productions"
                  error={!!errors.billto}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="address">Client Address</label>
                <input
                  id="address"
                  type="text"
                  className="input w-full"
                  placeholder="Street, city, state"
                  value={formData.address}
                  onChange={(e) => setField("address", e.target.value)}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="gst">Client GST No.</label>
                <input
                  id="gst"
                  type="text"
                  className="input w-full"
                  placeholder="GSTIN / UIN"
                  value={formData.gst}
                  onChange={(e) => setField("gst", e.target.value)}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="pan">Client PAN No.</label>
                <input
                  id="pan"
                  type="text"
                  className="input w-full"
                  placeholder="PAN"
                  value={formData.pan}
                  onChange={(e) => setField("pan", e.target.value)}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="projectname">Project Name</label>
                <AutocompleteInput
                  id="projectname"
                  value={formData.projectname}
                  onChange={(v) => setField("projectname", v)}
                  options={projectOptions}
                  placeholder="e.g. Ad Film — Summer Campaign"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="campaign">Campaign / PO Ref (optional)</label>
                <AutocompleteInput
                  id="campaign"
                  value={formData.campaign}
                  onChange={(v) => setField("campaign", v)}
                  options={campaignOptions}
                  placeholder="Campaign code"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={FileText} title="Invoice Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="billno">Bill No. *</label>
                <input
                  id="billno"
                  type="text"
                  className={`input w-full ${errors.billno ? "input-error" : ""}`}
                  placeholder="e.g. INV-001"
                  value={formData.billno}
                  onChange={(e) => setField("billno", e.target.value)}
                />
                {!formData.billno && suggestedBillNo && (
                  <button
                    type="button"
                    onClick={() => setField("billno", suggestedBillNo)}
                    className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/15"
                  >
                    <Plus className="h-3 w-3" /> Use {suggestedBillNo}
                  </button>
                )}
                {duplicateOf && (
                  <p className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-xs text-warning-content">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      Bill #{duplicateOf.billno} already exists for{" "}
                      <b>{duplicateOf.billto || "unknown client"}</b> (
                      {formatDateHuman(duplicateOf.billdate || duplicateOf.createdAt)}). You can still
                      save, but double-check the number.
                    </span>
                  </p>
                )}
              </div>
              <div>
                <label className="field-label" htmlFor="billdate">Bill Date</label>
                <input
                  id="billdate"
                  type="date"
                  className="input w-full"
                  value={formData.billdate}
                  onChange={(e) => setField("billdate", e.target.value)}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={CalendarDays}
            title="Work Days & Amounts"
            subtitle="One row per shoot day — the total is calculated automatically"
          >
            {/* Desktop header */}
            <div className="mb-2 hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2.25rem] gap-2 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-base-content/45 md:grid">
              <span>Shoot Date</span>
              <span>Extra Shift</span>
              <span>Conveyance</span>
              <span>Rate / Day</span>
              <span>Amount (₹)</span>
              <span />
            </div>

            <div className="space-y-3 md:space-y-2">
              {Array.from({ length: rowCount }).map((_, i) => (
                <div
                  key={i}
                  className="relative grid grid-cols-2 gap-2 rounded-xl border border-base-300 p-3 pt-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2.25rem] md:items-center md:border-0 md:p-0"
                >
                  <span className="absolute left-3 top-2 text-[11px] font-bold text-base-content/40 md:hidden">
                    DAY {i + 1}
                  </span>

                  <div className="col-span-2 md:col-span-1">
                    <span className="field-label md:hidden">Shoot Date</span>
                    <input
                      type="date"
                      className="input input-sm md:input-md w-full"
                      value={formData.shootdate[i] || ""}
                      onChange={(e) => setCell("shootdate", i, e.target.value)}
                    />
                    <input
                      type="text"
                      className="input input-xs mt-1 w-full md:input-sm"
                      placeholder="Label (optional) — e.g. Day 1"
                      value={formData.shootlabel[i] || ""}
                      onChange={(e) => setCell("shootlabel", i, e.target.value)}
                    />
                  </div>
                  <div>
                    <span className="field-label md:hidden">Extra Shift</span>
                    <input
                      type="text"
                      className="input input-sm md:input-md w-full"
                      placeholder="—"
                      value={formData.extrasheet[i] || ""}
                      onChange={(e) => setCell("extrasheet", i, e.target.value)}
                    />
                  </div>
                  <div>
                    <span className="field-label md:hidden">Conveyance</span>
                    <input
                      type="text"
                      className="input input-sm md:input-md w-full"
                      placeholder="—"
                      value={formData.conveyance[i] || ""}
                      onChange={(e) => setCell("conveyance", i, e.target.value)}
                    />
                  </div>
                  <div>
                    <span className="field-label md:hidden">Rate / Day</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="input input-sm md:input-md w-full"
                      placeholder="0"
                      value={formData.rateperday[i] || ""}
                      onChange={(e) => setCell("rateperday", i, e.target.value)}
                    />
                  </div>
                  <div>
                    <span className="field-label md:hidden">Amount (₹)</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="input input-sm md:input-md w-full font-semibold"
                      placeholder="0"
                      value={formData.amount[i] || ""}
                      onChange={(e) => setCell("amount", i, e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="absolute right-2 top-1.5 rounded-md p-1 text-base-content/35 hover:bg-error/10 hover:text-error md:static md:justify-self-center"
                    title="Remove row"
                    aria-label={`Remove day ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <button type="button" onClick={addRow} className="btn btn-outline btn-sm mt-3 gap-1.5 border-dashed">
              <Plus className="h-4 w-4" /> Add day
            </button>
          </SectionCard>

          {/* Options */}
          <div className="grid gap-5 sm:grid-cols-2">
            <SectionCard icon={PenLine} title="Signature">
              <div className="flex flex-col gap-2">
                <OptionPill
                  active={signatureType === "text"}
                  onClick={() => setSignatureType("text")}
                  title="Name as text"
                  desc={companyInfo?.signatureName ? `"${companyInfo.signatureName}"` : "Uses the signature name from your profile"}
                />
                <OptionPill
                  active={signatureType === "image"}
                  onClick={() => setSignatureType("image")}
                  title="Drawn signature"
                  desc={companyInfo?.digitalSignature ? "Your saved digital signature" : "No signature drawn yet — add one in Company"}
                />
              </div>
            </SectionCard>

            <SectionCard icon={Palette} title="PDF Design">
              <div className="flex flex-col gap-2">
                <OptionPill
                  active={pdfDesign === "current"}
                  onClick={() => setPdfDesign("current")}
                  title="Classic"
                  desc="Clean boxed layout, black & white"
                />
                <OptionPill
                  active={pdfDesign === "new"}
                  onClick={() => setPdfDesign("new")}
                  title="Premium"
                  desc="Dark header with gold accents"
                />
              </div>
            </SectionCard>
          </div>
        </div>

        {/* ---- Right column: sticky summary (desktop) ---- */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-4">
            <div className="surface p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <Receipt className="h-4 w-4 text-primary" /> Summary
              </h3>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-base-content/55">Client</dt>
                  <dd className="truncate font-semibold">{formData.billto || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-base-content/55">Bill No.</dt>
                  <dd className="font-semibold">{formData.billno || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-base-content/55">Days</dt>
                  <dd className="font-semibold">{rowCount}</dd>
                </div>
              </dl>
              <div className="mt-4 border-t border-dashed border-base-300 pt-4">
                <p className="text-xs font-medium text-base-content/50">Total Amount</p>
                <p className="text-2xl font-extrabold tracking-tight text-primary">{formatINR(total)}</p>
                <p className="mt-1 text-xs italic text-base-content/50">{formData.amountinword}</p>
              </div>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  className="btn btn-primary w-full gap-2"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {editId ? "Update & Download" : "Save & Download"}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={handlePreview} className="btn btn-ghost border border-base-300 gap-1.5">
                    <Eye className="h-4 w-4" /> Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave(false)}
                    className="btn btn-ghost border border-base-300"
                    disabled={saving}
                  >
                    Save only
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ---- Mobile sticky action bar ---- */}
      <div className="fixed inset-x-0 bottom-[calc(3.4rem+env(safe-area-inset-bottom))] z-30 border-t border-base-300 bg-base-100/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-base-content/50">Total</p>
            <p className="truncate text-lg font-extrabold leading-tight text-primary">{formatINR(total)}</p>
          </div>
          <button
            type="button"
            onClick={handlePreview}
            className="btn btn-ghost btn-sm btn-square border border-base-300"
            aria-label="Preview"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="btn btn-primary btn-sm gap-1.5"
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {editId ? "Update" : "Save & PDF"}
          </button>
        </div>
      </div>

      <PdfPreviewModal
        url={pdfUrl}
        title={`Invoice ${formData.billno || ""}`}
        onClose={() => setPdfUrl("")}
        onDownload={() => {
          setPdfUrl("");
          handleSave(true);
        }}
      />
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  FilePlus2,
  Files,
  IndianRupee,
  Users,
  TrendingUp,
  Copy,
  Download,
  ArrowRight,
  Building2,
  Loader2,
  Receipt,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { listBills, getCompanyProfile, bumpDownloadCount } from "../lib/billsService";
import { generateInvoicePdf, loadPdfAssets, invoiceFileName } from "../lib/pdf";
import { formatINR, formatDateHuman } from "../lib/format";

function StatCard({ icon: Icon, label, value, tint }) {
  return (
    <div className="surface flex items-center gap-3.5 p-4">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tint}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-base-content/50">{label}</p>
        <p className="truncate text-lg font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [bills, setBills] = useState(null);
  const [profile, setProfile] = useState(null);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const [b, p] = await Promise.all([listBills(user.uid), getCompanyProfile(user.uid)]);
        if (!active) return;
        setBills(b);
        setProfile(p ?? undefined);
      } catch (err) {
        console.error("Dashboard load failed:", err);
        if (active) {
          setBills([]);
          toast("error", "Could not load your bills. Please refresh.");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [user, toast]);

  const stats = useMemo(() => {
    if (!bills) return null;
    const total = bills.reduce((s, b) => s + (parseFloat(b.totalamount) || 0), 0);
    const now = new Date();
    const thisMonth = bills.filter((b) => {
      const d = new Date(b.createdAt || b.billdate);
      return !isNaN(d) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthTotal = thisMonth.reduce((s, b) => s + (parseFloat(b.totalamount) || 0), 0);
    const clients = new Set(bills.map((b) => (b.billto || "").trim().toLowerCase()).filter(Boolean));
    return { count: bills.length, total, monthCount: thisMonth.length, monthTotal, clients: clients.size };
  }, [bills]);

  const firstName = (user?.displayName || user?.email || "").split(" ")[0].split("@")[0];
  const profileIncomplete = profile === undefined || !profile?.companyName;

  const handleDownload = async (bill) => {
    setDownloading(bill.id);
    try {
      const assets = await loadPdfAssets();
      const companyInfo = await getCompanyProfile(user.uid);
      const doc = generateInvoicePdf({
        formData: bill,
        companyInfo,
        signatureType: bill.signatureType || "text",
        pdfDesign: bill.pdfDesign || "current",
        assets,
      });
      doc.save(invoiceFileName(bill.billno));
      bumpDownloadCount(user.uid);
    } catch (err) {
      console.error("Download failed:", err);
      toast("error", "Could not generate the PDF.");
    } finally {
      setDownloading(null);
    }
  };

  if (!bills) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  const recent = bills.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">
            Hello{firstName ? `, ${firstName}` : ""} 👋
          </h1>
          <p className="mt-0.5 text-sm text-base-content/55">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <Link to="/bill" className="btn btn-primary gap-2">
          <FilePlus2 className="h-4 w-4" /> New Bill
        </Link>
      </div>

      {/* Profile setup nudge */}
      {profileIncomplete && (
        <div className="surface flex flex-wrap items-center gap-3 border-warning/40 bg-warning/10 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/20 text-warning-content">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Finish setting up your company</p>
            <p className="text-xs text-base-content/60">
              Your company name, bank details and signature appear on every bill.
            </p>
          </div>
          <Link to="/profile" className="btn btn-warning btn-sm gap-1">
            Set up <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Files} label="Bills created" value={stats.count} tint="bg-primary/10 text-primary" />
        <StatCard icon={TrendingUp} label="This month" value={formatINR(stats.monthTotal)} tint="bg-success/10 text-success" />
        <StatCard icon={IndianRupee} label="Total billed" value={formatINR(stats.total)} tint="bg-accent/20 text-accent-content" />
        <StatCard icon={Users} label="Clients" value={stats.clients} tint="bg-secondary/10 text-secondary" />
      </div>

      {/* Recent bills */}
      <div className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-base-300 px-4 py-3.5 sm:px-5">
          <h2 className="text-sm font-bold">Recent bills</h2>
          {bills.length > 0 && (
            <Link to="/bills" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Receipt className="h-7 w-7" />
            </span>
            <div>
              <p className="font-semibold">No bills yet</p>
              <p className="mt-1 text-sm text-base-content/55">
                Create your first bill — it will be saved here so you can duplicate it next time.
              </p>
            </div>
            <Link to="/bill" className="btn btn-primary btn-sm gap-1.5 mt-1">
              <FilePlus2 className="h-4 w-4" /> Create your first bill
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-base-200">
            {recent.map((bill) => (
              <li key={bill.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span className="hidden sm:grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-base-200 text-base-content/60">
                  <Receipt className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {bill.billto || "Untitled client"}
                    <span className="ml-2 text-xs font-medium text-base-content/45">#{bill.billno}</span>
                  </p>
                  <p className="truncate text-xs text-base-content/50">
                    {formatDateHuman(bill.billdate || bill.createdAt)}
                    {bill.projectname ? ` • ${bill.projectname}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold">{formatINR(bill.totalamount)}</p>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => handleDownload(bill)}
                    className="btn btn-ghost btn-sm btn-square text-base-content/55"
                    title="Download PDF"
                    disabled={downloading === bill.id}
                  >
                    {downloading === bill.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => navigate(`/bill?from=${bill.id}`)}
                    className="btn btn-ghost btn-sm btn-square text-base-content/55"
                    title="Duplicate this bill"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

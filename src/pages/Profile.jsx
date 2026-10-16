import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import {
  Building2,
  MapPin,
  Landmark,
  CreditCard,
  PenLine,
  Loader2,
  X,
  Eraser,
  Check,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getCompanyProfile, saveCompanyProfile } from "../lib/billsService";
import { track } from "../firebase";

const EMPTY_PROFILE = {
  companyName: "",
  address: "",
  state: "",
  district: "",
  pincode: "",
  contactNumber: "",
  companyEmail: "",
  gpayPhonepe: "",
  bankName: "",
  accountName: "",
  accountNo: "",
  ifscCode: "",
  branch: "",
  post: "",
  panNo: "",
  gstNo: "",
  signatureName: "",
  digitalSignature: "",
};

function Field({ label, name, value, onChange, required, placeholder, type = "text", className = "" }) {
  return (
    <div className={className}>
      <label className="field-label" htmlFor={name}>
        {label} {required && <span className="text-error">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        className="input w-full"
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, children }) {
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

export default function Profile() {
  const { user } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState(EMPTY_PROFILE);
  const [isExisting, setIsExisting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sigOpen, setSigOpen] = useState(false);
  const [savingSig, setSavingSig] = useState(false);
  const sigCanvas = useRef(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const data = await getCompanyProfile(user.uid);
        if (!active) return;
        if (data) {
          setForm({ ...EMPTY_PROFILE, ...data });
          setIsExisting(true);
        }
      } catch (err) {
        console.error("Error fetching company info:", err);
        toast("error", "Could not load your company profile.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, toast]);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyName || !form.contactNumber || !form.companyEmail) {
      toast("error", "Company name, contact number and email are required.");
      return;
    }
    setSaving(true);
    try {
      await saveCompanyProfile(user.uid, form);
      setIsExisting(true);
      track("company_profile_saved");
      toast("success", isExisting ? "Company profile updated." : "Company profile created.");
    } catch (err) {
      console.error("Error saving profile:", err);
      toast("error", "Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  };

  const saveSignature = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      toast("error", "Please draw a signature first.");
      return;
    }
    setSavingSig(true);
    try {
      let dataURL;
      try {
        dataURL = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png");
      } catch {
        dataURL = sigCanvas.current.getCanvas().toDataURL("image/png");
      }
      // Stored as base64 in Firestore — no Cloud Storage needed (free tier friendly).
      await saveCompanyProfile(user.uid, { ...form, digitalSignature: dataURL });
      setForm((f) => ({ ...f, digitalSignature: dataURL }));
      setIsExisting(true);
      setSigOpen(false);
      toast("success", "Signature saved.");
    } catch (err) {
      console.error("Error saving signature:", err);
      toast("error", "Failed to save the signature.");
    } finally {
      setSavingSig(false);
    }
  };

  const removeSignature = async () => {
    try {
      await saveCompanyProfile(user.uid, { ...form, digitalSignature: "" });
      setForm((f) => ({ ...f, digitalSignature: "" }));
      toast("success", "Signature removed.");
    } catch {
      toast("error", "Could not remove the signature.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Company Profile</h1>
        <p className="mt-0.5 text-sm text-base-content/55">
          These details appear on every bill you generate.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section icon={Building2} title="Basic Information">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company / Your Name" name="companyName" value={form.companyName} onChange={handleChange} required placeholder="e.g. Radheshyam Gupta" className="sm:col-span-2" />
            <Field label="Contact Number" name="contactNumber" value={form.contactNumber} onChange={handleChange} required placeholder="+91…" />
            <Field label="Email" name="companyEmail" value={form.companyEmail} onChange={handleChange} required type="email" placeholder="you@example.com" />
            <Field label="Designation / Post" name="post" value={form.post} onChange={handleChange} placeholder="e.g. Camera Attendant" />
          </div>
        </Section>

        <Section icon={MapPin} title="Address">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Street Address" name="address" value={form.address} onChange={handleChange} className="sm:col-span-2" placeholder="Flat / building / street" />
            <Field label="District / City" name="district" value={form.district} onChange={handleChange} />
            <Field label="State" name="state" value={form.state} onChange={handleChange} />
            <Field label="Pincode" name="pincode" value={form.pincode} onChange={handleChange} />
          </div>
        </Section>

        <Section icon={Landmark} title="Bank Details" subtitle="Shown on the bill so clients can pay you">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Account Holder Name" name="accountName" value={form.accountName} onChange={handleChange} />
            <Field label="Account Number" name="accountNo" value={form.accountNo} onChange={handleChange} />
            <Field label="Bank Name" name="bankName" value={form.bankName} onChange={handleChange} />
            <Field label="IFSC Code" name="ifscCode" value={form.ifscCode} onChange={handleChange} />
            <Field label="Branch" name="branch" value={form.branch} onChange={handleChange} />
            <Field label="GPay / PhonePe Number" name="gpayPhonepe" value={form.gpayPhonepe} onChange={handleChange} />
          </div>
        </Section>

        <Section icon={CreditCard} title="Tax Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="PAN Number" name="panNo" value={form.panNo} onChange={handleChange} />
            <Field label="GST Number" name="gstNo" value={form.gstNo} onChange={handleChange} />
          </div>
        </Section>

        <Section icon={PenLine} title="Signature" subtitle="Used on the bill — as a typed name or a drawn signature">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Signature Name (typed)" name="signatureName" value={form.signatureName} onChange={handleChange} placeholder="Name printed as signature" />
            <div>
              <span className="field-label">Drawn Signature</span>
              {form.digitalSignature ? (
                <div className="flex items-center gap-3">
                  <img
                    src={form.digitalSignature}
                    alt="Digital signature"
                    className="h-16 w-40 rounded-lg border border-base-300 bg-white object-contain p-1"
                  />
                  <div className="flex flex-col gap-1.5">
                    <button type="button" onClick={() => setSigOpen(true)} className="btn btn-outline btn-xs">
                      Redraw
                    </button>
                    <button type="button" onClick={removeSignature} className="btn btn-ghost btn-xs text-error">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setSigOpen(true)} className="btn btn-outline btn-sm gap-1.5">
                  <PenLine className="h-4 w-4" /> Draw signature
                </button>
              )}
            </div>
          </div>
        </Section>

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary w-full gap-2 sm:w-auto sm:min-w-56" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {isExisting ? "Update Profile" : "Save Profile"}
          </button>
        </div>
      </form>

      {/* Signature modal */}
      {sigOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
          onClick={() => !savingSig && setSigOpen(false)}
        >
          <div className="surface w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold">Draw your signature</h3>
              <button
                onClick={() => setSigOpen(false)}
                className="btn btn-ghost btn-sm btn-square"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-base-300 bg-white">
              <SignatureCanvas
                ref={sigCanvas}
                penColor="black"
                canvasProps={{ className: "w-full h-44 block" }}
              />
            </div>
            <p className="mt-2 text-xs text-base-content/50">Use your finger or mouse in the white area.</p>
            <div className="mt-4 flex justify-between gap-2">
              <button
                type="button"
                onClick={() => sigCanvas.current?.clear()}
                className="btn btn-ghost gap-1.5 border border-base-300"
              >
                <Eraser className="h-4 w-4" /> Clear
              </button>
              <button type="button" onClick={saveSignature} className="btn btn-primary gap-1.5" disabled={savingSig}>
                {savingSig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

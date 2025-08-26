import { useEffect, useRef, useState } from "react";
import { db, auth, analytics } from "./firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { logEvent } from "firebase/analytics";
import { useNavigate } from "react-router";
import jsPDF from "jspdf";
import SignatureCanvas from "react-signature-canvas";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
export default function Register() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const userId = user?.uid || localStorage.getItem("uid");

  const [form, setForm] = useState({
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
    digitalSignature: "", // <-- stores Firebase URL of signature
  });

  const [isExisting, setIsExisting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Signature modal state
  const sigCanvas = useRef(null);

  const [sigOpen, setSigOpen] = useState(false);
  const [loadingSig, setLoadingSig] = useState(false);

  useEffect(() => {
    if (analytics) {
      logEvent(analytics, "page_visited", { page: "Signup" });
    }

    const fetchform = async () => {
      if (!userId) return;
      try {
        const docRef = doc(db, "companyProfiles", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setForm(data);
          setIsExisting(true);
        }
      } catch (err) {
        console.error("Error fetching company info:", err);
      }
    };

    fetchform();
  }, [userId]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.companyName || !form.contactNumber || !form.companyEmail) {
      alert("❗ Please fill in all required fields.");
      return;
    }

    try {
      const uid = auth.currentUser?.uid || localStorage.getItem("uid");
      if (!uid) {
        alert("User not signed in.");
        return;
      }

      const payload = {
        ...form,
        userId: uid,
        updatedAt: new Date().toISOString(),
      };

      if (!isExisting) {
        payload.createdAt = new Date().toISOString();
      }

      await setDoc(doc(db, "companyProfiles", uid), payload);

      alert(
        isExisting ? "✅ Company profile updated!" : "✅ Company profile created!"
      );
      navigate("/bill");
    } catch (error) {
      console.error("❌ Error saving profile:", error);
      alert("Something went wrong. Check console.");
    }
  };

  // Save signature to Firebase Storage + Firestore
  const saveSignature = async () => {
    try {
      if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
        alert("Please provide a signature first!");
        return;
      }

      setLoadingSig(true);

      // ✅ Get base64 string (dataURL)
      let dataURL;
      try {
        dataURL = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png");
      } catch {
        dataURL = sigCanvas.current.getCanvas().toDataURL("image/png");
      }

      const uid = auth.currentUser?.uid || localStorage.getItem("uid");
      if (!uid) {
        alert("User not signed in.");
        return;
      }

      // ✅ Save base64 image string directly in Firestore
      await setDoc(
        doc(db, "companyProfiles", uid),
        { ...form, digitalSignature: dataURL },
        { merge: true }
      );

      // ✅ Update local state
      setForm((prev) => ({ ...prev, digitalSignature: dataURL }));

      setSigOpen(false);
      alert("Signature saved successfully!");
    } catch (error) {
      console.error("❌ Error saving signature to Firestore:", error);
      alert("Failed to save signature");
    } finally {
      setLoadingSig(false);
    }
  };



  // ----------------- PDF -----------------
  const [formData, setFormData] = useState({
    billto: "",
    projectname: "",
    campaign: "",
    billno: "",
    billdate: "",
    gst: "",
    amountinword: "",
    totalamount: "",
    shootdate: [""],
    extrasheet: [""],
    conveyance: [""],
    rateperday: [""],
    amount: [""],
  });

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFont("times");

    doc.setFontSize(34);
    doc.setFont(undefined, "bold");
    doc.text(form?.companyName || "Company Name", 105, 20, { align: "center" });

    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.text(form?.address || "Company Address", 105, 30, { align: "center" });

    doc.text(
      `${form?.district || ""}, ${form?.state || ""}, ${form?.pincode || ""
      }`,
      105,
      37,
      { align: "center" }
    );
    doc.setFont(undefined, "bold");
    doc.text(`Email Id.: ${form?.companyEmail || ""}`, 105, 45, {
      align: "center",
    });
    doc.text(`Contact No.: ${form?.contactNumber || ""}`, 105, 52, {
      align: "center",
    });

    doc.setFontSize(20);
    doc.text("INVOICE", 105, 70, { align: "center" });

    // footer
    doc.setFont(undefined, "bold");
    doc.rect(10, 265, 190, 10);
    doc.text(`Signature: ${form?.signatureName || ""}`, 12, 272);
    doc.text("Authorised Signature", 200, 272, { align: "right" });

    if (form.digitalSignature) {
      doc.addImage(form.digitalSignature, "PNG", 150, 260, 40, 20);
    }

    return doc;
  };

  return (
    <div className="hero min-h-screen bg-base-200 p-4">
      <div className="card w-full max-w-3xl shadow-2xl bg-base-100">
        <div className="card-body">
          <h2 className="text-2xl font-bold mb-4 text-center">
            {isExisting ? "Update Company Profile" : "Register Company"}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <h3 className="text-xl font-semibold col-span-full">
                Basic Information
              </h3>
              <div className="form-control">
                <label className="label" htmlFor="companyName">
                  <span className="label-text">Company Name *</span>
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                  required
                />
              </div>
              <div className="form-control">
                <label className="label" htmlFor="contactNumber">
                  <span className="label-text">Contact Number *</span>
                </label>
                <input
                  type="text"
                  id="contactNumber"
                  name="contactNumber"
                  value={form.contactNumber}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                  required
                />
              </div>
              <div className="form-control">
                <label className="label" htmlFor="companyEmail">
                  <span className="label-text">Company Email *</span>
                </label>
                <input
                  type="email"
                  id="companyEmail"
                  name="companyEmail"
                  value={form.companyEmail}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                  required
                />
              </div>
            </div>

            {/* Other Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <h3 className="text-xl font-semibold col-span-full">
                Other Information
              </h3>
              {["post", "panNo", "gstNo", "gpayPhonepe", "signatureName"].map(
                (field) => (
                  <div className="form-control" key={field}>
                    <label className="label" htmlFor={field}>
                      <span className="label-text">
                        {field.replace(/([A-Z])/g, " $1")}
                      </span>
                    </label>
                    <input
                      type="text"
                      id={field}
                      name={field}
                      value={form[field]}
                      onChange={handleChange}
                      className="input input-bordered w-full"
                    />
                  </div>
                )
              )}

              {/* Digital Signature */}
              <div className="form-control col-span-full">
                <label className="label">
                  <span className="label-text">Digital Signature</span>
                </label>
                {form.digitalSignature ? (
                  <img

                    src={form.digitalSignature}
                    alt="Digital Signature"
                    className="border rounded w-40 h-20 object-contain bg-white"
                  />
                ) : (
                  <p className="text-sm text-gray-500">
                    No signature added yet
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setSigOpen(true)}
                  className="btn btn-secondary mt-2"
                >
                  {form.digitalSignature ? "Update Signature" : "Add Signature"}
                </button>
              </div>
            </div>

            <div className="mt-6">
              <button type="submit" className="btn btn-primary w-full">
                {isExisting ? "Update Company Profile" : "Save Company Profile"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Floating Preview Button */}
      {/* <button
        type="button"
        className="btn btn-accent fixed bottom-6 right-6 shadow-lg z-50"
        onClick={() => {
          const doc = generatePDF();
          const url = doc.output("datauristring");
          setPdfUrl(url);
          setIsPreviewOpen(true);
        }}
      >
        Preview Invoice
      </button> */}

      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4">
          <div className="relative w-full h-full max-w-5xl max-h-[90vh] bg-white rounded shadow-lg">
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-2 right-2 text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded z-10"
            >
              Close
            </button>
            <iframe
              src={pdfUrl}
              title="Invoice Preview"
              className="w-full h-full rounded"
              frameBorder="0"
            ></iframe>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {sigOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-md w-full relative">
            <h3 className="text-black font-bold mb-2">Draw your Signature</h3>

            <SignatureCanvas
              ref={sigCanvas}
              penColor="black"
              canvasProps={{ className: "border border-black w-full h-20 rounded" }}
            />

            <div className="flex justify-between mt-3">
              <button
                onClick={() => sigCanvas.current.clear()}
                className="btn btn-outline"
              >
                Clear
              </button>
              <button
                onClick={saveSignature}
                className="btn btn-primary"
                disabled={loadingSig}
              >
                {loadingSig ? "Saving..." : "Save"}
              </button>
            </div>

            <button
              onClick={() => setSigOpen(false)}
              className="absolute top-2 right-2 text-red-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

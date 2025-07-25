import { useEffect, useState } from 'react';
import { db, auth, analytics } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import { useNavigate } from 'react-router';
import jsPDF from 'jspdf';

export default function Register() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const userId = user?.uid || localStorage.getItem('uid');

  const [form, setForm] = useState({
    companyName: '',
    address: '',
    state: '',
    district: '',
    pincode: '',
    contactNumber: '',
    companyEmail: '',
    gpayPhonepe: '',
    bankName: '',
    accountName: '',
    accountNo: '',
    ifscCode: '',
    branch: '',
    post: '',
    panNo: '',
    gstNo: '',
    signatureName: '',
  });

  const [isExisting, setIsExisting] = useState(false);

  useEffect(() => {
    if (analytics) {
      logEvent(analytics, 'page_visited', { page: 'Signup' });
    }

    const fetchform = async () => {
      if (!userId) return;

      try {
        const docRef = doc(db, 'companyProfiles', userId);
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
const [pdfUrl, setPdfUrl] = useState('');
const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.companyName || !form.contactNumber || !form.companyEmail) {
      alert('❗ Please fill in all required fields.');
      return;
    }

    try {
      const uid = auth.currentUser?.uid || localStorage.getItem('uid');
      if (!uid) {
        alert('User not signed in.');
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

      await setDoc(doc(db, 'companyProfiles', uid), payload);

      alert(isExisting ? '✅ Company profile updated!' : '✅ Company profile created!');
      navigate('/bill');
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      alert('Something went wrong. Check console.');
    }
  };

  const splitTextByLength = (text, length) => {
    if (!text) return [];
    const regex = new RegExp(`.{1,${length}}`, 'g');
    return text.match(regex);
  };
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

        // Header
        doc.setFontSize(34);
        doc.setFont(undefined, "bold");
        doc.text(form?.companyName || "RADHE GUPTA", 105, 20, { align: "center" });

        doc.setFontSize(11);
        doc.setFont(undefined, "normal");
        doc.text(
            form?.address ||
            "Flat No.411, Shree Sai Shraddha Chs. Ltd., Siddhart L.T. Road No.4 & 5,\nGoregaon West, Mumbai - 400 104",
            105,
            30,
            { align: "center" }
        );
    doc.setFont(undefined, "normal");
        doc.text(` ${form?.district || "district"}, ${form?.state || "state"}, ${form?.pincode || "pincode"}`, 105, 37, {
            align: "center",
        });
        doc.setFont(undefined, "bold");
        doc.text(`Email Id.: ${form?.companyEmail || "radheshyammau2@gmail.com"}`, 105, 45, {
            align: "center",
        });
        doc.text(`Contact No.: ${form?.contactNumber || "7985593140"}`, 105, 52, {
            align: "center",
        });

        doc.setFontSize(20);
        doc.text("INVOICE", 105, 70, { align: "center" });

        // Layout Boxes
        doc.rect(10, 75, 190, 180); // Outer Box
        doc.rect(48, 157, 38, 98); // Mid Column
        doc.rect(124, 157, 38, 98); // Right Column
        doc.line(100, 75, 100, 155); // ✅ Right-side border of left column only
        // Bill To
        doc.setFontSize(11);
        doc.setFont(undefined, "bold");
        doc.text("Bill To:", 12, 82);
        doc.setFont(undefined, "normal");
        doc.text(formData.billto, 30, 82);

        // Left Column Info
        doc.setFontSize(12); // Set font size to 12
        doc.setFont(undefined, "bold"); // Set font to bold

        let leftInfo = `Project Name : ${formData.projectname}`;
        if (formData.campaign) leftInfo += `\nCampaign Code : ${formData.campaign}`;
        leftInfo += `\nGPay/Phonepe: ${form?.gpayPhonepe || "+91 1231231231"}`;
        leftInfo += `\nBank Name : ${form?.bankName || "Bank of ****"}`;
        leftInfo += `\nAccount Name: ${form?.accountName || "Full Name"}`;
        leftInfo += `\nAccount No. : ${form?.accountNo || "282******14308"}`;
        leftInfo += `\nIFSC Code : ${form?.ifscCode || "BA***IBS"}`;
        leftInfo += `\nBranch : ${form?.branch || "Pa***har Mau 27***1"}`;

        // Convert to array of lines
        const lines = leftInfo.split('\n');

        // Draw the text with line height
        doc.text(lines, 12, 100, { lineHeightFactor: 1.5 }); // 1.5 gives a nice readable spacing


        // Right Column Info
        doc.setFont(undefined, "bold");

        let rightInfo = `Bill No.: ${formData.billno}
Bill Date: ${formData.billdate}
Post : ${form.post || ""}
Pan No.: ${form?.panNo || "DA***3*L"}
GSTIN/UIN : ${formData.gst || ""}`;

        // Split into array for lineHeightFactor to work
        const rightLines = rightInfo.split('\n');

        doc.text(rightLines, 102, 102, { lineHeightFactor: 2 });


        // Table Header
        const colStartY = 147;
        doc.setFont(undefined, "bold");
        doc.setFontSize(10);
        // doc.setDrawColor(0);
        doc.setFillColor(230, 230, 230);
        doc.rect(10, colStartY, 38, 10, "FD");
        doc.rect(48, colStartY, 38, 10, "FD");
        doc.rect(86, colStartY, 38, 10, "FD");
        doc.rect(124, colStartY, 38, 10, "FD");
        doc.rect(162, colStartY, 38, 10, "FD");

        doc.text("SHOOT DATE", 11, colStartY + 7);
        doc.text("EXTRA SHIFT", 49, colStartY + 7);
        doc.text("CONVEYANCE", 87, colStartY + 7);
        doc.text("RATE PER DAY", 125, colStartY + 7);
        doc.text("AMOUNT", 163, colStartY + 7);

      

        // Total
        doc.setFont(undefined, "bold");
        doc.rect(10, 245, 152, 10);
        doc.rect(162, 245, 38, 10);
        doc.text("TOTAL AMOUNT:", 160, 252, { align: "right" });
        doc.text(formData.totalamount || "", 164, 252, { align: "left" });

        // Amount in Words
        doc.setFont(undefined, "normal");
        doc.text(`Rupees In Words : ${formData.amountinword}`, 10, 260);

        // Footer
        doc.setFont(undefined, "bold");
        doc.rect(10, 265, 190, 10);
        doc.text(`Signature: ${form?.signatureName || "Radhe"}`, 12, 272);
        doc.text("Authorised Signature", 200, 272, { align: "right" });

        return doc;
    };


  return (
    <div className="hero min-h-screen bg-base-200 p-4">
      <div className="card w-full max-w-3xl shadow-2xl bg-base-100">
        <div className="card-body">
          <h2 className="text-2xl font-bold mb-4 text-center">
            {isExisting ? 'Update Company Profile' : 'Register Company'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <h3 className="text-xl font-semibold col-span-full">Basic Information</h3>
              <div className="form-control">
                <label className="label" htmlFor="companyName"><span className="label-text">Company Name *</span></label>
                <input type="text" id="companyName" name="companyName" value={form.companyName} onChange={handleChange} className="input input-bordered w-full" required />
              </div>
              <div className="form-control">
                <label className="label" htmlFor="contactNumber"><span className="label-text">Contact Number *</span></label>
                <input type="text" id="contactNumber" name="contactNumber" value={form.contactNumber} onChange={handleChange} className="input input-bordered w-full" required />
              </div>
              <div className="form-control">
                <label className="label" htmlFor="companyEmail"><span className="label-text">Company Email *</span></label>
                <input type="email" id="companyEmail" name="companyEmail" value={form.companyEmail} onChange={handleChange} className="input input-bordered w-full" required />
              </div>
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <h3 className="text-xl font-semibold col-span-full">Address</h3>
              {['address', 'state', 'district', 'pincode'].map((field) => (
                <div className="form-control" key={field}>
                  <label className="label" htmlFor={field}><span className="label-text">{field.charAt(0).toUpperCase() + field.slice(1)}</span></label>
                  <input type="text" id={field} name={field} value={form[field]} onChange={handleChange} className="input input-bordered w-full" />
                </div>
              ))}
            </div>

            {/* Bank Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <h3 className="text-xl font-semibold col-span-full">Bank Details</h3>
              {['bankName', 'accountName', 'accountNo', 'ifscCode', 'branch'].map((field) => (
                <div className="form-control" key={field}>
                  <label className="label" htmlFor={field}><span className="label-text">{field.replace(/([A-Z])/g, ' $1')}</span></label>
                  <input type="text" id={field} name={field} value={form[field]} onChange={handleChange} className="input input-bordered w-full" />
                </div>
              ))}
            </div>

            {/* Other Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <h3 className="text-xl font-semibold col-span-full">Other Information</h3>
              {['post', 'panNo', 'gstNo', 'gpayPhonepe', 'signatureName'].map((field) => (
                <div className="form-control" key={field}>
                  <label className="label" htmlFor={field}><span className="label-text">{field.replace(/([A-Z])/g, ' $1')}</span></label>
                  <input type="text" id={field} name={field} value={form[field]} onChange={handleChange} className="input input-bordered w-full" />
                </div>
              ))}
            </div>

            <div className="mt-6">
              <button type="submit" className="btn btn-primary w-full">
                {isExisting ? 'Update Company Profile' : 'Save Company Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 👁️ Floating Preview Button */}
    <button
  type="button"
  className="btn btn-accent fixed bottom-6 right-6 shadow-lg z-50"
  onClick={() => {
    const doc = generatePDF();
    const url = doc.output('datauristring');
    setPdfUrl(url);
    setIsPreviewOpen(true);
  }}
>
  Preview Invoice
</button>
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

    </div>
  );
}

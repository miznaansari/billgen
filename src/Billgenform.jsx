import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { db } from "./firebase";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";

// Utility: Convert number to words
function numberToWords(num) {

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if ((num = num.toString()).length > 9) return 'Overflow';
  const n = ('000000000' + num).substr(-9).match(/(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})/);
  if (!n) return;

  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + ' Crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + ' Lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + ' Thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + ' Hundred ' : '';
  str += (Number(n[5]) !== 0) ?
    ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + ' ' : '';

  return str.trim() + ' only';
}

export default function BillGenForm() {
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
  const [signatureType, setSignatureType] = useState("text"); // 👈 NEW state
  const [companyInfo, setCompanyInfo] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      const uid = localStorage.getItem("uid");
      if (!uid) return;
      const q = query(collection(db, "companyProfiles"), where("userId", "==", uid));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setCompanyInfo(querySnapshot.docs[0].data());
      }
    };
    fetchCompanyInfo();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  function splitTextByLength(text, maxLength) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = "";

    for (let word of words) {
      if ((currentLine + word).length <= maxLength) {
        currentLine += word + " ";
      } else {
        lines.push(currentLine.trim());
        currentLine = word + " ";
      }
    }

    if (currentLine.trim()) lines.push(currentLine.trim());
    return lines;
  }

  const handleArrayChange = (e, field, index) => {
    const updated = [...formData[field]];
    updated[index] = e.target.value;
    const newData = { ...formData, [field]: updated };

    // Recalculate amount total if amount array changed
    if (field === "amount") {
      const total = updated.reduce((sum, val) => sum + (parseFloat(val.trim()) || 0), 0);
      newData.totalamount = total.toString();
      newData.amountinword = numberToWords(total);
    }

    setFormData(newData);
  };

  const handleAddField = (field) => {
    setFormData({ ...formData, [field]: [...formData[field], ""] });
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFont("times");
    doc.setFontSize(34);
    doc.setFont(undefined, "bold");
    doc.text((companyInfo?.companyName || "RADHE GUPTA").toUpperCase(), 105, 20, { align: "center" });


    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    const rawAddress = companyInfo?.address ||
      "Flat No.411, Shree Sai Shraddha Chs. Ltd., Siddhart L.T. Road No.4 & 5, Goregaon West, Mumbai - 400 104";

    const addressLines = splitTextByLength(rawAddress, 100); // 60-char wrap

    doc.text(addressLines, 105, 30, {
      align: "center",
      lineHeightFactor: 1.5,
    });


    doc.setFont(undefined, "normal");
    doc.text(` ${companyInfo?.district || "district"}, ${companyInfo?.state || "state"}, ${companyInfo?.pincode || "pincode"}`, 105, 37, {
      align: "center",
    });
    doc.text(`Email Id.: ${companyInfo?.companyEmail || "radheshyammau2@gmail.com"}`, 105, 45, {
      align: "center",
    });
    doc.text(`Contact No.: ${companyInfo?.contactNumber || "7985593140"}`, 105, 52, {
      align: "center",
    });

    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.text("INVOICE", 105, 70, { align: "center" });

    doc.rect(10, 75, 190, 180); // Outer box
    doc.rect(48, 157, 38, 98); // Mid Column
    doc.rect(124, 157, 38, 98); // Right Column
    doc.line(100, 75, 100, 155); // Vertical Divider

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("Bill To:", 12, 82);
    doc.setFont(undefined, "bold");
    const billto = splitTextByLength(formData.billto, 35);
    doc.text(billto, 30, 82);

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("Project Name:", 12, 97);
    doc.setFont(undefined, "bold");
    const projectname = splitTextByLength(formData.projectname, 35);
    doc.text(projectname, 37, 97);

    let leftInfo = ``;
    if (formData.campaign) leftInfo += `\nCampaign Code : ${formData.campaign}`;
    leftInfo += `\nGPay/Phonepe: ${companyInfo?.gpayPhonepe || "+91 1231231231"}`;
    leftInfo += `\nBank Name : ${companyInfo?.bankName || "Bank of ****"}`;
    leftInfo += `\nAccount Name: ${companyInfo?.accountName || "Full Name"}`;
    leftInfo += `\nAccount No. : ${companyInfo?.accountNo || "282******14308"}`;
    leftInfo += `\nIFSC Code : ${companyInfo?.ifscCode || "BA***IBS"}`;
    leftInfo += `\nBranch : ${companyInfo?.branch || "Pa***har Mau 27***1"}`;
    doc.text(leftInfo.split("\n"), 12, 100, { lineHeightFactor: 1.5 });

    const rightInfo = `Bill No.: ${formData.billno}
Bill Date: ${formData.billdate}
Post : ${companyInfo.post || ''}
Pan No.: ${companyInfo?.panNo || "DA***3*L"}
GSTIN/UIN : ${formData.gst || ""}`;
    doc.text(rightInfo.split("\n"), 102, 102, { lineHeightFactor: 2 });

    const colStartY = 147;
    doc.setFont(undefined, "bold");
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

    const { shootdate, extrasheet, conveyance, rateperday, amount } = formData;
    let rowY = 157;
    for (let i = 0; i < shootdate.length; i++) {
      doc.setFont(undefined, "normal");
      doc.text(shootdate[i] || "", 10 + 38 / 2, rowY + 7, { align: "center" });
      doc.text(extrasheet[i] || "", 48 + 38 / 2, rowY + 7, { align: "center" });
      doc.text(conveyance[i] || "", 86 + 38 / 2, rowY + 7, { align: "center" });
      doc.text(rateperday[i] || "", 124 + 38 / 2, rowY + 7, { align: "center" });
      doc.text(amount[i] || "", 162 + 38 / 2, rowY + 7, { align: "center" });
      rowY += 7;
    }

    doc.setFont(undefined, "bold");
    doc.rect(10, 245, 152, 10);
    doc.rect(162, 245, 38, 10);
    doc.text("TOTAL AMOUNT:", 160, 252, { align: "right" });
    doc.text(formData.totalamount || "", 164, 252, { align: "left" });

    doc.setFont(undefined, "normal");
    doc.text(`Rupees In Words : ${formData.amountinword}`, 10, 260);

    doc.setFont(undefined, "bold");
    doc.rect(10, 265, 190, 10);
    if (signatureType === "text") {
      // ✅ Show signature name (old way)
      doc.text(`Signature: ${companyInfo?.signatureName || "No Sign Added"}`, 12, 272);
    } else if (signatureType === "image" && companyInfo?.digitalSignature) {
      // ✅ Show base64 image instead of text
      try {
      doc.text(`Signature`, 12, 272);

        doc.addImage(companyInfo.digitalSignature, "PNG", 29, 260, 40, 15);
      } catch (err) {
        console.error("❌ Failed to add signature image:", err);
        doc.text("Signature: [Invalid Image]", 12, 272);
      }
    }
    doc.text("Authorised Signature", 200, 272, { align: "right" });

    return doc;
  };

  const handleGeneratePDF = async (e) => {
    e.preventDefault();
    const docPdf = generatePDF();
    docPdf.save(`invoice-${formData.billno || "generated"}.pdf`);

    try {
      const uid = localStorage.getItem("uid");
      if (!uid) return;
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentCount = userSnap.data().downloadCount || 0;
        await updateDoc(userRef, { downloadCount: currentCount + 1 });
        console.log(`✅ Updated PDF download count: ${currentCount + 1}`);
      }
    } catch (err) {
      console.error("❌ Error updating download count:", err);
    }
  };

  const handlePreviewPDF = () => {
    const doc = generatePDF();
    setPdfUrl(doc.output("dataurlstring"));
    setPreviewOpen(true);
  };

  return (
    <div className="hero min-h-screen bg-base-200 p-4">
      <div className="card w-full max-w-4xl shadow-xl bg-base-100 p-6">
        <h2 className="text-2xl font-bold mb-6 text-center">Bill Generator</h2>

        <form onSubmit={handleGeneratePDF} className="space-y-8">

          {/* Invoice Details */}
          <div className="border p-4 rounded-lg">
            <h3 className="text-xl font-semibold mb-4 border-b pb-2">Invoice Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                ["billto", "Bill To"],
                ["projectname", "Project Name"],
                ["campaign", "Campaign Code (optional)"],
                ["billno", "Bill No"],
                ["billdate", "Bill Date"],
                ["gst", "GST"],
                // ["amountinword", "Amount in Words"],
                // ["totalamount", "Total Amount"],
              ].map(([name, label]) => (
                <div className="form-control" key={name}>
                  <label className="label" htmlFor={name}>
                    <span className="label-text font-medium">{label}</span>
                  </label>
                  <input
                    name={name}
                    id={name}
                    type="text"
                    className="input input-bordered w-full"
                    onChange={handleChange}
                    value={formData[name]}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Billing Details */}
          <div className="border p-4 rounded-lg">
            <h3 className="text-xl font-semibold mb-4 border-b pb-2">Billing Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                ["shootdate", "Shoot Date(s)"],
                ["extrasheet", "Extra Shift"],
                ["conveyance", "Conveyance"],
                ["rateperday", "Rate Per Day"],
                ["amount", "Amount"],
              ].map(([name, label]) => (
                <div className="form-control" key={name}>
                  <label className="label">
                    <span className="label-text font-medium">{label}</span>
                  </label>
                  {formData[name].map((val, idx) => (
                    <input
                      key={idx}
                      type="text"
                      className="input input-bordered w-full mb-2"
                      value={val}
                      onChange={(e) => handleArrayChange(e, name, idx)}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddField(name)}
                    className="btn btn-outline btn-sm mt-2"
                  >
                    + Add {label}
                  </button>
                </div>
              ))}
            </div>
          </div>
  <div className="border p-4 rounded-lg">
            <h3 className="text-xl font-semibold mb-4 border-b pb-2">
              Signature Options
            </h3>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="signatureType"
                  value="text"
                  checked={signatureType === "text"}
                  onChange={(e) => setSignatureType(e.target.value)}
                  className="radio"
                />
                Signature Name
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="signatureType"
                  value="image"
                  checked={signatureType === "image"}
                  onChange={(e) => setSignatureType(e.target.value)}
                  className="radio"
                />
                Digital Signature
              </label>
            </div>
          </div>
          {/* Submit Button */}
          <div>
            <button type="submit" className="btn btn-primary w-full text-lg">
              Generate Invoice PDF
            </button>
          </div>
        </form>
      </div>

      {/* Floating Preview Button */}
      <button
        type="button"
        onClick={handlePreviewPDF}
        className="fixed bottom-6 right-6 bg-primary text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-primary-focus"
        title="Live Preview"
      >
        👁️
      </button>

      {/* Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-base-200 bg-opacity-80 flex items-center justify-center p-4">
          <div className="relative w-full h-full max-w-5xl max-h-[90vh] bg-base-100 rounded shadow-lg">
            <button
              onClick={() => setPreviewOpen(false)}
              className="absolute top-2 right-2 text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded z-10"
            >
              Close
            </button>
            <iframe
              src={pdfUrl}
              title="PDF Preview"
              className="w-full h-full border rounded"
            />
          </div>
        </div>
      )}
    </div>

  );
}

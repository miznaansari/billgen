import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { db } from "./firebase";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";

// Utility: Convert number to words (Indian numbering system)
function numberToWords(num) {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if ((num = num.toString()).length > 9) return 'Overflow';
  const n = ('000000000' + num).substr(-9).match(/(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})/);
  if (!n) return '';

  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + ' Crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + ' Lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + ' Thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + ' Hundred ' : '';
  str += (Number(n[5]) !== 0) ?
    ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + ' ' : '';

  return str.trim();
}

function getBase64ImageFromUrl(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute("crossOrigin", "anonymous");
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}

export default function BillGenForm() {
  const [formData, setFormData] = useState({
    invoiceNo: "",
    billDate: "",
    project: "",
    poRefNo: "",
    productionHouse: "",
    clientAddress: "",
    contactPerson: "",
    clientMobile: "",
    clientEmail: "",
    clientGst: "",
    projectName: "",
    shootLocation: "",
    productionHead: "",
    lineProducer: "",
    director: "",
    dop: "",
    equipmentPackage: "",
    tableData: Array.from({ length: 10 }, () => ({ date: "", description: "", position: "", days: "", rate: "", amount: "" })),
    notes: "",
    subTotal: "0.00",
    gstPercent: "18",
    totalAmount: "0.00",
    amountInWords: ""
  });
  const [companyInfo, setCompanyInfo] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [lenseBase64, setLenseBase64] = useState(null);
  const [logoBase64, setLogoBase64] = useState(null);

  useEffect(() => {
    const loadImages = async () => {
      try {
        const lenseUrl = new URL('./assets/lense.png', import.meta.url).href;
        const logoUrl = new URL('./assets/logotheme.png', import.meta.url).href;
        const l64 = await getBase64ImageFromUrl(lenseUrl);
        const logo64 = await getBase64ImageFromUrl(logoUrl);
        setLenseBase64(l64);
        setLogoBase64(logo64);
      } catch (e) {
        console.error("Failed to load images", e);
      }
    };
    loadImages();

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
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      if (name === 'gstPercent') {
        recalculateTotals(newData);
      }
      return newData;
    });
  };

  const handleTableChange = (index, field, value) => {
    const updatedTable = [...formData.tableData];
    updatedTable[index][field] = value;

    if (field === "days" || field === "rate") {
      const days = parseFloat(updatedTable[index].days) || 0;
      const rate = parseFloat(updatedTable[index].rate) || 0;
      if (days && rate) {
        updatedTable[index].amount = (days * rate).toFixed(2);
      } else {
        updatedTable[index].amount = "";
      }
    }

    const newData = { ...formData, tableData: updatedTable };
    recalculateTotals(newData);
  };

  const addRow = () => {
    setFormData({
      ...formData,
      tableData: [...formData.tableData, { date: "", description: "", position: "", days: "", rate: "", amount: "" }]
    });
  };

  const recalculateTotals = (data) => {
    const subTotal = data.tableData.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
    const gstPercent = parseFloat(data.gstPercent) || 0;
    const totalAmount = subTotal + (subTotal * gstPercent / 100);
    
    const totalInt = Math.floor(totalAmount);
    const totalDecimal = Math.round((totalAmount - totalInt) * 100);
    const amountInWords = totalInt > 0 ? (numberToWords(totalInt) + (totalDecimal ? ` and ${totalDecimal}/100` : '') + ' Rupees only') : "";

    setFormData((prev) => ({
      ...prev,
      tableData: data.tableData,
      subTotal: subTotal.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      amountInWords
    }));
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const goldColor = [218, 165, 32];
    
    // --- TOP HEADER ---
    // Dark angled background
    doc.setFillColor(15, 15, 15);
    doc.triangle(0, 0, 0, 65, 120, 65, "F");
    doc.triangle(0, 0, 120, 65, 140, 0, "F");
    // Gold angled strip
    doc.setFillColor(...goldColor);
    doc.triangle(140, 0, 120, 65, 123, 65, "F");
    doc.triangle(140, 0, 143, 0, 123, 65, "F");

    if (lenseBase64) {
      doc.addImage(lenseBase64, "PNG", -10, -5, 60, 60);
    }

    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", 50, 10, 60, 15);
    } else {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text((companyInfo?.companyName || "RADHESHYAM GUPTA").toUpperCase(), 50, 18);
      doc.setTextColor(...goldColor);
      doc.setFontSize(10);
      doc.text("CAMERA DEPARTMENT", 50, 24);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    const address = companyInfo?.address || "Flat No. 411, Shree Sai Shraddha Chs. Ltd., Siddhart L.T. Road No. 4, Mumbai, Maharashtra - 400104";
    const splitAddress = doc.splitTextToSize(address, 65);
    doc.text(splitAddress, 50, 32);

    doc.setTextColor(...goldColor);
    doc.text(companyInfo?.companyEmail || "radheshyamgupta@gmail.com", 50, 48);
    doc.text(companyInfo?.contactNumber || "7XXXXXXXXX", 50, 54);

    // Right Side Header
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(32);
    doc.setFont(undefined, "bold");
    doc.text("INVOICE", 145, 25);

    doc.setFontSize(8);
    doc.text("INVOICE NO.", 130, 38); doc.text(":", 155, 38);
    doc.text("BILL DATE", 130, 44); doc.text(":", 155, 44);
    doc.text("PROJECT", 130, 50); doc.text(":", 155, 50);
    doc.text("PO / REF NO.", 130, 56); doc.text(":", 155, 56);

    doc.setFont(undefined, "normal");
    doc.text(formData.invoiceNo || "", 160, 38);
    doc.text(formData.billDate || "", 160, 44);
    doc.text(formData.project || "", 160, 50);
    doc.text(formData.poRefNo || "", 160, 56);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(160, 39, 200, 39);
    doc.line(160, 45, 200, 45);
    doc.line(160, 51, 200, 51);
    doc.line(160, 57, 200, 57);

    // --- MID SECTION (Boxes) ---
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(0.4);

    // BILL TO
    doc.roundedRect(10, 70, 92, 60, 3, 3, "S");
    doc.setFillColor(...goldColor);
    doc.triangle(10, 66, 10, 74, 45, 74, "F");
    doc.triangle(10, 66, 45, 74, 50, 66, "F");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("BILL TO", 18, 72);

    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    const btLabels = ["Production House / Client :", "Address :", "Contact Person :", "Mobile / Phone :", "Email :", "GSTIN / UIN :"];
    const btValues = [formData.productionHouse, formData.clientAddress, formData.contactPerson, formData.clientMobile, formData.clientEmail, formData.clientGst];
    let yOffset = 82;
    for (let i = 0; i < btLabels.length; i++) {
      doc.text(btLabels[i], 12, yOffset);
      const splitVal = doc.splitTextToSize(btValues[i] || "", 50);
      doc.text(splitVal, 48, yOffset);
      doc.setDrawColor(200, 200, 200);
      doc.line(48, yOffset + 1, 98, yOffset + 1);
      yOffset += Math.max(7, splitVal.length * 4);
    }

    // PROJECT DETAILS
    doc.setDrawColor(...goldColor);
    doc.roundedRect(108, 70, 92, 60, 3, 3, "S");
    doc.setFillColor(15, 15, 15);
    doc.triangle(108, 66, 108, 74, 155, 74, "F");
    doc.triangle(108, 66, 155, 74, 160, 66, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("PROJECT DETAILS", 116, 72);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    const pdLabels = ["Project Name :", "Shoot Location :", "Production Head :", "Line Producer :", "Director :", "DOP :", "Equipment Package :"];
    const pdValues = [formData.projectName, formData.shootLocation, formData.productionHead, formData.lineProducer, formData.director, formData.dop, formData.equipmentPackage];
    let yOffsetPd = 82;
    for (let i = 0; i < pdLabels.length; i++) {
      doc.text(pdLabels[i], 112, yOffsetPd);
      const splitVal = doc.splitTextToSize(pdValues[i] || "", 50);
      doc.text(splitVal, 142, yOffsetPd);
      doc.setDrawColor(200, 200, 200);
      doc.line(142, yOffsetPd + 1, 198, yOffsetPd + 1);
      yOffsetPd += Math.max(6.5, splitVal.length * 4);
    }

    // --- TABLE ---
    autoTable(doc, {
      startY: 135,
      head: [['DATE', 'DESCRIPTION\n(Camera Department)', 'POSITION', 'NO. OF\nDAYS / SHIFTS', 'RATE PER\nDAY (Rs)', 'AMOUNT\n(Rs)']],
      body: formData.tableData.map((row, index) => [
        row.date || '', 
        row.description || '', 
        row.position || '', 
        row.days || '', 
        row.rate || '', 
        row.amount || ''
      ]),
      theme: 'grid',
      styles: {
        fontSize: 8,
        halign: 'center',
        valign: 'middle',
        lineColor: [220, 220, 220],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [30, 20, 15], 
        textColor: goldColor,
        lineColor: goldColor,
        lineWidth: 0.2
      },
      columnStyles: {
        1: { halign: 'left', cellWidth: 55 }
      },
      didDrawPage: function (data) {
        if (lenseBase64) {
          doc.setGState(new doc.GState({opacity: 0.15}));
          // Draw watermark in center of table area
          doc.addImage(lenseBase64, "PNG", 55, 150, 100, 100);
          doc.setGState(new doc.GState({opacity: 1}));
        }
      }
    });

    let finalY = doc.lastAutoTable.finalY + 5;

    // --- FOOTER SECTION ---
    // Notes Box
    doc.setTextColor(...goldColor);
    doc.setFontSize(8);
    doc.setFont(undefined, "bold");
    doc.text("NOTES / REMARKS", 12, finalY);
    doc.setDrawColor(...goldColor);
    doc.line(42, finalY, 60, finalY);

    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(10, finalY - 5, 120, 20, 2, 2, "S");
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    doc.text(doc.splitTextToSize(formData.notes || "", 115), 12, finalY + 5);

    // Totals Box
    doc.setDrawColor(...goldColor);
    doc.rect(135, finalY - 5, 65, 20, "S");
    
    doc.line(135, finalY + 2, 200, finalY + 2);
    doc.line(135, finalY + 9, 200, finalY + 9);
    doc.line(175, finalY - 5, 175, finalY + 15);

    doc.setFont(undefined, "bold");
    doc.text("SUB TOTAL", 137, finalY);
    doc.text("Rs " + (formData.subTotal || "0"), 177, finalY);

    doc.text("GST @ " + formData.gstPercent + " %", 137, finalY + 7);
    const gstAmount = ((parseFloat(formData.subTotal) || 0) * (parseFloat(formData.gstPercent) || 0) / 100).toFixed(2);
    doc.text("Rs " + gstAmount, 177, finalY + 7);

    doc.setFillColor(180, 130, 50); // Gold-ish background
    doc.rect(135, finalY + 9, 65, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL AMOUNT", 137, finalY + 13.5);
    doc.text("Rs " + (formData.totalAmount || "0"), 177, finalY + 13.5);

    finalY += 22;

    // Words
    doc.setTextColor(0, 0, 0);
    doc.text("Amount In Words :", 10, finalY);
    doc.setFont(undefined, "normal");
    doc.text(formData.amountInWords || "", 40, finalY);
    doc.setDrawColor(150, 150, 150);
    doc.line(40, finalY + 1, 200, finalY + 1);

    finalY += 8;

    // Bank Details & Signature
    doc.setDrawColor(...goldColor);
    doc.roundedRect(10, finalY, 95, 25, 2, 2, "S");
    doc.setFillColor(15, 15, 15);
    doc.triangle(10, finalY - 2, 10, finalY + 4, 40, finalY + 4, "F");
    doc.triangle(10, finalY - 2, 40, finalY + 4, 45, finalY - 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, "bold");
    doc.text("BANK DETAILS", 14, finalY + 2);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text("Account Name  : " + (companyInfo?.accountName || "RADHESHYAM GUPTA"), 12, finalY + 9);
    doc.text("Account No.     : " + (companyInfo?.accountNo || "XXXXXXXXXXXX"), 12, finalY + 13);
    doc.text("Bank Name       : " + (companyInfo?.bankName || ""), 12, finalY + 17);
    doc.text("Branch             : " + (companyInfo?.branch || ""), 12, finalY + 21);
    doc.text("IFSC Code        : " + (companyInfo?.ifscCode || ""), 12, finalY + 25);

    doc.roundedRect(115, finalY, 85, 25, 2, 2, "S");
    doc.setFillColor(15, 15, 15);
    doc.triangle(115, finalY - 2, 115, finalY + 4, 165, finalY + 4, "F");
    doc.triangle(115, finalY - 2, 165, finalY + 4, 170, finalY - 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, "bold");
    doc.text("AUTHORISED SIGNATURE", 120, finalY + 2);

    doc.setDrawColor(0, 0, 0);
    doc.line(125, finalY + 19, 195, finalY + 19);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    doc.text("(Radheshyam Gupta)", 160, finalY + 23, { align: "center" });

    // Bottom Bar
    doc.setFillColor(15, 15, 15);
    doc.rect(0, 285, 210, 12, "F");
    doc.setTextColor(...goldColor);
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("THANK YOU FOR YOUR BUSINESS!", 105, 292, { align: "center" });
    doc.setDrawColor(...goldColor);
    doc.line(30, 291, 70, 291);
    doc.line(140, 291, 180, 291);

    return doc;
  };

  const handleGeneratePDF = async (e) => {
    e.preventDefault();
    const docPdf = generatePDF();
    docPdf.save(`invoice-${formData.invoiceNo || "generated"}.pdf`);

    try {
      const uid = localStorage.getItem("uid");
      if (!uid) return;
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentCount = userSnap.data().downloadCount || 0;
        await updateDoc(userRef, { downloadCount: currentCount + 1 });
      }
    } catch (err) {
      console.error("Error updating count:", err);
    }
  };

  const handlePreviewPDF = () => {
    const doc = generatePDF();
    setPdfUrl(doc.output("dataurlstring"));
    setPreviewOpen(true);
  };

  return (
    <div className="min-h-screen bg-base-200 p-4">
      <div className="max-w-6xl mx-auto bg-base-100 p-6 rounded-xl shadow-xl">
        <h2 className="text-3xl font-bold mb-8 text-center border-b pb-4">Bill Generator</h2>

        <form onSubmit={handleGeneratePDF} className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* INVOICE DETAILS */}
            <div className="p-4 border rounded-lg bg-base-50">
              <h3 className="text-lg font-bold mb-4">Invoice Info</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label"><span className="label-text">Invoice No.</span></label>
                  <input type="text" name="invoiceNo" className="input input-bordered input-sm" value={formData.invoiceNo} onChange={handleChange} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Bill Date</span></label>
                  <input type="date" name="billDate" className="input input-bordered input-sm" value={formData.billDate} onChange={handleChange} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Project</span></label>
                  <input type="text" name="project" className="input input-bordered input-sm" value={formData.project} onChange={handleChange} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">PO / Ref No.</span></label>
                  <input type="text" name="poRefNo" className="input input-bordered input-sm" value={formData.poRefNo} onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* BILL TO */}
            <div className="p-4 border rounded-lg bg-base-50">
              <h3 className="text-lg font-bold mb-4">Bill To</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control col-span-2">
                  <label className="label"><span className="label-text">Production House / Client</span></label>
                  <input type="text" name="productionHouse" className="input input-bordered input-sm" value={formData.productionHouse} onChange={handleChange} />
                </div>
                <div className="form-control col-span-2">
                  <label className="label"><span className="label-text">Address</span></label>
                  <input type="text" name="clientAddress" className="input input-bordered input-sm" value={formData.clientAddress} onChange={handleChange} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Contact Person</span></label>
                  <input type="text" name="contactPerson" className="input input-bordered input-sm" value={formData.contactPerson} onChange={handleChange} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Mobile / Phone</span></label>
                  <input type="text" name="clientMobile" className="input input-bordered input-sm" value={formData.clientMobile} onChange={handleChange} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Email</span></label>
                  <input type="text" name="clientEmail" className="input input-bordered input-sm" value={formData.clientEmail} onChange={handleChange} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">GSTIN / UIN</span></label>
                  <input type="text" name="clientGst" className="input input-bordered input-sm" value={formData.clientGst} onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* PROJECT DETAILS */}
            <div className="p-4 border rounded-lg bg-base-50 md:col-span-2">
              <h3 className="text-lg font-bold mb-4">Project Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="form-control">
                  <label className="label"><span className="label-text">Project Name</span></label>
                  <input type="text" name="projectName" className="input input-bordered input-sm" value={formData.projectName} onChange={handleChange} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Shoot Location</span></label>
                  <input type="text" name="shootLocation" className="input input-bordered input-sm" value={formData.shootLocation} onChange={handleChange} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Production Head</span></label>
                  <input type="text" name="productionHead" className="input input-bordered input-sm" value={formData.productionHead} onChange={handleChange} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Line Producer</span></label>
                  <input type="text" name="lineProducer" className="input input-bordered input-sm" value={formData.lineProducer} onChange={handleChange} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Director</span></label>
                  <input type="text" name="director" className="input input-bordered input-sm" value={formData.director} onChange={handleChange} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">DOP</span></label>
                  <input type="text" name="dop" className="input input-bordered input-sm" value={formData.dop} onChange={handleChange} />
                </div>
                <div className="form-control col-span-2">
                  <label className="label"><span className="label-text">Equipment Package</span></label>
                  <input type="text" name="equipmentPackage" className="input input-bordered input-sm" value={formData.equipmentPackage} onChange={handleChange} />
                </div>
              </div>
            </div>
          </div>

          {/* TABLE DATA */}
          <div className="border p-4 rounded-lg overflow-x-auto bg-base-50">
            <h3 className="text-lg font-bold mb-4">Items / Details</h3>
            <table className="table table-compact w-full border">
              <thead className="bg-base-200">
                <tr>
                  <th>No.</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Position</th>
                  <th>Days/Shifts</th>
                  <th>Rate Per Day</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {formData.tableData.map((row, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td><input type="text" className="input input-bordered input-xs w-24" value={row.date} onChange={(e) => handleTableChange(index, "date", e.target.value)} /></td>
                    <td><input type="text" className="input input-bordered input-xs w-full" value={row.description} onChange={(e) => handleTableChange(index, "description", e.target.value)} /></td>
                    <td><input type="text" className="input input-bordered input-xs w-full" value={row.position} onChange={(e) => handleTableChange(index, "position", e.target.value)} /></td>
                    <td><input type="number" className="input input-bordered input-xs w-16" value={row.days} onChange={(e) => handleTableChange(index, "days", e.target.value)} /></td>
                    <td><input type="number" className="input input-bordered input-xs w-20" value={row.rate} onChange={(e) => handleTableChange(index, "rate", e.target.value)} /></td>
                    <td><input type="text" readOnly className="input input-bordered input-xs w-20 bg-base-200" value={row.amount} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" onClick={addRow} className="btn btn-sm btn-outline mt-4">+ Add Row</button>
          </div>

          {/* TOTALS & NOTES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="form-control">
              <label className="label"><span className="label-text">Notes / Remarks</span></label>
              <textarea name="notes" className="textarea textarea-bordered h-24" value={formData.notes} onChange={handleChange}></textarea>
            </div>
            
            <div className="border p-4 rounded-lg bg-base-50">
               <div className="flex justify-between mb-2">
                 <span className="font-bold">Sub Total:</span>
                 <span>Rs {formData.subTotal}</span>
               </div>
               <div className="flex justify-between mb-2 items-center">
                 <span className="font-bold">GST %:</span>
                 <input type="number" name="gstPercent" className="input input-bordered input-xs w-16 text-right" value={formData.gstPercent} onChange={handleChange} />
               </div>
               <div className="flex justify-between mt-4 pt-2 border-t text-lg">
                 <span className="font-bold">Total Amount:</span>
                 <span className="font-bold">Rs {formData.totalAmount}</span>
               </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full text-lg mt-8">Generate Invoice PDF</button>
        </form>
      </div>

      <button
        type="button"
        onClick={handlePreviewPDF}
        className="fixed bottom-6 right-6 bg-primary text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-primary-focus z-40"
        title="Live Preview"
      >
        👁️
      </button>

      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-base-100 flex justify-between p-2 rounded-t">
            <h3 className="text-lg font-bold">PDF Preview</h3>
            <button onClick={() => setPreviewOpen(false)} className="btn btn-sm btn-error">Close</button>
          </div>
          <iframe src={pdfUrl} title="PDF Preview" className="w-full max-w-5xl h-[85vh] bg-white rounded-b" />
        </div>
      )}
    </div>
  );
}

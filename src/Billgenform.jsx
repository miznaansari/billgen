import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { db } from "./firebase";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import autoTable from "jspdf-autotable";
import { Trash2 } from "lucide-react";

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

  return str.trim() + ' only';
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
  const [signatureType, setSignatureType] = useState("text");
  const [pdfDesign, setPdfDesign] = useState("current");
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
    setFormData({ ...formData, [name]: value });
  };

  const handleArrayChange = (e, field, index) => {
    const updated = [...formData[field]];
    updated[index] = e.target.value;
    const newData = { ...formData, [field]: updated };

    // Recalculate total amount & amount in words if amount changed
    if (field === "amount") {
      const total = updated.reduce((sum, val) => sum + (parseFloat(val.trim()) || 0), 0);
      newData.totalamount = total.toFixed(2);
      const totalInt = Math.floor(total);
      const totalDecimal = Math.round((total - totalInt) * 100);
      newData.amountinword = numberToWords(totalInt) + (totalDecimal ? ` and ${totalDecimal}/100` : '') + ' only';
    }

    setFormData(newData);
  };

  const handleAddField = (field) => {
    setFormData({ ...formData, [field]: [...formData[field], ""] });
  };

  const handleRemoveField = (field, index) => {
    const updated = [...formData[field]];
    updated.splice(index, 1);
    const newData = { ...formData, [field]: updated };

    if (field === "amount") {
      const total = updated.reduce((sum, val) => sum + (parseFloat(val.trim()) || 0), 0);
      newData.totalamount = total.toFixed(2);
      const totalInt = Math.floor(total);
      const totalDecimal = Math.round((total - totalInt) * 100);
      newData.amountinword = numberToWords(totalInt) + (totalDecimal ? ` and ${totalDecimal}/100` : '') + ' only';
    }

    setFormData(newData);
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

  const generateNewPDF = () => {
    const doc = new jsPDF();
    const goldColor = [218, 165, 32];

    // --- TOP HEADER ---
    doc.setFillColor(15, 15, 15);
    doc.setDrawColor(15, 15, 15);
    doc.setLineWidth(0.5);
    doc.triangle(0, 0, 0, 65, 120, 65, "FD");
    doc.triangle(0, 0, 120, 65, 140, 0, "FD");

    doc.setFillColor(...goldColor);
    doc.setDrawColor(...goldColor);
    doc.triangle(140, 0, 120, 65, 123, 65, "FD");
    doc.triangle(140, 0, 143, 0, 123, 65, "FD");

    if (lenseBase64) {
      doc.addImage(lenseBase64, "PNG", -10, -5, 60, 60);
    }

    let textStartX = 50;
    if (logoBase64) {
      // Draw the logo icon on the left
      doc.addImage(logoBase64, "PNG", 50, 7, 18, 18);
      textStartX = 72; // Shift text to the right of the logo
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text((companyInfo?.companyName || "RADHESHYAM GUPTA").toUpperCase(), textStartX, 15);

    doc.setTextColor(...goldColor);
    doc.setFontSize(10);
    doc.text("CAMERA DEPARTMENT", textStartX, 22);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    const address = companyInfo?.address || "Flat No. 411, Shree Sai Shraddha Chs. Ltd., Siddhart L.T. Road No. 4, Mumbai, Maharashtra - 400104";
    const splitAddress = doc.splitTextToSize(address, 65);
    doc.text(splitAddress, 50, 32);

    let contactStartY = 32 + (splitAddress.length * 4) + 4;
    if (contactStartY < 48) contactStartY = 48;

    doc.setTextColor(...goldColor);
    doc.text(companyInfo?.companyEmail || "radheshyamgupta@gmail.com", 50, contactStartY);
    doc.text(companyInfo?.contactNumber || "7XXXXXXXXX", 50, contactStartY + 6);

    // Right Side Header
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(32);
    doc.setFont(undefined, "bold");
    doc.text("INVOICE", 145, 25);

    doc.setFontSize(8);
    let rightY = 38;

    doc.setFont(undefined, "bold");
    doc.text("INVOICE NO.", 130, rightY); doc.text(":", 155, rightY);
    doc.setFont(undefined, "normal"); doc.text(formData.billno || "", 160, rightY);
    doc.setDrawColor(200, 200, 200); doc.line(160, rightY + 1.5, 200, rightY + 1.5);

    rightY += 6;
    doc.setFont(undefined, "bold");
    doc.text("BILL DATE", 130, rightY); doc.text(":", 155, rightY);
    doc.setFont(undefined, "normal"); doc.text(formData.billdate || "", 160, rightY);
    doc.line(160, rightY + 1.5, 200, rightY + 1.5);

    rightY += 6;
    doc.setFont(undefined, "bold");
    doc.text("PROJECT", 130, rightY); doc.text(":", 155, rightY);
    doc.setFont(undefined, "normal");
    const splitProject = doc.splitTextToSize(formData.projectname || "", 40);
    for (let j = 0; j < splitProject.length; j++) {
      doc.text(splitProject[j], 160, rightY + (j * 5));
      doc.line(160, rightY + (j * 5) + 1.5, 200, rightY + (j * 5) + 1.5);
    }

    rightY += Math.max(6, splitProject.length * 5 + 1);
    doc.setFont(undefined, "bold");
    doc.text("PO / REF NO.", 130, rightY); doc.text(":", 155, rightY);
    doc.setFont(undefined, "normal");
    const splitCampaign = doc.splitTextToSize(formData.campaign || "", 40);
    for (let j = 0; j < splitCampaign.length; j++) {
      doc.text(splitCampaign[j], 160, rightY + (j * 5));
      doc.line(160, rightY + (j * 5) + 1.5, 200, rightY + (j * 5) + 1.5);
    }

    let boxStartY = Math.max(70, rightY + (splitCampaign.length * 5) + 5, contactStartY + 15);

    // --- MID SECTION (Boxes) ---
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(0.4);

    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    const btLabels = ["Production House / Client :", "Address :", "Contact Person :", "Mobile / Phone :", "Email :", "GSTIN / UIN :"];
    const btValues = [formData.billto, formData.address || "", "", "", "", formData.gst || ""];
    const btSplitValues = btValues.map(v => doc.splitTextToSize(v || "", 50));
    let btTotalHeight = 0;
    btSplitValues.forEach(splitVal => {
      btTotalHeight += Math.max(7, splitVal.length * 5.5);
    });

    const pdLabels = ["Project Name :", "Shoot Location :", "Production Head :", "Line Producer :", "Director :", "DOP :", "Equipment Package :"];
    const pdValues = [formData.projectname, "", "", "", "", "", ""];
    const pdSplitValues = pdValues.map(v => doc.splitTextToSize(v || "", 50));
    let pdTotalHeight = 0;
    pdSplitValues.forEach(splitVal => {
      pdTotalHeight += Math.max(7, splitVal.length * 5.5);
    });

    const boxHeight = Math.max(60, btTotalHeight + 15, pdTotalHeight + 15);

    // BILL TO
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(0.4);
    doc.roundedRect(10, boxStartY, 92, boxHeight, 3, 3, "S");

    doc.setFillColor(...goldColor);
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(0.5);
    doc.triangle(10, boxStartY - 4, 10, boxStartY + 4, 45, boxStartY + 4, "FD");
    doc.triangle(10, boxStartY - 4, 45, boxStartY + 4, 50, boxStartY - 4, "FD");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("BILL TO", 18, boxStartY + 2);

    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    let yOffset = boxStartY + 12;
    for (let i = 0; i < btLabels.length; i++) {
      doc.text(btLabels[i], 12, yOffset);
      const splitVal = btSplitValues[i];
      for (let j = 0; j < splitVal.length; j++) {
        doc.text(splitVal[j], 48, yOffset + (j * 5.5));
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.line(48, yOffset + (j * 5.5) + 1.5, 98, yOffset + (j * 5.5) + 1.5);
      }
      yOffset += Math.max(7, splitVal.length * 5.5);
    }

    // PROJECT DETAILS
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(0.4);
    doc.roundedRect(108, boxStartY, 92, boxHeight, 3, 3, "S");

    doc.setFillColor(15, 15, 15);
    doc.setDrawColor(15, 15, 15);
    doc.setLineWidth(0.5);
    doc.triangle(108, boxStartY - 4, 108, boxStartY + 4, 155, boxStartY + 4, "FD");
    doc.triangle(108, boxStartY - 4, 155, boxStartY + 4, 160, boxStartY - 4, "FD");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("PROJECT DETAILS", 116, boxStartY + 2);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    let yOffsetPd = boxStartY + 12;
    for (let i = 0; i < pdLabels.length; i++) {
      doc.text(pdLabels[i], 112, yOffsetPd);
      const splitVal = pdSplitValues[i];
      for (let j = 0; j < splitVal.length; j++) {
        doc.text(splitVal[j], 142, yOffsetPd + (j * 5.5));
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.line(142, yOffsetPd + (j * 5.5) + 1.5, 198, yOffsetPd + (j * 5.5) + 1.5);
      }
      yOffsetPd += Math.max(7, splitVal.length * 5.5);
    }

    // --- TABLE ---
    const tableBody = [];
    const maxRowsData = Math.max(10, formData.shootdate.length, formData.extrasheet.length, formData.conveyance.length, formData.rateperday.length, formData.amount.length);
    for (let i = 0; i < maxRowsData; i++) {
      tableBody.push([
        formData.shootdate[i] || '',
        formData.extrasheet[i] || '',
        formData.conveyance[i] || '',
        '', // days
        formData.rateperday[i] || '',
        formData.amount[i] || ''
      ]);
    }

    autoTable(doc, {
      startY: boxStartY + boxHeight + 5,
      head: [['DATE', 'DESCRIPTION\n(Camera Department)', 'POSITION', 'NO. OF\nDAYS / SHIFTS', 'RATE PER\nDAY (Rs)', 'AMOUNT\n(Rs)']],
      body: tableBody,
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
          doc.setGState(new doc.GState({ opacity: 0.15 }));
          doc.addImage(lenseBase64, "PNG", 55, 150, 100, 100);
          doc.setGState(new doc.GState({ opacity: 1 }));
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
    doc.text("", 12, finalY + 5);

    // Totals Box
    doc.setDrawColor(...goldColor);
    doc.rect(135, finalY - 5, 65, 20, "S");

    doc.line(135, finalY + 2, 200, finalY + 2);
    doc.line(135, finalY + 9, 200, finalY + 9);
    doc.line(175, finalY - 5, 175, finalY + 15);

    doc.setFont(undefined, "bold");
    doc.text("SUB TOTAL", 137, finalY);
    doc.text("Rs " + (formData.totalamount || "0"), 177, finalY);

    doc.text("GST @ ___ %", 137, finalY + 7);
    doc.text("Rs 0.00", 177, finalY + 7);

    doc.setFillColor(180, 130, 50); // Gold-ish background
    doc.rect(135, finalY + 9, 65, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL AMOUNT", 137, finalY + 13.5);
    doc.text("Rs " + (formData.totalamount || "0"), 177, finalY + 13.5);

    finalY += 22;

    // Words
    doc.setTextColor(0, 0, 0);
    doc.text("Amount In Words :", 10, finalY);
    doc.setFont(undefined, "normal");
    doc.text(formData.amountinword || "", 40, finalY);
    doc.setDrawColor(150, 150, 150);
    doc.line(40, finalY + 1, 200, finalY + 1);

    finalY += 8;

    // Bank Details & Signature
    doc.setDrawColor(...goldColor);
    doc.setLineWidth(0.4);
    doc.roundedRect(10, finalY, 95, 25, 2, 2, "S");

    doc.setFillColor(15, 15, 15);
    doc.setDrawColor(15, 15, 15);
    doc.setLineWidth(0.5);
    doc.triangle(10, finalY - 2, 10, finalY + 4, 40, finalY + 4, "FD");
    doc.triangle(10, finalY - 2, 40, finalY + 4, 45, finalY - 2, "FD");

    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, "bold");
    doc.text("BANK DETAILS", 14, finalY + 2);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text("Account Name  : " + (companyInfo?.accountName || "RADHESHYAM GUPTA"), 12, finalY + 8);
    doc.text("Account No.     : " + (companyInfo?.accountNo || "XXXXXXXXXXXX"), 12, finalY + 12);
    doc.text("Bank Name       : " + (companyInfo?.bankName || ""), 12, finalY + 16);
    doc.text("Branch             : " + (companyInfo?.branch || ""), 12, finalY + 20);
    doc.text("IFSC Code        : " + (companyInfo?.ifscCode || ""), 12, finalY + 24);

    doc.setDrawColor(...goldColor);
    doc.setLineWidth(0.4);
    doc.roundedRect(115, finalY, 85, 25, 2, 2, "S");

    doc.setFillColor(15, 15, 15);
    doc.setDrawColor(15, 15, 15);
    doc.setLineWidth(0.5);
    doc.triangle(115, finalY - 2, 115, finalY + 4, 165, finalY + 4, "FD");
    doc.triangle(115, finalY - 2, 165, finalY + 4, 170, finalY - 2, "FD");
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

  const generatePDF = () => {
    if (pdfDesign === "new") return generateNewPDF();

    const doc = new jsPDF();
    doc.setFont("times");
    doc.setFontSize(34);
    doc.setFont(undefined, "bold");
    doc.text((companyInfo?.companyName || "RADHE GUPTA").toUpperCase(), 105, 20, { align: "center" });

    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    const rawAddress = companyInfo?.address || "Enter Your Address";
    const addressLines = splitTextByLength(rawAddress, 100);
    doc.text(addressLines, 105, 30, { align: "center", lineHeightFactor: 1.5 });

    doc.text(` ${companyInfo?.district || "district"}, ${companyInfo?.state || "state"}, ${companyInfo?.pincode || "pincode"}`, 105, 37, { align: "center" });
    doc.text(`Email Id.: ${companyInfo?.companyEmail || "Enter Your Email "}`, 105, 45, { align: "center" });
    doc.text(`Contact No.: ${companyInfo?.contactNumber || "Enter Your Mobile no"}`, 105, 52, { align: "center" });

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
    const billto = splitTextByLength(formData.billto, 28);
    doc.text(billto, 30, 82);



    doc.text("Project Name:", 12, 100);
    const projectname = splitTextByLength(formData.projectname, 30);
    doc.text(projectname, 37, 100);

    let leftInfo = ``;
    if (formData.address) leftInfo += `\nCompany Address. : ${splitTextByLength(formData.address, 28).join("\n")}`;

    if (formData.pan) leftInfo += `\nCompany GST No. : ${formData.gst}`;
    if (formData.pan) leftInfo += `\nCompany PAN No. : ${formData.pan}`;

    doc.text(leftInfo.split("\n"), 12, 106, { lineHeightFactor: 1.5 });

    let rightInfo = `Bill No.: ${formData.billno}
Bill Date: ${formData.billdate}
Post : ${companyInfo?.post || ''}
Pan No.: ${companyInfo?.panNo || "DA***3*L"} `;
    if (formData.campaign) leftInfo += `\nCampaign Code : ${formData.campaign}`;
    rightInfo += `\nGPay/Phonepe: ${companyInfo?.gpayPhonepe || "+91 1231231231"}`;
    rightInfo += `\nBank Name : ${companyInfo?.bankName || "Enter Your Bank of ****"}`;
    rightInfo += `\nAccount Name: ${companyInfo?.accountName || " Enter YourFull Name"}`;
    rightInfo += `\nAccount No. : ${companyInfo?.accountNo || " Enter Your282******14308"}`;
    rightInfo += `\nIFSC Code : ${companyInfo?.ifscCode || " Enter YourBA***IBS"}`;
    rightInfo += `\nBranch : ${companyInfo?.branch || " Enter YourPa***har Mau 27***1"}`;
    doc.text(rightInfo.split("\n"), 102, 82, { lineHeightFactor: 1.5 });

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
    const maxRows = Math.max(shootdate.length, extrasheet.length, conveyance.length, rateperday.length, amount.length);

    // Font size adjustment for many rows
    let rowGap = maxRows > 10 ? 4 : 5;
    doc.setFontSize(maxRows > 10 ? 10 : 12);
    doc.setFont(undefined, "normal");

    let rowY = 157;
    for (let i = 0; i < maxRows; i++) {
      doc.text(shootdate[i] || "", 10 + 38 / 2, rowY + rowGap, { align: "center" });
      doc.text(extrasheet[i] || "", 48 + 38 / 2, rowY + rowGap, { align: "center" });
      doc.text(conveyance[i] || "", 86 + 38 / 2, rowY + rowGap, { align: "center" });
      doc.text(rateperday[i] || "", 124 + 38 / 2, rowY + rowGap, { align: "center" });
      doc.text(amount[i] || "", 162 + 38 / 2, rowY + rowGap, { align: "center" });
      rowY += rowGap;
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
      doc.text(`Signature: ${companyInfo?.signatureName || "No Sign Added"}`, 12, 272);
    } else if (signatureType === "image" && companyInfo?.digitalSignature) {
      try {
        doc.text(`Signature`, 12, 272);
        doc.addImage(companyInfo.digitalSignature, "PNG", 29, 265, 40, 10);
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
                ["address", "Company Address"],
                ["campaign", "Campaign Code (optional)"],
                ["billno", "Bill No"],
                ["billdate", "Bill Date"],
                ["gst", "Company GST"],
                ["pan", " Company PAN"]
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
                    <div key={idx} className="flex gap-2 mb-2 items-center">
                      <input
                        type={name === "shootdate" ? "date" : "text"}
                        className="input input-bordered w-full"
                        value={val}
                        onChange={(e) => handleArrayChange(e, name, idx)}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveField(name, idx)}
                        className="btn btn-error btn-square btn-sm flex-shrink-0 text-white"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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

          {/* Signature */}
          <div className="border p-4 rounded-lg">
            <h3 className="text-xl font-semibold mb-4 border-b pb-2">Signature Options</h3>
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

          {/* PDF Template */}
          <div className="border p-4 rounded-lg">
            <h3 className="text-xl font-semibold mb-4 border-b pb-2">PDF Design Template</h3>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="pdfDesign"
                  value="current"
                  checked={pdfDesign === "current"}
                  onChange={(e) => setPdfDesign(e.target.value)}
                  className="radio"
                />
                Current Design
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="pdfDesign"
                  value="new"
                  checked={pdfDesign === "new"}
                  onChange={(e) => setPdfDesign(e.target.value)}
                  className="radio"
                />
                New Premium Design
              </label>
            </div>
          </div>

          {/* Submit */}
          <div>
            <button type="submit" className="btn btn-primary w-full text-lg">
              Generate Invoice PDF
            </button>
          </div>
        </form>
      </div>

      {/* Preview Button */}
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
            <iframe src={pdfUrl} title="PDF Preview" className="w-full h-full" />
          </div>
        </div>
      )}
    </div>
  );
}

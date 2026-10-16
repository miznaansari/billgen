// PDF generation — both invoice designs, extracted from the original Billgenform.
// The layout/drawing logic is intentionally preserved; only data plumbing changed.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateForPdf } from "./format";

function splitTextByLength(text, maxLength) {
  const words = (text || "").split(" ");
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

let assetsCache = null;

/** Loads (and caches) the images used by the premium design. */
export async function loadPdfAssets() {
  if (assetsCache) return assetsCache;
  try {
    const lenseUrl = new URL("../assets/lense.png", import.meta.url).href;
    const logoUrl = new URL("../assets/logothemevg.png", import.meta.url).href;
    const [lenseBase64, logoBase64] = await Promise.all([
      getBase64ImageFromUrl(lenseUrl),
      getBase64ImageFromUrl(logoUrl),
    ]);
    assetsCache = { lenseBase64, logoBase64 };
  } catch (e) {
    console.error("Failed to load PDF images", e);
    assetsCache = { lenseBase64: null, logoBase64: null };
  }
  return assetsCache;
}

// ---------------------------------------------------------------------------
// Premium design (dark header + gold accents)
// ---------------------------------------------------------------------------
function generatePremiumPDF(formData, companyInfo, signatureType, assets) {
  const { lenseBase64, logoBase64 } = assets || {};
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
    doc.addImage(logoBase64, "PNG", 50, 7, 18, 18);
    textStartX = 72;
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
  const address =
    companyInfo?.address ||
    "Flat No. 411, Shree Sai Shraddha Chs. Ltd., Siddhart L.T. Road No. 4, Mumbai, Maharashtra - 400104";
  const splitAddress = doc.splitTextToSize(address, 65);
  doc.text(splitAddress, 50, 32);

  let contactStartY = 32 + splitAddress.length * 4 + 4;
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
  doc.text("INVOICE NO.", 130, rightY);
  doc.text(":", 155, rightY);
  doc.setFont(undefined, "normal");
  doc.text(formData.billno || "", 160, rightY);
  doc.setDrawColor(200, 200, 200);
  doc.line(160, rightY + 1.5, 200, rightY + 1.5);

  rightY += 6;
  doc.setFont(undefined, "bold");
  doc.text("BILL DATE", 130, rightY);
  doc.text(":", 155, rightY);
  doc.setFont(undefined, "normal");
  doc.text(formatDateForPdf(formData.billdate) || "", 160, rightY);
  doc.line(160, rightY + 1.5, 200, rightY + 1.5);

  rightY += 6;
  doc.setFont(undefined, "bold");
  doc.text("PROJECT", 130, rightY);
  doc.text(":", 155, rightY);
  doc.setFont(undefined, "normal");
  const splitProject = doc.splitTextToSize(formData.projectname || "", 40);
  for (let j = 0; j < splitProject.length; j++) {
    doc.text(splitProject[j], 160, rightY + j * 5);
    doc.line(160, rightY + j * 5 + 1.5, 200, rightY + j * 5 + 1.5);
  }

  rightY += Math.max(6, splitProject.length * 5 + 1);
  doc.setFont(undefined, "bold");
  doc.text("PO / REF NO.", 130, rightY);
  doc.text(":", 155, rightY);
  doc.setFont(undefined, "normal");
  const splitCampaign = doc.splitTextToSize(formData.campaign || "", 40);
  for (let j = 0; j < splitCampaign.length; j++) {
    doc.text(splitCampaign[j], 160, rightY + j * 5);
    doc.line(160, rightY + j * 5 + 1.5, 200, rightY + j * 5 + 1.5);
  }

  let boxStartY = Math.max(70, rightY + splitCampaign.length * 5 + 5, contactStartY + 15);

  // --- MID SECTION (Boxes) ---
  doc.setDrawColor(...goldColor);
  doc.setLineWidth(0.4);

  doc.setFontSize(8);
  doc.setFont(undefined, "normal");
  const btLabels = [
    "Production House / Client :",
    "Address :",
    "Contact Person :",
    "Mobile / Phone :",
    "Email :",
    "GSTIN / UIN :",
  ];
  const btValues = [formData.billto, formData.address || "", "", "", "", formData.gst || ""];
  const btSplitValues = btValues.map((v) => doc.splitTextToSize(v || "", 50));
  let btTotalHeight = 0;
  btSplitValues.forEach((splitVal) => {
    btTotalHeight += Math.max(7, splitVal.length * 5.5);
  });

  const pdLabels = [
    "Project Name :",
    "Shoot Location :",
    "Production Head :",
    "Line Producer :",
    "Director :",
    "DOP :",
    "Equipment Package :",
  ];
  const pdValues = [formData.projectname, "", "", "", "", "", ""];
  const pdSplitValues = pdValues.map((v) => doc.splitTextToSize(v || "", 50));
  let pdTotalHeight = 0;
  pdSplitValues.forEach((splitVal) => {
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
  doc.text("BILL TO", 18, boxStartY + 1.5);

  doc.setFontSize(8);
  doc.setFont(undefined, "normal");
  let yOffset = boxStartY + 12;
  for (let i = 0; i < btLabels.length; i++) {
    doc.text(btLabels[i], 12, yOffset);
    const splitVal = btSplitValues[i];
    for (let j = 0; j < splitVal.length; j++) {
      doc.text(splitVal[j], 48, yOffset + j * 5.5);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(48, yOffset + j * 5.5 + 1.5, 98, yOffset + j * 5.5 + 1.5);
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
  doc.text("PROJECT DETAILS", 116, boxStartY + 1.5);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont(undefined, "normal");
  let yOffsetPd = boxStartY + 12;
  for (let i = 0; i < pdLabels.length; i++) {
    doc.text(pdLabels[i], 112, yOffsetPd);
    const splitVal = pdSplitValues[i];
    for (let j = 0; j < splitVal.length; j++) {
      doc.text(splitVal[j], 142, yOffsetPd + j * 5.5);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(142, yOffsetPd + j * 5.5 + 1.5, 198, yOffsetPd + j * 5.5 + 1.5);
    }
    yOffsetPd += Math.max(7, splitVal.length * 5.5);
  }

  // --- TABLE ---
  const tableBody = [];
  const maxRowsData = Math.max(
    10,
    formData.shootdate.length,
    formData.extrasheet.length,
    formData.conveyance.length,
    formData.rateperday.length,
    formData.amount.length
  );
  for (let i = 0; i < maxRowsData; i++) {
    // Optional label shown under the date, e.g. "10/10/2023\nDay 1"
    const dateCell = [
      formatDateForPdf(formData.shootdate[i]) || "",
      (formData.shootlabel?.[i] || "").trim(),
    ]
      .filter(Boolean)
      .join("\n");
    tableBody.push([
      dateCell,
      formData.extrasheet[i] || "",
      formData.conveyance[i] || "",
      "", // days
      formData.rateperday[i] || "",
      formData.amount[i] || "",
    ]);
  }

  autoTable(doc, {
    startY: boxStartY + boxHeight + 5,
    head: [
      [
        "DATE",
        "DESCRIPTION\n(Camera Department)",
        "POSITION",
        "NO. OF\nDAYS / SHIFTS",
        "RATE PER\nDAY (Rs)",
        "AMOUNT\n(Rs)",
      ],
    ],
    body: tableBody,
    theme: "grid",
    styles: {
      fontSize: 8,
      halign: "center",
      valign: "middle",
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 20, 15],
      textColor: goldColor,
      lineColor: goldColor,
      lineWidth: 0.2,
    },
    columnStyles: {
      1: { halign: "left", cellWidth: 55 },
    },
    didDrawPage: function () {
      if (lenseBase64 && logoBase64) {
        doc.setGState(new doc.GState({ opacity: 0.15 }));
        doc.addImage(logoBase64, "PNG", 75, 160, 50, 50);
        doc.setGState(new doc.GState({ opacity: 1 }));
      }
    },
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

  doc.setFillColor(180, 130, 50);
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

  if (signatureType === "text") {
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    doc.text(companyInfo?.signatureName || "No Sign Added", 160, finalY + 14, { align: "center" });
  } else if (signatureType === "image" && companyInfo?.digitalSignature) {
    try {
      doc.addImage(companyInfo.digitalSignature, "PNG", 140, finalY + 10.5, 40, 6);
    } catch (err) {
      console.error("Failed to add signature image:", err);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.text("[Invalid Image]", 160, finalY + 14, { align: "center" });
    }
  }

  doc.setDrawColor(0, 0, 0);
  doc.line(125, finalY + 19, 195, finalY + 19);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, "normal");

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
}

// ---------------------------------------------------------------------------
// Classic design (clean boxed layout)
// ---------------------------------------------------------------------------
function generateClassicPDF(formData, companyInfo, signatureType) {
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

  doc.text(
    ` ${companyInfo?.district || "district"}, ${companyInfo?.state || "state"}, ${companyInfo?.pincode || "pincode"}`,
    105,
    37,
    { align: "center" }
  );
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
  if (formData.gst) leftInfo += `\nCompany GST No. : ${formData.gst}`;
  if (formData.pan) leftInfo += `\nCompany PAN No. : ${formData.pan}`;

  doc.text(leftInfo.split("\n"), 12, 106, { lineHeightFactor: 1.5 });

  let rightInfo = `Bill No.: ${formData.billno}
Bill Date: ${formatDateForPdf(formData.billdate)}
Post : ${companyInfo?.post || ""}
Pan No.: ${companyInfo?.panNo || "DA***3*L"} `;
  if (formData.campaign) rightInfo += `\nCampaign Code : ${formData.campaign}`;
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
  const maxRows = Math.max(
    shootdate.length,
    extrasheet.length,
    conveyance.length,
    rateperday.length,
    amount.length
  );

  let rowGap = maxRows > 10 ? 4 : 5;
  const baseFontSize = maxRows > 10 ? 10 : 12;
  const labelFontSize = maxRows > 10 ? 7 : 8;
  doc.setFontSize(baseFontSize);
  doc.setFont(undefined, "normal");

  const shootlabel = formData.shootlabel || [];
  let rowY = 157;
  for (let i = 0; i < maxRows; i++) {
    doc.text(formatDateForPdf(shootdate[i]) || "", 10 + 38 / 2, rowY + rowGap, { align: "center" });
    doc.text(extrasheet[i] || "", 48 + 38 / 2, rowY + rowGap, { align: "center" });
    doc.text(conveyance[i] || "", 86 + 38 / 2, rowY + rowGap, { align: "center" });
    doc.text(rateperday[i] || "", 124 + 38 / 2, rowY + rowGap, { align: "center" });
    doc.text(amount[i] || "", 162 + 38 / 2, rowY + rowGap, { align: "center" });
    rowY += rowGap;

    // Optional label printed in a smaller font just below the date.
    const label = (shootlabel[i] || "").trim();
    if (label) {
      doc.setFontSize(labelFontSize);
      const labelLines = doc.splitTextToSize(label, 36);
      for (let j = 0; j < labelLines.length; j++) {
        doc.text(labelLines[j], 10 + 38 / 2, rowY + 3 + j * 3.2, { align: "center" });
      }
      rowY += 3 + (labelLines.length - 1) * 3.2 + 1;
      doc.setFontSize(baseFontSize);
    }
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
      console.error("Failed to add signature image:", err);
      doc.text("Signature: [Invalid Image]", 12, 272);
    }
  }
  doc.text("Authorised Signature", 200, 272, { align: "right" });

  return doc;
}

/**
 * Build the invoice PDF.
 * @returns {jsPDF}
 */
export function generateInvoicePdf({ formData, companyInfo, signatureType = "text", pdfDesign = "current", assets }) {
  if (pdfDesign === "new") {
    return generatePremiumPDF(formData, companyInfo, signatureType, assets);
  }
  return generateClassicPDF(formData, companyInfo, signatureType);
}

export function invoiceFileName(billno) {
  return `invoice-${(billno || "generated").toString().replace(/[\\/:*?"<>|]/g, "-")}.pdf`;
}

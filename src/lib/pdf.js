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

// ---------------------------------------------------------------------------
// 10 "company standard" designs — one configurable engine, themed per design.
// The two original designs ("current" classic & "new" premium) stay untouched.
// ---------------------------------------------------------------------------
const STANDARD_THEMES = {
  mono:      { name: "Minimal Mono",   font: "helvetica", header: "minimal", table: "minimal", accent: [17, 17, 17],   soft: [240, 240, 240] },
  corporate: { name: "Corporate Navy", font: "helvetica", header: "band",    table: "grid",    accent: [21, 44, 91],   soft: [228, 234, 246] },
  teal:      { name: "Teal Sidebar",   font: "helvetica", header: "side",    table: "striped", accent: [11, 110, 114], soft: [222, 240, 239] },
  serif:     { name: "Classic Serif",  font: "times",     header: "center",  table: "grid",    accent: [62, 47, 32],   soft: [242, 238, 230] },
  boldband:  { name: "Bold Amber",     font: "helvetica", header: "band",    table: "striped", accent: [22, 22, 22],   soft: [255, 236, 179], accent2: [255, 179, 0] },
  graypanel: { name: "Soft Gray",      font: "helvetica", header: "split",   table: "striped", accent: [88, 90, 96],   soft: [238, 239, 241] },
  emerald:   { name: "Emerald",        font: "helvetica", header: "split",   table: "grid",    accent: [13, 120, 79],  soft: [223, 241, 232] },
  royal:     { name: "Royal Purple",   font: "helvetica", header: "band",    table: "striped", accent: [76, 40, 130],  soft: [237, 231, 246] },
  terra:     { name: "Terracotta",     font: "times",     header: "split",   table: "grid",    accent: [169, 78, 47],  soft: [250, 235, 226] },
  slate:     { name: "Slate Bold",     font: "helvetica", header: "minimal", table: "grid",    accent: [40, 48, 60],   soft: [226, 230, 236], accent2: [235, 87, 56] },
};

/** All selectable designs, in display order. `thumb` drives the visual picker. */
export const DESIGNS = [
  { id: "current", name: "Classic",      thumb: { variant: "classic", accent: "#111111", soft: "#e8e8e8", pop: "#111111" } },
  { id: "new",     name: "Premium Gold", thumb: { variant: "gold",    accent: "#141414", soft: "#f3ead0", pop: "#DAA520" } },
  ...Object.entries(STANDARD_THEMES).map(([id, t]) => ({
    id,
    name: t.name,
    thumb: {
      variant: t.header,
      accent: `rgb(${t.accent.join(",")})`,
      soft: `rgb(${t.soft.join(",")})`,
      pop: `rgb(${(t.accent2 || t.accent).join(",")})`,
    },
  })),
];

function money(v) {
  const n = parseFloat(v);
  return "Rs " + (isFinite(n) ? n : 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

function generateStandardPDF(formData, companyInfo, signatureType, theme) {
  const doc = new jsPDF();
  const accent = theme.accent;
  const accent2 = theme.accent2 || theme.accent;
  const M = theme.header === "side" ? 20 : 14; // left margin
  const R = 196; // right edge
  const dark = [30, 32, 36];
  const gray = [110, 112, 118];
  const line = [216, 218, 222];

  doc.setFont(theme.font, "normal");

  const compName = companyInfo?.companyName || "Your Company Name";
  doc.setFontSize(9);
  const compAddrLines = [];
  if (companyInfo?.address) compAddrLines.push(...doc.splitTextToSize(companyInfo.address, 86));
  const cityLine = [companyInfo?.district, companyInfo?.state, companyInfo?.pincode]
    .filter(Boolean)
    .join(", ");
  if (cityLine) compAddrLines.push(cityLine);
  const contactLine = [
    companyInfo?.contactNumber ? `Phone: ${companyInfo.contactNumber}` : null,
    companyInfo?.companyEmail ? `Email: ${companyInfo.companyEmail}` : null,
  ]
    .filter(Boolean)
    .join("   ");
  const taxLine = [
    companyInfo?.gstNo ? `GSTIN: ${companyInfo.gstNo}` : null,
    companyInfo?.panNo ? `PAN: ${companyInfo.panNo}` : null,
  ]
    .filter(Boolean)
    .join("   ");

  const drawSideBar = () => {
    doc.setFillColor(...accent);
    doc.rect(0, 0, 10, 297, "F");
  };

  let y;

  // ---------- Header ----------
  if (theme.header === "band") {
    doc.setFillColor(...accent);
    doc.rect(0, 0, 210, 36, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(theme.font, "bold");
    doc.text(compName.toUpperCase(), M, 14);
    doc.setFontSize(8);
    doc.setFont(theme.font, "normal");
    // Wider wrap inside the band so the city/pincode line is never dropped.
    const bandAddrSrc = [companyInfo?.address, cityLine].filter(Boolean).join(", ");
    const bandAddr = bandAddrSrc ? doc.splitTextToSize(bandAddrSrc, 100).slice(0, 3) : [];
    let hy = 20;
    bandAddr.forEach((l) => {
      doc.text(l, M, hy);
      hy += 3.8;
    });
    if (contactLine) {
      doc.text(contactLine, M, hy);
      hy += 3.8;
    }
    if (taxLine) doc.text(taxLine, M, hy);
    doc.setFontSize(26);
    doc.setFont(theme.font, "bold");
    if (theme.accent2) doc.setTextColor(...accent2);
    doc.text("INVOICE", R, 17, { align: "right" });
    if (theme.accent2) {
      doc.setFillColor(...accent2);
      doc.rect(0, 36, 210, 1.6, "F");
    }
    y = 46;
  } else if (theme.header === "split" || theme.header === "side") {
    if (theme.header === "side") drawSideBar();
    doc.setTextColor(...accent);
    doc.setFontSize(18);
    doc.setFont(theme.font, "bold");
    doc.text(compName, M, 17);
    doc.setTextColor(...gray);
    doc.setFontSize(8.5);
    doc.setFont(theme.font, "normal");
    let hy = 23;
    compAddrLines.forEach((l) => {
      doc.text(l, M, hy);
      hy += 4;
    });
    if (contactLine) {
      doc.text(contactLine, M, hy);
      hy += 4;
    }
    if (taxLine) {
      doc.text(taxLine, M, hy);
      hy += 4;
    }
    doc.setTextColor(...accent);
    doc.setFontSize(27);
    doc.setFont(theme.font, "bold");
    doc.text("INVOICE", R, 20, { align: "right" });
    const headBottom = Math.max(hy, 27) + 2;
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.9);
    doc.line(M, headBottom, R, headBottom);
    y = headBottom + 9;
  } else if (theme.header === "center") {
    doc.setTextColor(...accent);
    doc.setFontSize(19);
    doc.setFont(theme.font, "bold");
    doc.text(compName.toUpperCase(), 105, 16, { align: "center" });
    doc.setTextColor(...gray);
    doc.setFontSize(9);
    doc.setFont(theme.font, "normal");
    let hy = 22;
    compAddrLines.forEach((l) => {
      doc.text(l, 105, hy, { align: "center" });
      hy += 4;
    });
    if (contactLine) {
      doc.text(contactLine, 105, hy, { align: "center" });
      hy += 4;
    }
    if (taxLine) {
      doc.text(taxLine, 105, hy, { align: "center" });
      hy += 4;
    }
    hy += 1;
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.8);
    doc.line(M, hy, R, hy);
    doc.setLineWidth(0.25);
    doc.line(M, hy + 1.4, R, hy + 1.4);
    hy += 9;
    doc.setTextColor(...dark);
    doc.setFontSize(14);
    doc.setFont(theme.font, "bold");
    doc.text("I N V O I C E", 105, hy, { align: "center" });
    y = hy + 9;
  } else {
    // minimal
    doc.setTextColor(...accent);
    doc.setFontSize(30);
    doc.setFont(theme.font, "bold");
    if (theme.accent2) {
      doc.setFillColor(...accent2);
      doc.rect(M, 11, 4, 13, "F");
      doc.text("INVOICE", M + 8, 22);
    } else {
      doc.text("INVOICE", M, 22);
    }
    doc.setTextColor(...dark);
    doc.setFontSize(11);
    doc.text(compName, R, 13, { align: "right" });
    doc.setTextColor(...gray);
    doc.setFontSize(8);
    doc.setFont(theme.font, "normal");
    let hy = 18;
    compAddrLines.forEach((l) => {
      doc.text(l, R, hy, { align: "right" });
      hy += 3.8;
    });
    if (contactLine) {
      doc.text(contactLine, R, hy, { align: "right" });
      hy += 3.8;
    }
    if (taxLine) {
      doc.text(taxLine, R, hy, { align: "right" });
      hy += 3.8;
    }
    const lineY = Math.max(30, hy) + 3;
    doc.setDrawColor(...line);
    doc.setLineWidth(0.3);
    doc.line(M, lineY, R, lineY);
    y = lineY + 9;
  }

  // ---------- Bill To (left) + invoice meta (right) ----------
  doc.setFontSize(9);
  doc.setFont(theme.font, "bold");
  doc.setTextColor(...accent);
  doc.text("BILL TO", M, y);
  let ly = y + 5.5;
  doc.setTextColor(...dark);
  doc.setFontSize(10.5);
  const nameLines = doc.splitTextToSize(formData.billto || "—", 86);
  doc.text(nameLines, M, ly);
  ly += nameLines.length * 4.6 + 0.8;
  doc.setFont(theme.font, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...gray);
  if (formData.address) {
    const al = doc.splitTextToSize(formData.address, 86);
    doc.text(al, M, ly);
    ly += al.length * 3.9;
  }
  if (formData.gst) {
    doc.text(`GSTIN: ${formData.gst}`, M, ly);
    ly += 3.9;
  }
  if (formData.pan) {
    doc.text(`PAN: ${formData.pan}`, M, ly);
    ly += 3.9;
  }

  let ry = y;
  const metaRows = [
    ["Invoice No.", formData.billno || "—"],
    ["Invoice Date", formatDateForPdf(formData.billdate) || "—"],
  ];
  if (formData.projectname) metaRows.push(["Project", formData.projectname]);
  if (formData.campaign) metaRows.push(["PO / Ref", formData.campaign]);
  doc.setFontSize(8.5);
  metaRows.forEach(([label, value]) => {
    doc.setFont(theme.font, "normal");
    doc.setTextColor(...gray);
    doc.text(label, 124, ry);
    doc.setFont(theme.font, "bold");
    doc.setTextColor(...dark);
    const vl = doc.splitTextToSize(String(value), 46);
    doc.text(vl, R, ry, { align: "right" });
    ry += Math.max(5, vl.length * 4);
  });

  y = Math.max(ly, ry) + 5;

  // ---------- Items table ----------
  const maxRows = Math.max(
    formData.shootdate.length,
    formData.extrasheet.length,
    formData.conveyance.length,
    formData.rateperday.length,
    formData.amount.length
  );
  const body = [];
  for (let i = 0; i < maxRows; i++) {
    const dateCell = [
      formatDateForPdf(formData.shootdate[i]) || "",
      (formData.shootlabel?.[i] || "").trim(),
    ]
      .filter(Boolean)
      .join("\n");
    const hasAny =
      dateCell ||
      formData.extrasheet[i] ||
      formData.conveyance[i] ||
      formData.rateperday[i] ||
      formData.amount[i];
    body.push([
      hasAny ? String(i + 1) : "",
      dateCell,
      formData.extrasheet[i] || "",
      formData.conveyance[i] || "",
      formData.rateperday[i] || "",
      formData.amount[i] || "",
    ]);
  }
  // Pad to a full-looking table — but not for striped themes, where empty
  // alternating stripes after the content would look like floating bars.
  if (theme.table !== "striped") {
    while (body.length < 8) body.push(["", "", "", "", "", ""]);
  }

  let tableTheme = "grid";
  let headStyles = { fontStyle: "bold", halign: "center", fillColor: accent, textColor: [255, 255, 255] };
  let alternateRowStyles = {};
  let bodyStyles = {};
  if (theme.table === "grid") {
    headStyles = { ...headStyles, lineColor: accent, lineWidth: 0.1 };
    bodyStyles = { lineColor: line, lineWidth: 0.15 };
  } else if (theme.table === "striped") {
    tableTheme = "striped";
    alternateRowStyles = { fillColor: theme.soft };
  } else {
    tableTheme = "plain";
    headStyles = { fontStyle: "bold", halign: "center", fillColor: [255, 255, 255], textColor: accent };
  }

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: 14 },
    head: [["#", "SHOOT DATE", "EXTRA SHIFT", "CONVEYANCE", "RATE / DAY", "AMOUNT (Rs)"]],
    body,
    theme: tableTheme,
    styles: { font: theme.font, fontSize: 8.5, cellPadding: 2.6, halign: "center", valign: "middle", textColor: dark, ...bodyStyles },
    headStyles,
    alternateRowStyles,
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 36 },
      5: { cellWidth: 40, fontStyle: "bold", halign: "right" },
    },
    didDrawCell: (data) => {
      if (theme.table === "minimal") {
        const bottom = data.cell.y + data.cell.height;
        if (data.section === "head") {
          doc.setDrawColor(...accent);
          doc.setLineWidth(0.5);
          doc.line(data.cell.x, bottom, data.cell.x + data.cell.width, bottom);
        } else if (data.section === "body") {
          doc.setDrawColor(...line);
          doc.setLineWidth(0.15);
          doc.line(data.cell.x, bottom, data.cell.x + data.cell.width, bottom);
        }
      }
    },
    didDrawPage: () => {
      if (theme.header === "side") drawSideBar();
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  const ensure = (need) => {
    if (y + need > 280) {
      doc.addPage();
      if (theme.header === "side") drawSideBar();
      y = 20;
    }
  };

  // ---------- Totals (right) + amount in words (left) ----------
  ensure(32);
  const tTop = y;
  const boxX = 126;
  doc.setFontSize(9);
  doc.setFont(theme.font, "normal");
  doc.setTextColor(...gray);
  doc.text("Sub Total", boxX, tTop);
  doc.setFont(theme.font, "bold");
  doc.setTextColor(...dark);
  doc.text(money(formData.totalamount), R, tTop, { align: "right" });
  doc.setDrawColor(...line);
  doc.setLineWidth(0.2);
  doc.line(boxX, tTop + 2.5, R, tTop + 2.5);
  doc.setFillColor(...accent2);
  doc.rect(boxX, tTop + 5, R - boxX, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("TOTAL", boxX + 3, tTop + 11);
  doc.text(money(formData.totalamount), R - 3, tTop + 11, { align: "right" });

  doc.setFontSize(9);
  doc.setFont(theme.font, "bold");
  doc.setTextColor(...accent);
  doc.text("AMOUNT IN WORDS", M, tTop);
  doc.setFont(theme.font, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...gray);
  const words = doc.splitTextToSize(formData.amountinword || "—", 100);
  doc.text(words, M, tTop + 5);

  y = Math.max(tTop + 14, tTop + 5 + words.length * 3.8) + 10;

  // ---------- Bank details (left) + signature (right) ----------
  ensure(42);
  const bTop = y;
  doc.setFontSize(9);
  doc.setFont(theme.font, "bold");
  doc.setTextColor(...accent);
  doc.text("PAYMENT DETAILS", M, bTop);
  doc.setFontSize(8.5);
  const bankRows = [
    ["Account Name", companyInfo?.accountName],
    ["Account No.", companyInfo?.accountNo],
    ["Bank", companyInfo?.bankName],
    ["IFSC", companyInfo?.ifscCode],
    ["Branch", companyInfo?.branch],
    ["GPay / PhonePe", companyInfo?.gpayPhonepe],
  ].filter(([, v]) => v);
  let by = bTop + 5.5;
  bankRows.forEach(([k, v]) => {
    doc.setFont(theme.font, "normal");
    doc.setTextColor(...gray);
    doc.text(k, M, by);
    doc.setFont(theme.font, "bold");
    doc.setTextColor(...dark);
    doc.text(String(v), M + 32, by);
    by += 4.2;
  });
  if (!bankRows.length) {
    doc.setFont(theme.font, "normal");
    doc.setTextColor(...gray);
    doc.text("—", M, by);
    by += 4.2;
  }

  const sigCx = 162;
  if (signatureType === "image" && companyInfo?.digitalSignature) {
    try {
      doc.addImage(companyInfo.digitalSignature, "PNG", 142, bTop + 2, 40, 14);
    } catch (err) {
      console.error("Failed to add signature image:", err);
    }
  } else {
    doc.setFont(theme.font, "italic");
    doc.setFontSize(11);
    doc.setTextColor(...dark);
    doc.text(companyInfo?.signatureName || "", sigCx, bTop + 13, { align: "center" });
  }
  doc.setDrawColor(...dark);
  doc.setLineWidth(0.3);
  doc.line(132, bTop + 19, 192, bTop + 19);
  doc.setFont(theme.font, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text("Authorised Signatory", sigCx, bTop + 23, { align: "center" });
  doc.setFont(theme.font, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...dark);
  doc.text(compName, sigCx, bTop + 27.5, { align: "center" });

  // ---------- Footer ----------
  if (theme.header === "band" || theme.header === "side") {
    doc.setFillColor(...accent);
    doc.rect(0, 289, 210, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont(theme.font, "bold");
    doc.text("THANK YOU FOR YOUR BUSINESS!", 105, 294.2, { align: "center" });
  } else {
    doc.setDrawColor(...accent2);
    doc.setLineWidth(0.6);
    doc.line(M, 288, R, 288);
    doc.setTextColor(...gray);
    doc.setFontSize(8);
    doc.setFont(theme.font, "normal");
    doc.text("Thank you for your business!", 105, 293, { align: "center" });
  }

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
  const theme = STANDARD_THEMES[pdfDesign];
  if (theme) {
    return generateStandardPDF(formData, companyInfo, signatureType, theme);
  }
  return generateClassicPDF(formData, companyInfo, signatureType);
}

export function invoiceFileName(billno) {
  return `invoice-${(billno || "generated").toString().replace(/[\\/:*?"<>|]/g, "-")}.pdf`;
}

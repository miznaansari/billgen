import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { db } from "./firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore"; 
import { collection, getDocs, query, where } from "firebase/firestore";
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
        shootdate: "",
        extrasheet: "",
        conveyance: "",
        rateperday: "",
        amount: "",
        gst: "",
        amountinword: "",
        totalamount: "",
    });

    const [companyInfo, setCompanyInfo] = useState(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState("");

    useEffect(() => {
        const fetchCompanyInfo = async () => {
            try {
                const uid = localStorage.getItem("uid");
                if (!uid) return;

                const q = query(collection(db, "companyProfiles"), where("userId", "==", uid));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    setCompanyInfo(querySnapshot.docs[0].data());
                }
            } catch (err) {
                console.error("Error fetching company info:", err);
            }
        };

        fetchCompanyInfo();
    }, []);

  const handleChange = (e) => {
        const { name, value } = e.target;
        let updatedFormData = { ...formData, [name]: value };

        // Automatically update amountinword and totalamount when amount changes
        if (name === "amount") {
            const total = value
                .split("\n")
                .reduce((sum, val) => sum + (parseFloat(val.trim()) || 0), 0);
            updatedFormData.totalamount = total.toString();
            updatedFormData.amountinword = numberToWords(total);
        }

        setFormData(updatedFormData);
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        doc.setFont("times");

        // Header
        doc.setFontSize(34);
        doc.setFont(undefined, "bold");
        doc.text(companyInfo?.companyName || "RADHE GUPTA", 105, 20, { align: "center" });

        doc.setFontSize(11);
        doc.setFont(undefined, "normal");
        doc.text(
            companyInfo?.address ||
            "Flat No.411, Shree Sai Shraddha Chs. Ltd., Siddhart L.T. Road No.4 & 5,\nGoregaon West, Mumbai - 400 104",
            105,
            30,
            { align: "center" }
        );

        doc.setFont(undefined, "bold");
        doc.text(`Email Id.: ${companyInfo?.companyEmail || "radheshyammau2@gmail.com"}`, 105, 45, {
            align: "center",
        });
        doc.text(`Contact No.: ${companyInfo?.contactNumber || "7985593140"}`, 105, 52, {
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
        leftInfo += `\nGPay/Phonepe: ${companyInfo?.gpayPhonepe || "+91 1231231231"}`;
        leftInfo += `\nBank Name : ${companyInfo?.bankName || "Bank of ****"}`;
        leftInfo += `\nAccount Name: ${companyInfo?.accountName || "Full Name"}`;
        leftInfo += `\nAccount No. : ${companyInfo?.accountNo || "282******14308"}`;
        leftInfo += `\nIFSC Code : ${companyInfo?.ifscCode || "BA***IBS"}`;
        leftInfo += `\nBranch : ${companyInfo?.branch || "Pa***har Mau 27***1"}`;

        // Convert to array of lines
        const lines = leftInfo.split('\n');

        // Draw the text with line height
        doc.text(lines, 12, 100, { lineHeightFactor: 1.5 }); // 1.5 gives a nice readable spacing


        // Right Column Info
        doc.setFont(undefined, "bold");

        let rightInfo = `Bill No.: ${formData.billno}
Bill Date: ${formData.billdate}
Post : Camera Focus Puller
Pan No.: ${companyInfo?.panNo || "DA***3*L"}
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

        // Table Rows
        const shootDates = formData.shootdate.split("\n");
        const extraShifts = formData.extrasheet.split("\n");
        const conveyances = formData.conveyance.split("\n");
        const ratePerDay = formData.rateperday.split("\n");
        const amounts = formData.amount.split("\n");

        let rowY = 157;
        for (let i = 0; i < shootDates.length; i++) {
            doc.setFont(undefined, "normal");

            // Center positions of each column based on your rect x and width
            doc.text(shootDates[i] || "", 10 + 38 / 2, rowY + 7, { align: "center" });
            doc.text(extraShifts[i] || "", 48 + 38 / 2, rowY + 7, { align: "center" });
            doc.text(conveyances[i] || "", 86 + 38 / 2, rowY + 7, { align: "center" });
            doc.text(ratePerDay[i] || "", 124 + 38 / 2, rowY + 7, { align: "center" });
            doc.text(amounts[i] || "", 162 + 38 / 2, rowY + 7, { align: "center" });

            rowY += 7;
        }


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
        doc.text(`Signature: ${companyInfo?.signatureName || "Radhe"}`, 12, 272);
        doc.text("Authorised Signature", 200, 272, { align: "right" });

        return doc;
    };

const handleGeneratePDF = async (e) => {
    e.preventDefault();
    const docPdf = generatePDF();
    docPdf.save(`invoice-${formData.billno || "generated"}.pdf`);

    try {
        const uid = localStorage.getItem("uid");
        if (!uid) {
            console.warn("User not logged in or UID not found.");
            return;
        }

        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const currentCount = userSnap.data().downloadCount || 0;

            await updateDoc(userRef, {
                downloadCount: currentCount + 1
            });

            console.log(`✅ Updated PDF download count: ${currentCount + 1}`);
        } else {
            console.warn("⚠️ User document not found in Firestore.");
        }
    } catch (err) {
        console.error("❌ Error updating download count:", err);
    }
};

    const handlePreviewPDF = () => {
        const doc = generatePDF();
        const pdfDataUrl = doc.output("dataurlstring");
        setPdfUrl(pdfDataUrl);
        setPreviewOpen(true);
    };

    return (
          <div className="p-6 bg-white text-black">
            <h2 className="text-xl font-bold mb-4">Bill Generator</h2>
            <form onSubmit={handleGeneratePDF} className="space-y-4">
                {[
                    ["billto", "Bill To"],
                    ["projectname", "Project Name"],
                    ["campaign", "Campaign Code (optional)"],
                    ["billno", "Bill No"],
                    ["billdate", "Bill Date"],
                    ["shootdate", "Shoot Date(s)"],
                    ["extrasheet", "Extra Shift"],
                    ["conveyance", "Conveyance"],
                    ["rateperday", "Rate Per Day"],
                    ["amount", "Amount"],
                    ["gst", "GST"],
                    ["amountinword", "Amount in Words"],
                    ["totalamount", "Total Amount"],
                ].map(([name, label]) => (
                    <div key={name}>
                        <label className="block mb-1 font-medium">{label}</label>
                        <textarea
                            name={name}
                            rows={["shootdate", "extrasheet", "conveyance", "rateperday", "amount"].includes(name) ? 2 : 1}
                            className="w-full border border-black rounded px-2 py-1 text-black"
                            onChange={handleChange}
                            value={formData[name]}
                        />
                    </div>
                ))}

                <button
                    type="submit"
                    className="w-full mt-4 bg-black text-white py-2 px-4 rounded hover:bg-gray-800"
                >
                    Generate Invoice PDF
                </button>
            </form>

            {/* Floating Preview Button */}
            <button
                type="button"
                onClick={handlePreviewPDF}
                className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-blue-700"
                title="Live Preview"
            >
                👁️
            </button>

            {/* Modal for Preview */}
            {previewOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white p-4 rounded-lg max-w-4xl w-full h-[80vh] relative">
                        <button
                            onClick={() => setPreviewOpen(false)}
                            className="absolute top-2 right-2 text-red-500 font-bold text-xl"
                        >
                            ×
                        </button>
                        <h2 className="text-lg font-bold mb-2">Invoice Preview</h2>
                        <iframe
                            src={pdfUrl}
                            title="PDF Preview"
                            className="w-full h-full border"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

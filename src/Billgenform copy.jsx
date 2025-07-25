import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { db } from "./firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

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
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleGeneratePDF = (e) => {
        e.preventDefault();
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

        // Layout Boxes\
        doc.rect(10, 75, 190, 180); // Outer Box
        doc.rect(48, 157, 38, 98); // Mid Column
        doc.rect(124, 157, 38, 98); // Right Column

        // Bill To
        doc.setFontSize(11);
        doc.setFont(undefined, "bold");
        doc.text("Bill To:", 12, 82);
        doc.setFont(undefined, "normal");
        doc.text(formData.billto, 30, 82);

        // Left Column Info
        doc.setFontSize(10);
        let leftInfo = `Project Name : ${formData.projectname}`;
        if (formData.campaign) leftInfo += `\nCampaign Code : ${formData.campaign}`;
        leftInfo += `\nGPay/Phonepe: ${companyInfo?.gpayPhonepe || "7985593140"}
Bank Name : ${companyInfo?.bankName || "Bank of Baroda"}
Account Name: ${companyInfo?.accountName || "RADHESHYAM GUPTA"}
Account No. : ${companyInfo?.account_no || "28210100014308"}
IFSC Code : ${companyInfo?.ifscCode || "BARB0PALIBS"}
Branch : ${companyInfo?.branch || "Palighar Mau 275101"}`;

        doc.text(leftInfo, 12, 95);

        // Right Column Info
        doc.setFont(undefined, "bold");
        let rightInfo = `Bill No.: ${formData.billno}
Bill Date: ${formData.billdate}
Post : Camera Focus Puller
Pan No.: ${companyInfo?.panNo || "DAWPG9316L"}
GSTIN/UIN : ${formData.gst || "-"}`;
        doc.text(rightInfo, 112, 82);

        // Table Header
        const colStartY = 147;
        doc.setFont(undefined, "bold");
        doc.setFontSize(10);
        doc.setDrawColor(0);
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
            doc.rect(10, rowY, 38, 10);
            doc.rect(48, rowY, 38, 10);
            doc.rect(86, rowY, 38, 10);
            doc.rect(124, rowY, 38, 10);
            doc.rect(162, rowY, 38, 10);

            doc.setFont(undefined, "normal");
            doc.text(shootDates[i] || "-", 11, rowY + 7);
            doc.text(extraShifts[i] || "-", 49, rowY + 7);
            doc.text(conveyances[i] || "-", 87, rowY + 7);
            doc.text(ratePerDay[i] || "-", 125, rowY + 7);
            doc.text(amounts[i] || "-", 163, rowY + 7);

            rowY += 10;
        }

        // Total Amount
        doc.setFont(undefined, "bold");
        doc.rect(10, 245, 152, 10);
        doc.rect(162, 245, 38, 10);
        doc.text("TOTAL AMOUNT:", 150, 252, { align: "right" });
        doc.text(formData.totalamount || "-", 164, 252);

        // Amount in Words
        doc.setFont(undefined, "normal");
        doc.text(`Rupees In Words : ${formData.amountinword}`, 10, 260);

        // Footer
        doc.setFont(undefined, "bold");
        doc.rect(10, 265, 190, 10);
        doc.text(`Signature: ${companyInfo?.signatory_name || "Radhe"}`, 12, 272);
        doc.text("Authorised Signature", 200, 272, { align: "right" });

        // Save
        doc.save(`invoice-${formData.billno || "generated"}.pdf`);
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
        </div>
    );
}

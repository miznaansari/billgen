import { useEffect, useState } from 'react';
import { db, auth, analytics } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import { useNavigate } from 'react-router';

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

    const [isExisting, setIsExisting] = useState(false); // To track if profile already exists

    // Fetch profile on mount
    useEffect(() => {
        // Analytics
        if (analytics) {
            logEvent(analytics, 'page_visited', { page: 'Signup' });
        }

        const fetchCompanyInfo = async () => {
            if (!userId) return;

            try {
                const docRef = doc(db, 'companyProfiles', userId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setForm(data); // Pre-fill form
                    setIsExisting(true); // Mark that we are updating
                }
            } catch (err) {
                console.error("Error fetching company info:", err);
            }
        };

        fetchCompanyInfo();
    }, [userId]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

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

            await setDoc(doc(db, 'companyProfiles', uid), payload); // Overwrites or creates

            alert(isExisting ? '✅ Company profile updated!' : '✅ Company profile created!');
            navigate('/bill');
        } catch (error) {
            console.error('❌ Error saving profile:', error);
            alert('Something went wrong. Check console.');
        }
    };

    return (
        <div className="hero min-h-screen bg-base-200 p-4">
            <div className="card w-full max-w-3xl shadow-2xl bg-base-100">
                <div className="card-body">
                    <h2 className="text-2xl font-bold mb-4 text-center">
                        {isExisting ? 'Update Company Profile' : 'Register Company'}
                    </h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">

                        {/* Required Info Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <h3 className="text-xl font-semibold col-span-1 md:col-span-2">Basic Information</h3>

                            {/* Company Name */}
                            <div className="form-control">
                                <label className="label" htmlFor="companyName">
                                    <span className="label-text">Company Name *</span>
                                </label>
                                <input type="text" id="companyName" name="companyName" value={form.companyName} onChange={handleChange} className="input input-bordered w-full" required />
                            </div>

                            {/* Contact Number */}
                            <div className="form-control">
                                <label className="label" htmlFor="contactNumber">
                                    <span className="label-text">Contact Number *</span>
                                </label>
                                <input type="text" id="contactNumber" name="contactNumber" value={form.contactNumber} onChange={handleChange} className="input input-bordered w-full" required />
                            </div>

                            {/* Email */}
                            <div className="form-control">
                                <label className="label" htmlFor="companyEmail">
                                    <span className="label-text">Company Email *</span>
                                </label>
                                <input type="email" id="companyEmail" name="companyEmail" value={form.companyEmail} onChange={handleChange} className="input input-bordered w-full" required />
                            </div>
                        </div>

                        {/* Address Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <h3 className="text-xl font-semibold col-span-1 md:col-span-2">Address</h3>

                            <div className="form-control">
                                <label className="label" htmlFor="address"><span className="label-text">Address</span></label>
                                <input type="text" id="address" name="address" value={form.address} onChange={handleChange} className="input input-bordered w-full" />
                            </div>

                            <div className="form-control">
                                <label className="label" htmlFor="state"><span className="label-text">State</span></label>
                                <input type="text" id="state" name="state" value={form.state} onChange={handleChange} className="input input-bordered w-full" />
                            </div>

                            <div className="form-control">
                                <label className="label" htmlFor="district"><span className="label-text">District</span></label>
                                <input type="text" id="district" name="district" value={form.district} onChange={handleChange} className="input input-bordered w-full" />
                            </div>

                            <div className="form-control">
                                <label className="label" htmlFor="pincode"><span className="label-text">Pincode</span></label>
                                <input type="text" id="pincode" name="pincode" value={form.pincode} onChange={handleChange} className="input input-bordered w-full" />
                            </div>
                        </div>

                        {/* Bank Detail Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <h3 className="text-xl font-semibold col-span-1 md:col-span-2">Bank Details</h3>

                            <div className="form-control">
                                <label className="label" htmlFor="bankName"><span className="label-text">Bank Name</span></label>
                                <input type="text" id="bankName" name="bankName" value={form.bankName} onChange={handleChange} className="input input-bordered w-full" />
                            </div>

                            <div className="form-control">
                                <label className="label" htmlFor="accountName"><span className="label-text">Account Name</span></label>
                                <input type="text" id="accountName" name="accountName" value={form.accountName} onChange={handleChange} className="input input-bordered w-full" />
                            </div>

                            <div className="form-control">
                                <label className="label" htmlFor="accountNo"><span className="label-text">Account No</span></label>
                                <input type="text" id="accountNo" name="accountNo" value={form.accountNo} onChange={handleChange} className="input input-bordered w-full" />
                            </div>

                            <div className="form-control">
                                <label className="label" htmlFor="ifscCode"><span className="label-text">IFSC Code</span></label>
                                <input type="text" id="ifscCode" name="ifscCode" value={form.ifscCode} onChange={handleChange} className="input input-bordered w-full" />
                            </div>

                            <div className="form-control">
                                <label className="label" htmlFor="branch"><span className="label-text">Branch</span></label>
                                <input type="text" id="branch" name="branch" value={form.branch} onChange={handleChange} className="input input-bordered w-full" />
                            </div>
                        </div>

                        {/* Other Info Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <h3 className="text-xl font-semibold col-span-1 md:col-span-2">Other Information</h3>

                            <div className="form-control">
                                <label className="label" htmlFor="post"><span className="label-text">Post</span></label>
                                <input type="text" id="post" name="post" value={form.post} onChange={handleChange} className="input input-bordered w-full" />
                            </div>

                            <div className="form-control">
                                <label className="label" htmlFor="panNo"><span className="label-text">PAN No</span></label>
                                <input type="text" id="panNo" name="panNo" value={form.panNo} onChange={handleChange} className="input input-bordered w-full" />
                            </div>

                            <div className="form-control">
                                <label className="label" htmlFor="gstNo"><span className="label-text">GST No</span></label>
                                <input type="text" id="gstNo" name="gstNo" value={form.gstNo} onChange={handleChange} className="input input-bordered w-full" />
                            </div>

                            <div className="form-control">
                                <label className="label" htmlFor="gpayPhonepe"><span className="label-text">GPay / PhonePe</span></label>
                                <input type="text" id="gpayPhonepe" name="gpayPhonepe" value={form.gpayPhonepe} onChange={handleChange} className="input input-bordered w-full" />
                            </div>

                            <div className="form-control">
                                <label className="label" htmlFor="signatureName"><span className="label-text">Signature Name</span></label>
                                <input type="text" id="signatureName" name="signatureName" value={form.signatureName} onChange={handleChange} className="input input-bordered w-full" />
                            </div>
                        </div>

                        <div className="mt-6">
                            <button type="submit" className="btn btn-primary w-full">
                                {isExisting ? 'Update Company Profile' : 'Save Company Profile'}
                            </button>
                        </div>
                    </form>

                </div>
            </div>
        </div>
    );
}

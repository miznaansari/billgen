// src/DigitalSignature.jsx
import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { storage, auth } from "./firebase";
import { ref, uploadString, getDownloadURL } from "firebase/storage";

export default function DigitalSignature({ onSave }) {
  const sigCanvas = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const clear = () => sigCanvas.current.clear();

  const saveSignature = async () => {
    if (sigCanvas.current.isEmpty()) {
      alert("Please provide a signature first!");
      return;
    }
    setLoading(true);
    try {
      const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png");
      const uid = auth.currentUser?.uid || localStorage.getItem("uid");
      if (!uid) throw new Error("User not logged in");

      const sigRef = ref(storage, `signatures/${uid}.png`);
      await uploadString(sigRef, dataUrl, "data_url");
      const url = await getDownloadURL(sigRef);

      onSave(url); // Pass URL back to parent
      setOpen(false);
    } catch (err) {
      console.error("Error uploading signature:", err);
      alert("Failed to upload signature.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setOpen(true)}
      >
        Add Digital Signature
      </button>

      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Sign Below</h2>
            <SignatureCanvas
              ref={sigCanvas}
              penColor="black"
              canvasProps={{
                width: 400,
                height: 200,
                className: "border rounded w-full",
              }}
            />
            <div className="mt-4 flex justify-between">
              <button className="btn btn-error" onClick={clear}>
                Clear
              </button>
              <div className="space-x-2">
                <button className="btn" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={saveSignature}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

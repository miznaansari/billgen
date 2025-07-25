import { useEffect, useState } from 'react';
import { auth, provider, signInWithPopup, db, analytics } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';

export default function Signup() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);         // 🔄 Loader state
  const [error, setError] = useState(null);              // ⚠️ Error state
  const navigate = useNavigate();

  useEffect(() => {
    const uid = localStorage.getItem('uid');
    if (uid) {
      navigate('/bill');
    }
  }, [navigate]);

  useEffect(() => {
    logEvent(analytics, 'page_visited', { page: 'Signup' });
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await signInWithPopup(auth, provider);
      const userData = result.user;
      setUser(userData);

      await setDoc(doc(db, 'users', userData.uid), {
        name: userData.displayName,
        email: userData.email,
        photoURL: userData.photoURL,
        createdAt: new Date().toISOString(),
      });

      localStorage.setItem('uid', userData.uid);
      localStorage.setItem('name', userData.displayName);
      localStorage.setItem('email', userData.email);
      localStorage.setItem('photoURL', userData.photoURL);

      navigate('/register');
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hero min-h-screen bg-base-200">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="hero-content flex-col text-center"
      >
        <div className="max-w-md">
          <h1 className="text-4xl font-bold text-primary">Empower Your Day</h1>
          <p className="py-4 text-lg text-gray-600">
            Simplify your billing process. Create daily bills in seconds with our easy form!
          </p>
        </div>

        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="card w-full max-w-sm shadow-2xl bg-base-100"
        >
          <div className="card-body">
            <button
              onClick={handleGoogleSignIn}
              className={`btn btn-primary ${loading ? 'btn-disabled' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                'Continue with Google'
              )}
            </button>

            <AnimatePresence>
              {error && (
                <motion.p
                  className="text-red-500 mt-4 text-sm"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <AnimatePresence>
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-6"
            >
              <p className="text-lg">
                Welcome, <strong>{user.displayName}</strong>
              </p>
              <img
                src={user.photoURL}
                alt="Profile"
                className="w-16 h-16 rounded-full mt-2 border border-primary"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

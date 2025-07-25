import { BrowserRouter as Router, Routes, Route } from 'react-router';
import Signup from './Signup';
import Register from './Register';
import BillGenForm from './Billgenform';
import Navbar from './Navbar';

export function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Signup />} />
        <Route path="/register" element={<Register />} />
        <Route path="/bill" element={<BillGenForm />} />
        {/* Add other routes like /dashboard */}
      </Routes>
    </Router>
  );
}

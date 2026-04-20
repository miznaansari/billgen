import React from "react";
import { Link, useNavigate, useLocation } from "react-router";

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const uid = localStorage.getItem("uid");

    const handleLogout = () => {
        localStorage.clear();
        navigate("/");
    };

    const navLinkClass = (path) =>
        `px-3 py-2 rounded-lg transition ${
            location.pathname === path
                ? "bg-primary text-white"
                : "hover:bg-base-200"
        }`;

    return (
        <div className="navbar bg-base-100 shadow-md sticky top-0 z-50 px-4 md:px-8">
            
            {/* Logo */}
            <div className="flex-1">
                <Link to="/" className="text-xl font-bold text-primary">
                    Bill Generator
                </Link>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-2">
                {!uid && (
                    <Link to="/signup" className={navLinkClass("/signup")}>
                        Signup
                    </Link>
                )}

                {uid && (
                    <>
                        <Link to="/register" className={navLinkClass("/register")}>
                            Profile
                        </Link>

                        <Link to="/bill" className={navLinkClass("/bill")}>
                            Create Bill
                        </Link>

                        <button
                            onClick={handleLogout}
                            className="ml-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
                        >
                            Logout
                        </button>
                    </>
                )}
            </div>

            {/* Mobile Menu */}
            <div className="dropdown dropdown-end md:hidden">
                <label tabIndex={0} className="btn btn-ghost btn-circle">
                    <svg
                        className="h-6 w-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 6h16M4 12h16M4 18h16"
                        />
                    </svg>
                </label>

                <ul
                    tabIndex={0}
                    className="menu menu-sm dropdown-content mt-3 p-3 shadow bg-base-100 rounded-box w-56 space-y-1"
                >
                    {!uid && (
                        <li>
                            <Link to="/signup">Signup</Link>
                        </li>
                    )}

                    {uid && (
                        <>
                            <li>
                                <Link to="/register">Profile</Link>
                            </li>
                            <li>
                                <Link to="/bill">Create Bill</Link>
                            </li>
                            <li>
                                <button
                                    onClick={handleLogout}
                                    className="text-red-500 font-semibold"
                                >
                                    Logout
                                </button>
                            </li>
                        </>
                    )}
                </ul>
            </div>
        </div>
    );
}
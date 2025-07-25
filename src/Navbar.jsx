import React from "react";
import { Link, useNavigate } from "react-router";

export default function Navbar() {
    const navigate = useNavigate();
    const uid = localStorage.getItem("uid");

    const handleLogout = () => {
        localStorage.clear(); // or removeItem("uid");
        navigate("/"); // or navigate("/");
    };

    return (
        <div className="navbar bg-base-100 shadow-md sticky top-0 left-0 right-0 z-50">
            <div className="flex-1">
                <Link to="/" className="btn btn-ghost text-xl">
                    Bill Generator
                </Link>
            </div>

            <div className="hidden md:flex">
                <ul className="menu menu-horizontal px-1">
                   {!uid && (   <li>
                        <Link to="/">Signup</Link>
                    </li>)}
                    <li>
                        <Link to="/register">Register / Update Profile</Link>
                    </li>
                    <li>
                        <Link to="/bill">Create Bill</Link>
                    </li>
                    {uid && (
                        <li>
                            <button onClick={handleLogout} className="btn btn-error btn-sm text-white ml-2">
                                Logout
                            </button>
                        </li>
                    )}
                </ul>
            </div>

            {/* Mobile Dropdown */}
            <div className="dropdown dropdown-end md:hidden">
                <button tabIndex={0} className="btn btn-ghost btn-circle">
                    <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <ul
                    tabIndex={0}
                    className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
                >
                    <li>
                        <Link to="/signup">Signup</Link>
                    </li>
                    <li>
                        <Link to="/register">Register / Update Profile</Link>
                    </li>
                    <li>
                        <Link to="/bill">Create Bill</Link>
                    </li>
                    {uid && (
                        <li>
                            <button onClick={handleLogout} className="btn btn-error btn-sm text-white">
                                Logout
                            </button>
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
}

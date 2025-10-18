"use client";

import Link from "next/link";
import { useAuth } from "./context/AuthContext";
import Navbar from "../components/Navbar";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-8">PDF Presentation Viewer</h1>

          {user ? (
            <p className="mb-8">Welcome, {user.displayName || user.email}</p>
          ) : (
            <p className="mb-8">Please sign in to continue</p>
          )}

          <div className="flex justify-center gap-4">
            <Link href="/upload" className="bg-blue-600 text-white px-6 py-2 rounded">
              Upload PDF
            </Link>

            {!user && (
              <Link href="/login" className="bg-gray-600 text-white px-6 py-2 rounded">
                Login
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

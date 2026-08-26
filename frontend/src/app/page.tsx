"use client";

import { useEffect, useState } from "react";

const STRAPI_URL = "http://localhost:1337";

type Course = {
  id: number;
  title: string;
  description: string | null;
};

export default function Home() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      const jwt = localStorage.getItem("jwt");
      const storedUser = localStorage.getItem("user");

      if (!jwt) {
        window.location.href = "/login";
        return;
      }

      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUsername(user.username);
      }

      try {
        const response = await fetch(`${STRAPI_URL}/api/courses`, {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          setMessage(
            data?.error?.message || "Could not load courses."
          );
          return;
        }

        setCourses(data.data || []);
      } catch {
        setMessage("Could not connect to the backend.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  function logout() {
    localStorage.removeItem("jwt");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-zinc-100">
      <nav className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-zinc-900">
            CPS Academy
          </h1>

          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-600">
              {username}
            </span>

            <button
              onClick={logout}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-zinc-900">
            Welcome back, {username}
          </h2>

          <p className="mt-2 text-zinc-600">
            Continue learning and track your progress.
          </p>
        </div>

        {loading && (
          <p className="text-zinc-600">
            Loading courses...
          </p>
        )}

        {message && (
          <p className="rounded-lg bg-red-50 p-4 text-red-700">
            {message}
          </p>
        )}

        {!loading && !message && (
          <div className="grid gap-6 md:grid-cols-2">
            {courses.map((course) => (
              <div
                key={course.id}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-xl font-semibold text-zinc-900">
                  {course.title}
                </h3>

                <p className="mt-2 text-zinc-600">
                  {course.description}
                </p>

                <button className="mt-6 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700">
                  View Course
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
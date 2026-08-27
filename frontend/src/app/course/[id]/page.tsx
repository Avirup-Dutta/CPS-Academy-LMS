"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const STRAPI_URL = "http://localhost:1337";

type Course = {
    id: number;
    documentId: string;
    title: string;
    description: string | null;
};

type Lesson = {
    id: number;
    documentId: string;
    title: string;
    content: string;
    videoUrl: string | null;
    order: number;
};

export default function CoursePage() {
    const params = useParams();
    const router = useRouter();

    const courseId = params.id as string;

    const [course, setCourse] = useState<Course | null>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [completedLessons, setCompletedLessons] = useState<number[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadCourse() {
            try {
                const courseResponse = await fetch(
                    `${STRAPI_URL}/api/courses?filters[id][$eq]=${courseId}`
                );

                const courseData = await courseResponse.json();

                if (!courseResponse.ok) {
                    setError(
                        courseData?.error?.message || "Could not load course."
                    );
                    return;
                }

                if (!courseData.data || courseData.data.length === 0) {
                    setError("Course not found.");
                    return;
                }

                const foundCourse = courseData.data[0];

                setCourse(foundCourse);

                const lessonsResponse = await fetch(
                    `${STRAPI_URL}/api/lessons?filters[course][id][$eq]=${courseId}&sort=order:asc`
                );

                const lessonsData = await lessonsResponse.json();

                if (!lessonsResponse.ok) {
                    setError(
                        lessonsData?.error?.message || "Could not load lessons."
                    );
                    return;
                }

                const courseLessons = lessonsData.data || [];

                setLessons(courseLessons);

                /*
                 * Load completed lessons from localStorage.
                 */
                const storedCompletedLessons = localStorage.getItem(
                    `completedLessons_course_${courseId}`
                );

                if (storedCompletedLessons) {
                    setCompletedLessons(
                        JSON.parse(storedCompletedLessons)
                    );
                }
            } catch (error) {
                console.error("Course loading error:", error);
                setError("Could not connect to Strapi.");
            } finally {
                setLoading(false);
            }
        }

        loadCourse();
    }, [courseId]);

    /*
     * Calculate progress.
     */
    const completedCount = lessons.filter((lesson) =>
        completedLessons.includes(lesson.id)
    ).length;

    const totalLessons = lessons.length;

    const progressPercentage =
        totalLessons > 0
            ? Math.round((completedCount / totalLessons) * 100)
            : 0;

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-zinc-100">
                <p className="text-zinc-600">
                    Loading course...
                </p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="min-h-screen bg-zinc-100">
                <div className="mx-auto max-w-6xl px-6 py-10">
                    <button
                        onClick={() => router.push("/")}
                        className="mb-8 text-blue-600 hover:text-blue-700"
                    >
                        ← Back to Dashboard
                    </button>

                    <div className="rounded-2xl bg-red-50 p-6 text-red-700">
                        {error}
                    </div>
                </div>
            </main>
        );
    }

    if (!course) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-zinc-100">
                <p className="text-zinc-600">
                    Course not found.
                </p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-zinc-100">
            <nav className="border-b border-zinc-200 bg-white">
                <div className="mx-auto max-w-6xl px-6 py-4">
                    <button
                        onClick={() => router.push("/")}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                        ← Back to Dashboard
                    </button>
                </div>
            </nav>

            <section className="mx-auto max-w-6xl px-6 py-10">
                {/* Course information */}
                <div className="rounded-2xl bg-white p-8 shadow-sm">
                    <h1 className="text-4xl font-bold text-zinc-900">
                        {course.title}
                    </h1>

                    {course.description && (
                        <p className="mt-4 text-lg text-zinc-600">
                            {course.description}
                        </p>
                    )}
                </div>

                {/* Progress */}
                <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-zinc-900">
                                Course Progress
                            </h2>

                            <p className="mt-1 text-sm text-zinc-600">
                                {completedCount} of {totalLessons} lessons completed
                            </p>
                        </div>

                        <span className="text-2xl font-bold text-blue-600">
                            {progressPercentage}%
                        </span>
                    </div>

                    <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-zinc-200">
                        <div
                            className="h-full rounded-full bg-blue-600 transition-all duration-500"
                            style={{
                                width: `${progressPercentage}%`,
                            }}
                        />
                    </div>

                    {progressPercentage === 100 && totalLessons > 0 && (
                        <div className="mt-5 rounded-lg bg-green-50 p-4 text-green-700">
                            🎉 Congratulations! You completed this course.
                        </div>
                    )}
                </div>

                {/* Lessons */}
                <div className="mt-10">
                    <h2 className="mb-5 text-2xl font-bold text-zinc-900">
                        Lessons
                    </h2>

                    {lessons.length === 0 ? (
                        <div className="rounded-xl bg-white p-6 shadow-sm">
                            <p className="text-zinc-600">
                                No lessons found for this course.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {lessons.map((lesson, index) => {
                                const isCompleted = completedLessons.includes(
                                    lesson.id
                                );

                                return (
                                    <div
                                        key={lesson.id}
                                        className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
                                    >
                                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-blue-600">
                                                    Lesson {index + 1}
                                                </p>

                                                <h3 className="mt-1 text-xl font-semibold text-zinc-900">
                                                    {lesson.title}
                                                </h3>

                                                <p className="mt-2 text-zinc-600">
                                                    {lesson.content}
                                                </p>

                                                {isCompleted && (
                                                    <p className="mt-3 text-sm font-medium text-green-600">
                                                        ✓ Completed
                                                    </p>
                                                )}
                                            </div>

                                            <button
                                                onClick={() =>
                                                    router.push(`/lesson/${lesson.id}`)
                                                }
                                                className="shrink-0 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
                                            >
                                                {isCompleted
                                                    ? "Review Lesson"
                                                    : "Open Lesson"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
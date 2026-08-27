"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const STRAPI_URL = "http://localhost:1337";

type Lesson = {
    id: number;
    documentId: string;
    title: string;
    content: string;
    videoUrl: string | null;
    order: number;
};

type Course = {
    id: number;
    documentId: string;
    title: string;
};

type Enrollment = {
    id: number;
    documentId: string;
    completed: boolean;
    completedAt: string | null;
};

export default function LessonPage() {
    const params = useParams();
    const router = useRouter();

    const lessonId = params.id as string;

    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [course, setCourse] = useState<Course | null>(null);
    const [allLessons, setAllLessons] = useState<Lesson[]>([]);
    const [enrollment, setEnrollment] = useState<Enrollment | null>(null);

    const [completed, setCompleted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        async function loadLesson() {
            try {
                const jwt = localStorage.getItem("jwt");
                const storedUser = localStorage.getItem("user");

                if (!jwt || !storedUser) {
                    router.push("/login");
                    return;
                }

                const user = JSON.parse(storedUser);

                // Load lesson and its course
                const lessonResponse = await fetch(
                    `${STRAPI_URL}/api/lessons?filters[id][$eq]=${lessonId}&populate=course`,
                    {
                        headers: {
                            Authorization: `Bearer ${jwt}`,
                        },
                    }
                );

                const lessonData = await lessonResponse.json();

                if (!lessonResponse.ok) {
                    setError(
                        lessonData?.error?.message || "Could not load lesson."
                    );
                    return;
                }

                if (!lessonData.data || lessonData.data.length === 0) {
                    setError("Lesson not found.");
                    return;
                }

                const foundLesson = lessonData.data[0];

                setLesson(foundLesson);

                // Get course
                const foundCourse = foundLesson.course;

                if (!foundCourse) {
                    setError("This lesson is not connected to a course.");
                    return;
                }

                setCourse(foundCourse);

                // Load all lessons belonging to this course
                const lessonsResponse = await fetch(
                    `${STRAPI_URL}/api/lessons?filters[course][id][$eq]=${foundCourse.id}&sort=order:asc`,
                    {
                        headers: {
                            Authorization: `Bearer ${jwt}`,
                        },
                    }
                );

                const lessonsData = await lessonsResponse.json();

                if (!lessonsResponse.ok) {
                    setError(
                        lessonsData?.error?.message ||
                        "Could not load course lessons."
                    );
                    return;
                }

                const courseLessons = lessonsData.data || [];

                setAllLessons(courseLessons);

                // Find student's enrollment
                const enrollmentResponse = await fetch(
                    `${STRAPI_URL}/api/enrollments?filters[student][id][$eq]=${user.id}&filters[course][id][$eq]=${foundCourse.id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${jwt}`,
                        },
                    }
                );

                const enrollmentData = await enrollmentResponse.json();

                if (
                    enrollmentResponse.ok &&
                    enrollmentData.data?.length > 0
                ) {
                    setEnrollment(enrollmentData.data[0]);
                }

                // Load locally completed lessons
                const storageKey = `completedLessons_course_${foundCourse.id}`;

                const storedCompletedLessons =
                    localStorage.getItem(storageKey);

                if (storedCompletedLessons) {
                    const completedLessonIds: number[] = JSON.parse(
                        storedCompletedLessons
                    );

                    setCompleted(
                        completedLessonIds.includes(foundLesson.id)
                    );
                }
            } catch (error) {
                console.error("Lesson loading error:", error);
                setError("Could not connect to Strapi.");
            } finally {
                setLoading(false);
            }
        }

        loadLesson();
    }, [lessonId, router]);

    async function markLessonCompleted() {
        if (!lesson || !course) {
            return;
        }

        setCompleting(true);
        setMessage("");
        setError("");

        try {
            const storageKey = `completedLessons_course_${course.id}`;

            const storedCompletedLessons =
                localStorage.getItem(storageKey);

            let completedLessonIds: number[] = storedCompletedLessons
                ? JSON.parse(storedCompletedLessons)
                : [];

            // Add current lesson
            if (!completedLessonIds.includes(lesson.id)) {
                completedLessonIds.push(lesson.id);
            }

            // Save locally
            localStorage.setItem(
                storageKey,
                JSON.stringify(completedLessonIds)
            );

            // Update current lesson immediately
            setCompleted(true);

            // Check if every lesson is completed
            const allLessonsCompleted =
                allLessons.length > 0 &&
                allLessons.every((courseLesson) =>
                    completedLessonIds.includes(courseLesson.id)
                );

            // If all lessons are complete, update enrollment in Strapi
            if (
                allLessonsCompleted &&
                enrollment &&
                !enrollment.completed
            ) {
                const jwt = localStorage.getItem("jwt");

                if (!jwt) {
                    router.push("/login");
                    return;
                }

                const updateResponse = await fetch(
                    `${STRAPI_URL}/api/enrollments/${enrollment.documentId}`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${jwt}`,
                        },
                        body: JSON.stringify({
                            data: {
                                completed: true,
                                completedAt: new Date().toISOString(),
                            },
                        }),
                    }
                );

                const updateData = await updateResponse.json();

                if (!updateResponse.ok) {
                    console.error(
                        "Enrollment update error:",
                        updateData
                    );

                    setMessage(
                        "Lesson completed, but course completion could not be saved."
                    );

                    return;
                }

                setEnrollment(updateData.data);

                setMessage(
                    "Congratulations! You completed every lesson in this course."
                );

                return;
            }

            if (allLessonsCompleted && !enrollment) {
                setMessage(
                    "All lessons completed! Enrollment record was not found."
                );

                return;
            }

            setMessage("Lesson completed!");
        } catch (error) {
            console.error("Completion error:", error);
            setError("Could not save lesson completion.");
        } finally {
            setCompleting(false);
        }
    }

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-zinc-100">
                <p className="text-zinc-600">
                    Loading lesson...
                </p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="min-h-screen bg-zinc-100">
                <div className="mx-auto max-w-4xl px-6 py-10">
                    <button
                        onClick={() => router.back()}
                        className="mb-8 text-blue-600 hover:text-blue-700"
                    >
                        ← Back
                    </button>

                    <div className="rounded-2xl bg-red-50 p-6 text-red-700">
                        {error}
                    </div>
                </div>
            </main>
        );
    }

    if (!lesson) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-zinc-100">
                <p className="text-zinc-600">
                    Lesson not found.
                </p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-zinc-100">
            <nav className="border-b border-zinc-200 bg-white">
                <div className="mx-auto max-w-4xl px-6 py-4">
                    <button
                        onClick={() => router.back()}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                        ← Back to Course
                    </button>
                </div>
            </nav>

            <section className="mx-auto max-w-4xl px-6 py-10">
                <div className="rounded-2xl bg-white p-8 shadow-sm">
                    <p className="text-sm font-medium text-blue-600">
                        Lesson {lesson.order}
                    </p>

                    <h1 className="mt-2 text-4xl font-bold text-zinc-900">
                        {lesson.title}
                    </h1>

                    {course && (
                        <p className="mt-2 text-sm text-zinc-500">
                            {course.title}
                        </p>
                    )}

                    <div className="mt-8">
                        <h2 className="text-xl font-semibold text-zinc-900">
                            Lesson Content
                        </h2>

                        <p className="mt-4 whitespace-pre-line leading-8 text-zinc-700">
                            {lesson.content}
                        </p>
                    </div>

                    {lesson.videoUrl && (
                        <div className="mt-8">
                            <h2 className="mb-4 text-xl font-semibold text-zinc-900">
                                Lesson Video
                            </h2>

                            <video
                                controls
                                className="w-full rounded-xl"
                                src={lesson.videoUrl}
                            >
                                Your browser does not support video playback.
                            </video>
                        </div>
                    )}

                    <div className="mt-10 border-t border-zinc-200 pt-6">
                        {completed ? (
                            <div className="rounded-lg bg-green-50 p-4 text-green-700">
                                ✓ Lesson completed
                            </div>
                        ) : (
                            <button
                                onClick={markLessonCompleted}
                                disabled={completing}
                                className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {completing
                                    ? "Saving..."
                                    : "Mark Lesson as Completed"}
                            </button>
                        )}

                        {message && (
                            <div className="mt-4 rounded-lg bg-zinc-100 p-4 text-sm text-zinc-700">
                                {message}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}
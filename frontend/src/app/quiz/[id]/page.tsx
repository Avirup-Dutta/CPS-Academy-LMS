"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const STRAPI_URL = "http://localhost:1337";

type Question = {
    id: number;
    documentId: string;
    question: string;
    options: string[];
    correctAnswer: string;
};

type Quiz = {
    id: number;
    documentId: string;
    title: string;
    description: string | null;
    questions: Question[];
};

type QuizResult = {
    score: number;
    totalQuestions: number;
    percentage: number;
};

export default function QuizPage() {
    const params = useParams();
    const router = useRouter();

    const quizId = params.id as string;

    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [result, setResult] = useState<QuizResult | null>(null);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        async function loadQuiz() {
            try {
                const jwt = localStorage.getItem("jwt");

                if (!jwt) {
                    router.push("/login");
                    return;
                }

                const response = await fetch(
                    `${STRAPI_URL}/api/quizzes?filters[documentId][$eq]=${quizId}&populate[questions]=*`,
                    {
                        headers: {
                            Authorization: `Bearer ${jwt}`,
                        },
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    setError(
                        data?.error?.message ||
                        "Could not load quiz."
                    );
                    return;
                }

                if (!data.data || data.data.length === 0) {
                    setError("Quiz not found.");
                    return;
                }

                const quizData = data.data[0];

                setQuiz({
                    ...quizData,
                    questions: quizData.questions || [],
                });
            } catch (error) {
                console.error("Quiz loading error:", error);
                setError("Could not connect to Strapi.");
            } finally {
                setLoading(false);
            }
        }

        loadQuiz();
    }, [quizId, router]);

    function selectAnswer(questionId: number, answer: string) {
        if (result) return;

        setAnswers((currentAnswers) => ({
            ...currentAnswers,
            [questionId]: answer,
        }));
    }

    async function submitQuiz() {
        if (!quiz) return;

        setError("");
        setMessage("");

        if (Object.keys(answers).length !== quiz.questions.length) {
            setError("Please answer every question before submitting.");
            return;
        }

        const jwt = localStorage.getItem("jwt");

        if (!jwt) {
            router.push("/login");
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch(
                `${STRAPI_URL}/api/quiz-results`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${jwt}`,
                    },
                    body: JSON.stringify({
                        data: {
                            quizDocumentId: quiz.documentId,
                            answers,
                        },
                    }),
                }
            );

            const data = await response.json();

            console.log(
                "QUIZ RESULT RESPONSE:",
                response.status,
                JSON.stringify(data, null, 2)
            );

            if (!response.ok) {
                console.error(
                    "Quiz result error:",
                    JSON.stringify(data, null, 2)
                );

                setError(
                    data?.error?.message ||
                    "Could not save quiz result."
                );

                return;
            }

            setResult({
                score: data.data.score,
                totalQuestions: data.data.totalQuestions,
                percentage: data.data.percentage,
            });

            setMessage("Quiz submitted successfully!");
        } catch (error) {
            console.error("Quiz submission error:", error);
            setError("Could not connect to Strapi.");
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-zinc-100">
                <p className="text-zinc-600">
                    Loading quiz...
                </p>
            </main>
        );
    }

    if (error && !quiz) {
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

    if (!quiz) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-zinc-100">
                <p className="text-zinc-600">
                    Quiz not found.
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
                    <h1 className="text-4xl font-bold text-zinc-900">
                        {quiz.title}
                    </h1>

                    {quiz.description && (
                        <p className="mt-3 text-zinc-600">
                            {quiz.description}
                        </p>
                    )}

                    <div className="mt-8 space-y-6">
                        {quiz.questions.map((question, index) => (
                            <div
                                key={question.documentId || question.id}
                                className="rounded-xl border border-zinc-200 p-6"
                            >
                                <h2 className="text-lg font-semibold text-zinc-900">
                                    {index + 1}. {question.question}
                                </h2>

                                <div className="mt-4 space-y-3">
                                    {question.options.map(
                                        (option, optionIndex) => (
                                            <label
                                                key={optionIndex}
                                                className={`flex items-center gap-3 rounded-lg border p-4 transition ${result
                                                    ? "cursor-default"
                                                    : "cursor-pointer hover:bg-zinc-50"
                                                    } ${answers[question.id] === option
                                                        ? "border-blue-500 bg-blue-50"
                                                        : "border-zinc-200"
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`question-${question.id}`}
                                                    value={option}
                                                    checked={
                                                        answers[question.id] ===
                                                        option
                                                    }
                                                    disabled={!!result}
                                                    onChange={() =>
                                                        selectAnswer(
                                                            question.id,
                                                            option
                                                        )
                                                    }
                                                />

                                                <span className="text-zinc-700">
                                                    {option}
                                                </span>
                                            </label>
                                        )
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {quiz.questions.length === 0 && (
                        <div className="mt-8 rounded-lg bg-yellow-50 p-4 text-yellow-700">
                            This quiz does not have any questions yet.
                        </div>
                    )}

                    {error && (
                        <div className="mt-8 rounded-lg bg-red-50 p-4 text-red-700">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="mt-8 rounded-lg bg-green-50 p-4 text-green-700">
                            {message}
                        </div>
                    )}

                    {result && (
                        <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6">
                            <h2 className="text-2xl font-bold text-green-800">
                                Quiz Result
                            </h2>

                            <div className="mt-4 grid gap-4 sm:grid-cols-3">
                                <div className="rounded-xl bg-white p-4">
                                    <p className="text-sm text-zinc-500">
                                        Score
                                    </p>

                                    <p className="mt-1 text-2xl font-bold text-zinc-900">
                                        {result.score}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-white p-4">
                                    <p className="text-sm text-zinc-500">
                                        Total Questions
                                    </p>

                                    <p className="mt-1 text-2xl font-bold text-zinc-900">
                                        {result.totalQuestions}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-white p-4">
                                    <p className="text-sm text-zinc-500">
                                        Percentage
                                    </p>

                                    <p className="mt-1 text-2xl font-bold text-zinc-900">
                                        {result.percentage}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!result && quiz.questions.length > 0 && (
                        <button
                            onClick={submitQuiz}
                            disabled={submitting}
                            className="mt-8 w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {submitting
                                ? "Submitting Quiz..."
                                : "Submit Quiz"}
                        </button>
                    )}
                </div>
            </section>
        </main>
    );
}
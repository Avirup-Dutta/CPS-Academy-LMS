/**
 * quiz controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController(
    'api::quiz.quiz',
    ({ strapi }) => ({
        async find(ctx) {
            const user = ctx.state.user;

            if (!user) {
                return ctx.unauthorized('You must be logged in.');
            }

            const quizzes = await strapi.db
                .query('api::quiz.quiz')
                .findMany({
                    populate: {
                        questions: true,
                    },
                });

            for (const quiz of quizzes) {
                if (Array.isArray(quiz.questions)) {
                    for (const question of quiz.questions) {
                        delete (question as { correctAnswer?: unknown }).correctAnswer;
                    }
                }
            }

            return {
                data: quizzes,
                meta: {},
            };
        },

        async findOne(ctx) {
            const user = ctx.state.user;

            if (!user) {
                return ctx.unauthorized('You must be logged in.');
            }

            const { documentId } = ctx.params;

            const quiz = await strapi.db
                .query('api::quiz.quiz')
                .findOne({
                    where: {
                        documentId,
                    },
                    populate: {
                        questions: true,
                    },
                });

            if (!quiz) {
                return ctx.notFound('Quiz not found.');
            }

            if (Array.isArray(quiz.questions)) {
                for (const question of quiz.questions) {
                    delete (question as { correctAnswer?: unknown }).correctAnswer;
                }
            }

            return {
                data: quiz,
                meta: {},
            };
        },
    })
);
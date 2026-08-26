/**
 * quiz-result controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController(
    'api::quiz-result.quiz-result',
    ({ strapi }) => ({
        async find(ctx) {
            const user = ctx.state.user;

            if (!user) {
                return ctx.unauthorized('You must be logged in.');
            }

            const results = await strapi.db
                .query('api::quiz-result.quiz-result')
                .findMany({
                    where: {
                        student: {
                            id: user.id,
                        },
                    },
                    populate: {
                        student: {
                            select: ['id', 'username'],
                        },
                        quiz: true,
                    }
                });

            return {
                data: results,
                meta: {},
            };
        },
    })
);
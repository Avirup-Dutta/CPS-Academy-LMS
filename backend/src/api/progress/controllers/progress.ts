/**
 * progress controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::progress.progress', ({ strapi }) => ({
    async update(ctx) {
        const user = ctx.state.user;

        if (!user) {
            return ctx.unauthorized('You must be logged in.');
        }

        const documentId = ctx.params.documentId || ctx.params.id;

        const progress = await strapi.db.query('api::progress.progress').findOne({
            where: {
                documentId,
            },
            populate: {
                student: true,
            },
        });

        if (!progress) {
            return ctx.notFound('Progress record not found.');
        }

        if (!progress.student || progress.student.id !== user.id) {
            return ctx.forbidden('You can only update your own progress.');
        }

        return await super.update(ctx);
    },
}));
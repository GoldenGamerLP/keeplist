import { createCollectionValidator } from "~/server/utils/schemaUtils";
import { createCollection } from "~/server/utils/taskBoardUtils";

export default eventHandler(async (event) => {
    const { success, data, error } = await readValidatedBody(event, createCollectionValidator.safeParseAsync);
    const { uniqueFingerprint } = getQuery(event);
    const user = event.context.user;

    if (!user) {
        throw createError({
            message: "Unauthorized",
            status: 401
        })
    }

    if (!success || !data) {
        throw createError({
            message: error.message,
            status: 400
        })
    }

    const { boardId, title, description, color } = data;

    return createCollection(user?.id, uniqueFingerprint?.toString() ?? "", boardId, title, description, color);
});
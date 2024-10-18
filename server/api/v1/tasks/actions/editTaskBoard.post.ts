import { editTaskBoardValidator } from "~/server/utils/schemaUtils";
import { editTaskBoard } from "~/server/utils/taskBoardUtils";

export default defineEventHandler(async (event) => {
    const { boardId, title, description, color, tags } = await readValidatedBody(event, editTaskBoardValidator.parse);

    const { uniqueFingerprint } = getQuery(event);
    const user = event.context.user;

    return editTaskBoard(user?.id, uniqueFingerprint?.toString() ?? "", boardId, title, description, color, tags);
});
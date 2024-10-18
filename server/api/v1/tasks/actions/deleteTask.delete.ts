import { deleteTaskValidator } from "~/server/utils/schemaUtils";
import { deleteTask } from "~/server/utils/taskBoardUtils";

export default eventHandler(async (event) => {
    const { boardId, collectionId, taskId} = await readValidatedBody(event, deleteTaskValidator.parse);
    const { uniqueFingerprint } = getQuery(event);
    const user = event.context.user;

    return deleteTask(user?.id, uniqueFingerprint?.toString() ?? "", boardId, collectionId, taskId);
});
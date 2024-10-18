import { createTaskValidator } from "~/server/utils/schemaUtils";
import { createTask } from "~/server/utils/taskBoardUtils";

export default eventHandler(async (event) => {
  const { boardId, collectionId, title, description } = await readValidatedBody(
    event,
    createTaskValidator.parse
  );

  const { uniqueFingerprint } = getQuery(event);
  const user = event.context.user;

  return createTask(user?.id, uniqueFingerprint?.toString() ?? "", boardId, collectionId, title, description);
});

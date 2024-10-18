import { editTaskValidator } from "~/server/utils/schemaUtils";
import { editTask } from "~/server/utils/taskBoardUtils";

export default eventHandler(async (event) => {
  const { boardId, task, collectionId } = await readValidatedBody(
    event,
    editTaskValidator.parse
  );

  const { uniqueFingerprint } = getQuery(event);
  const user = event.context.user;

  return editTask(
    user?.id,
    uniqueFingerprint?.toString() ?? "",
    boardId,
    collectionId,
    task
  );
});

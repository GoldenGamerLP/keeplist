import { editTaskValidator } from "~/server/utils/schemaUtils";
import { editTask } from "~/server/utils/taskBoardUtils";

export default eventHandler(async (event) => {
  const { uniqueFingerprint } = getQuery(event);
  const { success, data, error } = await readValidatedBody(
    event,
    editTaskValidator.safeParseAsync
  );

  if (!success || !data) {
    throw createError({
      status: 400,
      statusMessage: "Bad Request",
    });
  }

  const user = event.context.user;

  if (!user) {
    throw createError({
      status: 401,
      statusMessage: "Unauthorized",
    });
  }

  const { boardId, collectionId, task } = data;

  return editTask(
    user?.id,
    uniqueFingerprint?.toString() ?? "",
    boardId,
    collectionId,
    task
  );
});

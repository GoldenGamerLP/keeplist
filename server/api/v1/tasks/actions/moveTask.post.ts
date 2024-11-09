import { moveTaskValidator } from "~/server/utils/schemaUtils";
import { moveTask } from "~/server/utils/taskBoardUtils";

export default eventHandler(async (event) => {
  if (!event.context.user) {
    return createError({
      message: "Unauthorized",
      statusCode: 401,
    });
  }

  try {
    const { boardId, collectionId, id, newCollectionId, oldIndex, newIndex } =
      await readValidatedBody(event, moveTaskValidator.parse);

    const { uniqueFingerprint } = getQuery(event);
    const user = event.context.user;

    console.log("Moving task with parameters:", {
      userId: user.id,
      uniqueFingerprint: uniqueFingerprint?.toString() ?? "",
      boardId,
      id,
      collectionId,
      newCollectionId,
      oldIndex,
      newIndex,
    });

    const result = await moveTask(
      user.id,
      uniqueFingerprint?.toString() ?? "",
      boardId,
      id,
      collectionId,
      newCollectionId,
      oldIndex,
      newIndex
    );

    console.log("Move task result:", result);

    return result;
  } catch (error) {
    console.error("Error moving task:", error);
    throw createError({
      message: "Failed to move task",
      statusCode: 500,
    });
  }
});

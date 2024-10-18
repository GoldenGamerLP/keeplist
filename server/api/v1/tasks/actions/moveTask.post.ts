import { moveTaskValidator } from "~/server/utils/schemaUtils";
import { moveTask } from "~/server/utils/taskBoardUtils";

export default eventHandler(async (event) => {
  const { boardId, collectionId, taskId, newCollectionId, oldIndex, newIndex } =
    await readValidatedBody(event, moveTaskValidator.parse);

  const { uniqueFingerprint } = getQuery(event);
  const user = event.context.user;

  //data.value.id, id, from.id, to.id, oldIndex, newIndex
  // boardId, taskId, collectionId, newCollectionId, oldIndex, newIndex
  return moveTask(
    user?.id,
    uniqueFingerprint?.toString() ?? "",
    boardId,
    taskId,
    collectionId,
    newCollectionId,
    oldIndex,
    newIndex
  );
});

import { moveCollectionValidator } from "~/server/utils/schemaUtils";
import { moveCollection } from "~/server/utils/taskBoardUtils";

export default eventHandler(async (event) => {
  const { boardId, collectionId, oldIndex, newIndex } = await readValidatedBody(
    event,
    moveCollectionValidator.parse
  );

  const { uniqueFingerprint } = getQuery(event);
  const user = event.context.user;

  // boardId, taskId, collectionId, newCollectionId, oldIndex, newIndex
  return moveCollection(
    user?.id,
    uniqueFingerprint?.toString() ?? "",
    boardId,
    collectionId,
    oldIndex,
    newIndex
  );
});

import { deleteCollectionValidator } from "~/server/utils/schemaUtils";
import { deleteCollection } from "~/server/utils/taskBoardUtils";

export default eventHandler(async (event) => {
    const { boardId, collectionId } = await readValidatedBody(event, deleteCollectionValidator.parse);
    const { uniqueFingerprint } = getQuery(event);
    const user = event.context.user;

    return deleteCollection(user?.id, uniqueFingerprint?.toString() ?? "", boardId, collectionId);
});
import { editCollectionValidator } from "~/server/utils/schemaUtils";
import { editCollection } from "~/server/utils/taskBoardUtils";

export default eventHandler(async (event) => {
    const { boardId, title, description, color, collectionId } = await readValidatedBody(event, editCollectionValidator.parse);
    const { uniqueFingerprint } = getQuery(event);
    const user = event.context.user;

    return editCollection(user?.id, uniqueFingerprint?.toString() ?? "", boardId, collectionId, title, description, color);
});
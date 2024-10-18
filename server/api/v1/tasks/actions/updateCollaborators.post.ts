import { updateCollaboratorsValidator } from "~/server/utils/schemaUtils";
import { updateCollaborators } from "~/server/utils/taskBoardUtils";

export default defineEventHandler(async (event) => {
  try {
    const { boardId, collaborators } = await readValidatedBody(
        event,
        updateCollaboratorsValidator.parse
      );
    
      const user = event.context.user;
    
      if (!user) {
        throw createError({
          status: 401,
          statusText: "Unauthorized",
        });
      }
    
      return await updateCollaborators(boardId, collaborators);
  } catch (error) {
    console.error(error);
    throw createError({
      status: 500,
      statusText: "Internal Server Error",
    });
  }
});

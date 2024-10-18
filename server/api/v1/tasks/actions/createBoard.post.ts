import { createNewTaskBoard } from "~/server/utils/taskBoardUtils";
import { createNewTaskBoardValidator } from "~/server/utils/schemaUtils";

export default defineEventHandler(async (event) => {
  const { success, data, error } = await readValidatedBody(
    event,
    createNewTaskBoardValidator.safeParse
  );

  if(!success && !data) {
    throw createError({
      status: 404,
      statusText: `Parsing Error: ${JSON.stringify(error)}`,
    })
  }

  const user = event.context.user;

  if (!user) {
    throw createError({
      status: 401,
      statusText: "Unauthorized",
    });
  }

  const { title, description, color, tags } = data;
  return await createNewTaskBoard(user.id, title, description, color, tags);
});

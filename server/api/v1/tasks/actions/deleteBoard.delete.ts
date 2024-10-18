import { deleteBoard } from "~/server/utils/taskBoardUtils";
import { deleteBoardValidator } from "~/server/utils/schemaUtils";

export default eventHandler(async (event) => {
  const { success, data, error } = await readValidatedBody(
    event,
    deleteBoardValidator.safeParseAsync
  );

  if (!success || !data) {
    throw createError({
      message: error.message,
      status: 400,
    });
  }

  const user = event.context.user;

  if (!user) {
    throw createError({
      message: "Unauthorized",
      status: 401,
    });
  }

  const board = await getTaskboard(data.boardId);

  if (!board || !hasAccessToTaskboard(user.id, data.boardId)) {
    throw createError({
      message: "Board not found",
      status: 404,
    });
  }

  if (board.author !== user.id) {
    throw createError({
      message: "Unauthorized",
      status: 401,
    });
  }

  return await deleteBoard(data.boardId);
});

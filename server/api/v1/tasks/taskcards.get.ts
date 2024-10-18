import {
  retrieveTaskboardsPreview,
} from "~/server/utils/taskBoardUtils";

export default eventHandler(async (event) => {
  const user = event.context.user;

  if (!user) {
    throw createError({
      status: 401,
      statusText: "Unauthorized",
    });
  }

  try {
    const id = user.id;
    const ownTaskBoards = await retrieveTaskboardsPreview(id, "own");
    const sharedTaskBoards = await retrieveTaskboardsPreview(id, "shared");

    return {
      own: ownTaskBoards,
      shared: sharedTaskBoards,
    };
  } catch (error) {
    throw createError({
      status: 500,
      statusText: "Internal Server Error",
    });
  }
});
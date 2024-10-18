import { ObjectId } from "mongodb";
import {
  getTaskboard,
  hasAccessToTaskboard,
  taskboardExists,
} from "~/server/utils/taskBoardUtils";

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event);

  if (!id) {
    throw createError({
      status: 400,
      statusText: "Bad Request",
    });
  }

  const validId = ObjectId.isValid(id as string);
  if (!validId) {
    throw createError({
      status: 400,
      statusText: "Not found",
    });
  }

  const exists: number = await taskboardExists(id as string);
  if (exists === 0) {
    throw createError({
      status: 404,
      statusText: "Not Found",
    });
  }

  const user = event.context.user;

  if (
    !user ||
    !(await hasAccessToTaskboard(user.id, id as string))
  ) {
    throw createError({
      status: 401,
      statusText: "Unauthorized access!",
    });
  }

  return (await getTaskboard(id as string)) as FetchReadyTaskBoard;
});

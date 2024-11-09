import { addSyncClient, removeSyncClient } from "~/server/utils/sync";

export default defineEventHandler(async (event) => {
  const { boardId } = getRouterParams(event);
  const { uniqueFingerprint } = getQuery(event);

  if(!event.context.user) {
    throw createError({
      status: 401,
      statusText: "Unauthorized",
    });
  }

  if (!boardId || !uniqueFingerprint || typeof uniqueFingerprint !== "string") {
    throw createError({
      status: 400,
      statusText: "Bad Request",
    });
  }

  const user = await lookupUsers([event.context.user.id]);
  const eventStream = createEventStream(event);

  addSyncClient(uniqueFingerprint, boardId.toString(), user[0], eventStream);

  eventStream.onClosed(() => {
    removeSyncClient(boardId.toString(),uniqueFingerprint);
    eventStream.close();
  });

  setResponseHeader(event, "Content-Type", "text/event-stream");
  setResponseHeader(event, "Cache-Control", "no-cache");
  setResponseHeader(event, "Connection", "keep-alive");
  setResponseHeader(event, "X-Accel-Buffering", "no");

  return eventStream.send();
});

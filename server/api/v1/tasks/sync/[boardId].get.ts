import { set } from "zod";
import { addSyncClient, removeSyncClient } from "~/server/utils/sync";

export default defineEventHandler((event) => {
  const { boardId } = getRouterParams(event);
  const { uniqueFingerprint } = getQuery(event);

  if (!boardId || !uniqueFingerprint || typeof uniqueFingerprint !== "string") {
    throw createError({
      status: 400,
      statusText: "Bad Request",
    });
  }

  const eventStream = createEventStream(event);

  addSyncClient(uniqueFingerprint, boardId.toString(), event.context.user ?? undefined, eventStream);

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

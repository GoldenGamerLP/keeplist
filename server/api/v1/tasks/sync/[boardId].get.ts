import { addSyncClient, removeSyncClient } from "~/server/utils/sync";

export default defineEventHandler(async (event) => {
  const { boardId } = getRouterParams(event);
  const { uniqueFingerprint } = getQuery(event);

  if (!boardId || !uniqueFingerprint || typeof uniqueFingerprint !== "string") {
    throw createError({
      status: 400,
      statusText: "Bad Request",
    });
  }

  const eventStream = createEventStream(event);

  // Add the client to the sync clients
  addSyncClient(uniqueFingerprint, boardId.toString(), event.context.user ?? undefined, eventStream);

  // Implement keep-alive mechanism
  const keepAliveInterval = setInterval(() => {
    eventStream.push("\n\nkeep-alive\n\n");
  }, 10000); // Send a keep-alive comment every 10 seconds

  eventStream.onClosed(async () => {
    clearInterval(keepAliveInterval); // Clear the keep-alive interval
    removeSyncClient(boardId.toString(), uniqueFingerprint);
    await eventStream.close();
  });

  return eventStream.send();
});

import { addSyncClient, removeSyncClient } from "~/server/utils/sync";

export default eventHandler(async (event) => {
  const start = Date.now();
  const { boardId } = getRouterParams(event);
  const { uniqueFingerprint } = getQuery(event);

  console.log(`Syncing board ${boardId} for client ${uniqueFingerprint} took ${Date.now() - start}ms`);

  if (!boardId || !uniqueFingerprint || typeof uniqueFingerprint !== "string") {
    throw createError({
      status: 400,
      statusText: "Bad Request",
    });
  }

  const eventStream = createEventStream(event);

  console.log(`created event stream for board ${boardId} and client ${uniqueFingerprint} took ${Date.now() - start}ms`);

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

  console.log(`added client to sync clients for board ${boardId} and client ${uniqueFingerprint} took ${Date.now() - start}ms`);

  return eventStream.send();
});

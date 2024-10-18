import { User } from "lucia";
import { UpdateUserStatistics } from "./taskBoardUtils";
import {SafeUser} from "~/server/utils/authUtils";

const syncClients = new Map<string, SyncedUser[]>();
const lastFingerprints = new Map<string, string>();

interface SyncedUser {
  user: SafeUser | undefined;
  stream: EventStream;
  boardId: string;
  uniqueFingerprint: string;
}

const publishSyncEvent = async (
  boardId: string,
  userId: string | undefined,
  publisher: string,
  action: string,
  payload: any
) => {
  const currentFingerprint = uuidv4();
  const previousFingerprint = lastFingerprints.get(boardId);
  const syncMessage = {
    publisher,
    userId,
    action,
    payload,
    verification: { previousFingerprint, currentFingerprint },
  } as SyncMessage;
  const syncMessageString = JSON.stringify(syncMessage);

  const users = syncClients.get(boardId);
  if(!users) {
    return;
  }

    for(const user of users) {
        user.stream.push(syncMessageString);
    }

  lastFingerprints.set(boardId, currentFingerprint);
};

interface SyncMessage {
  userId: string | undefined;
  publisher: string;
  action: string;
  payload: any;
  verification: {
    currentFingerprint: string;
    previousFingerprint: string | undefined;
  };
}

const addSyncClient = (
  uniqueFingerprint: string,
  boardId: string,
  user: SafeUser | undefined,
  stream: EventStream
) => {
  const board = syncClients.get(boardId) || [] as SyncedUser[];

  //TODO: fix _id workarround: look at authUtils and DataBaseUserAttributes!
  const syncClient = {
    user: user ? {...user, _id: user.id} : undefined,
    stream,
    boardId,
    uniqueFingerprint,
  };

  board.push(syncClient);
  syncClients.set(boardId, board);
};

const removeSyncClient = (boardId:string, uniqueFingerprint: string) => {
    const board = syncClients.get(boardId);
    if(!board) return;

    const index = board.findIndex((client) => client.uniqueFingerprint === uniqueFingerprint);
    if(index === -1) return;

    board.splice(index, 1);
    syncClients.set(boardId, board);
};


function uuidv4() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (
      +c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
    ).toString(16)
  );
}

function runSyncUpdateTask() {
  //Go through all boards and send the amount of clients connected to each board
    for(const [boardId, clients] of syncClients) {
        const updateStats = getUpdateStats(boardId);
        if(!updateStats) return;

        publishSyncEvent(boardId, "server", "server", "updateUserStatistics", updateStats);
    }
}

const getUpdateStats = (boardId: string) => {
    let clientCount = 0;
    let users: SafeUser[] = [];

    const board = syncClients.get(boardId);

    if(board) {
        for(const client of board) {
            clientCount++;
            if(client.user) {
                if(users.find((user) => user._id === client.user?._id)) continue;
                users.push(client.user);
            }
        }
    }

  const updateStats: UpdateUserStatistics = {
    clientCount,
    users,
    verifiedUserCount: users.length,
  }

    return updateStats;
}

export { addSyncClient, removeSyncClient, publishSyncEvent, getUpdateStats, runSyncUpdateTask };
export type { SyncMessage };

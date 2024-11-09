import { ObjectId } from "mongodb";
import database from "./mongodbUtils";
import { publishSyncEvent, runSyncUpdateTask, getUpdateStats } from "./sync";
import { SafeUser } from "~/server/utils/authUtils";
import { User } from "lucia";

const intervallMilliseconds = process.env.TASKCARDS_UPDATE_SEND_INTERVALL;

const boardCollection = database.collection<TaskBoard>("taskboards");
let intervall: NodeJS.Timeout | undefined;

//On load
function startSyncUpdateTask() {
  if (intervall) {
    clearInterval(intervall);
  }

  if (!intervallMilliseconds) {
    console.error(
      "No intervall set for taskboard update. Set: TASKCARDS_UPDATE_SEND_INTERVALL. Using default: 5000ms"
    );
  }

  intervall = setInterval(async () => {
    runSyncUpdateTask();
  }, parseInt(intervallMilliseconds ?? "5000"));
}

export const hasAccessToTaskboard = (userId: string, boardId: string) => {
  return boardCollection.countDocuments({
    _id: new ObjectId(boardId),
    $or: [{ author: userId }, { collaborators: userId }],
  });
}

export function taskboardExists(boardId: string) {
  return boardCollection.countDocuments({ _id: new ObjectId(boardId) });
}

export function countTaskBoards(boardId: string) {
  return boardCollection.countDocuments({ _id: new ObjectId(boardId) });
}

export async function updateCollaborators(
  boardId: string,
  collaborators: string[]
) {
  const res = await boardCollection.updateOne(
    {
      _id: new ObjectId(boardId),
    },
    {
      $set: {
        collaborators,
      },
    }
  );

  if (res.modifiedCount === 0) {
    return false;
  }

  await refreshTaskboardEdited(boardId);

  return true;
}

export async function deleteBoard(boardId: string) {
  const res = await boardCollection.deleteOne({
    _id: new ObjectId(boardId),
  });

  const sucess = res.deletedCount === 1;

  if (!sucess) {
    return false;
  }

  await publishSyncEvent(boardId, undefined, "system", "deleteKeepList", {
    boardId,
  });

  return true;
}

export async function getTaskboard(boardId: string) {
  if (!ObjectId.isValid(boardId)) {
    return null;
  }

  const res = await boardCollection
    .aggregate([
      {
        $match: {
          _id: new ObjectId(boardId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "authorLookup",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "collaborators",
          foreignField: "_id",
          as: "collaboratorsLookup",
        },
      },
      {
        $set: {
          userlookup: {
            $arrayToObject: {
              $concatArrays: [
                {
                  $map: {
                    input: "$authorLookup",
                    as: "author",
                    in: {
                      k: "$$author._id",
                      v: {
                        mail: "$$author.mail",
                        last_login: "$$author.last_login",
                        _id: "$$author._id",
                        displayname: "$$author.displayname",
                      },
                    },
                  },
                },
                {
                  $map: {
                    input: "$collaboratorsLookup",
                    as: "collaborator",
                    in: {
                      k: "$$collaborator._id",
                      v: {
                        mail: "$$collaborator.mail",
                        last_login: "$$collaborator.last_login",
                        _id: "$$collaborator._id",
                        displayname: "$$collaborator.displayname",
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
      {
        $project: {
          authorLookup: 0,
          collaboratorsLookup: 0,
        },
      },
    ])
    .toArray();

  if (res.length !== 1) {
    return null;
  }

  return res[0] as FetchReadyTaskBoard;
}

export async function createNewTaskBoard(
  userId: string,
  title: string,
  description: string,
  color: string,
  tags: string[]
) {
  const taskBoard = {
    title,
    description,
    collection: [] as TaskCollection[],
    _id: new ObjectId(),
    color,
    author: userId,
    collaborators: [],
    createdAt: new Date(),
    tags: tags,
    lastUpdated: undefined,
    settings: {
      isPublic: false,
    },
  } as TaskBoard;

  const res = await boardCollection.insertOne(taskBoard);

  return res.acknowledged;
}

export async function createCollection(
  userId: string,
  publisher: string,
  boardId: string,
  title: string,
  description: string,
  color: string
) {
  const collection = {
    title,
    description,
    tasks: [],
    id: new ObjectId().toHexString(),
    color,
  } as TaskCollection;

  //Find board and push the collection to the collection array
  const res = await boardCollection.updateOne(
    {
      _id: new ObjectId(boardId),
    },
    {
      $push: {
        collection: collection,
      },
    }
  );

  if (res.modifiedCount === 0) {
    return false;
  }

  await refreshTaskboardEdited(boardId);

  publishSyncEvent(boardId, userId, publisher, "createCollection", collection);

  return collection;
}

export async function deleteTask(
  userId: string,
  publisher: string,
  boardId: string,
  collectionId: string,
  taskId: string
) {
  const res = await boardCollection.updateOne(
    {
      _id: new ObjectId(boardId),
      "collection.id": collectionId,
    },
    {
      $pull: {
        "collection.$.tasks": { id: taskId },
      },
    }
  );

  if (res.modifiedCount === 0) {
    return false;
  }

  await refreshTaskboardEdited(boardId);

  const action: DeleteTaskInterface = { collectionId, taskId, userId };
  publishSyncEvent(boardId, userId, publisher, "deleteTask", action);

  return true;
}

export async function deleteCollection(
  userId: string,
  publisher: string,
  boardId: string,
  collectionId: string
) {
  const res = await boardCollection.updateOne(
    {
      _id: new ObjectId(boardId),
    },
    {
      $pull: {
        collection: { id: collectionId },
      },
    }
  );

  if (res.modifiedCount === 0) {
    return false;
  }

  await refreshTaskboardEdited(boardId);

  const action: DeleteCollectionInterface = { collectionId, userId };

  publishSyncEvent(boardId, userId, publisher, "deleteCollection", action);

  return true;
}

export async function editTaskBoard(
  userId: string,
  publisher: string,
  boardId: string,
  title: string,
  description: string,
  color: string,
  tags: string[]
) {
  const res = await boardCollection.updateOne(
    {
      _id: new ObjectId(boardId),
    },
    {
      $set: {
        title,
        description,
        color,
        tags,
      },
    }
  );

  if (res.modifiedCount === 0) {
    return false;
  }

  await refreshTaskboardEdited(boardId);

  const action: EditTaskBoardInterface = {
    title,
    description,
    color,
    tags,
    userId,
  };

  publishSyncEvent(boardId, userId, publisher, "editTaskBoard", action);

  return true;
}

export async function editCollection(
  userId: string,
  publisher: string,
  boardId: string,
  collectionId: string,
  title: string,
  description: string,
  color: string
) {
  const res = await boardCollection.updateOne(
    {
      _id: new ObjectId(boardId),
      "collection.id": collectionId,
    },
    {
      $set: {
        "collection.$.title": title,
        "collection.$.description": description,
        "collection.$.color": color,
      },
    }
  );

  if (res.modifiedCount === 0) {
    return false;
  }

  await refreshTaskboardEdited(boardId);

  const action: EditCollectionInterface = {
    title,
    description,
    color,
    collectionId,
    userId,
  };

  publishSyncEvent(boardId, userId, publisher, "editCollection", action);

  return true;
}

export async function editTask(
  userId: string,
  publisher: string,
  boardId: string,
  collectionId: string,
  task: { id: string } & Partial<Task>
) {
  const res = await boardCollection.updateOne(
    {
      _id: new ObjectId(boardId),
      "collection.id": collectionId,
    },
    {
      $set: {
        "collection.$.tasks.$[task].title": task.title,
        "collection.$.tasks.$[task].description": task.description,
        "collection.$.tasks.$[task].lastUpdated": new Date(),
      },
    },
    {
      arrayFilters: [{ "task.id": task.id }],
    }
  );

  if (res.modifiedCount === 0) {
    return false;
  }

  await refreshTaskboardEdited(boardId);

  const action: OnEditTaskInterface = {
    collectionId,
    task: task as Task,
    userId,
  };

  publishSyncEvent(boardId, userId, publisher, "editTask", action);

  return true;
}

export async function createTask(
  userId: string,
  publisher: string,
  boardId: string,
  collectionId: string,
  title: string,
  description: string
) {
  const task = {
    title,
    description,
    createdAt: new Date(),
    id: new ObjectId().toHexString(),
  } as Task;

  const res = await boardCollection.updateOne(
    {
      _id: new ObjectId(boardId),
      "collection.id": collectionId,
    },
    {
      $push: {
        "collection.$.tasks": task,
      },
    }
  );

  if (res.modifiedCount === 0) {
    return false;
  }

  await refreshTaskboardEdited(boardId);

  const action: CreateTaskInterface = {
    task,
    collectionId,
    userId,
  };

  publishSyncEvent(boardId, userId, publisher, "createTask", action);

  return task;
}

export async function moveTask(
  userId: string,
  publisher: string,
  boardId: string,
  taskId: string,
  collectionId: string,
  newCollectionId: string,
  oldIndex: number,
  newIndex: number
) {
  // Fetch the task board and collections
  const taskBoard = await boardCollection.findOne({
    _id: new ObjectId(boardId),
  });

  if (!taskBoard) {
    console.error("Task board not found.");
    return false;
  }

  // Find the source and destination collections
  const sourceCollection = taskBoard.collection.find(
    (col) => col.id === collectionId
  );
  const destinationCollection = taskBoard.collection.find(
    (col) => col.id === newCollectionId
  );

  if (!sourceCollection || !destinationCollection) {
    console.error("Source or destination collection not found.");
    return false;
  }

  // Find the task in the source collection
  const selectedTask = sourceCollection.tasks.find(
    (task) => task.id === taskId
  );

  if (!selectedTask) {
    console.error("Task not found in source collection.");
    return false;
  }

  // Remove the task from the source collection
  sourceCollection.tasks = sourceCollection.tasks.filter(
    (task) => task.id !== taskId
  );

  // Insert the task into the destination collection at the specified index
  destinationCollection.tasks.splice(newIndex, 0, selectedTask);

  // Update the task board in the database
  const res = await boardCollection.updateOne(
    { _id: new ObjectId(boardId) },
    { $set: { collection: taskBoard.collection } }
  );

  if (res.modifiedCount === 0) {
    console.error("Failed to update task board in the database.");
    return false;
  }

  await refreshTaskboardEdited(boardId);

  const action: OnMoveTaskInterface = {
    fromCollection: collectionId,
    toCollection: newCollectionId,
    taskId,
    oldIndex,
    newIndex,
    userId,
  };

  publishSyncEvent(boardId, userId, publisher, "moveTask", action);

  return true;
}

/**
 * Moves a collection within a task board from one index to another.
 *
 * @param userId - The ID of the user performing the action.
 * @param publisher - The publisher of the event.
 * @param boardId - The ID of the task board.
 * @param collectionId - The ID of the collection to move.
 * @param oldIndex - The current index of the collection.
 * @param newIndex - The new index to move the collection to.
 * @returns A promise that resolves to a boolean indicating whether the move was successful.
 */
export async function moveCollection(
  userId: string,
  publisher: string,
  boardId: string,
  collectionId: string,
  oldIndex: number,
  newIndex: number
) {
  const aggregate = boardCollection.aggregate([
    {
      $match: {
        _id: new ObjectId(boardId),
      },
    },
    {
      $project: {
        collection: 1,
      },
    },
  ]);

  const documents = await aggregate.toArray();

  if (!documents || documents.length === 0) {
    return false;
  }

  const collections = documents[0].collection as TaskCollection[];

  if (collections.length < 1) {
    return false;
  }

  const newCollections = switchArrayPosition(collections, oldIndex, newIndex) as TaskCollection[];

  const res = await boardCollection.updateOne(
    {
      _id: new ObjectId(boardId),
    },
    {
      $set: {
        collection: newCollections,
      },
    }
  );

  if (res.modifiedCount === 0) {
    return false;
  }

  await refreshTaskboardEdited(boardId);

  const action: OnMoveCollectionInterface = {
    newIndex,
    oldIndex,
    collectionId,
    userId,
  };

  publishSyncEvent(boardId, userId, publisher, "moveCollection", action);

  return true;
}

function switchArrayPosition(array: object[], oldIndex: number, newIndex: number) {
  const newArray = [...array];
  const [removed] = newArray.splice(oldIndex, 1);
  newArray.splice(newIndex, 0, removed);
  return newArray;
}

/**
 * Updates the `lastUpdated` field of a task board with the current date and time.
 *
 * @param boardId - The unique identifier of the task board to be updated.
 * @returns A promise that resolves to `true` if the task board was successfully updated, otherwise `false`.
 */
async function refreshTaskboardEdited(boardId: string) {
  const res = await boardCollection.updateOne(
    {
      _id: new ObjectId(boardId),
    },
    {
      $set: {
        lastUpdated: new Date(),
      },
    }
  );

  return res.modifiedCount > 0;
}

/**
 * Retrieves task boards where the specified user is a collaborator, 
 * along with safe user details for the author and collaborators.
 *
 * @param {string} userId - The ID of the user to find task boards for.
 * @returns {Promise<Array>} A promise that resolves to an array of task boards with safe user details.
 */
export async function getUserInvitedTaskboardWithSafeUser(userId: string) {
  return await boardCollection
    .aggregate([
      {
        $match: {
          collaborators: userId,
        },
      },
      {
        $project: {
          collection: 0,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                mail: 1,
                _id: 1,
                last_login: 1,
                displayname: 1,
              },
            },
          ],
          as: "author_details",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "collaborators",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                mail: 1,
                _id: 1,
                last_login: 1,
                displayname: 1,
              },
            },
          ],
          as: "collaborator_details",
        },
      },
    ])
    .toArray();
}

/**
 * Retrieves a preview of task boards for a given user.
 *
 * @param userId - The ID of the user whose task boards are to be retrieved.
 * @param mode - The mode of retrieval, either "own" for boards authored by the user or "shared" for boards the user is a collaborator on. Defaults to "own".
 * @returns A promise that resolves to an array of task board previews.
 */
export async function retrieveTaskboardsPreview(
  userId: string,
  mode: "own" | "shared" = "own"
) {
  const res = await boardCollection
    .aggregate([
      {
        $match: {
          [mode === "own" ? "author" : "collaborators"]: userId,
        },
      },
      {
        $project: {
          collection: 0,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                mail: 1,
                _id: 1,
                last_login: 1,
                displayname: 1,
              },
            },
          ],
          as: "author_details",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "collaborators",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                mail: 1,
                _id: 1,
                last_login: 1,
                displayname: 1,
              },
            },
          ],
          as: "collaborator_details",
        },
      },
    ])
    .toArray();

  return res.map((board) => {
    const author = board.author_details as SafeUser[];
    const collaborators = board.collaborator_details as SafeUser[];

    return {
      ...(board as TaskBoard),
      author_details: author,
      collaborator_details: collaborators,
      activeStatistics: getUpdateStats(board._id.toString()),
    };
  }) as TaskCardPreview[];
}

//TODO: Better handling of start methods
startSyncUpdateTask();

export type TaskCardPreview = {
  _id: ObjectId;
  title: string;
  description: string;
  color: string;
  lastUpdated: Date | undefined;
  tags: string[];
  collaborators: string[];
  createdAt: Date;
  author: string;
  activeStatistics: UpdateUserStatistics;
  collaborator_details: SafeUser[];
  author_details: SafeUser[];
};

interface TaskBoard {
  title: string;
  description: string;
  collection: TaskCollection[];
  _id: ObjectId;
  color: string;
  author: string;
  collaborators: string[];
  createdAt: Date;
  lastUpdated?: Date;
  tags: string[];
  settings: TaskBoardSettings;
}

interface TaskBoardSettings {
  isPublic: boolean;
}

interface TaskCollection {
  tasks: Task[];
  title: string;
  description: string;
  id: string;
  color: string;
}

interface Task {
  title: string;
  description: string;
  id: string;
  createdAt: Date;
  lastUpdated?: Date;
}

//Interfaces for data sync: MoveCollection, CreateCollection, MoveTask, CreateTask, EditTaskBoard
interface OnMoveTaskInterface {
  fromCollection: string;
  toCollection: string;
  taskId: string;
  oldIndex: number;
  newIndex: number;
  userId: string;
}

interface OnMoveCollectionInterface {
  newIndex: number;
  oldIndex: number;
  collectionId: string;
  userId: string;
}

interface OnEditTaskInterface {
  collectionId: string;
  task: Task;
  userId: string;
}

interface CreateTaskInterface {
  task: Task;
  collectionId: string;
  userId: string;
}

interface CreateCollectionInterface {
  col: TaskCollection;
  userId: string;
}

interface EditTaskBoardInterface {
  title: string;
  description: string;
  color: string;
  tags: string[];
  userId: string;
}

interface EditCollectionInterface {
  collectionId: string;
  title: string;
  description: string;
  color: string;
  userId: string;
}

interface DeleteTaskInterface {
  collectionId: string;
  taskId: string;
  userId: string;
}

interface DeleteCollectionInterface {
  collectionId: string;
  userId: string;
}

interface UpdateUserStatistics {
  clientCount: number;
  verifiedUserCount: number;
  users: User[];
}

interface FetchReadyTaskBoard extends TaskBoard {
  userlookup: {
    [key: string]: SafeUser;
  };
}

export type {
  TaskBoard,
  TaskCollection,
  Task,
  OnMoveTaskInterface,
  OnMoveCollectionInterface,
  CreateTaskInterface,
  CreateCollectionInterface,
  EditTaskBoardInterface,
  OnEditTaskInterface,
  EditCollectionInterface,
  DeleteTaskInterface,
  DeleteCollectionInterface,
  UpdateUserStatistics,
  FetchReadyTaskBoard,
};

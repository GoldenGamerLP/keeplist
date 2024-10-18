import { ObjectId } from "mongodb";
import database from "./mongodbUtils";
import { publishSyncEvent, runSyncUpdateTask, getUpdateStats } from "./sync";
import { SafeUser } from "~/server/utils/authUtils";

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

  intervall = setInterval(() => {
    runSyncUpdateTask();
  }, parseInt(intervallMilliseconds ?? "5000"));
}

export function hasAccessToTaskboard(userId: string, boardId: string) {
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

  if(!sucess) {
    return false;
  }

  await publishSyncEvent(boardId, undefined, "system", "deleteKeepList", { boardId });

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
  userId: string | undefined,
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
  userId: string | undefined,
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
  userId: string | undefined,
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

  const action: EditTaskBoardInterface = { title, description, color, tags, userId };

  publishSyncEvent(boardId, userId, publisher, "editTaskBoard", action);

  return true;
}

export async function editCollection(
  userId: string | undefined,
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
  userId: string | undefined,
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
        "collection.$.tasks.$[task].dueDate": task.dueDate,
        "collection.$.tasks.$[task].status": task.status,
        "collection.$.tasks.$[task].assignee": task.assignee,
        "collection.$.tasks.$[task].tags": task.tags,
        "collection.$.tasks.$[task].comments": task.comments,
        "collection.$.tasks.$[task].attachments": task.attachments,
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

  const action: OnEditTaskInterface = { collectionId, task: task as Task, userId };

  publishSyncEvent(boardId, userId, publisher, "editTask", action);

  return true;
}

export async function createTask(
  userId: string | undefined,
  publisher: string,
  boardId: string,
  collectionId: string,
  title: string,
  description: string
) {
  const task = {
    title,
    description,
    dueDate: new Date(),
    status: "todo",
    assignee: "John Doe",
    tags: ["tag1", "tag2"],
    comments: [],
    attachments: [],
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

//boardId, taskId, collectionId, newCollectionId, oldIndex, newIndex
export async function moveTask(
  userId: string | undefined,
  publisher: string,
  boardId: string,
  taskId: string,
  collectionId: string,
  newCollectionId: string,
  oldIndex: number,
  newIndex: number
) {
  // Ensure the taskBoard is found
  const taskCollection = boardCollection.aggregate([
    {
      $match: {
        _id: new ObjectId(boardId),
      },
    },
    {
      $project: {
        collection: {
          $filter: {
            input: "$collection",
            as: "col",
            cond: { $eq: ["$$col.id", collectionId] },
          },
        },
      },
    },
  ]);

  const documents = await taskCollection.toArray();

  if (!documents || documents.length === 0) {
    return false;
  }

  const collection = documents[0].collection[0] as TaskCollection;
  const selectedTask = collection.tasks[oldIndex];

  if (selectedTask.id !== taskId) {
    return false;
  }

  //Move the task to the new collection
  const aggregate = await boardCollection.updateOne(
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

  if (aggregate.modifiedCount === 0) {
    return false;
  }

  const newAggregate = await boardCollection.updateOne(
    {
      _id: new ObjectId(boardId),
      "collection.id": newCollectionId,
    },
    {
      $push: {
        "collection.$.tasks": {
          $each: [selectedTask],
          $position: newIndex,
        },
      },
    }
  );

  if (newAggregate.modifiedCount === 0) {
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

export async function moveCollection(
  userId: string | undefined,
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

  const newCollections = switchArrayPosition(collections, oldIndex, newIndex);

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

function switchArrayPosition(array: any[], oldIndex: number, newIndex: number) {
  const newArray = [...array];
  const [removed] = newArray.splice(oldIndex, 1);
  newArray.splice(newIndex, 0, removed);
  return newArray;
}

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
  users: SafeUser[];
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
  Attachment,
  Comment,
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

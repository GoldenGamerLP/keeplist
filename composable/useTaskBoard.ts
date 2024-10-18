import { useEventSource } from "@vueuse/core";
import { useTasksStrore } from "~/store/tasks";
import { useToast } from "~/components/ui/toast";

export const useTaskBoard = () => {
  const tasksStore = useTasksStrore();
  const { toast } = useToast();
  const boardId = useRoute().params.id as string;

  const syncedUsers = ref<UpdateUserStatistics | null>(null);

  const fetch = useFetch(`/api/v1/tasks/${useRoute().params.id}`, {
    headers: {
      "Content-Type": "application/json",
    },
    method: "GET",
  });

  const sse = useEventSource(
    `/api/v1/tasks/sync/${boardId}?uniqueFingerprint=${tasksStore.uniqueFingerprint}`,
    [],
    {
      immediate: false,
    }
  );

  watch(fetch.status, (status) => {
    if (status === "success") {
      sse.open();
    }

    if (status === "error") {
      sse.close();
    }
  }, { immediate: true });

  onBeforeUnmount(() => {
    sse.close();

    syncedUsers.value = null;
  });

  let lastFingerprint = "";
  watch(sse.data, (value) => {
    // Ignore ping messages and empty messages
    if (!value || value.startsWith("ping")) return;

    const message: SyncMessage = JSON.parse(value);
    const previousFingerprint = message.verification.previousFingerprint;

    if (
      previousFingerprint &&
      lastFingerprint.length !== 0 &&
      message.verification.previousFingerprint !== lastFingerprint
    ) {
      // Fingerprint mismatch, we need to reload the data
      fetch.refresh();
      toast({
        title: "Sync",
        description: `Fingerprint mismatch, reloading data`,
      });
      lastFingerprint = "";
      return;
    }

    lastFingerprint = message.verification.currentFingerprint;

    // Ignore messages from ourselfs
    if (message.publisher === tasksStore.uniqueFingerprint) return;

    switch (message.action) {
      case "createCollection":
        createCollectionSynced(message.payload);
        break;
      case "createTask":
        createTaskSynced(message.payload);
        break;
      case "editTaskBoard":
        editTaskBoardSynced(message.payload);
        break;
      case "moveCollection":
        onMoveCollectionSynced(message.payload);
        break;
      case "moveTask":
        onMoveTaskSynced(message.payload);
        break;
      case "deleteCollection":
        onDeleteCollectionSynced(message.payload);
        break;
      case "deleteTask":
        onDeleteTaskSynced(message.payload);
        break;
      case "editTask":
        onEditTaskSynced(message.payload);
        break;
      case "editCollection":
        onEditCollectionSynced(message.payload);
        break;
      case "updateUserStatistics":
        updateUserStatistics(message.payload);
        break;
      case "deleteKeepList":
        onDeleteKeepList();
        break
      default:
        toast({
          title: "Sync",
          description: `Unknown event: ${message.action}`,
        });
        break;
    }
  });

  const updateUserStatistics = (payload: UpdateUserStatistics) => {
    syncedUsers.value = payload;
  };

  const deleteBoard = async () => {
    showFeedback(
      tasksStore.deleteKeepList(boardId),
      "deleting board",
      "success",
      () => {
        useRouter().push("/myaccount");
      }
    );
  }

  const onDeleteTaskSynced = (payload: DeleteTaskInterface) => {
    if (!data.value) return;

    const col = data.value.collection.find(
      (col) => col.id === payload.collectionId
    );

    if (col) {
      const taskIndex = col.tasks.findIndex((t) => t.id === payload.taskId);
      col.tasks.splice(taskIndex, 1);
      toast({ title: "Task Deleted", description: `Task has been deleted` });
    } else {
      toast({
        title: "Task Deletion Failed",
        description: `Task could not be deleted`,
      });
    }
  };

  const onDeleteCollectionSynced = (payload: DeleteCollectionInterface) => {
    if (!data.value) return;

    const colIndex = data.value.collection.findIndex(
      (col) => col.id === payload.collectionId
    );

    if (colIndex > -1) {
      data.value.collection.splice(colIndex, 1);
      toast({
        title: "Collection Deleted",
        description: `Collection has been deleted`,
      });
    } else {
      toast({
        title: "Collection Deletion Failed",
        description: `Collection could not be deleted`,
      });
    }
  };

  const onEditCollectionSynced = (payload: EditCollectionInterface) => {
    if (!data.value) return;

    const col = data.value.collection.find(
      (col) => col.id === payload.collectionId
    );

    if (col) {
      col.title = payload.title;
      col.description = payload.description;
      col.color = payload.color;

      toast({
        title: "Collection Updated",
        description: `Collection ${col.title} has been updated`,
      });
    } else {
      toast({
        title: "Collection Update Failed",
        description: `Collection ${payload.title} could not be updated`,
      });
    }
  };

  const onEditTaskSynced = (payload: OnEditTaskInterface) => {
    if (!data.value) return;

    const task = payload.task;
    const collectionId = payload.collectionId;

    const col = data.value.collection.find((col) => col.id === collectionId);

    if (col) {
      const task = col.tasks.find((t) => t.id === payload.task.id);

      if (task) {
        task.title = payload.task.title;
        task.description = payload.task.description;
        toast({
          title: "Task Updated",
          description: `Task ${task.title} has been updated`,
        });
      } else {
        toast({
          title: "Task Update Failed",
          description: `Task could not be updated`,
        });
      }
    } else {
      toast({
        title: "Task Update Failed",
        description: `Task ${task.title} could not be updated`,
      });
    }
  };

  const onMoveCollectionSynced = (payload: OnMoveCollectionInterface) => {
    if (!data.value) return;

    const col = data.value.collection.find(
      (col) => col.id === payload.collectionId
    );

    if (col) {
      const collection = data.value.collection.splice(payload.oldIndex, 1)[0];
      data.value.collection.splice(payload.newIndex, 0, collection);
      toast({
        title: "Collection update",
        description: `Moved collection from ${payload.oldIndex} to ${payload.newIndex}`,
      });
    } else {
      toast({
        title: "Collection update failed",
        description: `Collection could not be moved`,
      });
    }
  };

  const onMoveTaskSynced = (payload: OnMoveTaskInterface) => {
    if (!data.value) return;

    const from = data.value.collection.find(
      (col) => col.id === payload.fromCollection
    );
    const to = data.value.collection.find(
      (col) => col.id === payload.toCollection
    );
    const taskId = payload.taskId;

    //Verify that the task exists in the from collection
    const task = from?.tasks.find((task) => task.id === taskId);
    if (!task) {
      toast({
        title: "Task update failed",
        description: `Task could not be moved from ${from} to ${to} collection.`,
      });
      return;
    }

    if (from && to) {
      const task = from.tasks.splice(payload.oldIndex, 1)[0];
      to.tasks.splice(payload.newIndex, 0, task);
      toast({
        title: "Task update",
        description: `Moved task from ${payload.oldIndex} to ${payload.newIndex}`,
      });
    } else {
      toast({
        title: "Task update failed",
        description: `Task could not be moved`,
      });
    }
  };

  const editTaskBoardSynced = (payload: EditTaskBoardInterface) => {
    if (!data.value) return;

    data.value.title = payload.title;
    data.value.description = payload.description;
    data.value.color = payload.color;
    data.value.tags = payload.tags;

    toast({
      title: "Task Board Updated",
      description: `Task Board ${payload.title} has been updated`,
    });
  };

  const createTaskSynced = (payload: CreateTaskInterface) => {
    if (!data.value) return;

    const task = payload.task;
    const col = data.value.collection.find(
      (col) => col.id === payload.collectionId
    );

    if (col) {
      col.tasks.push(task);

      toast({
        title: "Task Created",
        description: `Task ${task.title} has been created`,
      });
    } else {
      toast({
        title: "Task Creation Failed",
        description: `Task ${task.title} could not be created`,
      });
    }
  };

  const createCollectionSynced = (payload: TaskCollection) => {
    if (!data.value) return;
    data.value.collection.push(payload);
    toast({
      title: "Collection Created",
      description: `Collection ${payload.title} has been created`,
    });
  };

  const showFeedback = async <T>(
    action: Promise<T>,
    description: string,
    mode: "success" | "failure" | "both" = "both",
    successCallback?: (payload: T) => void
  ) => {
    try {
      const res = await action;

      if (!!res) {
        if (mode === "success" || mode === "both") {
          toast({
            title: "Success",
            description: `Successfully changed: ${description}`,
          });
        }

        if (successCallback) {
          successCallback(res);
        }
      } else {
        if (mode === "failure" || mode === "both") {
          toast({
            title: "Failure",
            description: `An error occoured while: ${description}`,
          });
        }
      }
    } catch (error) {
      toast({
        title: "Failure",
        description: `An error occoured while: ${description}: ${error}`,
      });
    }
  };

  const updateCollaborators = async (users: string[]) => {
    showFeedback(
      tasksStore.updateCollaborators(boardId, users),
      "updating collaborators"
    );
  };

  const onMoveTask = async (event: {
    from: HTMLDivElement;
    to: HTMLDivElement;
    newIndex: number;
    oldIndex: number;
    item: HTMLElement;
  }) => {
    const from = event.from as HTMLDivElement;
    const to = event.to as HTMLDivElement;
    const newIndex = (event.newIndex as number) ?? 0;
    const oldIndex = (event.oldIndex as number) ?? 0;
    const id = event.item.dataset.taskid as string;

    showFeedback(
      tasksStore.moveTask(boardId, id, from.id, to.id, oldIndex, newIndex),
      "moving task"
    );
    return true;
  };

  const onMoveCollection = async (event: {
    newIndex: number;
    oldIndex: number;
    item: HTMLElement;
  }) => {
    const newIndex = (event.newIndex as number) ?? 0;
    const oldIndex = (event.oldIndex as number) ?? 0;
    const id = event.item.dataset.colid as string;

    showFeedback(
      tasksStore.moveCollection(boardId, id, oldIndex, newIndex),
      "moving collection"
    );
    return true;
  };

  const data = computed(() => {
    return fetch.data.value as FetchReadyTaskBoard | null;
  });

  const createTask = async (
    title: string,
    description: string,
    colId: string
  ) => {
    if (!data.value) return;

    showFeedback(
      tasksStore.createTask(boardId, colId, title, description),
      `creating task ${title}`,
      "success",
      (response) => {
        const collection = data.value.collection.find(
          (col) => col.id === colId
        );
        if (collection) {
          collection.tasks.push(response);
        }
      }
    );
  };

  const createCollection = async (
    title: string,
    description: string,
    color: string
  ) => {
    if (!data.value) return;

    showFeedback(
      tasksStore.createCollection(boardId, title, description, color),
      `creating collection ${title}`,
      "success",
      (response) => {
        data.value.collection.push(response);
      }
    );
  };

  const deleteTask = async (event: {
    collectionId: string;
    taskId: string;
  }) => {
    if (!data.value) return;

    showFeedback(
      tasksStore.deleteTask(boardId, event.collectionId, event.taskId),
      `deleting task`,
      "success",
      (response) => {
        const col = data.value.collection.find(
          (col) => col.id === event.collectionId
        );

        if (col) {
          const taskIndex = col.tasks.findIndex((t) => t.id === event.taskId);
          col.tasks.splice(taskIndex, 1);
        }
      }
    );
  };

  const deleteCollection = async (event: { collectionId: string }) => {
    if (!data.value) return;

    showFeedback(
      tasksStore.deleteCollection(boardId, event.collectionId),
      `deleting collection`,
      "success",
      (response) => {
        const colIndex = data.value.collection.findIndex(
          (col) => col.id === event.collectionId
        );

        if (colIndex > -1) {
          data.value.collection.splice(colIndex, 1);
        }
      }
    );
  };

  const editCollection = async (event: {
    title: string;
    description: string;
    color: string;
    collectionId: string;
  }) => {
    if (!data.value) return;

    showFeedback(
      tasksStore.editCollection(
        boardId,
        event.collectionId,
        event.title,
        event.description,
        event.color
      ),
      `editing collection ${event.title}`,
      "success",
      (response) => {
        const col = data.value.collection.find(
          (col) => col.id === event.collectionId
        );

        if (col) {
          col.title = event.title;
          col.description = event.description;
          col.color = event.color;
        }
      }
    );
  };

  const editTaskBoard = async (event: {
    title: string;
    description: string;
    color: string;
    tags: string[];
  }) => {
    if (!data.value) return;

    showFeedback(
      tasksStore.editTaskBoard(
        boardId,
        event.title,
        event.description,
        event.color,
        event.tags
      ),
      `editing task board ${event.title}`,
      "success",
      (response) => {
        data.value.title = event.title;
        data.value.description = event.description;
        data.value.color = event.color;
        data.value.tags = event.tags;
      }
    );
  };

  const editTask = async (event: {collectionId: string; task: Task }) => {
    if (!data.value) return;

    showFeedback(
      tasksStore.editTask(boardId, event.collectionId, event.task),
      `editing task ${event.task.title}`,
      "success",
      (response) => {
        const col = data.value.collection.find(
          (col) => col.id === event.collectionId
        );

        if (col) {
          const task = col.tasks.find((t) => t.id === event.task.id);

          if (task) {
            task.title = event.task.title;
            task.description = event.task.description;
          }
        }
      }
    );
  };

  const onDeleteKeepList = async () => {
    if(!data.value) return;

    useRouter().push("/myaccount");
  }

  return {
    data,
    fetch,
    fetchStatus: fetch.status,
    fetchError: fetch.error,
    createTask,
    createCollection,
    deleteTask,
    deleteCollection,
    editCollection,
    editTaskBoard,
    editTask,
    onMoveTask,
    onMoveCollection,
    onDeleteKeepList,
    updateCollaborators,
    syncedUsers,
    sseStatus: sse.status,
    deleteBoard,
  };
};

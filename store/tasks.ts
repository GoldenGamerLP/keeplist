import { defineStore, acceptHMRUpdate } from "pinia";

export const useTasksStrore = defineStore("tasks", () => {
  const uniqueFingerprint = uuidv4();

  const fetchUrl = computed(() => {
    return `/api/v1/tasks/${useRoute().params.id}`;
  });

  const fetch = useFetch(fetchUrl, {
    headers: {
        "Content-Type": "application/json",
    },
    method: "GET",
    watch: [useRoute()],
    lazy: true,
  });

  const createBoard = (title: string, description: string, color: string, tags: string[]) => {
    return $fetch("/api/v1/tasks/actions/createBoard", {
      method: "POST",
      body: JSON.stringify({ title, description, color, tags }),
      query: { uniqueFingerprint },
    });
  };

  const createTask = (
    boardId: string,
    collectionId: string,
    title: string,
    description: string
  ) => {
    return $fetch("/api/v1/tasks/actions/createTask", {
      method: "POST",
      body: JSON.stringify({ title, description, collectionId, boardId }),
      query: { uniqueFingerprint },
    });
  };

  const updateCollaborators = (boardId: string, collaborators: string[]) => {
    return $fetch("/api/v1/tasks/actions/updateCollaborators", {
      method: "POST",
      body: JSON.stringify({ boardId, collaborators }),
      query: { uniqueFingerprint },
    });
  }

  const editCollection = (
    boardId: string,
    collectionId: string,
    title: string,
    description: string,
    color: string
  ) => {
    return $fetch("/api/v1/tasks/actions/editCollection", {
      method: "POST",
      body: JSON.stringify({
        boardId,
        collectionId,
        title,
        description,
        color,
      }),
      query: { uniqueFingerprint },
    });
  };

  const moveTask = (
    boardId: string,
    taskId: string,
    collectionId: string,
    newCollectionId: string,
    oldIndex: number,
    newIndex: number
  ) => {
    return $fetch("/api/v1/tasks/actions/moveTask", {
      method: "POST",
      body: JSON.stringify({
        boardId,
        taskId,
        collectionId,
        newCollectionId,
        oldIndex,
        newIndex,
      }),
      query: { uniqueFingerprint },
    });
  };

  const editTask = (boardId: string, collectionId: string, task: Task) => {
    return $fetch("/api/v1/tasks/actions/editTask", {
      method: "POST",
      body: JSON.stringify({ boardId, collectionId, task }),
      query: { uniqueFingerprint },
    });
  };

  const deleteKeepList = (boardId: string) => {
    return $fetch("/api/v1/tasks/actions/deleteBoard", {
      method: "DELETE",
      body: JSON.stringify({ boardId }),
    });
  };


  const deleteTask = (
    boardId: string,
    collectionId: string,
    taskId: string
  ) => {
    return $fetch("/api/v1/tasks/actions/deleteTask", {
      method: "DELETE",
      body: JSON.stringify({ boardId, collectionId, taskId }),
      query: { uniqueFingerprint },
    });
  };

  const deleteCollection = (boardId: string, collectionId: string) => {
    return $fetch("/api/v1/tasks/actions/deleteCollection", {
      method: "DELETE",
      body: JSON.stringify({ boardId, collectionId }),
      query: { uniqueFingerprint },
    });
  };

  const createCollection = (
    boardId: string,
    title: string,
    description: string,
    color: string
  ) => {
    return $fetch("/api/v1/tasks/actions/createCollection", {
      method: "POST",
      body: JSON.stringify({ boardId, title, description, color }),
      query: { uniqueFingerprint },
    });
  };

  const moveCollection = (
    boardId: string,
    collectionId: string,
    oldIndex: number,
    newIndex: number
  ) => {
    //collectionId is absolute but oldIndex and newIndex are relative to the current state
    return $fetch("/api/v1/tasks/actions/moveCollection", {
      method: "POST",
      body: JSON.stringify({ boardId, collectionId, oldIndex, newIndex }),
      query: { uniqueFingerprint },
    });
  };

  const editTaskBoard = (
    boardId: string,
    title: string,
    description: string,
    color: string,
    tags: string[]
  ) => {
    return $fetch("/api/v1/tasks/actions/editTaskBoard", {
      method: "POST",
      body: JSON.stringify({ boardId, title, description, color, tags }),
      query: { uniqueFingerprint },
    });
  };

  return {
    createBoard,
    createTask,
    moveTask,
    deleteTask,
    createCollection,
    moveCollection,
    deleteCollection,
    editTaskBoard,
    uniqueFingerprint,
    editTask,
    editCollection,
    updateCollaborators,
    data: fetch.data,
    status: fetch.status,
    refresh: fetch.refresh,
    fetch,
    deleteKeepList,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useTasksStrore, import.meta.hot));
}

function uuidv4() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (
      +c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
    ).toString(16)
  );
}

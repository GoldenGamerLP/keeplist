import { z } from "zod";

const deleteBoardValidator = z.object({
  boardId: z.string().min(1),
});

const existRouteValidator = z.object({
  email: z.string().email(),
});

const loginRouteValidator = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerRouteValidator = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(25),
  displayname: z.string().min(1).max(25),
});

const createTaskValidator = z.object({
  boardId: z.string().min(1),
  collectionId: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
});

const createCollectionValidator = z.object({
  boardId: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  color: z.string(),
});

const moveTaskValidator = z.object({
  boardId: z.string().min(1),
  taskId: z.string().min(1),
  collectionId: z.string().min(1),
  newCollectionId: z.string().min(1),
  oldIndex: z.number().min(-1),
  newIndex: z.number().min(-1),
});

const moveCollectionValidator = z.object({
  boardId: z.string().min(1),
  collectionId: z.string().min(1),
  oldIndex: z.number().min(-1),
  newIndex: z.number().min(-1),
});

const editTaskBoardValidator = z.object({
  boardId: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  color: z.string(),
  tags: z.array(z.string()),
});

const editTaskValidator = z.object({
  boardId: z.string().min(1),
  collectionId: z.string().min(1),
  task: z.object({
    title: z.string().min(1),
    description: z.string(),
    id: z.string().min(1),
  }),
});

const editCollectionValidator = z.object({
  boardId: z.string().min(1),
  collectionId: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  color: z.string(),
});

const deleteCollectionValidator = z.object({
  boardId: z.string().min(1),
  collectionId: z.string().min(1),
});

const deleteTaskValidator = z.object({
  boardId: z.string().min(1),
  collectionId: z.string().min(1),
  taskId: z.string().min(1),
});

const createNewTaskBoardValidator = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  color: z.string().min(1),
  tags: z.array(z.string()),
});

const lookupUserValidator = z.object({
  ids: z.array(z.string()),
});

const updateCollaboratorsValidator = z.object({
  boardId: z.string().min(1),
  collaborators: z.array(z.string()),
});

const createTodoValidator = z.object({
  listId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(""),
  completed: z.boolean().default(false),
  important: z.boolean().default(false),
  until: z.coerce.date().optional(),
});

const toggleTodoValidator = z.object({
  completed: z.boolean(),
  todoId: z.string().min(1),
  listId: z.string().min(1),
});

const removeTodoValidator = z.object({
  todoId: z.string().min(1),
  listId: z.string().min(1),
});

export {
  removeTodoValidator,
  toggleTodoValidator,
  createTodoValidator,
  updateCollaboratorsValidator,
  registerRouteValidator,
  lookupUserValidator,
  createNewTaskBoardValidator,
  deleteCollectionValidator,
  deleteTaskValidator,
  editCollectionValidator,
  editTaskValidator,
  existRouteValidator,
  loginRouteValidator,
  createTaskValidator,
  createCollectionValidator,
  moveTaskValidator,
  moveCollectionValidator,
  editTaskBoardValidator,
  deleteBoardValidator,
};

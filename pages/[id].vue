<template>
    <div>
        <TaskBoardStatusDisplay :fetch-status="fetchStatus" :error="computedFetchError" :sse-status="sseStatus" />
        <div v-if="fetchStatus === 'success' && sseStatus === 'OPEN' && data"
            class="h-screen w-screen flex flex-col overflow-hidden">
            <header class="flex rounded-md bg-card text-card-foreground p-2 m-1 border">
                <div class="flex flex-row">
                    <Icon name="bx:bx-chevron-left" class="size-8 text-foreground cursor-pointer"
                        @click="$router.back()"></Icon>
                    <div>
                        <h1 class="text-2xl flex flex-row items-center">
                            <Icon name="bx:bx-collection" class="size-7 mr-1" :style="{ 'color': data.color }"></Icon>
                            {{ data.title }}
                        </h1>
                        <p class="text-sm">{{ data.description || "Keine Beschreibung" }}</p>
                    </div>
                    <Button size="icon" variant="ghost" @click="locModal?.open(data)">
                        <Icon name="mdi:square-edit-outline" class="size-6"></Icon>
                    </Button>
                </div>
                <div class="flex items-center ml-auto">
                    <Avatar v-for="user in syncedUsers?.users" class="ring-foreground ring-2 size-11 -ml-3"
                        :title="user.mail" :key="user._id">
                        <AvatarFallback>
                            {{ user.mail.charAt(0).toUpperCase() }}
                        </AvatarFallback>
                    </Avatar>
                    <Button variant="ghost" size="icon" @click="userHandlerModal?.open()">
                        <Icon name="bx:user-plus" class="size-6"></Icon>
                    </Button>
                </div>
            </header>
            <main class="overflow-auto flex-grow relative ml-2">
                <NumberField class="fixed bottom-6 right-6 z-10" @update:model-value="changeZoom" :default-value="zoom"
                    :step="10" :max="200" :min="50">
                    <NumberFieldContent>
                        <NumberFieldDecrement />
                        <NumberFieldInput />
                        <NumberFieldIncrement />
                    </NumberFieldContent>
                </NumberField>
                <draggable v-model="data.collection" ghost-class="opacity-70" group="'collections'" item-key="id"
                    class="flex flex-row mt-4 gap-4" @end="onMoveCollection" handle=".colhandle" ref="board"
                    :style="{ 'zoom': `${zoom}%` }">
                    <template #item="{ element: collection }">
                        <article
                            class="rounded-md p-1 w-[90vw] md:w-72 lg:w-96 flex-none shadow bg-card text-card-foreground"
                            :class="{ 'bg-dynamic-gradient': collection.color }" :key="collection.id"
                            :style="{ '--collection-color': collection.color }" :data-colid="collection.id">
                            <div
                                class="rounded-sm p-2 bg-muted/80 shadow-md w-full flex flex-row items-center sticky top-2 mb-2">
                                <Icon name="radix-icons:drag-handle-dots-2"
                                    class="size-6 -ml-2 cursor-move text-muted-foreground colhandle flex-none">
                                </Icon>
                                <div>
                                    <h2 class="text-lg font-semibold items-center mr-4">
                                        {{ collection.title }}
                                    </h2>
                                    <p class="text-sm text-muted-foreground font-semibold">{{ collection.description }}
                                    </p>
                                </div>
                                <Button variant="ghost" size="icon" @click="cceModal?.open(collection)" class="ml-auto">
                                    <Icon name="mdi:playlist-edit" class="size-6 ml-2"></Icon>
                                </Button>
                            </div>
                            <draggable v-model="collection.tasks" tag="ol" @end="onMoveTask" ghost-class="opacity-70"
                                group="'tasks'" item-key="id" v-auto-animate :id="collection.id" handle=".taskhandle"
                                class="space-y-2">
                                <template #item="{ element: task }">
                                    <li :key="task.id" :data-taskid="task.id"
                                        class="bg-accent/80 rounded-md p-2 flex flex-row items-center ms-3 shadow">
                                        <Icon name="radix-icons:drag-handle-dots-2"
                                            class="size-6 -ml-2 mt-1 cursor-move text-muted-foreground taskhandle flex-none">
                                        </Icon>
                                        <div>
                                            <h3 class="text-base font-medium">{{ task.title }}</h3>
                                            <p class="text-sm text-gray-400">{{ task.description }}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" @click="eceModal?.open(collection.id, task)"
                                            class="ml-auto">
                                            <Icon name="mdi:square-edit-outline" class="size-5"></Icon>
                                        </Button>
                                    </li>
                                </template>
                                <template #footer>
                                    <li @click.prevent="eceModal?.open(collection.id)">
                                        <Button variant="ghost" size="icon" class="w-full">
                                            <Icon name="mdi:playlist-plus" class="size-5 mr-2"></Icon>
                                            Füge einen neuen Eintrag hinzu
                                        </Button>
                                    </li>
                                </template>
                            </draggable>
                        </article>
                    </template>
                    <template #footer>
                        <Card class="flex-none">
                            <CardHeader>
                                <CardTitle>
                                    Erstelle Sammlung
                                </CardTitle>
                                <CardDescription>
                                    Füge eine neue Sammlung hinzu
                                </CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <Button variant="secondary" @click="cceModal?.open()" class="w-full">
                                    <Icon name="mdi:playlist-plus" class="size-5 mr-2"></Icon>
                                    Neue Sammlung
                                </Button>
                            </CardFooter>
                        </Card>
                    </template>
                </draggable>
            </main>
            <UserHandler ref="userHandlerModal" :task-board="data" @save="updateCollaborators"></UserHandler>
            <ListCreateEditModal ref="locModal" @save="editTaskBoard" @delete="deleteBoard"></ListCreateEditModal>
            <CollectionCreateEditModal ref="cceModal" @save="collectionCreateEdit" @delete="deleteCol">
            </CollectionCreateEditModal>
            <EntryCreateEditModal ref="eceModal" @save="entryCreateEdit" @delete="deleteEntry"></EntryCreateEditModal>
        </div>
    </div>
</template>

<script lang="ts" setup>
import draggable from 'vuedraggable'
import EntryCreateEditModal from '~/components/taskcards/EntryCreateEditModal.vue';
import ListCreateEditModal from '~/components/taskcards/ListCreateEditModal.vue';
import UserHandler from '~/components/taskcards/UserHandler.vue';
import CollectionCreateEditModal from '~/components/taskcards/CollectionCreateEditModal.vue';
import TaskBoardStatusDisplay from '../components/taskcards/TaskBoardStatusDisplay.vue'
import { useTaskBoard } from '~/composable/useTaskBoard';

const locModal = ref<InstanceType<typeof ListCreateEditModal>>();
const eceModal = ref<InstanceType<typeof EntryCreateEditModal>>();
const cceModal = ref<InstanceType<typeof CollectionCreateEditModal>>();
const userHandlerModal = ref<InstanceType<typeof UserHandler>>();
const board = ref<HTMLElement | null>(null);
const zoom = useCookie<number>("taskboard-zoom", { default: () => 100 });

const { createTask, createCollection, editTaskBoard, editTask, editCollection, deleteTask, deleteCollection, updateCollaborators, data, fetch, onMoveCollection, onMoveTask, syncedUsers, sseStatus, fetchStatus, deleteBoard } = useTaskBoard();

useHead({
    titleTemplate: "%s | KeepList",
    title() {
        return data.value?.title || "Laden...";
    },
    meta: [
        {
            name: "description",
            content: "Ein Taskboard, um Aufgaben zu verwalten."
        }
    ]
});

const deleteCol = (collectionId: string) => {
    deleteCollection({ collectionId });
}

const deleteEntry = (data: { collectionId: string, taskId: string }) => {
    deleteTask(data);
}

/**
 * Handles the creation or editing of a collection based on the presence of an ID.
 *
 * @param {Object} data - The collection data.
 * @param {string} data.title - The title of the collection.
 * @param {string} data.description - The description of the collection.
 * @param {string} data.color - The color of the collection.
 * @param {string} [data.id] - The optional ID of the collection. If provided, the collection will be edited; otherwise, a new collection will be created.
 */
const collectionCreateEdit = (data: { title: string; description: string; color: string; id?: string }) => {
    if (data.id) {
        editCollection({ collectionId: data.id, title: data.title, description: data.description, color: data.color });
    } else {
        createCollection(data.title, data.description, data.color);
    }
}

/**
 * Creates or edits a task based on the provided data.
 *
 * @param {Object} data - The data for the task.
 * @param {string} data.title - The title of the task.
 * @param {string} data.description - The description of the task.
 * @param {string} data.collectionId - The ID of the collection to which the task belongs.
 * @param {string} [data.taskId] - The optional ID of the task to edit. If provided, the task will be edited; otherwise, a new task will be created.
 */
const entryCreateEdit = (data: { title: string; description: string; collectionId: string; taskId?: string }) => {
    if (data.taskId) {
        editTask({ task: { title: data.title, description: data.description, id: data.taskId }, collectionId: data.collectionId });
    } else {
        createTask(data.title, data.description, data.collectionId);
    }
}

const computedFetchError = computed(() => {
    //Return only the statuscode and statusText
    const error = fetch.error.value;
    return error ? `${error.status} ${error.statusText}` : '';
});

const changeZoom = (value: number) => {
    if (!value) return;
    zoom.value = value;
}
</script>

<style scoped>
.bg-dynamic-gradient {
    --tailwind-bg-color: rgba(228, 228, 231, 0.1);

    background: -webkit-linear-gradient(180deg, var(--collection-color) 20%, var(--tailwind-bg-color) 80%);
    background: linear-gradient(180deg, var(--collection-color) 20%, var(--tailwind-bg-color) 80%);
}
</style>
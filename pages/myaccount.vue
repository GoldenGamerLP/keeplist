<template>
    <div class="flex flex-col m-2">
        <div class="flex flex-col md:flex-row md:justify-between justify-normal md:space-y-0 space-y-2">
            <div class="flex items-center gap-2">
                <Icon name="lucide:list-plus" class="size-10 text-primary flex-none" />
                <div>
                    <h1 class="text-2xl font-semibold">KeepList</h1>
                    <p class="text-xs">Willkommen zurück, {{ user?.displayname }}!</p>
                </div>
                <Popover>
                    <PopoverTrigger class="md:hidden block ml-auto">
                        <Avatar>
                            <AvatarFallback>
                                <Icon name="mdi:account" class="size-8 text-muted-foreground" />
                            </AvatarFallback>
                        </Avatar>
                        <Icon name="mdi:chevron-down" class="size-5 text-muted-foreground" />
                    </PopoverTrigger>
                    <PopoverContent class="space-y-2">
                        Benutzer: {{ user?.displayname }}
                        <Separator orientation="horizontal" />
                        <ColorMode />
                        <Button class="w-full" variant="outline" @click="logOut">
                            <Icon name="mdi:account" class="mr-2 size-5" />
                            Logge dich aus
                        </Button>
                    </PopoverContent>
                </Popover>
            </div>
            <div class="relative w-full md:max-w-sm items-center flex flex-nowrap">
                <Input id="search" type="text" placeholder="Suche nach (Keep) Listen..." class="pl-10"
                    v-model="search" />
                <span class="absolute start-0 inset-y-0 flex items-center justify-center px-2">
                    <Icon name="mdi:cloud-search-outline" class="size-5 text-muted-foreground" />
                </span>
                <Button size="icon" variant="secondary" class="ml-2 flex-none">
                    <Icon name="mdi:playlist-plus" class=" size-5" @click="createTaskboard!.open();" />
                </Button>
            </div>
            <Popover>
                <PopoverTrigger class="md:block hidden">
                    <Avatar>
                        <AvatarFallback>
                            <Icon name="mdi:account" class="size-8 text-muted-foreground" />
                        </AvatarFallback>
                    </Avatar>
                    <Icon name="mdi:chevron-down" class="size-5 text-muted-foreground mb-1" />
                </PopoverTrigger>
                <PopoverContent class="space-y-2">
                    Benutzer: {{ user?.displayname }}
                    <Separator orientation="horizontal" />
                    <ColorMode />
                    <Button class="w-full" variant="outline" @click="logOut">
                        <Icon name="mdi:account" class="mr-2 size-5" />
                        Logge dich aus
                    </Button>
                </PopoverContent>
            </Popover>
        </div>
        <div v-if="fetch.status.value === 'pending'" class="flex flex-col mt-4">
            <Icon name="mdi:loading" class="size-10 text-primary animate-spin" />
        </div>
        <div v-else-if="fetch.data.value">
            <ul class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2" v-auto-animate>
                <li v-for="task in ownFilteredItems" :key="task._id">
                    <TaskPreviewCard :task="task" :loading="isLoading" @clickcard="onClickCard" />
                </li>
                <li v-if="ownFilteredItems.length === 0">
                    <Card>
                        <CardHeader>
                            <CardTitle class="flex items-center">
                                <Icon name="mdi:cloud-question" class="size-8 text-muted-foreground mr-2" />
                                Keine listen vorhanden
                            </CardTitle>
                            <CardDescription>
                                Erstelle eine neue Liste oder warte bis dir jemand eine teilt.
                            </CardDescription>
                        </CardHeader>
                        <CardFooter>
                            <Button @click="createTaskboard!.open()">Create Taskcard</Button>
                        </CardFooter>
                    </Card>
                </li>
            </ul>
            <Separator label="Mit dir geteilte Listen" class="my-4" />
            <ul class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                <li v-for="task in sharedFilteredItems" :key="task._id">
                    <TaskPreviewCard :task="task" :loading="isLoading" @clickcard="onClickCard" />
                </li>
            </ul>
        </div>
        <CreateTaskboard ref="createTaskboard" @save="saveBoard" />
    </div>
</template>

<script lang="ts" setup>
import type { TaskCardPreview } from "@/server/utils/taskBoardUtils";
import TaskPreviewCard from "~/components/taskcards/TaskPreviewCard.vue";
import CreateTaskboard from "~/components/taskcards/ListCreateEditModal.vue";
import { useToast } from '~/components/ui/toast';
import { useTasksStrore } from "~/store/tasks";
import { useUser } from "~/composable/auth";
const user = useUser();

const createTaskboard = ref<InstanceType<typeof CreateTaskboard>>();
const { toast } = useToast();
const tasksStore = useTasksStrore();

const fetch = await useFetch("/api/v1/tasks/taskcards", {
    headers: {
        "Content-Type": "application/json",
    },
    method: "GET",
    pick: ["own", "shared"],
    lazy: true,
});

const search = ref("");
const isLoading = ref(false);

const ownFilteredItems = computed(() => {
    const data = fetch.data.value;
    if (!data) return [];
    return data.own.filter(isMatching);
});

const sharedFilteredItems = computed(() => {
    const data = fetch.data.value;
    if (!data || data === undefined) return [];
    return data.shared.filter(isMatching);
});

const isMatching = (item: TaskCardPreview) => {
    return item.title.toLowerCase().includes(search.value.toLowerCase())
        || item.description.toLowerCase().includes(search.value.toLowerCase())
        || item.tags.some((tag: string) => tag.toLowerCase().includes(search.value.toLowerCase()));
};

const onClickCard = (loading: boolean) => {
    isLoading.value = loading;
};

const saveBoard = async (event: { title: string, description: string, color: string, tags: string[] }) => {
    try {
        const res = await tasksStore.createBoard(event.title, event.description, event.color, event.tags);

        if (res) {
            toast({ title: "Taskboard created", description: "The taskboard was created successfully" })
        } else {
            toast({ title: "An error occured", description: "An error occured while creating the taskboard", variant: "destructive" });
        }
    } catch (error: Error | any) {
        toast({ title: "An error occured", description: "An error occured while creating the taskboard: " + error, variant: "destructive" });
    }

    fetch.refresh();
};

const logOut = async () => {
    await $fetch('/api/v1/auth/actions/logout');
    window.location.href = '/';
}
</script>
<template>
    <Modal v-model="isOpen" @close="close">
        <template #title>
            Bearbeite Mitwirkende
        </template>
        <form @submit.prevent="save">
            <SuggestUserTags :suggestItems="onQuery" :selected="selectedUsers" @select="addCollaborator"
                placeholder="Search for collaborators..." class="mb-4"
                aria-label="Search for users to add as collaborators">
                <template #item="{ item, selected }">
                    <span class="flex items-center p-1 hover:bg-accent"
                        :class="{ 'opacity-60 cursor-not-allowed': selected }" :aria-disabled="selected">
                        <Avatar class="mr-2">
                            <AvatarFallback>
                                {{ item.mail.charAt(0).toUpperCase() }}
                            </AvatarFallback>
                        </Avatar>
                        <div class="flex flex-col">
                            <span>{{ item.displayname }}</span>
                            <small class="text-muted-foreground">{{ item.mail }}</small>
                        </div>
                        <Icon name="bx:add-to-queue" class="size-5 ml-auto text-green-300/80 mr-2" aria-hidden="true" />
                    </span>
                </template>
                <template #nothingfound>
                    <span class="p-2 text-center text-muted-foreground">
                        Keine Personen gefunden, gebe mindestens drei Buchstaben an.
                    </span>
                </template>
            </SuggestUserTags>

            <h2 class="text-lg mt-4">Mitwirkende</h2>
            <ol v-auto-animate>
                <li v-for="(id, index) in collaboratorIds" :key="id"
                    class="p-2 flex items-center bg-card first:rounded-t-md last:rounded-b-md">
                    <div v-if="getUserById(id)" class="flex items-center w-full">
                        <Avatar>
                            <AvatarFallback>
                                {{ getUserById(id).mail.charAt(0).toUpperCase() }}
                            </AvatarFallback>
                        </Avatar>
                        <div class="ml-2">
                            <h3>
                                {{ getUserById(id).displayname }}
                                <span v-if="isCurrentUser(id)"> (Du)</span>
                            </h3>
                            <p class="text-muted-foreground">
                                {{ utils.shortenTextInMiddle(getUserById(id).mail) }}
                            </p>
                        </div>
                        <Button class="ml-auto" :disabled="isCurrentUser(id)"
                            @click.stop.prevent="removeCollaborator(id)" variant="destructive" size="icon"
                            aria-label="Remove collaborator">
                            <Icon name="bx:bx-x" class="size-5" aria-hidden="true" />
                        </Button>
                    </div>
                </li>
                <li v-if="!collaboratorIds.length" class="text-muted-foreground text-center">
                    Keine Mitwirkende hinzugefügt.
                </li>
            </ol>
            <Button type="submit" class="mt-2 w-full" aria-label="Speichern">
                Speichern
            </Button>
        </form>
    </Modal>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { useUser } from '~/composable/auth';
import { useUtils } from '~/composable/useUtils';
import SuggestUserTags from '../system/SuggestUserTags.vue';

const props = defineProps<{
    taskBoard: FetchReadyTaskBoard;
}>();

const isOpen = ref(false);
const collaboratorIds = ref<string[]>([]);
const crrUser = useUser();
const utils = useUtils();
const emits = defineEmits(['save']);

const selectedUsers = computed(() => {
    return [...collaboratorIds.value, props.taskBoard.author];
});

const getUserById = (id: string) => {
    return props.taskBoard.userlookup[id] || { mail: 'Unknown User' };
};

const isCurrentUser = (id: string) => {
    return crrUser.value?.id === id;
};

const addCollaborator = (user: SafeUser) => {
    if (!collaboratorIds.value.includes(user._id)) {
        props.taskBoard.userlookup[user._id] = user;
        collaboratorIds.value.push(user._id);
    }
};

const removeCollaborator = (id: string) => {
    collaboratorIds.value = collaboratorIds.value.filter((userId) => userId !== id);
};

const onQuery = (query: string) => {
    if (query.length >= 3) {
        try {
            return $fetch(`/api/v1/tasks/finduser?id=${query}`);
        }
        catch (error) {
            console.error(error);
        }
    }

    return Promise.resolve([]) as Promise<SafeUser[]>;
};

const save = () => {
    emits('save', collaboratorIds.value);
    collaboratorIds.value = [];
    isOpen.value = false;
};

const close = () => {
    collaboratorIds.value = [];
    isOpen.value = false;
};

watch(
    () => props.taskBoard.collaborators,
    (newCollaborators) => {
        collaboratorIds.value = newCollaborators || [];
    },
    { immediate: true }
);

defineExpose({ open: () => (isOpen.value = true) });
</script>
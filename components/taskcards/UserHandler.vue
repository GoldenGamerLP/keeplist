<template>
    <Modal v-model="isOpen" @close="close">
        <template #title>
            Bearbeite Mitwirkende
        </template>
        <template #default>
            <form @submit.prevent="save">
                <SuggestUserTags :suggestItems="onQuery" :selected="selectedUsers" @select="pickPerson"
                    placeholder="Search for collabs..." class="mb-4">
                    <template #item="{ item, selected }">
                        <span class="flex items-center p-1 hover:bg-accent"
                            :class="{ 'opacity-60 cursor-not-allowed': selected }">
                            <Avatar class="mr-2">
                                <AvatarFallback>
                                    {{ item.mail.charAt(0).toUpperCase() }}
                                </AvatarFallback>
                            </Avatar>
                            <div class="flex flex-col">
                                <span>{{ item.mail }}</span>
                                <small class="text-muted-foreground">{{ item.mail }}</small>
                            </div>
                            <Icon name="bx:add-to-queue" class="size-5 ml-auto text-green-300/80 mr-2 cursor-pointer" />
                        </span>
                    </template>
                    <template #nothingfound>
                        <span class="p-2 text-center text-muted-foreground">Keine Personen gefunden, gebe mindestens drei Buchstaben an.</span>
                    </template>
                </SuggestUserTags>
                <h2 class="text-lg mt-4">Mitwirkende</h2>
                <ol v-auto-animate>
                    <li v-for="(id, index) in ids" :key="id" :class="[
                        'p-2 flex flex-row items-center bg-card first:rounded-t-md last:rounded-b-md',
                        index !== ids.length - 1 && ids.length > 2 ? 'border-b' : ''
                    ]">
                        <template v-if="lookup(id)">
                            <Avatar>
                                <AvatarFallback>
                                    {{ lookup(id).mail.charAt(0).toUpperCase() }}
                                </AvatarFallback>
                            </Avatar>
                            <div class="ml-2">
                                <h3>{{ lookup(id).displayname }} {{ isSelf(id) ? "(Du)" : "" }}</h3>
                                <p class="text-muted-foreground">{{ utils.shortenTextInMiddle(lookup(id).mail) }}</p>
                            </div>
                            <div class="ml-auto">
                                <Button :disabled="isSelf(id)" @click.stop.prevent="removePerson(id)"
                                    variant="destructive" size="icon">
                                    <Icon name="bx:bx-x" class="size-5" />
                                </Button>
                            </div>
                        </template>
                    </li>
                    <li v-if="!selectedUsers.length" class="text-muted-foreground text-center">Keine Mitwirkende hinzugefügt.</li>
                </ol>
                <Button type="submit" class="mt-2 w-full">Speichern</Button>
            </form>
        </template>
    </Modal>
</template>

<script lang="ts" setup>
import type { FetchReadyTaskBoard } from '~/server/utils/taskBoardUtils.js';
import { useUser } from '~/composable/auth';
import SuggestUserTags from '../system/SuggestUserTags.vue';
import { useUtils } from '~/composable/useUtils';

const utils = useUtils();
const crrUser = useUser();
let changed = false;
const props = defineProps<{
    taskBoard: FetchReadyTaskBoard;
}>();

function onQuery(query: string) {
    return $fetch(`/api/v1/tasks/finduser?id=${query}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
}

const isOpen = ref(false);
const emits = defineEmits(['save']);

const ids = ref<string[]>([]);

watch(() => props.taskBoard.collaborators, (collabs) => {
    ids.value = collabs;
}, { immediate: true });

const lookupUser = (id: string) => {
    return props.taskBoard.userlookup[id];
}

const isSelf = (id: string) => {
    return crrUser.value?.id === id;
}

const open = () => {
    isOpen.value = true;
}

const lookup = (id: string) => {
    return props.taskBoard.userlookup[id] ?? { mail: 'Unknown User' };
}

const pickPerson = (id: SafeUser) => {
    changed = true;
    props.taskBoard.userlookup[id._id] = id;
    ids.value = [...ids.value, id._id];
}

const removePerson = (id: string) => {
    ids.value = ids.value.filter((i) => i !== id);
}

const selectedUsers = computed(() => {
    return [...ids.value, props.taskBoard.author];
});

const save = () => {
    //Check if the list has changed
    if (changed) {
        emits('save', ids.value);
    }

    ids.value = [];
    isOpen.value = false;
}

const close = () => {
    ids.value = [];
    isOpen.value = false;
}

defineExpose({ open });
</script>
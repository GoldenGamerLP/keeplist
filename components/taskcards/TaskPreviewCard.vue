<template>
  <Card class="relative">
    <div class="absolute top-2 right-2">
      <div class="flex space-x-2">
        <Badge v-for="user in checkedUsers" :key="user._id" variant="outline" :size="'large'"
          :class="{ 'text-muted-foreground': !user.isOnline }"
          :title="`Benutzer ${user.displayname} ist ${user.isOnline ? 'Online' : 'nicht Online'}.`">
          <Icon v-if="user.isOnline" icon="mdi:circle" class="size-3 text-emerald-600 mr-1 animate-pulse" />
          {{ user.displayname }}
        </Badge>
      </div>
    </div>
    <CardHeader>
      <CardTitle>{{ props.task.title }}</CardTitle>
      <CardDescription>{{ props.task.description }}</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="flex space-x-2">
        <Badge v-for="tag in props.task.tags" :key="tag" :variant="'destructive'" :size="'large'">{{ tag }}</Badge>
      </div>
    </CardContent>
    <CardFooter class="block">
      <p class="text-sm text-muted-foreground" v-if="props.task.lastUpdated">
        <Icon icon="material-symbols:update-rounded" class="inline-block mr-1 size-5" />
        Last updated: {{ useTimeAgo(props.task.lastUpdated) }}
      </p>
      <p class="text-sm text-muted-foreground">
        <Icon icon="material-symbols:create-new-folder-outline-sharp" class="inline-block mr-1 size-5" />
        Erstellt am: {{ createAt }}
      </p>
      <p class="text-sm text-muted-foreground">
        <Icon icon="material-symbols:person-edit-outline" class="inline-block mr-1 size-5" />
        Autor: {{ props.task.author_details[0].displayname }} ({{
          shortenTextInMiddle(props.task.author_details[0].mail) }})
      </p>
      <p class="text-sm text-muted-foreground">
        <Icon icon="material-symbols:person-pin-outline" class="inline-block mr-1 size-5" />
        Mitwirkende: {{ props.task.collaborator_details.map((user) => `${user.displayname}
        (${shortenTextInMiddle(user.mail)})`).join(", ") || "Keine" }}
      </p>
      <NuxtLink :to="`/${props.task._id.toString()}`">
        <Button @click="onClickCard" :loading="props.loading || cardClicked" class="mt-2 w-full" variant="secondary"
          :shiny="task.activeStatistics.clientCount != 0" @hover="preload">
          <Icon icon="mdi:arrow-right" class="size-5" />
          Öffnen
        </Button>
      </NuxtLink>
    </CardFooter>
  </Card>
</template>

<script lang="ts" setup>
import type { TaskCardPreview } from '~/server/utils/taskBoardUtils';
import type { SafeUser } from '~/server/utils/authUtils';
import { useTimeAgo, useDateFormat } from '@vueuse/core';
import { Icon } from '@iconify/vue';

const emits = defineEmits(['clickcard']);
const cardClicked = ref(false);

const props = defineProps<{
  task: TaskCardPreview;
  loading: boolean;
}>();

const preload = () => {
  preloadRouteComponents("/" + props.task._id.toString());
}

const createAt = useDateFormat(props.task.createdAt, "DD.MM.YYYY HH:mm");

const onClickCard = () => {
  if (!props.loading) {
    emits('clickcard', true);
    cardClicked.value = true;
  }
}

const checkedUsers = computed(() => {
  const users = [...props.task.collaborator_details, ...props.task.author_details];
  const activeUsers = props.task.activeStatistics.users;

  return users.map((user: SafeUser) => {
    return {
      ...user,
      isOnline: activeUsers.filter((u: SafeUser) => u._id === user._id).length > 0,
    }
  });
});

const shortenTextInMiddle = (text: string) => {
  // Shorten the text in the middle, max text length is 10
  const length = text.length;
  const removingFactor = Math.max(0, length - 14) / 2;
  const removeStart = Math.floor(length / 2) - removingFactor;
  const removeEnd = Math.floor(length / 2) + removingFactor;

  return text.substring(0, removeStart) + '...' + text.substring(removeEnd);
}
</script>
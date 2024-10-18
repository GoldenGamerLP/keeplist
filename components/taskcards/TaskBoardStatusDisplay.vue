<template>
	<div v-if="fetchStatus === 'error' || sseStatus === 'CLOSED'" class="min-h-screen flex items-center justify-center w-screen">
		<div class="flex flex-col items-center justify-center h-full bg-card rounded-md text-card-foreground p-6 relative">
			<Icon name="mdi:flash-triangle" class="size-12 text-destructive absolute -top-6 right-[50%] translate-x-[50%]"></Icon>
			<h2 class="text-2xl">Ups... ein Fehler</h2>
			<p class="text-lg max-w-sm text-center">Diese KeepListe wurde nicht gefunden oder du bist nicht eingeladen!</p>
			<Button icon="bx:x" @click="$router.back()" variant="secondary" class="mt-4 w-full">Zurück</Button>
		</div>
	</div>
	<div v-else-if="fetchStatus !== 'success'" class="min-h-screen flex items-center justify-center w-screen">
		<div class="flex flex-col items-center justify-center h-full">
			<SystemCubeLoader />
			<p>Laden...</p>
			<Button icon="bx:x" @click="$router.back()" variant="secondary" class="mt-4 w-full">Zurück</Button>
		</div>
	</div>
	<div v-else-if="sseStatus === 'CONNECTING'" class="min-h-screen flex items-center justify-center w-screen">
		<div class="flex flex-col items-center justify-center h-full">
			<SystemCubeLoader />
			<p>Verbinden...</p>
			<Button icon="bx:x" @click="$router.back()" variant="secondary" class="mt-4 w-full">Zurück</Button>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { AsyncDataRequestStatus } from '#app';
import type { EventSourceStatus } from '@vueuse/core';

defineProps<{
	error: string,
	fetchStatus: AsyncDataRequestStatus,
	sseStatus: EventSourceStatus
}>()
</script>

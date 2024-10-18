<template>
    <div class="h-screen flex flex-col justify-between items-center">
        <header class="max-w-sm mt-32">
            <Icon name="lucide:list-plus" class="animate-bounce" size="50" />
            <h1 class="text-2xl font-bold text-primary">KeepList</h1>
            <p class="text-lg max-w-sm">Halte listen fest und teile sie mit anderen!</p>
        </header>
        <footer class="mx-2 w-full mb-2 space-y-2 max-w-sm sm:max-w-md">
            <NuxtLink to="/authentication" class="w-full">
                <Button class="w-full">
                    <Icon name="mdi:login-variant" class="mr-2 size-5" />
                    Registrieren
                </Button>
            </NuxtLink>
        </footer>
    </div>
</template>

<script lang="ts" setup>
useHead({
    meta: [
        { name: 'description', content: 'Halte listen fest und teile sie mit anderen!' },
        { name: 'theme-color', content: '#2aaa59' },
        { name: 'publisher', content: 'KeepList' },
    ],
});
</script>
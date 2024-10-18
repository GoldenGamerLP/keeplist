<template>
    <Modal v-model="isOpen" @close="close">
        <template #title>
            Editiere oder erstelle einen Eintrag
        </template>
        <template #default>
            <AutoForm :schema="schema" @submit="save" :form="form">
                <Button type="submit" class="mt-4 w-full">
                    {{ context ? 'Ändere deinen Eintrag!' : 'Erstelle deinen neuen Eintrag!' }}
                </Button>
            </AutoForm>
            <Button @click="deleteEntry" class="mt-4 w-full" variant="destructive" :disabled="!context">Lösche deinen Eintrag</Button>
        </template>
    </Modal>
</template>

<script lang="ts" setup>
import * as zod from 'zod';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';

const emits = defineEmits(['save', 'delete']);

const schema = zod.object({
    title: zod.string().min(3).max(22).describe('Title von deines Eintrags'),
    description: zod.string().describe('Beschreibung deines Eintrags').min(3).max(255),
});

const form = useForm({
  validationSchema: toTypedSchema(schema),
})

const isOpen = ref(false);
const context = ref({});

const deleteEntry = () => {
    emits('delete', context.value);
    isOpen.value = false;
}

const open = (collectionId: string, task?: Task) => {
    isOpen.value = true;
    context.value = { collectionId, taskId: task?.id };

    if(task) {
        form.setValues(task);
    }
}

const close = () => {
    isOpen.value = false;
    context.value = {};
}

const save = (data: Record<string,string>) => {
    emits('save', { ...data, ...context.value });

    isOpen.value = false;
}

defineExpose({ open });
</script>
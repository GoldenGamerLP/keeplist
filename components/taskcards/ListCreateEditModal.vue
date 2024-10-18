<template>
    <Modal v-model="isOpen" @close="close">
        <template #title>
            Erstelle oder bearbeite deine KeepListe
        </template>
        <template #default>
            <AutoForm :schema="schema" @submit="save" :field-config="{ color: { inputProps: { type: 'color' } } }" :form="form">
                <template #color="slotProps">
                    <div class="flex gap-2 items-end">
                        <AutoFormField v-bind="slotProps" class="w-full" />
                        <Button size="icon" @click.stop="slotProps.config.inputProps.value = utils.generateRandomColor()">
                            <Icon name="mdi:shuffle" class="size-5" />
                        </Button>
                    </div>
                </template>

                <Button type="submit" class="mt-4 w-full">
                    {{ context ? 'Ändere deine KeepListe!' : 'Erstelle deine neue KeepListe!' }}
                </Button>
            </AutoForm>
            <Button @click="deleteCollection" class="mt-4 w-full" variant="destructive" :v-if="!context">
                Lösche deine KeepListe
            </Button>
        </template>
    </Modal>
</template>

<script lang="ts" setup>
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { useUtils } from '~/composable/useUtils';
import * as zod from 'zod';
import type { FetchReadyTaskBoard } from '~/server/utils/taskBoardUtils';


const schema = zod.object({
    title: zod.string().min(3).max(255).describe('Titel deiner KeepListe'),
    description: zod.string().describe('Beschreibung deiner Liste').min(3).max(255),
    color: zod.string().describe('Die Farbe deiner Liste').default('#000000'),
    tags: zod.array(zod.string()).optional().default([]).describe('Tags für deine Liste'),
});

const form = useForm({
  validationSchema: toTypedSchema(schema),
})

const utils = useUtils();
const isOpen = ref(false);
const emits = defineEmits(['save', 'delete']);
const context = ref('');

const open = (board?: FetchReadyTaskBoard) => {
    isOpen.value = true;

    if (board) {
        form.setValues(board);

        context.value = board._id.toString();
    }
}

const close = () => {
    isOpen.value = false;
    context.value = '';
}

const deleteCollection = () => {
    emits('delete', context.value);
    isOpen.value = false;
}

const save = (data: Record<string, any>) => {
    emits('save', data);

    isOpen.value = false;
}

defineExpose({ open });
</script>
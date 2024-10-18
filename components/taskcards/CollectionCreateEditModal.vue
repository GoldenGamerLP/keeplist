<template>
    <Modal v-model="isOpen" @close="close">
        <template #title>
            Ändere oder erstelle eine Sammlung
        </template>
        <template #default>
            <AutoForm :schema="schema" @submit="save" :field-config="{ color: { inputProps: { type: 'color' } } }"
                :form="form">
                <template #color="slotProps">
                    <div class="flex gap-2 items-end">
                        <AutoFormField v-bind="slotProps" class="w-full" />
                        <Button size="icon"
                            @click.stop="slotProps.config.inputProps.value = utils.generateRandomColor()">
                            <Icon name="mdi:shuffle" class="size-5" />
                        </Button>
                    </div>
                </template>

                <Button type="submit" class="mt-4 w-full">
                    {{ context ? 'Ändere deine Sammlung!' : 'Erstelle deine neue Sammlung!' }}
                </Button>
            </AutoForm>
            <Button @click="deleteCollection" class="mt-4 w-full" variant="destructive" :disabled="!context">
                Lösche deine Sammlung
            </Button>
        </template>
    </Modal>
</template>

<script lang="ts" setup>
import { useUtils } from '~/composable/useUtils';
import * as zod from 'zod';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';

const schema = zod.object({
    title: zod.string().min(3).max(32).describe('Titel deiner Liste'),
    description: zod.string().describe('Beschreibung deiner Liste').min(3).max(255),
    color: zod.string().describe('Farbe deiner Liste').default('#000000'),
});

const form = useForm({
    validationSchema: toTypedSchema(schema),
})

const utils = useUtils();
const isOpen = ref(false);
const emits = defineEmits(['save', 'delete']);
const context = ref('');

const deleteCollection = () => {
    emits('delete', context.value);
    isOpen.value = false;
}

const open = (collection?: TaskCollection) => {
    isOpen.value = true;

    if (collection) {
        form.setValues(collection);
        context.value = collection.id;
    }
}

const close = () => {
    isOpen.value = false;
    context.value = '';
}

const save = (data: Record<string, string>) => {
    emits('save', { ...data, id: context.value });

    isOpen.value = false;
}

defineExpose({ open });
</script>
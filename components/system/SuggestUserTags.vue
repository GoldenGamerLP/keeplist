<template>
  <div class="flex items-center justify-center">
    <div class="relative w-full items-center" ref="datalist" @keydown.down="selectNext('down')"
      @keydown.up="selectNext('up')" @keydown.enter.prevent="enter" @focusin="open" @blur="close">
      <Input id="search" type="text" :placeholder="placeholder" class="pl-10 max-w-full" autocomplete="off"
        v-model="searchinput" autofocus="false" />
      <span class="absolute start-0 inset-y-0 flex items-center justify-center px-2">
        <Icon name="lucide:search-check" class="size-6 text-muted-foreground" />
      </span>
      <span class="absolute end-0 inset-y-0 flex items-center justify-center px-2"
        v-if="loadingItems || loadingAlrItems">
        <Icon name="bx:bx-loader-alt" class="size-6 text-muted-foreground animate-spin" />
      </span>
      <div class="w-full relative">
        <Transition name="suggesttransition">
          <div class="absolute top-1 left-0 w-full bg-background rounded-b-lg z-10 shadow-lg px-2 py-2"
            v-if="displaySearchDropdown">
            <ul ref="list">
              <li v-for="item in items" class="last:rounded-b rounded-none bg-card data-[selected=true]:outline"
                @click="click(item._id.toString())" :data-id="item._id">
                <slot name="item" v-bind:item="item" v-bind:selected="isInList(item._id)" />
              </li>
            </ul>
            <div class="bg-card rounded p-1" v-if="!items.length && !loadingItems">
              <slot name="nothingfound" />
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup generic="T extends {_id: number | string, [key: string]: unknown;}">
import { onClickOutside } from '@vueuse/core';

const emit = defineEmits(['select', 'close', 'open', 'query']);

const datalist = ref<HTMLElement | null>(null);
const list = ref<HTMLElement | null>(null);
const displaySearchDropdown = ref(false);
const searchinput = ref('');
const items = ref<T[]>([]) as Ref<T[]>;
const loadingItems = ref(false);
const loadingAlrItems = ref(false);

const props = defineProps<{ suggestItems: (query: string) => Promise<T[]>, placeholder: string }>();
const alrItems = defineModel<string[]>('selected', { required: false, default: [] });

watch(() => searchinput.value, async (query) => {
  if (loadingItems.value) return;
  if (!query) {
    items.value = [];
    return;
  }

  loadingItems.value = true;
  items.value = await props.suggestItems(query);
  loadingItems.value = false;
});


let selected = -1;
const selectNext = (direction: 'up' | 'down') => {
  if (!displaySearchDropdown.value) return;
  const items = list.value?.querySelectorAll('li');
  if (!items) return;

  if (direction === 'down') {
    selected = Math.min(selected + 1, items.length - 1);
  } else {
    selected = Math.max(selected - 1, 0);
  }

  items.forEach((item, index) => {
    item.dataset.selected = index === selected ? 'true' : 'false';
  });
};

const close = () => {
  displaySearchDropdown.value = false;

  emit('close');
};

const enter = () => {
  if (!displaySearchDropdown.value) return;
  const items = list.value?.querySelectorAll('li');
  if (!items) return;

  const selectedElement = items[selected];
  if (selectedElement) {
    click(selectedElement.dataset.id || '');
  }
};

onClickOutside(datalist, close);

const open = () => {
  displaySearchDropdown.value = true;

  emit('open');
};

const click = (id: string) => {
  if (isInList(id)) return;

  const item = items.value.find((item) => item._id === id);
  if (item) {
    emit('select', item);
  }

  searchinput.value = '';
  close();
};

const isInList = (id: number | string) => {
  return alrItems.value.includes(id.toString());
};
</script>

<style scoped>
.suggesttransition-enter-active,
.suggesttransition-leave-active {
  transform: translateY(0);
  transition: opacity 0.35s, transform 0.45s;
}

.suggesttransition-enter-from,
.suggesttransition-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>
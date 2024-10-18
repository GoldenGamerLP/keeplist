<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Primitive, type PrimitiveProps } from 'radix-vue'
import { type ButtonVariants, buttonVariants } from '.'
import { cn } from '@/lib/utils'

interface Props extends PrimitiveProps {
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: HTMLAttributes['class']
  shiny?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
})
</script>

<template>
  <Primitive :as="as" :as-child="asChild" :class="cn(buttonVariants({ variant, size }), props.class, 'relative')" :disabled="loading" :aria-busy="loading">
    <div class="absolute inset-0 bg-primary animation-sweep overflow-clip" v-if="shiny" />
    <slot v-if="!loading" />
    <Icon v-if="loading" name="mdi:loading" class="animate-spin mr-2" />
    <span v-if="loading">Eine Sekunde bitte...</span>
  </Primitive>
</template>


<style scoped>
.animation-sweep {
  background: linear-gradient(125deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.03) 1%, rgba(255, 255, 255, 0.4) 30%, rgba(255, 255, 255, 0.65) 50%, rgba(255, 255, 255, 0.85) 70%, rgba(255, 255, 255, 0.65) 71%, rgba(255, 255, 255, 0) 100%);
  animation: sweep 2s infinite linear both;
  animation-direction: reverse;
}

@keyframes sweep {
  0% {
    left: 0%;
    opacity: 0;
  }
  30% {
    left: 0%;
    opacity: 0.2;
  }
  60% {
    right: 0;
    opacity: 1;
  }
  100% {
    right: 100%;
    opacity: 0.2;
  }
}
</style>

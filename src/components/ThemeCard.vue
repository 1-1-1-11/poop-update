<template>
  <view class="theme-card" :class="[themeStore.themeClass, customClass]" @tap="$emit('click')">
    <slot></slot>
  </view>
</template>

<script setup lang="ts">
import { useThemeStore } from '../stores/theme'

defineProps<{
  customClass?: string
}>()

defineEmits(['click'])

const themeStore = useThemeStore()
</script>

<style lang="scss" scoped>
.theme-card {
  box-sizing: border-box;
  width: 100%;
  transition: all 0.3s ease;

  // Stock Theme: Bloomberg Terminal style (Flat dark grid layout)
  &.theme-stock {
    background-color: #161B22;
    border: 1rpx solid #30363D;
    border-radius: var(--radius-sm, 8rpx);
    box-shadow: none; // Eliminate box shadows
    padding: 32rpx;
  }

  // Lab Theme: LaTeX/Notion Document style (Minimalist, borderless, shadowless)
  &.theme-lab {
    background-color: transparent; // Make transparent to dissolve cards
    border: none;
    border-bottom: 2rpx solid #DEE2E6; // Rely on fine line divider
    border-radius: 0;
    box-shadow: none; // Completely remove card shadows
    padding: 32rpx 0; // Padding only on vertical to space sections
  }
}
</style>

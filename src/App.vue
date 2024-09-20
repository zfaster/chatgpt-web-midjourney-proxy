<script setup lang="ts">
import { NConfigProvider } from 'naive-ui'
import { NaiveProvider } from '@/components/common'
import { useTheme } from '@/hooks/useTheme'
import { useLanguage } from '@/hooks/useLanguage'
import {onMounted} from "vue";

const { theme, themeOverrides } = useTheme()
const { language } = useLanguage()
onMounted(() => {
	const script = document.createElement('script');
	script.src = "http://60.204.184.5:8080/api/application/embed?protocol=http&host=60.204.184.5:8080&token=4365f8178090b5e7";
	script.async = true;
	document.head.appendChild(script);
});
</script>

<template>
  <NConfigProvider
    class="h-full"
    :theme="theme"
    :theme-overrides="themeOverrides"
    :locale="language"
  >
    <NaiveProvider>
      <RouterView />
    </NaiveProvider>
  </NConfigProvider>
</template>

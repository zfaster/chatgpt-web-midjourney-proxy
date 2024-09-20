<script setup lang='ts'>
import type { CSSProperties } from 'vue'
import { computed, ref, watch } from 'vue'
import { NButton, NLayoutSider, useDialog } from 'naive-ui'
import List from './List.vue'
import Footer from './Footer.vue'
import { useAppStore, useChatStore } from '@/store'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { PromptStore, SvgIcon } from '@/components/common'
import { t } from '@/locales'

const appStore = useAppStore()
const chatStore = useChatStore()

const dialog = useDialog()

const { isMobile } = useBasicLayout()
const show = ref(false)

const collapsed = computed(() => appStore.siderCollapsed)

function handleAdd() {
  chatStore.addHistory({ title: 'New Chat', uuid: Date.now(), isEdit: false })
  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

function handleUpdateCollapsed() {
  appStore.setSiderCollapsed(!collapsed.value)
}

function handleClearAll() {
  dialog.warning({
    title: t('chat.deleteMessage'),
    content: t('chat.clearHistoryConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.clearHistory()
      if (isMobile.value)
        appStore.setSiderCollapsed(true)
    },
  })
}

const getMobileClass = computed<CSSProperties>(() => {
  if (isMobile.value) {
    return {
      position: 'fixed',
      zIndex: 50,
      height: '100%',
    }
  }
  return {}
})

const mobileSafeArea = computed(() => {
  if (isMobile.value) {
    return {
      paddingBottom: 'env(safe-area-inset-bottom)',
    }
  }
  return {}
})

watch(
  isMobile,
  (val) => {
    appStore.setSiderCollapsed(val)
  },
  {
    immediate: true,
    flush: 'post',
  },
)
</script>

<template>
	<NLayoutSider
		:collapsed="collapsed"
		:collapsed-width="0"
		:width="260"
		:show-trigger="isMobile ? false : 'arrow-circle'"
		collapse-mode="transform"

		bordered
		:style="getMobileClass"
		@update-collapsed="handleUpdateCollapsed"
	>
		<div class="flex flex-col h-full" :style="mobileSafeArea">
			<main class="flex flex-col flex-1 min-h-0">
				<div class="p-4">
					<NButton dashed block @click="handleAdd">
						{{ $t('chat.newChatButton') }}
					</NButton>
				</div>
				<div class="flex-1 min-h-0 pb-4 overflow-hidden">
					<List />
				</div>
				<div class="flex flex-col p-4 space-y-1">
					<span style="color: #1d93ab">
						<a target="_blank" href="https://www.cac.gov.cn/2023-04/11/c_1682854275475410.htm">国家网信办公开征求意见稿</a>
					</span>
					<span style="color: red">
							此工具仅限网龙公司同学使用，您的聊天均有审计日志记录，请勿发送违法违规的内容，否则责任自担！
					</span>
				</div>
				<div class="flex items-center p-4 space-x-4">
					<!--          <div class="flex-1">-->
					<!--            <NButton block @click="show = true">-->
					<!--              {{ $t('store.siderButton') }}-->
					<!--            </NButton>-->
					<!--          </div>-->

					<NButton block @click="handleClearAll">
						<SvgIcon icon="ri:close-circle-line" />
					</NButton>
				</div>
			</main>
			<Footer />
		</div>
	</NLayoutSider>
  <template v-if="isMobile">
    <div v-show="!collapsed" class="fixed inset-0 z-40 w-full h-full bg-black/40" @click="handleUpdateCollapsed" />
  </template>
  <PromptStore v-model:visible="show" />
</template>

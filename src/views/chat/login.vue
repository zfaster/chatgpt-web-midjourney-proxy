<script setup lang='ts'>
import { computed, ref } from 'vue'
import { NButton, NInput, NModal, useMessage } from 'naive-ui'
import { fetchVerify } from '@/api'
import {useAuthStore, useUserStore} from '@/store'
import Icon403 from '@/icons/403.vue'
import { useRouter } from 'vue-router'
import { getMD5Value } from '@/utils/md5.js'
const authStore = useAuthStore()
const userStore = useUserStore()
const ms = useMessage()

const loading = ref(false)
const token = ref('')
const username = ref('')
const disabled = computed(() => !token.value.trim() || loading.value)
const router = useRouter()
async function handleVerify() {
	const secretKey = token.value.trim()
	const loginName = username.value.trim()
	const md5Key = getMD5Value(secretKey)
	if (!secretKey)
		return

	try {
		loading.value = true
		const respData = await fetchVerify(loginName,md5Key)
		authStore.setToken(respData.data.access_token)
		userStore.updateUserInfo(respData.data.user)
		await authStore.getSession()
		ms.success(respData.message)
		// window.location.reload()
		router.push('/')
	}
	catch (error: any) {
		ms.error(error.message ?? 'error')
		authStore.removeToken()
		token.value = ''
	}
	finally {
		loading.value = false
	}
}
function handlePress(event: KeyboardEvent) {
	if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault()
		handleVerify()
	}
}

</script>
<template>
	<div class="outer-container">
		<div class="p-10 bg-white rounded dark:bg-slate-800">
			<div class="space-y-4">
				<header class="space-y-2">
					<h2 class="text-2xl font-bold text-center text-slate-800 dark:text-neutral-200">
						用户登录
					</h2>
					<!--          <p class="text-base text-center text-slate-500 dark:text-slate-500">-->
					<!--            {{ $t('common.unauthorizedTips') }}-->
					<!--          </p>-->
<!--					<Icon403 class="w-[200px] m-auto" />-->
				</header>
				<NInput v-model:value="username" type="text" placeholder="请输入99U工号" />
				<NInput v-model:value="token" type="password" placeholder="请输入99U密码" @keypress="handlePress" />
				<NButton
					block
					type="primary"
					:disabled="disabled"
					:loading="loading"
					@click="handleVerify"
				>
					{{ $t('common.verify') }}
				</NButton>
			</div>
		</div>
	</div>
</template>
<style scoped>
.outer-container {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 100vh;
	width: 100vw;
	background-image: url('http://gcdncs.101.com/v0.1/static/content_test_qa/login_bg.png');
	background-size: cover; /* This will make sure the image covers the whole container */
	background-position: center; /* This will center the image in the container */
}
.custom-input {
	background-color: #f0f0f0; /* This will set the input background color to light grey */
	color: black; /* This will set the text color to black */
	border: 1px solid #ccc; /* This will set the border color to grey */
}
.n-input__placeholder {
	color: #111010; /* This will set the placeholder text color to grey */
}
</style>

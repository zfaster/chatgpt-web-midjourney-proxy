import type { Router } from 'vue-router'
import { useAuthStoreWithout } from '@/store/modules/auth'

export function setupPageGuard(router: Router) {
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStoreWithout()
    if (!authStore.session) {
      try {
				const data = await authStore.getSession()
				if(data.expireToken){
					authStore.removeToken()
					next("/login")
				}
				if (String(data.auth) === 'false' && authStore.token)
					authStore.removeToken()
				if (to.path === '/500')
					next({ name: 'Root' })
				if(data.auth && !authStore.token){
					next("/login")
				}else{
					next()
				}
      }
      catch (error) {
        if (to.path !== '/500')
          next({ name: '500' })
        else
          next()
      }
    }
    else {
      next()
    }
  })
}

import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    token: null
  }),
  getters: {
    isLoggedIn: (state) => !!state.token
  },
  actions: {
    login(userInfo) {
      this.user = userInfo
      this.token = userInfo.token
      localStorage.setItem('user', JSON.stringify(userInfo))
    },
    logout() {
      this.user = null
      this.token = null
      localStorage.removeItem('user')
    },
    initUser() {
      const userInfo = localStorage.getItem('user')
      if (userInfo) {
        try {
          const parsedUser = JSON.parse(userInfo)
          this.user = parsedUser
          this.token = parsedUser.token
        } catch (error) {
          console.error('解析用户信息失败:', error)
          localStorage.removeItem('user')
        }
      }
    }
  }
})
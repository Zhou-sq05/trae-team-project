import { defineStore } from 'pinia'

export const useTaskStore = defineStore('task', {
  state: () => ({
    tasks: []
  }),
  getters: {
    taskList: (state) => state.tasks,
    currentTask: (state) => state.tasks.length > 0 ? state.tasks[0] : null
  },
  actions: {
    addTask(task) {
      this.tasks.unshift(task)
      this.saveToLocalStorage()
    },
    deleteTask(taskId) {
      this.tasks = this.tasks.filter(task => task.id !== taskId)
      this.saveToLocalStorage()
    },
    clearTasks() {
      this.tasks = []
      this.saveToLocalStorage()
    },
    saveToLocalStorage() {
      localStorage.setItem('tasks', JSON.stringify(this.tasks))
    },
    loadFromLocalStorage() {
      const tasks = localStorage.getItem('tasks')
      if (tasks) {
        try {
          this.tasks = JSON.parse(tasks)
        } catch (error) {
          console.error('解析任务数据失败:', error)
          this.tasks = []
        }
      }
    }
  }
})

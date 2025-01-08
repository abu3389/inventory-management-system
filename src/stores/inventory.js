import { defineStore } from 'pinia'

export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    items: []
  }),

  getters: {
    totalItems: (state) => {
      return state.items.reduce((sum, item) => sum + item.quantity, 0)
    },

    itemCategories: (state) => {
      const categories = new Set(state.items.map(item => item.category))
      return categories.size
    },

    lowStockItems: (state) => {
      // 假设低于10个为低库存
      return state.items.filter(item => item.quantity < 10).length
    }
  },

  actions: {
    addItem(item) {
      const newItem = {
        ...item,
        id: Date.now()
      }
      this.items.push(newItem)
    },

    updateItem(item) {
      const index = this.items.findIndex(i => i.id === item.id)
      if (index !== -1) {
        this.items[index] = { ...item }
      }
    },

    deleteItem(id) {
      const index = this.items.findIndex(item => item.id === id)
      if (index !== -1) {
        this.items.splice(index, 1)
      }
    },

    searchItems(query) {
      if (!query) {
        return this.items
      }
      
      const lowercaseQuery = query.toLowerCase()
      return this.items.filter(item => 
        item.name.toLowerCase().includes(lowercaseQuery) ||
        item.category.toLowerCase().includes(lowercaseQuery)
      )
    }
  },

  persist: true
}) 
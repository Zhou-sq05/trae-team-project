import { defineStore } from 'pinia';

const STORAGE_KEY = 'attribute-configs';

export const useAttributeConfigStore = defineStore('attributeConfig', {
  state: () => ({
    configs: {}
  }),
  getters: {
    getConfigById: state => attributeId => state.configs[String(attributeId)] || null,
    hasConfigById: state => attributeId => Boolean(state.configs[String(attributeId)])
  },
  actions: {
    saveConfig(attributeId, config) {
      this.configs = {
        ...this.configs,
        [String(attributeId)]: {
          ...config,
          attributeId,
          updatedAt: new Date().toISOString()
        }
      };
      this.saveToLocalStorage();
    },
    deleteConfig(attributeId) {
      const nextConfigs = { ...this.configs };
      delete nextConfigs[String(attributeId)];
      this.configs = nextConfigs;
      this.saveToLocalStorage();
    },
    saveToLocalStorage() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.configs));
    },
    loadFromLocalStorage() {
      const rawConfigs = localStorage.getItem(STORAGE_KEY);

      if (!rawConfigs) {
        this.configs = {};
        return;
      }

      try {
        this.configs = JSON.parse(rawConfigs);
      } catch (error) {
        console.error('解析属性配置失败:', error);
        this.configs = {};
      }
    }
  }
});

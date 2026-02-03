<script setup lang="ts">
import { ref, onMounted } from "vue";
import AISettingsPanel from "../components/AISettingsPanel.vue";
import { toggleDarkMode, loadDarkMode } from "../utils/theme";
import { loadConfig, saveConfig } from "../apis";

const activeTab = ref("ai");
const darkMode = ref(false);
const padMode = ref(false);
const handleToggleConfig = async () => {
  const config = await loadConfig();
  const newConfig = {
    ...config,
    darkMode: darkMode.value,
    padMode: padMode.value,
  };
  await saveConfig(newConfig);
};

onMounted(async () => {
  await loadConfig().then((config) => {
    darkMode.value = config.darkMode ? config.darkMode : false;
    padMode.value = config.padMode ? config.padMode : false;
  });
});
</script>

<template>
  <div class="settings-container dark:bg-gray-900 min-h-screen">
    <div class="max-w-4xl mx-auto">
      <!-- 顶部导航 -->
      <div class="flex items-center justify-between mb-6">
        <h2
          class="text-2xl font-bold text-gray-800 dark:text-white flex items-center"
        >
          <span class="text-3xl mr-3">⚙️</span>
          设置
        </h2>
      </div>

      <!-- 标签页导航 -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg mb-6">
        <div class="flex border-b border-gray-200 dark:border-gray-700">
          <button
            @click="activeTab = 'ai'"
            :class="[
              'flex-1 px-6 py-4 text-center font-medium transition-colors',
              activeTab === 'ai'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200',
            ]"
          >
            🤖 AI 设置
          </button>
          <button
            @click="activeTab = 'appearance'"
            :class="[
              'flex-1 px-6 py-4 text-center font-medium transition-colors',
              activeTab === 'appearance'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200',
            ]"
          >
            🎨 外观设置
          </button>
          <button
            @click="activeTab = 'input'"
            :class="[
              'flex-1 px-6 py-4 text-center font-medium transition-colors',
              activeTab === 'input'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200',
            ]"
          >
            ⌨️ 输入设置
          </button>
        </div>
      </div>

      <!-- 标签页内容 -->
      <div class="tab-content">
        <!-- AI 设置 -->
        <div
          v-if="activeTab === 'ai'"
          class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
        >
          <AISettingsPanel />
        </div>

        <!-- 外观设置 -->
        <div
          v-if="activeTab === 'appearance'"
          class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
        >
          <h2
            class="text-2xl font-bold text-gray-800 dark:text-white flex items-center mb-6"
          >
            <span class="text-3xl mr-3">🎨</span>
            外观设置
          </h2>

          <!-- 深色模式开关 -->
          <div
            class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                深色模式
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                启用深色主题以减轻眼睛疲劳
              </p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                v-model="darkMode"
                @change="toggleDarkMode"
                class="sr-only peer"
              />
              <div
                class="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
              ></div>
            </label>
          </div>
        </div>

        <!-- 输入设置 -->
        <div
          v-if="activeTab === 'input'"
          class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
        >
          <h2
            class="text-2xl font-bold text-gray-800 dark:text-white flex items-center mb-6"
          >
            <span class="text-3xl mr-3">⌨️</span>
            输入设置
          </h2>

          <!-- 平板模式开关 -->
          <div
            class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                平板模式
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                启用平板模式以适应受限输入环境
              </p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                v-model="padMode"
                @change="handleToggleConfig"
                class="sr-only peer"
              />
              <div
                class="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
              ></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

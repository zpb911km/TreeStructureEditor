<script setup lang="ts">
import { ref, onMounted } from "vue";
import { showSuccess, showError } from "../utils/notifications";
import { AIConfig } from "../types";
import { loadAIConfig, saveAIConfig } from "../apis";

const config = ref<AIConfig>({
  apiKey: "",
  baseURL: "https://api.openai.com/v1",
  model: "gpt-3.5-turbo",
});

const testQuestion = ref("你好,请简单介绍一下你自己");
const testAnswer = ref("");
const isTesting = ref(false);
const isSaving = ref(false);

const loadTheAIConfig = async () => {
  loadAIConfig()
    .then((ai_config) => {
      if (ai_config) {
        config.value = ai_config;
      }
    })
    .catch((error) => {
      showError("加载配置失败: " + error);
    });
};

const saveConfig = async () => {
  if (!config.value.apiKey) {
    showError("请输入API Key");
    return;
  }

  if (!config.value.baseURL) {
    showError("请输入Base URL");
    return;
  }

  if (!config.value.model) {
    showError("请输入模型名称");
    return;
  }

  isSaving.value = true;
  saveAIConfig(config.value)
    .then(() => {
      isSaving.value = false;
      showSuccess("配置保存成功");
    })
    .catch((error) => {
      isSaving.value = false;
      showError("保存配置失败: " + error);
    });
};

const testAPI = async () => {
  if (!config.value.apiKey) {
    showError("请先输入API Key");
    return;
  }

  isTesting.value = true;
  testAnswer.value = "正在请求...";

  try {
    const response = await fetch(`${config.value.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.value.apiKey}`,
      },
      body: JSON.stringify({
        model: config.value.model,
        messages: [
          {
            role: "system",
            content: "你是一个友好的助手。",
          },
          {
            role: "user",
            content: testQuestion.value,
          },
        ],
        temperature: 0.5,
        max_tokens: 500,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API请求失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      testAnswer.value = data.choices[0].message.content;
      showSuccess("API测试成功");
    } else {
      testAnswer.value = "API返回了空响应";
      showError("API返回了空响应");
    }
  } catch (error) {
    testAnswer.value = `错误: ${(error as Error).message}`;
    showError("API测试失败: " + (error as Error).message);
  } finally {
    isTesting.value = false;
  }
};

onMounted(() => {
  loadTheAIConfig();
});
</script>

<template>
  <div>
    <h2
      class="text-2xl font-bold text-gray-800 dark:text-white flex items-center mb-6"
    >
      <span class="text-3xl mr-3">🤖</span>
      AI 设置
    </h2>

    <!-- API配置表单 -->
    <div class="space-y-4 mb-8">
      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          API Key <span class="text-red-500">*</span>
        </label>
        <input
          v-model="config.apiKey"
          type="password"
          placeholder="sk-..."
          class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Base URL <span class="text-red-500">*</span>
        </label>
        <input
          v-model="config.baseURL"
          type="text"
          placeholder="https://api.openai.com/v1"
          class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          模型名称 <span class="text-red-500">*</span>
        </label>
        <input
          v-model="config.model"
          type="text"
          placeholder="gpt-3.5-turbo"
          class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div class="flex justify-end">
        <button
          @click="saveConfig"
          :disabled="isSaving"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ isSaving ? "保存中..." : "保存配置" }}
        </button>
      </div>
    </div>

    <!-- 分隔线 -->
    <hr class="my-6 border-gray-200 dark:border-gray-700" />

    <!-- API测试区域 -->
    <div class="space-y-4">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white">
        API 测试
      </h3>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          测试问题
        </label>
        <input
          v-model="testQuestion"
          type="text"
          placeholder="输入测试问题..."
          class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div class="flex justify-end">
        <button
          @click="testAPI"
          :disabled="isTesting"
          class="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ isTesting ? "测试中..." : "测试API" }}
        </button>
      </div>

      <div v-if="testAnswer" class="mt-4">
        <label
          class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          AI 回答
        </label>
        <div
          class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg min-h-[100px] whitespace-pre-wrap text-gray-900 dark:text-white"
        >
          {{ testAnswer }}
        </div>
      </div>
    </div>

    <!-- 提示信息 -->
    <div
      class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg"
    >
      <p class="text-sm text-blue-800 dark:text-blue-300">
        <strong>提示:</strong> 配置将保存在
        <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded"
          >$HOME/.TreeStructureEditor/ai_api.json</code
        >
      </p>
      <p class="text-sm text-blue-800 dark:text-blue-300">
        <strong>提示:</strong> 你可以在叶子节点编写过程中使用
        <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded"
          >Ctrl+Space</code
        >
        触发自动补全，并生成AI提示。
        <br />
        使用
        <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded">Tab</code>
        键接受补全项。
      </p>
    </div>
  </div>
</template>

<style scoped>
code {
  font-family: "Courier New", monospace;
}
</style>

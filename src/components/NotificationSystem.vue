<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import type { Notification } from "../types";
import { notificationQueue, notificationTimers } from "../utils/notifications";

const notifications = ref<Notification[]>([]);

const handleNewNotification = (notification: Notification): void => {
  const newNotification = { ...notification, fadeOut: false };
  notifications.value.push(newNotification);

  const timerId = setTimeout(() => {
    const index = notifications.value.findIndex(
      (n) => n.id === newNotification.id,
    );
    if (index !== -1) {
      notifications.value[index].fadeOut = true;
    }

    setTimeout(() => {
      notifications.value = notifications.value.filter(
        (n) => n.id !== newNotification.id,
      );
    }, 300);
  }, 5000);

  notificationTimers.set(newNotification.id, timerId);
};

const processQueue = (): void => {
  if (notificationQueue.length > 0) {
    const notification = notificationQueue.shift();
    if (notification) {
      handleNewNotification(notification);
    }
  }
};

let interval: number | null = null;

onMounted(() => {
  interval = window.setInterval(processQueue, 100);
});

onUnmounted(() => {
  if (interval !== null) {
    clearInterval(interval);
  }
  notificationTimers.forEach((timer) => clearTimeout(timer));
});

const removeNotification = (id: number): void => {
  if (notificationTimers.has(id)) {
    clearTimeout(notificationTimers.get(id)!);
    notificationTimers.delete(id);
  }

  const index = notifications.value.findIndex((n) => n.id === id);
  if (index !== -1) {
    notifications.value[index].fadeOut = true;
  }

  setTimeout(() => {
    notifications.value = notifications.value.filter((n) => n.id !== id);
  }, 300);
};
</script>

<template>
  <div class="notification-container">
    <div
      v-for="notification in notifications"
      :key="notification.id"
      class="notification"
      :class="[
        notification.type || 'info',
        { 'fade-out': notification.fadeOut },
      ]"
    >
      <div class="notification-content">
        {{ notification.message }}
      </div>
      <button
        class="notification-close"
        @click="removeNotification(notification.id)"
      >
        ×
      </button>
    </div>
  </div>
</template>

<style scoped>
@import "../index.css";
</style>

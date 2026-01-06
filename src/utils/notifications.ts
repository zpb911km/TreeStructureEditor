import type { Notification } from "../types";

export const notificationQueue: Notification[] = [];
export const notificationTimers = new Map<
  number,
  ReturnType<typeof setTimeout>
>();

export const showNotification = (
  message: string,
  type: "success" | "error" | "warning" | "info" = "info",
): void => {
  notificationQueue.push({ message, type, id: Date.now() + Math.random() });
};

export const showSuccess = (message: string): void =>
  showNotification(message, "success");
export const showError = (message: string): void =>
  showNotification(message, "error");
export const showWarning = (message: string): void =>
  showNotification(message, "warning");
export const showInfo = (message: string): void =>
  showNotification(message, "info");

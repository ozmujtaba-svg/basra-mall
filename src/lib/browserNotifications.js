export function getBrowserNotificationPermission() {
  if (!("Notification" in window)) return "unsupported"
  return Notification.permission
}

export async function requestBrowserNotificationPermission() {
  if (!("Notification" in window)) return "unsupported"
  return Notification.requestPermission()
}

export async function sendBrowserNotification(title, options = {}) {
  if (!("Notification" in window) || Notification.permission !== "granted") return false

  const notificationOptions = {
    badge: "/app-icon-192.png",
    icon: "/app-icon-192.png",
    lang: "ar",
    renotify: true,
    tag: options.tag ?? "basra-mall",
    ...options,
  }

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration()

    if (registration) {
      await registration.showNotification(title, notificationOptions)
      return true
    }
  }

  new Notification(title, notificationOptions)
  return true
}

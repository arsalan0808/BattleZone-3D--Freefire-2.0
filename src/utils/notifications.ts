const canUseNotifications = () =>
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator &&
  (window.isSecureContext || window.location.hostname === 'localhost')

export const requestNotificationPermission = async () => {
  if (!canUseNotifications()) {
    return 'unsupported' as const
  }

  return Notification.permission === 'default'
    ? Notification.requestPermission()
    : Notification.permission
}

export const sendGameNotification = async ({
  title,
  body,
  tag,
}: {
  title: string
  body: string
  tag: string
}) => {
  if (!canUseNotifications()) {
    return false
  }

  const permission = await requestNotificationPermission()
  if (permission !== 'granted') {
    return false
  }

  const registration = await navigator.serviceWorker.ready
  await registration.showNotification(title, {
    body,
    icon: '/Free_Fire_App_Icon.webp',
    badge: '/Free_Fire_App_Icon.webp',
    tag,
  })

  return true
}

export const sendTestNotification = async () =>
  sendGameNotification({
    title: 'BattleZone Alert',
    body: 'Notifications are working on this device.',
    tag: 'battlezone-test',
  })

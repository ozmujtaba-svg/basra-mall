import { useState } from "react"

const notificationFilters = [
  { label: "الكل", value: "all" },
  { label: "جديد", value: "unread" },
  { label: "تنبيه", value: "warning" },
  { label: "نجاح", value: "success" },
  { label: "معلومة", value: "info" },
]

export function Shell({
  children,
  dashboard,
  navItems = [],
  notification,
  notifications = [],
  onBack,
  onClearNotifications,
  onDismissNotification,
  onForgetAccount,
  onReadNotifications,
  stats,
  storageMessage,
  user,
}) {
  const welcomeMessage = getWelcomeMessage(user.accountType, user.name)
  const [activeSectionLabel, setActiveSectionLabel] = useState(
    navItems[0]?.label ?? "لوحة البداية",
  )
  const [showNotificationCenter, setShowNotificationCenter] = useState(false)
  const [notificationFilter, setNotificationFilter] = useState(notificationFilters[0].value)
  const unreadNotifications = notifications.filter((item) => !item.read).length
  const filteredNotifications = notifications.filter((item) =>
    matchesNotificationFilter(item, notificationFilter),
  )

  function goToSection(item) {
    setActiveSectionLabel(item.label)
    scrollToDashboardSection(item.targetId)
  }

  function toggleNotificationCenter() {
    setShowNotificationCenter((isVisible) => {
      const nextVisible = !isVisible

      if (nextVisible) {
        onReadNotifications()
      }

      return nextVisible
    })
  }

  return (
    <section className="dashboard">
      <div className="dashboard-hero">
        <small>مول البصرة</small>
        <h1>{dashboard.title}</h1>
        <p>{dashboard.subtitle}</p>
      </div>

      <div className="dashboard-body">
        <div className="dashboard-top">
          <div>
            <h2>لوحة البداية</h2>
            <p>
              داخل باسم {user.name} كـ {user.accountType}
              <br />
              رقم الهاتف: {user.phone}
            </p>
          </div>
          <div className="session-actions">
            <button className="back-button" onClick={onBack}>
              خروج
            </button>
            <button className="forget-account-button" onClick={onForgetAccount}>
              تبديل حساب
            </button>
          </div>
        </div>

        <div className="welcome-message">
          <strong>{welcomeMessage.title}</strong>
          <span>{welcomeMessage.description}</span>
        </div>

        {navItems.length > 0 && (
          <div className="dashboard-nav-panel">
            <div className="dashboard-nav-title">
              <span>اختصارات الصفحة</span>
              <strong>انتقل بسرعة للقسم المطلوب</strong>
            </div>

            <nav className="dashboard-nav" aria-label="تنقل لوحة الحساب">
              {navItems.map((item) => (
                <button
                  key={item.targetId}
                  className={activeSectionLabel === item.label ? "active" : ""}
                  onClick={() => goToSection(item)}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="current-section-bar">
              <span>أنت الآن في</span>
              <strong>{activeSectionLabel}</strong>
            </div>
          </div>
        )}

        {storageMessage && (
          <div className="storage-warning">
            <strong>تنبيه حفظ البيانات</strong>
            <span>{storageMessage}</span>
          </div>
        )}

        {notification && (
          <div className={`app-notification ${notification.type}`}>
            <div>
              <div className="app-notification-title">
                <strong>{getNotificationTitle(notification.type)}</strong>
                <b>{notification.audience ?? user.accountType}</b>
              </div>
              <span>{notification.message}</span>
            </div>
            <button onClick={onDismissNotification} type="button">
              إغلاق
            </button>
          </div>
        )}

        <div className="notification-center">
          <div className="notification-center-top">
            <div>
              <span>مركز الإشعارات</span>
              <strong>
                {notifications.length} إشعارات محفوظة لـ {user.accountType}
              </strong>
              {unreadNotifications > 0 && (
                <small>{unreadNotifications} جديد غير مقروء</small>
              )}
            </div>
            <div className="notification-center-actions">
              <button
                className={unreadNotifications > 0 ? "has-unread" : ""}
                onClick={toggleNotificationCenter}
                type="button"
              >
                {showNotificationCenter ? "إخفاء" : "عرض"}
              </button>
              <button
                disabled={notifications.length === 0}
                onClick={onClearNotifications}
                type="button"
              >
                مسح
              </button>
            </div>
          </div>

          {showNotificationCenter && (
            <div className="notification-history">
              <div className="notification-filter">
                {notificationFilters.map((filter) => (
                  <button
                    className={notificationFilter === filter.value ? "active" : ""}
                    key={filter.value}
                    onClick={() => setNotificationFilter(filter.value)}
                    type="button"
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              {notifications.length === 0 ? (
                <div className="notification-empty">ماكو إشعارات محفوظة حاليًا.</div>
              ) : filteredNotifications.length === 0 ? (
                <div className="notification-empty">ماكو إشعارات مطابقة لهذا الفلتر.</div>
              ) : (
                filteredNotifications.map((item) => (
                  <div
                    className={`notification-history-item ${item.type} ${item.read ? "read" : "unread"}`}
                    key={item.id}
                  >
                    <div className="notification-history-title">
                      <strong>{getNotificationTitle(item.type)}</strong>
                      <div className="notification-history-badges">
                        {!item.read && <em>جديد</em>}
                        <b>{item.audience ?? user.accountType}</b>
                      </div>
                    </div>
                    <span>{item.message}</span>
                    <small>{formatNotificationTime(item.time)}</small>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="stats">
          {stats.map((item) => (
            <div className="stat" key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {children}

        <div className="note">{dashboard.note}</div>
      </div>

      <button className="scroll-top-button" onClick={scrollToDashboardTop}>
        رجوع للأعلى
      </button>
    </section>
  )
}

function scrollToDashboardSection(sectionId) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

function scrollToDashboardTop() {
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function getNotificationTitle(type) {
  if (type === "warning") {
    return "تنبيه"
  }

  if (type === "info") {
    return "معلومة"
  }

  return "تم بنجاح"
}

function matchesNotificationFilter(notification, filter) {
  if (filter === "all") {
    return true
  }

  if (filter === "unread") {
    return !notification.read
  }

  return notification.type === filter
}

function formatNotificationTime(time) {
  if (!time) {
    return "الآن"
  }

  return new Intl.DateTimeFormat("ar-IQ", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(time))
}

function getWelcomeMessage(accountType, name) {
  const displayName = name || "حبيبي"

  if (accountType === "صاحب متجر") {
    return {
      title: `أهلًا ${displayName}`,
      description: "راجع متجرك، أضف المنتجات، وتابع الطلبات الجديدة أول بأول.",
    }
  }

  if (accountType === "سائق") {
    return {
      title: `أهلًا ${displayName}`,
      description: "راجع طلبات التوصيل، استلم الطلب الجاهز، وحدّث حالة المهمة.",
    }
  }

  if (accountType === "الإدارة") {
    return {
      title: `أهلًا ${displayName}`,
      description: "راقب المتاجر والطلبات والأرباح من مكان واحد داخل مول البصرة.",
    }
  }

  return {
    title: `أهلًا ${displayName}`,
    description: "تصفح المتاجر، اختار المنتجات، وتابع طلبك لحد باب البيت.",
  }
}

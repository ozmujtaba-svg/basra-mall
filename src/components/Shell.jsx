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
  const [showQuickCheck, setShowQuickCheck] = useState(false)
  const [notificationFilter, setNotificationFilter] = useState(notificationFilters[0].value)
  const [pendingSessionAction, setPendingSessionAction] = useState("")
  const unreadNotifications = notifications.filter((item) => !item.read).length
  const filteredNotifications = notifications.filter((item) =>
    matchesNotificationFilter(item, notificationFilter),
  )
  const recentActivity = notifications.slice(0, 4)
  const quickCheckItems = getQuickCheckItems({
    notifications,
    recentActivity,
    stats,
    storageMessage,
  })

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

  function requestSessionAction(action) {
    setPendingSessionAction(action)
  }

  function cancelSessionAction() {
    setPendingSessionAction("")
  }

  function confirmSessionAction() {
    const action = pendingSessionAction

    setPendingSessionAction("")

    if (action === "forget") {
      onForgetAccount()
      return
    }

    onBack()
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
            <button className="back-button" onClick={() => requestSessionAction("back")}>
              خروج
            </button>
            <button
              className="forget-account-button"
              onClick={() => requestSessionAction("forget")}
            >
              تبديل حساب
            </button>
          </div>
        </div>

        {pendingSessionAction && (
          <div className="session-confirm-card">
            <div>
              <strong>
                {pendingSessionAction === "forget" ? "تأكيد تبديل الحساب" : "تأكيد الخروج"}
              </strong>
              <span>
                {pendingSessionAction === "forget"
                  ? "راح ترجع لشاشة الدخول وتختار حساب ثاني بدل الحساب الحالي."
                  : "راح ترجع لشاشة الدخول، والحساب المحفوظ يبقى موجود حتى تكمل منه لاحقًا."}
              </span>
            </div>
            <div className="session-confirm-actions">
              <button onClick={confirmSessionAction} type="button">
                {pendingSessionAction === "forget" ? "نعم، بدّل الحساب" : "نعم، خروج"}
              </button>
              <button onClick={cancelSessionAction} type="button">
                إلغاء
              </button>
            </div>
          </div>
        )}

        <div className="welcome-message">
          <strong>{welcomeMessage.title}</strong>
          <span>{welcomeMessage.description}</span>
        </div>

        <div className="session-scope-card">
          <div>
            <span>جلسة محمية</span>
            <strong>{getSessionScopeTitle(user.accountType)}</strong>
          </div>
          <p>{getSessionScopeDescription(user)}</p>
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

        <div className="recent-activity-card">
          <div className="recent-activity-header">
            <div>
              <span>سجل آخر العمليات</span>
              <strong>آخر تغييرات صارت بهذه الجلسة</strong>
            </div>
            <small>{recentActivity.length} عمليات</small>
          </div>
          {recentActivity.length === 0 ? (
            <div className="recent-activity-empty">
              بعد ماكو عمليات مسجلة. أي طلب، تعديل، أو تنبيه راح يظهر هنا.
            </div>
          ) : (
            <div className="recent-activity-list">
              {recentActivity.map((item) => (
                <div className={`recent-activity-item ${item.type}`} key={item.id}>
                  <div>
                    <strong>{getNotificationTitle(item.type)}</strong>
                    <span>{item.message}</span>
                  </div>
                  <small>{formatNotificationTime(item.time)}</small>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="quick-check-card">
          <div className="quick-check-header">
            <div>
              <span>فحص سريع</span>
              <strong>تأكد من وضع اللوحة خلال لحظة</strong>
            </div>
            <button onClick={() => setShowQuickCheck((isVisible) => !isVisible)} type="button">
              {showQuickCheck ? "إخفاء الفحص" : "تشغيل الفحص"}
            </button>
          </div>
          {showQuickCheck && (
            <div className="quick-check-list">
              {quickCheckItems.map((item) => (
                <div className={`quick-check-item ${item.status}`} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.note}</small>
                </div>
              ))}
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

function getQuickCheckItems({ notifications, recentActivity, stats, storageMessage }) {
  const hasStats = stats.some((item) => Number(item.value) > 0 || String(item.value).trim() !== "0")
  const warningCount = notifications.filter((item) => item.type === "warning").length

  return [
    {
      label: "حفظ البيانات",
      note: storageMessage || "ماكو مشكلة حفظ ظاهرة حاليًا.",
      status: storageMessage ? "warning" : "good",
      value: storageMessage ? "يحتاج انتباه" : "مستقر",
    },
    {
      label: "الإشعارات",
      note:
        warningCount > 0
          ? "راجع التنبيهات حتى تعرف آخر المشاكل أو التحذيرات."
          : "ماكو تنبيهات خطرة ضمن إشعارات هذه اللوحة.",
      status: warningCount > 0 ? "warning" : "good",
      value: `${notifications.length} محفوظة`,
    },
    {
      label: "آخر العمليات",
      note:
        recentActivity.length > 0
          ? "السجل يحتوي آخر تغييرات صارت بهذا الحساب."
          : "بعد ماكو عمليات مسجلة بهذه الجلسة.",
      status: recentActivity.length > 0 ? "good" : "muted",
      value: `${recentActivity.length} ظاهرة`,
    },
    {
      label: "بيانات اللوحة",
      note: hasStats ? "الأرقام الأساسية ظاهرة وتقدر تراجع التفاصيل تحت." : "ابدأ بإضافة بيانات حتى تظهر أرقام اللوحة.",
      status: hasStats ? "good" : "muted",
      value: hasStats ? "موجودة" : "فارغة",
    },
  ]
}

function getSessionScopeTitle(accountType) {
  if (accountType === "صاحب متجر") {
    return "واجهة صاحب المتجر فقط"
  }

  if (accountType === "سائق") {
    return "واجهة السائق فقط"
  }

  if (accountType === "الإدارة") {
    return "واجهة الإدارة فقط"
  }

  return "واجهة الزبون فقط"
}

function getSessionScopeDescription(user) {
  if (user.accountType === "صاحب متجر") {
    return `هذه الجلسة تعرض متاجر وطلبات رقم ${user.phone} فقط.`
  }

  if (user.accountType === "سائق") {
    return "هذه الجلسة تعرض مهام التوصيل فقط ولا تعرض إدارة المتاجر أو لوحة الإدارة."
  }

  if (user.accountType === "الإدارة") {
    return "هذه الجلسة مخصصة للإدارة ومحمية برمز الإدارة التجريبي."
  }

  return `هذه الجلسة تعرض طلبات الزبون المرتبطة برقم ${user.phone} فقط.`
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

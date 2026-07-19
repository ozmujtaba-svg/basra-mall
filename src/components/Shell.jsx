import { useState } from "react"

export function Shell({
  children,
  dashboard,
  navItems = [],
  onBack,
  onForgetAccount,
  stats,
  storageMessage,
  user,
}) {
  const welcomeMessage = getWelcomeMessage(user.accountType, user.name)
  const [activeSectionLabel, setActiveSectionLabel] = useState(
    navItems[0]?.label ?? "لوحة البداية",
  )

  function goToSection(item) {
    setActiveSectionLabel(item.label)
    scrollToDashboardSection(item.targetId)
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

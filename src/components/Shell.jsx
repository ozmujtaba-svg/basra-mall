export function Shell({ children, dashboard, onBack, stats }) {
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
            <p>هذه واجهة تجريبية حتى نرتب شكل التطبيق قبل إضافة بيانات حقيقية.</p>
          </div>
          <button className="back-button" onClick={onBack}>
            رجوع
          </button>
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
    </section>
  )
}

import { useMemo, useState } from "react"

const orderStatusFilters = [
  "الكل",
  "طلب جديد",
  "قيد التجهيز",
  "جاهز للتوصيل",
  "قيد التوصيل",
  "تم التسليم",
  "ملغي",
]
const orderSortOptions = [
  "الأحدث أولًا",
  "الأقدم أولًا",
  "الأعلى مبلغًا",
  "الأقل مبلغًا",
]
const orderDateFilters = ["كل الطلبات", "طلبات اليوم", "طلبات قديمة"]
const storeStatusFilters = [
  { label: "كل المتاجر", value: "all" },
  { label: "بانتظار الموافقة", value: "pending" },
  { label: "مقبولة", value: "approved" },
  { label: "مرفوضة", value: "rejected" },
]
const storeSortOptions = [
  "الأحدث أولًا",
  "الأقدم أولًا",
  "الأكثر منتجات",
  "الأقل منتجات",
]
const rejectionReasons = [
  "بيانات المتجر ناقصة",
  "نوع المتجر غير واضح",
  "رقم الهاتف غير صحيح",
  "المنطقة غير محددة",
]
const revenuePeriodFilters = ["اليوم", "آخر 7 أيام", "آخر 30 يوم", "كل الوقت"]

export function AdminDashboard({
  allOrders,
  commissionRate,
  coupons,
  deliveredOrders,
  drivers,
  estimatedRevenue,
  lastSaveTime,
  onApproveStore,
  onAddCoupon,
  onChangePassword,
  onExportBackup,
  onImportBackup,
  onRejectStore,
  onReviewStoreAgain,
  onResetData,
  onSettleDriverEarnings,
  onSettleMerchantEarnings,
  onSettingsChange,
  onUpdateDriverApproval,
  onUpdateCoupon,
  onUpdateOrderStatus,
  settings,
  stores,
}) {
  const [dataMessage, setDataMessage] = useState("")
  const [orderStatusFilter, setOrderStatusFilter] = useState(orderStatusFilters[0])
  const [orderDateFilter, setOrderDateFilter] = useState(orderDateFilters[0])
  const [orderSearch, setOrderSearch] = useState("")
  const [orderSort, setOrderSort] = useState(orderSortOptions[0])
  const [revenuePeriodFilter, setRevenuePeriodFilter] = useState(revenuePeriodFilters[0])
  const [storeSearch, setStoreSearch] = useState("")
  const [storeSort, setStoreSort] = useState(storeSortOptions[0])
  const [storeStatusFilter, setStoreStatusFilter] = useState(storeStatusFilters[0].value)
  const [storeRejectReasons, setStoreRejectReasons] = useState({})
  const [dataCheck, setDataCheck] = useState(null)
  const [pendingResetData, setPendingResetData] = useState(false)
  const [pendingImportFile, setPendingImportFile] = useState(null)
  const [pendingRejectStoreName, setPendingRejectStoreName] = useState("")
  const [newAdminPassword, setNewAdminPassword] = useState("")
  const [confirmAdminPassword, setConfirmAdminPassword] = useState("")
  const [passwordMessage, setPasswordMessage] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [couponType, setCouponType] = useState("percentage")
  const [couponValue, setCouponValue] = useState("")
  const [couponMinimum, setCouponMinimum] = useState("0")
  const [couponMaxUses, setCouponMaxUses] = useState("100")
  const [couponExpiresAt, setCouponExpiresAt] = useState("")
  const [couponMessage, setCouponMessage] = useState("")
  const pendingStores = useMemo(() => stores.filter((store) => store.status === "pending"), [stores])
  const rejectedStores = useMemo(() => stores.filter((store) => store.status === "rejected"), [stores])
  const approvedStores = useMemo(
    () => stores.filter((store) => store.status !== "pending" && store.status !== "rejected"),
    [stores],
  )
  const filteredStores = useMemo(
    () =>
      stores
        .map((store, index) => ({ ...store, adminOrder: index }))
        .filter((store) => matchesStoreStatusFilter(store, storeStatusFilter))
        .filter((store) => matchesStoreSearch(store, storeSearch))
        .sort((firstStore, secondStore) => sortStores(firstStore, secondStore, storeSort)),
    [storeSearch, storeSort, storeStatusFilter, stores],
  )
  const hasAdminStoreFilters =
    storeStatusFilter !== storeStatusFilters[0].value || Boolean(storeSearch.trim())
  const canceledOrders = useMemo(
    () => allOrders.filter((order) => order.status === "ملغي"),
    [allOrders],
  )
  const nonCanceledOrders = useMemo(
    () => allOrders.filter((order) => order.status !== "ملغي"),
    [allOrders],
  )
  const productCount = useMemo(
    () => stores.reduce((total, store) => total + store.products.length, 0),
    [stores],
  )
  const activeOffers = useMemo(
    () =>
      stores.flatMap((store) =>
        store.products
          .filter(isProductOfferActive)
          .map((product) => ({ ...product, storeName: store.name })),
      ),
    [stores],
  )
  const topStore = useMemo(() => getTopStore(nonCanceledOrders), [nonCanceledOrders])
  const revenuePeriodOrders = useMemo(
    () => filterOrdersByRevenuePeriod(allOrders, revenuePeriodFilter),
    [allOrders, revenuePeriodFilter],
  )
  const revenuePeriodStats = useMemo(
    () => getFinancialReportStats(revenuePeriodOrders),
    [revenuePeriodOrders],
  )
  const monitoringStats = useMemo(
    () =>
      getMonitoringStats({
        allOrders,
        commissionRate,
        pendingStores,
      }),
    [allOrders, commissionRate, pendingStores],
  )
  const todayStats = useMemo(() => getTodayStats(allOrders, commissionRate), [allOrders, commissionRate])
  const weekStats = useMemo(() => getWeekStats(allOrders, commissionRate), [allOrders, commissionRate])
  const topWeeklyStores = useMemo(() => getTopWeeklyStores(allOrders), [allOrders])
  const topWeeklyProducts = useMemo(() => getTopWeeklyProducts(allOrders), [allOrders])
  const adminAlerts = useMemo(
    () =>
      getAdminAlerts({
        allOrders,
        canceledOrders,
        pendingStores,
      }),
    [allOrders, canceledOrders, pendingStores],
  )
  const adminTasks = useMemo(
    () => getAdminTasks({ allOrders, canceledOrders, pendingStores }),
    [allOrders, canceledOrders, pendingStores],
  )
  const newOrdersCount = useMemo(
    () => allOrders.filter((order) => order.status === "طلب جديد").length,
    [allOrders],
  )
  const inDeliveryOrdersCount = useMemo(
    () => allOrders.filter((order) => order.status === "قيد التوصيل").length,
    [allOrders],
  )
  const activeAlertTitle = adminAlerts[0]?.title ?? "الوضع مستقر"
  const delayedAdminOrders = useMemo(() => getDelayedAdminOrders(allOrders), [allOrders])
  const topDelayedAdminOrders = useMemo(() => delayedAdminOrders.slice(0, 3), [delayedAdminOrders])
  const systemHealth = useMemo(
    () => getSystemHealthSummary({ allOrders, lastSaveTime, productCount, stores }),
    [allOrders, lastSaveTime, productCount, stores],
  )
  const projectSummary = useMemo(
    () =>
      getProjectSummary({
        allOrders,
        approvedStores,
        deliveredOrders,
        lastSaveTime,
        pendingStores,
        productCount,
        rejectedStores,
        stores,
      }),
    [allOrders, approvedStores, deliveredOrders, lastSaveTime, pendingStores, productCount, rejectedStores, stores],
  )
  const adminActivityLog = useMemo(
    () =>
      getAdminActivityLog({
        allOrders,
        delayedAdminOrders,
        focusOrder,
        pendingStores,
        rejectedStores,
        scrollToAdminSection,
        goToStoreReview,
      }),
    [allOrders, delayedAdminOrders, pendingStores, rejectedStores],
  )
  const quickDecisionRows = [
    {
      title: "مراجعة متاجر جديدة",
      count: pendingStores.length,
      priority: pendingStores.length > 0 ? "عالية" : "هادئة",
      note: "متاجر ما تظهر للزبائن قبل قرار الإدارة.",
      actionLabel: "افتح مراجعة المتاجر",
      onClick: () => goToStoreReview("pending"),
    },
    {
      title: "متابعة طلبات جديدة",
      count: newOrdersCount,
      priority: newOrdersCount > 0 ? "عالية" : "هادئة",
      note: "طلبات تحتاج متابعة حتى تبدي مرحلة التجهيز.",
      actionLabel: "افتح الطلبات الجديدة",
      onClick: () => goToOrderReview("طلب جديد"),
    },
    {
      title: "تجهيز التوصيل",
      count: allOrders.filter((order) => order.status === "جاهز للتوصيل").length,
      priority: allOrders.some((order) => order.status === "جاهز للتوصيل") ? "متوسطة" : "هادئة",
      note: "طلبات جاهزة وتحتاج سائق يستلمها.",
      actionLabel: "افتح الجاهزة للتوصيل",
      onClick: () => goToOrderReview("جاهز للتوصيل"),
    },
    {
      title: "مراجعة الملغي",
      count: canceledOrders.length,
      priority: canceledOrders.length > 0 ? "متوسطة" : "هادئة",
      note: "طلبات ملغية تحتاج تعرف سببها حتى تقلل التكرار.",
      actionLabel: "افتح الطلبات الملغية",
      onClick: () => goToOrderReview("ملغي"),
    },
    {
      title: "طلبات متأخرة",
      count: delayedAdminOrders.length,
      priority: delayedAdminOrders.length > 0 ? "عالية" : "هادئة",
      note: "طلبات واقفة أكثر من الوقت المتوقع وتحتاج متابعة.",
      actionLabel: "افتح المتأخرة",
      onClick: () => goToOrderReview("الكل"),
    },
  ]
  const filteredOrders = useMemo(
    () =>
      allOrders
        .filter((order) => orderStatusFilter === "الكل" || order.status === orderStatusFilter)
        .filter((order) => matchesDateFilter(order, orderDateFilter))
        .filter((order) => matchesOrderSearch(order, orderSearch))
        .sort((firstOrder, secondOrder) => sortOrders(firstOrder, secondOrder, orderSort)),
    [allOrders, orderDateFilter, orderSearch, orderSort, orderStatusFilter],
  )
  const hasAdminOrderFilters =
    orderStatusFilter !== orderStatusFilters[0] ||
    orderDateFilter !== orderDateFilters[0] ||
    Boolean(orderSearch.trim())

  function resetAdminOrderFilters() {
    setOrderSearch("")
    setOrderStatusFilter(orderStatusFilters[0])
    setOrderDateFilter(orderDateFilters[0])
  }

  async function saveAdminPassword() {
    if (newAdminPassword.length < 8) {
      setPasswordMessage("كلمة المرور الجديدة لازم تكون 8 أحرف أو أكثر.")
      return
    }
    if (newAdminPassword !== confirmAdminPassword) {
      setPasswordMessage("كلمتا المرور غير متطابقتين.")
      return
    }

    setPasswordLoading(true)
    setPasswordMessage("")
    const result = await onChangePassword(newAdminPassword)
    setPasswordLoading(false)
    setPasswordMessage(result.message)

    if (result.success) {
      setNewAdminPassword("")
      setConfirmAdminPassword("")
    }
  }

  return (
    <div className="orders-panel">
      <section className="admin-section project-summary-section" id="admin-summary">
        <div className="project-summary-hero">
          <div>
            <span>جاهزية النسخة الاحترافية</span>
            <h2>ملخص المشروع</h2>
            <p>
              نظرة سريعة على وضع مول البصرة الحالي: شنو مبني، شنو يحتاج متابعة،
              وشنو باقي قبل الإطلاق الحقيقي.
            </p>
          </div>
          <div className={`project-readiness-score ${projectSummary.level}`}>
            <span>درجة الجاهزية</span>
            <strong>{projectSummary.score}%</strong>
            <small>{projectSummary.title}</small>
          </div>
        </div>

        <div className="project-summary-grid">
          {projectSummary.stats.map((item) => (
            <div className={item.level ?? ""} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.note}</small>
            </div>
          ))}
        </div>

        <div className="project-readiness-panel">
          <div>
            <h3>شنو موجود حاليًا</h3>
            <ul>
              {projectSummary.readyFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>شنو باقي قبل الاحتراف</h3>
            <ul>
              {projectSummary.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="launch-checklist-panel">
          <div className="launch-checklist-header">
            <div>
              <h3>قائمة مهام قبل الإطلاق</h3>
              <p>هاي القائمة تفرق بين الأشياء الجاهزة كتجربة والأشياء المطلوبة للنسخة الاحترافية.</p>
            </div>
            <span>{projectSummary.launchChecklist.length} مهام</span>
          </div>
          <div className="launch-checklist-grid">
            {projectSummary.launchChecklist.map((task) => (
              <div className={`launch-check-item ${task.status}`} key={task.title}>
                <span>{task.statusLabel}</span>
                <strong>{task.title}</strong>
                <small>{task.note}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="development-roadmap-panel">
          <div className="development-roadmap-header">
            <div>
              <h3>خريطة مراحل التطوير</h3>
              <p>مسار واضح من النموذج الحالي إلى إطلاق مول البصرة بشكل رسمي.</p>
            </div>
            <span>{projectSummary.developmentRoadmap.length} مراحل</span>
          </div>
          <div className="development-roadmap-list">
            {projectSummary.developmentRoadmap.map((stage) => (
              <div className={`development-roadmap-item ${stage.status}`} key={stage.title}>
                <span>{stage.phase}</span>
                <strong>{stage.title}</strong>
                <small>{stage.note}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="current-version-notes">
          <div className="current-version-header">
            <div>
              <h3>ملاحظات النسخة الحالية</h3>
              <p>حدود مهمة لازم تبقى واضحة قبل التعامل ويا التطبيق كنسخة احترافية.</p>
            </div>
            <span>نسخة تجريبية</span>
          </div>
          <div className="current-version-grid">
            {projectSummary.currentVersionNotes.map((note) => (
              <div className={note.level} key={note.title}>
                <strong>{note.title}</strong>
                <span>{note.description}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="project-save-strip">
          <div>
            <span>آخر حفظ داخل المتصفح</span>
            <strong>{formatLastSaveTime(lastSaveTime)}</strong>
          </div>
          <div>
            <span>آخر حفظ Git</span>
            <strong>يدوي من الطرفية</strong>
            <small>نحفظه بعد كل مجموعة إضافات مثل ما متفقين.</small>
          </div>
          <div className="project-save-actions">
            <button onClick={exportProjectSummary} type="button">
              تصدير ملخص المشروع
            </button>
            <button onClick={() => scrollToAdminSection("admin-data")} type="button">
              افتح إدارة البيانات
            </button>
          </div>
        </div>
      </section>

      <section className="admin-section" id="admin-monitor">
        <div>
          <h2>لوحة الإدارة</h2>
          <p>هنا تشوف حركة المول: الطلبات، المتاجر، التوصيل، والربح التجريبي.</p>
        </div>
        <div className="admin-quick-nav">
          <button onClick={() => scrollToAdminSection("admin-stores")} type="button">
            المتاجر
          </button>
          <button onClick={() => scrollToAdminSection("admin-orders")} type="button">
            الطلبات
          </button>
          <button onClick={() => scrollToAdminSection("admin-revenue")} type="button">
            الأرباح
          </button>
          <button onClick={() => scrollToAdminSection("admin-settings")} type="button">
            الإعدادات
          </button>
        </div>
        <div className="admin-fast-summary">
          <div className={pendingStores.length > 0 ? "attention" : ""}>
            <span>متاجر قيد المراجعة</span>
            <strong>{pendingStores.length}</strong>
          </div>
          <div className={newOrdersCount > 0 ? "attention" : ""}>
            <span>طلبات جديدة</span>
            <strong>{newOrdersCount}</strong>
          </div>
          <div>
            <span>قيد التوصيل</span>
            <strong>{inDeliveryOrdersCount}</strong>
          </div>
          <div className="profit">
            <span>أرباح اليوم</span>
            <strong>{formatMoney(monitoringStats.todayRevenue)}</strong>
          </div>
          <div className="wide">
            <span>أهم تنبيه</span>
            <strong>{activeAlertTitle}</strong>
          </div>
        </div>
        <div className="admin-decision-table" aria-label="قرارات الإدارة السريعة">
          <div className="admin-decision-head">
            <span>القرار المطلوب</span>
            <span>العدد</span>
            <span>الأولوية</span>
            <span>الإجراء</span>
          </div>
          {quickDecisionRows.map((decision) => (
            <div
              className={`admin-decision-row ${decision.count > 0 ? "needs-action" : "calm"}`}
              key={decision.title}
            >
              <span>
                <strong>{decision.title}</strong>
                <small>{decision.note}</small>
              </span>
              <span className="decision-count">{decision.count}</span>
              <span className={`decision-priority ${getPriorityClass(decision.priority)}`}>
                {decision.priority}
              </span>
              <span>
                <button onClick={decision.onClick} type="button">
                  {decision.actionLabel}
                </button>
              </span>
            </div>
          ))}
        </div>
        <div className={`admin-health-summary ${systemHealth.level}`}>
          <div className="admin-health-main">
            <span>صحة النظام</span>
            <strong>{systemHealth.title}</strong>
            <small>{systemHealth.note}</small>
          </div>
          <div className="admin-health-grid">
            {systemHealth.items.map((item) => (
              <div className={item.level ?? ""} key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
          <div className="admin-health-actions">
            <button onClick={checkDataHealth} type="button">
              فحص البيانات
            </button>
            <button onClick={() => scrollToAdminSection("admin-data")} type="button">
              إدارة النسخ
            </button>
          </div>
        </div>
        <div className="admin-activity-log">
          <div className="admin-activity-header">
            <div>
              <h3>سجل نشاط الإدارة</h3>
              <p>آخر الأحداث المهمة التي تساعدك تعرف شنو يحتاج متابعة.</p>
            </div>
            <span>{adminActivityLog.length} أحداث</span>
          </div>
          <div className="admin-activity-list">
            {adminActivityLog.map((activity) => (
              <button
                className={`admin-activity-item ${activity.level}`}
                key={activity.id}
                onClick={activity.onClick}
                type="button"
              >
                <span>{activity.type}</span>
                <strong>{activity.title}</strong>
                <small>{activity.note}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="admin-grid">
          <div className="admin-card">
            متاجر تنتظر الموافقة
            <strong>{pendingStores.length}</strong>
            <span>متاجر جديدة لا تظهر للزبائن بعد</span>
          </div>
          <div className="admin-card">
            متاجر مرفوضة
            <strong>{rejectedStores.length}</strong>
            <span>متاجر تحتاج مراجعة بياناتها</span>
          </div>
          <div className="admin-card">
            الطلبات المسلّمة
            <strong>{deliveredOrders.length}</strong>
            <span>طلبات وصلت للزبائن</span>
          </div>
          <div className="admin-card">
            الطلبات الملغية
            <strong>{canceledOrders.length}</strong>
            <span>لا تدخل ضمن حساب الربح</span>
          </div>
          <div className="admin-card highlight">
            صافي ربح الإدارة
            <strong>{estimatedRevenue.toLocaleString("en-US")} د.ع</strong>
            <span>عمولة بيع + أجور توصيل مسلّمة</span>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-monitor-header">
          <div>
            <h3>مهام الإدارة</h3>
            <p>قائمة عملية تساعدك تراجع المول خطوة بخطوة.</p>
          </div>
          <span>{adminTasks.filter((task) => task.active).length} مهام نشطة</span>
        </div>
        <div className="admin-task-list">
          {adminTasks.map((task) => (
            <div className={task.active ? "admin-task active" : "admin-task done"} key={task.title}>
              <strong>{task.title}</strong>
              <span>{task.description}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-monitor-header">
          <div>
            <h3>تنبيهات الإدارة</h3>
            <p>رسائل مختصرة عن الأشياء التي تحتاج قرار أو متابعة.</p>
          </div>
          <span>{adminAlerts.length} تنبيهات</span>
        </div>
        <div className="admin-alert-list">
          {adminAlerts.map((alert) => (
            <div className={`admin-alert ${alert.level}`} key={alert.title}>
              <strong>{alert.title}</strong>
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={`admin-section admin-late-panel ${delayedAdminOrders.length > 0 ? "attention" : ""}`}>
        <div className="admin-monitor-header">
          <div>
            <h3>تنبيه الطلبات المتأخرة</h3>
            <p>يعرض الطلبات التي بقيت بنفس الحالة أكثر من الوقت المتوقع.</p>
          </div>
          <span>{delayedAdminOrders.length} طلب متأخر</span>
        </div>
        {delayedAdminOrders.length === 0 ? (
          <div className="admin-late-empty">
            الوضع جيد، ماكو طلبات متأخرة حاليًا.
          </div>
        ) : (
          <div className="admin-late-list">
            {topDelayedAdminOrders.map((order) => (
              <div className="admin-late-card" key={`late-${order.id}`}>
                <div>
                  <strong>طلب رقم {order.id}</strong>
                  <span>
                    {order.status} - متأخر {formatDelayMinutes(order.delayMinutes)}
                  </span>
                  <small>
                    {order.customer} / {order.area} / {formatOrderItems(order.items)}
                  </small>
                </div>
                <button onClick={() => focusOrder(order)} type="button">
                  افتح الطلب
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="admin-section">
        <div className="admin-monitor-header">
          <div>
            <h3>مراقبة مباشرة</h3>
            <p>أهم الأشياء التي تحتاج انتباه الإدارة بسرعة.</p>
          </div>
          <span>تحديث مباشر داخل المتصفح</span>
        </div>
        <div className="admin-monitor-grid">
          <div className={monitoringStats.followUpOrders > 0 ? "attention" : ""}>
            <span>طلبات تحتاج متابعة</span>
            <strong>{monitoringStats.followUpOrders}</strong>
            <small>طلبات جديدة أو قيد التجهيز أو جاهزة للتوصيل</small>
          </div>
          <div className={pendingStores.length > 0 ? "attention" : ""}>
            <span>متاجر تنتظر الموافقة</span>
            <strong>{pendingStores.length}</strong>
            <small>لا تظهر للزبائن قبل موافقة الإدارة</small>
          </div>
          <div>
            <span>طلبات قيد التوصيل</span>
            <strong>{monitoringStats.inDeliveryOrders}</strong>
            <small>طلبات عند السائق حاليًا</small>
          </div>
          <div className={canceledOrders.length > 0 ? "warning" : ""}>
            <span>طلبات ملغية</span>
            <strong>{canceledOrders.length}</strong>
            <small>مستبعدة من الأرباح</small>
          </div>
          <div className="profit">
            <span>أرباح اليوم التقريبية</span>
            <strong>{formatMoney(monitoringStats.todayRevenue)}</strong>
            <small>محسوبة من الطلبات المؤرخة بتاريخ اليوم</small>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-monitor-header">
          <div>
            <h3>إحصائيات اليوم</h3>
            <p>ملخص سريع للطلبات المسجلة بتاريخ اليوم فقط.</p>
          </div>
          <span>{formatTodayLabel()}</span>
        </div>
        <div className="today-stats-grid">
          <div>
            <span>طلبات اليوم</span>
            <strong>{todayStats.orders}</strong>
          </div>
          <div>
            <span>مبيعات اليوم</span>
            <strong>{formatMoney(todayStats.sales)}</strong>
          </div>
          <div>
            <span>عمولة اليوم</span>
            <strong>{formatMoney(todayStats.commission)}</strong>
          </div>
          <div>
            <span>توصيل اليوم</span>
            <strong>{formatMoney(todayStats.delivery)}</strong>
          </div>
          <div className="warning">
            <span>ملغية اليوم</span>
            <strong>{todayStats.canceled}</strong>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-monitor-header">
          <div>
            <h3>إحصائيات الأسبوع</h3>
            <p>ملخص آخر 7 أيام حتى تعرف حركة المول مو بس اليوم.</p>
          </div>
          <span>آخر 7 أيام</span>
        </div>
        <div className="today-stats-grid week-stats-grid">
          <div>
            <span>طلبات الأسبوع</span>
            <strong>{weekStats.orders}</strong>
          </div>
          <div>
            <span>مبيعات الأسبوع</span>
            <strong>{formatMoney(weekStats.sales)}</strong>
          </div>
          <div>
            <span>عمولة الأسبوع</span>
            <strong>{formatMoney(weekStats.commission)}</strong>
          </div>
          <div>
            <span>توصيل الأسبوع</span>
            <strong>{formatMoney(weekStats.delivery)}</strong>
          </div>
          <div className="warning">
            <span>ملغية بالأسبوع</span>
            <strong>{weekStats.canceled}</strong>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-monitor-header">
          <div>
            <h3>أفضل المتاجر هذا الأسبوع</h3>
            <p>ترتيب المتاجر حسب مبيعات آخر 7 أيام، بدون الطلبات الملغية.</p>
          </div>
          <span>{topWeeklyStores.length} متاجر نشطة</span>
        </div>
        {topWeeklyStores.length === 0 ? (
          <div className="top-store-empty">لا توجد مبيعات خلال آخر 7 أيام بعد.</div>
        ) : (
          <div className="top-store-list">
            {topWeeklyStores.map((store, index) => (
              <div className="top-store-row" key={store.name}>
                <span className="top-store-rank">{index + 1}</span>
                <div>
                  <strong>{store.name}</strong>
                  <small>{store.orders} طلبات خلال الأسبوع</small>
                </div>
                <strong>{formatMoney(store.sales)}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="admin-section">
        <div className="admin-monitor-header">
          <div>
            <h3>أفضل المنتجات هذا الأسبوع</h3>
            <p>أكثر المنتجات طلبًا خلال آخر 7 أيام، بدون الطلبات الملغية.</p>
          </div>
          <span>{topWeeklyProducts.length} منتجات نشطة</span>
        </div>
        {topWeeklyProducts.length === 0 ? (
          <div className="top-store-empty">لا توجد منتجات مطلوبة خلال آخر 7 أيام بعد.</div>
        ) : (
          <div className="top-store-list">
            {topWeeklyProducts.map((product, index) => (
              <div className="top-store-row top-product-row" key={`${product.store}-${product.name}`}>
                <span className="top-store-rank">{index + 1}</span>
                <div>
                  <strong>{product.name}</strong>
                  <small>
                    {product.store} - {product.quantity} قطعة مباعة
                  </small>
                </div>
                <strong>{formatMoney(product.sales)}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="admin-section">
        <h3>نظرة سريعة</h3>
        <p>أرقام مختصرة تساعدك تعرف وضع المول بدون الدخول بالتفاصيل.</p>
        <div className="quick-stats-grid">
          <div className="quick-stat">
            <span>متاجر موافق عليها</span>
            <strong>{approvedStores.length}</strong>
          </div>
          <div className="quick-stat">
            <span>قيد المراجعة</span>
            <strong>{pendingStores.length}</strong>
          </div>
          <div className="quick-stat">
            <span>كل المنتجات</span>
            <strong>{productCount}</strong>
          </div>
          <div className="quick-stat">
            <span>كل الطلبات</span>
            <strong>{allOrders.length}</strong>
          </div>
          <div className="quick-stat wide">
            <span>أفضل متجر بالمبيعات</span>
            <strong>{topStore.name}</strong>
            <small>{topStore.sales > 0 ? formatMoney(topStore.sales) : "لا توجد مبيعات بعد"}</small>
          </div>
        </div>
        <div className="status-breakdown">
          {["طلب جديد", "قيد التجهيز", "جاهز للتوصيل", "قيد التوصيل", "تم التسليم", "ملغي"].map((status) => (
            <div className="status-count" key={status}>
              <span>{status}</span>
              <strong>{allOrders.filter((order) => order.status === status).length}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-section" id="admin-settings">
        <h3>إعدادات العمولة والتوصيل</h3>
        <p>غيّر أجرة كل منطقة، والطلب الجديد ينحسب تلقائيًا حسب عنوان الزبون.</p>
        <div className="settings-grid">
          <label>
            نسبة عمولة الإدارة
            <div className="setting-control">
              <input
                min="0"
                max="30"
                step="1"
                type="number"
                value={Math.round(settings.commissionRate * 100)}
                onChange={(event) =>
                  updateSettings("commissionRate", Number(event.target.value) / 100)
                }
              />
              <span>%</span>
            </div>
          </label>
          <label>
            أجرة التوصيل
            <div className="setting-control">
              <input
                min="0"
                step="500"
                type="number"
                value={settings.deliveryFee}
                onChange={(event) => updateSettings("deliveryFee", Number(event.target.value))}
              />
              <span>د.ع</span>
            </div>
          </label>
        </div>
        <div className="delivery-zone-settings">
          <div className="delivery-zone-settings-header">
            <div>
              <span>تسعيرة مناطق البصرة</span>
              <strong>{Object.keys(settings.deliveryFees ?? {}).length} منطقة</strong>
            </div>
            <small>السعر الاحتياطي أعلاه يُستخدم لأي منطقة قديمة غير موجودة بالقائمة.</small>
          </div>
          <div className="delivery-zone-settings-grid">
            {Object.entries(settings.deliveryFees ?? {}).map(([area, fee]) => (
              <label key={area}>
                {area}
                <div className="setting-control">
                  <input
                    min="0"
                    step="500"
                    type="number"
                    value={fee}
                    onChange={(event) =>
                      updateDeliveryZoneFee(area, Number(event.target.value))
                    }
                  />
                  <span>د.ع</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="admin-section" id="admin-merchant-payouts">
        <div className="admin-driver-header">
          <div>
            <h3>تسويات مستحقات المتاجر</h3>
            <p>الصافي محسوب من الطلبات المسلّمة بعد خصم عمولة Basra Mall.</p>
          </div>
          <span>
            {stores.filter((store) => getMerchantPayoutSummary(store.name, allOrders).remaining > 0).length}
            {" "}متاجر لها مستحقات
          </span>
        </div>
        <div className="admin-driver-list">
          {stores
            .filter((store) => store.status !== "pending" && store.status !== "rejected")
            .map((store) => {
              const payout = getMerchantPayoutSummary(store.name, allOrders)

              return (
                <article className="admin-driver-card approved" key={`payout-${store.name}`}>
                  <div className="admin-driver-identity">
                    <span>{store.category}</span>
                    <strong>{store.name}</strong>
                    <small>{store.ownerName || store.phone}</small>
                  </div>
                  <div className="admin-driver-payout">
                    <div>
                      <span>صافي المستحق</span>
                      <strong>{formatMoney(payout.total)}</strong>
                    </div>
                    <div>
                      <span>تم دفعه</span>
                      <strong>{formatMoney(payout.paid)}</strong>
                    </div>
                    <div className={payout.remaining > 0 ? "due" : ""}>
                      <span>المتبقي</span>
                      <strong>{formatMoney(payout.remaining)}</strong>
                    </div>
                  </div>
                  <div className="admin-driver-actions">
                    {payout.remaining > 0 ? (
                      <button
                        onClick={() => onSettleMerchantEarnings(store.name)}
                        type="button"
                      >
                        تسجيل دفع المتجر
                      </button>
                    ) : (
                      <span className="payout-complete">لا توجد مبالغ متبقية</span>
                    )}
                  </div>
                </article>
              )
            })}
        </div>
      </section>

      <section className="admin-section" id="admin-drivers">
        <div className="admin-driver-header">
          <div>
            <h3>اعتماد حسابات السائقين</h3>
            <p>السائق الجديد ما يشوف مهام التوصيل إلا بعد موافقة الإدارة.</p>
          </div>
          <span>{drivers.filter((driver) => driver.status === "pending").length} بانتظار القرار</span>
        </div>
        {drivers.length === 0 ? (
          <div className="empty-search">ماكو حسابات سائقين مسجلة حاليًا.</div>
        ) : (
          <div className="admin-driver-list">
            {drivers.map((driver) => {
              const payout = getDriverPayoutSummary(driver.id, allOrders)

              return (
                <article className={`admin-driver-card ${driver.status}`} key={driver.id}>
                  <div className="admin-driver-identity">
                    <span>{getDriverApprovalLabel(driver.status)}</span>
                    <strong>{driver.name}</strong>
                    <small>{driver.phone}</small>
                  </div>
                  <div className="admin-driver-payout">
                    <div>
                      <span>إجمالي المستحق</span>
                      <strong>{formatMoney(payout.total)}</strong>
                    </div>
                    <div>
                      <span>تم دفعه</span>
                      <strong>{formatMoney(payout.paid)}</strong>
                    </div>
                    <div className={payout.remaining > 0 ? "due" : ""}>
                      <span>المتبقي</span>
                      <strong>{formatMoney(payout.remaining)}</strong>
                    </div>
                  </div>
                  <div className="admin-driver-actions">
                    {payout.remaining > 0 && (
                      <button
                        onClick={() => onSettleDriverEarnings(driver.id)}
                        type="button"
                      >
                        تسجيل دفع المستحق
                      </button>
                    )}
                    {driver.status !== "approved" && (
                      <button
                        onClick={() => onUpdateDriverApproval(driver.id, "approved")}
                        type="button"
                      >
                        قبول السائق
                      </button>
                    )}
                    {driver.status !== "rejected" && (
                      <button
                        className="reject"
                        onClick={() => onUpdateDriverApproval(driver.id, "rejected")}
                        type="button"
                      >
                        رفض
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="admin-section" id="admin-password">
        <h3>تغيير كلمة مرور الإدارة</h3>
        <p>اختار كلمة خاصة بيك من 8 أحرف أو أكثر، ولا تشاركها ويا أي شخص.</p>
        <div className="settings-grid">
          <label>
            كلمة المرور الجديدة
            <div className="setting-control">
              <input
                autoComplete="new-password"
                onChange={(event) => setNewAdminPassword(event.target.value)}
                placeholder="8 أحرف أو أكثر"
                type="password"
                value={newAdminPassword}
              />
            </div>
          </label>
          <label>
            تأكيد كلمة المرور
            <div className="setting-control">
              <input
                autoComplete="new-password"
                onChange={(event) => setConfirmAdminPassword(event.target.value)}
                placeholder="اكتبها مرة ثانية"
                type="password"
                value={confirmAdminPassword}
              />
            </div>
          </label>
        </div>
        <button disabled={passwordLoading} onClick={saveAdminPassword} type="button">
          {passwordLoading ? "جاري الحفظ..." : "حفظ كلمة المرور الجديدة"}
        </button>
        {passwordMessage && <div className="order-message">{passwordMessage}</div>}
      </section>

      <section className="admin-section danger-zone" id="admin-data">
        <div>
          <h3>إدارة البيانات التجريبية</h3>
          <p>نزّل نسخة احتياطية قبل المسح حتى تحتفظ ببيانات المتاجر والطلبات الحالية.</p>
        </div>
        <div className="data-management-actions">
          <button className="check-data-button" onClick={checkDataHealth}>
            فحص البيانات
          </button>
          <button className="backup-data-button" onClick={downloadBackup}>
            تنزيل نسخة احتياطية
          </button>
          <label className="import-data-button">
            استيراد نسخة احتياطية
            <input accept=".json,application/json" onChange={importBackup} type="file" />
          </label>
          <button className="reset-data-button" onClick={() => setPendingResetData(true)}>
            مسح البيانات التجريبية
          </button>
        </div>
        {pendingImportFile && (
          <div className="sensitive-confirm-card admin-confirm-card">
            <div>
              <strong>تأكيد استيراد النسخة الاحتياطية</strong>
              <span>
                الملف المختار: {pendingImportFile.name}. الاستيراد راح يستبدل البيانات الحالية
                ببيانات الملف.
              </span>
            </div>
            <div className="sensitive-confirm-actions">
              <button onClick={confirmImportBackup} type="button">
                نعم، استورد الملف
              </button>
              <button onClick={() => setPendingImportFile(null)} type="button">
                تراجع
              </button>
            </div>
          </div>
        )}
        {pendingResetData && (
          <div className="sensitive-confirm-card admin-confirm-card">
            <div>
              <strong>تأكيد مسح البيانات التجريبية</strong>
              <span>
                راح ترجع المتاجر والطلبات والسلة للبداية. نزّل نسخة احتياطية إذا تحتاجها.
              </span>
            </div>
            <div className="sensitive-confirm-actions">
              <button onClick={confirmResetData} type="button">
                نعم، امسح البيانات
              </button>
              <button onClick={() => setPendingResetData(false)} type="button">
                تراجع
              </button>
            </div>
          </div>
        )}
        <div className="last-save-card">
          <span>آخر حفظ ناجح</span>
          <strong>{formatLastSaveTime(lastSaveTime)}</strong>
          <small>إذا تغيرت البيانات، المفروض يتحدث هذا الوقت تلقائيًا.</small>
        </div>
        {dataMessage && <div className="admin-success-message">{dataMessage}</div>}
        {dataCheck && (
          <div className={`data-check-result ${dataCheck.level}`}>
            <strong>{dataCheck.title}</strong>
            <div className="data-check-grid">
              {dataCheck.items.map((item) => (
                <span key={item.label}>
                  {item.label}: <b>{item.value}</b>
                </span>
              ))}
            </div>
            <small>{dataCheck.note}</small>
          </div>
        )}
      </section>

      <section className="admin-section" id="admin-financial-reports">
        <div className="revenue-section-header">
          <div>
            <h3>التقارير المالية</h3>
            <p>حسابات فعلية من الطلبات المسلّمة، مع متابعة المدفوع والمتبقي.</p>
          </div>
          <div className="financial-report-actions">
            <span>{getRevenuePeriodLabel(revenuePeriodFilter)}</span>
            <button onClick={exportFinancialReport} type="button">
              تنزيل التقرير CSV
            </button>
          </div>
        </div>
        <div className="revenue-period-filter">
          {revenuePeriodFilters.map((filter) => (
            <button
              className={revenuePeriodFilter === filter ? "active" : ""}
              key={filter}
              onClick={() => setRevenuePeriodFilter(filter)}
              type="button"
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="revenue-grid">
          <div className="revenue-row">
            <span>مبيعات الطلبات المسلّمة</span>
            <strong>{formatMoney(revenuePeriodStats.sales)}</strong>
          </div>
          <div className="revenue-row">
            <span>عدد الطلبات المسلّمة</span>
            <strong>{revenuePeriodStats.deliveredCount}</strong>
          </div>
          <div className="revenue-row">
            <span>عمولة الإدارة</span>
            <strong>{formatMoney(revenuePeriodStats.commission)}</strong>
          </div>
          <div className="revenue-row">
            <span>صافي مستحقات المتاجر</span>
            <strong>{formatMoney(revenuePeriodStats.merchantNet)}</strong>
          </div>
          <div className="revenue-row">
            <span>المدفوع للمتاجر</span>
            <strong>{formatMoney(revenuePeriodStats.merchantPaid)}</strong>
          </div>
          <div className="revenue-row due">
            <span>المتبقي للمتاجر</span>
            <strong>{formatMoney(revenuePeriodStats.merchantRemaining)}</strong>
          </div>
          <div className="revenue-row">
            <span>أجور السائقين</span>
            <strong>{formatMoney(revenuePeriodStats.driverFees)}</strong>
          </div>
          <div className="revenue-row">
            <span>المدفوع للسائقين</span>
            <strong>{formatMoney(revenuePeriodStats.driverPaid)}</strong>
          </div>
          <div className="revenue-row due">
            <span>المتبقي للسائقين</span>
            <strong>{formatMoney(revenuePeriodStats.driverRemaining)}</strong>
          </div>
          <div className="revenue-row total">
            <span>دخل المنصة من العمولة</span>
            <strong>{formatMoney(revenuePeriodStats.commission)}</strong>
          </div>
        </div>
      </section>

      <section className="admin-section" id="admin-coupons">
        <div className="admin-monitor-header">
          <div>
            <h3>كوبونات الخصم</h3>
            <p>أنشئ كود خصم وحدد قيمته وصلاحيته وعدد مرات استخدامه.</p>
          </div>
          <span>{coupons.filter(isCouponActive).length} كوبون فعال</span>
        </div>
        <form className="coupon-admin-form" onSubmit={submitCoupon}>
          <label>
            رمز الكوبون
            <input
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
              placeholder="BASRA10"
            />
          </label>
          <label>
            نوع الخصم
            <select value={couponType} onChange={(event) => setCouponType(event.target.value)}>
              <option value="percentage">نسبة مئوية</option>
              <option value="fixed">مبلغ ثابت</option>
            </select>
          </label>
          <label>
            قيمة الخصم
            <input min="1" type="number" value={couponValue} onChange={(event) => setCouponValue(event.target.value)} />
          </label>
          <label>
            الحد الأدنى للطلب
            <input min="0" type="number" value={couponMinimum} onChange={(event) => setCouponMinimum(event.target.value)} />
          </label>
          <label>
            عدد مرات الاستخدام
            <input min="1" type="number" value={couponMaxUses} onChange={(event) => setCouponMaxUses(event.target.value)} />
          </label>
          <label>
            تاريخ الانتهاء
            <input type="datetime-local" value={couponExpiresAt} onChange={(event) => setCouponExpiresAt(event.target.value)} />
          </label>
          <button type="submit">إنشاء الكوبون</button>
        </form>
        {couponMessage && <div className="order-message">{couponMessage}</div>}
        <div className="coupon-admin-list">
          {coupons.length === 0 ? (
            <div className="empty-search">ماكو كوبونات منشأة بعد.</div>
          ) : coupons.map((coupon) => (
            <article className={isCouponActive(coupon) ? "active" : "inactive"} key={coupon.id}>
              <div>
                <strong>{coupon.code}</strong>
                <span>
                  {coupon.discountType === "percentage"
                    ? `${coupon.discountValue}%`
                    : formatMoney(coupon.discountValue)}
                </span>
              </div>
              <small>الحد الأدنى: {formatMoney(coupon.minimumOrder)}</small>
              <small>الاستخدام: {coupon.usedCount} من {coupon.maxUses}</small>
              <small>الانتهاء: {formatOrderDate(coupon.expiresAt)}</small>
              <button
                onClick={() => toggleCoupon(coupon)}
                type="button"
              >
                {coupon.isActive ? "إيقاف" : "تفعيل"}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-section" id="admin-offers">
        <div className="admin-monitor-header">
          <div>
            <h3>العروض النشطة</h3>
            <p>متابعة خصومات المتاجر وأسعارها ووقت انتهائها من مكان واحد.</p>
          </div>
          <span>{activeOffers.length} عرض نشط</span>
        </div>
        {activeOffers.length === 0 ? (
          <div className="empty-search">ماكو عروض نشطة حاليًا.</div>
        ) : (
          <div className="admin-offers-grid">
            {activeOffers.map((product) => (
              <article key={`${product.storeName}-${product.name}`}>
                <span>{product.storeName}</span>
                <strong>{product.name}</strong>
                <div>
                  <del>{product.originalPrice}</del>
                  <b>{product.price}</b>
                </div>
                <small>
                  خصم {product.discountPercent}% — ينتهي {formatOrderDate(product.discountEndsAt)}
                </small>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="admin-section" id="admin-stores">
        <div className="admin-monitor-header">
          <div>
            <h3>المتاجر داخل المول</h3>
            <p>تابع المتاجر حسب الحالة حتى تعرف شنو يحتاج موافقة أو مراجعة.</p>
          </div>
          <span>{filteredStores.length} متجر ظاهر</span>
        </div>
        <div className="admin-store-status-summary">
          <button
            className={storeStatusFilter === "pending" ? "active pending" : "pending"}
            onClick={() => setStoreStatusFilter("pending")}
            type="button"
          >
            <span>بانتظار الموافقة</span>
            <strong>{pendingStores.length}</strong>
          </button>
          <button
            className={storeStatusFilter === "approved" ? "active approved" : "approved"}
            onClick={() => setStoreStatusFilter("approved")}
            type="button"
          >
            <span>مقبولة</span>
            <strong>{approvedStores.length}</strong>
          </button>
          <button
            className={storeStatusFilter === "rejected" ? "active rejected" : "rejected"}
            onClick={() => setStoreStatusFilter("rejected")}
            type="button"
          >
            <span>مرفوضة</span>
            <strong>{rejectedStores.length}</strong>
          </button>
        </div>
        <div className="admin-store-filter">
          {storeStatusFilters.map((filter) => (
            <button
              className={storeStatusFilter === filter.value ? "active" : ""}
              key={filter.value}
              onClick={() => setStoreStatusFilter(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
        <label className="admin-store-search">
          بحث المتاجر
          <input
            value={storeSearch}
            onChange={(event) => setStoreSearch(event.target.value)}
            placeholder="اسم المتجر، صاحب المتجر، الهاتف، المنطقة، أو النوع"
          />
        </label>
        <label className="admin-store-sort">
          ترتيب المتاجر
          <select value={storeSort} onChange={(event) => setStoreSort(event.target.value)}>
            {storeSortOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <div className="filter-summary store-result-summary">
          <div>
            <strong>{filteredStores.length}</strong>
            <span>
              {hasAdminStoreFilters ? "متاجر مطابقة للبحث والفلتر" : "كل المتاجر المسجلة"}
            </span>
          </div>
          {hasAdminStoreFilters && (
            <button onClick={resetAdminStoreFilters} type="button">
              عرض كل المتاجر
            </button>
          )}
        </div>
        <div className="admin-table">
          <div className="admin-table-head">
            <span>اسم المتجر</span>
            <span>النوع</span>
            <span>الحالة</span>
            <span>إجراء</span>
          </div>
          {filteredStores.length === 0 ? (
            <div className="admin-table-empty">
              <strong>لا توجد متاجر مطابقة</strong>
              <span>غيّر البحث أو الفلتر حتى تظهر متاجر ثانية.</span>
              <button onClick={resetAdminStoreFilters} type="button">
                عرض كل المتاجر
              </button>
            </div>
          ) : (
            filteredStores.map((store) => (
              <div className={`admin-table-row store-${getStoreStatusClass(store.status)}`} key={store.name}>
                <span>
                  {store.name}
                  {store.ownerName && <small>صاحب المتجر: {store.ownerName}</small>}
                  {store.phone && <small>الهاتف: {store.phone}</small>}
                </span>
                <span>
                  {store.category}
                  <small>
                    {store.area} - {store.products.length} منتجات
                  </small>
                </span>
                <span>
                  <strong>{getStoreStatusLabel(store.status)}</strong>
                  <small>{getStoreStatusNote(store.status)}</small>
                </span>
                <span>
                  {store.status === "pending" ? (
                    <div className="approval-actions store-review-actions">
                      <label>
                        سبب الرفض
                        <select
                          value={storeRejectReasons[store.name] ?? rejectionReasons[0]}
                          onChange={(event) => updateRejectReason(store.name, event.target.value)}
                        >
                          {rejectionReasons.map((reason) => (
                            <option key={reason}>{reason}</option>
                          ))}
                        </select>
                      </label>
                      <input
                        value={storeRejectReasons[store.name] ?? rejectionReasons[0]}
                        onChange={(event) => updateRejectReason(store.name, event.target.value)}
                        placeholder="اكتب أو عدّل سبب الرفض"
                      />
                      <button className="approve-button" onClick={() => onApproveStore(store.name)}>
                        موافقة
                      </button>
                      <button
                        className="reject-button"
                        onClick={() => setPendingRejectStoreName(store.name)}
                      >
                        رفض
                      </button>
                      {pendingRejectStoreName === store.name && (
                        <div className="sensitive-confirm-card">
                          <div>
                            <strong>تأكيد رفض متجر {store.name}</strong>
                            <span>
                              راح ينحفظ سبب الرفض وينشال المتجر من واجهة الزبائن.
                            </span>
                          </div>
                          <div className="sensitive-confirm-actions">
                            <button onClick={() => rejectStoreWithReason(store.name)} type="button">
                              نعم، ارفض المتجر
                            </button>
                            <button onClick={() => setPendingRejectStoreName("")} type="button">
                              تراجع
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : store.status === "rejected" ? (
                    <div className="rejected-store-actions">
                      <span className="store-status-action rejected">
                        {store.rejectionReason || "راجع بيانات المتجر"}
                      </span>
                      <button onClick={() => reviewRejectedStore(store.name)} type="button">
                        إعادة مراجعة
                      </button>
                    </div>
                  ) : (
                    <span className="store-status-action approved">ظاهر للزبائن</span>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="admin-section" id="admin-orders">
        <div className="section-header-actions">
          <div>
            <h3>متابعة الطلبات</h3>
            <p>فلتر وابحث ورتب الطلبات، ثم صدّر نفس النتائج الظاهرة.</p>
          </div>
          <button className="export-orders-button" onClick={exportOrders}>
            تصدير النتائج الظاهرة
          </button>
        </div>
        <label className="admin-order-search">
          بحث الطلبات
          <input
            value={orderSearch}
            onChange={(event) => setOrderSearch(event.target.value)}
            placeholder="رقم الطلب، الزبون، الهاتف، المنطقة، أو المنتج"
          />
        </label>
        <label className="admin-order-sort">
          فرز الطلبات
          <select value={orderSort} onChange={(event) => setOrderSort(event.target.value)}>
            {orderSortOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <div className="admin-order-filter">
          {orderStatusFilters.map((status) => (
            <button
              className={orderStatusFilter === status ? "active" : ""}
              key={status}
              onClick={() => setOrderStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="admin-order-filter date-filter">
          {orderDateFilters.map((filter) => (
            <button
              className={orderDateFilter === filter ? "active" : ""}
              key={filter}
              onClick={() => setOrderDateFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="filter-summary order-result-summary">
          <div>
            <strong>{filteredOrders.length}</strong>
            <span>
              {hasAdminOrderFilters ? "طلبات مطابقة للبحث والفلاتر" : "كل طلبات الإدارة"}
            </span>
          </div>
          {hasAdminOrderFilters && (
            <button onClick={resetAdminOrderFilters} type="button">
              عرض كل الطلبات
            </button>
          )}
        </div>
        {allOrders.length === 0 ? (
          <div className="order-card">
            <h3>لا توجد طلبات بعد</h3>
            <p className="order-meta">أرسل طلب من واجهة الزبون حتى يظهر هنا.</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="order-card">
            <h3>لا توجد طلبات مطابقة</h3>
            <p className="order-meta">غيّر البحث أو الفلتر حتى تظهر طلبات ثانية.</p>
            <button onClick={resetAdminOrderFilters} type="button">
              عرض كل الطلبات
            </button>
          </div>
        ) : (
          <div className="admin-order-list">
            {filteredOrders.map((order) => (
              <div className="order-card" key={`admin-${order.id}`}>
                <div className="order-card-top">
                  <h3>طلب رقم {order.id}</h3>
                  <span className="status-pill">{order.status}</span>
                </div>
                <div className="order-meta">
                  وقت الطلب: {formatOrderDate(order.createdAt)}
                  <br />
                  الزبون: {order.customer}
                  <br />
                  الهاتف: {order.phone}
                  <br />
                  المنطقة: {order.area}
                  {order.landmark && (
                    <>
                      <br />
                      الدلالة: {order.landmark}
                    </>
                  )}
                  {order.notes && (
                    <>
                      <br />
                      ملاحظات: {order.notes}
                    </>
                  )}
                  <br />
                  طريقة الدفع: {order.paymentMethod ?? "الدفع عند الاستلام"}
                </div>
                <div className="order-products">
                  المنتجات: {formatOrderItems(order.items)}
                </div>
                {order.total && <div className="order-total">المبلغ النهائي: {formatMoney(order.total)}</div>}
                {order.status !== "ملغي" && (
                  <div className="admin-profit-line">
                    عمولة الإدارة: {formatMoney(order.subtotal * commissionRate)}
                    {order.status === "تم التسليم" && (
                      <> + توصيل: {formatMoney(order.deliveryFee)}</>
                    )}
                  </div>
                )}
                {order.status !== "تم التسليم" && order.status !== "ملغي" && (
                  <label className="order-status-control">
                    تحديث حالة الطلب
                    <select
                      onChange={(event) => onUpdateOrderStatus(order.id, event.target.value)}
                      value={order.status}
                    >
                      <option value="طلب جديد">طلب جديد</option>
                      <option value="قيد التجهيز">قيد التجهيز</option>
                      <option value="جاهز للتوصيل">جاهز للتوصيل</option>
                      <option value="قيد التوصيل">قيد التوصيل</option>
                      <option value="تم التسليم">تم التسليم</option>
                      <option value="ملغي">ملغي</option>
                    </select>
                  </label>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )

  function updateSettings(field, value) {
    if (!Number.isFinite(value) || value < 0) {
      return
    }

    onSettingsChange((currentSettings) => ({
      ...currentSettings,
      [field]: value,
    }))
  }

  function updateDeliveryZoneFee(area, value) {
    if (!Number.isFinite(value) || value < 0) return

    onSettingsChange((currentSettings) => ({
      ...currentSettings,
      deliveryFees: {
        ...currentSettings.deliveryFees,
        [area]: value,
      },
    }))
  }

  function confirmResetData() {
    onResetData()
    setPendingResetData(false)
    setDataMessage(
      "تم مسح البيانات التجريبية ورجع التطبيق للبداية. تقدر تبدأ اختبار جديد ببيانات نظيفة.",
    )
  }

  function downloadBackup() {
    onExportBackup()
    setDataMessage("تم تجهيز ملف النسخة الاحتياطية. احتفظ بيه حتى ترجع البيانات لاحقًا.")
  }

  function checkDataHealth() {
    const missingStores = stores.filter(
      (store) => !store.name || !store.category || !store.area || !store.phone,
    )
    const storesWithoutProducts = stores.filter((store) => store.products.length === 0)
    const ordersWithoutItems = allOrders.filter(
      (order) => !Array.isArray(order.items) || order.items.length === 0,
    )
    const missingOrderCustomers = allOrders.filter(
      (order) => !order.customer || !order.phone || !order.area,
    )
    const issueCount =
      missingStores.length +
      ordersWithoutItems.length +
      missingOrderCustomers.length

    setDataCheck({
      level: issueCount > 0 ? "warning" : "good",
      title: issueCount > 0 ? "البيانات تحتاج مراجعة" : "البيانات سليمة",
      items: [
        { label: "المتاجر", value: stores.length },
        { label: "المنتجات", value: productCount },
        { label: "الطلبات", value: allOrders.length },
        { label: "متاجر بدون منتجات", value: storesWithoutProducts.length },
        { label: "بيانات ناقصة", value: issueCount },
        { label: "آخر حفظ", value: formatLastSaveTime(lastSaveTime) },
      ],
      note:
        issueCount > 0
          ? "راجع المتاجر أو الطلبات التي ناقصة بيانات قبل الاعتماد على النسخة."
          : "الحفظ والبيانات الحالية ظاهرين بشكل جيد داخل التطبيق.",
    })
    setDataMessage("تم فحص البيانات الحالية. راجع نتيجة الفحص حتى تعرف إذا أكو نقص.")
  }

  async function importBackup(event) {
    const backupFile = event.target.files?.[0]
    event.target.value = ""

    if (!backupFile) {
      return
    }

    setPendingImportFile(backupFile)
  }

  async function confirmImportBackup() {
    if (!pendingImportFile) {
      return
    }

    try {
      const backupText = await pendingImportFile.text()
      const backupData = JSON.parse(backupText)
      const imported = onImportBackup(backupData)

      setDataMessage(
        imported
          ? "تم استيراد النسخة الاحتياطية بنجاح. راجع المتاجر والطلبات قبل تكمل الشغل."
          : "ما قدرنا نستورد هذا الملف. اختار ملف نسخة احتياطية صادر من نفس التطبيق.",
      )
    } catch {
      setDataMessage("تعذر قراءة ملف النسخة الاحتياطية. تأكد أن الملف بصيغة JSON وما متغيّر يدويًا.")
    } finally {
      setPendingImportFile(null)
    }
  }

  function scrollToAdminSection(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" })
  }

  function goToStoreReview(statusFilter) {
    setStoreStatusFilter(statusFilter)
    scrollToAdminSection("admin-stores")
  }

  function goToOrderReview(statusFilter) {
    setOrderStatusFilter(statusFilter)
    setOrderDateFilter("كل الطلبات")
    setOrderSearch("")
    scrollToAdminSection("admin-orders")
  }

  function focusOrder(order) {
    setOrderStatusFilter(order.status)
    setOrderDateFilter("كل الطلبات")
    setOrderSearch(String(order.id))
    scrollToAdminSection("admin-orders")
  }

  function resetAdminStoreFilters() {
    setStoreSearch("")
    setStoreStatusFilter(storeStatusFilters[0].value)
  }

  function updateRejectReason(storeName, reason) {
    setStoreRejectReasons((currentReasons) => ({
      ...currentReasons,
      [storeName]: reason,
    }))
  }

  function rejectStoreWithReason(storeName) {
    const reason = (storeRejectReasons[storeName] ?? rejectionReasons[0]).trim()

    onRejectStore(storeName, reason || "بيانات المتجر تحتاج توضيح أكثر.")
    setPendingRejectStoreName("")
    setStoreStatusFilter("rejected")
  }

  function reviewRejectedStore(storeName) {
    onReviewStoreAgain(storeName)
    setStoreStatusFilter("pending")
  }

  function exportOrders() {
    if (filteredOrders.length === 0) {
      setDataMessage("ماكو طلبات مطابقة حتى نصدرها. غيّر البحث أو الفلتر وبعدها جرّب التصدير.")
      return
    }

    const rows = [
      [
        "رقم الطلب",
        "الزبون",
        "الهاتف",
        "المنطقة",
        "الحالة",
        "وقت الطلب",
        "طريقة الدفع",
        "المنتجات",
        "مجموع المنتجات",
        "أجرة التوصيل",
        "المبلغ النهائي",
      ],
      ...filteredOrders.map((order) => [
        order.id,
        order.customer,
        order.phone,
        order.area,
        order.status,
        formatOrderDate(order.createdAt),
        order.paymentMethod ?? "الدفع عند الاستلام",
        formatOrderItems(order.items),
        order.subtotal,
        order.deliveryFee,
        order.total,
      ]),
    ]
    const csvContent = rows.map((row) => row.map(formatCsvCell).join(",")).join("\n")
    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = "basra-mall-visible-orders.csv"
    link.click()
    URL.revokeObjectURL(url)
    setDataMessage("تم تجهيز ملف النتائج الظاهرة حسب البحث والفلتر الحالي.")
  }

  function exportProjectSummary() {
    const summaryText = formatProjectSummaryText(projectSummary, lastSaveTime)
    const blob = new Blob([`\uFEFF${summaryText}`], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = "basra-mall-project-summary.txt"
    link.click()
    URL.revokeObjectURL(url)
    setDataMessage("تم تجهيز ملف ملخص المشروع.")
  }

  function exportFinancialReport() {
    const deliveredPeriodOrders = revenuePeriodOrders.filter(
      (order) => order.status === "تم التسليم",
    )
    const rows = [
      ["تقرير Basra Mall المالي", getRevenuePeriodLabel(revenuePeriodFilter)],
      ["عدد الطلبات المسلّمة", revenuePeriodStats.deliveredCount],
      ["إجمالي المبيعات", revenuePeriodStats.sales],
      ["عمولة الإدارة", revenuePeriodStats.commission],
      ["صافي مستحقات المتاجر", revenuePeriodStats.merchantNet],
      ["المدفوع للمتاجر", revenuePeriodStats.merchantPaid],
      ["المتبقي للمتاجر", revenuePeriodStats.merchantRemaining],
      ["أجور السائقين", revenuePeriodStats.driverFees],
      ["المدفوع للسائقين", revenuePeriodStats.driverPaid],
      ["المتبقي للسائقين", revenuePeriodStats.driverRemaining],
      [],
      [
        "رقم الطلب",
        "التاريخ",
        "المتجر",
        "الزبون",
        "المنطقة",
        "المبيعات",
        "العمولة",
        "صافي المتجر",
        "تسوية المتجر",
        "أجرة السائق",
        "تسوية السائق",
      ],
      ...deliveredPeriodOrders.map((order) => {
        const rate = Number(order.commissionRate ?? commissionRate)
        const subtotal = Number(order.subtotal ?? 0)

        return [
          order.id,
          formatOrderDate(order.createdAt),
          order.storeName ?? getOrderStoreNames(order),
          order.customer,
          order.area,
          subtotal,
          subtotal * rate,
          subtotal * (1 - rate),
          order.merchantPayoutStatus === "paid" ? "مدفوع" : "متبقي",
          Number(order.deliveryFee ?? 0),
          order.driverPayoutStatus === "paid" ? "مدفوع" : "متبقي",
        ]
      }),
    ]

    downloadCsvFile(rows, `basra-mall-financial-${getReportFilePeriod(revenuePeriodFilter)}.csv`)
    setDataMessage("تم تنزيل التقرير المالي للفترة المختارة.")
  }

  async function submitCoupon(event) {
    event.preventDefault()
    const value = Number(couponValue)
    const minimumOrder = Number(couponMinimum)
    const maxUses = Number(couponMaxUses)

    if (
      !couponCode.trim() ||
      !Number.isFinite(value) ||
      value <= 0 ||
      (couponType === "percentage" && value > 100) ||
      !Number.isFinite(minimumOrder) ||
      minimumOrder < 0 ||
      !Number.isInteger(maxUses) ||
      maxUses <= 0 ||
      !couponExpiresAt ||
      new Date(couponExpiresAt).getTime() <= Date.now()
    ) {
      setCouponMessage("راجع بيانات الكوبون: الرمز والقيمة والصلاحية وعدد الاستخدامات مطلوبة.")
      return
    }

    const saved = await onAddCoupon({
      code: couponCode,
      discountType: couponType,
      discountValue: value,
      minimumOrder,
      maxUses,
      expiresAt: new Date(couponExpiresAt).toISOString(),
      isActive: true,
    })

    if (!saved) {
      setCouponMessage("تعذر إنشاء الكوبون. يمكن الرمز مستخدم من قبل.")
      return
    }

    setCouponCode("")
    setCouponValue("")
    setCouponMinimum("0")
    setCouponMaxUses("100")
    setCouponExpiresAt("")
    setCouponMessage("تم إنشاء الكوبون وصار متاحًا للزبائن.")
  }

  async function toggleCoupon(coupon) {
    const saved = await onUpdateCoupon(coupon.id, { isActive: !coupon.isActive })
    setCouponMessage(saved ? "تم تحديث حالة الكوبون." : "تعذر تحديث حالة الكوبون.")
  }
}

function formatOrderItems(items) {
  return items.map((item) => `${item.name} × ${item.quantity}`).join("، ")
}

function formatProjectSummaryText(projectSummary, lastSaveTime) {
  return [
    "ملخص مشروع مول البصرة",
    "======================",
    "",
    `درجة الجاهزية: ${projectSummary.score}%`,
    `الحالة: ${projectSummary.title}`,
    `آخر حفظ داخل المتصفح: ${formatLastSaveTime(lastSaveTime)}`,
    "آخر حفظ Git: يدوي من الطرفية",
    "",
    "أرقام المشروع",
    "------------",
    ...projectSummary.stats.map((item) => `- ${item.label}: ${item.value} (${item.note})`),
    "",
    "شنو موجود حاليًا",
    "----------------",
    ...projectSummary.readyFeatures.map((feature) => `- ${feature}`),
    "",
    "شنو باقي قبل الاحتراف",
    "----------------------",
    ...projectSummary.nextSteps.map((step) => `- ${step}`),
    "",
    "قائمة مهام قبل الإطلاق",
    "----------------------",
    ...projectSummary.launchChecklist.map(
      (task) => `- ${task.title}: ${task.statusLabel} - ${task.note}`,
    ),
    "",
    "خريطة مراحل التطوير",
    "-------------------",
    ...projectSummary.developmentRoadmap.map(
      (stage) => `- ${stage.phase}: ${stage.title} - ${stage.note}`,
    ),
    "",
    "ملاحظات النسخة الحالية",
    "----------------------",
    ...projectSummary.currentVersionNotes.map(
      (note) => `- ${note.title}: ${note.description}`,
    ),
    "",
    "ملاحظة: هذا الملف صادر من النسخة التجريبية داخل المتصفح.",
  ].join("\n")
}

function getTopStore(orders) {
  const storeSales = new Map()

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const currentSales = storeSales.get(item.store) ?? 0

      storeSales.set(item.store, currentSales + getPriceNumber(item.price) * item.quantity)
    })
  })

  const [name = "لا يوجد بعد", sales = 0] =
    [...storeSales.entries()].sort((firstStore, secondStore) => secondStore[1] - firstStore[1])[0] ?? []

  return { name, sales }
}

function getMonitoringStats({ allOrders, commissionRate, pendingStores }) {
  const followUpStatuses = ["طلب جديد", "قيد التجهيز", "جاهز للتوصيل"]
  const todayRevenue = allOrders
    .filter((order) => isToday(order.createdAt) && order.status !== "ملغي")
    .reduce((total, order) => {
      const deliveryIncome = order.status === "تم التسليم" ? Number(order.deliveryFee) : 0

      return total + Number(order.subtotal) * commissionRate + deliveryIncome
    }, 0)

  return {
    followUpOrders: allOrders.filter((order) => followUpStatuses.includes(order.status)).length,
    inDeliveryOrders: allOrders.filter((order) => order.status === "قيد التوصيل").length,
    pendingStores: pendingStores.length,
    todayRevenue,
  }
}

function filterOrdersByRevenuePeriod(orders, period) {
  if (period === "اليوم") {
    return orders.filter((order) => isToday(order.createdAt))
  }

  if (period === "آخر 7 أيام") {
    return orders.filter((order) => isWithinLastDays(order.createdAt, 7))
  }

  if (period === "آخر 30 يوم") {
    return orders.filter((order) => isWithinLastDays(order.createdAt, 30))
  }

  return orders
}

function getFinancialReportStats(orders) {
  const deliveredOrders = orders.filter((order) => order.status === "تم التسليم")
  const totals = deliveredOrders.reduce(
    (report, order) => {
      const subtotal = Number(order.subtotal ?? 0)
      const rate = Number(order.commissionRate ?? 0.05)
      const merchantNet = subtotal * (1 - rate)
      const driverFee = Number(order.deliveryFee ?? 0)

      report.sales += subtotal
      report.commission += subtotal * rate
      report.merchantNet += merchantNet
      report.driverFees += driverFee
      if (order.merchantPayoutStatus === "paid") report.merchantPaid += merchantNet
      if (order.driverPayoutStatus === "paid") report.driverPaid += driverFee
      return report
    },
    {
      commission: 0,
      driverFees: 0,
      driverPaid: 0,
      merchantNet: 0,
      merchantPaid: 0,
      sales: 0,
    },
  )

  return {
    ...totals,
    deliveredCount: deliveredOrders.length,
    driverRemaining: Math.max(totals.driverFees - totals.driverPaid, 0),
    merchantRemaining: Math.max(totals.merchantNet - totals.merchantPaid, 0),
  }
}

function getRevenuePeriodLabel(period) {
  if (period === "اليوم") {
    return "أرقام اليوم فقط"
  }

  if (period === "آخر 7 أيام") {
    return "أرقام آخر أسبوع"
  }

  if (period === "آخر 30 يوم") {
    return "أرقام آخر شهر"
  }

  return "كل بيانات الأرباح"
}

function getReportFilePeriod(period) {
  if (period === "اليوم") return "daily"
  if (period === "آخر 7 أيام") return "weekly"
  if (period === "آخر 30 يوم") return "monthly"
  return "all-time"
}

function getOrderStoreNames(order) {
  return [...new Set((order.items ?? []).map((item) => item.store).filter(Boolean))].join("، ")
}

function downloadCsvFile(rows, fileName) {
  const csvContent = rows.map((row) => row.map(formatCsvCell).join(",")).join("\n")
  const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function getTodayStats(allOrders, commissionRate) {
  const todayOrders = allOrders.filter((order) => isToday(order.createdAt))
  const activeTodayOrders = todayOrders.filter((order) => order.status !== "ملغي")
  const deliveredTodayOrders = todayOrders.filter((order) => order.status === "تم التسليم")

  const sales = activeTodayOrders.reduce(
    (total, order) => total + Number(order.subtotal ?? 0),
    0,
  )
  const delivery = deliveredTodayOrders.reduce(
    (total, order) => total + Number(order.deliveryFee ?? 0),
    0,
  )

  return {
    orders: todayOrders.length,
    sales,
    commission: sales * commissionRate,
    delivery,
    canceled: todayOrders.filter((order) => order.status === "ملغي").length,
  }
}

function getWeekStats(allOrders, commissionRate) {
  const weekOrders = allOrders.filter((order) => isWithinLastDays(order.createdAt, 7))
  const activeWeekOrders = weekOrders.filter((order) => order.status !== "ملغي")
  const deliveredWeekOrders = weekOrders.filter((order) => order.status === "تم التسليم")

  const sales = activeWeekOrders.reduce(
    (total, order) => total + Number(order.subtotal ?? 0),
    0,
  )
  const delivery = deliveredWeekOrders.reduce(
    (total, order) => total + Number(order.deliveryFee ?? 0),
    0,
  )

  return {
    orders: weekOrders.length,
    sales,
    commission: sales * commissionRate,
    delivery,
    canceled: weekOrders.filter((order) => order.status === "ملغي").length,
  }
}

function getTopWeeklyStores(allOrders) {
  const storeStats = new Map()
  const weekOrders = allOrders.filter(
    (order) => order.status !== "ملغي" && isWithinLastDays(order.createdAt, 7),
  )

  weekOrders.forEach((order) => {
    const orderStores = new Set()

    order.items.forEach((item) => {
      const currentStats = storeStats.get(item.store) ?? { name: item.store, orders: 0, sales: 0 }

      currentStats.sales += getPriceNumber(item.price) * item.quantity
      storeStats.set(item.store, currentStats)
      orderStores.add(item.store)
    })

    orderStores.forEach((storeName) => {
      const currentStats = storeStats.get(storeName)

      storeStats.set(storeName, {
        ...currentStats,
        orders: currentStats.orders + 1,
      })
    })
  })

  return [...storeStats.values()]
    .sort((firstStore, secondStore) => secondStore.sales - firstStore.sales)
    .slice(0, 3)
}

function getTopWeeklyProducts(allOrders) {
  const productStats = new Map()
  const weekOrders = allOrders.filter(
    (order) => order.status !== "ملغي" && isWithinLastDays(order.createdAt, 7),
  )

  weekOrders.forEach((order) => {
    order.items.forEach((item) => {
      const productKey = `${item.store}-${item.name}`
      const currentStats = productStats.get(productKey) ?? {
        name: item.name,
        store: item.store,
        quantity: 0,
        sales: 0,
      }

      productStats.set(productKey, {
        ...currentStats,
        quantity: currentStats.quantity + item.quantity,
        sales: currentStats.sales + getPriceNumber(item.price) * item.quantity,
      })
    })
  })

  return [...productStats.values()]
    .sort((firstProduct, secondProduct) => secondProduct.quantity - firstProduct.quantity)
    .slice(0, 3)
}

function getAdminAlerts({ allOrders, canceledOrders, pendingStores }) {
  const alerts = []
  const readyForDeliveryOrders = allOrders.filter((order) => order.status === "جاهز للتوصيل")
  const newOrders = allOrders.filter((order) => order.status === "طلب جديد")

  if (pendingStores.length > 0) {
    alerts.push({
      level: "attention",
      title: "يوجد متجر ينتظر الموافقة",
      message: `${pendingStores.length} متجر يحتاج قرار من الإدارة قبل أن يظهر للزبائن.`,
    })
  }

  if (newOrders.length > 0) {
    alerts.push({
      level: "attention",
      title: "يوجد طلب جديد يحتاج متابعة",
      message: `${newOrders.length} طلب جديد يحتاج قبول وتجهيز من صاحب المتجر.`,
    })
  }

  if (readyForDeliveryOrders.length > 0) {
    alerts.push({
      level: "warning",
      title: "يوجد طلب جاهز للتوصيل",
      message: `${readyForDeliveryOrders.length} طلب جاهز وينتظر السائق حتى يستلمه.`,
    })
  }

  if (canceledOrders.length > 0) {
    alerts.push({
      level: "muted",
      title: "يوجد طلب ملغي",
      message: `${canceledOrders.length} طلب ملغي مستبعد من حساب الأرباح.`,
    })
  }

  if (alerts.length === 0) {
    alerts.push({
      level: "good",
      title: "لا توجد مشاكل حاليًا",
      message: "المتاجر والطلبات بحالة مستقرة ضمن البيانات الحالية.",
    })
  }

  return alerts
}

function getAdminTasks({ allOrders, canceledOrders, pendingStores }) {
  const newOrders = allOrders.filter((order) => order.status === "طلب جديد")
  const readyForDeliveryOrders = allOrders.filter((order) => order.status === "جاهز للتوصيل")
  const inDeliveryOrders = allOrders.filter((order) => order.status === "قيد التوصيل")

  return [
    {
      active: pendingStores.length > 0,
      title: "راجع المتاجر المعلقة",
      description:
        pendingStores.length > 0
          ? `${pendingStores.length} متجر ينتظر الموافقة أو الرفض.`
          : "لا توجد متاجر معلقة حاليًا.",
    },
    {
      active: newOrders.length > 0,
      title: "تابع الطلبات الجديدة",
      description:
        newOrders.length > 0
          ? `${newOrders.length} طلب جديد يحتاج متابعة مع صاحب المتجر.`
          : "لا توجد طلبات جديدة تحتاج متابعة.",
    },
    {
      active: readyForDeliveryOrders.length > 0,
      title: "تأكد من الطلبات الجاهزة للتوصيل",
      description:
        readyForDeliveryOrders.length > 0
          ? `${readyForDeliveryOrders.length} طلب جاهز وينتظر السائق.`
          : "لا توجد طلبات جاهزة تنتظر الاستلام.",
    },
    {
      active: inDeliveryOrders.length > 0,
      title: "راقب الطلبات قيد التوصيل",
      description:
        inDeliveryOrders.length > 0
          ? `${inDeliveryOrders.length} طلب عند السائق حاليًا.`
          : "لا توجد طلبات قيد التوصيل الآن.",
    },
    {
      active: canceledOrders.length > 0,
      title: "راجع الطلبات الملغية",
      description:
        canceledOrders.length > 0
          ? `${canceledOrders.length} طلب ملغي يحتاج مراجعة السبب لاحقًا.`
          : "لا توجد طلبات ملغية تحتاج مراجعة.",
    },
  ]
}

function matchesOrderSearch(order, searchText) {
  const search = searchText.trim().toLowerCase()

  if (!search) {
    return true
  }

  const items = order.items.map((item) => `${item.name} ${item.store}`).join(" ")
  const searchableText = `${order.id} ${order.customer} ${order.phone} ${order.area} ${order.landmark} ${order.notes} ${order.status} ${formatOrderDate(order.createdAt)} ${items}`

  return searchableText.toLowerCase().includes(search)
}

function matchesStoreSearch(store, searchText) {
  const search = searchText.trim().toLowerCase()

  if (!search) {
    return true
  }

  const productNames = store.products.map((product) => product.name).join(" ")
  const statusLabel = getStoreStatusLabel(store.status)
  const statusNote = getStoreStatusNote(store.status)
  const searchableText = `${store.name} ${store.ownerName} ${store.phone} ${store.area} ${store.category} ${store.status} ${statusLabel} ${statusNote} ${store.rejectionReason} ${productNames}`

  return searchableText.toLowerCase().includes(search)
}

function matchesDateFilter(order, dateFilter) {
  if (dateFilter === "طلبات اليوم") {
    return isToday(order.createdAt)
  }

  if (dateFilter === "طلبات قديمة") {
    return !isToday(order.createdAt)
  }

  return true
}

function getDelayedAdminOrders(orders) {
  const delayLimits = {
    "طلب جديد": 15,
    "قيد التجهيز": 30,
    "جاهز للتوصيل": 20,
    "قيد التوصيل": 45,
  }

  return orders
    .map((order) => ({
      ...order,
      delayLimit: delayLimits[order.status],
      delayMinutes: getOrderDelayMinutes(order.createdAt),
    }))
    .filter((order) => order.delayLimit && order.delayMinutes >= order.delayLimit)
    .sort((firstOrder, secondOrder) => secondOrder.delayMinutes - firstOrder.delayMinutes)
}

function getSystemHealthSummary({ allOrders, lastSaveTime, productCount, stores }) {
  const missingStores = stores.filter(
    (store) => !store.name || !store.category || !store.area || !store.phone,
  )
  const storesWithoutProducts = stores.filter((store) => store.products.length === 0)
  const ordersWithoutItems = allOrders.filter(
    (order) => !Array.isArray(order.items) || order.items.length === 0,
  )
  const missingOrderCustomers = allOrders.filter(
    (order) => !order.customer || !order.phone || !order.area,
  )
  const issueCount =
    missingStores.length +
    storesWithoutProducts.length +
    ordersWithoutItems.length +
    missingOrderCustomers.length
  const saveLevel = lastSaveTime ? "good" : "warning"

  return {
    level: issueCount > 0 || !lastSaveTime ? "warning" : "good",
    title: issueCount > 0 || !lastSaveTime ? "يحتاج متابعة" : "مستقر",
    note:
      issueCount > 0
        ? "أكو بيانات تحتاج مراجعة قبل الاعتماد عليها."
        : "البيانات الأساسية والحفظ ظاهرين بشكل جيد.",
    items: [
      { label: "آخر حفظ", value: formatLastSaveTime(lastSaveTime), level: saveLevel },
      { label: "المتاجر", value: stores.length },
      { label: "المنتجات", value: productCount },
      { label: "الطلبات", value: allOrders.length },
      { label: "نواقص البيانات", value: issueCount, level: issueCount > 0 ? "warning" : "good" },
    ],
  }
}

function getAdminActivityLog({
  allOrders,
  delayedAdminOrders,
  focusOrder,
  goToStoreReview,
  pendingStores,
  rejectedStores,
  scrollToAdminSection,
}) {
  const pendingStoreActivities = pendingStores.slice(0, 2).map((store) => ({
    id: `store-pending-${store.name}`,
    level: "attention",
    type: "متجر",
    title: `${store.name} ينتظر قرار الإدارة`,
    note: `${store.ownerName || "صاحب متجر"} / ${store.area || "منطقة غير محددة"}`,
    onClick: () => goToStoreReview("pending"),
  }))
  const delayedOrderActivities = delayedAdminOrders.slice(0, 2).map((order) => ({
    id: `order-delayed-${order.id}`,
    level: "warning",
    type: "طلب متأخر",
    title: `طلب رقم ${order.id} متأخر`,
    note: `${order.status} منذ ${formatDelayMinutes(order.delayMinutes)} / ${order.customer}`,
    onClick: () => focusOrder(order),
  }))
  const newOrderActivities = allOrders
    .filter((order) => order.status === "طلب جديد")
    .slice(0, 2)
    .map((order) => ({
      id: `order-new-${order.id}`,
      level: "attention",
      type: "طلب جديد",
      title: `طلب رقم ${order.id} يحتاج متابعة`,
      note: `${order.customer} / ${order.area} / ${formatOrderItems(order.items)}`,
      onClick: () => focusOrder(order),
    }))
  const canceledOrderActivities = allOrders
    .filter((order) => order.status === "ملغي")
    .slice(0, 1)
    .map((order) => ({
      id: `order-canceled-${order.id}`,
      level: "muted",
      type: "ملغي",
      title: `طلب رقم ${order.id} ملغي`,
      note: `${order.customer} / مستبعد من الأرباح`,
      onClick: () => focusOrder(order),
    }))
  const rejectedStoreActivities = rejectedStores.slice(0, 1).map((store) => ({
    id: `store-rejected-${store.name}`,
    level: "muted",
    type: "متجر مرفوض",
    title: `${store.name} يحتاج إعادة مراجعة`,
    note: store.rejectionReason || "راجع سبب الرفض قبل إعادة المراجعة.",
    onClick: () => goToStoreReview("rejected"),
  }))
  const activities = [
    ...pendingStoreActivities,
    ...delayedOrderActivities,
    ...newOrderActivities,
    ...canceledOrderActivities,
    ...rejectedStoreActivities,
  ].slice(0, 6)

  if (activities.length === 0) {
    return [
      {
        id: "admin-stable",
        level: "good",
        type: "استقرار",
        title: "ماكو أحداث تحتاج متابعة الآن",
        note: "لوحة الإدارة مستقرة حسب البيانات الحالية.",
        onClick: () => scrollToAdminSection("admin-monitor"),
      },
    ]
  }

  return activities
}

function getProjectSummary({
  allOrders,
  approvedStores,
  deliveredOrders,
  lastSaveTime,
  pendingStores,
  productCount,
  rejectedStores,
  stores,
}) {
  const checks = [
    stores.length > 0,
    approvedStores.length > 0,
    productCount > 0,
    allOrders.length > 0,
    Boolean(lastSaveTime),
  ]
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100)
  const level = score >= 80 ? "good" : score >= 50 ? "warning" : "muted"
  const title =
    level === "good"
      ? "جاهزية جيدة للتجربة الموسعة"
      : level === "warning"
        ? "جاهزية متوسطة وتحتاج ترتيب"
        : "بداية جيدة وتحتاج بيانات أكثر"

  return {
    level,
    score,
    title,
    stats: [
      {
        label: "المتاجر",
        note: `${pendingStores.length} قيد المراجعة / ${rejectedStores.length} مرفوضة`,
        value: stores.length,
      },
      {
        label: "المتاجر الظاهرة",
        level: approvedStores.length === 0 ? "warning" : "good",
        note: "هذه المتاجر يراها الزبون داخل المول",
        value: approvedStores.length,
      },
      {
        label: "المنتجات",
        level: productCount === 0 ? "warning" : "good",
        note: "منتجات جاهزة للعرض والطلب",
        value: productCount,
      },
      {
        label: "الطلبات",
        level: allOrders.length === 0 ? "muted" : "good",
        note: `${deliveredOrders.length} طلب وصل لمرحلة التسليم`,
        value: allOrders.length,
      },
    ],
    readyFeatures: [
      "دخول منفصل للزبون وصاحب المتجر والسائق والإدارة",
      "تسجيل المتاجر وموافقة الإدارة مع سبب الرفض",
      "إدارة المنتجات والصور والكميات وحالة المنتج",
      "سلة وطلب مع رقم طلب وطريقة دفع تجريبية",
      "تتبع الطلبات، مهام السائق، والأرباح التقريبية",
      "نسخ احتياطي واستيراد وفحص سريع داخل التطبيق",
    ],
    nextSteps: [
      "ربط قاعدة بيانات حقيقية بدل تخزين المتصفح",
      "تسجيل دخول حقيقي برقم الهاتف أو رمز تحقق",
      "لوحة صلاحيات أقوى للإدارة وأصحاب المتاجر",
      "اختبار تجربة الموبايل على أكثر من حجم شاشة",
      "تجهيز خطة نشر واستضافة ونسخ احتياطي خارج الجهاز",
    ],
    launchChecklist: [
      {
        note: "حاليًا البيانات محفوظة داخل المتصفح مع نسخة احتياطية يدوية.",
        status: "later",
        statusLabel: "يحتاج تنفيذ لاحقًا",
        title: "قاعدة بيانات حقيقية",
      },
      {
        note: "موجود دخول تجريبي بالاسم ورقم الهاتف، والرمز للإدارة فقط.",
        status: "trial",
        statusLabel: "جاهز تجريبيًا",
        title: "تسجيل دخول وفصل الحسابات",
      },
      {
        note: "طريقة الدفع موجودة كاختيار، لكن ماكو بوابة دفع حقيقية بعد.",
        status: "later",
        statusLabel: "يحتاج تنفيذ لاحقًا",
        title: "تجربة دفع حقيقية",
      },
      {
        note: "الواجهة متجاوبة، وتحتاج تجربة فعلية على أكثر من جهاز قبل الإطلاق.",
        status: "trial",
        statusLabel: "جاهز تجريبيًا",
        title: "اختبار الموبايل",
      },
      {
        note: "الإدارة تقدر تغيّر العمولة والتوصيل، لكن السياسة التجارية تحتاج تثبيت.",
        status: "trial",
        statusLabel: "جاهز تجريبيًا",
        title: "سياسة العمولة والتوصيل",
      },
      {
        note: "النسخ الاحتياطي موجود كملف، والنسخة الاحترافية تحتاج حفظ خارج الجهاز.",
        status: "later",
        statusLabel: "يحتاج تنفيذ لاحقًا",
        title: "نسخة احتياطية خارج الجهاز",
      },
    ],
    developmentRoadmap: [
      {
        note: "الواجهات الأساسية موجودة، والبيانات تجريبية داخل المتصفح.",
        phase: "المرحلة 1",
        status: "current",
        title: "النموذج التجريبي الحالي",
      },
      {
        note: "نربط المتاجر والطلبات والمنتجات بقاعدة بيانات بدل التخزين المحلي.",
        phase: "المرحلة 2",
        status: "next",
        title: "نسخة بيانات حقيقية",
      },
      {
        note: "نضيف تسجيل دخول برقم الهاتف ورمز تحقق وصلاحيات ثابتة لكل نوع حساب.",
        phase: "المرحلة 3",
        status: "later",
        title: "نسخة تسجيل دخول حقيقي",
      },
      {
        note: "نجهز الدفع، متابعة السائق، وسياسة التوصيل والعمولات بشكل قابل للتشغيل.",
        phase: "المرحلة 4",
        status: "later",
        title: "نسخة دفع وتوصيل",
      },
      {
        note: "نراجع الأمان، النسخ الاحتياطي، الأداء، وتجربة الموبايل قبل النشر.",
        phase: "المرحلة 5",
        status: "later",
        title: "نسخة إطلاق رسمي",
      },
    ],
    currentVersionNotes: [
      {
        description: "كل البيانات محفوظة داخل متصفح هذا الجهاز، وليست قاعدة بيانات مشتركة.",
        level: "warning",
        title: "تخزين محلي فقط",
      },
      {
        description: "اختيار الدفع موجود للتجربة، لكن ماكو بوابة دفع أو تحويل أموال حقيقي.",
        level: "warning",
        title: "ماكو دفع حقيقي",
      },
      {
        description: "الدخول بالاسم ورقم الهاتف تجريبي، ورمز الإدارة مؤقت وليس نظام أمان حقيقي.",
        level: "warning",
        title: "تسجيل دخول تجريبي",
      },
      {
        description: "النسخ الاحتياطي يتم يدويًا من لوحة الإدارة أو Git من الطرفية.",
        level: "info",
        title: "نسخ احتياطي يدوي",
      },
      {
        description: "الأرباح والعمولات أرقام تقريبية تساعدك تفهم الفكرة قبل الربط الحقيقي.",
        level: "info",
        title: "حسابات تقريبية",
      },
      {
        description: "هذه النسخة مناسبة للاختبار وترتيب الفكرة وتجربة سير العمل قبل البناء الاحترافي.",
        level: "good",
        title: "صالحة للاختبار",
      },
    ],
  }
}

function getOrderDelayMinutes(createdAt) {
  if (!createdAt) {
    return 24 * 60
  }

  const createdTime = new Date(createdAt).getTime()

  if (Number.isNaN(createdTime)) {
    return 24 * 60
  }

  return Math.max(0, Math.floor((Date.now() - createdTime) / 60000))
}

function formatDelayMinutes(minutes) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    return remainingMinutes > 0 ? `${hours} ساعة و ${remainingMinutes} دقيقة` : `${hours} ساعة`
  }

  return `${minutes} دقيقة`
}

function sortOrders(firstOrder, secondOrder, sortType) {
  if (sortType === "الأقدم أولًا") {
    return firstOrder.id - secondOrder.id
  }

  if (sortType === "الأعلى مبلغًا") {
    return Number(secondOrder.total ?? 0) - Number(firstOrder.total ?? 0)
  }

  if (sortType === "الأقل مبلغًا") {
    return Number(firstOrder.total ?? 0) - Number(secondOrder.total ?? 0)
  }

  return secondOrder.id - firstOrder.id
}

function sortStores(firstStore, secondStore, sortType) {
  if (sortType === "الأقدم أولًا") {
    return secondStore.adminOrder - firstStore.adminOrder
  }

  if (sortType === "الأكثر منتجات") {
    return secondStore.products.length - firstStore.products.length
  }

  if (sortType === "الأقل منتجات") {
    return firstStore.products.length - secondStore.products.length
  }

  return firstStore.adminOrder - secondStore.adminOrder
}

function formatCsvCell(value) {
  const text = String(value ?? "")

  return `"${text.replaceAll('"', '""')}"`
}

function getStoreStatusLabel(status) {
  if (status === "pending") {
    return "قيد المراجعة"
  }

  if (status === "rejected") {
    return "مرفوض"
  }

  return "موافق عليه"
}

function getDriverApprovalLabel(status) {
  if (status === "approved") return "معتمد"
  if (status === "rejected") return "مرفوض"
  return "بانتظار الموافقة"
}

function getDriverPayoutSummary(driverId, orders) {
  const deliveredOrders = orders.filter(
    (order) => order.driverId === driverId && order.status === "تم التسليم",
  )
  const paidOrders = deliveredOrders.filter((order) => order.driverPayoutStatus === "paid")
  const total = deliveredOrders.reduce(
    (sum, order) => sum + Number(order.deliveryFee ?? 0),
    0,
  )
  const paid = paidOrders.reduce(
    (sum, order) => sum + Number(order.deliveryFee ?? 0),
    0,
  )

  return {
    paid,
    remaining: total - paid,
    total,
  }
}

function getMerchantPayoutSummary(storeName, orders) {
  const deliveredOrders = orders.filter(
    (order) => order.storeName === storeName && order.status === "تم التسليم",
  )
  const getNetPayout = (order) =>
    Number(order.subtotal ?? 0) * (1 - Number(order.commissionRate ?? 0.05))
  const total = deliveredOrders.reduce((sum, order) => sum + getNetPayout(order), 0)
  const paid = deliveredOrders
    .filter((order) => order.merchantPayoutStatus === "paid")
    .reduce((sum, order) => sum + getNetPayout(order), 0)

  return {
    paid,
    remaining: total - paid,
    total,
  }
}

function getStoreStatusNote(status) {
  if (status === "pending") {
    return "لا يظهر للزبائن قبل قرار الإدارة"
  }

  if (status === "rejected") {
    return "يحتاج صاحب المتجر يسجل بيانات أوضح"
  }

  return "المتجر ظاهر للزبائن داخل المول"
}

function getStoreStatusClass(status) {
  if (status === "pending") {
    return "pending"
  }

  if (status === "rejected") {
    return "rejected"
  }

  return "approved"
}

function getPriorityClass(priority) {
  if (priority === "عالية") {
    return "high"
  }

  if (priority === "متوسطة") {
    return "medium"
  }

  return "calm"
}

function matchesStoreStatusFilter(store, filter) {
  if (filter === "all") {
    return true
  }

  if (filter === "approved") {
    return store.status !== "pending" && store.status !== "rejected"
  }

  return store.status === filter
}

function formatOrderDate(createdAt) {
  if (!createdAt) {
    return "طلب قديم"
  }

  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt))
}

function formatLastSaveTime(savedAt) {
  if (!savedAt) {
    return "لا يوجد حفظ بعد"
  }

  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(savedAt))
}

function formatTodayLabel() {
  return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium" }).format(new Date())
}

function isToday(createdAt) {
  if (!createdAt) {
    return false
  }

  const orderDate = new Date(createdAt)
  const today = new Date()

  return (
    orderDate.getFullYear() === today.getFullYear() &&
    orderDate.getMonth() === today.getMonth() &&
    orderDate.getDate() === today.getDate()
  )
}

function isWithinLastDays(createdAt, days) {
  if (!createdAt) {
    return false
  }

  const orderDate = new Date(createdAt)
  const today = new Date()
  const startDate = new Date(today)

  startDate.setDate(today.getDate() - (days - 1))
  startDate.setHours(0, 0, 0, 0)

  return orderDate >= startDate && orderDate <= today
}

function formatMoney(value) {
  return `${Math.round(Number(value)).toLocaleString("en-US")} د.ع`
}

function isProductOfferActive(product) {
  return (
    Number(product.discountPercent) > 0 &&
    Boolean(product.discountEndsAt) &&
    new Date(product.discountEndsAt).getTime() > Date.now()
  )
}

function isCouponActive(coupon) {
  return (
    coupon.isActive &&
    coupon.usedCount < coupon.maxUses &&
    new Date(coupon.expiresAt).getTime() > Date.now()
  )
}

function getPriceNumber(price) {
  return Number(String(price).replace(/[^\d]/g, ""))
}

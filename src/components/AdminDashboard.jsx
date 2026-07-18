import { useState } from "react"

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

export function AdminDashboard({
  allOrders,
  commissionRate,
  deliveredOrders,
  estimatedRevenue,
  onApproveStore,
  onRejectStore,
  onResetData,
  onSettingsChange,
  settings,
  stores,
}) {
  const [dataMessage, setDataMessage] = useState("")
  const [orderStatusFilter, setOrderStatusFilter] = useState(orderStatusFilters[0])
  const [orderSearch, setOrderSearch] = useState("")
  const [orderSort, setOrderSort] = useState(orderSortOptions[0])
  const pendingStores = stores.filter((store) => store.status === "pending")
  const rejectedStores = stores.filter((store) => store.status === "rejected")
  const approvedStores = stores.filter((store) => store.status !== "pending" && store.status !== "rejected")
  const canceledOrders = allOrders.filter((order) => order.status === "ملغي")
  const nonCanceledOrders = allOrders.filter((order) => order.status !== "ملغي")
  const productCount = stores.reduce((total, store) => total + store.products.length, 0)
  const topStore = getTopStore(nonCanceledOrders)
  const totalSales = nonCanceledOrders.reduce((total, order) => total + order.subtotal, 0)
  const salesCommission = nonCanceledOrders.reduce(
    (total, order) => total + order.subtotal * commissionRate,
    0,
  )
  const deliveryRevenue = deliveredOrders.reduce((total, order) => total + order.deliveryFee, 0)
  const averageOrderValue = nonCanceledOrders.length > 0 ? totalSales / nonCanceledOrders.length : 0
  const monitoringStats = getMonitoringStats({
    allOrders,
    commissionRate,
    pendingStores,
  })
  const adminAlerts = getAdminAlerts({
    allOrders,
    canceledOrders,
    pendingStores,
  })
  const adminTasks = getAdminTasks({ allOrders, canceledOrders, pendingStores })
  const filteredOrders = allOrders
    .filter((order) => orderStatusFilter === "الكل" || order.status === orderStatusFilter)
    .filter((order) => matchesOrderSearch(order, orderSearch))
    .sort((firstOrder, secondOrder) => sortOrders(firstOrder, secondOrder, orderSort))

  return (
    <div className="orders-panel">
      <section className="admin-section">
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
        <p>هذه الإعدادات محفوظة داخل المتصفح وتبقى بعد تحديث الصفحة.</p>
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
      </section>

      <section className="admin-section danger-zone">
        <div>
          <h3>إدارة البيانات التجريبية</h3>
          <p>استخدم هذا الزر فقط إذا تريد ترجع المتاجر والطلبات والسلة للوضع الأول.</p>
        </div>
        <button className="reset-data-button" onClick={confirmResetData}>
          مسح البيانات التجريبية
        </button>
        {dataMessage && <div className="admin-success-message">{dataMessage}</div>}
      </section>

      <section className="admin-section" id="admin-revenue">
        <h3>تفصيل الأرباح</h3>
        <div className="revenue-grid">
          <div className="revenue-row">
            <span>مجموع المبيعات</span>
            <strong>{formatMoney(totalSales)}</strong>
          </div>
          <div className="revenue-row">
            <span>متوسط قيمة الطلب</span>
            <strong>{formatMoney(averageOrderValue)}</strong>
          </div>
          <div className="revenue-row">
            <span>عمولة الإدارة ({formatPercent(commissionRate)})</span>
            <strong>{formatMoney(salesCommission)}</strong>
          </div>
          <div className="revenue-row">
            <span>أجور التوصيل المسلّمة</span>
            <strong>{formatMoney(deliveryRevenue)}</strong>
          </div>
          <div className="revenue-row muted">
            <span>طلبات ملغية مستبعدة</span>
            <strong>{canceledOrders.length}</strong>
          </div>
          <div className="revenue-row total">
            <span>صافي ربح الإدارة</span>
            <strong>{formatMoney(estimatedRevenue)}</strong>
          </div>
        </div>
      </section>

      <section className="admin-section" id="admin-stores">
        <h3>المتاجر داخل المول</h3>
        <div className="admin-table">
          <div className="admin-table-head">
            <span>اسم المتجر</span>
            <span>النوع</span>
            <span>الحالة</span>
            <span>إجراء</span>
          </div>
          {stores.map((store) => (
            <div className="admin-table-row" key={store.name}>
              <span>
                {store.name}
                {store.ownerName && <small>صاحب المتجر: {store.ownerName}</small>}
              </span>
              <span>
                {store.category}
                <small>{store.products.length} منتجات</small>
              </span>
              <span>{getStoreStatusLabel(store.status)}</span>
              <span>
                {store.status === "pending" ? (
                  <div className="approval-actions">
                    <button className="approve-button" onClick={() => onApproveStore(store.name)}>
                      موافقة
                    </button>
                    <button className="reject-button" onClick={() => onRejectStore(store.name)}>
                      رفض
                    </button>
                  </div>
                ) : store.status === "rejected" ? (
                  "مرفوض"
                ) : (
                  "ظاهر للزبائن"
                )}
              </span>
            </div>
          ))}
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
        {allOrders.length === 0 ? (
          <div className="order-card">
            <h3>لا توجد طلبات بعد</h3>
            <p className="order-meta">أرسل طلب من واجهة الزبون حتى يظهر هنا.</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="order-card">
            <h3>لا توجد طلبات مطابقة</h3>
            <p className="order-meta">غيّر البحث أو الفلتر حتى تظهر طلبات ثانية.</p>
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

  function confirmResetData() {
    const accepted = window.confirm(
      "متأكد تريد تمسح البيانات التجريبية؟ راح ترجع المتاجر والطلبات والسلة للبداية.",
    )

    if (accepted) {
      onResetData()
      setDataMessage("تم مسح البيانات التجريبية ورجع التطبيق للبداية.")
    }
  }

  function scrollToAdminSection(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" })
  }

  function exportOrders() {
    if (filteredOrders.length === 0) {
      setDataMessage("ماكو طلبات مطابقة حتى نصدرها.")
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
    setDataMessage("تم تجهيز ملف النتائج الظاهرة.")
  }
}

function formatOrderItems(items) {
  return items.map((item) => `${item.name} × ${item.quantity}`).join("، ")
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

function formatOrderDate(createdAt) {
  if (!createdAt) {
    return "طلب قديم"
  }

  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt))
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

function formatMoney(value) {
  return `${Math.round(Number(value)).toLocaleString("en-US")} د.ع`
}

function getPriceNumber(price) {
  return Number(String(price).replace(/[^\d]/g, ""))
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`
}

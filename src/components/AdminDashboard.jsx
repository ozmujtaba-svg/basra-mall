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

export function AdminDashboard({
  allOrders,
  commissionRate,
  deliveredOrders,
  estimatedRevenue,
  lastSaveTime,
  onApproveStore,
  onExportBackup,
  onImportBackup,
  onRejectStore,
  onReviewStoreAgain,
  onResetData,
  onSettingsChange,
  settings,
  stores,
}) {
  const [dataMessage, setDataMessage] = useState("")
  const [orderStatusFilter, setOrderStatusFilter] = useState(orderStatusFilters[0])
  const [orderDateFilter, setOrderDateFilter] = useState(orderDateFilters[0])
  const [orderSearch, setOrderSearch] = useState("")
  const [orderSort, setOrderSort] = useState(orderSortOptions[0])
  const [storeSearch, setStoreSearch] = useState("")
  const [storeSort, setStoreSort] = useState(storeSortOptions[0])
  const [storeStatusFilter, setStoreStatusFilter] = useState(storeStatusFilters[0].value)
  const [storeRejectReasons, setStoreRejectReasons] = useState({})
  const [dataCheck, setDataCheck] = useState(null)
  const pendingStores = stores.filter((store) => store.status === "pending")
  const rejectedStores = stores.filter((store) => store.status === "rejected")
  const approvedStores = stores.filter((store) => store.status !== "pending" && store.status !== "rejected")
  const filteredStores = stores
    .map((store, index) => ({ ...store, adminOrder: index }))
    .filter((store) => matchesStoreStatusFilter(store, storeStatusFilter))
    .filter((store) => matchesStoreSearch(store, storeSearch))
    .sort((firstStore, secondStore) => sortStores(firstStore, secondStore, storeSort))
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
  const todayStats = getTodayStats(allOrders, commissionRate)
  const weekStats = getWeekStats(allOrders, commissionRate)
  const topWeeklyStores = getTopWeeklyStores(allOrders)
  const topWeeklyProducts = getTopWeeklyProducts(allOrders)
  const adminAlerts = getAdminAlerts({
    allOrders,
    canceledOrders,
    pendingStores,
  })
  const adminTasks = getAdminTasks({ allOrders, canceledOrders, pendingStores })
  const filteredOrders = allOrders
    .filter((order) => orderStatusFilter === "الكل" || order.status === orderStatusFilter)
    .filter((order) => matchesDateFilter(order, orderDateFilter))
    .filter((order) => matchesOrderSearch(order, orderSearch))
    .sort((firstOrder, secondOrder) => sortOrders(firstOrder, secondOrder, orderSort))

  return (
    <div className="orders-panel">
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
          <button className="reset-data-button" onClick={confirmResetData}>
            مسح البيانات التجريبية
          </button>
        </div>
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
        <div className="admin-table">
          <div className="admin-table-head">
            <span>اسم المتجر</span>
            <span>النوع</span>
            <span>الحالة</span>
            <span>إجراء</span>
          </div>
          {filteredStores.length === 0 ? (
            <div className="admin-table-empty">لا توجد متاجر بهذه الحالة الآن.</div>
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
                      <button className="reject-button" onClick={() => rejectStoreWithReason(store.name)}>
                        رفض
                      </button>
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

  function downloadBackup() {
    onExportBackup()
    setDataMessage("تم تجهيز ملف النسخة الاحتياطية.")
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
    setDataMessage("تم فحص البيانات الحالية.")
  }

  async function importBackup(event) {
    const backupFile = event.target.files?.[0]
    event.target.value = ""

    if (!backupFile) {
      return
    }

    try {
      const backupText = await backupFile.text()
      const backupData = JSON.parse(backupText)
      const imported = onImportBackup(backupData)

      setDataMessage(
        imported
          ? "تم استيراد النسخة الاحتياطية بنجاح."
          : "هذا الملف لا يحتوي بيانات مول البصرة الصحيحة.",
      )
    } catch {
      setDataMessage("تعذر قراءة ملف النسخة الاحتياطية. تأكد أنه ملف JSON صحيح.")
    }
  }

  function scrollToAdminSection(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" })
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
    setStoreStatusFilter("rejected")
  }

  function reviewRejectedStore(storeName) {
    onReviewStoreAgain(storeName)
    setStoreStatusFilter("pending")
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
  const searchableText = `${store.name} ${store.ownerName} ${store.phone} ${store.area} ${store.category} ${store.status} ${store.rejectionReason} ${productNames}`

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

function getPriceNumber(price) {
  return Number(String(price).replace(/[^\d]/g, ""))
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`
}

export function AdminDashboard({
  allOrders,
  commissionRate,
  deliveredOrders,
  estimatedRevenue,
  onApproveStore,
  onRejectStore,
  onSettingsChange,
  settings,
  stores,
}) {
  const pendingStores = stores.filter((store) => store.status === "pending")
  const rejectedStores = stores.filter((store) => store.status === "rejected")
  const canceledOrders = allOrders.filter((order) => order.status === "ملغي")
  const nonCanceledOrders = allOrders.filter((order) => order.status !== "ملغي")
  const totalSales = nonCanceledOrders.reduce((total, order) => total + order.subtotal, 0)
  const salesCommission = nonCanceledOrders.reduce(
    (total, order) => total + order.subtotal * commissionRate,
    0,
  )
  const deliveryRevenue = deliveredOrders.reduce((total, order) => total + order.deliveryFee, 0)
  const averageOrderValue = nonCanceledOrders.length > 0 ? totalSales / nonCanceledOrders.length : 0

  return (
    <div className="orders-panel">
      <section className="admin-section">
        <div>
          <h2>لوحة الإدارة</h2>
          <p>هنا تشوف حركة المول: الطلبات، المتاجر، التوصيل، والربح التجريبي.</p>
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

      <section className="admin-section">
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

      <section className="admin-section">
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

      <section className="admin-section">
        <h3>متابعة الطلبات</h3>
        {allOrders.length === 0 ? (
          <div className="order-card">
            <h3>لا توجد طلبات بعد</h3>
            <p className="order-meta">أرسل طلب من واجهة الزبون حتى يظهر هنا.</p>
          </div>
        ) : (
          <div className="admin-order-list">
            {allOrders.map((order) => (
              <div className="order-card" key={`admin-${order.id}`}>
                <div className="order-card-top">
                  <h3>طلب رقم {order.id}</h3>
                  <span className="status-pill">{order.status}</span>
                </div>
                <div className="order-meta">
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
}

function formatOrderItems(items) {
  return items.map((item) => `${item.name} × ${item.quantity}`).join("، ")
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

function formatMoney(value) {
  return `${Math.round(Number(value)).toLocaleString("en-US")} د.ع`
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`
}

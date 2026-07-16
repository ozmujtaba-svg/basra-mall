export function AdminDashboard({
  allOrders,
  deliveredOrders,
  estimatedRevenue,
  onApproveStore,
  onRejectStore,
  stores,
}) {
  const pendingStores = stores.filter((store) => store.status === "pending")
  const rejectedStores = stores.filter((store) => store.status === "rejected")
  const salesCommission = allOrders.length * 3000
  const deliveryRevenue = deliveredOrders.length * 5000

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
          <div className="admin-card highlight">
            الربح التجريبي
            <strong>{estimatedRevenue.toLocaleString("en-US")} د.ع</strong>
            <span>عمولة بيع + أجرة توصيل</span>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <h3>تفصيل الأرباح</h3>
        <div className="revenue-grid">
          <div className="revenue-row">
            <span>عمولة البيع</span>
            <strong>{salesCommission.toLocaleString("en-US")} د.ع</strong>
          </div>
          <div className="revenue-row">
            <span>أجرة التوصيل</span>
            <strong>{deliveryRevenue.toLocaleString("en-US")} د.ع</strong>
          </div>
          <div className="revenue-row total">
            <span>المجموع</span>
            <strong>{estimatedRevenue.toLocaleString("en-US")} د.ع</strong>
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
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
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
  return `${Number(value).toLocaleString("en-US")} د.ع`
}

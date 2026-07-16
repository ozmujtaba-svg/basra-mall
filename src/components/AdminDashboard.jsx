export function AdminDashboard({
  allOrders,
  deliveredOrders,
  deliveryOrders,
  estimatedRevenue,
  merchantOrders,
}) {
  return (
    <div className="orders-panel">
      <h2>لوحة الإدارة</h2>
      <p>هنا تشوف ملخص التشغيل والربح التجريبي للمول.</p>
      <div className="admin-grid">
        <div className="admin-card">
          الطلبات عند المتاجر
          <strong>{merchantOrders.length}</strong>
        </div>
        <div className="admin-card">
          طلبات التوصيل
          <strong>{deliveryOrders.length}</strong>
        </div>
        <div className="admin-card">
          الطلبات المسلّمة
          <strong>{deliveredOrders.length}</strong>
        </div>
        <div className="admin-card">
          الربح التجريبي
          <strong>{estimatedRevenue.toLocaleString("en-US")} د.ع</strong>
        </div>
      </div>
      {allOrders.length === 0 ? (
        <div className="order-card">
          <h3>لا توجد طلبات بعد</h3>
          <p className="order-meta">أرسل طلب من واجهة الزبون حتى يظهر هنا.</p>
        </div>
      ) : (
        allOrders.map((order) => (
          <div className="order-card" key={`admin-${order.id}`}>
            <h3>طلب رقم {order.id}</h3>
            <div className="order-meta">
              الزبون: {order.customer}
              <br />
              المنطقة: {order.area}
            </div>
            <div className="order-products">
              المنتجات: {order.items.map((item) => item.name).join("، ")}
            </div>
            <span className="status-pill">{order.status}</span>
          </div>
        ))
      )}
    </div>
  )
}

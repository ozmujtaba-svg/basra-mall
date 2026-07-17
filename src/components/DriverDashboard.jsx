import { useState } from "react"

export function DriverDashboard({ onUpdateOrderNote, onUpdateStatus, orders }) {
  const [orderSearch, setOrderSearch] = useState("")
  const filteredOrders = orders.filter((order) => matchesOrderSearch(order, orderSearch))
  const orderGroups = [
    { title: "جاهزة للاستلام", status: "جاهز للتوصيل" },
    { title: "قيد التوصيل", status: "قيد التوصيل" },
    { title: "تم التسليم", status: "تم التسليم" },
  ].map((group) => ({
    ...group,
    orders: filteredOrders.filter((order) => order.status === group.status),
  }))

  return (
    <div className="orders-panel">
      <h2>طلبات التوصيل</h2>
      <p>الطلبات مرتبة حسب مرحلة التوصيل حتى يعرف السائق شنو يستلم وشنو يوصل.</p>
      <label className="order-search">
        بحث الطلبات
        <input
          value={orderSearch}
          onChange={(event) => setOrderSearch(event.target.value)}
          placeholder="رقم الطلب، اسم الزبون، الهاتف، المنطقة، أو المنتج"
        />
      </label>
      {orders.length === 0 ? (
        <div className="order-card">
          <h3>لا توجد طلبات جاهزة للتوصيل</h3>
          <p className="order-meta">جهّز طلب من واجهة صاحب المتجر حتى يظهر هنا.</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="order-card">
          <h3>لا توجد نتائج مطابقة</h3>
          <p className="order-meta">غيّر كلمة البحث حتى تظهر طلبات التوصيل.</p>
        </div>
      ) : (
        <div className="delivery-groups">
          {orderGroups.map((group) => (
            <section className="delivery-group" key={group.status}>
              <div className="delivery-group-header">
                <h3>{group.title}</h3>
                <span>{group.orders.length}</span>
              </div>

              {group.orders.length === 0 ? (
                <div className="empty-order-group">لا توجد طلبات في هذه المرحلة.</div>
              ) : (
                group.orders.map((order) => (
                  <div className="order-card delivery-order-card" key={order.id}>
                    <div className="order-card-top">
                      <h3>توصيل طلب رقم {order.id}</h3>
                      <span className="status-pill">{order.status}</span>
                    </div>

                    <div className="delivery-route">
                      <div>
                        <small>من المحل</small>
                        <strong>{order.items[0]?.store}</strong>
                      </div>
                      <div>
                        <small>إلى الزبون</small>
                        <strong>{order.area}</strong>
                      </div>
                    </div>

                    <div className="order-meta">
                      الزبون: {order.customer}
                      <br />
                      الهاتف: {order.phone}
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
                    {order.total && (
                      <div className="order-total">المبلغ النهائي: {formatMoney(order.total)}</div>
                    )}

                    <label className="order-note-box">
                      ملاحظة متابعة
                      <textarea
                        value={order.internalNote ?? ""}
                        onChange={(event) => onUpdateOrderNote(order.id, event.target.value)}
                        placeholder="مثال: الزبون يريد التوصيل العصر، العنوان يحتاج توضيح"
                      />
                    </label>

                    {order.status === "جاهز للتوصيل" && (
                      <button
                        className="delivery-button"
                        onClick={() => onUpdateStatus(order.id, "قيد التوصيل")}
                      >
                        استلام التوصيل
                      </button>
                    )}
                    {order.status === "قيد التوصيل" && (
                      <button
                        className="delivery-button done"
                        onClick={() => onUpdateStatus(order.id, "تم التسليم")}
                      >
                        تم التسليم
                      </button>
                    )}
                  </div>
                ))
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function formatOrderItems(items) {
  return items.map((item) => `${item.name} × ${item.quantity}`).join("، ")
}

function formatMoney(value) {
  return `${Number(value).toLocaleString("en-US")} د.ع`
}

function matchesOrderSearch(order, searchText) {
  const search = searchText.trim().toLowerCase()

  if (!search) {
    return true
  }

  const items = order.items.map((item) => `${item.name} ${item.store}`).join(" ")
  const searchableText = `${order.id} ${order.customer} ${order.phone} ${order.area} ${order.landmark} ${order.notes} ${order.internalNote} ${items}`

  return searchableText.toLowerCase().includes(search)
}

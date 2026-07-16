export function DriverDashboard({ onUpdateStatus, orders }) {
  return (
    <div className="orders-panel">
      <h2>طلبات التوصيل</h2>
      <p>أي طلب يجهزه صاحب المتجر يظهر هنا حتى يستلمه السائق.</p>
      {orders.length === 0 ? (
        <div className="order-card">
          <h3>لا توجد طلبات جاهزة للتوصيل</h3>
          <p className="order-meta">جهّز طلب من واجهة صاحب المتجر حتى يظهر هنا.</p>
        </div>
      ) : (
        orders.map((order) => (
          <div className="order-card" key={order.id}>
            <h3>توصيل طلب رقم {order.id}</h3>
            <div className="order-meta">
              من: {order.items[0]?.store}
              <br />
              إلى: {order.area}
              <br />
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
            {order.total && <div className="order-total">المبلغ النهائي: {formatMoney(order.total)}</div>}
            <span className="status-pill">{order.status}</span>
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
    </div>
  )
}

function formatOrderItems(items) {
  return items.map((item) => `${item.name} × ${item.quantity}`).join("، ")
}

function formatMoney(value) {
  return `${Number(value).toLocaleString("en-US")} د.ع`
}

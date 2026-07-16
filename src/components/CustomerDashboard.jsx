export function CustomerDashboard({
  cartItems,
  customerOrders,
  onAddToCart,
  onSelectStore,
  onSendOrder,
  orderMessage,
  selectedStore,
  stores,
}) {
  return (
    <div className="customer-layout">
      <div>
        <h2>متاجر المول</h2>
        <p>اختر متجر حتى تشوف بضاعته التجريبية.</p>
        <div className="store-list">
          {stores.map((store) => (
            <button
              className={`store-card ${selectedStore.name === store.name ? "active" : ""}`}
              key={store.name}
              onClick={() => onSelectStore(store)}
            >
              <small>{store.category}</small>
              <h3>{store.name}</h3>
              <span>{store.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="product-panel">
        <small>{selectedStore.category}</small>
        <h2>{selectedStore.name}</h2>
        <p>{selectedStore.description}</p>
        <div className="product-list">
          {selectedStore.products.length === 0 ? (
            <div className="product-card">
              <h3>لا توجد منتجات بعد</h3>
              <span>هذا المتجر مسجل جديدًا. الخطوة القادمة نضيف له منتجات من واجهة صاحب المتجر.</span>
            </div>
          ) : (
            selectedStore.products.map((product) => (
              <div className="product-card" key={product.name}>
                <h3>{product.name}</h3>
                <span>{product.price}</span>
                {product.quantity && <small>الكمية: {product.quantity}</small>}
                <button className="add-button" onClick={() => onAddToCart(product)}>
                  إضافة للسلة
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="cart-panel">
        <h2>السلة</h2>
        <p>المنتجات التي يختارها الزبون قبل إرسال الطلب.</p>
        <div className="cart-list">
          {cartItems.length === 0 ? (
            <div className="cart-item">
              <span>لا توجد منتجات بالسلة بعد.</span>
            </div>
          ) : (
            cartItems.map((item, index) => (
              <div className="cart-item" key={`${item.name}-${index}`}>
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.store}</small>
                </div>
                <span>{item.price}</span>
              </div>
            ))
          )}
        </div>
        <button className="send-order-button" onClick={onSendOrder}>
          إرسال الطلب
        </button>
        {orderMessage && <div className="order-message">{orderMessage}</div>}
      </div>

      <div className="tracking-panel">
        <h2>تتبع الطلب</h2>
        <p>هنا يشوف الزبون حالة طلباته من الإرسال إلى التسليم.</p>
        {customerOrders.length === 0 ? (
          <div className="tracking-card">
            <h3>لا توجد طلبات للمتابعة</h3>
            <span>أرسل طلب من السلة حتى يبدأ التتبع.</span>
          </div>
        ) : (
          customerOrders.map((order) => (
            <div className="tracking-card" key={`customer-${order.id}`}>
              <h3>طلب رقم {order.id}</h3>
              <span>الحالة الحالية: {order.status}</span>
              <div className="tracking-steps">
                {["طلب جديد", "جاهز للتوصيل", "قيد التوصيل", "تم التسليم"].map((step) => (
                  <div className={`tracking-step ${getStepState(order.status, step)}`} key={step}>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function getStepState(currentStatus, step) {
  const steps = ["طلب جديد", "جاهز للتوصيل", "قيد التوصيل", "تم التسليم"]
  const currentIndex = steps.indexOf(currentStatus)
  const stepIndex = steps.indexOf(step)

  if (stepIndex < currentIndex) {
    return "done"
  }

  if (stepIndex === currentIndex) {
    return "current"
  }

  return ""
}

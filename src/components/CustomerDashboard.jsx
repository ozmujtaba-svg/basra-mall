import { useState } from "react"

const categories = ["الكل", "ملابس", "كوزمتك", "عطور", "أحذية", "إكسسوارات"]
const productFilters = ["الكل", "المتوفر", "الكمية القليلة", "النافد"]

export function CustomerDashboard({
  cartItems,
  customerInfo,
  customerOrders,
  deliveryFee,
  onAddToCart,
  onCustomerInfoChange,
  onDecreaseCartItem,
  onIncreaseCartItem,
  onRemoveCartItem,
  onSelectStore,
  onSendOrder,
  orderMessage,
  selectedStore,
  stores,
}) {
  const [activeCategory, setActiveCategory] = useState("الكل")
  const [activeProductFilter, setActiveProductFilter] = useState("الكل")
  const [searchText, setSearchText] = useState("")
  const normalizedSearch = searchText.trim().toLowerCase()
  const categoryStores =
    activeCategory === "الكل" ? stores : stores.filter((store) => store.category === activeCategory)
  const visibleStores = categoryStores.filter((store) => matchesSearch(store, normalizedSearch))
  const subtotal = cartItems.reduce(
    (total, item) => total + getPriceValue(item.price) * item.quantity,
    0,
  )
  const finalTotal = cartItems.length > 0 ? subtotal + deliveryFee : 0
  const visibleProducts = selectedStore.products.filter(
    (product) => product.status !== "مخفي مؤقتًا",
  )
  const filteredProducts = visibleProducts.filter((product) =>
    matchesProductFilter(product, activeProductFilter),
  )

  return (
    <div className="customer-layout">
      <section className="store-directory">
        <h2>متاجر المول</h2>
        <p>اختر متجر حتى تدخل لصفحته وتشوف المنتجات المتوفرة.</p>
        <label className="store-search">
          بحث
          <input
            value={searchText}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="اكتب اسم متجر أو نوع أو منتج"
          />
        </label>
        <div className="category-tabs">
          {categories.map((category) => (
            <button
              className={activeCategory === category ? "active" : ""}
              key={category}
              onClick={() => selectCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="store-list">
          {visibleStores.length === 0 ? (
            <div className="empty-search">ماكو متجر أو منتج مطابق للبحث الحالي.</div>
          ) : (
            visibleStores.map((store) => (
              <button
                className={`store-card ${selectedStore.name === store.name ? "active" : ""}`}
              key={store.name}
              onClick={() => onSelectStore(store)}
            >
              {store.image && <img className="store-thumb" src={store.image} alt="" />}
              <small>{store.category}</small>
              <h3>{store.name}</h3>
                <span>{store.description}</span>
                <strong className="store-enter">دخول المتجر</strong>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="store-detail-panel">
        <div className="store-detail-hero">
          <div>
            <small>{selectedStore.category}</small>
            <h2>{selectedStore.name}</h2>
            <p>{selectedStore.description}</p>
          </div>
          {selectedStore.image && <img className="store-hero-image" src={selectedStore.image} alt="" />}
          <div className="store-detail-meta">
            <span>{filteredProducts.length} منتجات</span>
            <span>التوصيل داخل البصرة</span>
          </div>
        </div>
        <div className="store-toolbar">
          <button className="mini-back-button" onClick={() => onSelectStore(stores[0])}>
            رجوع للمتاجر
          </button>
          <span>المتجر المختار: {selectedStore.name}</span>
        </div>
        <div className="product-filter-tabs">
          {productFilters.map((filter) => (
            <button
              className={activeProductFilter === filter ? "active" : ""}
              key={filter}
              onClick={() => setActiveProductFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="product-list">
          {visibleProducts.length === 0 ? (
            <div className="product-card">
              <h3>لا توجد منتجات بعد</h3>
              <span>هذا المتجر مسجل جديدًا. الخطوة القادمة نضيف له منتجات من واجهة صاحب المتجر.</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="product-card">
              <h3>لا توجد منتجات بهذا الفلتر</h3>
              <span>غيّر الفلتر حتى تشوف منتجات ثانية داخل المتجر.</span>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const quantity = Number(product.quantity)
              const cartQuantity = getCartQuantity(cartItems, selectedStore.name, product.name)
              const isSoldOut = product.status === "نفد" || quantity === 0
              const hasStock = !isSoldOut && (!Number.isFinite(quantity) || quantity > 0)
              const hasLowStock = hasStock && Number.isFinite(quantity) && quantity <= 3
              const reachedLimit = Number.isFinite(quantity) && cartQuantity >= quantity
              const disabled = !hasStock || reachedLimit

              return (
                <div className="product-card" key={product.name}>
                  {product.image && <img className="product-image" src={product.image} alt="" />}
                  <div>
                    <h3>{product.name}</h3>
                    <span>{product.price}</span>
                    <small className={`product-status ${isSoldOut ? "sold-out" : "available"}`}>
                      {isSoldOut ? "نفد" : "متوفر"}
                    </small>
                    {hasLowStock && <small className="product-status low-stock">باقي كمية قليلة</small>}
                    {Number.isFinite(quantity) && <small>المتوفر: {quantity}</small>}
                    {cartQuantity > 0 && <small>بالسلة: {cartQuantity}</small>}
                  </div>
                  <button
                    className="add-button"
                    disabled={disabled}
                    onClick={() => onAddToCart(product, selectedStore)}
                  >
                    {!hasStock ? "غير متاح للشراء" : reachedLimit ? "وصلت للكمية المتوفرة" : "إضافة للسلة"}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </section>

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
                  <span>{item.price}</span>
                </div>
                <div className="cart-controls">
                  <button onClick={() => onDecreaseCartItem(item)}>-</button>
                  <strong>{item.quantity}</strong>
                  <button onClick={() => onIncreaseCartItem(item)}>+</button>
                </div>
                <button className="remove-cart-button" onClick={() => onRemoveCartItem(item)}>
                  حذف
                </button>
              </div>
            ))
          )}
        </div>
        <div className="customer-info-form">
          <h3>بيانات التوصيل</h3>
          <div className="customer-info-grid">
            <label>
              اسم الزبون
              <input
                value={customerInfo.name}
                onChange={(event) => updateCustomerInfo("name", event.target.value)}
                placeholder="مثال: علي أحمد"
              />
            </label>
            <label>
              رقم الهاتف
              <input
                value={customerInfo.phone}
                onChange={(event) => updateCustomerInfo("phone", event.target.value)}
                placeholder="مثال: 07XXXXXXXXX"
              />
            </label>
            <label>
              المنطقة
              <input
                value={customerInfo.area}
                onChange={(event) => updateCustomerInfo("area", event.target.value)}
                placeholder="مثال: العشار"
              />
            </label>
            <label>
              أقرب نقطة دلالة
              <input
                value={customerInfo.landmark}
                onChange={(event) => updateCustomerInfo("landmark", event.target.value)}
                placeholder="مثال: قرب جامع أو مدرسة"
              />
            </label>
            <label className="wide-field">
              ملاحظات للطلب
              <textarea
                value={customerInfo.notes}
                onChange={(event) => updateCustomerInfo("notes", event.target.value)}
                placeholder="مثال: الاتصال قبل الوصول"
              />
            </label>
          </div>
        </div>
        <div className="order-summary">
          <div>
            <span>مجموع المنتجات</span>
            <strong>{formatMoney(subtotal)}</strong>
          </div>
          <div>
            <span>أجرة التوصيل</span>
            <strong>{cartItems.length > 0 ? formatMoney(deliveryFee) : "0 د.ع"}</strong>
          </div>
          <div className="summary-total">
            <span>المبلغ النهائي</span>
            <strong>{formatMoney(finalTotal)}</strong>
          </div>
        </div>
        <button className="send-order-button" onClick={onSendOrder}>
          تأكيد الطلب
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
              <span>التوصيل إلى: {order.area}</span>
              {order.total && <strong>المبلغ النهائي: {formatMoney(order.total)}</strong>}
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

  function updateCustomerInfo(field, value) {
    onCustomerInfoChange((currentInfo) => ({
      ...currentInfo,
      [field]: value,
    }))
  }

  function selectCategory(category) {
    const nextStores =
      category === "الكل" ? stores : stores.filter((store) => store.category === category)
    const nextVisibleStores = nextStores.filter((store) => matchesSearch(store, normalizedSearch))

    setActiveCategory(category)

    if (nextVisibleStores.length > 0) {
      onSelectStore(nextVisibleStores[0])
    }
  }

  function updateSearch(value) {
    const nextSearch = value.trim().toLowerCase()
    const nextVisibleStores = categoryStores.filter((store) => matchesSearch(store, nextSearch))

    setSearchText(value)

    if (nextVisibleStores.length > 0) {
      onSelectStore(nextVisibleStores[0])
    }
  }
}

function matchesSearch(store, search) {
  if (!search) {
    return true
  }

  const productNames = store.products
    .filter((product) => product.status !== "مخفي مؤقتًا")
    .map((product) => product.name)
    .join(" ")
  const searchableText = `${store.name} ${store.category} ${store.description} ${productNames}`

  return searchableText.toLowerCase().includes(search)
}

function matchesProductFilter(product, filter) {
  if (filter === "الكل") {
    return true
  }

  const quantity = Number(product.quantity)
  const isSoldOut = product.status === "نفد" || quantity === 0
  const hasLowStock = !isSoldOut && Number.isFinite(quantity) && quantity <= 3

  if (filter === "المتوفر") {
    return !isSoldOut
  }

  if (filter === "الكمية القليلة") {
    return hasLowStock
  }

  if (filter === "النافد") {
    return isSoldOut
  }

  return true
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

function getCartQuantity(cartItems, storeName, productName) {
  return (
    cartItems.find((item) => item.store === storeName && item.name === productName)?.quantity ?? 0
  )
}

function getPriceValue(price) {
  return Number(String(price).replace(/[^\d]/g, ""))
}

function formatMoney(value) {
  return `${Number(value).toLocaleString("en-US")} د.ع`
}

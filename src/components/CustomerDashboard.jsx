import { useState } from "react"

const categories = ["الكل", "ملابس", "كوزمتك", "عطور", "أحذية", "إكسسوارات"]
const productFilters = ["الكل", "المتوفر", "الكمية القليلة", "النافد"]
const quickOrderNotes = [
  "الاتصال قبل الوصول",
  "التوصيل بعد العصر",
  "لا تدق الباب، اتصل",
  "احتاج تبديل إذا المقاس ما يناسب",
]

export function CustomerDashboard({
  cartItems,
  customerInfo,
  customerOrders,
  deliveryFee,
  favoriteStoreNames,
  savedCustomerAddress,
  onAddToCart,
  onCancelOrder,
  onCustomerInfoChange,
  onDecreaseCartItem,
  onIncreaseCartItem,
  onRemoveCartItem,
  onReorder,
  onSaveCustomerAddress,
  onSelectStore,
  onSendOrder,
  onToggleFavoriteStore,
  onUseSavedCustomerAddress,
  orderMessage,
  selectedStore,
  stores,
}) {
  const [activeCategory, setActiveCategory] = useState("الكل")
  const [activeProductFilter, setActiveProductFilter] = useState("الكل")
  const [searchText, setSearchText] = useState("")
  const safeSelectedStore = selectedStore ?? stores[0] ?? {
    category: "",
    description: "لا يوجد متجر متاح حاليًا.",
    name: "لا يوجد متجر",
    products: [],
  }
  const normalizedSearch = searchText.trim().toLowerCase()
  const categoryStores =
    activeCategory === "الكل" ? stores : stores.filter((store) => store.category === activeCategory)
  const visibleStores = categoryStores.filter((store) => matchesSearch(store, normalizedSearch))
  const suggestedStores = visibleStores.slice(0, 3)
  const favoriteStores = stores.filter((store) => favoriteStoreNames.includes(store.name))
  const cartQuantity = cartItems.reduce((total, item) => total + item.quantity, 0)
  const activeOrders = customerOrders.filter((order) => order.status !== "ملغي" && order.status !== "تم التسليم")
  const subtotal = cartItems.reduce(
    (total, item) => total + getPriceValue(item.price) * item.quantity,
    0,
  )
  const finalTotal = cartItems.length > 0 ? subtotal + deliveryFee : 0
  const visibleProducts = safeSelectedStore.products.filter(
    (product) => product.status !== "مخفي مؤقتًا",
  )
  const filteredProducts = visibleProducts.filter((product) =>
    matchesProductFilter(product, activeProductFilter),
  )
  const latestOrder = customerOrders[0]
  const latestOrderItemsCount = latestOrder ? getOrderItemsCount(latestOrder.items) : 0

  return (
    <div className="customer-layout">
      <section className="customer-start-card">
        <div>
          <span>واجهة الزبون</span>
          <h2>أهلًا {customerInfo.name || "بيك"} داخل مول البصرة</h2>
          <p>تصفح المتاجر، أضف المنتجات للسلة، وتابع طلبك من نفس المكان.</p>
        </div>
        <div className="customer-start-stats">
          <div>
            <strong>{favoriteStores.length}</strong>
            <span>متاجر مفضلة</span>
          </div>
          <div>
            <strong>{cartQuantity}</strong>
            <span>قطع بالسلة</span>
          </div>
          <div>
            <strong>{activeOrders.length}</strong>
            <span>طلبات نشطة</span>
          </div>
        </div>
        <div className="customer-start-actions">
          <button onClick={scrollToCart} type="button">
            الذهاب للسلة
          </button>
          <button onClick={scrollToFavorites} type="button">
            عرض المفضلة
          </button>
        </div>
      </section>

      <section className="suggested-stores-panel" id="customer-suggested">
        <div className="suggested-stores-header">
          <div>
            <h2>متاجر مقترحة</h2>
            <p>اقتراحات سريعة حسب التصنيف أو البحث الحالي.</p>
          </div>
          <span>{suggestedStores.length} متاجر</span>
        </div>
        {suggestedStores.length === 0 ? (
          <div className="empty-search">ماكو متاجر مقترحة حسب الاختيار الحالي.</div>
        ) : (
          <div className="suggested-store-list">
            {suggestedStores.map((store) => (
              <button key={`suggested-${store.name}`} onClick={() => onSelectStore(store)} type="button">
                {store.image && <img src={store.image} alt="" />}
                <span>{store.category}</span>
                <strong>{store.name}</strong>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="store-directory" id="customer-stores">
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
        <div className="favorite-stores" id="customer-favorites">
          <div className="favorite-stores-header">
            <h3>متاجري المفضلة</h3>
            <span>{favoriteStores.length}</span>
          </div>
          {favoriteStores.length === 0 ? (
            <div className="empty-favorites">ما ضايف متجر للمفضلة بعد.</div>
          ) : (
            <div className="favorite-store-list">
              {favoriteStores.map((store) => (
                <button key={store.name} onClick={() => onSelectStore(store)}>
                  {store.name}
                </button>
              ))}
            </div>
          )}
        </div>
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
              <div
                className={`store-card ${safeSelectedStore.name === store.name ? "active" : ""}`}
                key={store.name}
              >
                {store.image && <img className="store-thumb" src={store.image} alt="" />}
                <small>{store.category}</small>
                <h3>{store.name}</h3>
                <span>{store.description}</span>
                <div className="store-actions">
                  <button onClick={() => onSelectStore(store)}>دخول المتجر</button>
                  <button
                    className={favoriteStoreNames.includes(store.name) ? "active" : ""}
                    onClick={() => onToggleFavoriteStore(store.name)}
                  >
                    {favoriteStoreNames.includes(store.name) ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="store-detail-panel">
        <div className="store-detail-hero">
          <div>
            <small>{safeSelectedStore.category}</small>
            <h2>{safeSelectedStore.name}</h2>
            <p>{safeSelectedStore.description}</p>
          </div>
          {safeSelectedStore.image && <img className="store-hero-image" src={safeSelectedStore.image} alt="" />}
          <div className="store-detail-meta">
            <span>{filteredProducts.length} منتجات</span>
            <span>التوصيل داخل البصرة</span>
          </div>
        </div>
        <div className="store-toolbar">
          <button className="mini-back-button" onClick={() => onSelectStore(stores[0])}>
            رجوع للمتاجر
          </button>
          <span>المتجر المختار: {safeSelectedStore.name}</span>
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
              const cartQuantity = getCartQuantity(cartItems, safeSelectedStore.name, product.name)
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
                    onClick={() => onAddToCart(product, safeSelectedStore)}
                  >
                    {!hasStock ? "غير متاح للشراء" : reachedLimit ? "وصلت للكمية المتوفرة" : "إضافة للسلة"}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </section>

      <div className="cart-panel" id="customer-cart">
        {latestOrder && (
          <div className="latest-order-card">
            <div>
              <small>آخر طلب</small>
              <h3>طلب رقم {latestOrder.id}</h3>
              <div className="latest-order-details">
                <span>الحالة: {latestOrder.status}</span>
                <span>عدد المنتجات: {latestOrderItemsCount}</span>
                <span>المنطقة: {latestOrder.area}</span>
                <span>وقت الطلب: {formatOrderDate(latestOrder.createdAt)}</span>
              </div>
              {latestOrder.total && <strong>المبلغ: {formatMoney(latestOrder.total)}</strong>}
            </div>
            <button onClick={scrollToTracking}>تتبع الطلب</button>
          </div>
        )}
        <h2>السلة</h2>
        <p>المنتجات التي يختارها الزبون قبل إرسال الطلب.</p>
        <div className={cartItems.length > 0 ? "cart-alert ready" : "cart-alert empty"}>
          <div>
            <strong>{cartItems.length > 0 ? "السلة جاهزة للمراجعة" : "السلة فارغة حاليًا"}</strong>
            <span>
              {cartItems.length > 0
                ? `عندك ${cartQuantity} قطع بالسلة، والمبلغ المتوقع ${formatMoney(finalTotal)}.`
                : "اختار متجر وأضف منتجات حتى تبدأ أول طلب داخل مول البصرة."}
            </span>
          </div>
          <small>{cartQuantity}</small>
        </div>
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
          <div className="saved-address-card">
            <div>
              <span>العنوان المحفوظ</span>
              {savedCustomerAddress.area ? (
                <strong>
                  {savedCustomerAddress.area} - {savedCustomerAddress.landmark || "بدون دلالة"}
                </strong>
              ) : (
                <strong>ماكو عنوان محفوظ بعد</strong>
              )}
            </div>
            <div className="saved-address-actions">
              <button type="button" onClick={onSaveCustomerAddress}>
                حفظ هذا العنوان
              </button>
              <button type="button" onClick={onUseSavedCustomerAddress}>
                استخدام العنوان
              </button>
            </div>
          </div>
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
            <div className="quick-notes wide-field">
              <span>ملاحظات سريعة</span>
              <div className="quick-notes-list">
                {quickOrderNotes.map((note) => (
                  <button key={note} type="button" onClick={() => addQuickNote(note)}>
                    {note}
                  </button>
                ))}
              </div>
            </div>
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

      <div className="tracking-panel" id="customer-tracking">
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
              <span>وقت الطلب: {formatOrderDate(order.createdAt)}</span>
              <span>الحالة الحالية: {order.status}</span>
              <span>التوصيل إلى: {order.area}</span>
              {order.total && <strong>المبلغ النهائي: {formatMoney(order.total)}</strong>}
              {order.internalNote && (
                <div className="tracking-note">
                  <strong>ملاحظة الطلب</strong>
                  <span>{order.internalNote}</span>
                </div>
              )}
              <div className="tracking-steps">
                {["طلب جديد", "قيد التجهيز", "جاهز للتوصيل", "قيد التوصيل", "تم التسليم"].map((step) => (
                  <div className={`tracking-step ${getStepState(order.status, step)}`} key={step}>
                    {step}
                  </div>
                ))}
              </div>
              {order.status === "ملغي" && <div className="canceled-order-note">تم إلغاء الطلب</div>}
              {order.status === "طلب جديد" && (
                <button className="danger-action-button" onClick={() => onCancelOrder(order.id)}>
                  إلغاء الطلب
                </button>
              )}
              <button className="reorder-button" onClick={() => onReorder(order)}>
                إعادة الطلب
              </button>
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

  function addQuickNote(note) {
    onCustomerInfoChange((currentInfo) => {
      const currentNotes = currentInfo.notes.trim()

      if (currentNotes.includes(note)) {
        return currentInfo
      }

      return {
        ...currentInfo,
        notes: currentNotes ? `${currentNotes}، ${note}` : note,
      }
    })
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

  function scrollToTracking() {
    document.getElementById("customer-tracking")?.scrollIntoView({ behavior: "smooth" })
  }

  function scrollToCart() {
    document.getElementById("customer-cart")?.scrollIntoView({ behavior: "smooth" })
  }

  function scrollToFavorites() {
    document.getElementById("customer-favorites")?.scrollIntoView({ behavior: "smooth" })
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
  if (currentStatus === "ملغي") {
    return ""
  }

  const steps = ["طلب جديد", "قيد التجهيز", "جاهز للتوصيل", "قيد التوصيل", "تم التسليم"]
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

function getOrderItemsCount(items) {
  return items.reduce((total, item) => total + Number(item.quantity), 0)
}

function getPriceValue(price) {
  return Number(String(price).replace(/[^\d]/g, ""))
}

function formatMoney(value) {
  return `${Number(value).toLocaleString("en-US")} د.ع`
}

function formatOrderDate(createdAt) {
  if (!createdAt) {
    return "طلب قديم بدون تاريخ"
  }

  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt))
}

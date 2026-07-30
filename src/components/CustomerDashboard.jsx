import { useMemo, useState } from "react"

const categories = ["الكل", "ملابس", "كوزمتك", "عطور", "أحذية", "إكسسوارات"]
const productFilters = ["الكل", "المتوفر", "الكمية القليلة", "النافد"]
const quickOrderNotes = [
  "الاتصال قبل الوصول",
  "التوصيل بعد العصر",
  "لا تدق الباب، اتصل",
  "احتاج تبديل إذا المقاس ما يناسب",
]
const paymentMethods = ["الدفع عند الاستلام", "دفع إلكتروني لاحقًا"]

export function CustomerDashboard({
  cartItems,
  coupons,
  customerInfo,
  customerOrders,
  deliveryFee,
  deliveryZones,
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
  onSubmitReview,
  onSubmitReturnRequest,
  onToggleFavoriteStore,
  onUseSavedCustomerAddress,
  orderMessage,
  reviews,
  returnRequests,
  selectedStore,
  stores,
}) {
  const [activeCategory, setActiveCategory] = useState("الكل")
  const [activeProductFilter, setActiveProductFilter] = useState("الكل")
  const [searchText, setSearchText] = useState("")
  const [showOrderReview, setShowOrderReview] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0])
  const [trackingSearch, setTrackingSearch] = useState("")
  const [copiedOrderId, setCopiedOrderId] = useState("")
  const [pendingCancelOrderId, setPendingCancelOrderId] = useState("")
  const [couponInput, setCouponInput] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponMessage, setCouponMessage] = useState("")
  const [reviewDrafts, setReviewDrafts] = useState({})
  const [reviewMessage, setReviewMessage] = useState("")
  const [returnDrafts, setReturnDrafts] = useState({})
  const [returnMessage, setReturnMessage] = useState("")
  const [productVariantSelections, setProductVariantSelections] = useState({})
  const safeSelectedStore = useMemo(
    () =>
      selectedStore ?? stores[0] ?? {
        category: "",
        description: "لا يوجد متجر متاح حاليًا.",
        name: "لا يوجد متجر",
        products: [],
      },
    [selectedStore, stores],
  )
  const normalizedSearch = searchText.trim().toLowerCase()
  const hasStoreFilters = activeCategory !== "الكل" || Boolean(normalizedSearch)
  const categoryStores = useMemo(
    () => (activeCategory === "الكل" ? stores : stores.filter((store) => store.category === activeCategory)),
    [activeCategory, stores],
  )
  const visibleStores = useMemo(
    () => categoryStores.filter((store) => matchesSearch(store, normalizedSearch)),
    [categoryStores, normalizedSearch],
  )
  const suggestedStores = useMemo(() => visibleStores.slice(0, 3), [visibleStores])
  const favoriteStores = useMemo(
    () => stores.filter((store) => favoriteStoreNames.includes(store.name)),
    [favoriteStoreNames, stores],
  )
  const cartQuantity = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems],
  )
  const activeOrders = useMemo(
    () => customerOrders.filter((order) => order.status !== "ملغي" && order.status !== "تم التسليم"),
    [customerOrders],
  )
  const subtotal = useMemo(
    () => cartItems.reduce((total, item) => total + getPriceValue(item.price) * item.quantity, 0),
    [cartItems],
  )
  const couponDiscount = useMemo(
    () => calculateCartCouponDiscount(cartItems, appliedCoupon),
    [appliedCoupon, cartItems],
  )
  const finalTotal = cartItems.length > 0 ? Math.max(subtotal - couponDiscount, 0) + deliveryFee : 0
  const visibleProducts = useMemo(
    () => safeSelectedStore.products.filter((product) => product.status !== "مخفي مؤقتًا"),
    [safeSelectedStore.products],
  )
  const filteredProducts = useMemo(
    () => visibleProducts.filter((product) => matchesProductFilter(product, activeProductFilter)),
    [activeProductFilter, visibleProducts],
  )
  const latestOrder = customerOrders[0]
  const latestOrderItemsCount = useMemo(
    () => (latestOrder ? getOrderItemsCount(latestOrder.items) : 0),
    [latestOrder],
  )
  const normalizedTrackingSearch = trackingSearch.trim()
  const visibleCustomerOrders = useMemo(
    () =>
      normalizedTrackingSearch
        ? customerOrders.filter((order) => String(order.id).includes(normalizedTrackingSearch))
        : customerOrders,
    [customerOrders, normalizedTrackingSearch],
  )

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
                {store.image && <img src={store.image} alt="" loading="lazy" decoding="async" />}
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
        <div className="filter-summary">
          <div>
            <strong>{visibleStores.length}</strong>
            <span>
              {hasStoreFilters
                ? `نتائج حسب ${activeCategory === "الكل" ? "كل التصنيفات" : activeCategory}`
                : "كل المتاجر المتاحة"}
            </span>
          </div>
          {hasStoreFilters && (
            <button onClick={resetStoreFilters} type="button">
              عرض الكل
            </button>
          )}
        </div>
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
            <div className="empty-search">
              <strong>ماكو نتائج مطابقة</strong>
              <span>جرّب تمسح البحث أو ترجع التصنيف إلى الكل حتى تظهر المتاجر المتاحة.</span>
              <button onClick={resetStoreFilters} type="button">
                عرض كل المتاجر
              </button>
            </div>
          ) : (
            visibleStores.map((store) => (
              <div
                className={`store-card ${safeSelectedStore.name === store.name ? "active" : ""}`}
                key={store.name}
              >
                {store.image && (
                  <img className="store-thumb" src={store.image} alt="" loading="lazy" decoding="async" />
                )}
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
          {safeSelectedStore.image && (
            <img
              className="store-hero-image"
              src={safeSelectedStore.image}
              alt=""
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          )}
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
        <div className="filter-summary product-result-summary">
          <div>
            <strong>{filteredProducts.length}</strong>
            <span>
              {activeProductFilter === "الكل"
                ? "كل المنتجات الظاهرة"
                : `منتجات حسب فلتر ${activeProductFilter}`}
            </span>
          </div>
          {activeProductFilter !== "الكل" && (
            <button onClick={() => setActiveProductFilter("الكل")} type="button">
              عرض كل المنتجات
            </button>
          )}
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
              <button onClick={() => setActiveProductFilter("الكل")} type="button">
                عرض كل المنتجات
              </button>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const availableVariants = (product.variants ?? []).filter(
                (variant) => Number(variant.quantity) > 0,
              )
              const selectedVariant =
                availableVariants.find(
                  (variant) =>
                    String(variant.id) === String(productVariantSelections[product.id]),
                ) ?? availableVariants[0]
              const quantity =
                availableVariants.length > 0
                  ? Number(selectedVariant?.quantity ?? 0)
                  : Number(product.quantity)
              const cartQuantity = getCartQuantity(cartItems, safeSelectedStore.name, product.name)
              const isSoldOut = product.status === "نفد" || quantity === 0
              const hasStock = !isSoldOut && (!Number.isFinite(quantity) || quantity > 0)
              const hasLowStock = hasStock && Number.isFinite(quantity) && quantity <= 3
              const reachedLimit = Number.isFinite(quantity) && cartQuantity >= quantity
              const disabled = !hasStock || reachedLimit

              return (
                <div className="product-card" key={product.name}>
                  {product.image && (
                    <img className="product-image" src={product.image} alt="" loading="lazy" decoding="async" />
                  )}
                  <div>
                    <h3>{product.name}</h3>
                    {isDiscountActive(product) ? (
                      <span className="customer-offer-price">
                        <del>{product.originalPrice}</del>
                        <strong>{product.price}</strong>
                        <small>خصم {product.discountPercent}%</small>
                      </span>
                    ) : (
                      <span>{product.originalPrice ?? product.price}</span>
                    )}
                    <small className={`product-status ${isSoldOut ? "sold-out" : "available"}`}>
                      {isSoldOut ? "نفد" : "متوفر"}
                    </small>
                    {hasLowStock && <small className="product-status low-stock">باقي كمية قليلة</small>}
                    {Number.isFinite(quantity) && <small>المتوفر: {quantity}</small>}
                    {cartQuantity > 0 && <small>بالسلة: {cartQuantity}</small>}
                    {availableVariants.length > 0 && (
                      <label className="customer-variant-select">
                        المقاس واللون
                        <select
                          onChange={(event) =>
                            setProductVariantSelections((current) => ({
                              ...current,
                              [product.id]: event.target.value,
                            }))
                          }
                          value={selectedVariant?.id ?? ""}
                        >
                          {availableVariants.map((variant) => (
                            <option key={variant.id} value={variant.id}>
                              {formatVariantLabel(variant)} — متوفر {variant.quantity}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  <button
                    className="add-button"
                    disabled={disabled}
                    onClick={() =>
                      onAddToCart(
                        selectedVariant
                          ? {
                              ...product,
                              selectedVariant,
                              variantId: selectedVariant.id,
                              variantLabel: formatVariantLabel(selectedVariant),
                            }
                          : product,
                        safeSelectedStore,
                      )
                    }
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
                  {item.variantLabel && <small>{item.variantLabel}</small>}
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
              <select
                value={customerInfo.area}
                onChange={(event) => updateCustomerInfo("area", event.target.value)}
              >
                <option value="">اختار منطقة التوصيل</option>
                {customerInfo.area && !deliveryZones.includes(customerInfo.area) && (
                  <option value={customerInfo.area}>{customerInfo.area}</option>
                )}
                {deliveryZones.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
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
            {customerInfo.area && <small>حسب منطقة {customerInfo.area}</small>}
          </div>
          <div className="coupon-entry">
            <label>
              كوبون الخصم
              <input
                value={couponInput}
                onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                placeholder="مثال: BASRA10"
              />
            </label>
            <button onClick={applyCoupon} type="button">تطبيق</button>
            {appliedCoupon && (
              <button className="remove-coupon-button" onClick={removeCoupon} type="button">
                إلغاء الكوبون
              </button>
            )}
            {couponMessage && <small>{couponMessage}</small>}
          </div>
          {couponDiscount > 0 && (
            <div className="coupon-discount-row">
              <span>خصم الكوبون {appliedCoupon?.code}</span>
              <strong>- {formatMoney(couponDiscount)}</strong>
            </div>
          )}
          <div className="summary-total">
            <span>المبلغ النهائي</span>
            <strong>{formatMoney(finalTotal)}</strong>
          </div>
        </div>
        <button className="send-order-button" onClick={openOrderReview}>
          مراجعة الطلب قبل الإرسال
        </button>
        {showOrderReview && (
          <div className="order-review-panel">
            <div className="order-review-header">
              <div>
                <span>مراجعة أخيرة</span>
                <h3>تأكيد الطلب قبل الإرسال</h3>
              </div>
              <button type="button" onClick={() => setShowOrderReview(false)}>
                تعديل الطلب
              </button>
            </div>

            <div className="order-review-list">
              {cartItems.map((item, index) => (
                <div className="order-review-item" key={`review-${item.store}-${item.name}-${index}`}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.store}</span>
                  </div>
                  <div>
                    <span>الكمية: {item.quantity}</span>
                    <strong>{formatMoney(getPriceValue(item.price) * item.quantity)}</strong>
                  </div>
                </div>
              ))}
            </div>

            <div className="order-review-info">
              <div>
                <span>اسم الزبون</span>
                <strong>{customerInfo.name || "غير مكتوب"}</strong>
              </div>
              <div>
                <span>رقم الهاتف</span>
                <strong>{customerInfo.phone || "غير مكتوب"}</strong>
              </div>
              <div>
                <span>العنوان</span>
                <strong>
                  {customerInfo.area || "غير مكتوب"}
                  {customerInfo.landmark ? ` - ${customerInfo.landmark}` : ""}
                </strong>
              </div>
              <div>
                <span>ملاحظات</span>
                <strong>{customerInfo.notes || "بدون ملاحظات"}</strong>
              </div>
            </div>

            <div className="payment-method-panel">
              <span>طريقة الدفع</span>
              <div className="payment-method-options">
                {paymentMethods.map((method) => (
                  <button
                    className={paymentMethod === method ? "active" : ""}
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    type="button"
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="order-review-total">
              <span>المجموع النهائي مع التوصيل</span>
              <strong>{formatMoney(finalTotal)}</strong>
            </div>

            <button className="confirm-send-button" onClick={confirmSendOrder}>
              تأكيد إرسال الطلب
            </button>
          </div>
        )}
        {orderMessage && <div className="order-message">{orderMessage}</div>}
      </div>

      <div className="tracking-panel" id="customer-tracking">
        <h2>تتبع الطلب</h2>
        <p>هنا يشوف الزبون حالة طلباته من الإرسال إلى التسليم.</p>
        {customerOrders.length > 0 && (
          <div className="tracking-search-box">
            <label>
              بحث برقم الطلب
              <input
                inputMode="numeric"
                onChange={(event) => setTrackingSearch(event.target.value)}
                placeholder="مثال: 25"
                value={trackingSearch}
              />
            </label>
            <span>{visibleCustomerOrders.length} طلب ظاهر</span>
            {normalizedTrackingSearch && (
              <button onClick={resetTrackingSearch} type="button">
                عرض كل الطلبات
              </button>
            )}
          </div>
        )}
        {customerOrders.length === 0 ? (
          <div className="tracking-card">
            <h3>لا توجد طلبات للمتابعة</h3>
            <span>أرسل طلب من السلة حتى يبدأ التتبع.</span>
          </div>
        ) : visibleCustomerOrders.length === 0 ? (
          <div className="tracking-card">
            <h3>لا يوجد طلب بهذا الرقم</h3>
            <span>تأكد من رقم الطلب أو امسح البحث حتى تظهر كل الطلبات.</span>
            <button onClick={resetTrackingSearch} type="button">
              عرض كل الطلبات
            </button>
          </div>
        ) : (
          visibleCustomerOrders.map((order) => (
            <div className="tracking-card" key={`customer-${order.id}`}>
              <div className="tracking-card-header">
                <h3>طلب رقم {order.id}</h3>
                <button onClick={() => copyOrderNumber(order.id)} type="button">
                  نسخ رقم الطلب
                </button>
              </div>
              {copiedOrderId === String(order.id) && (
                <div className="copy-order-message">تم نسخ رقم الطلب {order.id}</div>
              )}
              <span>وقت الطلب: {formatOrderDate(order.createdAt)}</span>
              <span>الحالة الحالية: {order.status}</span>
              <span>التوصيل إلى: {order.area}</span>
              <span>طريقة الدفع: {order.paymentMethod ?? "الدفع عند الاستلام"}</span>
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
              {order.status === "تم التسليم" && (
                <>
                  <OrderReviewForm
                    draft={reviewDrafts[order.id]}
                    existingReview={reviews.find((review) => review.orderId === order.id)}
                    message={reviewMessage}
                    onChange={(changes) => updateReviewDraft(order.id, changes)}
                    onSubmit={() => submitReview(order)}
                  />
                  <ReturnRequestForm
                    draft={returnDrafts[order.id]}
                    message={returnMessage}
                    onChange={(changes) => updateReturnDraft(order, changes)}
                    onSubmit={() => submitReturn(order)}
                    order={order}
                    requests={returnRequests.filter((request) => request.orderId === order.id)}
                  />
                </>
              )}
              {order.status === "ملغي" && <div className="canceled-order-note">تم إلغاء الطلب</div>}
              {order.status === "طلب جديد" && (
                <>
                  <button
                    className="danger-action-button"
                    onClick={() => setPendingCancelOrderId(String(order.id))}
                  >
                    إلغاء الطلب
                  </button>
                  {pendingCancelOrderId === String(order.id) && (
                    <div className="sensitive-confirm-card">
                      <div>
                        <strong>تأكيد إلغاء الطلب رقم {order.id}</strong>
                        <span>
                          إذا ألغيت الطلب راح يرجع المخزون للمتجر وينشال من الطلبات النشطة.
                        </span>
                      </div>
                      <div className="sensitive-confirm-actions">
                        <button onClick={() => confirmCancelOrder(order.id)} type="button">
                          نعم، ألغي الطلب
                        </button>
                        <button onClick={() => setPendingCancelOrderId("")} type="button">
                          تراجع
                        </button>
                      </div>
                    </div>
                  )}
                </>
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

  function openOrderReview() {
    if (cartItems.length === 0) {
      onSendOrder()
      return
    }

    setShowOrderReview(true)
  }

  function confirmSendOrder() {
    onSendOrder(paymentMethod, appliedCoupon?.code ?? "")
    setShowOrderReview(false)
  }

  function applyCoupon() {
    const normalizedCode = couponInput.trim().toUpperCase()
    const coupon = coupons.find((item) => item.code === normalizedCode)

    if (!coupon || !isCouponAvailable(coupon)) {
      setAppliedCoupon(null)
      setCouponMessage("الكوبون غير صحيح أو منتهي أو وصل حد الاستخدام.")
      return
    }

    const discount = calculateCartCouponDiscount(cartItems, coupon)
    if (discount <= 0) {
      setAppliedCoupon(null)
      setCouponMessage(`الحد الأدنى لهذا الكوبون ${formatMoney(coupon.minimumOrder)} لكل متجر.`)
      return
    }

    setAppliedCoupon(coupon)
    setCouponMessage(`تم تطبيق الكوبون وخصم ${formatMoney(discount)}.`)
  }

  function removeCoupon() {
    setAppliedCoupon(null)
    setCouponInput("")
    setCouponMessage("تم إلغاء الكوبون.")
  }

  function updateReviewDraft(orderId, changes) {
    setReviewDrafts((current) => ({
      ...current,
      [orderId]: {
        storeRating: 0,
        driverRating: 0,
        comment: "",
        ...current[orderId],
        ...changes,
      },
    }))
    setReviewMessage("")
  }

  async function submitReview(order) {
    const draft = reviewDrafts[order.id] ?? {}
    if (!draft.storeRating || !draft.driverRating) {
      setReviewMessage("اختار تقييم المتجر والسائق قبل الحفظ.")
      return
    }

    const saved = await onSubmitReview({
      orderId: order.id,
      storeRating: draft.storeRating,
      driverRating: draft.driverRating,
      comment: draft.comment ?? "",
    })
    setReviewMessage(saved ? "شكرًا، تم حفظ تقييمك." : "تعذر حفظ التقييم أو تم تقييم الطلب سابقًا.")
  }

  function updateReturnDraft(order, changes) {
    setReturnDrafts((current) => ({
      ...current,
      [order.id]: {
        productName: order.items[0]?.name ?? "",
        quantity: 1,
        requestType: "exchange",
        reason: "المقاس غير مناسب",
        customerNote: "",
        ...current[order.id],
        ...changes,
      },
    }))
    setReturnMessage("")
  }

  async function submitReturn(order) {
    const draft = {
      productName: order.items[0]?.name ?? "",
      quantity: 1,
      requestType: "exchange",
      reason: "المقاس غير مناسب",
      customerNote: "",
      ...returnDrafts[order.id],
    }
    const item = order.items.find((orderItem) => orderItem.name === draft.productName)
    if (!item || draft.quantity < 1 || draft.quantity > item.quantity) {
      setReturnMessage("اختار المنتج والكمية بصورة صحيحة.")
      return
    }

    const saved = await onSubmitReturnRequest({ orderId: order.id, ...draft })
    setReturnMessage(saved ? "تم إرسال الطلب للمتجر والإدارة." : "تعذر الحفظ أو يوجد طلب سابق لهذا المنتج.")
  }

  function confirmCancelOrder(orderId) {
    onCancelOrder(orderId)
    setPendingCancelOrderId("")
  }

  async function copyOrderNumber(orderId) {
    const orderNumber = String(orderId)

    try {
      await navigator.clipboard.writeText(orderNumber)
    } catch {
      copyTextFallback(orderNumber)
    }

    setCopiedOrderId(orderNumber)
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

  function resetTrackingSearch() {
    setTrackingSearch("")
  }

  function resetStoreFilters() {
    setSearchText("")
    setActiveCategory("الكل")

    if (stores[0]) {
      onSelectStore(stores[0])
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

function copyTextFallback(text) {
  const textarea = document.createElement("textarea")

  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand("copy")
  document.body.removeChild(textarea)
}

function getPriceValue(price) {
  return Number(String(price).replace(/[^\d]/g, ""))
}

function isDiscountActive(product) {
  return (
    Number(product.discountPercent) > 0 &&
    Boolean(product.discountEndsAt) &&
    new Date(product.discountEndsAt).getTime() > Date.now()
  )
}

function isCouponAvailable(coupon) {
  return (
    coupon.isActive &&
    coupon.usedCount < coupon.maxUses &&
    new Date(coupon.expiresAt).getTime() > Date.now()
  )
}

function OrderReviewForm({ draft = {}, existingReview, message, onChange, onSubmit }) {
  if (existingReview) {
    return (
      <div className="completed-review">
        <strong>تم تقييم الطلب</strong>
        <span>المتجر: {renderStars(existingReview.storeRating)}</span>
        <span>السائق: {renderStars(existingReview.driverRating)}</span>
        {existingReview.comment && <small>{existingReview.comment}</small>}
      </div>
    )
  }

  return (
    <div className="order-rating-form">
      <strong>قيّم تجربتك</strong>
      <RatingButtons
        label="تقييم المتجر"
        value={draft.storeRating ?? 0}
        onChange={(storeRating) => onChange({ storeRating })}
      />
      <RatingButtons
        label="تقييم السائق"
        value={draft.driverRating ?? 0}
        onChange={(driverRating) => onChange({ driverRating })}
      />
      <textarea
        maxLength="300"
        onChange={(event) => onChange({ comment: event.target.value })}
        placeholder="ملاحظة قصيرة اختيارية"
        value={draft.comment ?? ""}
      />
      <button onClick={onSubmit} type="button">حفظ التقييم</button>
      {message && <small>{message}</small>}
    </div>
  )
}

function RatingButtons({ label, onChange, value }) {
  return (
    <div className="rating-buttons">
      <span>{label}</span>
      <div>
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            aria-label={`${label} ${rating} من 5`}
            className={rating <= value ? "active" : ""}
            key={rating}
            onClick={() => onChange(rating)}
            type="button"
          >
            ★
          </button>
        ))}
      </div>
    </div>
  )
}

function ReturnRequestForm({ draft = {}, message, onChange, onSubmit, order, requests }) {
  const selectedProductName = draft.productName ?? order.items[0]?.name ?? ""
  const selectedItem = order.items.find((item) => item.name === selectedProductName)

  return (
    <div className="return-request-form">
      <strong>استبدال أو استرجاع</strong>
      <div className="existing-return-list">
        {requests.map((request) => (
          <div key={request.id}>
            <span>{request.productName} — {getReturnStatusLabel(request.status)}</span>
            {request.merchantResponse && <small>رد المتجر: {request.merchantResponse}</small>}
          </div>
        ))}
      </div>
      <label>
        المنتج
        <select value={selectedProductName} onChange={(event) => onChange({ productName: event.target.value, quantity: 1 })}>
          {order.items.map((item) => <option key={item.name}>{item.name}</option>)}
        </select>
      </label>
      <label>
        المطلوب
        <select value={draft.requestType ?? "exchange"} onChange={(event) => onChange({ requestType: event.target.value })}>
          <option value="exchange">استبدال</option>
          <option value="refund">استرجاع</option>
        </select>
      </label>
      <label>
        الكمية
        <input
          max={selectedItem?.quantity ?? 1}
          min="1"
          onChange={(event) => onChange({ quantity: Number(event.target.value) })}
          type="number"
          value={draft.quantity ?? 1}
        />
      </label>
      <label>
        السبب
        <select value={draft.reason ?? "المقاس غير مناسب"} onChange={(event) => onChange({ reason: event.target.value })}>
          <option>المقاس غير مناسب</option>
          <option>المنتج مختلف عن الوصف</option>
          <option>المنتج تالف</option>
          <option>سبب آخر</option>
        </select>
      </label>
      <textarea
        maxLength="300"
        onChange={(event) => onChange({ customerNote: event.target.value })}
        placeholder="ملاحظة إضافية اختيارية"
        value={draft.customerNote ?? ""}
      />
      <button onClick={onSubmit} type="button">إرسال الطلب</button>
      {message && <small>{message}</small>}
    </div>
  )
}

function getReturnStatusLabel(status) {
  return {
    pending: "قيد المراجعة",
    approved: "مقبول",
    rejected: "مرفوض",
    completed: "مكتمل",
  }[status] ?? status
}

function renderStars(rating) {
  return "★".repeat(Number(rating)) + "☆".repeat(5 - Number(rating))
}

function formatVariantLabel(variant) {
  return [variant.size, variant.color].filter(Boolean).join(" / ")
}

function calculateCartCouponDiscount(items, coupon) {
  if (!coupon || !isCouponAvailable(coupon)) return 0
  const storeSubtotals = new Map()

  items.forEach((item) => {
    storeSubtotals.set(
      item.store,
      (storeSubtotals.get(item.store) ?? 0) + getPriceValue(item.price) * item.quantity,
    )
  })

  return [...storeSubtotals.values()].reduce((total, storeSubtotal) => {
    if (storeSubtotal < coupon.minimumOrder) return total
    const discount =
      coupon.discountType === "percentage"
        ? Math.round(storeSubtotal * coupon.discountValue / 100)
        : coupon.discountValue
    return total + Math.min(discount, storeSubtotal)
  }, 0)
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

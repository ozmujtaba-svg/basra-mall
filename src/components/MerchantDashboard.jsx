import { useEffect, useMemo, useState } from "react"

const storeCategories = ["ملابس", "كوزمتك", "عطور", "أحذية", "إكسسوارات"]
const productStatuses = ["متوفر", "مخفي مؤقتًا", "نفد"]
const orderStatusFilters = [
  { label: "الكل", value: "الكل" },
  { label: "طلب جديد", value: "طلب جديد" },
  { label: "قيد التجهيز", value: "قيد التجهيز" },
  { label: "جاهز للتوصيل", value: "جاهز للتوصيل" },
  { label: "قيد التوصيل", value: "قيد التوصيل" },
  { label: "تم التسليم", value: "تم التسليم" },
  { label: "ملغي", value: "ملغي" },
]
const orderSortOptions = [
  { label: "الأحدث أولًا", value: "newest" },
  { label: "الأقدم أولًا", value: "oldest" },
  { label: "الأعلى مبلغًا", value: "highest-total" },
]
const storeStatusFilters = [
  { label: "الكل", value: "all" },
  { label: "قيد المراجعة", value: "pending" },
  { label: "موافق عليه", value: "approved" },
  { label: "مرفوض", value: "rejected" },
]
const MAX_PRODUCT_IMAGE_SIZE = 900
const revenuePeriodFilters = ["اليوم", "آخر 7 أيام", "كل الوقت"]

export function MerchantDashboard({
  commissionRate,
  merchant,
  onAddProduct,
  onCancelOrder,
  onDeleteProduct,
  onPrepareOrder,
  onRegisterStore,
  onUpdateOrderStatus,
  onUpdateOrderNote,
  onUpdateProduct,
  orders,
  stores,
}) {
  const [storeName, setStoreName] = useState("")
  const [category, setCategory] = useState(storeCategories[0])
  const [phone, setPhone] = useState("")
  const [area, setArea] = useState("")
  const [selectedStoreName, setSelectedStoreName] = useState(stores[0]?.name ?? "")
  const [productName, setProductName] = useState("")
  const [productPrice, setProductPrice] = useState("")
  const [productQuantity, setProductQuantity] = useState("")
  const [productImage, setProductImage] = useState("")
  const [productStatus, setProductStatus] = useState(productStatuses[0])
  const [editingProductName, setEditingProductName] = useState("")
  const [orderSearch, setOrderSearch] = useState("")
  const [orderStatusFilter, setOrderStatusFilter] = useState("الكل")
  const [orderSort, setOrderSort] = useState(orderSortOptions[0].value)
  const [storeStatusFilter, setStoreStatusFilter] = useState(storeStatusFilters[0].value)
  const [revenuePeriodFilter, setRevenuePeriodFilter] = useState(revenuePeriodFilters[0])
  const [message, setMessage] = useState("")
  const [productMessage, setProductMessage] = useState("")
  const [copiedOrderId, setCopiedOrderId] = useState("")
  const [rejectConfirmOrderId, setRejectConfirmOrderId] = useState("")
  const [pendingDeleteProductName, setPendingDeleteProductName] = useState("")
  const selectedStore = useMemo(
    () => stores.find((store) => store.name === selectedStoreName) ?? stores[0],
    [selectedStoreName, stores],
  )
  const hasStores = stores.length > 0
  const filteredStoresByStatus = useMemo(
    () => stores.filter((store) => matchesStoreStatusFilter(store, storeStatusFilter)),
    [storeStatusFilter, stores],
  )
  const rejectedStores = useMemo(
    () => stores.filter((store) => store.status === "rejected"),
    [stores],
  )
  const revenuePeriodOrders = useMemo(
    () => filterOrdersByRevenuePeriod(orders, revenuePeriodFilter),
    [orders, revenuePeriodFilter],
  )
  const merchantRevenue = useMemo(
    () => calculateMerchantRevenue(revenuePeriodOrders, commissionRate),
    [commissionRate, revenuePeriodOrders],
  )
  const topMerchantProduct = useMemo(
    () => getTopMerchantProduct(orders, stores),
    [orders, stores],
  )
  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          matchesOrderSearch(order, orderSearch) &&
          (orderStatusFilter === "الكل" || order.status === orderStatusFilter),
      ),
    [orderSearch, orderStatusFilter, orders],
  )
  const sortedOrders = useMemo(() => sortOrders(filteredOrders, orderSort), [filteredOrders, orderSort])
  const merchantOrderSummary = useMemo(() => getMerchantOrderSummary(orders), [orders])
  const actionOrdersCount = merchantOrderSummary.newOrders + merchantOrderSummary.preparingOrders
  const merchantOrderAlert = getMerchantOrderAlert(merchantOrderSummary)
  const hasMerchantOrderFilters = orderStatusFilter !== "الكل" || Boolean(orderSearch.trim())
  const orderGroups = useMemo(
    () =>
      [
        { title: "طلبات جديدة", status: "طلب جديد" },
        { title: "قيد التجهيز", status: "قيد التجهيز" },
        { title: "جاهزة للتوصيل", status: "جاهز للتوصيل" },
        { title: "قيد التوصيل", status: "قيد التوصيل" },
        { title: "مكتملة", status: "تم التسليم" },
        { title: "ملغية", status: "ملغي" },
      ].map((group) => ({
        ...group,
        orders: sortedOrders.filter((order) => order.status === group.status),
      })).filter((group) => orderStatusFilter === "الكل" || group.status === orderStatusFilter),
    [orderStatusFilter, sortedOrders],
  )

  useEffect(() => {
    if (!stores.some((store) => store.name === selectedStoreName)) {
      setSelectedStoreName(stores[0]?.name ?? "")
    }
  }, [selectedStoreName, stores])

  async function submitStore(event) {
    event.preventDefault()

    if (!storeName.trim() || !area.trim()) {
      setMessage("ما نكدر نسجل المتجر بعد. اكتب اسم المتجر والمنطقة، وبعدها جرّب التسجيل.")
      return
    }

    const contactPhone = phone.trim() || merchant.phone

    const storeSaved = await onRegisterStore({
      name: storeName.trim(),
      category,
      phone: contactPhone,
      area: area.trim(),
    })
    if (storeSaved === false) {
      setMessage("تعذر حفظ المتجر بقاعدة البيانات. راجع التنبيه وحاول مرة ثانية.")
      return
    }
    setStoreName("")
    setPhone("")
    setArea("")
    setCategory(storeCategories[0])
    setSelectedStoreName(storeName.trim())
    setMessage(
      "تم تسجيل المتجر وهو الآن قيد مراجعة الإدارة. بعد الموافقة يظهر للزبائن وتكدر تستقبل طلبات.",
    )
  }

  async function submitProduct(event) {
    event.preventDefault()

    if (!selectedStoreName || !productName.trim() || !productPrice.trim() || !productQuantity.trim()) {
      setProductMessage(
        "بيانات المنتج ناقصة. اختار المتجر واكتب اسم المنتج والسعر والكمية حتى نكدر نحفظه.",
      )
      return
    }

    const numericPrice = Number(productPrice)
    const numericQuantity = Number(productQuantity)

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setProductMessage("السعر غير صحيح. اكتب رقم فقط بدون حروف، مثال: 25000")
      return
    }

    if (!Number.isFinite(numericQuantity) || numericQuantity < 0) {
      setProductMessage("الكمية غير صحيحة. اكتب رقم صفر أو أكثر، مثال: 10")
      return
    }

    const productData = {
      name: productName.trim(),
      price: numericPrice,
      quantity: numericQuantity,
      image: productImage.trim(),
      status: numericQuantity === 0 ? "نفد" : productStatus,
    }

    if (editingProductName) {
      const productUpdated = await onUpdateProduct(selectedStoreName, editingProductName, productData)
      if (productUpdated === false) {
        setProductMessage("تعذر تعديل المنتج بقاعدة البيانات. حاول مرة ثانية.")
        return
      }
      resetProductForm()
      setProductMessage(
        "تم تعديل المنتج بنجاح. السعر والكمية والحالة تحدّثت داخل متجر الزبون.",
      )
      return
    }

    const productAdded = await onAddProduct(selectedStoreName, productData)
    if (productAdded === false) {
      setProductMessage("تعذر حفظ المنتج بقاعدة البيانات. حاول مرة ثانية.")
      return
    }
    resetProductForm()
    setProductMessage(
      "تمت إضافة المنتج بنجاح. إذا المتجر مقبول، المنتج يظهر للزبون ويكدر يضيفه للسلة.",
    )
  }

  function chooseProductImage(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!file.type.startsWith("image/")) {
      setProductMessage("هذا الملف مو صورة. اختار صورة بصيغة PNG أو JPG حتى تنحفظ للمنتج.")
      return
    }

    const reader = new FileReader()

    reader.onload = async () => {
      try {
        const image = await resizeImage(String(reader.result))
        setProductImage(image)
        setProductMessage(
          "تم اختيار الصورة وتصغيرها. اضغط حفظ المنتج حتى تنحفظ وتظهر ببطاقة المنتج.",
        )
      } catch {
        setProductMessage("ما قدرنا نجهز الصورة. جرّب صورة أصغر أو استخدم رابط صورة بدل الملف.")
      }
    }

    reader.readAsDataURL(file)
  }

  function startEditingProduct(product) {
    setSelectedStoreName(selectedStore?.name ?? "")
    setProductName(product.name)
    setProductPrice(String(getPriceNumber(product.price)))
    setProductQuantity(String(product.quantity))
    setProductImage(product.image ?? "")
    setProductStatus(product.status ?? productStatuses[0])
    setEditingProductName(product.name)
    setProductMessage("عدّل البيانات بالنموذج، وبعدها اضغط حفظ التعديل.")
  }

  async function deleteProduct(productNameToDelete) {
    const productDeleted = await onDeleteProduct(selectedStore.name, productNameToDelete)
    if (productDeleted === false) {
      setProductMessage("تعذر حذف المنتج من قاعدة البيانات. حاول مرة ثانية.")
      return
    }

    if (editingProductName === productNameToDelete) {
      resetProductForm()
    }

    setPendingDeleteProductName("")
    setProductMessage("تم حذف المنتج من المتجر. انشال من العرض ومن أي سلة مرتبطة بيه.")
  }

  function resetProductForm() {
    setProductName("")
    setProductPrice("")
    setProductQuantity("")
    setProductImage("")
    setProductStatus(productStatuses[0])
    setEditingProductName("")
  }

  async function copyMerchantOrder(order) {
    const orderText = formatMerchantOrderCopyText(order, commissionRate)

    try {
      await navigator.clipboard.writeText(orderText)
    } catch {
      copyTextFallback(orderText)
    }

    setCopiedOrderId(String(order.id))
  }

  async function copyCustomerPhone(phoneNumber) {
    const cleanPhone = String(phoneNumber)

    try {
      await navigator.clipboard.writeText(cleanPhone)
    } catch {
      copyTextFallback(cleanPhone)
    }

    setProductMessage(`تم نسخ رقم الزبون: ${cleanPhone}. تقدر تلصقه بالاتصال أو الرسائل.`)
  }

  function confirmRejectOrder(orderId) {
    onCancelOrder(orderId)
    setRejectConfirmOrderId("")
  }

  function resetMerchantOrderFilters() {
    setOrderSearch("")
    setOrderStatusFilter("الكل")
  }

  return (
    <div className="orders-panel">
      <section
        className={hasStores ? "merchant-account-card ready" : "merchant-account-card empty"}
        id="merchant-status"
      >
        <div>
          <span>حالة حساب صاحب المتجر</span>
          <h2>{hasStores ? "متجرك مربوط بهذا الحساب" : "سجل متجرك أولًا"}</h2>
          <p>
            {hasStores
              ? `هذا الحساب يشوف ${stores.length} متجر فقط، والطلبات والمنتجات المرتبطة برقم ${merchant.phone}.`
              : "بعد تسجيل المتجر ينتظر موافقة الإدارة، وبعدها تقدر تضيف المنتجات وتستلم الطلبات."}
          </p>
        </div>
        <strong>{hasStores ? `${stores.length} متجر` : "لا يوجد متجر"}</strong>
      </section>

      {hasStores && (
        <section className="merchant-store-status-panel">
          <div className="merchant-section-top">
            <div>
              <h2>حالة المتاجر</h2>
              <p>فلتر المتاجر حسب موافقة الإدارة حتى تعرف شنو يحتاج متابعة.</p>
            </div>
            <span className="status-pill">{filteredStoresByStatus.length} نتيجة</span>
          </div>
          <div className="merchant-store-filter">
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
          <div className="merchant-store-status-list">
            {filteredStoresByStatus.map((store) => {
              const status = getStoreStatusInfo(store)

              return (
                <div className={`merchant-store-status ${status.className}`} key={store.name}>
                  <div>
                    <strong>{store.name}</strong>
                    <span>{status.message}</span>
                  </div>
                  <small>{status.label}</small>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="merchant-form-card" id="merchant-register">
        <h2>{hasStores ? "تسجيل متجر إضافي" : "تسجيل متجر"}</h2>
        <p>
          {hasStores
            ? "إذا عندك فرع أو متجر ثاني، سجله بنفس الحساب حتى يبقى مربوط إلك فقط."
            : "سجل معلومات متجرك حتى يظهر داخل مول البصرة للزبائن باسم حسابك."}
        </p>
        {rejectedStores.length > 0 && (
          <div className="rejected-notice">
            عندك متجر مرفوض. راجع الاسم أو النوع أو المنطقة، ثم سجل متجر جديد ببيانات أوضح.
          </div>
        )}
        <form className="merchant-form" onSubmit={submitStore}>
          <label>
            اسم المتجر
            <input
              value={storeName}
              onChange={(event) => setStoreName(event.target.value)}
              placeholder="مثال: أزياء العشار"
            />
          </label>

          <label>
            نوع المتجر
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {storeCategories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            رقم الهاتف
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={merchant.phone || "مثال: 07XXXXXXXXX"}
            />
          </label>

          <label>
            المنطقة داخل البصرة
            <input
              value={area}
              onChange={(event) => setArea(event.target.value)}
              placeholder="مثال: العشار"
            />
          </label>

          <button className="register-button" type="submit">
            حفظ المتجر
          </button>
        </form>
        {message && <div className="order-message">{message}</div>}
      </section>

      <section className="merchant-form-card" id="merchant-products">
        <h2>{editingProductName ? "تعديل منتج" : "إضافة منتج"}</h2>
        <p>
          {editingProductName
            ? `أنت تعدل المنتج: ${editingProductName}`
            : "أضف منتجات لمتجرك فقط حتى تظهر للزبون داخل المول."}
        </p>
        <form className="merchant-form" onSubmit={submitProduct}>
          <label>
            اختر المتجر
            <select
              disabled={!hasStores}
              value={selectedStoreName}
              onChange={(event) => setSelectedStoreName(event.target.value)}
            >
              {stores.map((store) => (
                <option key={store.name} value={store.name}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            اسم المنتج
            <input
              disabled={!hasStores}
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              placeholder="مثال: عطر رجالي"
            />
          </label>

          <label>
            السعر بالدينار
            <input
              disabled={!hasStores}
              value={productPrice}
              onChange={(event) => setProductPrice(event.target.value)}
              placeholder="مثال: 25000"
            />
          </label>

          <label>
            الكمية
            <input
              disabled={!hasStores}
              value={productQuantity}
              onChange={(event) => setProductQuantity(event.target.value)}
              placeholder="مثال: 10"
            />
          </label>

          <label>
            حالة المنتج
            <select
              disabled={!hasStores}
              value={productStatus}
              onChange={(event) => setProductStatus(event.target.value)}
            >
              {productStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>

          <label>
            رابط صورة المنتج
            <input
              disabled={!hasStores}
              value={productImage}
              onChange={(event) => setProductImage(event.target.value)}
              placeholder="اختياري: https://example.com/product.jpg"
            />
          </label>

          <label>
            اختيار صورة من اللابتوب
            <input
              accept="image/*"
              disabled={!hasStores}
              onChange={chooseProductImage}
              type="file"
            />
          </label>

          {productImage.trim() && (
            <div className="product-image-preview">
              <img src={productImage.trim()} alt="" loading="lazy" decoding="async" />
              <span>معاينة صورة المنتج</span>
            </div>
          )}

          <button className="register-button" disabled={!hasStores} type="submit">
            {editingProductName ? "حفظ التعديل" : "حفظ المنتج"}
          </button>

          {editingProductName && (
            <button className="secondary-form-button" onClick={resetProductForm} type="button">
              إلغاء التعديل
            </button>
          )}
        </form>
        {!hasStores && (
          <div className="order-message">سجل متجرك أولًا، وبعدها تكدر تضيف منتجات.</div>
        )}
        {productMessage && <div className="order-message">{productMessage}</div>}
      </section>

      <section className="merchant-form-card" id="merchant-products-list">
        <div className="merchant-section-top">
          <div>
            <h2>منتجات المتجر</h2>
            <p>تابع المنتجات الموجودة داخل المتجر المختار وحالة الكمية.</p>
          </div>
          <span className="status-pill">
            {getStoreStatusLabel(selectedStore)}
          </span>
        </div>

        {!selectedStore || selectedStore.products.length === 0 ? (
          <div className="product-card">
            <h3>لا توجد منتجات بعد</h3>
            <span>أضف أول منتج من النموذج أعلاه حتى يظهر هنا وعند الزبون.</span>
          </div>
        ) : (
          <div className="merchant-products">
            {selectedStore.products.map((product) => {
              const quantity = Number(product.quantity)
              const status = getProductStatus(quantity, product.status)
              const hasLowStock = status.className === "low"

              return (
                <div className="merchant-product-row" key={`${selectedStore.name}-${product.name}`}>
                  {product.image && (
                    <img
                      className="merchant-product-image"
                      src={product.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.price}</span>
                    {hasLowStock && <small className="low-stock-note">تنبيه: الكمية قليلة</small>}
                  </div>
                  <div>
                    <small>الكمية</small>
                    <strong>{Number.isFinite(quantity) ? quantity : "غير محددة"}</strong>
                  </div>
                  <span className={`stock-pill ${status.className}`}>{status.label}</span>
                  <div className="merchant-product-actions">
                    <button onClick={() => startEditingProduct(product)} type="button">
                      تعديل
                    </button>
                    <button
                      className="danger-button"
                      onClick={() => setPendingDeleteProductName(product.name)}
                      type="button"
                    >
                      حذف
                    </button>
                  </div>
                  {pendingDeleteProductName === product.name && (
                    <div className="sensitive-confirm-card">
                      <div>
                        <strong>تأكيد حذف {product.name}</strong>
                        <span>
                          إذا حذفت المنتج راح ينشال من المتجر ومن السلال المرتبطة بيه.
                        </span>
                      </div>
                      <div className="sensitive-confirm-actions">
                        <button onClick={() => deleteProduct(product.name)} type="button">
                          نعم، احذف المنتج
                        </button>
                        <button onClick={() => setPendingDeleteProductName("")} type="button">
                          تراجع
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="merchant-form-card" id="merchant-earnings">
        <div className="merchant-section-top">
          <div>
            <h2>أرباح المتجر</h2>
            <p>ملخص مبيعات متاجرك بعد استبعاد الطلبات الملغية واحتساب عمولة الإدارة.</p>
          </div>
          <span className="status-pill">عمولة {formatPercent(commissionRate)}</span>
        </div>
        <div className="revenue-period-filter">
          {revenuePeriodFilters.map((filter) => (
            <button
              className={revenuePeriodFilter === filter ? "active" : ""}
              key={filter}
              onClick={() => setRevenuePeriodFilter(filter)}
              type="button"
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="merchant-revenue-grid">
          <div className="revenue-row">
            <span>مبيعات الفترة</span>
            <strong>{formatMoney(merchantRevenue.totalSales)}</strong>
          </div>
          <div className="revenue-row">
            <span>طلبات محتسبة بالفترة</span>
            <strong>{merchantRevenue.activeOrders}</strong>
          </div>
          <div className="revenue-row muted">
            <span>طلبات ملغية بالفترة</span>
            <strong>{merchantRevenue.canceledOrders}</strong>
          </div>
          <div className="revenue-row">
            <span>عمولة الإدارة</span>
            <strong>{formatMoney(merchantRevenue.commission)}</strong>
          </div>
          <div className="revenue-row total">
            <span>صافي مبلغ المتجر للفترة</span>
            <strong>{formatMoney(merchantRevenue.netPayout)}</strong>
          </div>
        </div>
        <div className="merchant-top-product-card">
          <span>أفضل منتج عندك</span>
          <strong>{topMerchantProduct.name}</strong>
          <p>
            {topMerchantProduct.quantity > 0
              ? `${topMerchantProduct.store} - ${topMerchantProduct.quantity} قطعة مباعة بقيمة ${formatMoney(topMerchantProduct.sales)}`
              : "بعد أول طلب مكتمل أو نشط راح يظهر المنتج الأكثر طلبًا هنا."}
          </p>
        </div>
      </section>

      <h2 id="merchant-orders">طلبات المتجر</h2>
      <p>الطلبات مرتبة حسب المرحلة حتى تعرف شنو يحتاج تجهيز وشنو صار جاهز للتوصيل.</p>
      <div className="merchant-action-counter">
        <div>
          <span>طلبات تحتاج إجراء</span>
          <strong>{actionOrdersCount}</strong>
        </div>
        <div>
          <span>تحتاج قبول</span>
          <strong>{merchantOrderSummary.newOrders}</strong>
        </div>
        <div>
          <span>تحتاج تجهيز</span>
          <strong>{merchantOrderSummary.preparingOrders}</strong>
        </div>
        <p>
          {actionOrdersCount > 0
            ? "ابدأ بالطلبات الجديدة، وبعد القبول جهّز الطلبات قيد التجهيز."
            : "ماكو طلب يحتاج إجراء حاليًا."}
        </p>
      </div>
      <div className={`merchant-order-alert ${merchantOrderAlert.className}`}>
        <div>
          <strong>{merchantOrderAlert.title}</strong>
          <span>{merchantOrderAlert.message}</span>
        </div>
        <small>{merchantOrderAlert.count}</small>
      </div>
      <div className="merchant-order-summary">
        <div>
          <span>طلبات جديدة</span>
          <strong>{merchantOrderSummary.newOrders}</strong>
        </div>
        <div>
          <span>قيد التجهيز</span>
          <strong>{merchantOrderSummary.preparingOrders}</strong>
        </div>
        <div>
          <span>جاهزة للتوصيل</span>
          <strong>{merchantOrderSummary.readyOrders}</strong>
        </div>
        <div>
          <span>مجموع الطلبات</span>
          <strong>{merchantOrderSummary.totalOrders}</strong>
        </div>
      </div>
      <div className="merchant-order-filter">
        {orderStatusFilters.map((filter) => (
          <button
            className={orderStatusFilter === filter.value ? "active" : ""}
            key={filter.value}
            onClick={() => setOrderStatusFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <label className="order-search">
        بحث الطلبات
        <input
          value={orderSearch}
          onChange={(event) => setOrderSearch(event.target.value)}
          placeholder="رقم الطلب، اسم الزبون، الهاتف، المنطقة، أو المنتج"
        />
      </label>
      <label className="merchant-order-sort">
        ترتيب الطلبات
        <select value={orderSort} onChange={(event) => setOrderSort(event.target.value)}>
          {orderSortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="filter-summary order-result-summary">
        <div>
          <strong>{filteredOrders.length}</strong>
          <span>
            {hasMerchantOrderFilters ? "طلبات مطابقة للبحث والفلتر" : "كل طلبات المتجر"}
          </span>
        </div>
        {hasMerchantOrderFilters && (
          <button onClick={resetMerchantOrderFilters} type="button">
            عرض كل الطلبات
          </button>
        )}
      </div>
      {orders.length === 0 ? (
        <div className="order-card">
          <h3>لا توجد طلبات جديدة بعد</h3>
          <p className="order-meta">جرّب ترجع كزبون، أضف منتج للسلة، ثم اضغط إرسال الطلب.</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="order-card">
          <h3>لا توجد نتائج مطابقة</h3>
          <p className="order-meta">غيّر كلمة البحث أو فلتر الحالة حتى تظهر الطلبات.</p>
          <button onClick={resetMerchantOrderFilters} type="button">
            عرض كل الطلبات
          </button>
        </div>
      ) : (
        <div className="merchant-order-groups">
          {orderGroups.map((group) => (
            <section className="merchant-order-group" key={group.status}>
              <div className="merchant-order-group-header">
                <h3>{group.title}</h3>
                <span>{group.orders.length}</span>
              </div>
              {group.orders.length === 0 ? (
                <div className="empty-order-group">لا توجد طلبات في هذه المرحلة.</div>
              ) : (
                group.orders.map((order) => (
                  <div className="order-card merchant-order-card" key={order.id}>
                    <div className="merchant-order-card-top">
                      <div>
                        <small>طلب رقم</small>
                        <h3>{order.id}</h3>
                      </div>
                      <div className="merchant-order-card-actions">
                        <span className="status-pill">{order.status}</span>
                        <button onClick={() => copyMerchantOrder(order)} type="button">
                          نسخ بيانات الطلب
                        </button>
                      </div>
                    </div>
                    {copiedOrderId === String(order.id) && (
                      <div className="merchant-copy-message">تم نسخ بيانات الطلب رقم {order.id}</div>
                    )}
                    <div className="merchant-customer-contact">
                      <div>
                        <span>تواصل سريع مع الزبون</span>
                        <strong>{order.customer} - {order.phone}</strong>
                      </div>
                      <div className="merchant-customer-contact-actions">
                        <a href={`tel:${getPhoneLink(order.phone)}`}>اتصال بالزبون</a>
                        <button onClick={() => copyCustomerPhone(order.phone)} type="button">
                          نسخ رقم الزبون
                        </button>
                      </div>
                    </div>
                    <div className="merchant-order-facts">
                      <div>
                        <span>الزبون</span>
                        <strong>{order.customer}</strong>
                      </div>
                      <div>
                        <span>الهاتف</span>
                        <strong>{order.phone}</strong>
                      </div>
                      <div>
                        <span>المنطقة</span>
                        <strong>{order.area}</strong>
                      </div>
                      <div>
                        <span>عدد القطع</span>
                        <strong>{getOrderItemCount(order.items)}</strong>
                      </div>
                      <div>
                        <span>وقت الطلب</span>
                        <strong>{formatOrderDate(order.createdAt)}</strong>
                      </div>
                      <div>
                        <span>طريقة الدفع</span>
                        <strong>{order.paymentMethod ?? "الدفع عند الاستلام"}</strong>
                      </div>
                    </div>
                    {order.landmark && (
                      <div className="order-meta">الدلالة: {order.landmark}</div>
                    )}
                    {order.notes && <div className="order-meta">ملاحظات الزبون: {order.notes}</div>}
                    <div className="merchant-prep-box">
                      <div>
                        <span>المطلوب تجهيز</span>
                        <strong>{formatOrderPrepItems(order.items)}</strong>
                      </div>
                      <div>
                        <span>عدد القطع</span>
                        <strong>{getOrderItemCount(order.items)} قطعة</strong>
                      </div>
                      <div>
                        <span>طريقة الدفع</span>
                        <strong>{order.paymentMethod ?? "الدفع عند الاستلام"}</strong>
                      </div>
                      <div>
                        <span>المبلغ المطلوب</span>
                        <strong>{formatMoney(order.total)}</strong>
                      </div>
                      <div className="merchant-prep-next">
                        <span>الخطوة الجاية</span>
                        <strong>{getMerchantPrepStep(order.status)}</strong>
                      </div>
                    </div>
                    <div className="merchant-order-items">
                      {order.items.map((item) => (
                        <div key={`${order.id}-${item.store}-${item.name}`}>
                          <span>{item.name}</span>
                          <strong>{item.quantity} قطعة</strong>
                          <small>{item.store}</small>
                        </div>
                      ))}
                    </div>
                    <div className="merchant-order-money">
                      <span>مجموع المنتجات: {formatMoney(order.subtotal)}</span>
                      <span>التوصيل: {formatMoney(order.deliveryFee)}</span>
                      <strong>المبلغ الكلي: {formatMoney(order.total)}</strong>
                    </div>
                    <div className="merchant-order-quick-summary">
                      <div>
                        <span>عمولة الإدارة</span>
                        <strong>{formatMoney(getOrderCommission(order, commissionRate))}</strong>
                      </div>
                      <div>
                        <span>ربح المتجر المتوقع</span>
                        <strong>{formatMoney(getOrderMerchantProfit(order, commissionRate))}</strong>
                      </div>
                      <div>
                        <span>حالة العمل</span>
                        <strong>{getMerchantOrderWorkLabel(order.status)}</strong>
                      </div>
                    </div>
                    <label className="order-note-box">
                      ملاحظة متابعة
                      <textarea
                        value={order.internalNote ?? ""}
                        onChange={(event) => onUpdateOrderNote(order.id, event.target.value)}
                        placeholder="مثال: اتصلت بالزبون، الطلب ناقص قطعة، التوصيل العصر"
                      />
                    </label>
                    <div className="merchant-order-actions">
                      {order.status === "طلب جديد" && (
                        <button
                          className="prepare-button"
                          onClick={() => onUpdateOrderStatus(order.id, "قيد التجهيز")}
                        >
                          قبول الطلب
                        </button>
                      )}
                      {order.status === "قيد التجهيز" && (
                        <button className="prepare-button" onClick={() => onPrepareOrder(order.id)}>
                          جاهز للتوصيل
                        </button>
                      )}
                      {["طلب جديد", "قيد التجهيز", "جاهز للتوصيل"].includes(order.status) && (
                        <button
                          className="danger-action-button"
                          onClick={() => setRejectConfirmOrderId(String(order.id))}
                        >
                          رفض الطلب
                        </button>
                      )}
                    </div>
                    {rejectConfirmOrderId === String(order.id) && (
                      <div className="merchant-reject-confirm">
                        <div>
                          <strong>هل أنت متأكد من رفض الطلب رقم {order.id}؟</strong>
                          <span>إذا رفضت الطلب راح يتغير إلى ملغي ويظهر للزبون أنه مرفوض.</span>
                        </div>
                        <div className="merchant-reject-confirm-actions">
                          <button onClick={() => confirmRejectOrder(order.id)} type="button">
                            نعم، ارفض الطلب
                          </button>
                          <button onClick={() => setRejectConfirmOrderId("")} type="button">
                            تراجع
                          </button>
                        </div>
                      </div>
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

function getProductStatus(quantity, manualStatus) {
  if (manualStatus === "مخفي مؤقتًا") {
    return { label: "مخفي مؤقتًا", className: "hidden" }
  }

  if (manualStatus === "نفد") {
    return { label: "نفد", className: "empty" }
  }

  if (!Number.isFinite(quantity)) {
    return { label: "غير محدد", className: "unknown" }
  }

  if (quantity === 0) {
    return { label: "نفد", className: "empty" }
  }

  if (quantity <= 3) {
    return { label: "كمية قليلة", className: "low" }
  }

  return { label: "متوفر", className: "available" }
}

function resizeImage(imageSource) {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      const ratio = Math.min(
        MAX_PRODUCT_IMAGE_SIZE / image.width,
        MAX_PRODUCT_IMAGE_SIZE / image.height,
        1,
      )
      const canvas = document.createElement("canvas")
      canvas.width = Math.round(image.width * ratio)
      canvas.height = Math.round(image.height * ratio)

      const context = canvas.getContext("2d")

      if (!context) {
        reject(new Error("Canvas is not available"))
        return
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL("image/jpeg", 0.78))
    }

    image.onerror = reject
    image.src = imageSource
  })
}

function getStoreStatusLabel(store) {
  if (!store) {
    return "لا يوجد متجر"
  }

  if (store.status === "pending") {
    return "قيد مراجعة الإدارة"
  }

  if (store.status === "rejected") {
    return "مرفوض من الإدارة"
  }

  return store.name
}

function getStoreStatusInfo(store) {
  if (store.status === "pending") {
    return {
      className: "pending",
      label: "قيد المراجعة",
      message: "بانتظار موافقة الإدارة. المتجر لا يظهر للزبائن بعد.",
    }
  }

  if (store.status === "rejected") {
    return {
      className: "rejected",
      label: "مرفوض",
      message: store.rejectionReason
        ? `سبب الرفض: ${store.rejectionReason}`
        : "راجع بيانات المتجر وسجله من جديد بمعلومات أوضح.",
    }
  }

  return {
    className: "approved",
    label: "موافق عليه",
    message: "ظاهر للزبائن ويمكنهم تصفح منتجاته وطلبها.",
  }
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

function getOrderItemCount(items) {
  return items.reduce((total, item) => total + Number(item.quantity), 0)
}

function formatOrderPrepItems(items) {
  return items.map((item) => `${item.name} × ${item.quantity}`).join("، ")
}

function getMerchantOrderSummary(orders) {
  return {
    newOrders: orders.filter((order) => order.status === "طلب جديد").length,
    preparingOrders: orders.filter((order) => order.status === "قيد التجهيز").length,
    readyOrders: orders.filter((order) => order.status === "جاهز للتوصيل").length,
    totalOrders: orders.length,
  }
}

function getMerchantOrderAlert(summary) {
  const actionCount = summary.newOrders + summary.preparingOrders

  if (actionCount > 0) {
    return {
      className: "attention",
      count: actionCount,
      title: "عندك طلبات تحتاج متابعة",
      message: `${summary.newOrders} طلب جديد و ${summary.preparingOrders} طلب قيد التجهيز يحتاج قبول أو تجهيز.`,
    }
  }

  if (summary.readyOrders > 0) {
    return {
      className: "ready",
      count: summary.readyOrders,
      title: "طلبات جاهزة للتوصيل",
      message: "أكو طلبات جاهزة وتنتظر السائق حتى يستلمها.",
    }
  }

  return {
    className: "quiet",
    count: summary.totalOrders,
    title: "لا توجد طلبات مستعجلة",
    message: "ماكو طلبات جديدة تحتاج قرار حاليًا.",
  }
}

function sortOrders(orders, sortType) {
  return [...orders].sort((firstOrder, secondOrder) => {
    if (sortType === "oldest") {
      return firstOrder.id - secondOrder.id
    }

    if (sortType === "highest-total") {
      return Number(secondOrder.total) - Number(firstOrder.total)
    }

    return secondOrder.id - firstOrder.id
  })
}

function getOrderCommission(order, commissionRate) {
  return Number(order.subtotal) * commissionRate
}

function getOrderMerchantProfit(order, commissionRate) {
  return Number(order.subtotal) - getOrderCommission(order, commissionRate)
}

function getMerchantOrderWorkLabel(status) {
  if (status === "طلب جديد") {
    return "يحتاج قبول"
  }

  if (status === "قيد التجهيز") {
    return "يحتاج تجهيز"
  }

  if (status === "جاهز للتوصيل") {
    return "ينتظر السائق"
  }

  if (status === "قيد التوصيل") {
    return "عند السائق"
  }

  if (status === "تم التسليم") {
    return "مكتمل"
  }

  return "متوقف"
}

function getMerchantPrepStep(status) {
  if (status === "طلب جديد") {
    return "راجع الطلب واضغط قبول الطلب إذا كل المنتجات متوفرة."
  }

  if (status === "قيد التجهيز") {
    return "جهّز المنتجات بالكيس، وبعدها اضغط جاهز للتوصيل."
  }

  if (status === "جاهز للتوصيل") {
    return "انتظر السائق حتى يستلم الطلب من المتجر."
  }

  if (status === "قيد التوصيل") {
    return "الطلب صار عند السائق، تابع الحالة فقط."
  }

  if (status === "تم التسليم") {
    return "الطلب مكتمل، راجع أرباح المتجر."
  }

  return "الطلب متوقف ولا يحتاج تجهيز حاليًا."
}

function formatMerchantOrderCopyText(order, commissionRate) {
  return [
    `طلب رقم: ${order.id}`,
    `الزبون: ${order.customer}`,
    `الهاتف: ${order.phone}`,
    `المنطقة: ${order.area}`,
    order.landmark ? `الدلالة: ${order.landmark}` : "",
    order.notes ? `ملاحظات الزبون: ${order.notes}` : "",
    `المنتجات: ${formatOrderPrepItems(order.items)}`,
    `طريقة الدفع: ${order.paymentMethod ?? "الدفع عند الاستلام"}`,
    `المبلغ الكلي: ${formatMoney(order.total)}`,
    `ربح المتجر المتوقع: ${formatMoney(getOrderMerchantProfit(order, commissionRate))}`,
    `الحالة: ${order.status}`,
  ]
    .filter(Boolean)
    .join("\n")
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

function getPhoneLink(phone) {
  return String(phone).replace(/[^\d+]/g, "")
}

function formatMoney(value) {
  return `${Math.round(Number(value)).toLocaleString("en-US")} د.ع`
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

function formatPercent(value) {
  return `${Math.round(value * 100)}%`
}

function filterOrdersByRevenuePeriod(orders, period) {
  if (period === "اليوم") {
    return orders.filter((order) => isToday(order.createdAt))
  }

  if (period === "آخر 7 أيام") {
    return orders.filter((order) => isWithinLastDays(order.createdAt, 7))
  }

  return orders
}

function isToday(createdAt) {
  const orderDate = new Date(createdAt)
  const today = new Date()

  return (
    orderDate.getFullYear() === today.getFullYear() &&
    orderDate.getMonth() === today.getMonth() &&
    orderDate.getDate() === today.getDate()
  )
}

function isWithinLastDays(createdAt, days) {
  const orderDate = new Date(createdAt)
  const startDate = new Date()
  startDate.setHours(0, 0, 0, 0)
  startDate.setDate(startDate.getDate() - (days - 1))

  return orderDate >= startDate
}

function calculateMerchantRevenue(orders, commissionRate) {
  const activeOrders = orders.filter((order) => order.status !== "ملغي")
  const canceledOrders = orders.length - activeOrders.length
  const totalSales = activeOrders.reduce((total, order) => total + order.subtotal, 0)
  const commission = totalSales * commissionRate

  return {
    activeOrders: activeOrders.length,
    canceledOrders,
    commission,
    netPayout: totalSales - commission,
    totalSales,
  }
}

function getTopMerchantProduct(orders, stores) {
  const merchantStoreNames = stores.map((store) => store.name)
  const productStats = new Map()
  const activeOrders = orders.filter((order) => order.status !== "ملغي")

  activeOrders.forEach((order) => {
    order.items
      .filter((item) => merchantStoreNames.includes(item.store))
      .forEach((item) => {
        const key = `${item.store}-${item.name}`
        const currentStats = productStats.get(key) ?? {
          name: item.name,
          quantity: 0,
          sales: 0,
          store: item.store,
        }

        productStats.set(key, {
          ...currentStats,
          quantity: currentStats.quantity + item.quantity,
          sales: currentStats.sales + getPriceNumber(item.price) * item.quantity,
        })
      })
  })

  return (
    [...productStats.values()].sort(
      (firstProduct, secondProduct) => secondProduct.quantity - firstProduct.quantity,
    )[0] ?? {
      name: "لا توجد مبيعات بعد",
      quantity: 0,
      sales: 0,
      store: "",
    }
  )
}

function matchesOrderSearch(order, searchText) {
  const search = searchText.trim().toLowerCase()

  if (!search) {
    return true
  }

  const items = order.items.map((item) => `${item.name} ${item.store}`).join(" ")
  const searchableText = `${order.id} ${order.customer} ${order.phone} ${order.area} ${order.landmark} ${order.notes} ${order.internalNote} ${formatOrderDate(order.createdAt)} ${items}`

  return searchableText.toLowerCase().includes(search)
}

function getPriceNumber(price) {
  if (typeof price === "number") {
    return price
  }

  return Number(String(price).replace(/[^\d.]/g, ""))
}

import { useEffect, useState } from "react"

const storeCategories = ["ملابس", "كوزمتك", "عطور", "أحذية", "إكسسوارات"]
const productStatuses = ["متوفر", "مخفي مؤقتًا", "نفد"]

export function MerchantDashboard({
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
  const [message, setMessage] = useState("")
  const [productMessage, setProductMessage] = useState("")
  const selectedStore = stores.find((store) => store.name === selectedStoreName) ?? stores[0]
  const hasStores = stores.length > 0
  const rejectedStores = stores.filter((store) => store.status === "rejected")
  const filteredOrders = orders.filter((order) => matchesOrderSearch(order, orderSearch))
  const orderGroups = [
    { title: "طلبات جديدة", status: "طلب جديد" },
    { title: "قيد التجهيز", status: "قيد التجهيز" },
    { title: "جاهزة للتوصيل", status: "جاهز للتوصيل" },
    { title: "قيد التوصيل", status: "قيد التوصيل" },
    { title: "مكتملة", status: "تم التسليم" },
    { title: "ملغية", status: "ملغي" },
  ].map((group) => ({
    ...group,
    orders: filteredOrders.filter((order) => order.status === group.status),
  }))

  useEffect(() => {
    if (!stores.some((store) => store.name === selectedStoreName)) {
      setSelectedStoreName(stores[0]?.name ?? "")
    }
  }, [selectedStoreName, stores])

  function submitStore(event) {
    event.preventDefault()

    if (!storeName.trim() || !area.trim()) {
      setMessage("اكتب اسم المتجر والمنطقة حتى نسجل المتجر.")
      return
    }

    const contactPhone = phone.trim() || merchant.phone

    onRegisterStore({
      name: storeName.trim(),
      category,
      phone: contactPhone,
      area: area.trim(),
    })
    setStoreName("")
    setPhone("")
    setArea("")
    setCategory(storeCategories[0])
    setSelectedStoreName(storeName.trim())
    setMessage("تم تسجيل المتجر وهو الآن قيد مراجعة الإدارة. يظهر للزبائن بعد الموافقة.")
  }

  function submitProduct(event) {
    event.preventDefault()

    if (!selectedStoreName || !productName.trim() || !productPrice.trim() || !productQuantity.trim()) {
      setProductMessage("اختر متجر واكتب اسم المنتج والسعر والكمية.")
      return
    }

    const numericPrice = Number(productPrice)
    const numericQuantity = Number(productQuantity)

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setProductMessage("اكتب السعر كرقم صحيح، مثال: 25000")
      return
    }

    if (!Number.isFinite(numericQuantity) || numericQuantity < 0) {
      setProductMessage("اكتب الكمية كرقم صحيح، مثال: 10")
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
      onUpdateProduct(selectedStoreName, editingProductName, productData)
      resetProductForm()
      setProductMessage("تم تعديل المنتج، والتغيير ظهر عند الزبون.")
      return
    }

    onAddProduct(selectedStoreName, productData)
    resetProductForm()
    setProductMessage("تمت إضافة المنتج، وظهر الآن داخل المتجر عند الزبون.")
  }

  function chooseProductImage(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!file.type.startsWith("image/")) {
      setProductMessage("اختار ملف صورة فقط.")
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setProductImage(String(reader.result))
      setProductMessage("تم اختيار الصورة. اضغط حفظ المنتج حتى تنحفظ.")
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

  function deleteProduct(productNameToDelete) {
    onDeleteProduct(selectedStore.name, productNameToDelete)

    if (editingProductName === productNameToDelete) {
      resetProductForm()
    }

    setProductMessage("تم حذف المنتج من المتجر.")
  }

  function resetProductForm() {
    setProductName("")
    setProductPrice("")
    setProductQuantity("")
    setProductImage("")
    setProductStatus(productStatuses[0])
    setEditingProductName("")
  }

  return (
    <div className="orders-panel">
      <section className="merchant-form-card">
        <h2>تسجيل متجر</h2>
        <p>سجل معلومات متجرك حتى يظهر داخل مول البصرة للزبائن باسم حسابك.</p>
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

      <section className="merchant-form-card">
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
              <img src={productImage.trim()} alt="" />
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

      <section className="merchant-form-card">
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
                  {product.image && <img className="merchant-product-image" src={product.image} alt="" />}
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
                      onClick={() => deleteProduct(product.name)}
                      type="button"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <h2>طلبات المتجر</h2>
      <p>الطلبات مرتبة حسب المرحلة حتى تعرف شنو يحتاج تجهيز وشنو صار جاهز للتوصيل.</p>
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
          <h3>لا توجد طلبات جديدة بعد</h3>
          <p className="order-meta">جرّب ترجع كزبون، أضف منتج للسلة، ثم اضغط إرسال الطلب.</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="order-card">
          <h3>لا توجد نتائج مطابقة</h3>
          <p className="order-meta">غيّر كلمة البحث حتى تظهر الطلبات.</p>
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
                  <div className="order-card" key={order.id}>
                    <h3>طلب رقم {order.id}</h3>
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
                    {order.total && (
                      <div className="order-total">المبلغ النهائي: {formatMoney(order.total)}</div>
                    )}
                    <label className="order-note-box">
                      ملاحظة متابعة
                      <textarea
                        value={order.internalNote ?? ""}
                        onChange={(event) => onUpdateOrderNote(order.id, event.target.value)}
                        placeholder="مثال: اتصلت بالزبون، الطلب ناقص قطعة، التوصيل العصر"
                      />
                    </label>
                    <span className="status-pill">{order.status}</span>
                    {order.status === "طلب جديد" && (
                      <button
                        className="prepare-button"
                        onClick={() => onUpdateOrderStatus(order.id, "قيد التجهيز")}
                      >
                        بدء التجهيز
                      </button>
                    )}
                    {order.status === "قيد التجهيز" && (
                      <button className="prepare-button" onClick={() => onPrepareOrder(order.id)}>
                        جاهز للتوصيل
                      </button>
                    )}
                    {["طلب جديد", "قيد التجهيز", "جاهز للتوصيل"].includes(order.status) && (
                      <button className="danger-action-button" onClick={() => onCancelOrder(order.id)}>
                        إلغاء الطلب
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

function getPriceNumber(price) {
  if (typeof price === "number") {
    return price
  }

  return Number(String(price).replace(/[^\d.]/g, ""))
}

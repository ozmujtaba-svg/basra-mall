import { useState } from "react"

const storeCategories = ["ملابس", "كوزمتك", "عطور", "أحذية", "إكسسوارات"]

export function MerchantDashboard({
  onAddProduct,
  onPrepareOrder,
  onRegisterStore,
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
  const [message, setMessage] = useState("")
  const [productMessage, setProductMessage] = useState("")

  function submitStore(event) {
    event.preventDefault()

    if (!storeName.trim() || !phone.trim() || !area.trim()) {
      setMessage("اكتب اسم المتجر ورقم الهاتف والمنطقة حتى نسجل المتجر.")
      return
    }

    onRegisterStore({
      name: storeName.trim(),
      category,
      phone: phone.trim(),
      area: area.trim(),
    })
    setStoreName("")
    setPhone("")
    setArea("")
    setCategory(storeCategories[0])
    setSelectedStoreName(storeName.trim())
    setMessage("تم تسجيل المتجر، وظهر الآن داخل واجهة الزبون.")
  }

  function submitProduct(event) {
    event.preventDefault()

    if (!selectedStoreName || !productName.trim() || !productPrice.trim() || !productQuantity.trim()) {
      setProductMessage("اختر متجر واكتب اسم المنتج والسعر والكمية.")
      return
    }

    const numericPrice = Number(productPrice)

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setProductMessage("اكتب السعر كرقم صحيح، مثال: 25000")
      return
    }

    onAddProduct(selectedStoreName, {
      name: productName.trim(),
      price: numericPrice,
      quantity: productQuantity.trim(),
    })
    setProductName("")
    setProductPrice("")
    setProductQuantity("")
    setProductMessage("تمت إضافة المنتج، وظهر الآن داخل المتجر عند الزبون.")
  }

  return (
    <div className="orders-panel">
      <section className="merchant-form-card">
        <h2>تسجيل متجر</h2>
        <p>سجل معلومات المتجر حتى يظهر داخل مول البصرة للزبائن.</p>
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
              placeholder="مثال: 07XXXXXXXXX"
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
        <h2>إضافة منتج</h2>
        <p>أضف منتجات للمتجر حتى تظهر للزبون داخل المول.</p>
        <form className="merchant-form" onSubmit={submitProduct}>
          <label>
            اختر المتجر
            <select
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
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              placeholder="مثال: عطر رجالي"
            />
          </label>

          <label>
            السعر بالدينار
            <input
              value={productPrice}
              onChange={(event) => setProductPrice(event.target.value)}
              placeholder="مثال: 25000"
            />
          </label>

          <label>
            الكمية
            <input
              value={productQuantity}
              onChange={(event) => setProductQuantity(event.target.value)}
              placeholder="مثال: 10"
            />
          </label>

          <button className="register-button" type="submit">
            حفظ المنتج
          </button>
        </form>
        {productMessage && <div className="order-message">{productMessage}</div>}
      </section>

      <h2>طلبات المتجر</h2>
      <p>أي طلب يرسله الزبون يظهر هنا حتى يجهزه صاحب المتجر.</p>
      {orders.length === 0 ? (
        <div className="order-card">
          <h3>لا توجد طلبات جديدة بعد</h3>
          <p className="order-meta">جرّب ترجع كزبون، أضف منتج للسلة، ثم اضغط إرسال الطلب.</p>
        </div>
      ) : (
        orders.map((order) => (
          <div className="order-card" key={order.id}>
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
            <button className="prepare-button" onClick={() => onPrepareOrder(order.id)}>
              تجهيز الطلب
            </button>
          </div>
        ))
      )}
    </div>
  )
}

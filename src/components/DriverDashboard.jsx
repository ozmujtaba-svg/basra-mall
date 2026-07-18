import { useState } from "react"

const deliveryStatusFilters = ["الكل", "جاهز للتوصيل", "قيد التوصيل", "تم التسليم"]
const deliverySortOptions = [
  "الأحدث أولًا",
  "الأقدم أولًا",
  "أعلى أجرة توصيل",
  "أقل أجرة توصيل",
]
const quickDriverNotes = [
  "اتصلت بالزبون",
  "الزبون ما رد",
  "وصلت للمحل",
  "الطلب تأخر بالمحل",
  "تم التسليم نقدًا",
]

export function DriverDashboard({ onUpdateOrderNote, onUpdateStatus, orders, stores = [] }) {
  const [orderSearch, setOrderSearch] = useState("")
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState(deliveryStatusFilters[0])
  const [deliverySort, setDeliverySort] = useState(deliverySortOptions[0])
  const [copyMessage, setCopyMessage] = useState("")
  const filteredOrders = orders
    .filter((order) => deliveryStatusFilter === "الكل" || order.status === deliveryStatusFilter)
    .filter((order) => matchesOrderSearch(order, orderSearch))
    .sort((firstOrder, secondOrder) => sortDeliveryOrders(firstOrder, secondOrder, deliverySort))
  const deliveredOrders = orders.filter((order) => order.status === "تم التسليم")
  const activeDeliveries = orders.filter((order) => order.status === "قيد التوصيل")
  const availableDeliveries = orders.filter((order) => order.status === "جاهز للتوصيل")
  const deliveryEarnings = deliveredOrders.reduce((total, order) => total + order.deliveryFee, 0)
  const availableDeliveryFees = getDeliveryFees(availableDeliveries)
  const activeDeliveryFees = getDeliveryFees(activeDeliveries)
  const expectedDeliveryFees = getDeliveryFees(orders.filter((order) => order.status !== "ملغي"))
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

      <section className="driver-earnings-card">
        <div>
          <h3>أرباح السائق</h3>
          <p>ملخص يوضح أجور التوصيل حسب مرحلة الطلب.</p>
        </div>
        <div className="driver-earnings-grid">
          <div className="revenue-row">
            <span>طلبات جاهزة للاستلام</span>
            <strong>{availableDeliveries.length}</strong>
          </div>
          <div className="revenue-row">
            <span>طلبات قيد التوصيل</span>
            <strong>{activeDeliveries.length}</strong>
          </div>
          <div className="revenue-row">
            <span>طلبات تم تسليمها</span>
            <strong>{deliveredOrders.length}</strong>
          </div>
          <div className="revenue-row total">
            <span>أجور التوصيل المسلّمة</span>
            <strong>{formatMoney(deliveryEarnings)}</strong>
          </div>
          <div className="revenue-row">
            <span>أجرة الطلبات الجاهزة</span>
            <strong>{formatMoney(availableDeliveryFees)}</strong>
          </div>
          <div className="revenue-row">
            <span>أجرة الطلبات قيد التوصيل</span>
            <strong>{formatMoney(activeDeliveryFees)}</strong>
          </div>
          <div className="revenue-row total">
            <span>كل أجور التوصيل المتوقعة</span>
            <strong>{formatMoney(expectedDeliveryFees)}</strong>
          </div>
        </div>
      </section>

      <label className="order-search">
        بحث الطلبات
        <input
          value={orderSearch}
          onChange={(event) => setOrderSearch(event.target.value)}
          placeholder="رقم الطلب، اسم الزبون، الهاتف، المنطقة، أو المنتج"
        />
      </label>
      <label className="driver-order-sort">
        فرز طلبات السائق
        <select value={deliverySort} onChange={(event) => setDeliverySort(event.target.value)}>
          {deliverySortOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
      <div className="driver-order-filter">
        {deliveryStatusFilters.map((status) => (
          <button
            className={deliveryStatusFilter === status ? "active" : ""}
            key={status}
            onClick={() => setDeliveryStatusFilter(status)}
          >
            {status}
          </button>
        ))}
      </div>
      {copyMessage && <div className="driver-copy-message">{copyMessage}</div>}
      {orders.length === 0 ? (
        <div className="order-card">
          <h3>لا توجد طلبات جاهزة للتوصيل</h3>
          <p className="order-meta">جهّز طلب من واجهة صاحب المتجر حتى يظهر هنا.</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="order-card">
          <h3>لا توجد نتائج مطابقة</h3>
          <p className="order-meta">غيّر كلمة البحث أو فلتر الحالة حتى تظهر طلبات التوصيل.</p>
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
                group.orders.map((order) => {
                  const pickupStore = getPickupStore(order, stores)

                  return (
                    <div className="order-card delivery-order-card" key={order.id}>
                      <div className="order-card-top">
                        <h3>توصيل طلب رقم {order.id}</h3>
                        <span className="status-pill">{order.status}</span>
                      </div>

                      <div className="driver-task-summary">
                        <div>
                          <span>أجرة التوصيل</span>
                          <strong>{formatMoney(order.deliveryFee)}</strong>
                        </div>
                        <div>
                          <span>حالة المهمة</span>
                          <strong>{getDriverTaskStatus(order.status)}</strong>
                        </div>
                        <div>
                          <span>عدد القطع</span>
                          <strong>{getOrderItemCount(order.items)}</strong>
                        </div>
                        <div>
                          <span>المطلوب الآن</span>
                          <strong>{getDriverNextStep(order.status)}</strong>
                        </div>
                        <div>
                          <span>وقت الطلب</span>
                          <strong>{formatOrderDate(order.createdAt)}</strong>
                        </div>
                      </div>

                      <div className="delivery-route-details">
                        <div className="route-stop pickup">
                          <small>استلام من المتجر</small>
                          <strong>{pickupStore?.name ?? order.items[0]?.store}</strong>
                          <span>المنطقة: {pickupStore?.area ?? "غير محددة"}</span>
                          <span>رقم المتجر: {pickupStore?.phone ?? "غير متوفر"}</span>
                          {pickupStore?.phone && (
                            <div className="route-contact-actions">
                              <a href={`tel:${getPhoneLink(pickupStore.phone)}`}>اتصال بالمتجر</a>
                              <button
                                onClick={() => copyPhoneNumber(pickupStore.phone, "المتجر")}
                                type="button"
                              >
                                نسخ رقم المتجر
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="route-stop dropoff">
                          <small>تسليم إلى الزبون</small>
                          <strong>{order.customer}</strong>
                          <span>المنطقة: {order.area}</span>
                          {order.landmark && <span>الدلالة: {order.landmark}</span>}
                          <span>رقم الزبون: {order.phone}</span>
                          <div className="route-contact-actions">
                            <a href={`tel:${getPhoneLink(order.phone)}`}>اتصال بالزبون</a>
                            <button onClick={() => copyPhoneNumber(order.phone, "الزبون")} type="button">
                              نسخ رقم الزبون
                            </button>
                          </div>
                        </div>
                      </div>

                      {order.notes && <div className="order-meta">ملاحظات الزبون: {order.notes}</div>}

                      <div className="order-products">
                        المنتجات: {formatOrderItems(order.items)}
                      </div>
                      {order.total && (
                        <div className="order-total">المبلغ النهائي: {formatMoney(order.total)}</div>
                      )}
                      <div className="delivery-fee-line">
                        أجرة التوصيل: {formatMoney(order.deliveryFee)}
                      </div>
                      <div className="driver-contact-actions">
                        <a className="call-customer-button" href={`tel:${getPhoneLink(order.phone)}`}>
                          اتصال سريع بالزبون
                        </a>
                        <button
                          className="copy-delivery-button"
                          onClick={() => copyDeliveryInfo(order, pickupStore)}
                          type="button"
                        >
                          نسخ بيانات الطريق
                        </button>
                      </div>

                      <label className="order-note-box">
                        ملاحظة متابعة
                        <textarea
                          value={order.internalNote ?? ""}
                          onChange={(event) => onUpdateOrderNote(order.id, event.target.value)}
                          placeholder="مثال: الزبون يريد التوصيل العصر، العنوان يحتاج توضيح"
                        />
                      </label>
                      <div className="driver-quick-notes">
                        <span>ملاحظات سريعة للسائق</span>
                        <div>
                          {quickDriverNotes.map((note) => (
                            <button
                              key={note}
                              onClick={() => addQuickDriverNote(order, note)}
                              type="button"
                            >
                              {note}
                            </button>
                          ))}
                        </div>
                      </div>

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
                  )
                })
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )

  async function copyDeliveryInfo(order, pickupStore) {
    const deliveryText = formatDeliveryInfo(order, pickupStore)

    try {
      await navigator.clipboard.writeText(deliveryText)
    } catch {
      copyTextFallback(deliveryText)
    }

    setCopyMessage(`تم نسخ بيانات طلب رقم ${order.id}.`)
  }

  async function copyPhoneNumber(phone, ownerLabel) {
    const phoneNumber = String(phone)

    try {
      await navigator.clipboard.writeText(phoneNumber)
    } catch {
      copyTextFallback(phoneNumber)
    }

    setCopyMessage(`تم نسخ رقم ${ownerLabel}: ${phoneNumber}`)
  }

  function addQuickDriverNote(order, note) {
    const currentNote = (order.internalNote ?? "").trim()

    if (currentNote.includes(note)) {
      return
    }

    onUpdateOrderNote(order.id, currentNote ? `${currentNote}، ${note}` : note)
  }
}

function formatOrderItems(items) {
  return items.map((item) => `${item.name} × ${item.quantity}`).join("، ")
}

function formatMoney(value) {
  return `${Number(value).toLocaleString("en-US")} د.ع`
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

function getDeliveryFees(orders) {
  return orders.reduce((total, order) => total + Number(order.deliveryFee ?? 0), 0)
}

function getOrderItemCount(items) {
  return items.reduce((total, item) => total + Number(item.quantity ?? 0), 0)
}

function getDriverTaskStatus(status) {
  if (status === "جاهز للتوصيل") {
    return "بانتظار الاستلام"
  }

  if (status === "قيد التوصيل") {
    return "بالطريق"
  }

  if (status === "تم التسليم") {
    return "مكتملة"
  }

  return status
}

function getDriverNextStep(status) {
  if (status === "جاهز للتوصيل") {
    return "استلام من المتجر"
  }

  if (status === "قيد التوصيل") {
    return "تسليم للزبون"
  }

  if (status === "تم التسليم") {
    return "لا يوجد إجراء"
  }

  return "متابعة الطلب"
}

function formatDeliveryInfo(order, pickupStore) {
  return [
    `طلب رقم: ${order.id}`,
    `وقت الطلب: ${formatOrderDate(order.createdAt)}`,
    `استلام من: ${pickupStore?.name ?? order.items[0]?.store ?? ""}`,
    pickupStore?.area ? `منطقة المتجر: ${pickupStore.area}` : "",
    pickupStore?.phone ? `رقم المتجر: ${pickupStore.phone}` : "",
    `الزبون: ${order.customer}`,
    `رقم الزبون: ${order.phone}`,
    `منطقة الزبون: ${order.area}`,
    order.landmark ? `الدلالة: ${order.landmark}` : "",
    order.notes ? `ملاحظات: ${order.notes}` : "",
    `المنتجات: ${formatOrderItems(order.items)}`,
    `أجرة التوصيل: ${formatMoney(order.deliveryFee)}`,
    order.total ? `المبلغ النهائي: ${formatMoney(order.total)}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

function copyTextFallback(text) {
  const textArea = document.createElement("textarea")

  textArea.value = text
  textArea.setAttribute("readonly", "")
  textArea.style.position = "fixed"
  textArea.style.opacity = "0"
  document.body.appendChild(textArea)
  textArea.select()
  document.execCommand("copy")
  document.body.removeChild(textArea)
}

function getPhoneLink(phone) {
  return String(phone).replace(/[^\d+]/g, "")
}

function getPickupStore(order, stores) {
  const storeName = order.items[0]?.store

  return stores.find((store) => store.name === storeName)
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

function sortDeliveryOrders(firstOrder, secondOrder, sortType) {
  if (sortType === "الأقدم أولًا") {
    return firstOrder.id - secondOrder.id
  }

  if (sortType === "أعلى أجرة توصيل") {
    return Number(secondOrder.deliveryFee ?? 0) - Number(firstOrder.deliveryFee ?? 0)
  }

  if (sortType === "أقل أجرة توصيل") {
    return Number(firstOrder.deliveryFee ?? 0) - Number(secondOrder.deliveryFee ?? 0)
  }

  return secondOrder.id - firstOrder.id
}

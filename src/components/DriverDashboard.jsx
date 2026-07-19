import { useState } from "react"

const deliveryStatusFilters = ["الكل", "جاهز للتوصيل", "قيد التوصيل", "تم التسليم"]
const deliverySortOptions = [
  "الأولوية أولًا",
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
  const [confirmDeliveryId, setConfirmDeliveryId] = useState(null)
  const filteredOrders = orders
    .filter((order) => deliveryStatusFilter === "الكل" || order.status === deliveryStatusFilter)
    .filter((order) => matchesOrderSearch(order, orderSearch))
    .sort((firstOrder, secondOrder) => sortDeliveryOrders(firstOrder, secondOrder, deliverySort))
  const deliveredOrders = orders.filter((order) => order.status === "تم التسليم")
  const activeDeliveries = orders.filter((order) => order.status === "قيد التوصيل")
  const availableDeliveries = orders.filter((order) => order.status === "جاهز للتوصيل")
  const deliveryEarnings = deliveredOrders.reduce((total, order) => total + order.deliveryFee, 0)
  const todayDeliveredOrders = deliveredOrders.filter((order) => isToday(order.createdAt))
  const todayDeliveryEarnings = getDeliveryFees(todayDeliveredOrders)
  const availableDeliveryFees = getDeliveryFees(availableDeliveries)
  const activeDeliveryFees = getDeliveryFees(activeDeliveries)
  const expectedDeliveryFees = getDeliveryFees(orders.filter((order) => order.status !== "ملغي"))
  const priorityDeliveries = availableDeliveries.filter((order) => getOrderAgeMinutes(order.createdAt) >= 30)
  const nextPriorityOrder = [...availableDeliveries].sort(sortOrdersByPriority)[0]
  const latestDeliveredOrder = [...deliveredOrders].sort((firstOrder, secondOrder) => secondOrder.id - firstOrder.id)[0]
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
      <section className="driver-start-card" id="driver-summary">
        <div>
          <span>واجهة السائق</span>
          <h2>ملخص التوصيل اليوم</h2>
          <p>راجع الطلبات الجاهزة واستلم المهمة، ثم حدّث الحالة بعد التسليم.</p>
        </div>
        <div className="driver-start-stats">
          <div>
            <strong>{availableDeliveries.length}</strong>
            <span>جاهزة للاستلام</span>
          </div>
          <div>
            <strong>{activeDeliveries.length}</strong>
            <span>قيد التوصيل</span>
          </div>
          <div>
            <strong>{formatMoney(todayDeliveryEarnings)}</strong>
            <span>أرباح اليوم</span>
          </div>
        </div>
      </section>

      <section className="driver-priority-card" id="driver-priority">
        <div>
          <span>أولوية السائق</span>
          <h3>{nextPriorityOrder ? `ابدأ بطلب رقم ${nextPriorityOrder.id}` : "ماكو طلب جاهز الآن"}</h3>
          <p>
            {nextPriorityOrder
              ? getDriverPriorityDescription(nextPriorityOrder)
              : "لما صاحب المتجر يجهز طلب، راح يظهر هنا حتى السائق يعرف أول مهمة."}
          </p>
        </div>
        <strong>{priorityDeliveries.length}</strong>
        <span>طلبات تحتاج انتباه</span>
      </section>

      <section className="driver-history-card" id="driver-history">
        <div className="driver-history-header">
          <div>
            <span>سجل السائق</span>
            <h3>ملخص الشغل</h3>
          </div>
          <strong>{deliveredOrders.length} طلب مكتمل</strong>
        </div>
        <div className="driver-history-grid">
          <div>
            <span>أرباح اليوم</span>
            <strong>{formatMoney(todayDeliveryEarnings)}</strong>
          </div>
          <div>
            <span>كل الأرباح المسلّمة</span>
            <strong>{formatMoney(deliveryEarnings)}</strong>
          </div>
          <div>
            <span>قيد التوصيل الآن</span>
            <strong>{activeDeliveries.length}</strong>
          </div>
        </div>
        <div className="driver-latest-delivery">
          <span>آخر طلب تم تسليمه</span>
          <strong>
            {latestDeliveredOrder
              ? `طلب ${latestDeliveredOrder.id} - ${latestDeliveredOrder.customer}`
              : "بعدك ما مسلّم طلب"}
          </strong>
          <small>
            {latestDeliveredOrder
              ? `${formatOrderDate(latestDeliveredOrder.createdAt)} - ${formatMoney(latestDeliveredOrder.deliveryFee)}`
              : "راح يظهر هنا آخر طلب بعد أول عملية تسليم."}
          </small>
        </div>
      </section>

      <h2 id="driver-orders">طلبات التوصيل</h2>
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
                        <div className="driver-card-badges">
                          <span className={`driver-priority-badge ${getDriverPriorityClass(order)}`}>
                            {getDriverPriorityLabel(order)}
                          </span>
                          <span className="status-pill">{order.status}</span>
                        </div>
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

                      {order.status === "تم التسليم" && (
                        <div className="driver-delivery-rating">
                          <div>
                            <span>تقييم الطلب</span>
                            <strong>تم التسليم بنجاح</strong>
                          </div>
                          <div>
                            <span>ملاحظة السائق</span>
                            <strong>{order.internalNote ? "موجودة" : "لا توجد ملاحظة"}</strong>
                          </div>
                          <div>
                            <span>أجرة التوصيل</span>
                            <strong>{formatMoney(order.deliveryFee)}</strong>
                          </div>
                        </div>
                      )}

                      {order.status === "جاهز للتوصيل" && (
                        <button
                          className="delivery-button"
                          onClick={() => onUpdateStatus(order.id, "قيد التوصيل")}
                        >
                          استلام التوصيل
                        </button>
                      )}
                      {order.status === "قيد التوصيل" && (
                        <div className="delivery-confirm-box">
                          {confirmDeliveryId === order.id ? (
                            <>
                              <div>
                                <strong>تأكيد التسليم</strong>
                                <span>
                                  تأكد من تسليم طلب {order.id} إلى {order.customer} واستلام{" "}
                                  {formatMoney(order.total)}.
                                </span>
                              </div>
                              <div className="delivery-confirm-actions">
                                <button
                                  className="delivery-button done"
                                  onClick={() => finishDelivery(order.id)}
                                  type="button"
                                >
                                  تأكيد التسليم
                                </button>
                                <button
                                  className="delivery-button secondary"
                                  onClick={() => setConfirmDeliveryId(null)}
                                  type="button"
                                >
                                  رجوع
                                </button>
                              </div>
                            </>
                          ) : (
                            <button
                              className="delivery-button done"
                              onClick={() => setConfirmDeliveryId(order.id)}
                              type="button"
                            >
                              تم التسليم
                            </button>
                          )}
                        </div>
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

  function finishDelivery(orderId) {
    onUpdateStatus(orderId, "تم التسليم")
    setConfirmDeliveryId(null)
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

function getOrderAgeMinutes(createdAt) {
  if (!createdAt) {
    return 0
  }

  const createdDate = new Date(createdAt)

  if (Number.isNaN(createdDate.getTime())) {
    return 0
  }

  return Math.max(0, Math.floor((Date.now() - createdDate.getTime()) / 60000))
}

function isToday(createdAt) {
  if (!createdAt) {
    return false
  }

  const orderDate = new Date(createdAt)
  const today = new Date()

  return (
    orderDate.getFullYear() === today.getFullYear() &&
    orderDate.getMonth() === today.getMonth() &&
    orderDate.getDate() === today.getDate()
  )
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

function getDriverPriorityLabel(order) {
  if (order.status === "تم التسليم") {
    return "مكتمل"
  }

  if (order.status === "قيد التوصيل") {
    return "أكمل التوصيل"
  }

  if (getOrderAgeMinutes(order.createdAt) >= 30) {
    return "مستعجل"
  }

  if (order.status === "جاهز للتوصيل") {
    return "ابدأ بهذا"
  }

  return "متابعة"
}

function getDriverPriorityClass(order) {
  if (getDriverPriorityLabel(order) === "مستعجل") {
    return "urgent"
  }

  if (order.status === "قيد التوصيل") {
    return "active"
  }

  if (order.status === "تم التسليم") {
    return "done"
  }

  return "ready"
}

function getDriverPriorityDescription(order) {
  const ageMinutes = getOrderAgeMinutes(order.createdAt)
  const ageText = ageMinutes > 0 ? `صارله ${ageMinutes} دقيقة` : "طلب جديد"
  const itemCount = getOrderItemCount(order.items)

  return `${ageText}، ${itemCount} قطعة، منطقة الزبون ${order.area}.`
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
  if (sortType === "الأولوية أولًا") {
    return sortOrdersByPriority(firstOrder, secondOrder)
  }

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

function sortOrdersByPriority(firstOrder, secondOrder) {
  const statusPriority = {
    "جاهز للتوصيل": 1,
    "قيد التوصيل": 2,
    "تم التسليم": 3,
  }
  const firstPriority = statusPriority[firstOrder.status] ?? 4
  const secondPriority = statusPriority[secondOrder.status] ?? 4

  if (firstPriority !== secondPriority) {
    return firstPriority - secondPriority
  }

  return firstOrder.id - secondOrder.id
}

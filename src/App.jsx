import { useState } from "react"
import "./App.css"
import { categoryImages, customerStores, dashboardData } from "./data"
import { AdminDashboard } from "./components/AdminDashboard"
import { CustomerDashboard } from "./components/CustomerDashboard"
import { DriverDashboard } from "./components/DriverDashboard"
import { LoginScreen } from "./components/LoginScreen"
import { MerchantDashboard } from "./components/MerchantDashboard"
import { Shell } from "./components/Shell"

const DELIVERY_FEE = 5000
function App() {
  const [accountType, setAccountType] = useState("زبون")
  const [currentView, setCurrentView] = useState("login")
  const [stores, setStores] = useState(customerStores)
  const [selectedStore, setSelectedStore] = useState(customerStores[0])
  const [cartItems, setCartItems] = useState([])
  const [customerOrders, setCustomerOrders] = useState([])
  const [merchantOrders, setMerchantOrders] = useState([])
  const [deliveryOrders, setDeliveryOrders] = useState([])
  const [orderMessage, setOrderMessage] = useState("")
  const [nextOrderId, setNextOrderId] = useState(1)
  const [loginInfo, setLoginInfo] = useState({
    name: "",
    phone: "",
  })
  const [loginMessage, setLoginMessage] = useState("")
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    area: "",
    landmark: "",
    notes: "",
  })

  const dashboard = dashboardData[accountType]
  const allOrders = [
    ...merchantOrders,
    ...deliveryOrders.filter(
      (deliveryOrder) => !merchantOrders.some((order) => order.id === deliveryOrder.id),
    ),
  ]
  const deliveredOrders = deliveryOrders.filter((order) => order.status === "تم التسليم")
  const estimatedRevenue = allOrders.length * 3000 + deliveredOrders.length * 5000
  const activeUser = {
    accountType,
    name: loginInfo.name.trim(),
    phone: loginInfo.phone.trim(),
  }
  const merchantStores = stores.filter((store) => store.ownerPhone === activeUser.phone)
  const merchantStoreNames = merchantStores.map((store) => store.name)
  const approvedStores = stores.filter(
    (store) => store.status !== "pending" && store.status !== "rejected",
  )
  const activeSelectedStore = approvedStores.some((store) => store.name === selectedStore.name)
    ? selectedStore
    : approvedStores[0]
  const visibleMerchantOrders = merchantOrders.filter((order) =>
    order.items.some((item) => merchantStoreNames.includes(item.store)),
  )
  const activeStats = getActiveStats({
    accountType,
    cartItems,
    customerOrders,
    stores: accountType === "زبون" ? approvedStores : stores,
    merchantStores,
    dashboard,
    deliveryOrders,
    estimatedRevenue,
    merchantOrders: visibleMerchantOrders,
  })

  function enterDashboard() {
    if (!loginInfo.name.trim() || !loginInfo.phone.trim()) {
      setLoginMessage("اكتب الاسم ورقم الهاتف حتى تدخل للتطبيق.")
      return
    }

    if (accountType === "زبون") {
      setCustomerInfo((info) => ({
        ...info,
        name: info.name || loginInfo.name.trim(),
        phone: info.phone || loginInfo.phone.trim(),
      }))
    }

    setLoginMessage("")
    setCurrentView("dashboard")
  }

  function addToCart(product, store) {
    const storeName = store.name
    const availableProduct = stores
      .find((store) => store.name === storeName)
      ?.products.find((item) => item.name === product.name)
    const availableQuantity = Number(availableProduct?.quantity)
    const productStatus = availableProduct?.status ?? "متوفر"
    const currentCartItem = cartItems.find(
      (item) => item.store === storeName && item.name === product.name,
    )
    const cartQuantity = currentCartItem?.quantity ?? 0

    if (productStatus === "مخفي مؤقتًا") {
      setOrderMessage("هذا المنتج مخفي مؤقتًا من صاحب المتجر.")
      return
    }

    if (productStatus === "نفد") {
      setOrderMessage("هذا المنتج حالته نفد وما يكدر الزبون يطلبه.")
      return
    }

    if (Number.isFinite(availableQuantity) && availableQuantity <= 0) {
      setOrderMessage("هذا المنتج نفد من المخزون وما يكدر الزبون يطلبه.")
      return
    }

    if (Number.isFinite(availableQuantity) && cartQuantity >= availableQuantity) {
      setOrderMessage(`المتوفر من ${product.name} هو ${availableQuantity} فقط.`)
      return
    }

    setCartItems((items) => {
      const existingItem = items.find(
        (item) => item.store === storeName && item.name === product.name,
      )

      if (existingItem) {
        return items.map((item) =>
          item.store === storeName && item.name === product.name
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }

      return [...items, { ...product, store: storeName, quantity: 1 }]
    })
    setOrderMessage("")
  }

  function increaseCartItem(itemToUpdate) {
    const stockItem = stores
      .find((store) => store.name === itemToUpdate.store)
      ?.products.find((product) => product.name === itemToUpdate.name)
    const availableQuantity = Number(stockItem?.quantity)
    const productStatus = stockItem?.status ?? "متوفر"

    if (productStatus === "مخفي مؤقتًا" || productStatus === "نفد") {
      setOrderMessage("هذا المنتج غير متاح للزيادة حاليًا.")
      return
    }

    if (Number.isFinite(availableQuantity) && itemToUpdate.quantity >= availableQuantity) {
      setOrderMessage(`المتوفر من ${itemToUpdate.name} هو ${availableQuantity} فقط.`)
      return
    }

    setCartItems((items) =>
      items.map((item) =>
        item.store === itemToUpdate.store && item.name === itemToUpdate.name
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      ),
    )
    setOrderMessage("")
  }

  function decreaseCartItem(itemToUpdate) {
    setCartItems((items) =>
      items
        .map((item) =>
          item.store === itemToUpdate.store && item.name === itemToUpdate.name
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        )
        .filter((item) => item.quantity > 0),
    )
    setOrderMessage("")
  }

  function removeCartItem(itemToRemove) {
    setCartItems((items) =>
      items.filter(
        (item) => item.store !== itemToRemove.store || item.name !== itemToRemove.name,
      ),
    )
    setOrderMessage("")
  }

  function sendOrder() {
    if (cartItems.length === 0) {
      setOrderMessage("السلة فارغة. أضف منتج أولًا حتى ترسل طلب.")
      return
    }

    if (!customerInfo.name.trim() || !customerInfo.phone.trim() || !customerInfo.area.trim()) {
      setOrderMessage("اكتب اسم الزبون ورقم الهاتف والمنطقة قبل تأكيد الطلب.")
      return
    }

    const invalidItem = cartItems.find((cartItem) => {
      const stockItem = stores
        .find((store) => store.name === cartItem.store)
        ?.products.find((product) => product.name === cartItem.name)
      const availableQuantity = Number(stockItem?.quantity)
      const productStatus = stockItem?.status ?? "متوفر"

      return (
        productStatus === "مخفي مؤقتًا" ||
        productStatus === "نفد" ||
        (Number.isFinite(availableQuantity) && cartItem.quantity > availableQuantity)
      )
    })

    if (invalidItem) {
      setOrderMessage(`المنتج ${invalidItem.name} غير متاح أو كميته بالسلة أكبر من المخزون.`)
      return
    }

    const orderGroups = groupCartByStore(cartItems)
    const newOrders = orderGroups.map((items, index) => {
      const subtotal = items.reduce(
        (total, item) => total + getPriceValue(item.price) * item.quantity,
        0,
      )
      const total = subtotal + DELIVERY_FEE

      return {
        id: nextOrderId + index,
        customer: customerInfo.name.trim(),
        phone: customerInfo.phone.trim(),
        area: customerInfo.area.trim(),
        landmark: customerInfo.landmark.trim(),
        notes: customerInfo.notes.trim(),
        items,
        subtotal,
        deliveryFee: DELIVERY_FEE,
        total,
        status: "طلب جديد",
        internalNote: "",
      }
    })

    setStores((currentStores) => {
      const updatedStores = currentStores.map((store) => ({
        ...store,
        products: store.products.map((product) => {
          const orderedItem = cartItems.find(
            (item) => item.store === store.name && item.name === product.name,
          )
          const currentQuantity = Number(product.quantity)

          if (!orderedItem || !Number.isFinite(currentQuantity)) {
            return product
          }

          return {
            ...product,
            quantity: Math.max(currentQuantity - orderedItem.quantity, 0),
            status:
              Math.max(currentQuantity - orderedItem.quantity, 0) === 0 ? "نفد" : product.status,
          }
        }),
      }))

      const updatedSelectedStore = updatedStores.find((store) => store.name === selectedStore.name)

      if (updatedSelectedStore) {
        setSelectedStore(updatedSelectedStore)
      }

      return updatedStores
    })
    setNextOrderId((id) => id + newOrders.length)
    setCustomerOrders((orders) => [...newOrders, ...orders])
    setMerchantOrders((orders) => [...newOrders, ...orders])
    setCartItems([])
    setOrderMessage("تم إرسال الطلب، وانخفضت الكمية من مخزون المتجر.")
  }

  function updateMerchantOrderStatus(orderId, status) {
    setCustomerOrders((orders) =>
      orders.map((order) => (order.id === orderId ? { ...order, status } : order)),
    )
    setMerchantOrders((orders) =>
      orders.map((order) => (order.id === orderId ? { ...order, status } : order)),
    )
  }

  function prepareOrder(orderId) {
    const orderToPrepare = merchantOrders.find((order) => order.id === orderId)

    if (!orderToPrepare) {
      return
    }

    const preparedOrder = { ...orderToPrepare, status: "جاهز للتوصيل" }
    setCustomerOrders((orders) =>
      orders.map((order) => (order.id === orderId ? preparedOrder : order)),
    )
    setMerchantOrders((orders) =>
      orders.map((order) => (order.id === orderId ? preparedOrder : order)),
    )
    setDeliveryOrders((orders) => {
      const exists = orders.some((order) => order.id === orderId)

      if (exists) {
        return orders.map((order) => (order.id === orderId ? preparedOrder : order))
      }

      return [preparedOrder, ...orders]
    })
  }

  function updateDeliveryStatus(orderId, status) {
    setCustomerOrders((orders) =>
      orders.map((order) => (order.id === orderId ? { ...order, status } : order)),
    )
    setMerchantOrders((orders) =>
      orders.map((order) => (order.id === orderId ? { ...order, status } : order)),
    )
    setDeliveryOrders((orders) =>
      orders.map((order) => (order.id === orderId ? { ...order, status } : order)),
    )
  }

  function updateOrderNote(orderId, internalNote) {
    setCustomerOrders((orders) =>
      orders.map((order) => (order.id === orderId ? { ...order, internalNote } : order)),
    )
    setMerchantOrders((orders) =>
      orders.map((order) => (order.id === orderId ? { ...order, internalNote } : order)),
    )
    setDeliveryOrders((orders) =>
      orders.map((order) => (order.id === orderId ? { ...order, internalNote } : order)),
    )
  }

  function cancelOrder(orderId) {
    const orderToCancel =
      customerOrders.find((order) => order.id === orderId) ??
      merchantOrders.find((order) => order.id === orderId)

    if (!orderToCancel || orderToCancel.status === "ملغي") {
      return
    }

    const canceledOrder = { ...orderToCancel, status: "ملغي" }

    setStores((currentStores) => {
      const updatedStores = currentStores.map((store) => ({
        ...store,
        products: store.products.map((product) => {
          const canceledItem = orderToCancel.items.find(
            (item) => item.store === store.name && item.name === product.name,
          )
          const currentQuantity = Number(product.quantity)

          if (!canceledItem || !Number.isFinite(currentQuantity)) {
            return product
          }

          return {
            ...product,
            quantity: currentQuantity + canceledItem.quantity,
            status: product.status === "نفد" ? "متوفر" : product.status,
          }
        }),
      }))
      const updatedSelectedStore = updatedStores.find((store) => store.name === selectedStore.name)

      if (updatedSelectedStore) {
        setSelectedStore(updatedSelectedStore)
      }

      return updatedStores
    })

    setCustomerOrders((orders) =>
      orders.map((order) => (order.id === orderId ? canceledOrder : order)),
    )
    setMerchantOrders((orders) =>
      orders.map((order) => (order.id === orderId ? canceledOrder : order)),
    )
    setDeliveryOrders((orders) => orders.filter((order) => order.id !== orderId))
  }

  function registerStore(store) {
    const newStore = {
      ...store,
      ownerName: activeUser.name,
      ownerPhone: activeUser.phone,
      status: "pending",
      image: categoryImages[store.category],
      description: `${store.category} في ${store.area}. للتواصل: ${store.phone}.`,
      products: [],
    }

    setStores((currentStores) => [newStore, ...currentStores])
  }

  function approveStore(storeName) {
    setStores((currentStores) =>
      currentStores.map((store) =>
        store.name === storeName ? { ...store, status: "approved" } : store,
      ),
    )
  }

  function rejectStore(storeName) {
    setStores((currentStores) =>
      currentStores.map((store) =>
        store.name === storeName ? { ...store, status: "rejected" } : store,
      ),
    )
  }

  function addProductToStore(storeName, product) {
    const storeCategory = stores.find((store) => store.name === storeName)?.category
    const newProduct = {
      name: product.name,
      price: `${Number(product.price).toLocaleString("en-US")} د.ع`,
      quantity: product.quantity,
      image: product.image || categoryImages[storeCategory],
      status: Number(product.quantity) === 0 ? "نفد" : product.status || "متوفر",
    }

    setStores((currentStores) =>
      currentStores.map((store) =>
        store.name === storeName
          ? { ...store, products: [...store.products, newProduct] }
          : store,
      ),
    )

    if (selectedStore.name === storeName) {
      setSelectedStore((store) => ({
        ...store,
        products: [...store.products, newProduct],
      }))
    }
  }

  function updateProductInStore(storeName, oldProductName, product) {
    const storeCategory = stores.find((store) => store.name === storeName)?.category
    const updatedProduct = {
      name: product.name,
      price: `${Number(product.price).toLocaleString("en-US")} د.ع`,
      quantity: product.quantity,
      image: product.image || categoryImages[storeCategory],
      status: Number(product.quantity) === 0 ? "نفد" : product.status || "متوفر",
    }

    setStores((currentStores) =>
      currentStores.map((store) =>
        store.name === storeName
          ? {
              ...store,
              products: store.products.map((storeProduct) =>
                storeProduct.name === oldProductName ? updatedProduct : storeProduct,
              ),
            }
          : store,
      ),
    )

    if (selectedStore.name === storeName) {
      setSelectedStore((store) => ({
        ...store,
        products: store.products.map((storeProduct) =>
          storeProduct.name === oldProductName ? updatedProduct : storeProduct,
        ),
      }))
    }

    setCartItems((items) =>
      items
        .filter(
          (item) =>
            item.store !== storeName ||
            item.name !== oldProductName ||
            updatedProduct.status === "متوفر",
        )
        .map((item) =>
          item.store === storeName && item.name === oldProductName
            ? { ...updatedProduct, store: storeName, quantity: item.quantity }
            : item,
        ),
    )
  }

  function deleteProductFromStore(storeName, productName) {
    setStores((currentStores) =>
      currentStores.map((store) =>
        store.name === storeName
          ? {
              ...store,
              products: store.products.filter((product) => product.name !== productName),
            }
          : store,
      ),
    )

    if (selectedStore.name === storeName) {
      setSelectedStore((store) => ({
        ...store,
        products: store.products.filter((product) => product.name !== productName),
      }))
    }

    setCartItems((items) =>
      items.filter((item) => item.store !== storeName || item.name !== productName),
    )
  }

  return (
    <main className="page">
      {currentView === "login" ? (
        <LoginScreen
          accountType={accountType}
          onAccountChange={setAccountType}
          loginInfo={loginInfo}
          loginMessage={loginMessage}
          onEnter={enterDashboard}
          onLoginInfoChange={setLoginInfo}
        />
      ) : (
        <Shell
          dashboard={dashboard}
          stats={activeStats}
          user={activeUser}
          onBack={() => setCurrentView("login")}
        >
          {accountType === "زبون" && (
            <CustomerDashboard
              cartItems={cartItems}
              customerInfo={customerInfo}
              customerOrders={customerOrders}
              deliveryFee={DELIVERY_FEE}
              onAddToCart={addToCart}
              onCustomerInfoChange={setCustomerInfo}
              onCancelOrder={cancelOrder}
              onDecreaseCartItem={decreaseCartItem}
              onIncreaseCartItem={increaseCartItem}
              onRemoveCartItem={removeCartItem}
              onSendOrder={sendOrder}
              orderMessage={orderMessage}
              selectedStore={activeSelectedStore}
              stores={approvedStores}
              onSelectStore={setSelectedStore}
            />
          )}

          {accountType === "صاحب متجر" && (
            <MerchantDashboard
              merchant={activeUser}
              onAddProduct={addProductToStore}
              onDeleteProduct={deleteProductFromStore}
              onRegisterStore={registerStore}
              onCancelOrder={cancelOrder}
              onUpdateProduct={updateProductInStore}
              onUpdateOrderStatus={updateMerchantOrderStatus}
              onUpdateOrderNote={updateOrderNote}
              orders={visibleMerchantOrders}
              onPrepareOrder={prepareOrder}
              stores={merchantStores}
            />
          )}

          {accountType === "سائق" && (
            <DriverDashboard
              orders={deliveryOrders}
              onUpdateOrderNote={updateOrderNote}
              onUpdateStatus={updateDeliveryStatus}
            />
          )}

          {accountType === "الإدارة" && (
            <AdminDashboard
              allOrders={allOrders}
              onApproveStore={approveStore}
              onRejectStore={rejectStore}
              deliveredOrders={deliveredOrders}
              estimatedRevenue={estimatedRevenue}
              stores={stores}
            />
          )}
        </Shell>
      )}
    </main>
  )
}

function getActiveStats({
  accountType,
  cartItems,
  customerOrders,
  dashboard,
  deliveryOrders,
  estimatedRevenue,
  merchantOrders,
  merchantStores,
  stores,
}) {
  if (accountType === "زبون") {
    const cartQuantity = cartItems.reduce((total, item) => total + item.quantity, 0)

    return [
      { label: "متاجر متاحة", value: stores.length },
      { label: "قطع بالسلة", value: cartQuantity },
      { label: "طلبات للمتابعة", value: customerOrders.length },
    ]
  }

  if (accountType === "صاحب متجر") {
    const productCount = merchantStores.reduce((total, store) => total + store.products.length, 0)
    const lowStockCount = merchantStores.reduce(
      (total, store) =>
        total +
        store.products.filter((product) => {
          const quantity = Number(product.quantity)
          return Number.isFinite(quantity) && quantity > 0 && quantity <= 3
        }).length,
      0,
    )

    return [
      { label: "منتجات مضافة", value: productCount },
      { label: "طلبات جديدة", value: merchantOrders.length },
      { label: "منتجات قليلة الكمية", value: lowStockCount },
    ]
  }

  if (accountType === "سائق") {
    return [
      {
        label: "طلبات متاحة",
        value: deliveryOrders.filter((order) => order.status === "جاهز للتوصيل").length,
      },
      {
        label: "طلب مستلم",
        value: deliveryOrders.filter((order) => order.status === "قيد التوصيل").length,
      },
      {
        label: "تم التسليم",
        value: deliveryOrders.filter((order) => order.status === "تم التسليم").length,
      },
    ]
  }

  if (accountType === "الإدارة") {
    return [
      { label: "كل الطلبات", value: merchantOrders.length + deliveryOrders.length },
      {
        label: "قيد التوصيل",
        value: deliveryOrders.filter((order) => order.status !== "تم التسليم").length,
      },
      { label: "ربح تجريبي", value: `${estimatedRevenue.toLocaleString("en-US")} د.ع` },
    ]
  }

  return dashboard.stats
}

function getPriceValue(price) {
  return Number(String(price).replace(/[^\d]/g, ""))
}

function groupCartByStore(cartItems) {
  const groups = []

  cartItems.forEach((item) => {
    const group = groups.find((items) => items[0]?.store === item.store)

    if (group) {
      group.push(item)
      return
    }

    groups.push([item])
  })

  return groups
}

export default App

import { useState } from "react"
import "./App.css"
import { customerStores, dashboardData } from "./data"
import { AdminDashboard } from "./components/AdminDashboard"
import { CustomerDashboard } from "./components/CustomerDashboard"
import { DriverDashboard } from "./components/DriverDashboard"
import { LoginScreen } from "./components/LoginScreen"
import { MerchantDashboard } from "./components/MerchantDashboard"
import { Shell } from "./components/Shell"

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

  const dashboard = dashboardData[accountType]
  const allOrders = [...merchantOrders, ...deliveryOrders]
  const deliveredOrders = deliveryOrders.filter((order) => order.status === "تم التسليم")
  const estimatedRevenue = allOrders.length * 3000 + deliveredOrders.length * 5000
  const activeStats = getActiveStats({
    accountType,
    cartItems,
    customerOrders,
    stores,
    dashboard,
    deliveryOrders,
    estimatedRevenue,
    merchantOrders,
  })

  function addToCart(product) {
    setCartItems((items) => [...items, { ...product, store: selectedStore.name }])
    setOrderMessage("")
  }

  function sendOrder() {
    if (cartItems.length === 0) {
      setOrderMessage("السلة فارغة. أضف منتج أولًا حتى ترسل طلب.")
      return
    }

    const newOrder = {
      id: nextOrderId,
      customer: "زبون تجريبي",
      area: "البصرة - الجزائر",
      items: cartItems,
      status: "طلب جديد",
    }

    setNextOrderId((id) => id + 1)
    setCustomerOrders((orders) => [newOrder, ...orders])
    setMerchantOrders((orders) => [newOrder, ...orders])
    setCartItems([])
    setOrderMessage("تم إرسال الطلب التجريبي، وظهر الآن في واجهة صاحب المتجر.")
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
    setMerchantOrders((orders) => orders.filter((order) => order.id !== orderId))
    setDeliveryOrders((orders) => [preparedOrder, ...orders])
  }

  function updateDeliveryStatus(orderId, status) {
    setCustomerOrders((orders) =>
      orders.map((order) => (order.id === orderId ? { ...order, status } : order)),
    )
    setDeliveryOrders((orders) =>
      orders.map((order) => (order.id === orderId ? { ...order, status } : order)),
    )
  }

  function registerStore(store) {
    const newStore = {
      ...store,
      description: `${store.category} في ${store.area}. للتواصل: ${store.phone}.`,
      products: [],
    }

    setStores((currentStores) => [newStore, ...currentStores])
    setSelectedStore(newStore)
  }

  function addProductToStore(storeName, product) {
    const newProduct = {
      name: product.name,
      price: `${Number(product.price).toLocaleString("en-US")} د.ع`,
      quantity: product.quantity,
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

  return (
    <main className="page">
      {currentView === "login" ? (
        <LoginScreen
          accountType={accountType}
          onAccountChange={setAccountType}
          onEnter={() => setCurrentView("dashboard")}
        />
      ) : (
        <Shell dashboard={dashboard} stats={activeStats} onBack={() => setCurrentView("login")}>
          {accountType === "زبون" && (
            <CustomerDashboard
              cartItems={cartItems}
              customerOrders={customerOrders}
              onAddToCart={addToCart}
              onSendOrder={sendOrder}
              orderMessage={orderMessage}
              selectedStore={selectedStore}
              stores={stores}
              onSelectStore={setSelectedStore}
            />
          )}

          {accountType === "صاحب متجر" && (
            <MerchantDashboard
              onAddProduct={addProductToStore}
              onRegisterStore={registerStore}
              orders={merchantOrders}
              onPrepareOrder={prepareOrder}
              stores={stores}
            />
          )}

          {accountType === "سائق" && (
            <DriverDashboard orders={deliveryOrders} onUpdateStatus={updateDeliveryStatus} />
          )}

          {accountType === "الإدارة" && (
            <AdminDashboard
              allOrders={allOrders}
              deliveredOrders={deliveredOrders}
              deliveryOrders={deliveryOrders}
              estimatedRevenue={estimatedRevenue}
              merchantOrders={merchantOrders}
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
  stores,
}) {
  if (accountType === "زبون") {
    return [
      { label: "متاجر متاحة", value: stores.length },
      { label: "منتجات بالسلة", value: cartItems.length },
      { label: "طلبات للمتابعة", value: customerOrders.length },
    ]
  }

  if (accountType === "صاحب متجر") {
    return [
      { label: "منتجات مضافة", value: "12" },
      { label: "طلبات جديدة", value: merchantOrders.length },
      { label: "منتجات قليلة الكمية", value: "4" },
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

export default App

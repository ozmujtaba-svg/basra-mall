import { useEffect, useRef, useState } from "react"
import "./App.css"
import { categoryImages, customerStores, dashboardData } from "./data"
import { AdminDashboard } from "./components/AdminDashboard"
import { CustomerDashboard } from "./components/CustomerDashboard"
import { DriverDashboard } from "./components/DriverDashboard"
import { DriverApprovalScreen } from "./components/DriverApprovalScreen"
import { LoginScreen } from "./components/LoginScreen"
import { MerchantDashboard } from "./components/MerchantDashboard"
import { Shell } from "./components/Shell"
import { isSupabaseConfigured, supabase } from "./lib/supabase"
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  sendBrowserNotification,
} from "./lib/browserNotifications"
import {
  BASRA_DELIVERY_ZONES,
  DEFAULT_DELIVERY_FEES,
  getDeliveryFeeForArea,
} from "./lib/deliveryZones"
import {
  ensurePublicProfile,
  fetchDriverProfiles,
  updateDriverApproval,
} from "./lib/profileRepository"
import {
  fetchPlatformSettings,
  savePlatformSettings,
} from "./lib/settingsRepository"
import {
  cancelMarketplaceOrder,
  createMarketplaceOrders,
  fetchMarketplaceOrders,
  settleDriverPayouts,
  settleMerchantPayouts,
  updateMarketplaceOrder,
} from "./lib/orderRepository"
import {
  createMarketplaceProduct,
  createMarketplaceStore,
  deleteMarketplaceProduct,
  fetchMarketplaceStores,
  updateMarketplaceProduct,
  updateMarketplaceStoreStatus,
  uploadMarketplaceProductImage,
} from "./lib/storeRepository"
import {
  createCoupon,
  fetchCoupons,
  updateCoupon,
} from "./lib/couponRepository"
import {
  createOrderReview,
  fetchOrderReviews,
} from "./lib/reviewRepository"

const DELIVERY_FEE = 5000
const ADMIN_COMMISSION_RATE = 0.05
const SETTINGS_STORAGE_KEY = "basra-mall-settings"
const APP_DATA_STORAGE_KEY = "basra-mall-data"
const ACCOUNT_STORAGE_KEY = "basra-mall-account"
const APP_DATA_BACKUP_STORAGE_KEY = "basra-mall-data-backup"
const LAST_SAVE_STORAGE_KEY = "basra-mall-last-save"
const defaultPlatformSettings = {
  commissionRate: ADMIN_COMMISSION_RATE,
  deliveryFee: DELIVERY_FEE,
  deliveryFees: DEFAULT_DELIVERY_FEES,
}

function App() {
  const [savedAppData] = useState(loadAppData)
  const [savedAccount, setSavedAccount] = useState(loadSavedAccount)
  const [accountType, setAccountType] = useState(savedAccount.accountType)
  const [currentView, setCurrentView] = useState("login")
  const [stores, setStores] = useState(savedAppData.stores)
  const [selectedStore, setSelectedStore] = useState(savedAppData.selectedStore)
  const [cartItems, setCartItems] = useState(savedAppData.cartItems)
  const [customerOrders, setCustomerOrders] = useState(savedAppData.customerOrders)
  const [merchantOrders, setMerchantOrders] = useState(savedAppData.merchantOrders)
  const [deliveryOrders, setDeliveryOrders] = useState(savedAppData.deliveryOrders)
  const [drivers, setDrivers] = useState([])
  const [coupons, setCoupons] = useState([])
  const [reviews, setReviews] = useState([])
  const [driverApprovalStatus, setDriverApprovalStatus] = useState("pending")
  const [favoriteStoreNames, setFavoriteStoreNames] = useState(savedAppData.favoriteStoreNames)
  const [savedCustomerAddress, setSavedCustomerAddress] = useState(savedAppData.savedCustomerAddress)
  const [platformSettings, setPlatformSettings] = useState(loadPlatformSettings)
  const [orderMessage, setOrderMessage] = useState("")
  const [storageMessage, setStorageMessage] = useState("")
  const [appNotification, setAppNotification] = useState(null)
  const [notificationHistory, setNotificationHistory] = useState([])
  const notificationTimer = useRef(null)
  const settingsSaveQueue = useRef(Promise.resolve())
  const settingsSaveVersion = useRef(0)
  const receivedRealtimeNotifications = useRef(new Set())
  const knownOrderStatuses = useRef(new Map())
  const notificationAudienceContext = useRef({ phone: "", storeNames: [] })
  const completeSupabaseLoginRef = useRef(null)
  const [lastSaveTime, setLastSaveTime] = useState(loadLastSaveTime)
  const [nextOrderId, setNextOrderId] = useState(savedAppData.nextOrderId)
  const [loginInfo, setLoginInfo] = useState({
    adminCode: "",
    name: savedAccount.name,
    phone: savedAccount.phone,
  })
  const [loginMessage, setLoginMessage] = useState("")
  const [authEmail, setAuthEmail] = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [authLoading, setAuthLoading] = useState(false)
  const [authSession, setAuthSession] = useState(null)
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState(
    getBrowserNotificationPermission,
  )
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
  const [customerInfo, setCustomerInfo] = useState(savedAppData.customerInfo)

  const dashboard = dashboardData[accountType]
  const allOrders = [
    ...merchantOrders,
    ...deliveryOrders.filter(
      (deliveryOrder) => !merchantOrders.some((order) => order.id === deliveryOrder.id),
    ),
  ]
  const deliveredOrders = deliveryOrders.filter((order) => order.status === "تم التسليم")
  const nonCanceledOrders = allOrders.filter((order) => order.status !== "ملغي")
  const estimatedRevenue =
    nonCanceledOrders.reduce(
      (total, order) => total + order.subtotal * platformSettings.commissionRate,
      0,
    ) +
    deliveredOrders.reduce((total, order) => total + order.deliveryFee, 0)
  const activeUser = {
    accountType,
    name: loginInfo.name.trim(),
    phone: loginInfo.phone.trim(),
  }
  const activeDeliveryFee = getDeliveryFeeForArea(
    customerInfo.area,
    platformSettings.deliveryFees,
    platformSettings.deliveryFee,
  )
  const visibleCustomerOrders = customerOrders.filter((order) => order.phone === activeUser.phone)
  const merchantStores = stores.filter((store) => store.ownerPhone === activeUser.phone)
  const merchantStoreNames = merchantStores.map((store) => store.name)
  notificationAudienceContext.current = {
    phone: activeUser.phone,
    storeNames: merchantStoreNames,
  }
  const approvedStores = stores.filter(
    (store) => store.status !== "pending" && store.status !== "rejected",
  )
  const activeSelectedStore = approvedStores.some((store) => store.name === selectedStore?.name)
    ? selectedStore
    : approvedStores[0]
  const visibleMerchantOrders = merchantOrders.filter((order) =>
    order.items.some((item) => merchantStoreNames.includes(item.store)),
  )
  const activeStats = getActiveStats({
    accountType,
    cartItems,
    customerOrders: visibleCustomerOrders,
    stores: accountType === "زبون" ? approvedStores : stores,
    merchantStores,
    dashboard,
    deliveryOrders,
    estimatedRevenue,
    merchantOrders: visibleMerchantOrders,
  })
  const dashboardNavItems = getDashboardNavItems(accountType)
  const visibleAppNotification = isNotificationForAccount(appNotification, accountType)
    ? appNotification
    : null
  const visibleNotificationHistory = notificationHistory.filter((notification) =>
    isNotificationForAccount(notification, accountType),
  )
  const savedAccountWarning = getSavedAccountWarning(savedAccount, accountType, loginInfo)
  completeSupabaseLoginRef.current = completeSupabaseLogin

  useEffect(() => {
    const saved = saveToStorage(SETTINGS_STORAGE_KEY, platformSettings)

    if (!saved) {
      setStorageMessage("تعذر حفظ إعدادات العمولة والتوصيل داخل المتصفح.")
    }
  }, [platformSettings])

  useEffect(() => {
    if (currentView !== "dashboard") {
      return
    }

    const saved = saveToStorage(ACCOUNT_STORAGE_KEY, {
        accountType,
        name: loginInfo.name,
        phone: loginInfo.phone,
      })

    if (!saved) {
      setStorageMessage("تعذر حفظ الحساب داخل المتصفح. تقدر تكمل، بس قد تحتاج تسجل دخول مرة ثانية.")
    }
  }, [accountType, currentView, loginInfo.name, loginInfo.phone])

  useEffect(() => {
    const appDataSnapshot = {
      cartItems,
      customerInfo,
      customerOrders,
      deliveryOrders,
      favoriteStoreNames,
      merchantOrders,
      nextOrderId,
      savedCustomerAddress,
      selectedStoreName: selectedStore?.name ?? "",
      stores,
    }
    const saved = saveToStorage(APP_DATA_STORAGE_KEY, appDataSnapshot)

    if (saved) {
      saveToStorage(APP_DATA_BACKUP_STORAGE_KEY, appDataSnapshot)
      const savedAt = new Date().toISOString()
      saveToStorage(LAST_SAVE_STORAGE_KEY, savedAt)
      setLastSaveTime(savedAt)
      setStorageMessage("")
      return
    }

    setStorageMessage(
      "تعذر حفظ البيانات داخل المتصفح. إذا استمرت المشكلة، احفظ شغلك بـ Git ثم امسح البيانات التجريبية.",
    )
  }, [
    cartItems,
    customerInfo,
    customerOrders,
    deliveryOrders,
    favoriteStoreNames,
    merchantOrders,
    nextOrderId,
    savedCustomerAddress,
    selectedStore,
    stores,
  ])

  useEffect(() => () => clearTimeout(notificationTimer.current), [])

  useEffect(() => {
    if (!supabase) return undefined

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) completeSupabaseLoginRef.current(data.session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setAuthSession(session)
        setAuthEmail(session.user.email ?? "")
        setAccountType("الإدارة")
        setCurrentView("login")
        setIsPasswordRecovery(true)
        setAuthPassword("")
        setLoginMessage("اكتب كلمة مرور جديدة من 8 أحرف أو أكثر، ثم اضغط حفظ.")
      } else if (session) completeSupabaseLoginRef.current(session)
      else setAuthSession(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !authSession) return undefined

    let ignore = false

    const loadCentralSettings = () => {
      fetchPlatformSettings()
        .then((settings) => {
          if (!ignore) {
            setPlatformSettings(normalizePlatformSettings(settings))
            setStorageMessage("")
          }
        })
        .catch((error) => {
          if (!ignore) {
            setStorageMessage(`تعذر جلب إعدادات الأسعار المركزية: ${error.message}`)
          }
        })
    }

    loadCentralSettings()
    const settingsChannel = supabase
      .channel(`platform-settings-${authSession.user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "platform_settings" },
        loadCentralSettings,
      )
      .subscribe()

    return () => {
      ignore = true
      supabase.removeChannel(settingsChannel)
    }
  }, [authSession])

  useEffect(() => {
    if (!authSession || currentView !== "dashboard") return undefined

    let ignore = false
    let refreshTimer

    const loadMarketplaceData = () => {
      Promise.all([
        fetchMarketplaceOrders(),
        fetchMarketplaceStores(),
        accountType === "الإدارة" ? fetchDriverProfiles() : Promise.resolve([]),
        ["الإدارة", "زبون"].includes(accountType) ? fetchCoupons() : Promise.resolve([]),
        fetchOrderReviews(),
      ])
        .then(([orders, databaseStores, databaseDrivers, databaseCoupons, databaseReviews]) => {
          if (ignore) return

          knownOrderStatuses.current = new Map(orders.map((order) => [String(order.id), order.status]))
          if (accountType === "زبون") setCustomerOrders(orders)
          if (accountType === "صاحب متجر") setMerchantOrders(orders)
          if (accountType === "سائق") setDeliveryOrders(orders)
          if (accountType === "الإدارة") {
            setMerchantOrders(orders)
            setDeliveryOrders(orders.filter((order) => order.status !== "طلب جديد"))
            setDrivers(databaseDrivers)
          }
          setCoupons(databaseCoupons)
          setReviews(databaseReviews)
          setStores(() => {
            const marketplaceStores = databaseStores.map(normalizeStore)
            setSelectedStore((currentStore) =>
              marketplaceStores.find((store) => store.name === currentStore?.name) ??
                marketplaceStores[0],
            )
            return marketplaceStores
          })
          setStorageMessage("")
        })
        .catch((error) => {
          if (!ignore) setStorageMessage(`تعذر جلب بيانات قاعدة البيانات: ${error.message}`)
        })
    }

    const scheduleMarketplaceRefresh = () => {
      clearTimeout(refreshTimer)
      refreshTimer = setTimeout(loadMarketplaceData, 250)
    }

    const handleOrderRealtimeChange = (payload) => {
      scheduleMarketplaceRefresh()
      const previousStatus = knownOrderStatuses.current.get(String(payload.new?.id))
      const realtimeNotification = getRealtimeOrderNotification({
        accountType,
        activeUser: { phone: notificationAudienceContext.current.phone },
        merchantStoreNames: notificationAudienceContext.current.storeNames,
        payload,
        previousStatus,
      })
      if (payload.new?.id && payload.new?.status) {
        knownOrderStatuses.current.set(
          String(payload.new.id),
          getDatabaseStatusLabel(payload.new.status),
        )
      }

      if (!realtimeNotification) return

      const eventKey = [
        payload.eventType,
        payload.new?.id ?? payload.old?.id,
        payload.new?.status ?? "",
        accountType,
      ].join("-")

      if (receivedRealtimeNotifications.current.has(eventKey)) return
      receivedRealtimeNotifications.current.add(eventKey)
      setTimeout(() => receivedRealtimeNotifications.current.delete(eventKey), 15000)

      showNotification(
        realtimeNotification.message,
        realtimeNotification.type,
        realtimeNotification.audience,
      )
      sendBrowserNotification(realtimeNotification.title, {
        body: realtimeNotification.message,
        data: { url: window.location.origin },
        tag: eventKey,
      }).catch(() => {})
    }

    loadMarketplaceData()
    const realtimeChannel = supabase
      .channel(`marketplace-live-${authSession.user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marketplace_orders" },
        handleOrderRealtimeChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stores" },
        scheduleMarketplaceRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        scheduleMarketplaceRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        scheduleMarketplaceRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coupons" },
        scheduleMarketplaceRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_reviews" },
        scheduleMarketplaceRefresh,
      )
      .subscribe()

    return () => {
      ignore = true
      clearTimeout(refreshTimer)
      supabase.removeChannel(realtimeChannel)
    }
  }, [accountType, authSession, currentView])

  useEffect(() => {
    if (!supabase || !authSession || currentView !== "driver-approval") return undefined

    let ignore = false

    const refreshDriverApproval = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("driver_status")
        .eq("id", authSession.user.id)
        .single()

      if (ignore || error || !data) return

      const status = data.driver_status ?? "pending"
      setDriverApprovalStatus(status)

      if (status === "approved") {
        setCurrentView("dashboard")
        showNotification("تم قبول حساب السائق. هسه تقدر تستلم مهام التوصيل.", "success", "سائق")
      }
    }

    refreshDriverApproval()
    const approvalChannel = supabase
      .channel(`driver-approval-${authSession.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          filter: `id=eq.${authSession.user.id}`,
          schema: "public",
          table: "profiles",
        },
        refreshDriverApproval,
      )
      .subscribe()

    return () => {
      ignore = true
      supabase.removeChannel(approvalChannel)
    }
  }, [authSession, currentView])

  async function enableBrowserNotifications() {
    const permission = await requestBrowserNotificationPermission()
    setBrowserNotificationPermission(permission)

    if (permission === "granted") {
      showNotification(
        "تم تفعيل إشعارات الطلبات على هذا الجهاز بنجاح.",
        "success",
        accountType,
      )
      await sendBrowserNotification("تم تفعيل إشعارات Basra Mall", {
        body: "راح نبلغك فورًا عند وصول تحديث يخص حسابك.",
        tag: "basra-mall-notifications-enabled",
      })
      return
    }

    showNotification(
      permission === "denied"
        ? "الإشعارات مرفوضة من إعدادات الجهاز. تقدر تسمح بيها من إعدادات المتصفح."
        : "هذا الجهاز ما يدعم إشعارات المتصفح.",
      "warning",
      accountType,
    )
  }

  function showNotification(message, type = "success", audience = accountType) {
    const notification = {
      audience,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      message,
      read: false,
      time: new Date().toISOString(),
      type,
    }

    clearTimeout(notificationTimer.current)
    setAppNotification(notification)
    setNotificationHistory((history) => [notification, ...history].slice(0, 6))
    notificationTimer.current = setTimeout(() => {
      setAppNotification(null)
    }, 5200)
  }

  function enterDashboard() {
    if (!loginInfo.name.trim() || !loginInfo.phone.trim()) {
      setLoginMessage("ما نكدر ندخلك بعد. اكتب الاسم ورقم الهاتف، وبعدها اضغط دخول.")
      showNotification(
        "ما نكدر ندخلك بعد. اكتب الاسم ورقم الهاتف، وبعدها اضغط دخول.",
        "warning",
        accountType,
      )
      return
    }

    if (!isValidIraqiPhone(loginInfo.phone)) {
      setLoginMessage("رقم الهاتف غير صحيح. لازم يبدأ بـ 07 ويكون 11 رقم، مثل 07XXXXXXXXX.")
      showNotification(
        "رقم الهاتف غير صحيح. لازم يبدأ بـ 07 ويكون 11 رقم، مثل 07XXXXXXXXX.",
        "warning",
        accountType,
      )
      return
    }

    if (savedAccountWarning) {
      setLoginMessage(savedAccountWarning)
      showNotification(savedAccountWarning, "warning", "النظام")
      return
    }

    if (accountType === "زبون") {
      setCustomerInfo((info) => ({
        ...info,
        name: info.name || loginInfo.name.trim(),
        phone: info.phone || loginInfo.phone.trim(),
      }))
    }

    setSavedAccount({
      accountType,
      name: loginInfo.name.trim(),
      phone: loginInfo.phone.trim(),
    })
    setLoginMessage("")
    setCurrentView("dashboard")
    showNotification(
      `تم تسجيل الدخول بنجاح كـ ${accountType}. هسه تقدر تستخدم واجهتك الخاصة بدون خلط حسابات.`,
    )
  }

  async function sendEmailLoginLink() {
    const email = authEmail.trim().toLowerCase()

    if (!isSupabaseConfigured || !supabase) {
      setLoginMessage("اتصال قاعدة البيانات غير مفعّل بعد. تقدر تستخدم الدخول التجريبي مؤقتًا.")
      return
    }
    if (accountType === "الإدارة") {
      setLoginMessage("حساب الإدارة ما يننشأ من الواجهة العامة. استخدم الدخول التجريبي حاليًا.")
      return
    }
    if (!loginInfo.name.trim() || !isValidIraqiPhone(loginInfo.phone) || !isValidEmail(email)) {
      setLoginMessage("اكتب الاسم، رقم عراقي صحيح، وإيميل صحيح حتى نرسل رابط الدخول.")
      return
    }

    setAuthLoading(true)
    setLoginMessage("")
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          account_type: accountType,
          full_name: loginInfo.name.trim(),
          phone: loginInfo.phone.trim(),
        },
      },
    })
    setAuthLoading(false)

    setLoginMessage(
      error
        ? `تعذر إرسال رابط الدخول: ${error.message}`
        : "تم إرسال رابط الدخول إلى إيميلك. افتح الرسالة واضغط الرابط حتى تدخل للحساب.",
    )
  }

  async function signInWithPassword() {
    const email = authEmail.trim().toLowerCase()

    if (!supabase || !isValidEmail(email) || authPassword.length < 8) {
      setLoginMessage("اكتب إيميل صحيح وكلمة مرور من 8 أحرف أو أكثر.")
      return
    }

    setAuthLoading(true)
    setLoginMessage("")
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: authPassword,
    })
    setAuthLoading(false)
    setLoginMessage(error ? `تعذر الدخول: ${error.message}` : "تم تسجيل الدخول بنجاح.")
  }

  async function sendPasswordReset() {
    const email = authEmail.trim().toLowerCase()

    if (!supabase || !isValidEmail(email)) {
      setLoginMessage("اكتب إيميل الإدارة الصحيح حتى نرسل رابط تغيير كلمة المرور.")
      return
    }

    setAuthLoading(true)
    setLoginMessage("")
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    setAuthLoading(false)
    setLoginMessage(
      error
        ? `تعذر إرسال رابط تغيير كلمة المرور: ${error.message}`
        : "تم إرسال رابط تغيير كلمة المرور. افتح الإيميل واضغط الرابط.",
    )
  }

  async function updateRecoveredPassword() {
    if (!supabase || authPassword.length < 8) {
      setLoginMessage("كلمة المرور الجديدة لازم تكون 8 أحرف أو أكثر.")
      return
    }

    setAuthLoading(true)
    setLoginMessage("")
    const { error } = await supabase.auth.updateUser({ password: authPassword })
    setAuthLoading(false)

    if (error) {
      setLoginMessage(`تعذر حفظ كلمة المرور: ${error.message}`)
      return
    }

    setIsPasswordRecovery(false)
    setLoginMessage("تم تغيير كلمة المرور. هسه اضغط دخول بكلمة المرور.")
    await supabase.auth.signOut()
    setAuthSession(null)
  }

  async function changeAdminPassword(newPassword) {
    if (!supabase || !authSession) {
      return { success: false, message: "جلسة الإدارة غير متصلة. سجل دخول مرة ثانية." }
    }
    if (newPassword.length < 8) {
      return { success: false, message: "كلمة المرور الجديدة لازم تكون 8 أحرف أو أكثر." }
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    return error
      ? { success: false, message: `تعذر تغيير كلمة المرور: ${error.message}` }
      : { success: true, message: "تم تغيير كلمة مرور الإدارة بنجاح." }
  }

  async function signUpWithPassword() {
    const email = authEmail.trim().toLowerCase()

    if (!supabase || !loginInfo.name.trim() || !isValidIraqiPhone(loginInfo.phone)) {
      setLoginMessage("اكتب الاسم ورقم عراقي صحيح حتى ننشئ الحساب.")
      return
    }
    if (!isValidEmail(email) || authPassword.length < 8) {
      setLoginMessage("اكتب إيميل صحيح وكلمة مرور من 8 أحرف أو أكثر.")
      return
    }

    setAuthLoading(true)
    setLoginMessage("")
    const { data, error } = await supabase.auth.signUp({
      email,
      password: authPassword,
      options: {
        data: {
          account_type: accountType,
          full_name: loginInfo.name.trim(),
          phone: loginInfo.phone.trim(),
        },
      },
    })
    setAuthLoading(false)

    if (error) {
      setLoginMessage(`تعذر إنشاء الحساب: ${error.message}`)
      return
    }

    setLoginMessage(
      data.session
        ? "تم إنشاء الحساب والدخول بنجاح."
        : "تم إنشاء الحساب، لكن تأكيد الإيميل ما زال مفعّلًا في Supabase.",
    )
  }

  async function signInWithPhone() {
    if (!supabase || !loginInfo.name.trim() || !isValidIraqiPhone(loginInfo.phone)) {
      setLoginMessage("اكتب الاسم ورقم عراقي صحيح حتى تدخل.")
      return
    }

    setAuthLoading(true)
    setLoginMessage("")
    const { error } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          account_type: accountType,
          full_name: loginInfo.name.trim(),
          phone: loginInfo.phone.trim(),
        },
      },
    })
    setAuthLoading(false)
    setLoginMessage(error ? `تعذر الدخول: ${error.message}` : `تم الدخول كـ ${accountType} بنجاح.`)
  }

  async function completeSupabaseLogin(session) {
    const user = session.user
    const metadata = user.user_metadata ?? {}
    const nextAccountType = getPublicAccountType(metadata.account_type)
    const nextName = String(metadata.full_name ?? loginInfo.name).trim()
    const nextPhone = String(metadata.phone ?? loginInfo.phone).trim()

    if (!nextName || !isValidIraqiPhone(nextPhone)) {
      setLoginMessage("تم تأكيد الإيميل، لكن الاسم أو رقم الهاتف ناقص. أكمل البيانات وأرسل الرابط مرة ثانية.")
      return
    }

    let error = null

    if (nextAccountType === "الإدارة") {
      const { data: adminProfile, error: adminError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      error = adminError
      if (!error && adminProfile?.role !== "admin") {
        setLoginMessage("هذا الحساب غير مفعّل كحساب إدارة.")
        await supabase.auth.signOut()
        return
      }
    } else {
      try {
        const profile = await ensurePublicProfile({
          accountType: nextAccountType,
          fullName: nextName,
          phone: nextPhone,
          userId: user.id,
        })

        if (nextAccountType === "سائق") {
          const approvalStatus = profile.driver_status ?? "pending"
          setAuthSession(session)
          setAuthEmail(user.email ?? "")
          setAccountType(nextAccountType)
          setLoginInfo((info) => ({ ...info, name: nextName, phone: nextPhone }))
          setSavedAccount({ accountType: nextAccountType, name: nextName, phone: nextPhone })
          setDriverApprovalStatus(approvalStatus)
          setCurrentView(approvalStatus === "approved" ? "dashboard" : "driver-approval")
          setLoginMessage("")
          return
        }
      } catch (profileError) {
        error = profileError
      }
    }

    if (error) {
      setLoginMessage(`تم تأكيد الإيميل، لكن تعذر تجهيز الملف الشخصي: ${error.message}`)
      return
    }

    setAuthSession(session)
    setAuthEmail(user.email ?? "")
    setAccountType(nextAccountType)
    setLoginInfo((info) => ({ ...info, name: nextName, phone: nextPhone }))
    setSavedAccount({ accountType: nextAccountType, name: nextName, phone: nextPhone })
    setCurrentView("dashboard")
    setLoginMessage("")
  }

  function chooseAccountType(type) {
    setAccountType(type)
    setLoginMessage("")
    setOrderMessage("")
    setAppNotification(null)
    setNotificationHistory((history) =>
      history.filter((notification) => notification.audience === "النظام"),
    )
    setLoginInfo((info) => ({
      ...info,
      adminCode: type === "الإدارة" ? info.adminCode : "",
    }))
  }

  async function logoutCurrentSession() {
    if (authSession && supabase) {
      await supabase.auth.signOut()
    }

    setAuthSession(null)
    setAuthPassword("")
    setLoginMessage("تم تسجيل الخروج. اكتب الإيميل وكلمة المرور حتى تدخل مرة ثانية.")
    setCurrentView("login")
  }

  async function forgetSavedAccount() {
    if (authSession && supabase) {
      await supabase.auth.signOut()
    }

    localStorage.removeItem(ACCOUNT_STORAGE_KEY)
    setSavedAccount({
      accountType: "زبون",
      name: "",
      phone: "",
    })
    setAccountType("زبون")
    setLoginInfo({
      adminCode: "",
      name: "",
      phone: "",
    })
    setLoginMessage("تم مسح الحساب المحفوظ. اختار حساب جديد وسجل دخول.")
    setCurrentView("login")
    showNotification(
      "تم مسح الحساب المحفوظ. اختار نوع الحساب واكتب الاسم والرقم حتى تبدأ جلسة جديدة.",
      "info",
      "النظام",
    )
  }

  function resetDemoData() {
    removeFromStorage(APP_DATA_STORAGE_KEY)
    removeFromStorage(APP_DATA_BACKUP_STORAGE_KEY)
    removeFromStorage(LAST_SAVE_STORAGE_KEY)
    setStores(customerStores)
    setSelectedStore(customerStores[0])
    setCartItems([])
    setCustomerOrders([])
    setMerchantOrders([])
    setDeliveryOrders([])
    setFavoriteStoreNames([])
    setSavedCustomerAddress({
      area: "",
      landmark: "",
      notes: "",
    })
    setNextOrderId(1)
    setCustomerInfo({
      name: activeUser.accountType === "زبون" ? activeUser.name : "",
      phone: activeUser.accountType === "زبون" ? activeUser.phone : "",
      area: "",
      landmark: "",
      notes: "",
    })
    setOrderMessage("")
    setLastSaveTime("")
    showNotification(
      "تم مسح البيانات التجريبية ورجع التطبيق للبداية. تقدر تدخل بيانات جديدة للاختبار.",
      "warning",
      "الإدارة",
    )
  }

  function exportDataBackup() {
    const backupData = {
      exportedAt: new Date().toISOString(),
      platformSettings,
      savedAccount: {
        accountType,
        name: loginInfo.name,
        phone: loginInfo.phone,
      },
      appData: {
        cartItems,
        customerInfo,
        customerOrders,
        deliveryOrders,
        favoriteStoreNames,
        merchantOrders,
        nextOrderId,
        savedCustomerAddress,
        selectedStoreName: selectedStore?.name ?? "",
        stores,
      },
    }
    const backupText = JSON.stringify(backupData, null, 2)
    const blob = new Blob([backupText], { type: "application/json;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = `basra-mall-backup-${formatBackupDate(new Date())}.json`
    link.click()
    URL.revokeObjectURL(url)
    showNotification(
      "تم تجهيز نسخة احتياطية للبيانات. احتفظ بالملف حتى تقدر ترجع البيانات لاحقًا.",
      "success",
      "الإدارة",
    )
  }

  function importDataBackup(backupData) {
    const importedAppData = normalizeImportedAppData(backupData)

    if (!importedAppData) {
      return false
    }

    setStores(importedAppData.stores)
    setSelectedStore(importedAppData.selectedStore)
    setCartItems(importedAppData.cartItems)
    setCustomerOrders(importedAppData.customerOrders)
    setMerchantOrders(importedAppData.merchantOrders)
    setDeliveryOrders(importedAppData.deliveryOrders)
    setFavoriteStoreNames(importedAppData.favoriteStoreNames)
    setSavedCustomerAddress(importedAppData.savedCustomerAddress)
    setNextOrderId(importedAppData.nextOrderId)
    setCustomerInfo(importedAppData.customerInfo)

    if (backupData?.platformSettings) {
      const importedSettings = normalizePlatformSettings(backupData.platformSettings)
      setPlatformSettings(importedSettings)
    }

    if (backupData?.savedAccount) {
      const importedAccount = normalizeSavedAccount(backupData.savedAccount)
      setSavedAccount(importedAccount)
      setAccountType(importedAccount.accountType)
      setLoginInfo((info) => ({
        ...info,
        name: importedAccount.name,
        phone: importedAccount.phone,
      }))
    }

    setStorageMessage("")
    setLastSaveTime(new Date().toISOString())
    showNotification(
      "تم استيراد النسخة الاحتياطية بنجاح. راجع المتاجر والطلبات حتى تتأكد من البيانات.",
      "success",
      "الإدارة",
    )
    return true
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
      setOrderMessage("ما نكدر نضيف هذا المنتج. صاحب المتجر مخفيه مؤقتًا، اختار منتج ثاني.")
      showNotification(
        "ما نكدر نضيف هذا المنتج. صاحب المتجر مخفيه مؤقتًا، اختار منتج ثاني.",
        "warning",
        "زبون",
      )
      return
    }

    if (productStatus === "نفد") {
      setOrderMessage("هذا المنتج نافد حاليًا. اختار منتج ثاني أو ارجع له بعد تحديث الكمية.")
      showNotification(
        "هذا المنتج نافد حاليًا. اختار منتج ثاني أو ارجع له بعد تحديث الكمية.",
        "warning",
        "زبون",
      )
      return
    }

    if (Number.isFinite(availableQuantity) && availableQuantity <= 0) {
      setOrderMessage("ماكو كمية متوفرة من هذا المنتج. اختار منتج ثاني من نفس المتجر.")
      showNotification(
        "ماكو كمية متوفرة من هذا المنتج. اختار منتج ثاني من نفس المتجر.",
        "warning",
        "زبون",
      )
      return
    }

    if (Number.isFinite(availableQuantity) && cartQuantity >= availableQuantity) {
      setOrderMessage(
        `ما نكدر نزيد الكمية. المتوفر من ${product.name} هو ${availableQuantity} فقط.`,
      )
      showNotification(
        `ما نكدر نزيد الكمية. المتوفر من ${product.name} هو ${availableQuantity} فقط.`,
        "warning",
        "زبون",
      )
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
    showNotification(
      `تمت إضافة ${product.name} إلى السلة. كمل تسوق أو افتح السلة حتى تؤكد الطلب.`,
      "success",
      "زبون",
    )
  }

  function toggleFavoriteStore(storeName) {
    setFavoriteStoreNames((currentFavorites) =>
      currentFavorites.includes(storeName)
        ? currentFavorites.filter((name) => name !== storeName)
        : [...currentFavorites, storeName],
    )
  }

  function saveCustomerAddress() {
    if (!customerInfo.area.trim() || !customerInfo.landmark.trim()) {
      setOrderMessage("العنوان ناقص. اكتب المنطقة وأقرب نقطة دلالة حتى نكدر نحفظه.")
      return
    }

    setSavedCustomerAddress({
      area: customerInfo.area.trim(),
      landmark: customerInfo.landmark.trim(),
      notes: customerInfo.notes.trim(),
    })
    setOrderMessage("تم حفظ العنوان. تكدر تستخدمه بالطلبات الجاية.")
    showNotification(
      "تم حفظ عنوان الزبون. تقدر تستخدمه بسرعة بالطلبات الجاية بدون إعادة كتابة.",
      "success",
      "زبون",
    )
  }

  function useSavedCustomerAddress() {
    if (!savedCustomerAddress.area.trim()) {
      setOrderMessage("ماكو عنوان محفوظ بعد. اكتب العنوان أول مرة واضغط حفظ العنوان.")
      return
    }

    setCustomerInfo((info) => ({
      ...info,
      area: savedCustomerAddress.area,
      landmark: savedCustomerAddress.landmark,
      notes: savedCustomerAddress.notes || info.notes,
    }))
    setOrderMessage("تم استخدام العنوان المحفوظ.")
    showNotification(
      "تم استخدام العنوان المحفوظ. راجع تفاصيل الطلب وبعدها اضغط إرسال الطلب.",
      "success",
      "زبون",
    )
  }

  function increaseCartItem(itemToUpdate) {
    const stockItem = stores
      .find((store) => store.name === itemToUpdate.store)
      ?.products.find((product) => product.name === itemToUpdate.name)
    const availableQuantity = Number(stockItem?.quantity)
    const productStatus = stockItem?.status ?? "متوفر"

    if (productStatus === "مخفي مؤقتًا" || productStatus === "نفد") {
      setOrderMessage("ما نكدر نزيد هذا المنتج لأنه غير متاح حاليًا. قلل الكمية أو احذفه.")
      return
    }

    if (Number.isFinite(availableQuantity) && itemToUpdate.quantity >= availableQuantity) {
      setOrderMessage(
        `وصلت للحد المتوفر. كمية ${itemToUpdate.name} المتاحة هي ${availableQuantity} فقط.`,
      )
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

  function reorderCustomerOrder(order) {
    const unavailableItems = []
    const itemsToAdd = []

    order.items.forEach((orderItem) => {
      const stockItem = stores
        .find((store) => store.name === orderItem.store)
        ?.products.find((product) => product.name === orderItem.name)
      const availableQuantity = Number(stockItem?.quantity)
      const productStatus = stockItem?.status ?? "متوفر"
      const cartQuantity =
        cartItems.find((item) => item.store === orderItem.store && item.name === orderItem.name)
          ?.quantity ?? 0

      if (
        !stockItem ||
        productStatus === "مخفي مؤقتًا" ||
        productStatus === "نفد" ||
        (Number.isFinite(availableQuantity) && cartQuantity + orderItem.quantity > availableQuantity)
      ) {
        unavailableItems.push(orderItem.name)
        return
      }

      itemsToAdd.push({ ...stockItem, store: orderItem.store, quantity: orderItem.quantity })
    })

    if (itemsToAdd.length === 0) {
      setOrderMessage(
        "ما قدرنا نعيد الطلب. كل المنتجات المطلوبة غير متوفرة أو كميتها ناقصة حاليًا.",
      )
      return
    }

    setCartItems((items) => {
      const nextItems = [...items]

      itemsToAdd.forEach((itemToAdd) => {
        const existingItemIndex = nextItems.findIndex(
          (item) => item.store === itemToAdd.store && item.name === itemToAdd.name,
        )

        if (existingItemIndex >= 0) {
          nextItems[existingItemIndex] = {
            ...nextItems[existingItemIndex],
            quantity: nextItems[existingItemIndex].quantity + itemToAdd.quantity,
          }
          return
        }

        nextItems.push(itemToAdd)
      })

      return nextItems
    })

    setOrderMessage(
      unavailableItems.length > 0
        ? `أضفنا المتوفر للسلة. غير المتوفر: ${unavailableItems.join("، ")}.`
        : "تمت إعادة الطلب وإضافة المنتجات للسلة.",
    )
  }

  async function sendOrder(paymentMethod = "الدفع عند الاستلام", couponCode = "") {
    if (cartItems.length === 0) {
      setOrderMessage("السلة فارغة. أضف منتج واحد على الأقل، وبعدها ارجع لتأكيد الطلب.")
      showNotification(
        "السلة فارغة. أضف منتج واحد على الأقل، وبعدها ارجع لتأكيد الطلب.",
        "warning",
        "زبون",
      )
      return
    }

    if (!customerInfo.name.trim() || !customerInfo.phone.trim() || !customerInfo.area.trim()) {
      setOrderMessage(
        "بيانات الطلب ناقصة. اكتب اسم الزبون ورقم الهاتف والمنطقة حتى نكدر نرسل الطلب.",
      )
      showNotification(
        "بيانات الطلب ناقصة. اكتب اسم الزبون ورقم الهاتف والمنطقة حتى نكدر نرسل الطلب.",
        "warning",
        "زبون",
      )
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
      setOrderMessage(
        `ما نكدر نرسل الطلب. المنتج ${invalidItem.name} غير متاح أو كميته بالسلة أكبر من المخزون.`,
      )
      showNotification(
        `ما نكدر نرسل الطلب. عدّل كمية ${invalidItem.name} أو احذفه من السلة.`,
        "warning",
        "زبون",
      )
      return
    }

    const orderGroups = groupCartByStore(cartItems)
    const createdAt = new Date().toISOString()
    let newOrders = orderGroups.map((items, index) => {
      const subtotal = items.reduce(
        (total, item) => total + getPriceValue(item.price) * item.quantity,
        0,
      )
      const coupon = getApplicableCoupon(coupons, couponCode, subtotal)
      const discountAmount = calculateCouponDiscount(coupon, subtotal)
      const discountedSubtotal = Math.max(subtotal - discountAmount, 0)
      const total = discountedSubtotal + activeDeliveryFee

      return {
        id: nextOrderId + index,
        customer: customerInfo.name.trim(),
        phone: customerInfo.phone.trim(),
        area: customerInfo.area.trim(),
        landmark: customerInfo.landmark.trim(),
        notes: customerInfo.notes.trim(),
        paymentMethod,
        items,
        subtotal: discountedSubtotal,
        discountAmount,
        couponCode: coupon?.code ?? "",
        deliveryFee: activeDeliveryFee,
        total,
        status: "طلب جديد",
        internalNote: "",
        createdAt,
      }
    })

    if (authSession) {
      try {
        newOrders = await createMarketplaceOrders(newOrders)
        setStorageMessage("")
      } catch (error) {
        setOrderMessage(`تعذر حفظ الطلب بقاعدة البيانات: ${error.message}`)
        showNotification("ما تم إرسال الطلب لأن قاعدة البيانات رفضت الحفظ.", "warning", "زبون")
        return
      }
    }

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

      const updatedSelectedStore = updatedStores.find((store) => store.name === selectedStore?.name)

      if (updatedSelectedStore) {
        setSelectedStore(updatedSelectedStore)
      }

      return updatedStores
    })
    setNextOrderId((id) => id + newOrders.length)
    setCustomerOrders((orders) => [...newOrders, ...orders])
    setMerchantOrders((orders) => [...newOrders, ...orders])
    setCartItems([])
    const orderNumbers = newOrders.map((order) => order.id).join("، ")
    const orderLabel = newOrders.length > 1 ? "أرقام الطلبات" : "رقم الطلب"

    setOrderMessage(
      `تم إرسال طلبك بنجاح. ${orderLabel}: ${orderNumbers}. احفظ الرقم حتى تتابع الطلب.`,
    )
    showNotification(
      `تم إرسال الطلب بنجاح. ${orderLabel}: ${orderNumbers}. راح يظهر لصاحب المتجر حتى يبدأ التجهيز.`,
      "success",
      "زبون",
    )
  }

  async function addCoupon(coupon) {
    try {
      const savedCoupon = await createCoupon(coupon)
      setCoupons((current) => [savedCoupon, ...current])
      setStorageMessage("")
      return true
    } catch (error) {
      setStorageMessage(`تعذر حفظ الكوبون: ${error.message}`)
      return false
    }
  }

  async function changeCoupon(couponId, changes) {
    try {
      const savedCoupon = await updateCoupon(couponId, changes)
      setCoupons((current) =>
        current.map((coupon) => (coupon.id === couponId ? savedCoupon : coupon)),
      )
      setStorageMessage("")
      return true
    } catch (error) {
      setStorageMessage(`تعذر تحديث الكوبون: ${error.message}`)
      return false
    }
  }

  async function submitOrderReview(review) {
    try {
      const savedReview = await createOrderReview(review)
      setReviews((current) => [savedReview, ...current])
      setStorageMessage("")
      return true
    } catch (error) {
      setStorageMessage(`تعذر حفظ التقييم: ${error.message}`)
      return false
    }
  }

  async function persistSyncedOrderChange(order, changes) {
    if (!authSession || !order?.isSynced) return true

    try {
      await updateMarketplaceOrder(order.id, changes)
      setStorageMessage("")
      return true
    } catch (error) {
      setStorageMessage(`تعذر تحديث الطلب بقاعدة البيانات: ${error.message}`)
      showNotification("ما تغيرت حالة الطلب لأن قاعدة البيانات رفضت التحديث.", "warning", accountType)
      return false
    }
  }

  async function updateMerchantOrderStatus(orderId, status) {
    const targetOrder = merchantOrders.find((order) => order.id === orderId)
    if (!(await persistSyncedOrderChange(targetOrder, { status }))) return

    setCustomerOrders((orders) =>
      orders.map((order) => (order.id === orderId ? { ...order, status } : order)),
    )
    setMerchantOrders((orders) =>
      orders.map((order) => (order.id === orderId ? { ...order, status } : order)),
    )
    showNotification(
      `تم تحديث طلب رقم ${orderId} إلى: ${status}. الزبون راح يشوف الحالة الجديدة مباشرة.`,
      "success",
      "صاحب متجر",
    )
  }

  async function updateAdminOrderStatus(orderId, status) {
    const targetOrder = allOrders.find((order) => order.id === orderId)
    if (!(await persistSyncedOrderChange(targetOrder, { status }))) return

    const updateOrder = (order) => (order.id === orderId ? { ...order, status } : order)
    setCustomerOrders((orders) => orders.map(updateOrder))
    setMerchantOrders((orders) => orders.map(updateOrder))
    setDeliveryOrders((orders) => {
      const updatedOrder = { ...targetOrder, status }
      const exists = orders.some((order) => order.id === orderId)

      if (status === "جاهز للتوصيل" && !exists) {
        return [updatedOrder, ...orders]
      }

      return orders.map(updateOrder)
    })
    showNotification(
      `تم تحديث طلب رقم ${orderId} إلى: ${status}.`,
      "success",
      "الإدارة",
    )
  }

  async function prepareOrder(orderId) {
    const orderToPrepare = merchantOrders.find((order) => order.id === orderId)

    if (!orderToPrepare) {
      return
    }

    if (!(await persistSyncedOrderChange(orderToPrepare, { status: "جاهز للتوصيل" }))) return

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
    showNotification(
      `طلب رقم ${orderId} صار جاهز للتوصيل. هسه راح ينتقل لقائمة مهام السائق.`,
      "success",
      "صاحب متجر",
    )
  }

  async function updateDeliveryStatus(orderId, status) {
    const targetOrder = deliveryOrders.find((order) => order.id === orderId)
    const remoteChanges = {
      status,
      ...(status === "قيد التوصيل" && authSession ? { driverId: authSession.user.id } : {}),
    }
    if (!(await persistSyncedOrderChange(targetOrder, remoteChanges))) return

    setCustomerOrders((orders) =>
      orders.map((order) => (order.id === orderId ? { ...order, status } : order)),
    )
    setMerchantOrders((orders) =>
      orders.map((order) => (order.id === orderId ? { ...order, status } : order)),
    )
    setDeliveryOrders((orders) =>
      orders.map((order) => (order.id === orderId ? { ...order, status } : order)),
    )
    showNotification(
      `تم تحديث توصيل طلب رقم ${orderId} إلى: ${status}. الإدارة والزبون يشوفون التحديث بنفس الوقت.`,
      "success",
      "سائق",
    )
  }

  async function updateOrderNote(orderId, internalNote) {
    const targetOrder =
      customerOrders.find((order) => order.id === orderId) ??
      merchantOrders.find((order) => order.id === orderId) ??
      deliveryOrders.find((order) => order.id === orderId)
    if (!(await persistSyncedOrderChange(targetOrder, { internalNote }))) return

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

  async function changeDriverApproval(driverId, status) {
    try {
      const updatedDriver = await updateDriverApproval(driverId, status)
      setDrivers((currentDrivers) =>
        currentDrivers.map((driver) => (driver.id === driverId ? updatedDriver : driver)),
      )
      showNotification(
        `تم ${status === "approved" ? "قبول" : "رفض"} حساب السائق ${updatedDriver.name}.`,
        "success",
        "الإدارة",
      )
    } catch (error) {
      showNotification(`تعذر تحديث حساب السائق: ${error.message}`, "warning", "الإدارة")
    }
  }

  async function settleDriverEarnings(driverId) {
    try {
      const settledOrders = await settleDriverPayouts(driverId)
      const settledOrderIds = new Set(settledOrders.map((order) => order.id))
      const updateSettledOrders = (orders) =>
        orders.map((order) =>
          settledOrderIds.has(order.id)
            ? settledOrders.find((settledOrder) => settledOrder.id === order.id)
            : order,
        )

      setCustomerOrders(updateSettledOrders)
      setMerchantOrders(updateSettledOrders)
      setDeliveryOrders(updateSettledOrders)

      const settledTotal = settledOrders.reduce(
        (total, order) => total + order.deliveryFee,
        0,
      )
      showNotification(
        settledOrders.length > 0
          ? `تم تسجيل دفع ${settledTotal.toLocaleString("en-US")} د.ع للسائق.`
          : "ماكو مستحقات جديدة غير مدفوعة لهذا السائق.",
        settledOrders.length > 0 ? "success" : "info",
        "الإدارة",
      )
    } catch (error) {
      showNotification(`تعذر تسجيل تسوية السائق: ${error.message}`, "warning", "الإدارة")
    }
  }

  async function settleMerchantEarnings(storeName) {
    try {
      const settledOrders = await settleMerchantPayouts(storeName)
      const settledOrdersById = new Map(settledOrders.map((order) => [order.id, order]))
      const updateSettledOrders = (orders) =>
        orders.map((order) => settledOrdersById.get(order.id) ?? order)

      setCustomerOrders(updateSettledOrders)
      setMerchantOrders(updateSettledOrders)
      setDeliveryOrders(updateSettledOrders)

      const settledTotal = settledOrders.reduce(
        (total, order) =>
          total + order.subtotal * (1 - Number(order.commissionRate ?? ADMIN_COMMISSION_RATE)),
        0,
      )
      showNotification(
        settledOrders.length > 0
          ? `تم تسجيل دفع ${Math.round(settledTotal).toLocaleString("en-US")} د.ع لمتجر ${storeName}.`
          : "ماكو مستحقات جديدة غير مدفوعة لهذا المتجر.",
        settledOrders.length > 0 ? "success" : "info",
        "الإدارة",
      )
    } catch (error) {
      showNotification(`تعذر تسجيل تسوية المتجر: ${error.message}`, "warning", "الإدارة")
    }
  }

  async function cancelOrder(orderId) {
    const orderToCancel =
      customerOrders.find((order) => order.id === orderId) ??
      merchantOrders.find((order) => order.id === orderId)

    if (!orderToCancel || orderToCancel.status === "ملغي") {
      return
    }

    if (authSession && orderToCancel.isSynced) {
      try {
        await cancelMarketplaceOrder(orderId)
        setStorageMessage("")
      } catch (error) {
        setStorageMessage(`تعذر إلغاء الطلب بقاعدة البيانات: ${error.message}`)
        showNotification("ما انلغى الطلب لأن قاعدة البيانات رفضت العملية.", "warning", accountType)
        return
      }
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
      const updatedSelectedStore = updatedStores.find((store) => store.name === selectedStore?.name)

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
    showNotification(
      `تم إلغاء طلب رقم ${orderId}. رجعت الكمية للمخزون وما عاد يظهر كطلب نشط.`,
      "warning",
      accountType,
    )
  }

  async function registerStore(store) {
    let newStore = {
      ...store,
      ownerName: activeUser.name,
      ownerPhone: activeUser.phone,
      status: "pending",
      image: categoryImages[store.category],
      description: `${store.category} في ${store.area}. للتواصل: ${store.phone}.`,
      products: [],
    }

    if (authSession) {
      try {
        newStore = await createMarketplaceStore(
          newStore,
          authSession.user.id,
          activeUser.name,
          activeUser.phone,
        )
        newStore.image = normalizeMarketplaceImage(newStore.image, categoryImages[newStore.category])
        setStorageMessage("")
      } catch (error) {
        setStorageMessage(`تعذر تسجيل المتجر بقاعدة البيانات: ${error.message}`)
        showNotification("ما تم تسجيل المتجر لأن قاعدة البيانات رفضت الحفظ.", "warning", "صاحب متجر")
        return false
      }
    }

    setStores((currentStores) => [newStore, ...currentStores])
    showNotification(
      `تم تسجيل متجر ${newStore.name}. الطلب صار عند الإدارة وبانتظار الموافقة حتى يظهر للزبائن.`,
      "success",
      "صاحب متجر",
    )
    return true
  }

  async function approveStore(storeName) {
    const targetStore = stores.find((store) => store.name === storeName)
    if (authSession && targetStore?.isSynced) {
      try {
        await updateMarketplaceStoreStatus(targetStore.id, "approved")
      } catch (error) {
        setStorageMessage(`تعذر قبول المتجر بقاعدة البيانات: ${error.message}`)
        return
      }
    }
    setStores((currentStores) =>
      currentStores.map((store) =>
        store.name === storeName ? { ...store, rejectionReason: "", status: "approved" } : store,
      ),
    )
    showNotification(
      `تمت الموافقة على متجر ${storeName}. صار ظاهر للزبائن ويكدر يستقبل طلبات.`,
      "success",
      "الإدارة",
    )
  }

  async function rejectStore(storeName, reason = "بيانات المتجر تحتاج توضيح أكثر.") {
    const targetStore = stores.find((store) => store.name === storeName)
    if (authSession && targetStore?.isSynced) {
      try {
        await updateMarketplaceStoreStatus(targetStore.id, "rejected", reason)
      } catch (error) {
        setStorageMessage(`تعذر رفض المتجر بقاعدة البيانات: ${error.message}`)
        return
      }
    }
    setStores((currentStores) =>
      currentStores.map((store) =>
        store.name === storeName ? { ...store, rejectionReason: reason, status: "rejected" } : store,
      ),
    )
    showNotification(
      `تم رفض متجر ${storeName}. سبب الرفض محفوظ حتى يعرف صاحب المتجر شنو يحتاج يعدل.`,
      "warning",
      "الإدارة",
    )
  }

  async function reviewStoreAgain(storeName) {
    const targetStore = stores.find((store) => store.name === storeName)
    if (authSession && targetStore?.isSynced) {
      try {
        await updateMarketplaceStoreStatus(targetStore.id, "pending")
      } catch (error) {
        setStorageMessage(`تعذر إعادة المتجر للمراجعة: ${error.message}`)
        return
      }
    }
    setStores((currentStores) =>
      currentStores.map((store) =>
        store.name === storeName ? { ...store, status: "pending" } : store,
      ),
    )
    showNotification(
      `رجع متجر ${storeName} للمراجعة. راح يبقى مخفي عن الزبائن لحد قرار الإدارة الجديد.`,
      "success",
      "الإدارة",
    )
  }

  async function updatePlatformSettings(nextSettings) {
    const previousSettings = platformSettings
    const saveVersion = settingsSaveVersion.current + 1
    settingsSaveVersion.current = saveVersion
    const resolvedSettings = normalizePlatformSettings(
      typeof nextSettings === "function" ? nextSettings(platformSettings) : nextSettings,
    )

    setPlatformSettings(resolvedSettings)

    if (!authSession) {
      showNotification(
        "تم تحديث الإعدادات على هذا الجهاز. اربط الحساب حتى تنحفظ لكل الأجهزة.",
        "info",
        "الإدارة",
      )
      return
    }

    settingsSaveQueue.current = settingsSaveQueue.current
      .catch(() => {})
      .then(() => savePlatformSettings(resolvedSettings))

    try {
      const savedSettings = await settingsSaveQueue.current

      if (settingsSaveVersion.current === saveVersion) {
        setPlatformSettings(normalizePlatformSettings(savedSettings))
        setStorageMessage("")
        showNotification(
          "تم حفظ العمولة وأجور المناطق لكل الأجهزة بنجاح.",
          "success",
          "الإدارة",
        )
      }
    } catch (error) {
      if (settingsSaveVersion.current === saveVersion) {
        setPlatformSettings(previousSettings)
        setStorageMessage(`تعذر حفظ إعدادات الأسعار بقاعدة البيانات: ${error.message}`)
        showNotification("ما تم حفظ الأسعار. رجعنا القيم السابقة لحمايتها.", "warning", "الإدارة")
      }
    }
  }

  async function addProductToStore(storeName, product) {
    const storeCategory = stores.find((store) => store.name === storeName)?.category
    const targetStore = stores.find((store) => store.name === storeName)
    let newProduct = {
      name: product.name,
      price: formatEffectiveProductPrice(product),
      originalPrice: `${Number(product.price).toLocaleString("en-US")} د.ع`,
      discountPercent: Number(product.discountPercent ?? 0),
      discountEndsAt: product.discountEndsAt ?? "",
      quantity: product.quantity,
      image: product.image || categoryImages[storeCategory],
      status: Number(product.quantity) === 0 ? "نفد" : product.status || "متوفر",
    }

    if (authSession && targetStore?.isSynced) {
      try {
        const uploadedImage = product.image?.startsWith("data:image/")
          ? await uploadMarketplaceProductImage(targetStore.id, product.image)
          : product.image
        newProduct = await createMarketplaceProduct(targetStore.id, {
          ...product,
          image: uploadedImage || categoryImages[storeCategory],
        })
      } catch (error) {
        setStorageMessage(`تعذر حفظ المنتج بقاعدة البيانات: ${error.message}`)
        return false
      }
    }

    setStores((currentStores) =>
      currentStores.map((store) =>
        store.name === storeName
          ? { ...store, products: [...store.products, newProduct] }
          : store,
      ),
    )

    if (selectedStore?.name === storeName) {
      setSelectedStore((store) => ({
        ...store,
        products: [...store.products, newProduct],
      }))
    }
    showNotification(
      `تمت إضافة منتج ${newProduct.name} إلى ${storeName}. إذا المتجر مقبول، المنتج يظهر للزبائن.`,
      "success",
      "صاحب متجر",
    )
    return true
  }

  async function updateProductInStore(storeName, oldProductName, product) {
    const storeCategory = stores.find((store) => store.name === storeName)?.category
    const targetStore = stores.find((store) => store.name === storeName)
    const targetProduct = targetStore?.products.find((item) => item.name === oldProductName)
    let updatedProduct = {
      name: product.name,
      price: formatEffectiveProductPrice(product),
      originalPrice: `${Number(product.price).toLocaleString("en-US")} د.ع`,
      discountPercent: Number(product.discountPercent ?? 0),
      discountEndsAt: product.discountEndsAt ?? "",
      quantity: product.quantity,
      image: product.image || categoryImages[storeCategory],
      status: Number(product.quantity) === 0 ? "نفد" : product.status || "متوفر",
    }

    if (authSession && targetStore?.isSynced && targetProduct?.id) {
      try {
        const uploadedImage = product.image?.startsWith("data:image/")
          ? await uploadMarketplaceProductImage(targetStore.id, product.image)
          : product.image
        updatedProduct = await updateMarketplaceProduct(targetProduct.id, targetStore.id, {
          ...product,
          image: uploadedImage || categoryImages[storeCategory],
        })
      } catch (error) {
        setStorageMessage(`تعذر تعديل المنتج بقاعدة البيانات: ${error.message}`)
        return false
      }
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

    if (selectedStore?.name === storeName) {
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
    showNotification(
      `تم تعديل منتج ${updatedProduct.name}. السعر والكمية والحالة تحدّثت بواجهة الزبون.`,
      "success",
      "صاحب متجر",
    )
    return true
  }

  async function deleteProductFromStore(storeName, productName) {
    const targetStore = stores.find((store) => store.name === storeName)
    const targetProduct = targetStore?.products.find((product) => product.name === productName)
    if (authSession && targetStore?.isSynced && targetProduct?.id) {
      try {
        await deleteMarketplaceProduct(targetProduct.id)
      } catch (error) {
        setStorageMessage(`تعذر حذف المنتج من قاعدة البيانات: ${error.message}`)
        return false
      }
    }
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

    if (selectedStore?.name === storeName) {
      setSelectedStore((store) => ({
        ...store,
        products: store.products.filter((product) => product.name !== productName),
      }))
    }

    setCartItems((items) =>
      items.filter((item) => item.store !== storeName || item.name !== productName),
    )
    showNotification(
      `تم حذف منتج ${productName}. انشال من المتجر ومن أي سلة مرتبطة بيه.`,
      "warning",
      "صاحب متجر",
    )
    return true
  }

  return (
    <main className="page">
      {currentView === "login" ? (
        <LoginScreen
          accountType={accountType}
          authEmail={authEmail}
          authPassword={authPassword}
          authLoading={authLoading}
          authSession={authSession}
          isOnlineAuthEnabled={isSupabaseConfigured}
          onAccountChange={chooseAccountType}
          onAuthEmailChange={setAuthEmail}
          onAuthPasswordChange={setAuthPassword}
          onEmailLogin={sendEmailLoginLink}
          onPasswordLogin={signInWithPassword}
          onPasswordReset={sendPasswordReset}
          onPasswordSignUp={signUpWithPassword}
          onRecoveredPasswordSave={updateRecoveredPassword}
          onPhoneLogin={signInWithPhone}
          isPasswordRecovery={isPasswordRecovery}
          loginInfo={loginInfo}
          loginMessage={loginMessage}
          onEnter={enterDashboard}
          onForgetAccount={forgetSavedAccount}
          onLoginInfoChange={setLoginInfo}
          savedAccountWarning={savedAccountWarning}
        />
      ) : currentView === "driver-approval" ? (
        <DriverApprovalScreen
          name={activeUser.name}
          onBack={logoutCurrentSession}
          status={driverApprovalStatus}
        />
      ) : (
        <Shell
          dashboard={dashboard}
          navItems={dashboardNavItems}
          storageMessage={storageMessage}
          notification={visibleAppNotification}
          notifications={visibleNotificationHistory}
          browserNotificationPermission={browserNotificationPermission}
          onEnableBrowserNotifications={enableBrowserNotifications}
          onClearNotifications={() =>
            setNotificationHistory((history) =>
              history.filter((notification) => !isNotificationForAccount(notification, accountType)),
            )
          }
          onDismissNotification={() => setAppNotification(null)}
          onReadNotifications={() =>
            setNotificationHistory((history) =>
              history.map((notification) =>
                isNotificationForAccount(notification, accountType)
                  ? { ...notification, read: true }
                  : notification,
              ),
            )
          }
          stats={activeStats}
          user={activeUser}
          onBack={logoutCurrentSession}
          onForgetAccount={forgetSavedAccount}
        >
          {accountType === "زبون" && (
            <CustomerDashboard
              cartItems={cartItems}
              coupons={coupons}
              reviews={reviews}
              customerInfo={customerInfo}
              customerOrders={visibleCustomerOrders}
              deliveryFee={activeDeliveryFee}
              deliveryZones={BASRA_DELIVERY_ZONES}
              favoriteStoreNames={favoriteStoreNames}
              savedCustomerAddress={savedCustomerAddress}
              onAddToCart={addToCart}
              onCustomerInfoChange={setCustomerInfo}
              onCancelOrder={cancelOrder}
              onDecreaseCartItem={decreaseCartItem}
              onIncreaseCartItem={increaseCartItem}
              onRemoveCartItem={removeCartItem}
              onReorder={reorderCustomerOrder}
              onSaveCustomerAddress={saveCustomerAddress}
              onSendOrder={sendOrder}
              onSubmitReview={submitOrderReview}
              onToggleFavoriteStore={toggleFavoriteStore}
              onUseSavedCustomerAddress={useSavedCustomerAddress}
              orderMessage={orderMessage}
              selectedStore={activeSelectedStore}
              stores={approvedStores}
              onSelectStore={setSelectedStore}
            />
          )}

          {accountType === "صاحب متجر" && (
            <MerchantDashboard
              commissionRate={platformSettings.commissionRate}
              merchant={activeUser}
              reviews={reviews}
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
              driverId={authSession?.user?.id}
              orders={deliveryOrders}
              onUpdateOrderNote={updateOrderNote}
              onUpdateStatus={updateDeliveryStatus}
              stores={stores}
              reviews={reviews}
            />
          )}

          {accountType === "الإدارة" && (
            <AdminDashboard
              allOrders={allOrders}
              coupons={coupons}
              reviews={reviews}
              commissionRate={platformSettings.commissionRate}
              onApproveStore={approveStore}
              onChangePassword={changeAdminPassword}
              onExportBackup={exportDataBackup}
              onImportBackup={importDataBackup}
              onAddCoupon={addCoupon}
              onUpdateCoupon={changeCoupon}
              lastSaveTime={lastSaveTime}
              onRejectStore={rejectStore}
              onReviewStoreAgain={reviewStoreAgain}
              onResetData={resetDemoData}
              deliveredOrders={deliveredOrders}
              drivers={drivers}
              estimatedRevenue={estimatedRevenue}
              onSettingsChange={updatePlatformSettings}
              onSettleDriverEarnings={settleDriverEarnings}
              onSettleMerchantEarnings={settleMerchantEarnings}
              onUpdateDriverApproval={changeDriverApproval}
              onUpdateOrderStatus={updateAdminOrderStatus}
              settings={platformSettings}
              stores={stores}
            />
          )}
        </Shell>
      )}
    </main>
  )
}

function getRealtimeOrderNotification({
  accountType,
  activeUser,
  merchantStoreNames,
  payload,
  previousStatus,
}) {
  const order = payload.new
  if (!order?.id) return null

  const status = getDatabaseStatusLabel(order.status)
  const oldStatus = previousStatus ?? getDatabaseStatusLabel(payload.old?.status)
  const isNewOrder = payload.eventType === "INSERT"
  const statusChanged = payload.eventType === "UPDATE" && Boolean(oldStatus) && status !== oldStatus

  if (accountType === "صاحب متجر" && isNewOrder) {
    const orderStoreNames = Array.isArray(order.items)
      ? order.items.map((item) => item.store)
      : []

    if (!orderStoreNames.some((storeName) => merchantStoreNames.includes(storeName))) return null

    return {
      audience: "صاحب متجر",
      message: `وصلك طلب جديد رقم ${order.id}. افتح الطلب حتى تبدأ تجهيزه.`,
      title: "طلب جديد للمتجر",
      type: "warning",
    }
  }

  if (accountType === "سائق" && statusChanged && status === "جاهز للتوصيل") {
    return {
      audience: "سائق",
      message: `طلب رقم ${order.id} صار جاهزًا للتوصيل في منطقة ${order.area}.`,
      title: "مهمة توصيل جديدة",
      type: "warning",
    }
  }

  if (
    accountType === "زبون" &&
    statusChanged &&
    String(order.customer_phone ?? "") === activeUser.phone
  ) {
    return {
      audience: "زبون",
      message: `حالة طلبك رقم ${order.id} صارت: ${status}.`,
      title: "تحديث على طلبك",
      type: status === "تم التسليم" ? "success" : "info",
    }
  }

  if (accountType === "الإدارة" && (isNewOrder || statusChanged)) {
    return {
      audience: "الإدارة",
      message: isNewOrder
        ? `وصل طلب جديد رقم ${order.id} من ${order.customer_name}.`
        : `تغيرت حالة الطلب رقم ${order.id} إلى: ${status}.`,
      title: isNewOrder ? "طلب جديد" : "تحديث طلب",
      type: isNewOrder ? "warning" : "info",
    }
  }

  return null
}

function getDatabaseStatusLabel(status) {
  const labels = {
    canceled: "ملغي",
    delivered: "تم التسليم",
    in_delivery: "قيد التوصيل",
    new: "طلب جديد",
    preparing: "قيد التجهيز",
    ready_for_delivery: "جاهز للتوصيل",
  }

  return labels[status] ?? status ?? ""
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
    const uniqueOrders = [
      ...merchantOrders,
      ...deliveryOrders.filter(
        (deliveryOrder) => !merchantOrders.some((order) => order.id === deliveryOrder.id),
      ),
    ]

    return [
      { label: "كل الطلبات", value: uniqueOrders.length },
      {
        label: "قيد التوصيل",
        value: deliveryOrders.filter((order) => order.status !== "تم التسليم").length,
      },
      { label: "صافي الربح", value: `${Math.round(estimatedRevenue).toLocaleString("en-US")} د.ع` },
    ]
  }

  return dashboard.stats
}

function getDashboardNavItems(accountType) {
  if (accountType === "صاحب متجر") {
    return [
      { label: "حالة المتجر", targetId: "merchant-status" },
      { label: "تسجيل المتجر", targetId: "merchant-register" },
      { label: "المنتجات", targetId: "merchant-products" },
      { label: "الأرباح", targetId: "merchant-earnings" },
      { label: "الطلبات", targetId: "merchant-orders" },
    ]
  }

  if (accountType === "سائق") {
    return [
      { label: "الملخص", targetId: "driver-summary" },
      { label: "الأولوية", targetId: "driver-priority" },
      { label: "السجل", targetId: "driver-history" },
      { label: "الطلبات", targetId: "driver-orders" },
    ]
  }

  if (accountType === "الإدارة") {
    return [
      { label: "ملخص المشروع", targetId: "admin-summary" },
      { label: "المراقبة", targetId: "admin-monitor" },
      { label: "السائقين", targetId: "admin-drivers" },
      { label: "تسويات المتاجر", targetId: "admin-merchant-payouts" },
      { label: "التقارير المالية", targetId: "admin-financial-reports" },
      { label: "العروض", targetId: "admin-offers" },
      { label: "الكوبونات", targetId: "admin-coupons" },
      { label: "التقييمات", targetId: "admin-reviews" },
      { label: "الإعدادات", targetId: "admin-settings" },
      { label: "البيانات", targetId: "admin-data" },
      { label: "المتاجر", targetId: "admin-stores" },
      { label: "الطلبات", targetId: "admin-orders" },
    ]
  }

  return [
    { label: "المقترحة", targetId: "customer-suggested" },
    { label: "المتاجر", targetId: "customer-stores" },
    { label: "السلة", targetId: "customer-cart" },
    { label: "التتبع", targetId: "customer-tracking" },
  ]
}

function getPriceValue(price) {
  return Number(String(price).replace(/[^\d]/g, ""))
}

function formatBackupDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")

  return `${year}-${month}-${day}-${hour}-${minute}`
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

function loadPlatformSettings() {
  try {
    const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY))

    if (
      savedSettings &&
      Number.isFinite(savedSettings.commissionRate) &&
      Number.isFinite(savedSettings.deliveryFee)
    ) {
      return {
        commissionRate: savedSettings.commissionRate,
        deliveryFee: savedSettings.deliveryFee,
        deliveryFees: normalizeDeliveryFees(savedSettings.deliveryFees),
      }
    }
  } catch {
    return defaultPlatformSettings
  }

  return defaultPlatformSettings
}

function normalizePlatformSettings(settings) {
  if (
    settings &&
    Number.isFinite(settings.commissionRate) &&
    Number.isFinite(settings.deliveryFee)
  ) {
    return {
      commissionRate: settings.commissionRate,
      deliveryFee: settings.deliveryFee,
      deliveryFees: normalizeDeliveryFees(settings.deliveryFees),
    }
  }

  return defaultPlatformSettings
}

function normalizeDeliveryFees(deliveryFees) {
  return Object.fromEntries(
    BASRA_DELIVERY_ZONES.map((area) => {
      const fee = Number(deliveryFees?.[area])
      return [area, Number.isFinite(fee) && fee >= 0 ? fee : DEFAULT_DELIVERY_FEES[area]]
    }),
  )
}

function loadSavedAccount() {
  const defaultAccount = {
    accountType: "زبون",
    name: "",
    phone: "",
  }

  try {
    const savedAccount = JSON.parse(localStorage.getItem(ACCOUNT_STORAGE_KEY))
    const allowedTypes = ["زبون", "صاحب متجر", "سائق", "الإدارة"]

    if (!savedAccount || !allowedTypes.includes(savedAccount.accountType)) {
      return defaultAccount
    }

    return {
      accountType: savedAccount.accountType,
      name: typeof savedAccount.name === "string" ? savedAccount.name : "",
      phone: typeof savedAccount.phone === "string" ? savedAccount.phone : "",
    }
  } catch {
    return defaultAccount
  }
}

function loadLastSaveTime() {
  try {
    return localStorage.getItem(LAST_SAVE_STORAGE_KEY) ?? ""
  } catch {
    return ""
  }
}

function normalizeSavedAccount(account) {
  const defaultAccount = {
    accountType: "زبون",
    name: "",
    phone: "",
  }
  const allowedTypes = ["زبون", "صاحب متجر", "سائق", "الإدارة"]

  if (!account || !allowedTypes.includes(account.accountType)) {
    return defaultAccount
  }

  return {
    accountType: account.accountType,
    name: typeof account.name === "string" ? account.name : "",
    phone: typeof account.phone === "string" ? account.phone : "",
  }
}

function getSavedAccountWarning(savedAccount, selectedAccountType, loginInfo) {
  const savedPhone = savedAccount.phone.trim()
  const enteredPhone = loginInfo.phone.trim()

  if (!savedPhone || !enteredPhone || savedPhone !== enteredPhone) {
    return ""
  }

  if (savedAccount.accountType === selectedAccountType) {
    return ""
  }

  return `هذا الرقم محفوظ كـ ${savedAccount.accountType}. إذا تريد تدخل كـ ${selectedAccountType}، بدّل الحساب أولًا حتى ما تختلط البيانات.`
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.warn(`Could not save ${key}.`, error)
    return false
  }
}

function readStoredData(key) {
  try {
    const storedValue = localStorage.getItem(key)

    if (!storedValue) {
      return null
    }

    return JSON.parse(storedValue)
  } catch (error) {
    console.warn(`Could not read ${key}.`, error)
    removeFromStorage(key)
    return null
  }
}

function removeFromStorage(key) {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.warn(`Could not remove ${key}.`, error)
  }
}

function loadAppData() {
  const defaultAppData = {
    cartItems: [],
    customerInfo: {
      name: "",
      phone: "",
      area: "",
      landmark: "",
      notes: "",
    },
    customerOrders: [],
    deliveryOrders: [],
    favoriteStoreNames: [],
    merchantOrders: [],
    nextOrderId: 1,
    savedCustomerAddress: {
      area: "",
      landmark: "",
      notes: "",
    },
    selectedStore: isSupabaseConfigured ? undefined : customerStores[0],
    stores: isSupabaseConfigured ? [] : customerStores,
  }

  const savedData = readStoredData(APP_DATA_STORAGE_KEY)
  const backupData = savedData ? null : readStoredData(APP_DATA_BACKUP_STORAGE_KEY)
  const storedData = savedData ?? backupData

  if (!storedData) {
    return defaultAppData
  }

  try {
    const appData = {
      cartItems: Array.isArray(storedData.cartItems) ? storedData.cartItems : [],
      customerInfo: normalizeCustomerInfo(storedData.customerInfo, defaultAppData.customerInfo),
      customerOrders: Array.isArray(storedData.customerOrders)
        ? storedData.customerOrders.map(normalizeOrder)
        : [],
      deliveryOrders: Array.isArray(storedData.deliveryOrders)
        ? storedData.deliveryOrders.map(normalizeOrder)
        : [],
      favoriteStoreNames: Array.isArray(storedData.favoriteStoreNames)
        ? storedData.favoriteStoreNames
        : [],
      merchantOrders: Array.isArray(storedData.merchantOrders)
        ? storedData.merchantOrders.map(normalizeOrder)
        : [],
      nextOrderId: Number.isFinite(storedData.nextOrderId) ? storedData.nextOrderId : 1,
      savedCustomerAddress: normalizeSavedAddress(
        storedData.savedCustomerAddress,
        defaultAppData.savedCustomerAddress,
      ),
      stores: isSupabaseConfigured
        ? []
        : Array.isArray(storedData.stores) && storedData.stores.length > 0
          ? storedData.stores.map(normalizeStore)
          : customerStores,
    }

    const selectedStoreName = storedData.selectedStoreName ?? storedData.selectedStore?.name
    const selectedStore =
      appData.stores.find((store) => store.name === selectedStoreName) ?? appData.stores[0]

    return {
      ...appData,
      selectedStore,
    }
  } catch {
    removeFromStorage(APP_DATA_STORAGE_KEY)
    return defaultAppData
  }
}

function normalizeImportedAppData(backupData) {
  const storedData = backupData?.appData ?? backupData

  if (!storedData || !Array.isArray(storedData.stores) || storedData.stores.length === 0) {
    return null
  }

  const stores = storedData.stores.map(normalizeStore)
  const selectedStoreName = storedData.selectedStoreName ?? storedData.selectedStore?.name
  const selectedStore = stores.find((store) => store.name === selectedStoreName) ?? stores[0]

  return {
    cartItems: Array.isArray(storedData.cartItems) ? storedData.cartItems : [],
    customerInfo: normalizeCustomerInfo(storedData.customerInfo, {
      name: "",
      phone: "",
      area: "",
      landmark: "",
      notes: "",
    }),
    customerOrders: Array.isArray(storedData.customerOrders)
      ? storedData.customerOrders.map(normalizeOrder)
      : [],
    deliveryOrders: Array.isArray(storedData.deliveryOrders)
      ? storedData.deliveryOrders.map(normalizeOrder)
      : [],
    favoriteStoreNames: Array.isArray(storedData.favoriteStoreNames)
      ? storedData.favoriteStoreNames
      : [],
    merchantOrders: Array.isArray(storedData.merchantOrders)
      ? storedData.merchantOrders.map(normalizeOrder)
      : [],
    nextOrderId: Number.isFinite(storedData.nextOrderId) ? storedData.nextOrderId : 1,
    savedCustomerAddress: normalizeSavedAddress(storedData.savedCustomerAddress, {
      area: "",
      landmark: "",
      notes: "",
    }),
    selectedStore,
    stores,
  }
}

function normalizeStore(store) {
  const categoryImage = categoryImages[store.category]
  const defaultStore = customerStores.find((item) => item.name === store.name)

  return {
    ...store,
    area: store.area || defaultStore?.area || "",
    phone: store.phone || defaultStore?.phone || "",
    ownerName: store.ownerName || defaultStore?.ownerName || "",
    ownerPhone: store.ownerPhone || defaultStore?.ownerPhone || "",
    status: store.status || defaultStore?.status || "approved",
    image: normalizeMarketplaceImage(store.image, categoryImage),
    products: Array.isArray(store.products)
      ? store.products.map((product) => normalizeProduct(product, categoryImage))
      : [],
  }
}

function normalizeProduct(product, fallbackImage) {
  const originalPrice = product.originalPrice ?? product.price
  const discountActive =
    Number(product.discountPercent) > 0 &&
    Boolean(product.discountEndsAt) &&
    new Date(product.discountEndsAt).getTime() > Date.now()

  return {
    ...product,
    originalPrice,
    price: discountActive
      ? formatEffectiveProductPrice({
          price: getPriceValue(originalPrice),
          discountPercent: product.discountPercent,
          discountEndsAt: product.discountEndsAt,
        })
      : originalPrice,
    image: normalizeMarketplaceImage(product.image, fallbackImage),
  }
}

function formatEffectiveProductPrice(product) {
  const basePrice = Number(product.price)
  const discountActive =
    Number(product.discountPercent) > 0 &&
    Boolean(product.discountEndsAt) &&
    new Date(product.discountEndsAt).getTime() > Date.now()
  const price = discountActive
    ? Math.round(basePrice * (1 - Number(product.discountPercent) / 100))
    : basePrice

  return `${price.toLocaleString("en-US")} د.ع`
}

function normalizeMarketplaceImage(image, fallbackImage) {
  if (!image || isOldMarketplaceImage(image)) {
    return fallbackImage
  }

  return image
}

function isOldMarketplaceImage(image) {
  const imagePath = String(image)
  const oldImageNames = ["accessories", "category-collage", "clothing", "cosmetics", "perfume", "shoes"]

  return imagePath.endsWith(".png") && oldImageNames.some((name) => imagePath.includes(name))
}

function normalizeOrder(order) {
  return {
    ...order,
    createdAt: typeof order.createdAt === "string" ? order.createdAt : "",
  }
}

function getApplicableCoupon(coupons, code, subtotal) {
  const normalizedCode = String(code).trim().toUpperCase()
  if (!normalizedCode) return null
  const coupon = coupons.find((item) => item.code === normalizedCode)
  if (
    !coupon ||
    !coupon.isActive ||
    coupon.usedCount >= coupon.maxUses ||
    new Date(coupon.expiresAt).getTime() <= Date.now() ||
    subtotal < coupon.minimumOrder
  ) {
    return null
  }
  return coupon
}

function calculateCouponDiscount(coupon, subtotal) {
  if (!coupon) return 0
  const discount =
    coupon.discountType === "percentage"
      ? Math.round(subtotal * coupon.discountValue / 100)
      : coupon.discountValue
  return Math.min(discount, subtotal)
}

function normalizeCustomerInfo(info, fallback) {
  if (!info || typeof info !== "object") {
    return fallback
  }

  return {
    name: typeof info.name === "string" ? info.name : "",
    phone: typeof info.phone === "string" ? info.phone : "",
    area: typeof info.area === "string" ? info.area : "",
    landmark: typeof info.landmark === "string" ? info.landmark : "",
    notes: typeof info.notes === "string" ? info.notes : "",
  }
}

function normalizeSavedAddress(address, fallback) {
  if (!address || typeof address !== "object") {
    return fallback
  }

  return {
    area: typeof address.area === "string" ? address.area : "",
    landmark: typeof address.landmark === "string" ? address.landmark : "",
    notes: typeof address.notes === "string" ? address.notes : "",
  }
}

function isNotificationForAccount(notification, accountType) {
  if (!notification) {
    return false
  }

  return notification.audience === accountType || notification.audience === "النظام"
}

function isValidIraqiPhone(phone) {
  return /^07\d{9}$/.test(phone.trim())
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getPublicAccountType(accountType) {
  return ["زبون", "صاحب متجر", "سائق", "الإدارة"].includes(accountType)
    ? accountType
    : "زبون"
}

export default App

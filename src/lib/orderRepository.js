import { supabase } from "./supabase"

const statusToDatabase = {
  "طلب جديد": "new",
  "قيد التجهيز": "preparing",
  "جاهز للتوصيل": "ready_for_delivery",
  "قيد التوصيل": "in_delivery",
  "تم التسليم": "delivered",
  ملغي: "canceled",
}

const statusFromDatabase = Object.fromEntries(
  Object.entries(statusToDatabase).map(([label, value]) => [value, label]),
)

export async function fetchMarketplaceOrders() {
  const { data, error } = await supabase
    .from("marketplace_orders")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data.map(fromDatabaseOrder)
}

export async function createMarketplaceOrders(orders) {
  const createdOrders = []

  for (const order of orders) {
    const { data, error } = await supabase.rpc("create_marketplace_order_with_stock", {
      p_area: order.area,
      p_customer_name: order.customer,
      p_customer_phone: order.phone,
      p_coupon_code: order.couponCode || null,
      p_delivery_fee: order.deliveryFee,
      p_items: order.items,
      p_landmark: order.landmark,
      p_notes: order.notes,
      p_payment_method: order.paymentMethod,
    })

    if (error) throw error
    createdOrders.push(fromDatabaseOrder(data))
  }

  return createdOrders
}

export async function cancelMarketplaceOrder(orderId) {
  const { data, error } = await supabase.rpc("cancel_marketplace_order_with_stock", {
    p_order_id: orderId,
  })

  if (error) throw error
  return fromDatabaseOrder(data)
}

export async function updateMarketplaceOrder(orderId, changes) {
  const databaseChanges = {}
  if (changes.status) databaseChanges.status = statusToDatabase[changes.status]
  if (changes.internalNote !== undefined) databaseChanges.internal_note = changes.internalNote
  if (changes.driverId !== undefined) databaseChanges.driver_id = changes.driverId

  const { data, error } = await supabase
    .from("marketplace_orders")
    .update(databaseChanges)
    .eq("id", orderId)
    .select("*")
    .single()

  if (error) throw error
  return fromDatabaseOrder(data)
}

export async function settleDriverPayouts(driverId) {
  const paidAt = new Date().toISOString()
  const { data, error } = await supabase
    .from("marketplace_orders")
    .update({
      driver_paid_at: paidAt,
      driver_payout_status: "paid",
    })
    .eq("driver_id", driverId)
    .eq("status", "delivered")
    .eq("driver_payout_status", "pending")
    .select("*")

  if (error) throw error
  return data.map(fromDatabaseOrder)
}

export async function settleMerchantPayouts(storeName) {
  const paidAt = new Date().toISOString()
  const { data, error } = await supabase
    .from("marketplace_orders")
    .update({
      merchant_paid_at: paidAt,
      merchant_payout_status: "paid",
    })
    .eq("store_name", storeName)
    .eq("status", "delivered")
    .eq("merchant_payout_status", "pending")
    .select("*")

  if (error) throw error
  return data.map(fromDatabaseOrder)
}

function fromDatabaseOrder(order) {
  return {
    id: order.id,
    customer: order.customer_name,
    phone: order.customer_phone,
    area: order.area,
    landmark: order.landmark,
    notes: order.notes,
    paymentMethod: order.payment_method,
    items: Array.isArray(order.items) ? order.items : [],
    subtotal: Number(order.subtotal),
    discountAmount: Number(order.discount_amount ?? 0),
    couponCode: order.coupon_code ?? "",
    deliveryFee: Number(order.delivery_fee),
    total: Number(order.subtotal) + Number(order.delivery_fee),
    status: statusFromDatabase[order.status] ?? "طلب جديد",
    internalNote: order.internal_note,
    driverId: order.driver_id,
    driverPaidAt: order.driver_paid_at,
    driverPayoutStatus: order.driver_payout_status ?? "pending",
    commissionRate: Number(order.commission_rate ?? 0.05),
    merchantPaidAt: order.merchant_paid_at,
    merchantPayoutStatus: order.merchant_payout_status ?? "pending",
    storeName: order.store_name,
    createdAt: order.created_at,
    isSynced: true,
  }
}

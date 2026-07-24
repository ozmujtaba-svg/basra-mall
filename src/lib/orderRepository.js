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

export async function createMarketplaceOrders(orders, stores, customerId) {
  const rows = orders.map((order) => {
    const storeName = order.items[0]?.store ?? ""
    const store = stores.find((item) => item.name === storeName)

    return {
      customer_id: customerId,
      customer_name: order.customer,
      customer_phone: order.phone,
      merchant_phone: store?.ownerPhone || store?.phone || "",
      store_name: storeName,
      area: order.area,
      landmark: order.landmark,
      notes: order.notes,
      payment_method: order.paymentMethod,
      status: statusToDatabase[order.status] ?? "new",
      items: order.items,
      subtotal: order.subtotal,
      delivery_fee: order.deliveryFee,
      internal_note: order.internalNote,
    }
  })

  const { data, error } = await supabase
    .from("marketplace_orders")
    .insert(rows)
    .select("*")

  if (error) throw error
  return data.map(fromDatabaseOrder)
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
    deliveryFee: Number(order.delivery_fee),
    total: Number(order.subtotal) + Number(order.delivery_fee),
    status: statusFromDatabase[order.status] ?? "طلب جديد",
    internalNote: order.internal_note,
    driverId: order.driver_id,
    createdAt: order.created_at,
    isSynced: true,
  }
}

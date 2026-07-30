import { supabase } from "./supabase"

export async function fetchReturnRequests() {
  const { data, error } = await supabase
    .from("return_requests")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data.map(fromDatabaseReturn)
}

export async function createReturnRequest(request) {
  const { data, error } = await supabase
    .from("return_requests")
    .insert({
      order_id: request.orderId,
      product_name: request.productName,
      variant_id: request.variantId || null,
      variant_label: request.variantLabel || "",
      quantity: Number(request.quantity),
      request_type: request.requestType,
      reason: request.reason,
      customer_note: request.customerNote.trim(),
    })
    .select("*")
    .single()

  if (error) throw error
  return fromDatabaseReturn(data)
}

export async function updateReturnRequest(requestId, changes) {
  const { data, error } = await supabase
    .from("return_requests")
    .update({
      status: changes.status,
      merchant_response: changes.merchantResponse?.trim() ?? "",
    })
    .eq("id", requestId)
    .select("*")
    .single()

  if (error) throw error
  return fromDatabaseReturn(data)
}

function fromDatabaseReturn(request) {
  return {
    id: request.id,
    orderId: request.order_id,
    customerId: request.customer_id,
    customerName: request.customer_name,
    storeName: request.store_name,
    merchantPhone: request.merchant_phone,
    productName: request.product_name,
    variantId: request.variant_id,
    variantLabel: request.variant_label,
    quantity: Number(request.quantity),
    requestType: request.request_type,
    reason: request.reason,
    customerNote: request.customer_note,
    status: request.status,
    merchantResponse: request.merchant_response,
    createdAt: request.created_at,
    updatedAt: request.updated_at,
  }
}

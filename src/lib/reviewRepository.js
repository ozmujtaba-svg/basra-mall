import { supabase } from "./supabase"

export async function fetchOrderReviews() {
  const { data, error } = await supabase
    .from("order_reviews")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data.map(fromDatabaseReview)
}

export async function createOrderReview(review) {
  const { data, error } = await supabase
    .from("order_reviews")
    .insert({
      order_id: review.orderId,
      store_rating: Number(review.storeRating),
      driver_rating: Number(review.driverRating),
      comment: review.comment.trim(),
    })
    .select("*")
    .single()

  if (error) throw error
  return fromDatabaseReview(data)
}

function fromDatabaseReview(review) {
  return {
    id: review.id,
    orderId: review.order_id,
    customerId: review.customer_id,
    storeName: review.store_name,
    driverId: review.driver_id,
    storeRating: Number(review.store_rating),
    driverRating: Number(review.driver_rating),
    comment: review.comment,
    createdAt: review.created_at,
  }
}

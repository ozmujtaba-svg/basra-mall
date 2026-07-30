import { supabase } from "./supabase"

export async function fetchProductWishlists() {
  const { data, error } = await supabase
    .from("product_wishlists")
    .select("id, user_id, product_id, created_at")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data.map(fromDatabaseWishlist)
}

export async function createProductWishlist(productId, userId) {
  const { data, error } = await supabase
    .from("product_wishlists")
    .insert({
      product_id: productId,
      user_id: userId,
    })
    .select("id, user_id, product_id, created_at")
    .single()

  if (error) throw error
  return fromDatabaseWishlist(data)
}

export async function deleteProductWishlist(productId, userId) {
  const { error } = await supabase
    .from("product_wishlists")
    .delete()
    .eq("product_id", productId)
    .eq("user_id", userId)

  if (error) throw error
}

function fromDatabaseWishlist(item) {
  return {
    createdAt: item.created_at,
    id: item.id,
    productId: item.product_id,
    userId: item.user_id,
  }
}

import { supabase } from "./supabase"

export async function fetchCoupons() {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data.map(fromDatabaseCoupon)
}

export async function createCoupon(coupon) {
  const { data, error } = await supabase
    .from("coupons")
    .insert(toDatabaseCoupon(coupon))
    .select("*")
    .single()

  if (error) throw error
  return fromDatabaseCoupon(data)
}

export async function updateCoupon(couponId, changes) {
  const { data, error } = await supabase
    .from("coupons")
    .update(toDatabaseCoupon(changes))
    .eq("id", couponId)
    .select("*")
    .single()

  if (error) throw error
  return fromDatabaseCoupon(data)
}

function fromDatabaseCoupon(coupon) {
  return {
    id: coupon.id,
    code: coupon.code,
    discountType: coupon.discount_type,
    discountValue: Number(coupon.discount_value),
    minimumOrder: Number(coupon.minimum_order),
    maxUses: Number(coupon.max_uses),
    usedCount: Number(coupon.used_count),
    expiresAt: coupon.expires_at,
    isActive: coupon.is_active,
  }
}

function toDatabaseCoupon(coupon) {
  const data = {}
  if (coupon.code !== undefined) data.code = coupon.code.trim().toUpperCase()
  if (coupon.discountType !== undefined) data.discount_type = coupon.discountType
  if (coupon.discountValue !== undefined) data.discount_value = Number(coupon.discountValue)
  if (coupon.minimumOrder !== undefined) data.minimum_order = Number(coupon.minimumOrder)
  if (coupon.maxUses !== undefined) data.max_uses = Number(coupon.maxUses)
  if (coupon.expiresAt !== undefined) data.expires_at = coupon.expiresAt
  if (coupon.isActive !== undefined) data.is_active = coupon.isActive
  return data
}

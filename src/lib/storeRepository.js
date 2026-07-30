import { supabase } from "./supabase"

export async function fetchMarketplaceStores() {
  const { data, error } = await supabase
    .from("stores")
    .select("*, products(*, product_variants(*))")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data.map(fromDatabaseStore)
}

export async function createMarketplaceStore(store, ownerId, ownerName, ownerPhone) {
  const { data, error } = await supabase
    .from("stores")
    .insert({
      owner_id: ownerId,
      name: store.name,
      category: store.category,
      area: store.area,
      phone: store.phone,
      description: store.description,
      image_url: store.image,
    })
    .select("*, products(*, product_variants(*))")
    .single()

  if (error) throw error
  return fromDatabaseStore(data, { ownerName, ownerPhone })
}

export async function updateMarketplaceStoreStatus(storeId, status, rejectionReason = "") {
  const { error } = await supabase
    .from("stores")
    .update({ status, rejection_reason: rejectionReason })
    .eq("id", storeId)

  if (error) throw error
}

export async function createMarketplaceProduct(storeId, product) {
  const { data, error } = await supabase
    .from("products")
    .insert(toDatabaseProduct(storeId, product))
    .select("*")
    .single()

  if (error) throw error
  const variants = await replaceProductVariants(data.id, product.variants)
  return fromDatabaseProduct({ ...data, product_variants: variants })
}

export async function updateMarketplaceProduct(productId, storeId, product) {
  const { data, error } = await supabase
    .from("products")
    .update(toDatabaseProduct(storeId, product))
    .eq("id", productId)
    .select("*")
    .single()

  if (error) throw error
  const variants = await replaceProductVariants(productId, product.variants)
  return fromDatabaseProduct({ ...data, product_variants: variants })
}

export async function deleteMarketplaceProduct(productId) {
  const { error } = await supabase.from("products").delete().eq("id", productId)
  if (error) throw error
}

export async function uploadMarketplaceProductImage(storeId, imageDataUrl) {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  const userId = userData.user?.id
  if (!userId) throw new Error("لا توجد جلسة متجر فعّالة")

  const imageBlob = await fetch(imageDataUrl).then((response) => response.blob())
  const extension = getImageExtension(imageBlob.type)
  const filePath = `${userId}/${storeId}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage
    .from("product-images")
    .upload(filePath, imageBlob, {
      cacheControl: "31536000",
      contentType: imageBlob.type || "image/jpeg",
      upsert: false,
    })

  if (error) throw error

  const { data } = supabase.storage.from("product-images").getPublicUrl(filePath)
  return data.publicUrl
}

function fromDatabaseStore(store, owner = {}) {
  return {
    id: store.id,
    name: store.name,
    category: store.category,
    area: store.area,
    phone: store.phone,
    ownerName: owner.ownerName ?? "صاحب المتجر",
    ownerPhone: owner.ownerPhone ?? store.phone,
    status: store.status,
    rejectionReason: store.rejection_reason,
    image: store.image_url,
    description: store.description,
    products: (store.products ?? []).map(fromDatabaseProduct),
    isSynced: true,
  }
}

function fromDatabaseProduct(product) {
  const variants = (product.product_variants ?? []).map((variant) => ({
    id: variant.id,
    size: variant.size ?? "",
    color: variant.color ?? "",
    quantity: Number(variant.quantity),
  }))
  const quantity =
    variants.length > 0
      ? variants.reduce((total, variant) => total + variant.quantity, 0)
      : Number(product.quantity)
  const basePrice = Number(product.price)
  const discountPercent = Number(product.discount_percent ?? 0)
  const discountEndsAt = product.discount_ends_at ?? ""
  const hasActiveDiscount =
    discountPercent > 0 && Boolean(discountEndsAt) && new Date(discountEndsAt).getTime() > Date.now()
  const effectivePrice = hasActiveDiscount
    ? Math.round(basePrice * (1 - discountPercent / 100))
    : basePrice

  return {
    id: product.id,
    name: product.name,
    price: `${effectivePrice.toLocaleString("en-US")} د.ع`,
    originalPrice: `${basePrice.toLocaleString("en-US")} د.ع`,
    discountPercent,
    discountEndsAt,
    variants,
    quantity,
    image: product.image_url,
    status: !product.is_visible ? "مخفي مؤقتًا" : quantity === 0 ? "نفد" : "متوفر",
    isSynced: true,
  }
}

function toDatabaseProduct(storeId, product) {
  const variants = product.variants ?? []
  return {
    store_id: storeId,
    name: product.name,
    price: Number(product.price),
    discount_percent: Number(product.discountPercent ?? 0),
    discount_ends_at: product.discountEndsAt || null,
    quantity:
      variants.length > 0
        ? variants.reduce((total, variant) => total + Number(variant.quantity), 0)
        : Number(product.quantity),
    image_url: product.image || null,
    is_visible: product.status !== "مخفي مؤقتًا",
  }
}

async function replaceProductVariants(productId, variants = []) {
  const { error: deleteError } = await supabase
    .from("product_variants")
    .delete()
    .eq("product_id", productId)
  if (deleteError) throw deleteError

  if (variants.length === 0) return []

  const { data, error } = await supabase
    .from("product_variants")
    .insert(
      variants.map((variant) => ({
        product_id: productId,
        size: variant.size.trim(),
        color: variant.color.trim(),
        quantity: Number(variant.quantity),
      })),
    )
    .select("*")

  if (error) throw error
  return data
}

function getImageExtension(contentType) {
  if (contentType === "image/png") return "png"
  if (contentType === "image/webp") return "webp"
  return "jpg"
}

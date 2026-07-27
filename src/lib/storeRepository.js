import { supabase } from "./supabase"

export async function fetchMarketplaceStores() {
  const { data, error } = await supabase
    .from("stores")
    .select("*, products(*)")
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
    .select("*, products(*)")
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
  return fromDatabaseProduct(data)
}

export async function updateMarketplaceProduct(productId, storeId, product) {
  const { data, error } = await supabase
    .from("products")
    .update(toDatabaseProduct(storeId, product))
    .eq("id", productId)
    .select("*")
    .single()

  if (error) throw error
  return fromDatabaseProduct(data)
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
  const quantity = Number(product.quantity)
  return {
    id: product.id,
    name: product.name,
    price: `${Number(product.price).toLocaleString("en-US")} د.ع`,
    quantity,
    image: product.image_url,
    status: !product.is_visible ? "مخفي مؤقتًا" : quantity === 0 ? "نفد" : "متوفر",
    isSynced: true,
  }
}

function toDatabaseProduct(storeId, product) {
  return {
    store_id: storeId,
    name: product.name,
    price: Number(product.price),
    quantity: Number(product.quantity),
    image_url: product.image || null,
    is_visible: product.status !== "مخفي مؤقتًا",
  }
}

function getImageExtension(contentType) {
  if (contentType === "image/png") return "png"
  if (contentType === "image/webp") return "webp"
  return "jpg"
}

import { supabase } from "./supabase"

export async function fetchMarketingBanners() {
  const { data, error } = await supabase
    .from("marketing_banners")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data.map(fromDatabaseBanner)
}

export async function createMarketingBanner(banner) {
  const { data, error } = await supabase
    .from("marketing_banners")
    .insert(toDatabaseBanner(banner))
    .select("*")
    .single()

  if (error) throw error
  return fromDatabaseBanner(data)
}

export async function updateMarketingBanner(bannerId, changes) {
  const { data, error } = await supabase
    .from("marketing_banners")
    .update(toDatabaseBanner(changes))
    .eq("id", bannerId)
    .select("*")
    .single()

  if (error) throw error
  return fromDatabaseBanner(data)
}

export async function deleteMarketingBanner(bannerId) {
  const { error } = await supabase.from("marketing_banners").delete().eq("id", bannerId)
  if (error) throw error
}

export async function uploadMarketingBannerImage(imageDataUrl) {
  const imageBlob = await fetch(imageDataUrl).then((response) => response.blob())
  const extension = getImageExtension(imageBlob.type)
  const filePath = `${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage
    .from("banner-images")
    .upload(filePath, imageBlob, {
      cacheControl: "31536000",
      contentType: imageBlob.type || "image/jpeg",
      upsert: false,
    })

  if (error) throw error

  const { data } = supabase.storage.from("banner-images").getPublicUrl(filePath)
  return data.publicUrl
}

function toDatabaseBanner(banner) {
  return {
    cta_text: banner.ctaText?.trim() || "",
    cta_url: banner.ctaUrl?.trim() || "",
    ends_at: banner.endsAt || null,
    image_url: banner.imageUrl?.trim() || "",
    is_active: banner.isActive ?? true,
    starts_at: banner.startsAt || new Date().toISOString(),
    subtitle: banner.subtitle?.trim() || "",
    title: banner.title.trim(),
  }
}

function fromDatabaseBanner(banner) {
  return {
    createdAt: banner.created_at,
    ctaText: banner.cta_text ?? "",
    ctaUrl: banner.cta_url ?? "",
    endsAt: banner.ends_at ?? "",
    id: banner.id,
    imageUrl: banner.image_url ?? "",
    isActive: banner.is_active,
    startsAt: banner.starts_at,
    subtitle: banner.subtitle ?? "",
    title: banner.title,
  }
}

function getImageExtension(contentType) {
  if (contentType === "image/png") return "png"
  if (contentType === "image/webp") return "webp"
  return "jpg"
}

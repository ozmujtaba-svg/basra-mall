import { supabase } from "./supabase"

export async function fetchPlatformSettings() {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("commission_rate, delivery_fee, delivery_fees")
    .eq("id", true)
    .single()

  if (error) throw error
  return fromDatabaseSettings(data)
}

export async function savePlatformSettings(settings) {
  const { data, error } = await supabase
    .from("platform_settings")
    .update({
      commission_rate: settings.commissionRate,
      delivery_fee: settings.deliveryFee,
      delivery_fees: settings.deliveryFees,
    })
    .eq("id", true)
    .select("commission_rate, delivery_fee, delivery_fees")
    .single()

  if (error) throw error
  return fromDatabaseSettings(data)
}

function fromDatabaseSettings(settings) {
  return {
    commissionRate: Number(settings.commission_rate),
    deliveryFee: Number(settings.delivery_fee),
    deliveryFees: settings.delivery_fees,
  }
}

import { supabase } from "./supabase"

export async function ensurePublicProfile({ accountType, fullName, phone, userId }) {
  const { data: existingProfile, error: readError } = await supabase
    .from("profiles")
    .select("id, role, driver_status")
    .eq("id", userId)
    .maybeSingle()

  if (readError) throw readError

  if (existingProfile) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone })
      .eq("id", userId)
      .select("id, role, driver_status")
      .single()

    if (error) throw error
    return data
  }

  const role = getDatabaseRole(accountType)
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      full_name: fullName,
      phone,
      role,
      driver_status: role === "driver" ? "pending" : "approved",
    })
    .select("id, role, driver_status")
    .single()

  if (error) throw error
  return data
}

export async function fetchDriverProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, driver_status, created_at")
    .eq("role", "driver")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data.map((profile) => ({
    createdAt: profile.created_at,
    id: profile.id,
    name: profile.full_name,
    phone: profile.phone,
    status: profile.driver_status,
  }))
}

export async function updateDriverApproval(driverId, status) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ driver_status: status })
    .eq("id", driverId)
    .eq("role", "driver")
    .select("id, full_name, phone, driver_status, created_at")
    .single()

  if (error) throw error
  return {
    createdAt: data.created_at,
    id: data.id,
    name: data.full_name,
    phone: data.phone,
    status: data.driver_status,
  }
}

function getDatabaseRole(accountType) {
  return { زبون: "customer", "صاحب متجر": "merchant", سائق: "driver" }[accountType] ?? "customer"
}

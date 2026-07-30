import { supabase } from "./supabase"

export async function fetchSupportTickets() {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data.map(fromDatabaseTicket)
}

export async function createSupportTicket(ticket) {
  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      account_type: accountTypeToDatabase[ticket.accountType] ?? "customer",
      category: ticket.category,
      customer_name: ticket.name,
      customer_phone: ticket.phone,
      message: ticket.message,
      order_id: ticket.orderId || null,
      subject: ticket.subject,
      user_id: ticket.userId,
    })
    .select("*")
    .single()

  if (error) throw error
  return fromDatabaseTicket(data)
}

export async function updateSupportTicket(ticketId, changes) {
  const databaseChanges = {}

  if (changes.status) databaseChanges.status = statusToDatabase[changes.status]
  if (changes.adminReply !== undefined) databaseChanges.admin_reply = changes.adminReply

  const { data, error } = await supabase
    .from("support_tickets")
    .update(databaseChanges)
    .eq("id", ticketId)
    .select("*")
    .single()

  if (error) throw error
  return fromDatabaseTicket(data)
}

const accountTypeToDatabase = {
  زبون: "customer",
  "صاحب متجر": "merchant",
  سائق: "driver",
  الإدارة: "admin",
}

const accountTypeFromDatabase = Object.fromEntries(
  Object.entries(accountTypeToDatabase).map(([label, value]) => [value, label]),
)

const statusToDatabase = {
  جديدة: "open",
  "قيد المتابعة": "in_progress",
  محلولة: "resolved",
  مغلقة: "closed",
}

const statusFromDatabase = Object.fromEntries(
  Object.entries(statusToDatabase).map(([label, value]) => [value, label]),
)

function fromDatabaseTicket(ticket) {
  return {
    accountType: accountTypeFromDatabase[ticket.account_type] ?? "زبون",
    adminReply: ticket.admin_reply ?? "",
    category: ticket.category,
    createdAt: ticket.created_at,
    id: ticket.id,
    message: ticket.message,
    name: ticket.customer_name,
    orderId: ticket.order_id,
    phone: ticket.customer_phone,
    status: statusFromDatabase[ticket.status] ?? "جديدة",
    subject: ticket.subject,
    updatedAt: ticket.updated_at,
    userId: ticket.user_id,
  }
}

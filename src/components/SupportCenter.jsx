import { useMemo, useState } from "react"

const categories = ["مشكلة بطلب", "مشكلة بالدفع", "مشكلة بالتوصيل", "مشكلة بمتجر", "اقتراح", "أخرى"]
const statuses = ["جديدة", "قيد المتابعة", "محلولة", "مغلقة"]

export function SupportCenter({
  accountType,
  orders = [],
  tickets = [],
  onCreateTicket,
  onUpdateTicket,
  user,
}) {
  const isAdmin = accountType === "الإدارة"
  const [category, setCategory] = useState(categories[0])
  const [orderId, setOrderId] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [feedback, setFeedback] = useState("")
  const [sending, setSending] = useState(false)
  const [statusFilter, setStatusFilter] = useState("الكل")
  const [replyDrafts, setReplyDrafts] = useState({})
  const [updatingId, setUpdatingId] = useState("")
  const visibleTickets = useMemo(
    () =>
      statusFilter === "الكل"
        ? tickets
        : tickets.filter((ticket) => ticket.status === statusFilter),
    [statusFilter, tickets],
  )

  async function submitTicket(event) {
    event.preventDefault()

    if (!subject.trim() || message.trim().length < 10) {
      setFeedback("اكتب عنوان واضح وتفاصيل من 10 أحرف أو أكثر.")
      return
    }

    setSending(true)
    const result = await onCreateTicket({
      category,
      message: message.trim(),
      orderId: orderId ? Number(orderId) : null,
      subject: subject.trim(),
    })
    setSending(false)
    setFeedback(result.message)

    if (result.success) {
      setSubject("")
      setMessage("")
      setOrderId("")
    }
  }

  async function saveTicket(ticket, status) {
    setUpdatingId(ticket.id)
    const result = await onUpdateTicket(ticket.id, {
      adminReply: replyDrafts[ticket.id] ?? ticket.adminReply,
      status,
    })
    setUpdatingId("")
    setFeedback(result.message)
  }

  return (
    <section className="support-center" id="account-support">
      <div className="support-heading">
        <div>
          <span>مركز الدعم</span>
          <h2>{isAdmin ? "الشكاوى وطلبات المساعدة" : "تحتاج مساعدة؟"}</h2>
          <p>
            {isAdmin
              ? "تابع رسائل المستخدمين، جاوبهم، وحدّث حالة كل تذكرة."
              : "أرسل مشكلتك للإدارة وتابع الرد من نفس المكان."}
          </p>
        </div>
        <b>{tickets.filter((ticket) => !["محلولة", "مغلقة"].includes(ticket.status)).length} مفتوحة</b>
      </div>

      {!isAdmin && (
        <form className="support-form" onSubmit={submitTicket}>
          <div className="support-form-grid">
            <label>
              نوع المشكلة
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              رقم الطلب (اختياري)
              <select value={orderId} onChange={(event) => setOrderId(event.target.value)}>
                <option value="">بدون طلب محدد</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>طلب رقم {order.id}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            عنوان المشكلة
            <input
              maxLength={100}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="مثال: تأخر وصول الطلب"
              value={subject}
            />
          </label>
          <label>
            التفاصيل
            <textarea
              maxLength={1000}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="اشرح المشكلة بشكل واضح حتى نساعدك بسرعة"
              rows="4"
              value={message}
            />
          </label>
          <div className="support-submit-row">
            <small>المرسل: {user.name} — {user.phone}</small>
            <button disabled={sending} type="submit">
              {sending ? "جاري الإرسال..." : "إرسال للإدارة"}
            </button>
          </div>
        </form>
      )}

      <div className="support-toolbar">
        <strong>{isAdmin ? "كل التذاكر" : "تذاكري السابقة"}</strong>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option>الكل</option>
          {statuses.map((status) => <option key={status}>{status}</option>)}
        </select>
      </div>

      {feedback && <div className="support-feedback">{feedback}</div>}

      <div className="support-ticket-list">
        {visibleTickets.length === 0 ? (
          <div className="support-empty">ماكو تذاكر مطابقة حاليًا.</div>
        ) : visibleTickets.map((ticket) => (
          <article className="support-ticket" key={ticket.id}>
            <div className="support-ticket-top">
              <div>
                <span>تذكرة #{ticket.id}</span>
                <h3>{ticket.subject}</h3>
              </div>
              <b className={`support-status ${getStatusClass(ticket.status)}`}>{ticket.status}</b>
            </div>
            <div className="support-ticket-meta">
              <span>{ticket.category}</span>
              <span>{ticket.accountType}</span>
              {ticket.orderId && <span>طلب #{ticket.orderId}</span>}
              <span>{formatDate(ticket.createdAt)}</span>
            </div>
            {isAdmin && (
              <div className="support-customer">
                <strong>{ticket.name}</strong>
                <a href={`tel:${ticket.phone}`}>{ticket.phone}</a>
              </div>
            )}
            <p>{ticket.message}</p>

            {isAdmin ? (
              <div className="support-admin-reply">
                <textarea
                  onChange={(event) =>
                    setReplyDrafts((drafts) => ({ ...drafts, [ticket.id]: event.target.value }))
                  }
                  placeholder="اكتب رد الإدارة هنا..."
                  rows="3"
                  value={replyDrafts[ticket.id] ?? ticket.adminReply}
                />
                <div>
                  {statuses.slice(1).map((status) => (
                    <button
                      disabled={updatingId === ticket.id}
                      key={status}
                      onClick={() => saveTicket(ticket, status)}
                      type="button"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ) : ticket.adminReply ? (
              <div className="support-reply">
                <strong>رد الإدارة</strong>
                <p>{ticket.adminReply}</p>
              </div>
            ) : (
              <small className="support-waiting">بانتظار رد الإدارة</small>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}

function getStatusClass(status) {
  return {
    جديدة: "open",
    "قيد المتابعة": "progress",
    محلولة: "resolved",
    مغلقة: "closed",
  }[status] ?? "open"
}

function formatDate(value) {
  if (!value) return ""
  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

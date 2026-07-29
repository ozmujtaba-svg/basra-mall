export function DriverApprovalScreen({ name, onBack, status }) {
  const isRejected = status === "rejected"

  return (
    <section className={`driver-approval-screen ${isRejected ? "rejected" : "pending"}`}>
      <div className="driver-approval-card">
        <span>حساب السائق</span>
        <h1>{isRejected ? "طلب التسجيل مرفوض حاليًا" : "طلبك بانتظار موافقة الإدارة"}</h1>
        <p>
          {isRejected
            ? `${name}، تواصل ويا إدارة Basra Mall حتى تراجع بياناتك وتعيد تفعيل الحساب.`
            : `${name}، تم استلام تسجيلك. ما راح تظهر مهام التوصيل إلا بعد اعتماد حسابك من الإدارة.`}
        </p>
        <div className="driver-approval-status">
          <strong>{isRejected ? "مرفوض" : "قيد المراجعة"}</strong>
          <small>
            {isRejected
              ? "الحساب لا يقدر يستلم الطلبات."
              : "تبقى هذه الصفحة تتحدث تلقائيًا عند صدور القرار."}
          </small>
        </div>
        <button onClick={onBack} type="button">
          خروج
        </button>
      </div>
    </section>
  )
}

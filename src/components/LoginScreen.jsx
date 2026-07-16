import { accountDetails } from "../data"

export function LoginScreen({
  accountType,
  loginInfo,
  loginMessage,
  onAccountChange,
  onEnter,
  onLoginInfoChange,
}) {
  return (
    <section className="card">
      <div className="intro">
        <small>مول إلكتروني للبصرة</small>
        <h1>اختيار نوع الحساب</h1>
        <p>
          أول نسخة من التطبيق تبدأ من هنا: الزبون، صاحب المتجر، أو السائق. كل شخص يدخل
          للواجهة المناسبة له داخل مول البصرة.
        </p>
      </div>

      <div className="login">
        <h2>تسجيل الدخول</h2>
        <p>اختر نوع الحساب حتى نجهز الصفحة المناسبة.</p>

        <div className="options">
          {["زبون", "صاحب متجر", "سائق", "الإدارة"].map((type) => (
            <button
              key={type}
              className={accountType === type ? "active" : ""}
              onClick={() => onAccountChange(type)}
            >
              <strong>{type}</strong>
              <span>{accountDetails[type]}</span>
            </button>
          ))}
        </div>

        <div className="result">
          <strong>الواجهة المختارة: {accountType}</strong>
          <br />
          {accountDetails[accountType]}
        </div>

        <div className="login-form">
          <label>
            الاسم
            <input
              value={loginInfo.name}
              onChange={(event) => updateLoginInfo("name", event.target.value)}
              placeholder="مثال: علي أحمد"
            />
          </label>
          <label>
            رقم الهاتف
            <input
              value={loginInfo.phone}
              onChange={(event) => updateLoginInfo("phone", event.target.value)}
              placeholder="مثال: 07XXXXXXXXX"
            />
          </label>
        </div>

        <button className="enter-button" onClick={onEnter}>
          دخول
        </button>
        {loginMessage && <div className="order-message">{loginMessage}</div>}
      </div>
    </section>
  )

  function updateLoginInfo(field, value) {
    onLoginInfoChange((currentInfo) => ({
      ...currentInfo,
      [field]: value,
    }))
  }
}

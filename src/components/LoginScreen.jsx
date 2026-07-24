import { accountDetails } from "../data"

const publicAccountTypes = ["زبون", "صاحب متجر", "سائق"]
const accountPermissions = {
  زبون: [
    "تصفح المتاجر المقبولة فقط",
    "إضافة منتجات للسلة وإرسال الطلب",
    "متابعة طلباته وحفظ عنوانه",
  ],
  "صاحب متجر": [
    "تسجيل متجره ومتابعة حالة الموافقة",
    "إدارة منتجات متاجره فقط",
    "متابعة طلبات متاجره فقط",
  ],
  سائق: [
    "مشاهدة طلبات التوصيل الجاهزة",
    "استلام الطلب وتحديث حالة التسليم",
    "تسجيل ملاحظات مهمة التوصيل",
  ],
  الإدارة: [
    "مراجعة قبول ورفض المتاجر",
    "متابعة كل الطلبات والأرباح",
    "إدارة النسخ الاحتياطية والإعدادات",
  ],
}

export function LoginScreen({
  accountType,
  authEmail,
  authPassword,
  authLoading,
  authSession,
  isPasswordRecovery,
  isOnlineAuthEnabled,
  loginInfo,
  loginMessage,
  onAccountChange,
  onAuthEmailChange,
  onAuthPasswordChange,
  onEmailLogin,
  onPasswordLogin,
  onPasswordReset,
  onPasswordSignUp,
  onRecoveredPasswordSave,
  onPhoneLogin,
  onEnter,
  onForgetAccount,
  onLoginInfoChange,
  savedAccountWarning,
}) {
  const hasSavedAccount = Boolean(loginInfo.name.trim() && loginInfo.phone.trim())

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
        <p>اختر نوع حسابك حتى نفتح الواجهة المناسبة لك فقط، بدون خلط بين الصلاحيات.</p>

        {hasSavedAccount && (
          <div className="saved-account-card">
            <div>
              <span>آخر حساب محفوظ</span>
              <strong>{loginInfo.name}</strong>
              <small>
                {accountType} / {loginInfo.phone}
              </small>
            </div>
            <div className="saved-account-actions">
              <button onClick={onEnter} type="button">
                كمل بهذا الحساب
              </button>
              <button onClick={onForgetAccount} type="button">
                بدّل حساب
              </button>
            </div>
          </div>
        )}

        <div className="options">
          {publicAccountTypes.map((type) => (
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

        <div className="admin-login-shortcut">
          <div>
            <strong>دخول الإدارة</strong>
            <span>هذا الخيار يبقى لصاحب المشروع أو فريق الإدارة فقط.</span>
          </div>
          <button
            className={accountType === "الإدارة" ? "active" : ""}
            onClick={() => onAccountChange("الإدارة")}
          >
            إدارة
          </button>
        </div>

        <div className="result">
          <strong>الواجهة المختارة: {accountType}</strong>
          <br />
          {accountDetails[accountType]}
        </div>

        {savedAccountWarning && (
          <div className="account-warning-card">
            <strong>انتبه للحساب المحفوظ</strong>
            <span>{savedAccountWarning}</span>
            <button onClick={onForgetAccount} type="button">
              بدّل الحساب المحفوظ
            </button>
          </div>
        )}

        <div className="permission-card">
          <div>
            <span>الصلاحيات بعد الدخول</span>
            <strong>{accountType}</strong>
          </div>
          <ul>
            {accountPermissions[accountType].map((permission) => (
              <li key={permission}>{permission}</li>
            ))}
          </ul>
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
          {["صاحب متجر", "الإدارة"].includes(accountType) && (
            <>
              <label>
                الإيميل
                <input
                  autoComplete="email"
                  inputMode="email"
                  value={authEmail}
                  onChange={(event) => onAuthEmailChange(event.target.value)}
                  placeholder="name@example.com"
                  type="email"
                />
              </label>
              <label>
                كلمة المرور
                <input
                  autoComplete="current-password"
                  value={authPassword}
                  onChange={(event) => onAuthPasswordChange(event.target.value)}
                  placeholder="8 أحرف أو أكثر"
                  type="password"
                />
              </label>
            </>
          )}
        </div>

        {["زبون", "سائق"].includes(accountType) && (
          <div className="online-auth-card customer-phone-auth-card">
            <div>
              <strong>دخول {accountType} برقم الهاتف</strong>
              <span>
                ما تحتاج إيميل أو كلمة مرور. الاسم ورقم الهاتف يكفون
                {accountType === "زبون" ? " للطلب والمتابعة." : " لاستلام مهام التوصيل."}
              </span>
            </div>
            <button
              disabled={!isOnlineAuthEnabled || authLoading}
              onClick={onPhoneLogin}
              type="button"
            >
              {authLoading ? "جاري الدخول..." : `دخول ${accountType}`}
            </button>
          </div>
        )}

        {["صاحب متجر", "الإدارة"].includes(accountType) && (
          <div className="online-auth-card">
            <div>
              <strong>
                {accountType === "الإدارة" ? "دخول الإدارة الآمن" : "دخول حقيقي عبر الإيميل"}
              </strong>
              <span>
                {accountType === "الإدارة"
                  ? "حساب الإدارة يحتاج موافقة يدوية أول مرة، وبعدها يدخل بالإيميل وكلمة المرور."
                  : isOnlineAuthEnabled
                    ? "استخدم الإيميل وكلمة المرور، أو أرسل رابط دخول عند الحاجة."
                    : "اتصال Supabase غير مفعّل، استخدم الدخول التجريبي مؤقتًا."}
              </span>
            </div>
            {accountType === "صاحب متجر" && (
              <button disabled={!isOnlineAuthEnabled || authLoading} onClick={onEmailLogin} type="button">
                {authLoading ? "جاري الإرسال..." : authSession ? "الحساب مؤكد" : "إرسال رابط الدخول"}
              </button>
            )}
            <div className="password-auth-actions">
              {isPasswordRecovery ? (
                <button
                  disabled={!isOnlineAuthEnabled || authLoading}
                  onClick={onRecoveredPasswordSave}
                  type="button"
                >
                  حفظ كلمة المرور الجديدة
                </button>
              ) : (
                <>
                  <button disabled={!isOnlineAuthEnabled || authLoading} onClick={onPasswordLogin} type="button">
                    دخول بكلمة المرور
                  </button>
                  <button disabled={!isOnlineAuthEnabled || authLoading} onClick={onPasswordSignUp} type="button">
                    {accountType === "الإدارة" ? "إنشاء أول حساب إدارة" : "إنشاء حساب جديد"}
                  </button>
                  {accountType === "الإدارة" && (
                    <button disabled={!isOnlineAuthEnabled || authLoading} onClick={onPasswordReset} type="button">
                      نسيت كلمة المرور
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {accountType === "صاحب متجر" && (
          <button className="enter-button" onClick={onEnter}>
            دخول تجريبي
          </button>
        )}
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

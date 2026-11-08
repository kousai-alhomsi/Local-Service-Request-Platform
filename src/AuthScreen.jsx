import React, { useState } from 'react';
import { api } from './api.js';

const demoPassword = 'WaslaDemo2026!';

export default function AuthScreen({ onAuthenticated, initialMode = 'login', initialRole = 'student' }) {
  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState(initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const useDemo = (accountEmail) => {
    setMode('login'); setEmail(accountEmail); setPassword(demoPassword); setError('');
  };

  const submit = async (event) => {
    event.preventDefault(); setError(''); setBusy(true);
    const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
    const body = mode === 'login' ? { email, password } : { name, email, password, role };
    try {
      const result = await api(endpoint, { method: 'POST', body: JSON.stringify(body) });
      onAuthenticated(result.workspace);
    } catch (cause) {
      setError(cause.message || 'تعذر تسجيل الدخول. حاول مجددًا.');
    } finally {
      setBusy(false);
    }
  };

  return <main className="auth-shell" dir="rtl">
    <section className="auth-showcase" aria-label="عن وصلة">
      <a className="brand auth-brand" href="#login" aria-label="وصلة، الخدمات الجامعية"><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M12.2 19.8 9.6 22.4a5 5 0 0 1-7.1-7.1l5.7-5.7a5 5 0 0 1 7.1 0" /><path d="m19.8 12.2 2.6-2.6a5 5 0 0 1 7.1 7.1l-5.7 5.7a5 5 0 0 1-7.1 0" /><path d="m11.2 20.8 9.6-9.6" /></svg></span><span><strong>وِصلة</strong><small>الخدمات الجامعية</small></span></a>
      <div className="auth-showcase-copy"><span className="auth-kicker">من مجتمعك الجامعي</span><h1>خدمات أقرب،<br />وتعاون أسهل.</h1><p>اكتشف مهارات زملائك، أرسل طلبًا واضحًا، وتابع تقدّمه من مكان واحد.</p></div>
      <div className="auth-highlight"><span aria-hidden="true">✦</span><div><strong>طلب واضح · متابعة أسهل</strong><small>مساحة لخدمات جامعية موثوقة</small></div></div>
    </section>
    <section className="auth-panel">
      <div className="auth-card">
        <p className="eyebrow">أهلًا بك في وصلة</p>
        <h2>{mode === 'login' ? 'سجّل الدخول إلى حسابك' : 'أنشئ حسابك'}</h2>
        <p className="auth-intro">{mode === 'login' ? 'تابع خدماتك وطلباتك في مجتمع الجامعة.' : 'ابدأ بحساب طالب أو مقدّم خدمة.'}</p>
        <form className="auth-form" onSubmit={submit}>
          {mode === 'register' && <>
            <label className="auth-label" htmlFor="authName">الاسم الظاهر</label>
            <input id="authName" name="name" autoComplete="name" minLength={2} maxLength={40} required value={name} onChange={(event) => setName(event.target.value)} placeholder="اكتب اسمك" />
            <span className="auth-label">نوع الحساب</span>
            <div className="auth-role-choice" role="group" aria-label="نوع الحساب">
              <button type="button" aria-pressed={role === 'student'} onClick={() => setRole('student')}>طالب</button>
              <button type="button" aria-pressed={role === 'provider'} onClick={() => setRole('provider')}>مقدّم خدمة</button>
            </div>
          </>}
          <label className="auth-label" htmlFor="authEmail">البريد الإلكتروني</label>
          <input id="authEmail" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@university.edu" />
          <label className="auth-label" htmlFor="authPassword">كلمة المرور</label>
          <input id="authPassword" name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={10} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'login' ? 'أدخل كلمة المرور' : '10 أحرف على الأقل'} />
          {mode === 'register' && <small className="auth-hint">استخدم 10 أحرف على الأقل.</small>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? 'جارٍ التحقق…' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}</button>
        </form>
        <p className="auth-toggle">{mode === 'login' ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'أنشئ حسابًا' : 'سجّل الدخول'}</button></p>
        {mode === 'login' && <div className="demo-logins"><span>جرّب حسابًا تجريبيًا</span><div><button type="button" onClick={() => useDemo('student@wasla.local')}>الدخول كطالب</button><button type="button" onClick={() => useDemo('print@wasla.local')}>الدخول كمقدّم خدمة</button></div><small>كلمة المرور للحسابات التجريبية: <b>{demoPassword}</b></small></div>}
      </div>
      <p className="auth-footer">بمتابعة استخدامك، توافق على سياسة الاستخدام الخاصة بالمنصة.</p>
    </section>
  </main>;
}

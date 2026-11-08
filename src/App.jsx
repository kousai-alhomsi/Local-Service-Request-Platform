import React, { useEffect, useMemo, useRef, useState } from 'react';
import AuthScreen from './AuthScreen.jsx';
import { api, ApiError } from './api.js';

const iconPaths = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4.5h6a1.5 1.5 0 0 0-3-1.5 1.5 1.5 0 0 0-3 1.5ZM9 11h6M9 15h6" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
  printer: <><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M7 14h10v7H7zM17 11h.01" /></>,
  laptop: <><rect x="4" y="4" width="16" height="12" rx="1.5" /><path d="M2 20h20l-2-4H4zM9 8h6M9 11h4" /></>,
  wrench: <><path d="M14.5 6.5a5 5 0 0 0-6.4 6.4l-5.2 5.2a2 2 0 0 0 2.8 2.8l5.2-5.2a5 5 0 0 0 6.4-6.4l-3 3-3-3z" /><path d="m14 10 3-3" /></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22zM4 5.5V22M8 7h8M8 11h7" /></>,
  pen: <><path d="m4 20 4.5-1 10.8-10.8a2.1 2.1 0 0 0-3-3L5.5 16zM14.8 6.2l3 3M4 20h16" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  arrow: <><path d="M19 12H5M12 19l-7-7 7-7" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  sparkle: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3ZM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" /></>,
  location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  dots: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  filter: <><path d="M4 7h16M7 12h10M10 17h4" /></>,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
  empty: <><path d="M4 5h16v14H4zM8 9h8M8 13h5" /><path d="m16 17 2 2 4-4" /></>,
  shield: <><path d="m12 3 8 3v5c0 5-3.4 8-8 10-4.6-2-8-5-8-10V6z" /><path d="m9 12 2 2 4-4" /></>,
};

function Icon({ name, className = '' }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">{iconPaths[name] || iconPaths.sparkle}</svg>;
}

const categoryOptions = ['الكل', 'الطباعة', 'صيانة الأجهزة', 'دروس خصوصية', 'تصميم ومهارات'];
const roleViews = {
  student: [
    { id: 'home', label: 'لوحة التحكم', icon: 'home', mobile: 'الرئيسية' },
    { id: 'browse', label: 'تصفّح الخدمات', icon: 'grid', mobile: 'الخدمات' },
    { id: 'requests', label: 'طلباتي', icon: 'clipboard', mobile: 'طلباتي' },
    { id: 'profile', label: 'ملفي الشخصي', icon: 'user', mobile: 'ملفي' },
  ],
  provider: [
    { id: 'providerHome', label: 'لوحة التحكم', icon: 'home', mobile: 'الرئيسية' },
    { id: 'offers', label: 'عروضي', icon: 'briefcase', mobile: 'عروضي' },
    { id: 'providerRequests', label: 'طلبات الخدمة', icon: 'clipboard', mobile: 'الطلبات' },
    { id: 'profile', label: 'ملفي الشخصي', icon: 'user', mobile: 'ملفي' },
  ],
  admin: [
    { id: 'adminHome', label: 'إدارة المنصة', icon: 'shield', mobile: 'الإدارة' },
  ],
};

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('') || 'وص';
}

function dateToday() {
  return new Intl.DateTimeFormat('ar-AE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
}

function localISODate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateLabel(date) {
  return new Intl.DateTimeFormat('ar-AE', { day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`));
}

function getStatus(status) {
  return {
    pending: ['بانتظار القبول', 'pending'],
    accepted: ['تم قبول الطلب', 'accepted'],
    progress: ['قيد التنفيذ', 'progress'],
    completed: ['مكتمل', 'completed'],
    rejected: ['لم يتم القبول', 'rejected'],
  }[status] || ['قيد المراجعة', 'pending'];
}

function StatusBadge({ status }) {
  const [label, color] = getStatus(status);
  return <span className={`status ${color}`}>{label}</span>;
}

function Avatar({ initials: avatarInitials, className = '' }) {
  return <span className={`avatar ${className}`}>{avatarInitials}</span>;
}

function Brand() {
  return <a className="brand" href="#home" aria-label="وصلة، الصفحة الرئيسية"><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M12.2 19.8 9.6 22.4a5 5 0 0 1-7.1-7.1l5.7-5.7a5 5 0 0 1 7.1 0" /><path d="m19.8 12.2 2.6-2.6a5 5 0 0 1 7.1 7.1l-5.7 5.7a5 5 0 0 1-7.1 0" /><path d="m11.2 20.8 9.6-9.6" /></svg></span><span><strong>وِصلة</strong><small>الخدمات الجامعية</small></span></a>;
}

function Eyebrow({ icon, children }) {
  return <p className="eyebrow"><Icon name={icon} />{children}</p>;
}

function ServiceCard({ offer, onDetails }) {
  return <article className="service-card"><div className={`service-art ${offer.tone}`}><span className="art-category">{offer.category}</span><span className="service-art-icon"><Icon name={offer.icon} /></span></div><div className="service-body"><h3 className="service-title">{offer.title}</h3><div className="provider-line"><Avatar initials={offer.initials || initials(offer.provider)} /><span className="provider-meta"><strong>{offer.provider}</strong><small>مقدّم خدمة من مجتمع الجامعة</small></span><span className="availability">{offer.availability || 'يستقبل طلبات'}</span></div><div className="service-meta-row"><span className="service-time"><Icon name="clock" />{offer.duration}</span><button className="detail-button" type="button" onClick={() => onDetails(offer)}>عرض التفاصيل</button></div></div></article>;
}

function ServiceFilters({ category, setCategory }) {
  return <div className="filters" role="group" aria-label="تصفية حسب نوع الخدمة">{categoryOptions.map((label) => <button key={label} className="filter-chip" type="button" aria-pressed={category === label} onClick={() => setCategory(label)}>{label === 'الكل' ? 'جميع الخدمات' : label}</button>)}</div>;
}

function SearchBar({ query, setQuery, onSubmit, compact = false }) {
  return <form className="hero-search" id="searchForm" onSubmit={onSubmit} style={compact ? { maxWidth: 'none', border: '1px solid var(--line)', boxShadow: 'none' } : undefined}><Icon name="search" /><label className="sr-only" htmlFor="heroSearch">ابحث عن خدمة أو مهارة</label><input id="heroSearch" type="search" placeholder={compact ? 'ابحث باسم الخدمة أو التصنيف أو المهارة' : 'ابحث عن طباعة، صيانة، دروس...'} value={query} onChange={(event) => setQuery(event.target.value)} /><button type="submit">{compact ? 'بحث' : 'ابحث الآن'}</button></form>;
}

function MiniRequest({ request, providerMode = false }) {
  const person = providerMode ? request.student : request.provider;
  return <div className="request-mini"><span className="request-symbol"><Icon name={request.icon || 'clipboard'} /></span><span className="request-mini-copy"><strong>{request.title}</strong><small>{providerMode ? 'الطالب' : 'مقدّم الخدمة'}: {person} · {request.date}</small></span><StatusBadge status={request.status} /></div>;
}

function RequestCard({ request, providerMode, onStatus, onDetails }) {
  const person = providerMode ? request.student : request.provider;
  let actions = <button className="secondary-button" type="button" onClick={() => onDetails(request)}>عرض التفاصيل</button>;
  if (providerMode && request.status === 'pending') actions = <><button className="primary-button" type="button" onClick={() => onStatus(request.id, 'accepted')}><Icon name="check" />قبول الطلب</button><button className="danger-button" type="button" onClick={() => onStatus(request.id, 'rejected')}><Icon name="close" />اعتذار</button></>;
  if (providerMode && request.status === 'accepted') actions = <button className="primary-button" type="button" onClick={() => onStatus(request.id, 'progress')}><Icon name="check" />بدء التنفيذ</button>;
  if (providerMode && request.status === 'progress') actions = <button className="primary-button" type="button" onClick={() => onStatus(request.id, 'completed')}><Icon name="checkCircle" />وضع كمكتمل</button>;
  return <article className="request-card"><div className="request-main"><span className="request-symbol"><Icon name={request.icon || 'clipboard'} /></span><div className="request-detail"><h3>{request.title}</h3><p className="request-description">{request.note || 'لا توجد ملاحظات إضافية.'}</p><div className="request-facts"><span><Icon name="user" />{providerMode ? 'الطالب' : 'مقدّم الخدمة'}: {person}</span><span><Icon name="calendar" />{request.date}</span><span>{request.id}</span><StatusBadge status={request.status} /></div></div></div><div className="request-actions">{actions}</div></article>;
}

function FormSummary({ errors }) {
  const entries = Object.entries(errors);
  if (!entries.length) return null;
  return <div className="form-error-summary" role="alert" tabIndex={-1} aria-labelledby="errorSummaryTitle"><h3 id="errorSummaryTitle">يرجى مراجعة الحقول التالية</h3><ul>{entries.map(([id, error]) => <li key={id}><a href={`#${id}`} onClick={(event) => { event.preventDefault(); document.getElementById(id)?.focus(); }}>{error.label}</a></li>)}</ul></div>;
}

function validateText(value, minLength, label) {
  const trimmed = value.trim();
  if (!trimmed) return `يرجى إدخال ${label}.`;
  if (trimmed.length < minLength) return `أدخل ${minLength} أحرف على الأقل.`;
  return '';
}

function RequestForm({ offer, onSubmit, onClose, focusSummary }) {
  const [errors, setErrors] = useState({});
  const validate = (value) => validateText(value, 8, 'تفاصيل الطلب');
  const handleSubmit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const error = validate(String(form.get('note') || ''));
    if (error) { const next = { requestNote: { label: 'تفاصيل الطلب', message: error } }; setErrors(next); focusSummary(); return; }
    onSubmit({ note: String(form.get('note')).trim(), date: String(form.get('date') || '') });
  };
  const blurNote = (event) => {
    const error = validate(event.target.value);
    setErrors(error ? { requestNote: { label: 'تفاصيل الطلب', message: error } } : {});
  };
  return <form className="dialog-content" id="requestForm" noValidate onSubmit={handleSubmit}><div className="dialog-heading"><div><Eyebrow icon="clipboard">طلب خدمة</Eyebrow><h2 id="dialogTitle">أرسل طلبك</h2><p>أخبر مقدّم الخدمة بما تحتاجه حتى يراجع طلبك.</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="إغلاق"><Icon name="close" /></button></div><div className="dialog-offer-summary"><span className="service-art-icon"><Icon name={offer.icon} /></span><span><strong>{offer.title}</strong><small>مقدّم الخدمة: {offer.provider}</small></span></div><FormSummary errors={errors} /><div className="form-grid"><div className="form-field full"><label htmlFor="requestNote">تفاصيل الطلب <span className="required-mark">*</span></label><textarea id="requestNote" name="note" required minLength={8} aria-invalid={Boolean(errors.requestNote)} aria-describedby="requestNoteHint requestNoteError" placeholder="اكتب ما تحتاجه، وأي تفاصيل تساعد على فهم الطلب" onBlur={blurNote} onChange={(event) => { if (event.target.value.trim().length >= 8) setErrors({}); }} /><span className="field-hint" id="requestNoteHint">اكتب ٨ أحرف على الأقل. لا تضف معلومات حساسة.</span><span className="field-error" id="requestNoteError">{errors.requestNote?.message || ''}</span></div><div className="form-field"><label htmlFor="requestDate">موعد الإنجاز المناسب</label><input id="requestDate" name="date" type="date" min={localISODate()} /><span className="field-hint">يمكنك تركه فارغًا إن لم يكن لديك موعد محدد.</span></div></div><div className="dialog-note"><Icon name="info" />لا يوجد دفع إلكتروني داخل المنصة. ستتم متابعة حالة طلب الخدمة هنا.</div><div className="dialog-actions"><button className="primary-button" type="submit"><Icon name="arrow" />إرسال الطلب</button><button className="secondary-button" type="button" onClick={onClose}>إلغاء</button></div></form>;
}

function OfferForm({ offer, profileName, onSubmit, onClose, focusSummary }) {
  const [errors, setErrors] = useState({});
  const isEdit = Boolean(offer);
  const validate = (form) => {
    const next = {};
    const titleError = validateText(String(form.get('title') || ''), 5, 'اسم الخدمة');
    const durationError = validateText(String(form.get('duration') || ''), 3, 'المدة المتوقعة');
    const descriptionError = validateText(String(form.get('description') || ''), 15, 'وصف الخدمة');
    if (titleError) next.offerTitle = { label: 'اسم الخدمة', message: titleError };
    if (durationError) next.offerDuration = { label: 'المدة المتوقعة', message: durationError };
    if (descriptionError) next.offerDescription = { label: 'وصف الخدمة', message: descriptionError };
    return next;
  };
  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextErrors = validate(formData);
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); focusSummary(); return; }
    onSubmit({ ...(offer || {}), title: String(formData.get('title')).trim(), category: String(formData.get('category')), duration: String(formData.get('duration')).trim(), description: String(formData.get('description')).trim(), mode: String(formData.get('mode')), availability: String(formData.get('availability')), provider: profileName, initials: initials(profileName) });
  };
  const blurField = (event, id, label, minLength) => {
    const message = validateText(event.target.value, minLength, label);
    setErrors((current) => {
      const next = { ...current };
      if (message) next[id] = { label, message };
      else delete next[id];
      return next;
    });
  };
  const clearError = (id) => setErrors((current) => { const next = { ...current }; delete next[id]; return next; });
  return <form className="dialog-content" id="offerForm" noValidate onSubmit={handleSubmit}><div className="dialog-heading"><div><Eyebrow icon="briefcase">ملف خدماتك</Eyebrow><h2 id="dialogTitle">{isEdit ? 'تعديل تفاصيل الخدمة' : 'إضافة خدمة جديدة'}</h2><p>اكتب وصفًا يساعد الطلاب على فهم ما تقدّمه.</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="إغلاق"><Icon name="close" /></button></div><FormSummary errors={errors} /><div className="form-grid" style={{ paddingTop: 16 }}><div className="form-field full"><label htmlFor="offerTitle">اسم الخدمة <span className="required-mark">*</span></label><input id="offerTitle" name="title" required minLength={5} maxLength={80} defaultValue={offer?.title || ''} aria-invalid={Boolean(errors.offerTitle)} aria-describedby="offerTitleError" onBlur={(event) => blurField(event, 'offerTitle', 'اسم الخدمة', 5)} onChange={(event) => { if (event.target.value.trim().length >= 5) clearError('offerTitle'); }} placeholder="مثال: تنسيق وطباعة التقارير" /><span className="field-error" id="offerTitleError">{errors.offerTitle?.message || ''}</span></div><div className="form-field"><label htmlFor="offerCategory">التصنيف <span className="required-mark">*</span></label><select id="offerCategory" name="category" defaultValue={offer?.category || 'الطباعة'} required><option>الطباعة</option><option>صيانة الأجهزة</option><option>دروس خصوصية</option><option>تصميم ومهارات</option></select></div><div className="form-field"><label htmlFor="offerDuration">المدة المتوقعة <span className="required-mark">*</span></label><input id="offerDuration" name="duration" required minLength={3} maxLength={50} defaultValue={offer?.duration || ''} aria-invalid={Boolean(errors.offerDuration)} aria-describedby="offerDurationError" onBlur={(event) => blurField(event, 'offerDuration', 'المدة المتوقعة', 3)} onChange={(event) => { if (event.target.value.trim().length >= 3) clearError('offerDuration'); }} placeholder="مثال: خلال يومين" /><span className="field-error" id="offerDurationError">{errors.offerDuration?.message || ''}</span></div><div className="form-field full"><label htmlFor="offerDescription">وصف الخدمة <span className="required-mark">*</span></label><textarea id="offerDescription" name="description" required minLength={15} maxLength={420} defaultValue={offer?.description || ''} aria-invalid={Boolean(errors.offerDescription)} aria-describedby="offerDescriptionError" onBlur={(event) => blurField(event, 'offerDescription', 'وصف الخدمة', 15)} onChange={(event) => { if (event.target.value.trim().length >= 15) clearError('offerDescription'); }} placeholder="ما الذي يحتاج الطالب إلى معرفته قبل إرسال طلبه؟" /><span className="field-error" id="offerDescriptionError">{errors.offerDescription?.message || ''}</span></div><div className="form-field"><label htmlFor="offerMode">طريقة تقديم الخدمة</label><select id="offerMode" name="mode" defaultValue={offer?.mode || 'في الحرم'}><option>في الحرم</option><option>عن بُعد</option><option>عن بُعد أو في الحرم</option></select></div><div className="form-field"><label htmlFor="offerAvailability">التوفر</label><select id="offerAvailability" name="availability" defaultValue={offer?.availability || 'يستقبل طلبات'}><option>يستقبل طلبات</option><option>متاحة هذا الأسبوع</option></select></div></div><div className="dialog-note"><Icon name="info" />لا تُضف أسعارًا أو وعودًا لا تستطيع الالتزام بها. يمكنك تعديل العرض لاحقًا.</div><div className="dialog-actions"><button className="primary-button" type="submit"><Icon name="check" />{isEdit ? 'حفظ التعديلات' : 'نشر الخدمة'}</button><button className="secondary-button" type="button" onClick={onClose}>إلغاء</button></div></form>;
}

function ProfileForm({ profile, onSubmit, onClose, focusSummary }) {
  const [errors, setErrors] = useState({});
  const handleSubmit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const error = validateText(String(form.get('name') || ''), 2, 'الاسم الظاهر');
    if (error) { setErrors({ profileName: { label: 'الاسم الظاهر', message: error } }); focusSummary(); return; }
    onSubmit({ name: String(form.get('name')).trim(), skills: String(form.get('skills') || '').split(/[،,]/).map((skill) => skill.trim()).filter(Boolean).slice(0, 12), about: String(form.get('about') || '').trim() || 'أعرّف طلاب الجامعة بمهاراتي وخدماتي.' });
  };
  return <form className="dialog-content" id="profileForm" noValidate onSubmit={handleSubmit}><div className="dialog-heading"><div><Eyebrow icon="user">معلوماتك</Eyebrow><h2 id="dialogTitle">تعديل الملف الشخصي</h2><p>أبقِ نبذتك ومهاراتك محدثة.</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="إغلاق"><Icon name="close" /></button></div><FormSummary errors={errors} /><div className="form-grid" style={{ paddingTop: 16 }}><div className="form-field"><label htmlFor="profileName">الاسم الظاهر <span className="required-mark">*</span></label><input id="profileName" name="name" required minLength={2} maxLength={40} defaultValue={profile.name} aria-invalid={Boolean(errors.profileName)} aria-describedby="profileNameError" autoComplete="name" onBlur={(event) => { const message = validateText(event.target.value, 2, 'الاسم الظاهر'); setErrors(message ? { profileName: { label: 'الاسم الظاهر', message } } : {}); }} onChange={(event) => { if (event.target.value.trim().length >= 2) setErrors({}); }} /><span className="field-error" id="profileNameError">{errors.profileName?.message || ''}</span></div><div className="form-field"><label htmlFor="profileSkills">المهارات</label><input id="profileSkills" name="skills" maxLength={160} defaultValue={(profile.skills || []).join('، ')} placeholder="افصل بين المهارات بفاصلة" /></div><div className="form-field full"><label htmlFor="profileAbout">نبذة مختصرة</label><textarea id="profileAbout" name="about" maxLength={360} defaultValue={profile.about} /><span className="field-hint">شارك ما يساعد الطلاب على فهم خبرتك.</span></div></div><div className="dialog-actions"><button className="primary-button" type="submit"><Icon name="check" />حفظ الملف</button><button className="secondary-button" type="button" onClick={onClose}>إلغاء</button></div></form>;
}

function OfferCard({ offer, onEdit }) {
  return <article className="offer-card"><div className={`service-art ${offer.tone}`}><span className="art-category">{offer.category}</span><span className="service-art-icon"><Icon name={offer.icon} /></span></div><div className="offer-card-body"><h3>{offer.title}</h3><p>{offer.description}</p><div className="offer-card-footer"><span><Icon name="clock" />{offer.duration}</span><button type="button" onClick={() => onEdit(offer)}>تعديل العرض</button></div></div></article>;
}

function App() {
  const [data, setData] = useState(null);
  const [sessionState, setSessionState] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [authIntent, setAuthIntent] = useState({ mode: 'login', role: 'student' });

  const loadWorkspace = async () => {
    setSessionState('loading'); setLoadError('');
    try {
      const workspace = await api('/bootstrap');
      setData(workspace); setSessionState('authenticated');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setSessionState('anonymous');
      else { setLoadError(error.message); setSessionState('error'); }
    }
  };

  useEffect(() => { loadWorkspace(); }, []);

  const signOut = async (intent = { mode: 'login', role: 'student' }) => {
    try { await api('/auth/logout', { method: 'POST' }); }
    finally { setData(null); setAuthIntent(intent); setSessionState('anonymous'); }
  };

  if (sessionState === 'loading') return <main className="auth-loading" dir="rtl"><p>جارٍ تحميل مساحة وصلة…</p></main>;
  if (sessionState === 'error') return <main className="auth-loading" dir="rtl"><div><p>{loadError}</p><button className="primary-button" onClick={loadWorkspace}>إعادة المحاولة</button></div></main>;
  if (!data) return <AuthScreen initialMode={authIntent.mode} initialRole={authIntent.role} onAuthenticated={(workspace) => { setData(workspace); setSessionState('authenticated'); }} />;
  return <Dashboard key={data.profile.id} initialData={data} onSignOut={signOut} />;
}

function Dashboard({ initialData, onSignOut }) {
  const [data, setData] = useState(initialData);
  const [view, setView] = useState(initialData.role === 'provider' ? 'providerHome' : initialData.role === 'admin' ? 'adminHome' : 'home');
  const [category, setCategory] = useState('الكل');
  const [query, setQuery] = useState('');
  const [requestFilter, setRequestFilter] = useState('الكل');
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState('');
  const [adminSummary, setAdminSummary] = useState(null);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const role = data.role;
  useEffect(() => {
    if (role !== 'admin') return;
    api('/admin/summary').then(setAdminSummary).catch((error) => setToast(error.message));
  }, [role]);
  const studentRequests = useMemo(() => role === 'student' ? data.requests : [], [data.requests, role]);
  const providerRequests = useMemo(() => role === 'provider' ? data.requests : [], [data.requests, role]);
  const filteredOffers = useMemo(() => data.offers.filter((offer) => {
    const notOwnOffer = role === 'provider' || offer.providerId !== data.profile.id;
    const categoryMatch = category === 'الكل' || offer.category === category;
    const search = query.trim().toLocaleLowerCase('ar');
    const textMatch = !search || `${offer.title} ${offer.category} ${offer.provider} ${offer.description}`.toLocaleLowerCase('ar').includes(search);
    return notOwnOffer && categoryMatch && textMatch;
  }), [data.offers, data.profile.id, category, query, role]);

  useEffect(() => {
    const element = dialogRef.current;
    if (dialog && element && !element.open) {
      previousFocusRef.current = document.activeElement;
      element.showModal();
    } else if (!dialog && element?.open) element.close();
    if (dialog) requestAnimationFrame(() => {
      const target = element?.querySelector('#requestNote, #offerTitle, #profileName, [data-autofocus]');
      target?.focus();
    });
  }, [dialog]);

  useEffect(() => {
    const element = dialogRef.current;
    const restoreFocus = () => { if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus(); };
    element?.addEventListener('close', restoreFocus);
    return () => element?.removeEventListener('close', restoreFocus);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const goView = (nextView) => {
    setView(nextView);
    setQuery(''); setCategory('الكل'); setRequestFilter('الكل');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeDialog = () => setDialog(null);
  const openOfferDetail = (offer) => setDialog({ type: 'offerDetail', offer });
  const openRequestForm = (offer) => setDialog({ type: 'requestForm', offer });
  const openRequestDetail = (request) => setDialog({ type: 'requestDetail', request });
  const openOfferForm = (offer = null) => setDialog({ type: 'offerForm', offer });
  const openProfileForm = () => setDialog({ type: 'profileForm' });

  const addRequest = async ({ note, date }) => {
    const offer = dialog?.offer;
    if (!offer) return;
    try {
      const result = await api('/requests', { method: 'POST', body: JSON.stringify({ offerId: offer.id, note, desiredDate: date || null }) });
      setData((current) => ({ ...current, requests: [result.request, ...current.requests] }));
      setDialog(null); setToast('تم إرسال طلبك. يمكنك متابعة حالته من صفحة «طلباتي».');
    } catch (error) { setToast(error.message); }
  };

  const saveOffer = async (offer) => {
    const existing = dialog?.offer;
    const path = existing ? `/offers/${existing.id}` : '/offers';
    try {
      const result = await api(path, { method: existing ? 'PATCH' : 'POST', body: JSON.stringify(offer) });
      setData((current) => ({ ...current, offers: existing ? current.offers.map((item) => item.id === existing.id ? result.offer : item) : [result.offer, ...current.offers] }));
      setView('offers'); setDialog(null); setToast(existing ? 'تم حفظ تعديلات الخدمة.' : 'تم نشر الخدمة. أصبحت متاحة للطلاب.');
    } catch (error) { setToast(error.message); }
  };

  const saveProfile = async (profile) => {
    try {
      await api('/profile', { method: 'PATCH', body: JSON.stringify(profile) });
      const workspace = await api('/bootstrap');
      setData(workspace); setDialog(null); setToast('تم تحديث ملفك الشخصي.');
    } catch (error) { setToast(error.message); }
  };

  const updateRequest = async (id, status) => {
    try {
      const result = await api(`/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setData((current) => ({ ...current, requests: current.requests.map((request) => request.id === id ? result.request : request) }));
      setToast(`تم تحديث حالة الطلب إلى «${getStatus(status)[0]}».`);
    } catch (error) { setToast(error.message); }
  };

  const submitSearch = (event) => {
    event.preventDefault();
    if (view !== 'browse') { setView('browse'); setCategory('الكل'); setRequestFilter('الكل'); }
    else document.getElementById('heroSearch')?.focus();
  };

  const focusSummary = () => requestAnimationFrame(() => dialogRef.current?.querySelector('[role="alert"]')?.focus());

  const navItems = roleViews[role];
  const pageTitle = navItems.find((item) => item.id === view)?.label || 'لوحة التحكم';
  const activeStudentCount = studentRequests.filter((request) => ['pending', 'accepted', 'progress'].includes(request.status)).length;
  const pendingProviderCount = providerRequests.filter((request) => request.status === 'pending').length;
  const activeProviderCount = providerRequests.filter((request) => ['accepted', 'progress'].includes(request.status)).length;
  const ownOffers = data.offers.filter((offer) => offer.providerId === data.profile.id);

  const serviceGrid = <div className="service-grid" id="serviceResults">{filteredOffers.length ? filteredOffers.map((offer) => <ServiceCard key={offer.id} offer={offer} onDetails={openOfferDetail} />) : <div className="empty-state" style={{ gridColumn: '1 / -1' }}><Icon name="search" /><strong>لم نعثر على خدمة مطابقة</strong><p>جرّب كلمة أخرى أو اختر تصنيفًا مختلفًا.</p></div>}</div>;
  const filters = <ServiceFilters category={category} setCategory={setCategory} />;

  const renderRequests = (providerMode = false) => {
    const requests = providerMode ? providerRequests : studentRequests;
    const filtered = requests.filter((request) => requestFilter === 'النشطة' ? ['pending', 'accepted', 'progress'].includes(request.status) : requestFilter === 'المكتملة' ? request.status === 'completed' : true);
    return <><section className="page-heading"><div><Eyebrow icon="clipboard">{providerMode ? 'إدارة طلبات الخدمة' : 'كل تحديث في مكانه'}</Eyebrow><h1>{providerMode ? 'طلبات الخدمة' : 'طلباتي'}</h1><p className="subheading">{providerMode ? 'راجع تفاصيل الطلب، ثم حدّث حالته حسب سير العمل.' : 'تابع طلبك من لحظة الإرسال حتى اكتمال الخدمة.'}</p></div></section><div className="request-toolbar"><div className="tab-list" role="group" aria-label="تصفية الطلبات">{['الكل', 'النشطة', 'المكتملة'].map((label) => <button key={label} type="button" className="tab-button" aria-pressed={requestFilter === label} onClick={() => setRequestFilter(label)}>{label}</button>)}</div><span className="request-count">{filtered.length.toLocaleString('ar-AE')} طلبات</span></div><div className="request-board">{filtered.length ? filtered.map((request) => <RequestCard key={request.id} request={request} providerMode={providerMode} onStatus={updateRequest} onDetails={openRequestDetail} />) : <div className="empty-state"><Icon name="empty" /><strong>لا توجد طلبات في هذا القسم</strong><p>ستظهر هنا الطلبات عند إرسالها أو تحديثها.</p></div>}</div></>;
  };

  const renderStudentHome = () => <><div className="welcome-row"><div><Eyebrow icon="sparkle">يومك الدراسي، أسهل مع وصلة</Eyebrow><h1>أهلاً، {data.profile.name}</h1><p className="subheading">ابحث عن مهارة تحتاجها، أو تابع طلبك من مكان واحد.</p></div><div className="date-label"><Icon name="calendar" />{dateToday()}</div></div><section className="hero-panel" aria-label="البحث عن الخدمات"><div className="hero-copy"><Eyebrow icon="sparkle">منصة الخدمات الطلابية</Eyebrow><h2 className="hero-title">خدمات جامعتك، من طلاب يعرفون احتياجك</h2><p className="hero-description">اكتشف الخدمات المتاحة، اشرح احتياجك، وتابع حالة طلبك بكل وضوح.</p><SearchBar query={query} setQuery={setQuery} onSubmit={submitSearch} /></div><div className="hero-art" aria-hidden="true"><span className="hero-orbit" /><span className="hero-tile"><Icon name="clipboard" /></span><span className="hero-spark one"><Icon name="sparkle" /></span><span className="hero-spark two"><Icon name="check" /></span><span className="hero-spark three"><Icon name="clock" /></span><span className="hero-art-label">طلب واضح · متابعة أسهل</span></div></section><div className="content-grid"><div className="main-column"><section><div className="section-heading"><div><h2>خدمات قد تناسبك</h2><p>{filteredOffers.length} خدمات متاحة</p></div><button className="text-link" type="button" onClick={() => goView('browse')}>استكشف الكل <Icon name="arrow" /></button></div>{filters}{serviceGrid}</section></div><aside className="side-column"><section className="mini-stats" aria-label="ملخص نشاطك"><div className="stat-card"><div className="stat-top"><span>طلبات قيد المتابعة</span><Icon name="clipboard" /></div><strong className="stat-value">{activeStudentCount.toLocaleString('ar-AE')}</strong><span className="stat-foot">كل تحديث يظهر هنا</span></div><div className="stat-card"><div className="stat-top"><span>خدمات متاحة</span><Icon name="grid" /></div><strong className="stat-value">{data.offers.length.toLocaleString('ar-AE')}</strong><span className="stat-foot">تصفّح حسب احتياجك</span></div></section><section className="panel"><div className="panel-heading"><h2>متابعة الطلبات</h2><button className="text-link" type="button" onClick={() => goView('requests')}>عرض الكل <Icon name="arrow" /></button></div><div className="request-list">{studentRequests.length ? studentRequests.slice(0, 3).map((request) => <MiniRequest key={request.id} request={request} />) : <p className="subheading">لا توجد طلبات بعد.</p>}</div></section><section className="guide-card"><span className="help-icon"><Icon name="info" /></span><h3>شارك مهارتك مع زملائك</h3><p>اعرض خدمتك واستقبل الطلبات من مجتمع الجامعة.</p><button type="button" onClick={() => onSignOut({ mode: 'register', role: 'provider' })}>ابدأ كمقدّم خدمة</button></section></aside></div></>;

  const renderBrowse = () => <><section className="page-heading"><div><Eyebrow icon="grid">دليل خدمات المجتمع الجامعي</Eyebrow><h1>تصفّح الخدمات</h1><p className="subheading">اختر الخدمة المناسبة، ثم أرسل احتياجك لمقدّم الخدمة.</p></div></section><section className="panel" style={{ marginBottom: 16 }}><SearchBar query={query} setQuery={setQuery} onSubmit={submitSearch} compact /></section><div className="section-heading"><div><h2>كل الخدمات</h2><p>{filteredOffers.length} خدمات متاحة</p></div><span className="date-label"><Icon name="filter" />اختر تصنيفًا</span></div>{filters}{serviceGrid}</>;

  const renderProviderHome = () => <><div className="welcome-row"><div><Eyebrow icon="sparkle">لوحة مقدّم الخدمة</Eyebrow><h1>أهلاً، {data.profile.name}</h1><p className="subheading">إدارة عروضك ومتابعة طلبات الطلاب من لوحة واحدة.</p></div><button className="date-label" type="button" onClick={() => goView('offers')}><Icon name="briefcase" />{ownOffers.length.toLocaleString('ar-AE')} عروضك</button></div><section className="hero-panel"><div className="hero-copy"><Eyebrow icon="sparkle">مساحة مقدّم الخدمة</Eyebrow><h2 className="hero-title">مهارتك تساعد زملاءك على الإنجاز</h2><p className="hero-description">حدّث عروضك، واستقبل طلبات واضحة، وأبقِ الطلاب على اطّلاع بحالة الخدمة.</p><button className="primary-button" type="button" onClick={() => openOfferForm()}><Icon name="plus" />إضافة خدمة جديدة</button></div><div className="hero-art" aria-hidden="true"><span className="hero-orbit" /><span className="hero-tile"><Icon name="briefcase" /></span><span className="hero-spark one"><Icon name="sparkle" /></span><span className="hero-spark two"><Icon name="check" /></span><span className="hero-spark three"><Icon name="user" /></span><span className="hero-art-label">مهارة مشتركة · خدمة أوضح</span></div></section><div className="content-grid"><div className="main-column"><section><div className="section-heading"><div><h2>طلبات تحتاج إلى مراجعتك</h2><p>ابدأ بالطلبات الجديدة ثم حدّث الحالة.</p></div><button className="text-link" type="button" onClick={() => goView('providerRequests')}>عرض الكل <Icon name="arrow" /></button></div><div className="request-board">{providerRequests.filter((request) => request.status === 'pending').length ? providerRequests.filter((request) => request.status === 'pending').slice(0, 3).map((request) => <RequestCard key={request.id} request={request} providerMode onStatus={updateRequest} onDetails={openRequestDetail} />) : <div className="empty-state"><Icon name="checkCircle" /><strong>لا توجد طلبات جديدة</strong><p>ستظهر الطلبات الجديدة هنا.</p></div>}</div></section></div><aside className="side-column"><section className="mini-stats" aria-label="ملخص نشاط مقدّم الخدمة"><div className="stat-card"><div className="stat-top"><span>طلبات جديدة</span><Icon name="clipboard" /></div><strong className="stat-value">{pendingProviderCount.toLocaleString('ar-AE')}</strong><span className="stat-foot">بانتظار قرارك</span></div><div className="stat-card"><div className="stat-top"><span>طلبات جارية</span><Icon name="clock" /></div><strong className="stat-value">{activeProviderCount.toLocaleString('ar-AE')}</strong><span className="stat-foot">تحتاج إلى متابعة</span></div></section><section className="panel"><div className="panel-heading"><h2>عروضك المنشورة</h2><button className="text-link" type="button" onClick={() => goView('offers')}>إدارة العروض <Icon name="arrow" /></button></div><div className="request-list">{ownOffers.slice(0, 3).map((offer) => <div className="request-mini" key={offer.id}><span className="request-symbol"><Icon name={offer.icon} /></span><span className="request-mini-copy"><strong>{offer.title}</strong><small>{offer.category} · {offer.duration}</small></span><Icon name="checkCircle" /></div>)}{!ownOffers.length && <p className="subheading">لم تضف خدمة بعد.</p>}</div></section><section className="guide-card"><span className="help-icon"><Icon name="info" /></span><h3>اكتب تفاصيل الخدمة بوضوح</h3><p>اذكر ما يحتاجه الطالب منك والمدة المتوقعة للإنجاز.</p><button type="button" onClick={() => openOfferForm()}>إنشاء عرض خدمة</button></section></aside></div></>;

  const renderOffers = () => <><section className="page-heading"><div><Eyebrow icon="briefcase">ملف خدماتك</Eyebrow><h1>عروضي</h1><p className="subheading">حدّث معلومات خدماتك كي يعرف الطلاب ما الذي تقدّمه.</p></div><button className="primary-button" type="button" onClick={() => openOfferForm()}><Icon name="plus" />إضافة خدمة</button></section><div className="section-heading"><div><h2>الخدمات المنشورة</h2><p>{ownOffers.length} خدمات</p></div></div>{ownOffers.length ? <div className="offers-grid">{ownOffers.map((offer) => <OfferCard key={offer.id} offer={offer} onEdit={openOfferForm} />)}</div> : <div className="empty-state"><Icon name="briefcase" /><strong>ابدأ بإضافة خدمتك الأولى</strong><p>اكتب وصفًا واضحًا، واختر التصنيف والمدة المناسبة.</p><button className="primary-button" type="button" style={{ marginTop: 12 }} onClick={() => openOfferForm()}><Icon name="plus" />إضافة خدمة</button></div>}</>;

  const renderProfile = () => <><section className="page-heading"><div><Eyebrow icon="user">معلوماتك في وصلة</Eyebrow><h1>ملفي الشخصي</h1><p className="subheading">عرّف الطلاب بخبرتك وطريقة تقديمك للخدمة.</p></div><button className="secondary-button" type="button" onClick={openProfileForm}><Icon name="pen" />تعديل الملف</button></section><div className="profile-layout"><section className="profile-card"><Avatar initials={data.profile.initials} /><h2>{data.profile.name}</h2><p>{role === 'student' ? 'طالب جامعي' : 'مقدّم خدمة من مجتمع الجامعة'}</p><span className="status accepted"><Icon name="shield" />ملف نشط</span></section><div><section className="profile-section"><div className="profile-section-heading"><h2>نبذة عني</h2></div><p className="profile-note">{data.profile.about}</p></section><section className="profile-section"><div className="profile-section-heading"><h2>المهارات والخبرات</h2><span className="request-count">{data.profile.skills.length.toLocaleString('ar-AE')} مهارات</span></div><div className="skill-list">{data.profile.skills.length ? data.profile.skills.map((skill) => <span className="skill-chip" key={skill}>{skill}</span>) : <span className="subheading">أضف مهاراتك ليتمكن الطلاب من العثور عليك.</span>}</div></section><section className="profile-section"><div className="profile-section-heading"><h2>حسابك</h2></div><div className="request-facts"><span><Icon name="user" />{role === 'student' ? 'طالب' : 'مقدّم خدمة'}</span><span><Icon name="location" />مجتمع الجامعة</span><span><Icon name="shield" />حساب محفوظ على الخادم</span></div></section></div></div></>;

  const renderAdminHome = () => {
    const totalUsers = adminSummary?.users.reduce((sum, item) => sum + item.total, 0) || 0;
    const requestTotal = adminSummary?.requests.reduce((sum, item) => sum + item.total, 0) || 0;
    return <><section className="page-heading"><div><Eyebrow icon="shield">إدارة وصلة</Eyebrow><h1>ملخص المنصة</h1><p className="subheading">نظرة عامة على الحسابات والخدمات والطلبات المسجلة.</p></div></section><div className="mini-stats" aria-label="ملخص المنصة"><div className="stat-card"><div className="stat-top"><span>الحسابات</span><Icon name="user" /></div><strong className="stat-value">{totalUsers.toLocaleString('ar-AE')}</strong><span className="stat-foot">طلاب ومقدمو خدمة</span></div><div className="stat-card"><div className="stat-top"><span>الخدمات المنشورة</span><Icon name="briefcase" /></div><strong className="stat-value">{(adminSummary?.offers.active || 0).toLocaleString('ar-AE')}</strong><span className="stat-foot">من {adminSummary?.offers.total || 0} خدمة</span></div><div className="stat-card"><div className="stat-top"><span>الطلبات</span><Icon name="clipboard" /></div><strong className="stat-value">{requestTotal.toLocaleString('ar-AE')}</strong><span className="stat-foot">في جميع الحالات</span></div></div><section className="panel" style={{ marginTop: 20 }}><div className="panel-heading"><h2>توزيع الطلبات</h2></div><div className="request-list">{adminSummary?.requests.length ? adminSummary.requests.map((item) => <div className="request-mini" key={item.status}><span className="request-mini-copy"><strong>{getStatus(item.status)[0]}</strong><small>طلبات المنصة</small></span><span className="request-count">{item.total.toLocaleString('ar-AE')}</span></div>) : <p className="subheading">جارٍ تحميل الإحصاءات…</p>}</div></section></>;
  };

  let content;
  if (view === 'home') content = renderStudentHome();
  else if (view === 'browse') content = renderBrowse();
  else if (view === 'requests') content = renderRequests(false);
  else if (view === 'providerHome') content = renderProviderHome();
  else if (view === 'providerRequests') content = renderRequests(true);
  else if (view === 'offers') content = renderOffers();
  else if (view === 'adminHome') content = renderAdminHome();
  else content = renderProfile();

  const handleRequestStatus = (requestId, status) => updateRequest(requestId, status);

  return <><div className="app-shell"><aside className="sidebar" aria-label="القائمة الرئيسية"><Brand /><div className="sidebar-label">مساحة العمل</div><nav className="side-nav" aria-label="التنقل">{navItems.map((item) => {
    const count = item.id === 'requests' ? activeStudentCount : item.id === 'providerRequests' ? pendingProviderCount : 0;
    return <a key={item.id} className="nav-link" href={`#${item.id}`} aria-current={view === item.id ? 'page' : undefined} onClick={(event) => { event.preventDefault(); goView(item.id); }}><span className="nav-icon"><Icon name={item.icon} /></span><span>{item.label}</span>{count > 0 && <span className="nav-count">{count}</span>}</a>;
  })}</nav><div className="sidebar-spacer" /><section className="sidebar-help" aria-label="معلومة عن وصلة"><span className="help-icon"><Icon name="info" /></span><strong>طلبك واضح من البداية</strong><p>تابع كل تحديث من لوحة الطلبات، من الإرسال حتى الإنجاز.</p></section><div className="sidebar-profile"><Avatar initials={data.profile.initials} /><span className="profile-copy"><strong>{data.profile.name}</strong><span>{role === 'student' ? 'طالب جامعي' : 'مقدّم خدمة'}</span></span><button className="profile-menu-button" type="button" onClick={() => goView('profile')} aria-label="الملف الشخصي"><Icon name="dots" /></button></div></aside><div className="workspace"><header className="topbar"><div className="breadcrumb"><span>وصلة</span><span className="crumb-separator" aria-hidden="true">/</span><strong>{pageTitle}</strong></div><div className="topbar-actions"><span className="semester-pill"><span className="live-dot" />مجتمعك الجامعي</span><button className="topbar-logout" type="button" onClick={() => onSignOut()}>تسجيل الخروج</button><button className="avatar-button" type="button" onClick={() => goView('profile')} aria-label="الانتقال إلى الملف الشخصي"><Avatar initials={data.profile.initials} className="avatar-main" /></button></div></header><main id="main-content" className="main-content" tabIndex={-1}>{content}</main><footer className="page-footer"><span>وصلة — خدمات جامعية من مجتمعك</span><span>مساحة آمنة لطلبات واضحة</span></footer></div></div><nav className="mobile-nav" aria-label="التنقل السريع">{navItems.map((item) => <a key={item.id} href={`#${item.id}`} aria-current={view === item.id ? 'page' : undefined} onClick={(event) => { event.preventDefault(); goView(item.id); }}><span className="mobile-nav-icon"><Icon name={item.icon} /></span><span>{item.mobile}</span></a>)}</nav><dialog ref={dialogRef} className="app-dialog" aria-labelledby="dialogTitle" onCancel={(event) => { event.preventDefault(); closeDialog(); }} onClick={(event) => { if (event.target === dialogRef.current) closeDialog(); }}>{dialog && <DialogContent dialog={dialog} data={data} onClose={closeDialog} onRequest={addRequest} onSaveOffer={saveOffer} onSaveProfile={saveProfile} onOfferForm={openOfferForm} focusSummary={focusSummary} onStatus={handleRequestStatus} />}</dialog><div className="toast-region" role="status" aria-live="polite" aria-atomic="true">{toast && <div className="toast"><Icon name="checkCircle" /><span>{toast}</span></div>}</div></>;
}

function DialogContent({ dialog, data, onClose, onRequest, onSaveOffer, onSaveProfile, onOfferForm, focusSummary, onStatus }) {
  if (dialog.type === 'offerDetail') return <div className="dialog-content"><div className="dialog-heading"><div><Eyebrow icon="grid">{dialog.offer.category}</Eyebrow><h2 id="dialogTitle">{dialog.offer.title}</h2><p>تفاصيل الخدمة ومعلومات مقدّمها.</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="إغلاق"><Icon name="close" /></button></div><div className="dialog-offer-summary"><span className="service-art-icon"><Icon name={dialog.offer.icon} /></span><span><strong>{dialog.offer.provider}</strong><small>مقدّم خدمة من مجتمع الجامعة · {dialog.offer.availability || 'يستقبل طلبات'}</small></span></div><p className="profile-note">{dialog.offer.description}</p><div className="request-facts" style={{ padding: '13px 0 16px' }}><span><Icon name="clock" />{dialog.offer.duration}</span><span><Icon name="location" />{dialog.offer.mode}</span></div><div className="dialog-note"><Icon name="info" />بعد إرسال طلبك، ستظهر حالته في «طلباتي» ويمكنك متابعته من هناك.</div><div className="dialog-actions"><button className="primary-button" type="button" data-autofocus onClick={() => onRequest(dialog.offer)}><Icon name="clipboard" />اطلب هذه الخدمة</button><button className="secondary-button" type="button" onClick={onClose}>إغلاق</button></div></div>;
  if (dialog.type === 'requestForm') return <RequestForm offer={dialog.offer} onSubmit={onRequest} onClose={onClose} focusSummary={focusSummary} />;
  if (dialog.type === 'offerForm') return <OfferForm key={dialog.offer?.id || 'new-offer'} offer={dialog.offer} profileName={data.profile.name} onSubmit={onSaveOffer} onClose={onClose} focusSummary={focusSummary} />;
  if (dialog.type === 'profileForm') return <ProfileForm profile={data.profile} onSubmit={onSaveProfile} onClose={onClose} focusSummary={focusSummary} />;
  if (dialog.type === 'requestDetail') {
    const request = dialog.request;
    const providerMode = data.role === 'provider';
    const person = providerMode ? request.student : request.provider;
    return <div className="dialog-content"><div className="dialog-heading"><div><Eyebrow icon="clipboard">{request.id}</Eyebrow><h2 id="dialogTitle">{request.title}</h2><p>تفاصيل الطلب وتحديثه الحالي.</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="إغلاق"><Icon name="close" /></button></div><div className="request-facts" style={{ padding: '16px 0 9px' }}><span><Icon name="user" />{providerMode ? 'الطالب' : 'مقدّم الخدمة'}: {person}</span><span><Icon name="calendar" />{request.date}</span><StatusBadge status={request.status} /></div><section className="profile-section" style={{ padding: 13, margin: '8px 0 15px' }}><h3>تفاصيل الاحتياج</h3><p className="profile-note">{request.note || 'لا توجد ملاحظات إضافية.'}</p></section><div className="dialog-note"><Icon name="info" />{providerMode ? 'حدّث حالة الطلب بعد مراجعته ليتمكن الطالب من متابعة تقدّمه.' : 'ستظهر أي تغييرات على حالة الطلب في صفحة «طلباتي».'}</div><div className="dialog-actions"><button className="secondary-button" type="button" onClick={onClose}>إغلاق</button></div></div>;
  }
  return null;
}

export default App;

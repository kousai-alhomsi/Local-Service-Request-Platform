export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers,
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError('تعذر الاتصال بالخادم. تأكد من تشغيله ثم حاول مجددًا.', 0);
  }
  const payload = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.error || 'تعذر إكمال الطلب.', response.status);
  return payload;
}

// Content-script side of the Vrijedi.Ly API (Leonard's web app, /api/extension/v1). Every call goes through
// the service worker (background.js): it holds the host permission and the install ID, and its requests
// don't carry the marketplace page's origin.

/** { status, data } from the API; throws only when the API can't be reached at all. */
export async function callApi(path, { method = 'GET', body } = {}) {
  const res = await chrome.runtime.sendMessage({ type: 'api', path, method, body });
  if (!res || res.unreachable) throw new Error(res?.unreachable || 'Service worker did not answer');
  return res;
}

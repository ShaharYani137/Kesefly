/**
 * Links that open the app from outside (another app, a web page, a QR code, the widget).
 *
 * Some screens act on route params: `/helper?q=` asks the question at once, and
 * `/chats/<id>?title=` shows that title in the chat header. Those params are for in-app
 * navigation only; from an outside link they let anyone make the app ask or show text the user
 * never chose. So every link from outside the app keeps its screen path but loses its query
 * string and fragment. In-app navigation (`router.push`, notification taps) does not go through
 * here and keeps its params.
 */
export function stripExternalParams(path: string): string {
  const cut = path.search(/[?#]/);
  const bare = cut === -1 ? path : path.slice(0, cut);
  return bare || '/';
}

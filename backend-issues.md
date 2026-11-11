# Backend issues: metadata & websockets

Tested on 2026-11-11 against the local docker server at commit `c9b9bc3` (Merge PR #15 websockets).
Every result below is the real response from that server. Line numbers point to `chat-server-gobelin/api`.

The browser examples assume the front runs on `http://localhost:5173` and the API on `http://localhost:4000`.

```js
const API = 'http://localhost:4000';
const auth = { Authorization: `Bearer ${token}` };
```

---

## 1. Posting a message without `metadata` returns 500 🔴

Every client that doesn't send metadata can no longer post a message.

```js
await fetch(`${API}/channel/message`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ content: 'hello', channel: 1 }),
});
```

**Result:** `500` with an empty body. Server log:

```
Error creating message: Error creating channel: ERROR: null value in column "metadata" of relation "messages" violates not-null constraint (SQLSTATE 23502)
```

**Why:** `internal/handlers/message.go:118`: `var meta json.RawMessage` stays `nil` when no metadata is sent. It is inserted as SQL `NULL`, but the column is `TEXT NOT NULL DEFAULT ''` (migration `00002`). The default only applies when the column is left out of the `INSERT`, not when it is given `NULL`.

**Fix idea:** default `meta` to `{}` (as `user.go` already does), or `COALESCE(?, '')` in the query.

---

## 2. `GET /channel/message` on `general` returns 500 🔴

```js
await fetch(`${API}/channel/message?channel=1`, { headers: auth });
```

**Result:** `500` with an empty body. Server log:

```
Error getting messages: Error unmarshaling metadata: json: cannot unmarshal array into Go value of type map[string]jsontext.Value for []
```

**Why:** the clock tick (`cmd/api/api.go:95`) stores `metadata = '[]'`, a JSON **array**. `GetByChannel` (`internal/messages/repo.go:63`) decodes metadata into a `map[string]json.RawMessage`, so the first clock tick (every 10 min) breaks the whole channel. The `general` channel is also created with `[]` (`api.go:75`).

**Fix idea:** use `{}` for the clock tick and the general channel, and migrate the rows already stored with `[]`.

---

## 3. The browser can't authenticate on `/socket` (401) 🔴

```js
// The browser WebSocket API only accepts (url, protocols), there is no way to set headers
const socket = new WebSocket('ws://localhost:4000/socket?channel=1');

socket.addEventListener('error', () => console.log('error'));
socket.addEventListener('close', (e) => console.log('close', e.code));
```

**Result:** the handshake gets `401 Unauthorized`. In the browser, that shows up as:

- console: `WebSocket connection to 'ws://localhost:4000/socket?channel=1' failed`
- JS: an `error` event with no details, then `close` with code `1006`

**Why:** `/socket` goes through `authMiddleware`, which only reads the `Authorization` header (`api.go:175`). It works with curl because curl can send that header, but the browser can't.

**Fix idea:** accept the token in the query string for `/socket`, e.g. `/socket?channel=1&token=<jwt>`.

---

## 4. The websocket refuses the front's origin (403) 🔴

Even with a valid token (here sent from Node to bypass issue 3), the upgrade fails as soon as an `Origin` header that differs from the API host is present. Browsers always send that header.

```js
// Node, raw upgrade request
import http from 'node:http';

http.request('http://localhost:4000/socket?channel=1', {
    headers: {
        ...auth,
        Origin: 'http://localhost:5173',
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Key': 'SGVsbG8sIHdvcmxkIQ==',
        'Sec-WebSocket-Version': '13',
    },
}).on('response', (res) => console.log(res.statusCode)).end();
```

| Request | Result |
|---|---|
| no token + `Origin` (browser) | `401 Unauthorized` |
| token + `Origin: http://localhost:5173` | `403 Forbidden` |
| token, no `Origin` (curl) | `101 Switching Protocols` ✅ |

**Why:** `internal/websockets/websocket.go:25`: the `websocket.Upgrader` has no `CheckOrigin`. gorilla's default only accepts requests whose `Origin` matches the `Host`, so `localhost:5173` → `localhost:4000` is rejected (`websocket: request origin not allowed by Upgrader.CheckOrigin`).

**Fix idea:**

```go
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}
```

---

## 5. The `Namespace` header is blocked by CORS 🟠

```js
await axiosClient.get('/me', { headers: { Namespace: 'chat-gobelins' } });
```

**Result:** the preflight `OPTIONS` returns `200` with `Access-Control-Allow-Headers: Content-Type, Authorization`. The browser then blocks the request:

```
Access to XMLHttpRequest at 'http://localhost:4000/me' from origin 'http://localhost:5173' has been blocked by CORS policy:
Request header field namespace is not allowed by Access-Control-Allow-Headers in preflight response.
```

axios rejects with `AxiosError: Network Error` (`ERR_NETWORK`).

**Why:** `api.go:158` doesn't list `Namespace`.

**Fix idea:** `"Content-Type, Authorization, Namespace"`. Until then the front can use `?namespace=` instead, which works.

---

## 6. Sending metadata without a namespace returns 500 🟡

```js
await fetch(`${API}/channel/message`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ content: 'hello', channel: 1, metadata: {} }),
});
```

**Result:** `500` with an empty body (log: `Metadatas given without namespace`).

**Why:** this one is intended, but a `400` with a message would make it easier to understand from the front.

---

## 7. Editing an anonymous message reveals its author 🔴

```js
const created = await fetch(`${API}/channel/message?namespace=demo`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ content: 'secret', channel: 1, anonymous: true, metadata: {} }),
}).then((r) => r.json());
// { "id": 5, "user_id": 3, "user": "anonymous", "anonymous": true, "creation_date": "2026-11-11T13:36:49.743938Z", ... }

await fetch(`${API}/channel/message`, {
    method: 'PUT',
    headers: auth,
    body: JSON.stringify({ id: created.id, content: 'edited' }),
}).then((r) => r.json());
```

**Result** (also broadcast on the websocket to everyone in the channel):

```json
{ "id": 5, "channel_id": 1, "content": "edited", "user_id": 0, "user": "wsrepro1794404209741", "anonymous": false, "creation_date": "", "posted_at": "", "metadata": { "demo": {} } }
```

**Why:**

- `GetByID` (`internal/messages/repo.go:74`) doesn't replace `user` with `"anonymous"` the way `GetByChannel` and `Create` do, and `Edit` copies it (`repo.go:190`). The real username leaks.
- `Edit`'s `RETURNING id, channel_id, content, metadata` drops the other fields, so they come back as Go zero values. `anonymous: false`, `user_id: 0`, and `creation_date: ""` / `posted_at: ""` (which give `Invalid Date` in JS) overwrite the real values on the front.

Side note: `user_id` is still sent for anonymous messages on create and GET, so anyone can tell who wrote them.

**Fix idea:** return the full message from `Edit` (re-select it via `GetByID`) and anonymize it in one place.

---

## 8. Scheduled messages are broadcast right away 🟠

```js
await fetch(`${API}/channel/message?namespace=demo`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
        content: 'future',
        channel: 3,
        metadata: {},
        posted_at: new Date(Date.now() + 3600e3).toISOString(),
    }),
});
```

**Result:** the socket on channel 3 receives it immediately:

```json
{ "id": 9, "content": "future", "creation_date": "2026-11-11T13:37:12.202295Z", "posted_at": "2026-11-11T14:37:12.231Z", ... }
```

`GET /channel/message?channel=3`, however, doesn't return it (it filters `posted_at < NOW()`).

**Why:** `CreateMessage` always calls `h.hub.Broadcast` (`internal/handlers/message.go:150`), whatever `posted_at` is.

**Fix idea:** only broadcast when `posted_at <= now`, and have a ticker broadcast scheduled messages when their time comes.

---

## 9. Websocket events have no type 🟠

Here is what one socket received for: create, create, create (scheduled), edit.

```
frame 0: {"id":7,"channel_id":3,"content":"first","user_id":4,"user":"wsrepro…","anonymous":false,"creation_date":"2026-11-11T13:37:12.196182Z","posted_at":"2026-11-11T13:37:12.196182Z","metadata":{"demo":{}}}
frame 1: {"id":8,"channel_id":3,"content":"second",…}
frame 2: {"id":9,"channel_id":3,"content":"future",…,"posted_at":"2026-11-11T14:37:12.231Z",…}
frame 3: {"id":7,"channel_id":3,"content":"first edited","user_id":0,…,"creation_date":"","posted_at":"",…}
```

`POST /channel/enter` also broadcasts the bare channel object (`internal/handlers/channel.go:150`), and the channel edit handler would too (`channel.go:215`).

So the front has to guess the event from the payload shape:

```js
socket.addEventListener('message', ({ data }) => {
    // writePump can join several queued payloads with "\n" in a single frame
    for (const line of data.split('\n')) {
        const payload = JSON.parse(line);

        if ('content' in payload && payload.creation_date === '') {
            // edited message?
        } else if ('content' in payload) {
            // new message?
        } else if ('name' in payload) {
            // someone joined? channel edited? we can't tell, and we don't know who joined
        }
    }
});
```

This gets fragile as soon as channel and user edits are added.

**Fix idea:**

```json
{ "type": "message.created", "data": { ... } }
{ "type": "message.edited",  "data": { ... } }
{ "type": "channel.joined",  "data": { "channel": { ... }, "user": { "id": 4, "username": "..." } } }
```

Note: batching with `\n` didn't happen during this test (each event came in its own frame), but `writePump` (`websocket.go`) does it when several messages are queued, so the front still has to handle it.

---

## 10. Channel edit isn't reachable 🟡

```js
await fetch(`${API}/channel/edit`, { method: 'POST', headers: auth, body: '{}' });
```

**Result:** `405` with an empty body.

**Why:**

- `EditChannel` exists in `internal/handlers/channel.go` but isn't registered in the router (`api.go`).
- Once registered, it would still fail: `internal/channels/repo.go:141` runs `UPDATE channel SET …`, but the table is `channels`.

---

## 11. Channel metadata is always `null` in `/me` 🟡

```js
await fetch(`${API}/me?namespace=demo`, { headers: auth }).then((r) => r.json());
// { "channels": [{ "name": "general", "id": 1, "metadata": null, ... }], ... }
```

**Why:** `GetByUser` (`internal/channels/repo.go`) selects `metadata` into `RawMetadata` but never decodes it into `Metadata`. Unlike messages and users, channels in `/me` aren't filtered by namespace either.

---

## Also worth knowing (not bugs)

- `GET /channel/message` now returns the **100 newest** messages, **newest first** (`ORDER BY posted_at DESC`). Response of the test above: `second | first edited`.
- One socket only watches one channel (`?channel=` is read once), although the `Websocket.channels` map could hold several. Accepting `?channel=1&channel=2` would avoid one connection per channel.

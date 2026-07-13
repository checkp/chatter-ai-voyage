## Media Gallery

Add a gallery icon to the top bar that opens a modal showing all media (generated images + user-uploaded attachments) grouped by chat.

### UI
- **Icon in `ChatHeader.tsx`**: New `Images` (lucide) button next to the Help/Tour buttons, with tooltip "Media Gallery". Also add to `MobileHeader.tsx`.
- **New `MediaGalleryDialog.tsx`** (shadcn `Dialog`, large): 
  - Header: title + search input + filter tabs (All / Generated / Uploaded).
  - Body: sections grouped by chat (chat title + date), each section a responsive thumbnail grid.
  - Click thumbnail → lightbox preview with prompt/filename, download button, "Open chat" link that switches to that chat.
  - Empty state when no media.

### Data sources
- **Generated images**: query `generated_images` joined/mapped to `messages.conversation_id` via matching. Simpler: pull `messages` where `sender='ai'` and `platform='image-panel'` (parse JSON) plus legacy rows from `generated_images` table. Group by `conversation_id` → chat title from `conversations`.
- **Uploaded attachments**: scan `messages` where `sender='user'` and content/attachments contain image data URLs. Currently attachments live on the message row as JSON (per `Attachment` type). Query messages with non-null attachments, filter `mimeType` starting with `image/`.

Single hook `useMediaGallery(user)` returns `{ chatsWithMedia: [{ chatId, title, updated_at, items: MediaItem[] }] }` sorted by recency. `MediaItem = { id, kind: 'generated'|'uploaded', url, prompt?, name?, createdAt, chatId }`.

### Wiring
- `Index.tsx` / `DesktopLayout` passes an `onOpenGallery` handler + dialog state to `ChatHeader`.
- Clicking "Open chat" in the lightbox calls existing chat-switch (`setActiveChatId`) and closes the dialog.

### Out of scope
- Deletion, multi-select, uploads from the gallery, video/audio (only images for v1).
- No schema changes.

# Pixiv Gallery setup

This site uses Pixiv's App API endpoints (the same API family used by Pixiv's apps). Pixiv does not offer this as a stable public developer API, so endpoint or authentication changes may break it.

## Cloudflare Pages secrets

In Cloudflare Dashboard:

1. Open **Workers & Pages** → **brezaxu-homepage**.
2. Open **Settings** → **Variables and Secrets** (wording may vary).
3. Add these as encrypted **Secrets**, not plain-text source files:
   - `PIXIV_REFRESH_TOKEN`: your Pixiv App API refresh token.
   - `PIXIV_GALLERY_KEY`: a long, unique key you choose to protect your private bookmarks.
4. Add them to the **Production** environment (and Preview only if you want private access in previews).
5. Trigger a new deployment.

Never commit a refresh token or gallery key to GitHub, and never paste them into public issues or chats. Use a trusted method on your own device to obtain a refresh token; do not give your Pixiv password to a third-party token website.

## Routes

- `/api/pixiv?mode=recommended`: recommended all-ages illustrations.
- `/api/pixiv?mode=bookmarks-public`: your public bookmarks.
- `/api/pixiv?mode=bookmarks-private`: your private bookmarks; requires the `PIXIV_GALLERY_KEY` secret and the same key entered in the gallery UI.
- `/api/pixiv-image?url=...`: same-origin image proxy, restricted to `i.pximg.net`.

The private-bookmark key is only held in page memory and sent in a request header; it is not saved to local storage or included in the page source. The API filters works marked as age-restricted.

## Limitations

This is an unofficial integration with Pixiv's App API, not a supported public developer API. Pixiv may reject requests from Cloudflare's network, change authentication, or alter response fields. The site itself and Cloudflare Pages free tier do not require a paid server, but no uptime guarantee is possible for the upstream API.

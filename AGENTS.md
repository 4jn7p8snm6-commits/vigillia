<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Push senders include structured location, severity and event timestamp; the service worker formats these for display outside the app and accepts legacy message bodies to preserve existing subscriptions.
- The map combines read-only NASA EONET observations and a public projection of geolocated real detections; only rounded coordinates, event kind and timestamp are public, never camera names, URLs or photos. Map reads never trigger notifications.
- Device geolocation requires explicit consent and applies only to device-camera frames; remote camera coordinates are configured separately, and uploads and demos never inherit device coordinates to avoid false locations.
- Leaflet is loaded lazily behind ClientOnly; shared event data stays browser-safe to prevent SSR access to browser globals.
- Demo images use a separate AI function that never records real detections or sends notifications, so examples cannot be mistaken for camera events.
- The single Cloud monitor schedule reads its private callback token from the database and skips HTTP requests when disabled or unconfigured.

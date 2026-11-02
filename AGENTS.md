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
- The surveillance map reads only real detection projections and configured camera zones; only rounded coordinates, event kind, timestamp and aggregate status/statistics are public, never camera names, URLs or photos. NASA observations do not feed surveillance statistics or map incidents.
- Surveillance aggregates are computed in a read-only database function; health indicators expire and reflect actual analysis/camera checks, never configured credentials alone, so dashboards do not imply untested availability.
- Device geolocation requires explicit consent and applies only to device-camera frames; remote camera coordinates are configured separately, and uploads and demos never inherit device coordinates to avoid false locations.
- Leaflet is loaded lazily behind ClientOnly; shared event data stays browser-safe to prevent SSR access to browser globals.
- Demo images use a separate AI function that never records real detections or sends notifications, so examples cannot be mistaken for camera events.
- The single Cloud monitor schedule reads its private callback token from the database and skips HTTP requests when disabled or unconfigured.

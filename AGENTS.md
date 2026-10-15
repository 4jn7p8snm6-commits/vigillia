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
- Global events use a read-only NASA EONET server function with dated source links; they never trigger camera notifications or imply complete real-time coverage.
- Leaflet is loaded lazily behind ClientOnly; shared event data stays browser-safe to prevent SSR access to browser globals.

# Settings studio

The /settings page has ten categories with a short description at the start of each section. Desktop uses a compact sidebar; mobile uses a native category picker. Related controls are grouped into separate panels (for example, content maturity, ratings and votes, and genres). The #settings-page scope explicitly resets inherited catalog section layouts and heading typography. Controls save to this browser and the page includes a search field for finding a preference across categories. The redesign is intentionally limited to Settings; other pages receive only the effects selected by the user.

## Integration map

| Section | Controls and consumers |
| --- | --- |
| General | Set a local profile name and avatar. |
| Appearance | Theme, accent, font, text size, reduced motion, rating visibility and solid navigation update root attributes and native CSS. System theme/motion changes are observed. Desktop navigation remains text-first by default; its optional icons and the mobile label toggle are separate preferences. |
| Performance | TMDB configuration supplies separate image sizes. Poster, backdrop, still, profile and logo previews preserve the image aspect ratio inside consistently sized preview cards and update when a resolution is selected. |
| Home screen | Carousel rotation/duration and visibility of Continue Watching, trending movies, trending TV and streaming collections control mounted Home sections. Hidden sections do not initiate their normal requests. |
| Browsing & language | Metadata language is sent in TMDB requests; watch region is sent with Home provider discovery; artwork data saver changes image URLs; spoiler hiding removes episode summaries and blurs episode artwork. |
| Content filters | Catalog adult/maturity rules, rating and vote thresholds, language exceptions, language/country selections, genre inclusion/exclusion and blocked TMDB IDs. |
| Playback | Default source and source memory control sourceFor/saveSource; next-episode navigation uses reported completion; anime audio feeds both source URL generation and the provider-menu display. Explicit per-session audio choices take priority. |
| History & privacy | Disabling activity recording stops new automatic history/Continue Watching writes, including delayed fallback and pending next-episode saves. Existing records remain. Clear history and forget sources are separately confirmed actions. |
| Network & tools | Cache preference governs catalog and sports caches; sports refresh sets the feed polling timer; extraction server and movie/episode size limits initialize/reset Tools fields. Cache clearing removes only app catalog/sports caches. |
| Data management | Existing validated backup export/import and confirmed library/preferences clearing remain integrated. Preference reset keeps library/history records and unknown preference keys. |

Changes persist under app_settings and are included in existing backups. Missing/invalid values use safe defaults. Source-specific choices remain higher priority while source memory is enabled. New preferences retain the original behavior by default; original provider-specific anime defaults are available.

The connection check performs catalog and sports HTTP requests with a ten-second timeout and displays each result separately. It does not test embedded streams or the external extraction server. The automated test uses mocked HTTP responses; live reachability is only checked when the user runs it.

## Scope and validation

Profiles are local browser identities. This app has no authenticated account, subscription or cross-device sync backend. Video resolution, subtitles, speed, volume and casting remain controlled by the embedded provider; the page explains where to change them without presenting nonfunctional controls. Catalog language does not translate the interface.

Tests cover validation, persistence, system appearance/motion, source memory, anime audio URLs, localized requests, smaller artwork, cache bypass, targeted data clearing and diagnostic response handling. Server rendering of the default Settings view was smoke-tested using the already available Preact renderer. This does not replace desktop/mobile browser validation. Avatar upload, touch layout, cross-tab interaction, provider playback and live service availability still need browser checks in a permitted environment.

## Image, Home and catalog controls

- **Image sizes:** `/configuration` supplies the secure image base URL and separate poster, backdrop, still, profile and logo size lists. Each type has its own override and live preview. Standard/data-saver/high presets reset overrides to automatic. Configuration failures use known fallback sizes for normal browsing; the settings editor reports failure instead of presenting fallback sizes as a live response. Preview samples come from filtered catalog results and can be unavailable under restrictive filters.
- **Home:** providers can be added/removed from TMDB's regional movie/TV provider lists. Custom sections have a title, type, order, provider, genre, original language and origin country; they can be reordered or removed. An empty provider selection is supported. Global filters still apply to custom sections.
- **Content:** the default minimum vote count is 200, including previously low-threshold presets. Users choose the languages allowed a lower count and its value; languages are not automatically classified. The rating minimum supports decimals. Empty language/country selections omit those default query filters. Multiple languages/countries use OR matching; genre exclusions take precedence over inclusions.
- **Certifications:** the TMDB adult flag is separate from R/18+ filtering. Optional certification checks reject US R, NC-17, TV-MA and explicit adult classifications (including 18+, 19+, and Indian A). Unknown/unavailable certificates follow the unrated setting. This is a catalog preference based on available metadata, not a verified parental-control boundary. Certification/country lookups add requests, limited to four concurrent lookups per catalog page. Cached metadata is reused when caching is enabled.
- **Pagination:** filtering preserves upstream page numbers and totals. Search counts are labeled as matches before local filters; an empty filtered page can be advanced with Load more results. Existing library records are never deleted by discovery filters.
- **Blacklist:** movie, TV, person or all-type IDs are supported. Blocked entries are hidden from lists/library and rejected on direct metadata/player routes. The former hard-coded movie 11845 exclusion is now an editable default blacklist entry.
- **Custom player:** save an HTTPS template containing `{id}`. Optional placeholders are `{type}`, `{season}`, `{episode}`. It appears as Custom in the player menu, uses normal source persistence and remains subject to iframe/provider embedding restrictions. Unknown placeholders and embedded URL credentials are rejected.
- **Appearance:** Figtree, Onest, Outfit, Raleway and Urbanist use weight 400, loaded through Google Fonts. Desktop links remain text-first by default; small icons are optional. Mobile navigation labels can be hidden while its icon links keep accessible names. Each settings category has a concise description; promotional taglines are omitted.

References: [TMDB configuration](https://developer.themoviedb.org/reference/configuration-details), [movie discovery](https://developer.themoviedb.org/reference/discover-movie), [TV discovery](https://developer.themoviedb.org/reference/discover-tv). Live configuration, provider lists, previews, font downloads and embeds require reachable external services. Automated tests use controlled responses; real browser/network checks remain pending.

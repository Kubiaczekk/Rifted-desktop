# Rifted — aplikacja desktop

Polska aplikacja do League of Legends (EUW/EUNE): poradniki i buildy, profile, szukanie duo.
Strona internetowa służy **tylko jako landing z przyciskiem „Pobierz”** — cała funkcjonalność jest w tej aplikacji.

Stack: Tauri 2 + React + TypeScript + Vite. Na razie: szkielet UI (Home, Poradniki, Szukam duo, Profil), bez logowania.

## Uruchomienie
- `npm install`
- `npm run dev` — sam interfejs w przeglądarce (http://localhost:5173)
- `npm run tauri:dev` — okno aplikacji desktop (wymaga Rust + zależności systemowych Tauri, np. webkit2gtk na Linuksie)
- `npm run tauri:build` — instalator

## Instalator Windows
Workflow **Windows installer** (`.github/workflows/windows-installer.yml`) buduje NSIS (`.exe`) i MSI na `windows-latest` i publikuje je jako assety GitHub Release. Uruchamia się ręcznie (`workflow_dispatch`) oraz przy tagach `v*`. Token to wbudowany `GITHUB_TOKEN` — bez dodatkowych sekretów.

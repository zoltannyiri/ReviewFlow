# ReviewFlow client SDK

## Csoportosított pinek és kommentpanel

Az SDK az URL-ben kapott `rf_session` tokent sikeres ellenőrzés után az aktuális
böngészőlap `sessionStorage` tárába menti. Teljes lapbetöltés után innen állítja
vissza a review sessiont; érvénytelen, lejárt vagy visszavont tokent eltávolít.
Az URL-paramétert validálás után úgy veszi ki a címsorból, hogy a többi query
paraméter és a hash megmarad. A nyilvános komment API mellett a kommentenkénti
válasz API-t is használja. A válaszokhoz a `20260831150000_add_comment_replies`
backend-migráció szükséges.

A jelenlegi útvonal kommentjeit az alábbi sorrendben csoportosítja:

1. `reviewElementId` (`data-review-id` a céloldalon).
2. `elementId` (HTML `id`).
3. Mentett téglalap, elem-típus és viewport-méret.

Az útvonal minden csoportkulcs része. A kulcsok JSON-kódoltak, ezért az
azonosítókban szereplő elválasztók sem okoznak kulcsütközést. Minden csoporthoz
egyetlen pin tartozik, a rajta látható szám az összes komment száma, beleértve
a megoldottakat is. A panel sorrendje a backend létrehozási sorrendjét követi.

## Érintett fájlok és felelősségek

- `src/commentGroups.js` (új): tiszta csoportosítási és címképzési függvények.
- `src/commentPins.js`: csoportonként egy, újrarendereléskor megőrzött gomb;
  élő DOM-horgony keresése, scroll/resize/layout pozíciófrissítés.
- `src/commentPanel.js` (új): nem modális, bezárható panel; kommentek, OPEN/RESOLVED
  jelvények, időpontok, Escape és fókusz-visszaadás. A kommentek és a cím csak
  `textContent`-on keresztül jelennek meg. Nincs státuszmódosítási művelet.
- `src/commentThread.js`: időrendben megjelenített fejlesztői/ügyfélválaszok,
  vendég válaszmező, inline hiba és ismételt beküldés elleni védelem. A panel
  frissítése és bezárása megőrzi a még el nem küldött szöveget.
- `src/api.js`: a válaszokat a `POST /review/:token/comments/:id/replies`
  végpontra küldi, és státuszkóddal ellátott hibát ad a session-validáláshoz.
  Válaszadáskor a pin számlálója és a komment státusza nem változik.
- `src/reviewSession.js` (új): URL-token prioritás, projektenként névterezett
  `sessionStorage`, tokeneltávolítás és érvénytelenségi státuszok.
- `src/navigation.js` (új): `pushState`, `replaceState` és `popstate` figyelése;
  kizárólag pathname-változáskor jelez, leállításkor visszaállítja a history API-t.
- `src/toolbar.js` (új): egyértelmű **Böngészés** és **Kommentelés** mód. Alapból
  böngészési módban indul, ezért a céloldal linkjei, gombjai és űrlapjai működnek.
- `src/uiRoot.js` (új): közös Shadow DOM a toolbar, pinek, panel és kommentbevitel
  CSS-izolációjához. A befogadó elem és az interaktív felületek
  `data-reviewflow-ui` jelölést kapnak. A meglévő kijelölő kiemelése kívül marad.
- `src/index.js`: session-helyreállítás, összekötés, SPA útvonalváltás,
  útvonalszűrés, betöltési versenyhelyzetek kezelése és sikeres mentés utáni
  azonnali pinfrissítés. Mindig az aktuális `location.pathname` értékét használja,
  és nem naplózza a vendégtokent.
- `src/commentBox.js`: az `alert()` helyett helyi hibaüzenet; sikertelen mentésnél
  megmaradó vázlat, mentés alatt dupla beküldés tiltása, eseménykezelők takarítása.
- `src/elementPicker.js`: csak kommentelési módban aktív; a kattintás teljes
  `composedPath()` útvonalán figyelmen kívül hagyja az SDK UI-ját, Shadow DOM mellett is.
- `package.json`, `tests/`: függőség hozzáadása nélküli tesztparancsok és tesztoldal.

A pozíciófrissítés `requestAnimationFrame`-mel összevont. A scroll esemény
capture fázisban figyelt, ezért beágyazott görgethető konténereknél is lefut.
A `MutationObserver` újrarajzoláskor újra megkeresi a célpontot, a `ResizeObserver`
a dokumentumtörzs méretváltozását figyeli. Nincs folyamatos lekérdezési ciklus.

Az `init()` visszaad egy opcionálisan használható `{ destroy() }` objektumot.
A leállítás eltávolítja az UI-t, eseménykezelőket és megfigyelőket; a későn
beérkező API-válaszok nem rajzolnak új UI-t. Ismételt `init()` nem duplikálja az SDK-t.

## Automatizált ellenőrzések

A repository gyökeréből:

```powershell
npm --prefix packages/client test
npm --prefix web run build
npm --prefix web run lint
node web/node_modules/eslint/bin/eslint.js --no-config-lookup --config web/eslint.config.js packages/client/src packages/client/tests
```

A 17 Node-teszt az azonosító-prioritást, az útvonalszétválasztást, a geometriai
fallbacket, a kulcsütközéseket, a cél-URL képzését, a session életciklusát és a
history API tiszta visszaállítását ellenőrzi.

Az önellenőrző böngészőteszt a már telepített webes Vite-ot használja:

```powershell
npm --prefix packages/client run test:browser
```

Nyisd meg: <http://127.0.0.1:5174/tests/browser.html>.
Az oldal alján az elvárt eredmény: **40 sikeres, 0 sikertelen teszt.**
A tesztek után a főcímhez 3, a CTA-hoz 1, a koordinátás célponthoz 2 komment
marad a kézi próbához. Az oldalon szándékosan agresszív gomb- és textarea-CSS
teszteli az elkülönítést. Mentési/betöltési hibák, DOM-csere és újrainicializálás
a tesztvezérlőkkel próbálhatók ki.

Ez kizárólag helyi, memóriában szimulált API: nem használ valódi review tokent,
nem ír PostgreSQL-be, és a tesztadatokat minden lapfrissítés visszaállítja.
Nem helyettesíti a következő, valódi adatbázissal végzett próbát.

## Kézi végponttól végpontig teszt a meglévő alkalmazásban

1. Indítsd a meglévő backendet és webet a szokásos helyi konfigurációval.
2. Nyiss meg egy érvényes `/r/<TOKEN>` linket, majd a „Review megnyitása” gombot.
3. A `/test` oldalon írj három kommentet a `data-review-id="hero-title"` főcímre.
   Egyetlen 3-as pin jelenjen meg; egy másik elem külön pint kapjon.
4. Kattints a 3-as pinre. Lásd mindhárom kommentet, a címüket/státuszukat és
   időpontjukat. A panel vagy bezáró gomb kattintása ne indítsa el a kijelölőt.
5. Próbáld a bezáró gombot és az Escape-et; a billentyűzetfókusz térjen vissza
   a pinre. Hozz létre új kommentet ugyanarra az elemre: a szám növekedjen.
6. Frissítsd a lapot: a csoportok a valódi API-ból töltődjenek vissza.
7. Görgess, méretezd át az ablakot és változtasd meg az azonosított elem helyét:
   a pin kövesse a célpontot. Próbáld keskeny nézetben is a panel bezárását.
8. Tesztkörnyezetben szimulálj sikertelen POST-ot: ne legyen böngésző-alert,
   a vázlat maradjon meg, és újrapróbálással menthető legyen.
9. Érvényes `sessionStorage` token nélkül, `rf_session` nélküli oldalon ne
   jelenjen meg ReviewFlow UI. Érvényes, ugyanabban a lapban mentett sessionnel igen.
10. Írj választ a fejlesztői oldalon, frissítsd a vendégoldalt, és nyisd meg a
    pint. A fejlesztő válasza, neve, szerepe és időpontja jelenjen meg.
11. Válaszolj vendégként a panelből, majd a fejlesztői oldalon kattints a
    „Lista frissítése” gombra. A vendégválasz „Ügyfél” néven látszódjon.
    A válasz ne változtassa meg a komment státuszát és a pin számlálóját.

## Ismert korlátok és külön javítandó meglévő problémák

- Az azonosító nélküli kommentek régi koordinátái viewport-relatívak, nem
  tartalmazzák a rögzítéskori scroll offsetet. A fallback ezért csak közelítő:
  eltérő görgetésnél/layoutnál/viewportnál ugyanaz az elem külön csoportba kerülhet,
  és az ilyen pin nem tud megbízhatóan az elem után mozogni. Stabil rögzítéshez
  jelenleg `data-review-id` vagy HTML `id` szükséges; új selector/adatmodell nem készült.
- Vendégoldali státuszmódosítás és élő válaszfrissítés továbbra is későbbi mérföldkő.
- A `sessionStorage`-ban lévő bearer tokenhez az azonos originen futó JavaScript
  hozzáférhet, ezért a céloldal XSS-védelme és CSP-je továbbra is biztonsági határ.
- A cél-URL query/hash kezelése, a nyers token naplózása és az ismételt
  deaktiválás hash-visszaadása már javítva.
- `backend/src/controllers/commentController.js`: nincs explicit szövegtípus- és
  kommenthossz-validáció; például nem szöveges `comment` 400 helyett 500-at okozhat.
- A projekt-origin ellenőrzése elkészült, a nyilvános API rate limitje még hiányzik.
  A duplikált public route-regisztrációk megszűntek.

A fejlesztői lezárás és az új `/developer` oldal részleteit a
`docs/comment-resolution.md` dokumentálja a repository gyökerében.
A válaszadás API-ját, jogosultságait és platformfüggetlen beépítésének feltételeit
a `docs/comment-replies.md` írja le.
A projektfelvételt, az új `/sdk/` modul-kiszolgálást és a projektkulcsos
kapcsolatellenőrzést a `docs/project-onboarding.md` dokumentálja.

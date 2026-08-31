# Kommentenkénti beszélgetések

A fejlesztő a `/developer` oldalon, az ügyfél a céloldal SDK-paneljén válaszolhat
egy meglévő kommentre. A beszélgetés nem hoz létre új pint, nem növeli a
kommentszámlálót, és nem módosítja sem a komment, sem a review kör státuszát.
Megoldott kommenthez is lehet válaszolni. Válasz szerkesztése/törlése nincs.

## Telepítés és adatmodell

A `20260831150000_add_comment_replies` migráció új táblát és enumot hoz létre;
nem töröl és nem alakít át meglévő kommentadatokat. Ebben a helyi munkapéldányban
a migráció már lefutott. Más környezetben a backend könyvtárából:

```powershell
npx prisma migrate deploy
npx prisma generate
```

Ezután indítsd újra a backendet. Az új frontend/SDK csak az új API-val együtt
használható válaszadásra. Az integrációs teszt nem alkalmaz migrációt automatikusan.

`CommentReply`: `id`, `commentId`, `authorType` (`DEVELOPER`/`CLIENT`),
`authorName`, opcionális `authorId`/`reviewLinkId`, `message`, `createdAt`.
A szülőkomment törlése törli a válaszokat is. Felhasználó vagy review link törlése
csak a kapcsolódó szerző-/linkazonosítót nullázza; a szerzőnév pillanatképe megmarad.

## API és jogosultság

| Végpont | Hitelesítés és hatókör |
| --- | --- |
| `POST /api/comments/:id/replies` | Meglévő JWT; tagság a komment projektjének szervezetében. OWNER, ADMIN, MEMBER egyaránt válaszolhat. |
| `POST /api/review/:token/comments/:id/replies` | Érvényes, aktív, nem lejárt vendéglink; kizárólag a link saját review körének kommentjei. |

Mindkét végpont kizárólag ezt a törzset fogadja:

```json
{ "message": "Javítottam, kérlek nézd meg." }
```

Nem üres szöveg, maximum 5000 UTF-16 kódegység; a szélső whitespace levágódik.
A NUL karakter és minden további mező tiltott. A szerző nevét, szerepét és
azonosítóját nem a kliens adja meg. Fejlesztőnél a hitelesített felhasználó neve
(hiányában „Fejlesztő”), vendégnél „Ügyfél” kerül mentésre. Az anonim vendégeket
ez a mérföldkő nem azonosítja külön személyenként.

Siker: `201 { success: true, reply }`. A `reply` nyilvános mezői:
`id`, `commentId`, `authorType`, `authorName`, `message`, `createdAt`.
Sem belső szerző-/linkazonosítót, sem e-mail-címet, sem tokent/hash-t nem tartalmaz.

- `400`: hibás kommentazonosító vagy törzs.
- `401`: fejlesztői végponton hiányzó/érvénytelen/lejárt JWT.
- `404`: nem létező vagy nem elérhető komment, illetve ismeretlen vendéglink.
- `410`: lejárt vagy visszavont vendéglink az ellenőrzéskor.

A vendég nem válaszolhat másik kör kommentjére akkor sem, ha az ugyanahhoz a
projekthez tartozik. Ugyanazon kör másik érvényes linkjével viszont részt vehet a
beszélgetésben. A tagsági/kör- és linkérvényességi feltétel a beágyazott
adatbázis-módosításban is szerepel, nem csak az előzetes lekérdezésben.

A fejlesztői és nyilvános kommentlisták `replies` tömböt tartalmaznak, létrehozás,
majd azonosító szerint rendezve. A meglévő lezárási végpont is visszaadja ezt,
így a lezárás nem tünteti el a beszélgetést a felületről.

## Felület és ellenőrzés

A válaszok sima szövegként jelennek meg (React-szöveg / `textContent`), HTML nem
fut le. Küldés alatt nincs dupla beküldés. A fejlesztői UI ugyanazon komment
lezárását és válaszadását sem indítja párhuzamosan. Hibánál megmarad a piszkozat.

Az SDK a panel bezárása, elemváltás és listafrissítés során is megőrzi a
válaszmezőket. A fejlesztői oldal szűrés és lista-frissítés alatt megtartja a
piszkozatokat az aktuális körben. Lapfrissítés, SDK-leállítás, körváltás vagy
kijelentkezés után nincs piszkozatmegőrzés; nem írjuk őket böngészőtárba.

A saját válasz azonnal megjelenik a sikeres szerverválasz után. Más résztvevő
válaszát a fejlesztő „Lista frissítése” gombbal, a vendég lapfrissítéssel tölti be.
WebSocket/polling és értesítések még nincsenek.

Kézi próba a valódi helyi alkalmazásban:

1. Nyiss meg egy vendéglinket, és írj kommentet egy elemhez.
2. A `/developer` oldalon válaszd ki ugyanazt a projektet és kört, majd válaszolj.
3. Frissítsd a vendégoldalt, nyisd meg a pint, és válaszolj az SDK-panelben.
4. A fejlesztői listát frissítve lásd mindkét választ időrendben.
5. Jelöld megoldottnak a kommentet. További válasz ne nyissa újra.

Automatizált ellenőrzések a repository gyökeréből:

```powershell
npm --prefix backend test
npm --prefix backend run test:integration
npm --prefix packages/client test
npm --prefix web run lint
npm --prefix web run build
node web/node_modules/eslint/bin/eslint.js --no-config-lookup --config web/eslint.config.js packages/client/src packages/client/tests
npm --prefix packages/client run test:browser
```

Az SDK `/tests/browser.html` tesztoldalán 28 sikeres ellenőrzés az elvárt eredmény.
A webes `/tests/developer.html` szimulált belépéssel, mentési hibakapcsolóval és
válaszokkal tesztelhető; egyik tesztoldal sem ír valódi adatokat.
A backend integrációs teszt valódi HTTP/JWT/Prisma/PostgreSQL mellett ellenőrzi
a válaszokat, a szerzőhamisítás tiltását, a kör- és szervezethatárokat, valamint
a lejárt/visszavont linkeket. Minden tesztadatot tranzakcióval visszagörget.

## Vercel és más domainek

A működés nem függ a tárhelyszolgáltatótól. A jelenlegi architektúrában a céloldal
tulajdonosa/fejlesztője beépíti az SDK-t, és megadja a ReviewFlow API-címét.
Éles HTTPS-oldalhoz nyilvánosan elérhető HTTPS API szükséges; a localhost-alapérték
csak helyi fejlesztésre való. A céloldal CSP-jének is engednie kell a szükséges
scriptet és API-kapcsolatot. Az ügyfél elemekhez kapcsolódó visszajelzést ad,
nem módosítja a céloldal forráskódját.

Önmagában egy tetszőleges idegen domain megadása nem telepíti oda az SDK-t.
A domaines projektlétrehozó/beépítési felület és a teljes éles beépítési folyamat
nem része ennek a mérföldkőnek. Következő feladat a cél-URL query/hash-kezelése,
projekt-domain ellenőrzés és CORS-szabályok, SPA-munkamenet, valamint egy valódi
külső staging-domainen végzett végponttól végpontig teszt. Rate limit és a régi
kommentlétrehozó payload teljes validációja szintén élesítés előtti teendő.

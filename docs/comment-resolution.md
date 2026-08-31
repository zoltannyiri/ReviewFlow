# Kommentek megoldottnak jelölése

Ez a dokumentum a lezárási mérföldkövet írja le. Az azóta elkészült
kommentenkénti válaszadás külön leírása: [Kommentválaszok](comment-replies.md).

## Használat

Indítsd a meglévő backendet és webes alkalmazást a szokásos `.env` beállításokkal:

```powershell
npm --prefix backend run dev
npm --prefix web run dev
```

A fejlesztői felület a webes alkalmazás `/developer` útvonalán érhető el
(alapesetben `http://localhost:5173/developer`). A `/` ide irányít át.

1. Jelentkezz be a meglévő fejlesztői fiókoddal.
2. Válassz projektet, majd review kört.
3. A kommenteket szűrheted státusz és oldal szerint; az „Elemadatok” részben
   látható a HTML-elem, a stabil azonosítók és a rögzítéskori nézetméret.
4. Nyomd meg a nyitott komment „Megoldva” gombját. Sikeres szerverválasz után
   frissül a jelvény, a számláló és a szűrt lista.
5. A vendég review oldalon lapfrissítés után jelenik meg a `RESOLVED` jelvény.

A kliens hibás mentéskor nem állítja át a státuszt; a hiba a kommentnél jelenik
meg, és a művelet újrapróbálható. A „Lista frissítése” újraolvassa a szerver állapotát.

## Határok és döntések

- A meglévő JWT-belépés maradt meg, nincs új auth-adatmodell vagy migráció.
- Az access token csak a fejlesztői oldal React-memóriájában él, nem kerül
  URL-be, localStorage-ba, sessionStorage-ba vagy a közös axios alapértelmezett
  fejléceibe. Lapfrissítés után új bejelentkezés szükséges.
- A kijelentkezés ebből az oldalból törli a helyi munkamenetet; a meglévő JWT-t
  szerveroldalon nem vonja vissza. Ehhez később a tervezett session-rendszer kell.
- OWNER, ADMIN és MEMBER egyaránt kezelheti a saját szervezete kommentjeit.
- Most kizárólag `RESOLVED` állítható. Az `OPEN`, `REOPENED`, új enumértékek,
  válaszok és vendégoldali státuszváltoztatás nem részei ennek a mérföldkőnek.
- A review kör státusza nem változik meg automatikusan, akkor sem, ha minden
  komment megoldott. Jóváhagyási folyamat nem készült.
- A projekt- és reviewkör-választó a meglévő API-kat használja. Létrehozófelület,
  regisztrációs UI és teljes dashboard még nincs.

## API

Mindkét új útvonal `Authorization: Bearer <ACCESS_TOKEN>` fejlécet igényel.
Vendég review token nem használható fejlesztői hitelesítésre.

`GET /api/rounds/:id/comments`

Válasz: `{ success: true, reviewRound: { id, name, version, status }, comments }`.
Egy tagsági feltétellel szűrt Prisma-lekérdezésből olvassa a kört és kommentjeit.
A kommentek létrehozás, majd azonosító szerint rendezettek. Az elérhető, üres
kör 200-at és üres listát ad.

`PATCH /api/comments/:id`

```json
{ "status": "RESOLVED" }
```

Válasz: `{ success: true, comment }`. A jogosultsági feltétel magában az UPDATE
lekérdezésben szerepel: a komment review körének projektjét birtokló szervezetben
az aktuális JWT felhasználójának tagsággal kell rendelkeznie. A státuszt a service
állítja be; a kérésből nem emel át szabadon módosítható mezőket.

- 400: hibás UUID, hiányzó/nem támogatott státusz vagy további payload-mező.
- 401: hiányzó, hibás vagy lejárt JWT.
- 404: nem létező vagy más szervezethez tartozó komment/kör. A válasz nem
  árulja el az idegen erőforrás létezését.
- Az ismételt lezárás is sikeres; a komment továbbra is `RESOLVED` marad.

A nyilvános review GET/POST útvonalak továbbra sem igényelnek JWT-t. A middleware
csak az új, védett útvonalakon szerepel, nem a teljes `/api` routeren.

## Fájlok és felépítés

- `backend/src/routes/commentRoutes.js`: védett kommentlista és PATCH route.
- `backend/src/controllers/developerCommentController.js`: UUID/payload-validáció,
  HTTP-válaszok és hibakódok.
- `backend/src/services/commentService.js`: tagságvédett olvasás és lezárás;
  a meglévő nyilvános kommentkezelés megmaradt.
- `backend/src/app.js`, `server.js`: a meglévő Express-alkalmazás exportálható
  modulba került, a szerverindítás külön maradt. Így a HTTP-tesztek pontosan az
  éles route-összeállítást futtatják.
- `backend/src/services/reviewLinkService.js`: a deaktiválás első lekérdezése is
  kizárólag nyilvános metaadatokat választ ki. Ismételt deaktiváláskor sem
  kerülhet `tokenHash` a válaszba.
- `web/src/pages/ReviewPage.jsx`: a nyers vendégtoken konzolnaplózása megszűnt.
- `web/src/pages/DeveloperCommentsPage.*`, `components/DeveloperLogin.jsx`,
  `DeveloperWorkspace.jsx`, `RoundComments.jsx`: az egyszerű fejlesztői felület.
- `web/src/api/developerApi.js`: elkülönített, explicit Bearer-fejléces hívások.
- `web/src/hooks/useDeveloperResource.js`: megszakítható adatbetöltés, újrapróbálás,
  lejárt munkamenet kezelése; a korábbi kiválasztás késői válasza nem írja felül az újat.
- `backend/tests/`, `web/tests/developer.*`: automatizált és kézi tesztkörnyezet.

## Tesztelés

A repository gyökeréből:

```powershell
npm --prefix backend test
npm --prefix backend run test:integration
npm --prefix packages/client test
npm --prefix web run lint
npm --prefix web run build
```

A backend unit tesztjei adatbázis nélkül futnak. Az integrációs teszt a meglévő
`backend/.env` adatbázisát használja, ezért elérhető PostgreSQL és a jelenlegi
séma szükséges. Nem futtat migrációt és nem reseteli az adatbázist.

Az integrációs teszt valódi HTTP-t, JWT-ellenőrzést és Prisma/PostgreSQL-műveleteket
használ. A Prisma modul helyén ugyanannak a kapcsolatnak a tranzakciós kliense
szerepel, nem memóriabeli adatbázisutánzat. Két szervezetet és tesztfelhasználókat
hoz létre egy tranzakción belül, majd minden esetben visszagörgeti. A visszagörgetés
után külön lekérdezéssel ellenőrzi, hogy a tesztfelhasználó nem maradt meg.

Ellenőrzött esetek: valódi belépés és projekt/kör-választás, tagsági határok,
vendég/hibás/lejárt JWT, tagság visszavonása, UUID/státusz-validáció, ismételt
lezárás, nyilvános kommentolvasás/-létrehozás, ismételt linkvisszavonás hash nélkül.
A Node 24 tesztmodul-mock funkciója kísérleti figyelmeztetést írhat; ez nem teszthiba.

### Böngészős UI-próba valódi adatok módosítása nélkül

Futó Vite mellett nyisd meg a `/tests/developer.html` útvonalat. Az oldalon
feltüntetett fiktív belépőadatok csak a szimulált API-hoz tartoznak; nem valódi
fiók vagy JWT. A tesztbelépőpont nem része a production buildnek.

Próbáld ki a hibás/sikeres belépést, projekt- és körválasztást, üres kör/projekt
állapotot, a szűrőket, lezárást, lista-frissítést és kijelentkezést. A lap tetején
kapcsolható mentési/betöltési hiba és lejárt munkamenet. Hiba után ne változzon a
komment státusza; 401 után a belépőoldal térjen vissza, a kommentlista tűnjön el.

## Továbbra is meglévő teendők

A vendég cél-URL query/hash összefűzési hibája, a nyilvános kommentpayload teljes
validációja, projekt-domain/CORS-ellenőrzés, rate limiting és a duplikált public
route-regisztrációk nem változtak. Az SDK koordinátás fallbackjének és SPA-kezelésének
korlátai szintén megmaradtak. Ezeket külön feladatban érdemes javítani.

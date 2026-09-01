# Többoldalas review session és fejlesztői előnézet

## Session életciklus

Az SDK az URL `rf_session` paraméterét részesíti előnyben. Sikeres backend-
ellenőrzés után a tokent az aktuális böngészőlap `sessionStorage` tárába menti,
majd eltávolítja a látható URL-ből úgy, hogy a pathname, a többi query paraméter
és a hash megmaradjon. Teljes lapbetöltéskor ugyanabból a tárból állítja vissza.

A tárolókulcs az API originje és a projektkulcs alapján névterezett. A token nem
kerül `localStorage`-ba és továbbra sem kerül nyersen az adatbázisba. 403, 404 vagy
410 válasz esetén az SDK törli az aktív tokent és lebontja a review UI-t. Átmeneti
hálózati vagy szerverhiba esetén nem törli a sessiont, így újrapróbálható.

## Böngészés és kommentelés

A toolbar két explicit módot ad:

- **Böngészés**: alapértelmezett; az SDK nem fogja meg a linkeket, gombokat vagy
  űrlapokat, és nem rajzol elemkiemelést.
- **Kommentelés**: az elemkijelölő aktív; a kattintás célpontot választ és
  megakadályozza a céloldal eredeti műveletét.

Az SDK saját Shadow DOM felületére érkező kattintásokat egyik esetben sem kezeli
céloldali elemként.

## Útvonalváltás

Az SDK keretrendszertől függetlenül figyeli a `history.pushState`,
`history.replaceState` és `popstate` eseményeket. Pathname-változáskor bezárja a
tranziens kommentfelületet, törli a korábbi oldal pinjeit, és lekéri az új oldal
kommentjeit. Új komment létrehozásakor mindig az aktuális
`window.location.pathname` kerül elküldésre.

Teljes oldalas navigációnál az új SDK-példány a `sessionStorage` alapján folytatja
a sessiont. Más originre való navigálás nem ad jogosultságot annak az originnek:
a backend pontos allowed-origin ellenőrzése marad a mérvadó.

Az `init()` által visszaadott `destroy()` eltávolítja a toolbart, panelt, pineket,
kijelölőt és route-listenereket, valamint visszaállítja a becsomagolt history
függvényeket. Ismételt inicializálás nem hagy párhuzamos SDK-példányokat.

## Fejlesztői előnézeti API

```text
POST /api/rounds/:id/preview
Authorization: Bearer <developer JWT>
```

A végpont csak hitelesített, az adott review kör szervezetéhez hozzáférő
fejlesztőnek hoz létre új, egyórás ReviewLinket. A kérés nem fogad egyedi
lejáratot. A válasz létrehozáskor egyszer tartalmazza a nyers tokent, a cél-URL-t,
az azonosítót és az időpontokat. Az adatbázisban továbbra is kizárólag a token
SHA-256 hash-e tárolódik; régi link nyers tokenje nem állítható vissza.

A fejlesztői oldalon a **Megnyitás review módban** gomb ezt a végpontot hívja,
majd a natív `URL` API-val beállítja az `rf_session` paramétert és új lapon nyitja
meg a review kör céloldalát. A meglévő query és hash részek megmaradnak.

## Éles kézi ellenőrzés

1. A fejlesztői felületen válaszd ki a projektet és a review kört.
2. Kattints a **Megnyitás review módban** gombra; a céloldal új lapon nyíljon meg.
3. Böngészési módban navigálj egy másik belső React útvonalra. A ReviewFlow
   maradjon aktív, a korábbi oldal pinjei tűnjenek el, az új oldaléi töltődjenek be.
4. Válts kommentelési módra, és hozz létre kommentet. A fejlesztői oldalon annak
   pathname értéke az új útvonal legyen.
5. Navigálj vissza, majd frissítsd az oldalt. A session és az adott oldal pinjei
   álljanak helyre.
6. Zárd be a lapot, majd nyisd meg a céloldalt normál URL-lel új lapon. ReviewFlow
   ne induljon el.
7. Vond vissza az előnézeti linket vagy várd meg az egyórás lejáratot; ezután a
   tárolt session ne inicializálja a review módot.

## Üzemeltetési megjegyzések

- Ehhez a mérföldkőhöz nem tartozik adatbázis-migráció.
- Az új SDK-modulokat (`reviewSession.js`, `navigation.js`, `toolbar.js`) az
  `index.js` fájllal együtt kell publikálni.
- A `sessionStorage` bearer tokent az azonos originen futó XSS elérheti; a
  céloldal CSP-je, függőségeinek biztonsága és biztonságos DOM-kezelése fontos.
- Ha a céloldal egy másik könyvtára az SDK inicializálása után felülírja a history
  függvényeket, az ilyen egyedi navigáció nem biztos, hogy észlelhető. A szokásos
  React Router használat támogatott.

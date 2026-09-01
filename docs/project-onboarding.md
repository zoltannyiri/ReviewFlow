# Valódi weboldal hozzáadása

## Használat

1. A `/developer` felületen kattints az **Új projekt hozzáadása** gombra.
2. Válassz saját szervezetet, add meg a projekt nevét és teljes URL-jét.
   Külső oldalhoz HTTPS kell; helyi fejlesztésnél HTTP loopback cím is használható.
3. A mentés atomikusan létrehozza a projektet és az első DRAFT review kört.
   A cél-URL originje (protokoll + host + port) lesz az engedélyezett origin.
4. Másold be a generált SDK-kódot a céloldalba, majd telepítsd újra a projektedet.
5. Generálj ügyféllinket: 7 nap, 30 nap vagy visszavonásig érvényes lehet.
6. Másold ki a linket. A teljes URL csak létrehozáskor érhető el; körváltás vagy
   lapfrissítés után nem állítható vissza a szerveren tárolt hash-ből.
7. Nyisd meg a linket, majd a meghívóoldalon a **Review megnyitása** hivatkozást.
   Az ügyfél a tényleges weboldalon kommentel, nem annak képén vagy másolatán.
8. Frissítsd a kapcsolat állapotát a fejlesztői oldalon. Sikeres SDK-bejelentkezés
   esetén látszik az időpont és az origin. A kommentek a **Lista frissítése** gombbal tölthetők be.
9. A **Megnyitás review módban** gomb hitelesített fejlesztőként új, egy óráig
   érvényes előnézeti linket készít és új lapon megnyitja a review kör céloldalát.
   Nem próbálja visszaállítani egy korábbi ügyféllink nyers tokenjét.

### Vercel és localhost ugyanabban a projektben

Nem kell ugyanazt a munkát két ReviewFlow-projektként felvenni. Válaszd ki a
projektet, majd a **Hol fusson a véleményezés?** kártyán add hozzá a másik pontos
origint, például `http://localhost:5173`. Ezt csak a szervezet tulajdonosa vagy
adminisztrátora teheti meg. A már review kör által használt origin addig nem
távolítható el, amíg az adott kör létezik.

Ezután az **Új review kör indítása** kártyán add meg a kör nevét és a teljes
cél-URL-t, például `http://localhost:5173/checkout`. A cél-URL originjének szerepelnie
kell a projekt engedélyezett listáján. A rendszer növekvő verziószámú DRAFT kört
hoz létre, automatikusan kiválasztja, és külön ügyféllinket, kapcsolatállapotot és
megjegyzéslistát kezel hozzá. Szervezeti tag létrehozhat kört a már jóváhagyott
originek valamelyikén, de új origint nem engedélyezhet.

Az aktív link visszavonható. Új link generálása nem vonja vissza a korábbiakat.
A link birtokosa fiók nélkül hozzáfér a saját review körének visszajelzéseihez.

Ez URL-alapú összekapcsolás, nem GitHub/Vercel-fiókimport vagy forráskód-másolás.
Az SDK-t a fejlesztőnek egyszer be kell építenie. A céloldal saját belépését vagy
Vercel-védelmét a ReviewFlow nem kerüli meg.

## Beépítés és külső elérés

Az API a nyilvános SDK ES-moduljait a `/sdk/` útvonalon szolgálja ki; nincs szükség
publikált npm-csomagra. A kód a `/sdk/index.js` modult importálja, majd az `apiUrl`
és a nyilvános `projectKey` átadásával inicializál. A kulcs önmagában nem jogosít
hozzáférésre: érvényes review token is kell. Token nélkül nincs SDK-felület vagy kapcsolatjelzés.

Statikus oldalnál a kód a közös HTML body végére kerülhet. React/Next.js alkalmazásban
böngészőoldali inicializálás szükséges, megszüntetéskor a példány `destroy()`
metódusával. Ne hívd szerveroldali rendereléskor. A CSP-ben az SDK-modulokat
(`script-src`) és az API-kéréseket (`connect-src`) is engedélyezni kell; szigorú
CSP esetén az inline scripthez nonce/hash vagy külön engedélyezett modul szükséges.

Külső ügyfél számára mindkét ReviewFlow szolgáltatás legyen elérhető:

| Beállítás | Jelentés |
| --- | --- |
| Backend `FRONTEND_URL` | A ReviewFlow webes felületének publikus HTTPS originje. Ez adja az `/r/...` link alapját és a fejlesztői CORS-origint. |
| Web `VITE_API_URL` | A publikus HTTPS API teljes címe, `/api` végződéssel. Build idején kerül a frontendbe és a beépítési kódba. |
| Backend deployment | Tartalmazza a `backend` mellett a `packages/client/src` könyvtárat is, azonos repository-elrendezésben. |
| Frontend hosting | Az `/r/*` és `/developer` címeket a SPA belépőpontjára kell irányítania. |

Külső cél-URL és helyi konfiguráció esetén figyelmeztetés jelenik meg. A localhost
az ügyfél saját gépére mutat, nem a fejlesztő szerverére. A jelenlegi publikus
frontend `https://reviewflow.zoltannyiri.hu`, az API és az SDK originje pedig
`https://api.reviewflow.zoltannyiri.hu`. A kód élesítése továbbra is a meglévő
CI/CD-folyamaton keresztül történik.

## Biztonsági határok

- Saját szervezeti tagság kell; idegen szervezetbe nem hozható létre projekt.
  Hibás kérés nem hagy félkész projektet az első kör nélkül.
- A projekt originlistáját csak OWNER vagy ADMIN módosíthatja. Legfeljebb húsz,
  normalizált és pontos origin tárolható; duplikátumok nem maradnak a listában.
- Új vagy módosított review kör csak a projekt engedélyezett originjére mutathat.
  A már használt origin eltávolítását az API ütközésként elutasítja.
- HTTPS kötelező, kivéve `localhost`, `127.0.0.1`, `[::1]` HTTP-címek.
  URL-be ágyazott felhasználónév/jelszó és nem HTTP(S) protokoll tiltott.
- A cél-URL query és hash része megmarad; a régi `rf_session` lecserélődik.
- A böngészős vendég API a projekt pontos originjére korlátozott. Nincs
  `*.vercel.app` engedély. A régi üres allowlist és hostname bejegyzések a review
  kör pontos originjére korlátoznak, nem tetszőleges portra vagy aldomainre.
- A ReviewFlow frontend olvashatja a meghívó metaadatait, de ettől még nem kap
  vendég hozzáférést más origin komment API-jához.
- A CORS nem hitelesítés és nem domain-tulajdonjog igazolása. Nem böngészős kliensek
  az Origint elhagyhatják/hamisíthatják; a titkos review token a jogosultság alapja.
- A kapcsolatjelzéshez érvényes token, megfelelő projektkulcs és engedélyezett
  Origin kell. A kijelzett időpont az utolsó sikeres API-kapcsolat, nem élő
  monitoring vagy a teljes weboldal hibátlan működésének bizonyítéka.
- Régi, kulcs nélkül inicializált SDK továbbra is működhet, de nem küld kapcsolatjelzést.
- A teljes link nem kerül tartós frontend tárolóba. Az API-válaszok `no-store`
  fejlécet kapnak. A vendéglinket kezeld hozzáférési titokként.
- Az aktív vendégtoken csak az adott böngészőlap `sessionStorage` tárába kerül.
  Ez teljes lapbetöltésen át megőrzi, de új lapnak és más originnek nem adja át.
  Azonos originen futó XSS hozzáférhet, ezért a céloldal XSS-védelme és CSP-je fontos.
- A fejlesztői előnézet új, egyórás linket készít a meglévő hash-only tárolással;
  hitelesítés és szervezeti jogosultság nélkül nem használható.

## Migráció és tesztek

A `20260831160000_add_sdk_connection` migráció két opcionális mezőt ad a review
körhöz: `sdkLastSeenAt`, `sdkLastOrigin`. Meglévő adatot nem töröl. Helyben már
alkalmazva, a Prisma kliens újragenerálva; a korábban futó backendet indítsd újra.
Más környezetben a backend könyvtárából futtasd a `npx prisma migrate deploy`
és `npx prisma generate` parancsokat.

A repository gyökeréből:

```powershell
npm --prefix backend test
npm --prefix backend run test:integration
npm --prefix packages/client test
npm --prefix web run lint
npm --prefix web run build
npm --prefix packages/client run test:browser
```

Az SDK tesztoldalán (`http://127.0.0.1:5174/tests/browser.html`) 40 sikeres teszt
az elvárt. A `/tests/developer.html` mock API-val projektfelvételt, linkgenerálást,
visszavonást, több origin kezelését, új review kör létrehozását és kapcsolható
mentési hibát is támogat.

Valódi HTTP/Prisma/PostgreSQL böngészős teszt, kizárólag loopback portokon:

```powershell
# 1. terminál, backend könyvtár:
node --experimental-test-module-mocks tests/setup.browser-server.js

# 2. terminál, web könyvtár:
$env:VITE_API_URL='http://127.0.0.1:5001/api'
npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

A konzolban kiírt eldobható tesztfiókkal nyisd meg a `http://127.0.0.1:5175/developer`
oldalt. Cél-URL: `http://127.0.0.1:5002/site?lang=hu#pricing`. A szerver kizárólag
a saját ideiglenes projektjének kulcsát köti be ebbe a külön originű mintaoldalba.
Ellenőrizhető a projekt → link → vendégoldal → SDK → komment → válasz → visszavonás folyamat.
Az első terminálban Enterrel állítsd le: a tranzakció visszagörgetődik, majd
ellenőrzi a tesztfiók eltűnését. Legfeljebb 15 percig fut. A közös tranzakciós
kliens párhuzamos tesztkérései pg deprecation warningot adhatnak; ez nem teszthiba.

## Következő feladatok

A többoldalas session és az SPA-útvonalváltás elkészült. A következő ellenőrzés a
publikus ReviewFlow környezetben a `turazzvelunk.vercel.app` több valódi React
útvonala közötti kézi próba. Értesítés, nyilvános API rate limit és a régi
kommentpayload teljes validációja továbbra is külön feladat.

A session-, navigációs és előnézeti működés részleteit, valamint az éles kézi
tesztet a `docs/multi-page-review.md` írja le.

export const runReplyBrowserChecks = async ({ test, assert, settle, sdkRoot, getReplyCount, reinitialize }) => {
  const card = (id) => sdkRoot().querySelector(`[data-reviewflow-comment-id="${id}"]`);
  const write = (id, value) => {
    const textarea = card(id).querySelector('textarea');
    textarea.value = value;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const open = () => sdkRoot().querySelector('[aria-haspopup="dialog"]').click();

  await test('Az SDK megjeleníti a fejlesztő válaszát és szerepét', () => {
    open();
    assert(card('1').textContent.includes('Mekkora méretet szeretnél?'), 'Missing developer reply');
    assert(card('1').textContent.includes('Teszt fejlesztő'), 'Missing author');
    assert(card('1').textContent.includes('Fejlesztő'), 'Missing role');
  });
  await test('A vendég válaszvázlata panelbezárás után is megmarad', () => {
    write('1', 'Félkész vendégválasz');
    sdkRoot().querySelector('[aria-label="Kommentpanel bezárása"]').click();
    open();
    assert(card('1').querySelector('textarea').value === 'Félkész vendégválasz', 'Lost draft');
  });
  await test('Hibás válaszküldésnél a szöveg megmarad és a gomb újra használható', async () => {
    document.getElementById('fail-save').checked = true;
    card('1').querySelector('button').click();
    await settle();
    assert(card('1').querySelector('textarea').value === 'Félkész vendégválasz', 'Lost failed draft');
    assert(card('1').querySelector('[role="alert"]').textContent.includes('nem sikerült'), 'Missing error');
    assert(!card('1').querySelector('button').disabled, 'Retry disabled');
    document.getElementById('fail-save').checked = false;
  });
  await test('Egy kattintássorozat egy választ ment, a pinszám és más vázlat nem változik', async () => {
    write('2', 'Másik komment félkész válasza');
    write('1', '<img src=x onerror=alert(1)>\nNagyobbat szeretnék.');
    const before = getReplyCount();
    const pinCount = sdkRoot().querySelector('[aria-haspopup="dialog"]').textContent;
    const button = card('1').querySelector('button');
    button.click();
    button.click();
    await settle();
    assert(getReplyCount() === before + 1, 'Duplicate reply request');
    assert(card('1').querySelector('textarea').value === '', 'Sent draft not cleared');
    assert(card('1').textContent.includes('Nagyobbat szeretnék.'), 'Reply not rendered');
    assert(card('1').textContent.includes('Ügyfél'), 'Missing guest label');
    assert(!card('1').querySelector('img'), 'Unsafe HTML');
    assert(card('2').querySelector('textarea').value === 'Másik komment félkész válasza', 'Other draft lost');
    assert(sdkRoot().querySelector('[aria-haspopup="dialog"]').textContent === pinCount, 'Reply counted as pin');
  });
  await test('Válasz megoldott kommenthez is írható, automatikus újranyitás nélkül', async () => {
    write('3', 'Ellenőriztem, rendben van.');
    card('3').querySelector('button').click();
    await settle();
    assert(card('3').textContent.includes('RESOLVED'), 'Status changed');
    assert(card('3').textContent.includes('Ellenőriztem, rendben van.'), 'Missing resolved reply');
  });
  await test('Az SDK újrainicializálásakor a válaszok visszatöltődnek', async () => {
    reinitialize();
    await settle();
    open();
    assert(card('1').textContent.includes('Nagyobbat szeretnék.'), 'Reply not restored');
    assert(card('3').textContent.includes('Ellenőriztem, rendben van.'), 'Resolved reply not restored');
  });
};

/* libretaw-plugin
{
  "id": "example.message-counter",
  "name": "Счётчик сообщений",
  "version": "1.0.0",
  "author": "libretaw",
  "description": "Считает входящие сообщения за день. Команда /stats показывает итог.",
  "permissions": ["messages.read", "storage", "commands", "toast"]
}
*/

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Каждое входящее сообщение увеличивает счётчик за сегодня.
libretaw.on('message', async (msg) => {
  const key = 'count:' + today();
  const n = (await libretaw.storage.get(key)) || 0;
  await libretaw.storage.set(key, n + 1);
});

// /stats  ->  всплывающее сообщение с числом сообщений за сегодня.
libretaw.commands.add('stats', 'Сколько сообщений сегодня', async () => {
  const n = (await libretaw.storage.get('count:' + today())) || 0;
  libretaw.ui.toast('Сегодня входящих сообщений: ' + n);
});

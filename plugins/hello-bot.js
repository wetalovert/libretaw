/* libretaw-plugin
{
  "id": "example.hello-bot",
  "name": "Привет-бот",
  "version": "1.0.0",
  "author": "libretaw",
  "description": "Команды /hello, /dice и /time. Отвечают в том же чате.",
  "permissions": ["commands", "messages.send", "toast"]
}
*/

// /hello Вася  ->  "Привет, Вася!"
libretaw.commands.add('hello', 'Поздороваться', (args, ctx) => {
  libretaw.chat.send(ctx.chatId, 'Привет, ' + (args || 'друг') + '!');
});

// /dice  ->  случайное число от 1 до 6
libretaw.commands.add('dice', 'Бросить кубик', (args, ctx) => {
  const n = 1 + Math.floor(Math.random() * 6);
  libretaw.chat.send(ctx.chatId, '🎲 Выпало: ' + n);
});

// /time  ->  текущее время на вашем устройстве
libretaw.commands.add('time', 'Показать время', (args, ctx) => {
  libretaw.chat.send(ctx.chatId, '🕒 Сейчас ' + new Date().toLocaleTimeString());
});

libretaw.ui.toast('Привет-бот включён: /hello, /dice, /time');

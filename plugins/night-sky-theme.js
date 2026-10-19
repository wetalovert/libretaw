/* libretaw-plugin
{
  "id": "example.night-sky",
  "name": "Ночное небо",
  "version": "1.0.0",
  "author": "libretaw",
  "description": "Меняет цвета приложения на глубокий синий с розовым акцентом.",
  "permissions": ["theme"]
}
*/

// Имена переменных можно писать с -- или без: 'pri' и '--pri' одно и то же.
libretaw.theme.setVars({
  'pri': '#ff8fb3',
  'on-pri': '#3a0020',
  'pc': '#5b1f3f',
  'on-pc': '#ffd9e6',
  'sec-c': '#2b3a67',
  'on-sec-c': '#dbe4ff',
  'surface': '#0b1020',
  'sc-low': '#10172b',
  'sc': '#141c33',
  'sc-high': '#1a2340',
  'sc-highest': '#212b4c',
  'on-surface': '#e6e9f5',
  'osv': '#aab3d1'
});

"""Пример: собираем свой шрифт из простых геометрических букв (Python + fontTools).

Установка:  pip install fonttools
Запуск:     python make_font.py
Результат:  my-font.ttf (его можно загрузить в libretaw: Настройки → Кастомизация → Шрифт)

Этот пример рисует только несколько латинских букв-блоков, чтобы показать принцип.
Для настоящего шрифта рисуйте glyph-контуры в FontForge или Glyphr Studio (см. Как-создать-свой-шрифт.md).
"""
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

UPM = 1000                       # размер em-квадрата
ASCENDER, DESCENDER = 800, -200  # вертикальные метрики

def box(pen, x0, y0, x1, y1):
    """Квадрат по часовой стрелке (контур TrueType)."""
    pen.moveTo((x0, y0)); pen.lineTo((x0, y1)); pen.lineTo((x1, y1)); pen.lineTo((x1, y0)); pen.closePath()

def glyph_block(width=600):
    pen = TTGlyphPen(None)
    box(pen, 60, 0, width - 60, 700)          # прямоугольник «буквы»
    return pen.glyph()

# Глифы: .notdef (пустой символ), пробел и буквы A–Z (одинаковые блоки для примера)
letters = {chr(c): f"uni{c:04X}" for c in range(ord("A"), ord("Z") + 1)}
glyph_order = [".notdef", "space"] + list(letters.values())

fb = FontBuilder(UPM, isTTF=True)
fb.setupGlyphOrder(glyph_order)
fb.setupCharacterMap({0x20: "space", **{ord(ch): name for ch, name in letters.items()}})

glyphs = {".notdef": TTGlyphPen(None).glyph(), "space": TTGlyphPen(None).glyph()}
for name in letters.values():
    glyphs[name] = glyph_block()
fb.setupGlyf(glyphs)
fb.setupHorizontalMetrics({n: (600, 0) for n in glyph_order})
fb.setupHorizontalHeader(ascent=ASCENDER, descent=DESCENDER)
fb.setupNameTable({"familyName": "My Demo Font", "styleName": "Regular"})
fb.setupOS2(sTypoAscender=ASCENDER, sTypoDescender=DESCENDER, usWinAscent=ASCENDER, usWinDescent=-DESCENDER)
fb.setupPost()
fb.save("my-font.ttf")
print("Готово: my-font.ttf")

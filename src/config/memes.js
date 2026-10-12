export const memeContent = {
  names: ['mamyn_selyk', 'cawko_1488', 'hrusa'],
  subtitle: 'НАФОР',
  ui: {
    start: 'ГО БАНАНА НАЖИМАЙ СТАРТ', controls: 'с МИ НІХУЯ НЕ ПЛАТИМ',
    restart: 'УМЕР ЗАНОВО', next: 'В НОВУ ПАЛАТУ',
    defeat: 'МИ НІХУЯ НЕ ПЛАТИМ ВНАТУРІ НІХУЯ БАНЮ СТАВИШ',
    completed: 'МИ НІХУЯ НЕ ПЛАТИМ БАНЮ СТАВИШ',
  },
  words: ['ХУЙЛ', 'БОРК', 'БАБАНА', 'НАРАЗ', 'ОВОЩЬ', 'ПЕТРОВИЧ', 'ВАДІМ', 'ДЦК', 'ОБРЕЗ', 'НАСЦЯВ НА КАМНІ', 'ДИРЕКТОР ВОЗДУХА', 'ЛІЛ ДЖЕЗУС', 'КОНЧА', 'МАКС КРАВЧУК', 'ПОВНИЙ БАК', 'ТАТАРІВ', 'ВОЗНЯ', 'МЕЛСТРОЙ', 'ВАЗГЕН', 'ВИСЕМИР', 'ВОЛИНЬ1943', 'ВЕДЬМАК3', 'ГТА6ПОРНО'],
  short: ['СЄРГЄЙ!', 'ПЕТРОВИЧА МОБНУЛИ', 'РІДНА КРАААЙ', 'ВАДІІМММ', 'КАМНІІ', 'ПОШЛА ВОЗНЯ'],
  large: ['ПОЛУЧИ ФАШИСТ ГРАНАТУ ОТ СОВЕЦКОГО СОЛДАТА БЛЯ'],
  rewards: [
    'пр з дн. будь здоров. миронівна. (від ілюхи)',
    'ПЕТРОВИЧ ПЕРЕДАВ ПРИВЕТ. ВОЗНЯ ПРОДОЛЖАЕТСЯ',
    'ВСЕМИР ПОБЕЖДЁН. ПОСЛЕДНЯЯ ВОЗНЯ ВПЕРЕДИ',
  ],
  final: {
    title: 'ИГРА ПРОЙДЕНА', greeting: 'С ДНЁМ РОЖДЕНИЯ, НАФОР!!!!',
    friends: 'ИЛЮХА (САМИЙ СВЕЖИЙ, Botega boy), СТАС (julisius + син КАПА), НАРАЗ (ФРУКТ), ДАНИК (ДИРЕКТОР ВОЗДУХА)',
    soundtrack: 'final/soundtrack.mp3',
  },
};
export const pick = (items, random = Math.random) => items[Math.floor(random() * items.length)];
export const memeCombination = () => `${pick(memeContent.words)} · ${pick(memeContent.words)}`;

// Pure schedule: large phrases are spaced by 3–5 defeated enemies.
export class MemePhraseSequence {
  constructor(random = Math.random) { this.random = random; this.remaining = this.gap(); }
  gap() { return 3 + Math.floor(this.random() * 3); }
  next() {
    const short = pick(memeContent.short, this.random);
    if (--this.remaining > 0) return { short, large: null };
    this.remaining = this.gap();
    return { short, large: pick(memeContent.large, this.random) };
  }
}

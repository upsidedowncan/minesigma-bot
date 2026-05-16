export const GITHUB_OWNER = "upsidedowncan";
export const GITHUB_REPO = "minesigma-bot";
export const REPO_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;
export const RELEASE_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

export const installers = [
  { key: "bun", label: "Bun", install: "bun install", run: "bun run dev" },
  { key: "npm", label: "npm", install: "npm install", run: "npm run dev" },
  { key: "pnpm", label: "pnpm", install: "pnpm install", run: "pnpm run dev" },
  { key: "yarn", label: "Yarn", install: "yarn install", run: "yarn dev" }
] as const;

export type InstallerKey = (typeof installers)[number]["key"];

export type CommandEntry = {
  syntax: string;
  description: string;
  aliases?: string[];
};

export type CommandGroup = {
  id: string;
  section: string;
  title: string;
  summary: string;
  commands: CommandEntry[];
};

export const commandDocs: CommandGroup[] = [
  {
    id: "management",
    section: "Управление",
    title: "Управление ботами",
    summary: "Создание, удаление, состояние и базовый контроль сессии.",
    commands: [
      {
        syntax: "bot summon <count>",
        description: "Создаёт указанное количество ботов (от 1 до 25). Первый бот получает имя из конфига, остальные — с суффиксом `_N`. Боты подключаются к серверу из настроек с задержкой 250 мс между каждым.",
        aliases: ["bot add <n>", "bot spawn <n>"]
      },
      {
        syntax: "bot despawn",
        description: "Отключает всех ботов и останавливает спаммер. Полностью очищает список ботов и сбрасывает состояние в idle.",
        aliases: ["bot kickbots", "bot remove all", "bot clear all", "bot clear bots"]
      },
      {
        syntax: "bot status",
        description: "Возвращает строку состояния: текущий статус (idle/online/connecting/error/kicked), флаг подключения, количество ботов и для каждого — имя, HP и еду.",
        aliases: []
      },
      {
        syntax: "bot players",
        description: "Возвращает отсортированный список ников всех игроков, видимых боту на сервере. Если никого нет — 'No players visible'.",
        aliases: ["bot list players"]
      },
      {
        syntax: "bot logout",
        description: "Отключает всех ботов с причиной 'Logout requested' и сбрасывает состояние в idle.",
        aliases: []
      },
      {
        syntax: "bot reconnect",
        description: "Полностью перезапускает всех ботов: сначала despawn, затем spawn одного бота. Эквивалентно последовательному вызову bot despawn + bot summon 1.",
        aliases: []
      }
    ]
  },
  {
    id: "chat",
    section: "Чат",
    title: "Чат и сообщения",
    summary: "Публичные сообщения, личные сообщения и DM.",
    commands: [
      {
        syntax: "bot say <text>",
        description: "Отправляет указанный текст в общий чат от имени всех ботов. Если текст пустой — отправляет '...'.",
        aliases: ["bot chat <text>"]
      },
      {
        syntax: "bot message <player> <text>",
        description: "Отправляет личное сообщение (whisper) указанному игроку от имени всех ботов. Использует серверную команду /msg. Требует ник цели и текст сообщения.",
        aliases: ["bot msg <player> <text>", "bot tell <player> <text>", "bot dm <player> <text>", "bot pm <player> <text>", "bot whisper <player> <text>"]
      }
    ]
  },
  {
    id: "movement",
    section: "Движение",
    title: "Движение и поведение",
    summary: "Ходьба, прыжок, следование, охрана, атака и боевые режимы.",
    commands: [
      {
        syntax: "bot jump",
        description: "Заставляет всех ботов прыгнуть. Устанавливает состояние jump на 250 мс, затем сбрасывает.",
        aliases: []
      },
      {
        syntax: "bot forward <blocks>",
        description: "Двигает всех ботов вперёд на указанное количество блоков. Время движения рассчитывается как blocks * 350 мс (макс. 12 сек, мин. 200 мс).",
        aliases: ["bot move forward <blocks>", "bot walk forward <blocks>"]
      },
      {
        syntax: "bot back <blocks>",
        description: "Двигает всех ботов назад на указанное количество блоков. Аналогичный расчёт времени как у forward.",
        aliases: ["bot move back <blocks>", "bot walk back <blocks>"]
      },
      {
        syntax: "bot left <blocks>",
        description: "Стрейфит всех ботов влево на указанное количество блоков.",
        aliases: ["bot move left <blocks>", "bot walk left <blocks>"]
      },
      {
        syntax: "bot right <blocks>",
        description: "Стрейфит всех ботов вправо на указанное количество блоков.",
        aliases: ["bot move right <blocks>", "bot walk right <blocks>"]
      },
      {
        syntax: "bot stop",
        description: "Останавливает все движения, сбрасывает все control states (forward/back/left/right/jump/sprint/sneak) и прекращает все активные поведения (follow/guard/attack/spin). Также останавливает спаммер.",
        aliases: ["bot wait", "bot halt", "bot stop all"]
      },
      {
        syntax: "bot hold <0..8>",
        description: "Выбирает слот хотбара (0–8) для всех ботов без активации предмета. Бот просто переключает активный слот.",
        aliases: []
      },
      {
        syntax: "bot sneak on|off",
        description: "Включает или выключает приседание (sneak) для всех ботов. Принимает: on/true/yes/1 или off/false/no/0.",
        aliases: []
      },
      {
        syntax: "bot sprint on|off",
        description: "Включает или выключает бег (sprint) для всех ботов. Принимает: on/true/yes/1 или off/false/no/0.",
        aliases: []
      },
      {
        syntax: "bot follow <player>",
        description: "Заставляет всех ботов следовать за указанным игроком. Боты постоянно смотрят на цель, идут к ней и автоматически прыгают при препятствиях. Используют спринт на дистанции > 3.5 блоков. Если бот застревает — включает стрейф для освобождения.",
        aliases: ["bot come <player>"]
      },
      {
        syntax: "bot come <player>",
        description: "Алиас для bot follow. Дополнительно: если команда отправлена из чата без указания цели, бот автоматически подставляет ник отправителя.",
        aliases: []
      },
      {
        syntax: "bot look <player>",
        description: "Заставляет всех ботов посмотреть на указанного игрока (на уровне глаз, +1.6 по Y). Одноразовое действие, не запускает поведение.",
        aliases: []
      },
      {
        syntax: "bot guard <player>",
        description: "Режим охраны: бот следует за целью на дистанции до 3.5 блоков, затем останавливается и смотрит на ближайших враждебных игроков в радиусе 4 блоков от цели. Если врагов нет — смотрит на защищаемого игрока.",
        aliases: []
      },
      {
        syntax: "bot spin",
        description: "Поворачивает всех ботов на 90° вправо (yaw + π/2). Одноразовое действие.",
        aliases: []
      },
      {
        syntax: "bot spin <player>",
        description: "Заставляет всех ботов кружить вокруг указанного игрока по радиусу 2.7 блоков. Боты постоянно смотрят на цель и движутся по кругу с шагом угла 0.22 рад каждые 120 мс.",
        aliases: ["bot circle <player>"]
      },
      {
        syntax: "bot attack",
        description: "Режим атаки: боты атакуют ближайшего игрока (кроме себя). Автоматически экипируют лучшее оружие (приоритет: netherite_sword → diamond_sword → iron_sword → stone_sword → golden_sword → wooden_sword → топоры в том же порядке). Прыгают перед каждым ударом. Если цель дальше 3 блоков — идут к ней.",
        aliases: []
      },
      {
        syntax: "bot attack <player>",
        description: "То же что bot attack, но атакует конкретного игрока по нику вместо ближайшего.",
        aliases: []
      }
    ]
  },
  {
    id: "inventory",
    section: "Инвентарь",
    title: "Инвентарь и GUI",
    summary: "Выбор слота, использование предметов, клики по инвентарю и GUI-окнам.",
    commands: [
      {
        syntax: "click.item.slot.<0..8>",
        description: "Выбирает слот хотбара и активирует предмет (правый клик / использование). Удерживает активацию 200 мс. Применяется ко всем ботам.",
        aliases: ["bot use <0..8>", "bot hotbar <0..8>"]
      },
      {
        syntax: "bot slot <index>",
        description: "Кликает по слоту с указанным индексом в текущем открытом GUI-окне. Требует, чтобы у первичного бота было открыто окно. Обновляет снимок GUI после клика.",
        aliases: ["bot click slot <index>"]
      }
    ]
  },
  {
    id: "world",
    section: "Мир",
    title: "Инструменты мира",
    summary: "Добыча блоков, установка блоков и мягкая очистка территории.",
    commands: [
      {
        syntax: "bot mine block",
        description: "Добывает блок, на который смотрит первичный бот (макс. дистанция 5 блоков). Не работает, если блок — воздух или вне досягаемости.",
        aliases: ["bot mine look"]
      },
      {
        syntax: "bot mine nearby <block_name> [count]",
        description: "Находит и добывает указанные блоки в радиусе 5 блоков от бота. count — количество блоков для добычи (от 1 до 10, по умолчанию 5). Требует точное имя блока из реестра Minecraft (например: stone, dirt, oak_log).",
        aliases: []
      },
      {
        syntax: "bot place <0..8>",
        description: "Устанавливает блок из указанного слота хотбара. Ищет блок-референс курсором (до 5 блоков) или под ногами бота. Ставит блок сверху референса.",
        aliases: []
      },
      {
        syntax: "bot clear soft [radius]",
        description: "Выкапывает мягкие блоки (трава, папоротник, снег, лоза, водоросли, dirt, sand, gravel и т.д.) в кубе вокруг бота. radius — радиус поиска (1 или 2, по умолчанию 1). Максимум 25 блоков за вызов.",
        aliases: []
      }
    ]
  },
  {
    id: "spammer",
    section: "Спаммер",
    title: "Спаммер",
    summary: "Автоматическая отправка сообщений с настраиваемым интервалом и лимитом.",
    commands: [
      {
        syntax: "bot spammer start <interval> <message> [--count <n>]",
        description: "Запускает спаммер. interval — интервал отправки: число с суффиксом ms/s/m (например: 3000ms, 3s, 1m). Допустимый диапазон: 1000 мс — 600000 мс (10 мин). message — текст сообщения. --count — опциональный лимит повторений (1–200), по умолчанию — бесконечно. Сообщения отправляются от всех ботов одновременно.",
        aliases: ["bot spammer on <interval> <message>"]
      },
      {
        syntax: "bot spammer stop",
        description: "Останавливает активный спаммер и сбрасывает таймер.",
        aliases: ["bot spammer off"]
      },
      {
        syntax: "bot spammer status",
        description: "Показывает текущее состояние спаммера: running/stopped, интервал, оставшееся количество сообщений (или 'forever'), и текст сообщения.",
        aliases: []
      }
    ]
  },
  {
    id: "gui",
    section: "GUI",
    title: "GUI-окна",
    summary: "Взаимодействие с открытыми контейнерами через веб-панель.",
    commands: [
      {
        syntax: "GUI Dialog (веб-панель)",
        description: "Открывается кнопкой 'Окно' в карточке Боты. Показывает Minecraft-стилизованное окно с предметами, изображениями из mc-heads.net, тултипами с редкостью и лором. Клик по слоту отправляет /api/gui/click. Показывает инвентарь и хотбар выбранного бота. Закрывается по Escape, клику вне окна или кнопке ×.",
        aliases: []
      }
    ]
  },
  {
    id: "chat-input",
    section: "Ввод из чата",
    title: "Команды из чата",
    summary: "Как отправлять команды через игровой чат и личные сообщения.",
    commands: [
      {
        syntax: "@bot <command>",
        description: "Прямое обращение к боту через упоминание в чате. Например: @bot follow Player. Бот распознаёт @bot и @minebot с опциональными двоеточиями/запятыми.",
        aliases: []
      },
      {
        syntax: "bot <command>",
        description: "Прямая команда с префиксом bot. Например: bot guard Player. Работает в чате и в личных сообщениях.",
        aliases: ["minebot <command>"]
      },
      {
        syntax: "#<command>",
        description: "Legacy-префикс. Команда после # выполняется как обычная команда. Например: #stop → bot stop.",
        aliases: ["*<command>"]
      },
      {
        syntax: "» @bot <command>",
        description: "Формат для серверов с плагинами чата, где сообщения выглядят как '» Player » @bot follow'. Бот извлекает команду после упоминания.",
        aliases: []
      },
      {
        syntax: "Автоподстановка цели",
        description: "Команды bot come и bot guard без указания цели автоматически подставляют ник отправителя. Например, если Player1 напишет 'bot come', бот начнёт следовать за Player1.",
        aliases: []
      },
      {
        syntax: "Админ-проверка",
        description: "Только игроки из списка admins в конфиге могут отправлять команды из чата. Не-админы получают ответ '[err] <ник> is not admin'. Проверка регистронезависимая.",
        aliases: []
      },
      {
        syntax: "Анти-спам",
        description: "Одинаковые команды от одного отправителя с интервалом менее 700 мс игнорируются. Это предотвращает двойное выполнение при дублировании сообщений сервером.",
        aliases: []
      }
    ]
  },
  {
    id: "raw-commands",
    section: "Сырые команды",
    title: "Сырые серверные команды",
    summary: "Любая нераспознанная команда отправляется как серверная команда от всех ботов.",
    commands: [
      {
        syntax: "<любой текст>",
        description: "Если команда не распознана как внутренняя, она отправляется в чат как серверная команда (с префиксом /, если его нет). Например: 'gamemode creative' → '/gamemode creative'. Применяется ко всем ботам одновременно.",
        aliases: []
      }
    ]
  }
];

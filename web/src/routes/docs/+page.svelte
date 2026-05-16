<script lang="ts">
  import { installers, REPO_URL, commandDocs, type CommandEntry } from "$lib/site";
  let activeInstaller = "bun";
</script>

<svelte:head>
  <title>Minesigma BOT Docs</title>
  <meta name="description" content="Полная документация по командам Minesigma BOT." />
</svelte:head>

<main class="wrap">
  <header class="topbar">
    <div class="brand">
      <span class="mark">MS</span>
      <span>Minesigma BOT</span>
    </div>
    <nav class="nav">
      <a href="/">главная</a>
      <a href={REPO_URL} target="_blank" rel="noreferrer">github</a>
    </nav>
  </header>

  <section class="hero">
    <div class="headline">
      <div class="eyebrow">Документация</div>
      <h1>Команды и поведение</h1>
      <p class="copy">
        Полный справочник всех команд бота: синтаксис, описание, алиасы и особенности работы.
        Команды можно отправлять через веб-панель, игровой чат или личные сообщения.
      </p>
      <div class="badges">
        <span class="badge">bot prefix</span>
        <span class="badge">чат и DM</span>
        <span class="badge">legacy # и *</span>
        <span class="badge">raw-команды</span>
      </div>
    </div>

    <aside class="download-card">
      <div>
        <div class="eyebrow">навигация</div>
        <p class="version">docs</p>
        <div class="date">все секции ниже</div>
      </div>
      <div class="status">
        Бот принимает команды из обычного чата, личных сообщений и старых префиксов
        <code>*</code> и <code>#</code>. Админ-проверка обязательна для чат-команд.
      </div>
      <div class="actions">
        <a class="button secondary" href="/">На главную</a>
        <a class="button" href={REPO_URL} target="_blank" rel="noreferrer">Открыть репозиторий</a>
      </div>
    </aside>
  </section>

  <section class="docs-shell">
    <aside class="docs-sidebar" aria-label="Навигация по документации">
      <div class="docs-toc">
        <h2>Содержание</h2>
        <nav>
          <a href="#start">Обзор</a>
          <a href="#chat-input">Ввод из чата</a>
          <a href="#install">Установка</a>
          {#each commandDocs as group}
            <a href={`#${group.id}`}>{group.title}</a>
          {/each}
        </nav>
      </div>
      <div class="docs-note">
        Бот принимает команды из обычного чата, личных сообщений и старых префиксов
        <code>*</code> и <code>#</code>. Команды без <code>bot</code>-префикса тоже
        обрабатываются, если чат-фильтр их распознал.
      </div>
    </aside>

    <div class="docs-content">
      <section class="docs-section" id="start">
        <h2>Обзор</h2>
        <p>
          Командная система разбита на управление ботами, чат, движение, инвентарь,
          мир, спаммер и GUI. Для совместимости поддерживаются синонимы вроде
          <code>add</code>, <code>remove</code>, <code>move</code>, <code>chat</code>,
          <code>dm</code>, <code>pm</code>, <code>whisper</code>, <code>use</code>,
          <code>hotbar</code>, <code>click slot</code>, <code>wait</code>, <code>halt</code>,
          <code>circle</code>, <code>list players</code> и <code>stop all</code>.
        </p>
        <div class="docs-commands">
          <div class="docs-command">
            <strong>Префикс</strong>
            <div><code>bot follow Player</code></div>
          </div>
          <div class="docs-command">
            <strong>Legacy</strong>
            <div><code>*stop</code></div>
          </div>
          <div class="docs-command">
            <strong>Публичный чат</strong>
            <div><code>[17:15:32] chat ... » bot guard Player</code></div>
          </div>
        </div>
      </section>

      <section class="docs-section" id="chat-input">
        <h2>Ввод из чата</h2>
        <p>
          Команды можно отправлять прямо из игрового чата. Бот распознаёт несколько форматов
          обращений. Только админы (список в конфиге) могут управлять ботом через чат.
        </p>
        <div class="command-table">
          <div class="ct-header">
            <span class="ct-col">Формат</span>
            <span class="ct-col">Пример</span>
            <span class="ct-col">Описание</span>
          </div>
          {#each [
            { fmt: "@bot &lt;command&gt;", ex: "@bot follow Player", desc: "Упоминание в чате" },
            { fmt: "bot &lt;command&gt;", ex: "bot guard Player", desc: "Прямой префикс" },
            { fmt: "#&lt;command&gt;", ex: "#stop", desc: "Legacy-префикс" },
            { fmt: "*&lt;command&gt;", ex: "*follow Player", desc: "Legacy-префикс" },
            { fmt: "» @bot &lt;command&gt;", ex: "» @bot come", desc: "Для плагинов чата" },
            { fmt: "&lt;любой текст&gt;", ex: "gamemode creative", desc: "Сырая серверная команда" }
          ] as row}
            <div class="ct-row">
              <code class="ct-col">{@html row.fmt}</code>
              <code class="ct-col">{row.ex}</code>
              <span class="ct-col">{row.desc}</span>
            </div>
          {/each}
        </div>
        <div class="docs-note" style="margin-top:12px;">
          <strong>Автоподстановка:</strong> <code>bot come</code> и <code>bot guard</code> без цели
          автоматически подставляют ник отправителя. <strong>Анти-спам:</strong> одинаковые команды
          от одного игрока с интервалом &lt; 700 мс игнорируются.
        </div>
      </section>

      <section class="docs-section" id="install">
        <h2>Установка</h2>
        <p>Сайт использует Bun. Для локального запуска подходят и другие менеджеры.</p>
        <div class="tabs" role="tablist" aria-label="Выбор пакетного менеджера">
          {#each installers as item}
            <button class="tab {activeInstaller === item.key ? 'active' : ''}" type="button" on:click={() => (activeInstaller = item.key)}>
              {item.label}
            </button>
          {/each}
        </div>
        {#each installers as item}
          <div class="tab-panel {activeInstaller === item.key ? 'active' : ''}">
            <div class="terminal">{item.install}
{item.run}
# открыть http://localhost:3000</div>
          </div>
        {/each}
      </section>

      {#each commandDocs as group}
        <section class="docs-section" id={group.id}>
          <h2>{group.title}</h2>
          <p>{group.summary}</p>
          <div class="command-list-detailed">
            {#each group.commands as command}
              <div class="command-card">
                <div class="command-header">
                  <code class="command-syntax">{command.syntax}</code>
                  {#if command.aliases && command.aliases.length > 0}
                    <span class="command-aliases">
                      {#each command.aliases as alias}
                        <code>{alias}</code>
                      {/each}
                    </span>
                  {/if}
                </div>
                <p class="command-desc">{command.description}</p>
              </div>
            {/each}
          </div>
        </section>
      {/each}

      <section class="docs-section">
        <h2>Примечание по безопасности</h2>
        <p>
          Админ-проверка выполняется по списку в конфиге. Если пользователь не записан
          как админ, команда из чата отклоняется с сообщением <code>[err] &lt;ник&gt; is not admin</code>.
          Проверка регистронезависимая. Через веб-панель админ-проверка не требуется —
          панель работает локально.
        </p>
      </section>
    </div>
  </section>
</main>

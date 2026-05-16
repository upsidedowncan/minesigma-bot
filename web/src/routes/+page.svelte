<script lang="ts">
  import { onMount } from "svelte";
  import { installers, REPO_URL, RELEASE_API_URL, type InstallerKey } from "$lib/site";

  type ReleaseAsset = {
    browser_download_url: string;
    name: string;
  };

  type ReleaseResponse = {
    tag_name?: string;
    name?: string;
    published_at?: string;
    body?: string;
    html_url?: string;
    zipball_url?: string;
    assets?: ReleaseAsset[];
  };

  let activeInstaller: InstallerKey = "bun";
  let releaseLabel = "загрузка...";
  let releaseDate = "проверяем GitHub Releases";
  let releaseStatus = "Получаем данные о последнем релизе...";
  let downloadLabel = "Скачать";
  let downloadHref = `${REPO_URL}/archive/refs/heads/main.zip`;
  let releaseHref = `${REPO_URL}/releases/latest`;

  const openInstaller = (key: InstallerKey) => {
    activeInstaller = key;
  };

  onMount(async () => {
    try {
      const response = await fetch(RELEASE_API_URL, { headers: { accept: "application/vnd.github+json" } });
      if (!response.ok) throw new Error(`GitHub вернул HTTP ${response.status}`);
      const release = (await response.json()) as ReleaseResponse;
      const asset = release.assets?.find((item) => /\.(zip|tar\.gz|tgz)$/i.test(item.name)) ?? release.assets?.[0];
      const version = String(release.tag_name || release.name || "latest").replace(/^v/i, "");

      releaseLabel = release.tag_name || release.name || "latest";
      releaseDate = release.published_at ? new Date(release.published_at).toLocaleString("ru-RU") : "релиз опубликован";
      releaseStatus = `${release.name || release.tag_name || "Последний релиз"}\n${asset ? `Файл: ${asset.name}` : "Используется исходный ZIP-архив GitHub"}\n${release.body ? release.body.slice(0, 220) : "Релиз готов к скачиванию."}`;
      releaseHref = release.html_url || `${REPO_URL}/releases/latest`;
      downloadLabel = `Скачать ${version}`;
      downloadHref = asset?.browser_download_url || release.zipball_url || downloadHref;
    } catch (error) {
      releaseLabel = "нет релиза";
      releaseDate = "последний релиз недоступен";
      releaseStatus = `${error instanceof Error ? error.message : String(error)}\nСоздай GitHub Release или используй скачивание main-ветки.`;
      downloadLabel = "Скачать main";
    }
  });
</script>

<svelte:head>
  <title>Minesigma BOT</title>
  <meta name="description" content="Скачать последнюю версию Minesigma BOT." />
</svelte:head>

<main class="wrap">
  <header class="topbar">
    <div class="brand">
      <span class="mark">MS</span>
      <span>Minesigma BOT</span>
    </div>
    <nav class="nav">
      <a href="/docs">docs</a>
      <a href="#download">скачать</a>
      <a href={REPO_URL} target="_blank" rel="noreferrer">github</a>
    </nav>
  </header>

  <section class="hero">
    <div class="headline">
      <div class="eyebrow">Bun + Mineflayer панель управления</div>
      <h1>Minesigma BOT</h1>
      <p class="copy">
        Локальный Minecraft-бот с веб-панелью, настройкой подключения, чат-командами,
        логами, инвентарём, макросами и админ-инструментами для приватных или
        тестовых миров.
      </p>
      <div class="badges">
        <span class="badge">Bun runtime</span>
        <span class="badge">Mineflayer</span>
        <span class="badge">Web UI</span>
        <span class="badge">GitHub Releases</span>
      </div>
    </div>

    <aside class="download-card" id="download">
      <div>
        <div class="eyebrow">последняя версия</div>
        <p class="version">{releaseLabel}</p>
        <div class="date">{releaseDate}</div>
      </div>
      <div class="status">{releaseStatus}</div>
      <div class="notice">
        Ссылка ведёт на последний релиз GitHub. Если asset не найден, откроется
        source zip.
      </div>
      <div class="actions">
        <a class="button {downloadLabel === 'Скачать' ? 'disabled' : ''}" href={downloadHref}>{downloadLabel}</a>
        <a class="button secondary" href={releaseHref} target="_blank" rel="noreferrer">Что изменилось</a>
      </div>
    </aside>
  </section>

  <section class="strip" aria-label="Краткая сводка">
    <div class="metric"><strong>1</strong><span>локальная панель управления</span></div>
    <div class="metric"><strong>25</strong><span>максимум ботов за summon</span></div>
    <div class="metric"><strong>1s+</strong><span>минимальный интервал спаммера</span></div>
    <div class="metric"><strong>2</strong><span>радиус clear soft</span></div>
  </section>

  <section class="grid">
    <article class="panel wide">
      <h2>Что внутри</h2>
      <p>
        Minesigma BOT запускается локально и открывает браузерную панель. Через неё
        можно менять сервер, ник, авторизацию, запускать и останавливать бота,
        смотреть чат, GUI-окна и инвентарь.
      </p>

      <div class="tabs" role="tablist" aria-label="Выбор пакетного менеджера">
        {#each installers as item}
          <button class="tab {activeInstaller === item.key ? 'active' : ''}" type="button" on:click={() => openInstaller(item.key)}>
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
    </article>

    <article class="panel">
      <h2>Скачать и запустить</h2>
      <div class="steps">
        <div class="step" data-step="1">
          <div class="step-body">
            <div class="step-line">Нажми кнопку скачивания и распакуй релиз.</div>
          </div>
        </div>
        <div class="step" data-step="2">
          <div class="step-body">
            <div class="step-line">Выбери удобный пакетный менеджер во вкладках.</div>
          </div>
        </div>
        <div class="step" data-step="3">
          <div class="step-body">
            <div class="step-line">Запусти панель и открой</div>
            <div class="box">http://localhost:3000</div>
          </div>
        </div>
      </div>
    </article>

    <article class="panel">
      <h2>Команды управления</h2>
      <ul class="command-list">
        {#each ["bot follow Player", "bot guard Player", "bot come", "bot status"] as command}
          <li><code>{command}</code></li>
        {/each}
      </ul>
    </article>

    <article class="panel">
      <h2>Чат и макросы</h2>
      <p>
        Админы могут управлять ботом прямо из обычного чата или личных сообщений.
        Старые префиксы <code>*</code> и <code>#</code> тоже поддерживаются.
      </p>
    </article>

    <article class="panel">
      <h2>Инструменты мира</h2>
      <ul class="command-list">
        {#each ["bot mine block", "bot mine nearby stone 10", "bot place 0", "bot clear soft 2"] as command}
          <li><code>{command}</code></li>
        {/each}
      </ul>
    </article>

    <article class="panel">
      <h2>Документация</h2>
      <p>
        Подробный разбор команд, режима чата и поведения бота вынесен в отдельную
        страницу без `.html` в адресе.
      </p>
      <div class="notice"><a href="/docs">Открыть docs</a></div>
    </article>
  </section>
</main>

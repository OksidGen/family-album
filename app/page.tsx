"use client";

/* eslint-disable @next/next/no-img-element */
import { FormEvent, useEffect, useMemo, useState } from "react";

type Photo = {
  id: string;
  title: string;
  category: string;
  note: string;
  date: string;
  src: string;
  createdAt?: string;
};

type Folder = {
  id: string;
  name: string;
  createdAt: string;
};

type AlbumSettings = {
  coverPhotoId: string | null;
};

const ACCESS_KEY = "family-anniversary-access";

const starterPhotos: Photo[] = [
  {
    id: "starter-1",
    title: "Первый раздел",
    category: "Наша история",
    note: "Замените этот кадр вашей фотографией в админ-панели.",
    date: "День 1",
    src: "/starter-memory-1.png",
  },
  {
    id: "starter-2",
    title: "Место для путешествия",
    category: "Путешествия",
    note: "Добавьте сюда ваш любимый город, море или дорогу.",
    date: "Маршрут",
    src: "/starter-memory-2.png",
  },
  {
    id: "starter-3",
    title: "Теплый вечер",
    category: "Дом",
    note: "Маленькие домашние кадры часто оказываются самыми важными.",
    date: "Вечер",
    src: "/starter-memory-3.png",
  },
];

export default function Home() {
  const [isUnlocked, setIsUnlocked] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(ACCESS_KEY) === "family"
  );
  const [accessCode, setAccessCode] = useState("");
  const [activeCategory, setActiveCategory] = useState("Все");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [settings, setSettings] = useState<AlbumSettings>({ coverPhotoId: null });
  const [isEasterEggOpen, setIsEasterEggOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isUnlocked) {
      return;
    }

    let isActive = true;

    fetch("/api/photos")
      .then(async (response) => {
        if (response.status === 401) {
          window.localStorage.removeItem(ACCESS_KEY);
          setIsUnlocked(false);
          throw new Error("Введите семейный код заново.");
        }
        if (!response.ok) {
          throw new Error("Не получилось загрузить фотографии.");
        }
        return (await response.json()) as { photos?: Photo[]; folders?: Folder[]; settings?: Partial<AlbumSettings> };
      })
      .then((payload) => {
        if (!isActive) {
          return;
        }
        const serverPhotos = payload.photos ?? [];
        const serverFolders = payload.folders ?? [];
        setPhotos(serverPhotos);
        setFolders(serverFolders);
        setSettings({
          coverPhotoId: typeof payload.settings?.coverPhotoId === "string" ? payload.settings.coverPhotoId : null,
        });
        setActiveCategory((current) =>
          current === "Все" || serverFolders.some((folder) => folder.name === current) ? current : "Все"
        );
      })
      .catch(() => {
        if (isActive) {
          setPhotos([]);
          setFolders([]);
          setSettings({ coverPhotoId: null });
          setMessage("Введите семейный код, чтобы открыть альбом.");
        }
      });

    return () => {
      isActive = false;
    };
  }, [isUnlocked]);

  const categories = useMemo(() => ["Все", ...folders.map((folder) => folder.name)], [folders]);

  const filteredPhotos = useMemo(() => {
    if (activeCategory === "Все") {
      return photos;
    }
    return photos.filter((photo) => photo.category === activeCategory);
  }, [activeCategory, photos]);

  const coverPhoto = settings.coverPhotoId ? photos.find((photo) => photo.id === settings.coverPhotoId) : null;
  const heroPhoto = coverPhoto ?? photos[0] ?? starterPhotos[0];
  const isAlbumEmpty = photos.length === 0;
  const isFolderListEmpty = folders.length === 0;

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/access", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accessCode }),
    });
    const payload = (await response.json()) as { error?: string };

    if (response.ok) {
      window.localStorage.setItem(ACCESS_KEY, "family");
      setIsUnlocked(true);
      setMessage("");
      return;
    }

    setMessage(payload.error ?? "Проверьте семейный код и попробуйте еще раз.");
  }

  if (!isUnlocked) {
    return (
      <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
        <section className="login-shell">
          <div className="login-photo" aria-hidden="true">
            <img src={heroPhoto.src} alt="" />
          </div>
          <div className="login-panel">
            <p className="eyebrow">Закрытый семейный альбом</p>
            <h1>Наши годы в кадрах</h1>
            <p className="login-copy">
              Это наш семейный онлайн-альбом: только свои люди, любимые даты и
              фотографии, которые хочется пересматривать вместе.
            </p>
            <form className="login-form" onSubmit={unlock}>
              <label htmlFor="access-code">Семейный код</label>
              <div className="code-row">
                <input
                  id="access-code"
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  placeholder="Введите код"
                  autoComplete="off"
                />
                <button type="submit">Открыть</button>
              </div>
              {message && <p className="form-message">{message}</p>}
            </form>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <section className="album-hero">
        <div className="hero-image">
          <img src={heroPhoto.src} alt={heroPhoto.title} />
        </div>
        <div className="hero-copy">
          <p className="eyebrow">Семейный онлайн-альбом</p>
          <h1>Наш альбом, в котором собраны самые теплые моменты</h1>
          <p>
            Я очень рад, что ты со мной рядом. Я тебя очень сильно люблю, и
            хочу, чтобы здесь хранились наши фотографии, воспоминания и
            маленькие моменты, из которых складывается наша семья.
          </p>
          <div className="hero-actions">
            <a href="#gallery">Смотреть альбом</a>
            <button type="button" className="secret-button" onClick={() => setIsEasterEggOpen(true)}>
              Маленькая мысль
            </button>
          </div>
        </div>
      </section>

      {isEasterEggOpen && (
        <div className="secret-modal-backdrop" role="presentation" onClick={() => setIsEasterEggOpen(false)}>
          <section
            className="secret-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="secret-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">Только для тебя</p>
            <h2 id="secret-title">Каковы были шансы?</h2>
            <p>
              Ты знала, что если бы гравитация была чуть сильнее, то вселенная
              схлопнулась бы в шар? А если бы гравитация была чуть слабее, то
              вселенная разлетелась бы в разные стороны, и не было бы ни звезд,
              ни планет. Сила гравитации велика настолько, насколько нужно.
            </p>
            <p>
              А если бы электромагнитные силы не составляли 1% от сильного
              взаимодействия, то жизни бы не существовало. Какова вероятность
              того, что так сложилось само собой?
            </p>
            <p>
              На нашей планете 8 миллиардов людей, а мне попалась идеальная
              жена. Каковы были шансы?
            </p>
            <button type="button" onClick={() => setIsEasterEggOpen(false)}>
              Закрыть
            </button>
          </section>
        </div>
      )}

      <section className="memory-strip" aria-label="Статистика альбома">
        <div>
          <strong>{photos.filter((photo) => !photo.id.startsWith("starter-")).length}</strong>
          <span>фото в альбоме</span>
        </div>
        <div>
          <strong>{folders.length}</strong>
          <span>папок</span>
        </div>
      </section>

      <section id="gallery" className="content-band">
        <div className="section-heading">
          <p className="eyebrow">Фотографии</p>
          <h2>Разделы семейной истории</h2>
        </div>

        <div className="category-tabs" role="tablist" aria-label="Папки с фото">
          {categories.map((category) => (
            <button
              key={category}
              className={activeCategory === category ? "active" : ""}
              onClick={() => setActiveCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>

        {filteredPhotos.length > 0 ? (
          <div className="photo-grid">
            {filteredPhotos.map((photo) => (
              <article className="photo-card" key={photo.id}>
                <img src={photo.src} alt={photo.title} />
                <div className="photo-body">
                  <span>{photo.category}</span>
                  <h3>{photo.title}</h3>
                  {photo.date && <p className="photo-date">{photo.date}</p>}
                  {photo.note && <p>{photo.note}</p>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>{isFolderListEmpty && isAlbumEmpty ? "В альбоме пока нет папок" : "В этой папке пока нет фотографий"}</h3>
            <p>
              {isFolderListEmpty && isAlbumEmpty
                ? "Создайте первую папку и загрузите фотографии на странице администратора."
                : "Добавьте первые снимки через отдельную админ-страницу."}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

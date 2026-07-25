"use client";

/* eslint-disable @next/next/no-img-element */
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type Photo = {
  id: string;
  title: string;
  category: string;
  note: string;
  date: string;
  src: string;
  createdAt?: string;
};

const ACCESS_KEY = "family-anniversary-access";
const FAMILY_CODE = "LOVE2026";
const ADMIN_CODE = "ALBUM2026";

const defaultCategories = [
  "Наша история",
  "Путешествия",
  "Дом",
  "Праздники",
  "Любимые моменты",
];

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [activeCategory, setActiveCategory] = useState("Все");
  const [photos, setPhotos] = useState<Photo[]>(starterPhotos);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState(defaultCategories[0]);
  const [uploadNote, setUploadNote] = useState("");
  const [uploadDate, setUploadDate] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isUnlocked) {
      return;
    }

    let isActive = true;

    fetch("/api/photos")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Не получилось загрузить фотографии.");
        }
        return (await response.json()) as { photos?: Photo[] };
      })
      .then((payload) => {
        if (!isActive) {
          return;
        }
        const serverPhotos = payload.photos ?? [];
        setPhotos(serverPhotos.length > 0 ? serverPhotos : starterPhotos);
      })
      .catch(() => {
        if (isActive) {
          setPhotos(starterPhotos);
          setMessage("Пока показываю стартовые карточки. Серверный альбом недоступен.");
        }
      })

    return () => {
      isActive = false;
    };
  }, [isUnlocked]);

  const categories = useMemo(() => {
    const names = new Set(["Все", ...defaultCategories, ...photos.map((photo) => photo.category)]);
    return Array.from(names);
  }, [photos]);

  const filteredPhotos = useMemo(() => {
    if (activeCategory === "Все") {
      return photos;
    }
    return photos.filter((photo) => photo.category === activeCategory);
  }, [activeCategory, photos]);

  const heroPhoto = photos[0] ?? starterPhotos[0];

  function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (accessCode.trim().toUpperCase() === FAMILY_CODE) {
      window.localStorage.setItem(ACCESS_KEY, "family");
      setIsUnlocked(true);
      setMessage("");
      return;
    }
    setMessage("Проверьте семейный код и попробуйте еще раз.");
  }

  function unlockAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (adminCode.trim().toUpperCase() === ADMIN_CODE) {
      setIsAdmin(true);
      setMessage("Админ-панель открыта.");
      return;
    }
    setMessage("Пароль администратора не подошел.");
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  async function addPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      setMessage("Выберите фотографию для загрузки.");
      return;
    }

    const formData = new FormData();
    formData.set("adminCode", adminCode);
    formData.set("title", uploadTitle);
    formData.set("category", uploadCategory);
    formData.set("note", uploadNote);
    formData.set("date", uploadDate);
    formData.set("file", selectedFile);

    const response = await fetch("/api/photos", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json()) as { photo?: Photo; error?: string };

    if (!response.ok || !payload.photo) {
      setMessage(payload.error ?? "Не получилось загрузить фотографию.");
      return;
    }

    setPhotos((current) => {
      const currentServerPhotos = current.filter((photo) => !photo.id.startsWith("starter-"));
      return [payload.photo!, ...currentServerPhotos];
    });
    setUploadTitle("");
    setUploadNote("");
    setUploadDate("");
    setSelectedFile(null);
    setMessage("Фотография добавлена в семейный альбом.");
    event.currentTarget.reset();
  }

  async function deletePhoto(id: string) {
    if (id.startsWith("starter-")) {
      return;
    }

    const response = await fetch(`/api/photos/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ adminCode }),
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(payload.error ?? "Не получилось удалить фотографию.");
      return;
    }

    setPhotos((current) => {
      const nextPhotos = current.filter((photo) => photo.id !== id);
      return nextPhotos.length > 0 ? nextPhotos : starterPhotos;
    });
  }

  function showStarter() {
    setPhotos(starterPhotos);
    setMessage("Показываю стартовые карточки для пустого альбома.");
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
              Личная страница для годовщины: только свои люди, любимые даты и
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
              <p className="hint">Для демо: LOVE2026</p>
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
          <p className="eyebrow">Годовщина свадьбы</p>
          <h1>Семейный альбом, который открывается по QR</h1>
          <p>
            Внутри только ваши снимки: первые встречи, дороги, домашние вечера,
            праздники и маленькие моменты, из которых складывается семья.
          </p>
          <div className="hero-actions">
            <a href="#gallery">Смотреть альбом</a>
            <a href="#admin" className="secondary-link">
              Загрузить фото
            </a>
          </div>
        </div>
      </section>

      <section className="memory-strip" aria-label="Статистика альбома">
        <div>
          <strong>{photos.length}</strong>
          <span>фото в альбоме</span>
        </div>
        <div>
          <strong>{Math.max(categories.length - 1, 0)}</strong>
          <span>категорий</span>
        </div>
        <div>
          <strong>1</strong>
          <span>закрытый доступ</span>
        </div>
      </section>

      <section id="gallery" className="content-band">
        <div className="section-heading">
          <p className="eyebrow">Фотографии</p>
          <h2>Разделы семейной истории</h2>
        </div>

        <div className="category-tabs" role="tablist" aria-label="Категории фото">
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

        <div className="photo-grid">
          {filteredPhotos.map((photo) => (
            <article className="photo-card" key={photo.id}>
              <img src={photo.src} alt={photo.title} />
              <div className="photo-body">
                <span>{photo.category}</span>
                <h3>{photo.title}</h3>
                {photo.date && <p className="photo-date">{photo.date}</p>}
                {photo.note && <p>{photo.note}</p>}
                {isAdmin && !photo.id.startsWith("starter-") && (
                  <button type="button" className="danger-button" onClick={() => deletePhoto(photo.id)}>
                    Удалить
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="admin" className="admin-band">
        <div className="admin-copy">
          <p className="eyebrow">Админ-панель</p>
          <h2>Добавление фотографий</h2>
          <p>
            Загрузите снимок, выберите раздел и добавьте короткую подпись. В
            рабочей версии фотографии сохраняются на сервере и будут видны всем,
            кто откроет альбом по QR и введет семейный код.
          </p>
        </div>

        {!isAdmin ? (
          <form className="admin-form compact" onSubmit={unlockAdmin}>
            <label htmlFor="admin-code">Пароль администратора</label>
            <div className="code-row">
              <input
                id="admin-code"
                value={adminCode}
                onChange={(event) => setAdminCode(event.target.value)}
                placeholder="Введите пароль"
                autoComplete="off"
              />
              <button type="submit">Войти</button>
            </div>
            <p className="hint">Для демо: ALBUM2026</p>
            {message && <p className="form-message">{message}</p>}
          </form>
        ) : (
          <form className="admin-form" onSubmit={addPhoto}>
            <div className="field-grid">
              <label>
                Название
                <input value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} placeholder="Например, Наша прогулка" />
              </label>
              <label>
                Категория
                <select value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value)}>
                  {defaultCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Дата или подпись времени
              <input value={uploadDate} onChange={(event) => setUploadDate(event.target.value)} placeholder="Например, июль 2026" />
            </label>
            <label>
              Короткая история
              <textarea value={uploadNote} onChange={(event) => setUploadNote(event.target.value)} placeholder="Что стоит помнить об этом кадре?" />
            </label>
            <label className="file-drop">
              <input type="file" accept="image/*" onChange={handleFile} />
              <span>{selectedFile ? selectedFile.name : "Выберите фотографию"}</span>
            </label>
            <div className="admin-actions">
              <button type="submit">Добавить фото</button>
              <button type="button" className="ghost-button" onClick={showStarter}>
                Показать заглушки
              </button>
            </div>
            {message && <p className="form-message">{message}</p>}
          </form>
        )}
      </section>
    </main>
  );
}

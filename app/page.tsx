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
};

const STORAGE_KEY = "family-anniversary-gallery";
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

function readPhotos(): Photo[] {
  if (typeof window === "undefined") {
    return starterPhotos;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return starterPhotos;
  }

  try {
    const parsed = JSON.parse(stored) as Photo[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : starterPhotos;
  } catch {
    return starterPhotos;
  }
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [isUnlocked, setIsUnlocked] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(ACCESS_KEY) === "family"
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [activeCategory, setActiveCategory] = useState("Все");
  const [photos, setPhotos] = useState<Photo[]>(readPhotos);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState(defaultCategories[0]);
  const [uploadNote, setUploadNote] = useState("");
  const [uploadDate, setUploadDate] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
    }
  }, [photos]);

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

    const src = await fileToDataUrl(selectedFile);
    const nextPhoto: Photo = {
      id: crypto.randomUUID(),
      title: uploadTitle.trim() || selectedFile.name.replace(/\.[^/.]+$/, ""),
      category: uploadCategory.trim() || "Любимые моменты",
      note: uploadNote.trim(),
      date: uploadDate.trim(),
      src,
    };

    setPhotos((current) => [nextPhoto, ...current]);
    setUploadTitle("");
    setUploadNote("");
    setUploadDate("");
    setSelectedFile(null);
    setMessage("Фотография добавлена в семейный альбом.");
    event.currentTarget.reset();
  }

  function deletePhoto(id: string) {
    setPhotos((current) => current.filter((photo) => photo.id !== id));
  }

  function resetStarter() {
    setPhotos(starterPhotos);
    setMessage("Вернул стартовые карточки.");
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
                {isAdmin && (
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
            текущем MVP фотографии сохраняются на этом устройстве.
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
              <button type="button" className="ghost-button" onClick={resetStarter}>
                Сбросить демо
              </button>
            </div>
            {message && <p className="form-message">{message}</p>}
          </form>
        )}
      </section>
    </main>
  );
}

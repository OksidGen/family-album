"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";

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

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadNote, setUploadNote] = useState("");
  const [uploadDate, setUploadDate] = useState("");
  const [folderName, setFolderName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");

  const photoCountByFolder = useMemo(() => {
    return photos.reduce<Record<string, number>>((acc, photo) => {
      acc[photo.category] = (acc[photo.category] ?? 0) + 1;
      return acc;
    }, {});
  }, [photos]);

  async function loadAdminState(code = adminCode) {
    const response = await fetch("/api/photos", {
      headers: {
        "x-admin-code": code,
      },
    });
    const payload = (await response.json()) as {
      photos?: Photo[];
      folders?: Folder[];
      settings?: Partial<AlbumSettings>;
      error?: string;
    };

    if (!response.ok) {
      setMessage(payload.error ?? "Не получилось загрузить данные админки.");
      return;
    }

    const nextFolders = payload.folders ?? [];
    setPhotos(payload.photos ?? []);
    setFolders(nextFolders);
    setCoverPhotoId(typeof payload.settings?.coverPhotoId === "string" ? payload.settings.coverPhotoId : null);
    setUploadCategory((current) =>
      nextFolders.some((folder) => folder.name === current) ? current : nextFolders[0]?.name || ""
    );
  }

  async function unlockAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ adminCode }),
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(payload.error ?? "Пароль администратора не подошел.");
      return;
    }

    setIsAdmin(true);
    setMessage("Админ-панель открыта.");
    await loadAdminState(adminCode);
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFiles(Array.from(event.target.files ?? []));
  }

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/folders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ adminCode, name: folderName }),
    });
    const payload = (await response.json()) as { folder?: Folder; error?: string };

    if (!response.ok || !payload.folder) {
      setMessage(payload.error ?? "Не получилось создать папку.");
      return;
    }

    setFolderName("");
    setMessage("Папка создана.");
    await loadAdminState();
  }

  async function deleteFolder(folder: Folder) {
    const count = photoCountByFolder[folder.name] ?? 0;
    const confirmed = window.confirm(
      count > 0
        ? `Удалить папку "${folder.name}" и ${count} фото внутри?`
        : `Удалить папку "${folder.name}"?`
    );
    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/folders/${folder.id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ adminCode }),
    });
    const payload = (await response.json()) as { deletedPhotos?: number; error?: string };

    if (!response.ok) {
      setMessage(payload.error ?? "Не получилось удалить папку.");
      return;
    }

    setMessage(`Папка удалена. Удалено фото: ${payload.deletedPhotos ?? 0}.`);
    await loadAdminState();
  }

  async function makeCoverPhoto(id: string) {
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ adminCode, coverPhotoId: id }),
    });
    const payload = (await response.json()) as { settings?: AlbumSettings; error?: string };

    if (!response.ok || !payload.settings) {
      setMessage(payload.error ?? "Не получилось обновить обложку.");
      return;
    }

    setCoverPhotoId(payload.settings.coverPhotoId);
    setMessage("Обложка альбома обновлена.");
  }

  async function addPhotos(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedFiles.length === 0) {
      setMessage("Выберите одну или несколько фотографий для загрузки.");
      return;
    }
    if (!uploadCategory) {
      setMessage("Создайте папку перед загрузкой фотографий.");
      return;
    }

    const uploadedPhotos: Photo[] = [];
    const baseTitle = uploadTitle.trim();

    for (const [index, file] of selectedFiles.entries()) {
      const formData = new FormData();
      formData.set("adminCode", adminCode);
      formData.set(
        "title",
        baseTitle && selectedFiles.length > 1 ? `${baseTitle} ${index + 1}` : baseTitle
      );
      formData.set("category", uploadCategory);
      formData.set("note", uploadNote);
      formData.set("date", uploadDate);
      formData.set("file", file);

      const response = await fetch("/api/photos", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as { photo?: Photo; error?: string };

      if (!response.ok || !payload.photo) {
        setPhotos((current) => [...uploadedPhotos, ...current]);
        setMessage(
          uploadedPhotos.length > 0
            ? `Загружено ${uploadedPhotos.length} фото, затем возникла ошибка: ${payload.error ?? "не получилось загрузить файл."}`
            : payload.error ?? "Не получилось загрузить фотографии."
        );
        return;
      }

      uploadedPhotos.push(payload.photo);
    }

    setPhotos((current) => [...uploadedPhotos, ...current]);
    setUploadTitle("");
    setUploadNote("");
    setUploadDate("");
    setSelectedFiles([]);
    setMessage(
      uploadedPhotos.length === 1
        ? "Фотография добавлена в семейный альбом."
        : `Фотографии добавлены в семейный альбом: ${uploadedPhotos.length}.`
    );
    event.currentTarget.reset();
  }

  async function deletePhoto(id: string) {
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

    setPhotos((current) => current.filter((photo) => photo.id !== id));
    if (coverPhotoId === id) {
      setCoverPhotoId(null);
    }
    setMessage("Фотография удалена.");
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
        <section className="login-shell admin-login-shell">
          <div className="login-photo" aria-hidden="true">
            <img src="/starter-memory-2.png" alt="" />
          </div>
          <div className="login-panel">
            <p className="eyebrow">Админ-панель</p>
            <h1>Управление альбомом</h1>
            <p className="login-copy">
              Отдельная закрытая страница для загрузки фотографий и управления
              папками семейного архива.
            </p>
            <form className="login-form" onSubmit={unlockAdmin}>
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
              {message && <p className="form-message">{message}</p>}
            </form>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <section className="admin-page-hero">
        <div>
          <p className="eyebrow">Админ-панель</p>
          <h1>Папки и фотографии</h1>
          <p>
            Создавайте папки для семейных моментов, загружайте фотографии и
            удаляйте лишнее без перехода на главную страницу.
          </p>
        </div>
        <Link href="/" className="secondary-link">
          Открыть альбом
        </Link>
      </section>

      <section className="admin-workspace">
        <div className="admin-column">
          <div className="admin-card">
            <p className="eyebrow">Папки</p>
            <h2>Разделы альбома</h2>
            <form className="folder-form" onSubmit={createFolder}>
              <label>
                Новая папка
                <div className="code-row">
                  <input
                    value={folderName}
                    onChange={(event) => setFolderName(event.target.value)}
                    placeholder="Например, Лето 2026"
                  />
                  <button type="submit">Создать</button>
                </div>
              </label>
            </form>

            <div className="folder-list">
              {folders.map((folder) => (
                <div className="folder-row" key={folder.id}>
                  <div>
                    <strong>{folder.name}</strong>
                    <span>{photoCountByFolder[folder.name] ?? 0} фото</span>
                  </div>
                  <button type="button" className="danger-button" onClick={() => deleteFolder(folder)}>
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          </div>

          <form className="admin-form" onSubmit={addPhotos}>
            <p className="eyebrow">Загрузка</p>
            <h2>Новое фото</h2>
            <div className="field-grid">
              <label>
                Название
                <input
                  value={uploadTitle}
                  onChange={(event) => setUploadTitle(event.target.value)}
                  placeholder="Например, Наша прогулка"
                />
              </label>
              <label>
                Папка
                <select value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value)}>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.name}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Дата или подпись времени
              <input
                value={uploadDate}
                onChange={(event) => setUploadDate(event.target.value)}
                placeholder="Например, июль 2026"
              />
            </label>
            <label>
              Короткая история
              <textarea
                value={uploadNote}
                onChange={(event) => setUploadNote(event.target.value)}
                placeholder="Что стоит помнить об этом кадре?"
              />
            </label>
            <label className="file-drop">
              <input type="file" accept="image/*" multiple onChange={handleFile} />
              <span>
                {selectedFiles.length > 0
                  ? selectedFiles.length === 1
                    ? selectedFiles[0].name
                    : `Выбрано фото: ${selectedFiles.length}`
                  : "Выберите фотографии"}
              </span>
            </label>
            <button type="submit">Добавить фото</button>
            {message && <p className="form-message">{message}</p>}
          </form>
        </div>

        <div className="admin-card">
          <p className="eyebrow">Все фото</p>
          <h2>Содержимое альбома</h2>
          {photos.length > 0 ? (
            <div className="admin-photo-list">
              {photos.map((photo) => (
                <article className={`admin-photo-row ${coverPhotoId === photo.id ? "is-cover" : ""}`} key={photo.id}>
                  <img src={photo.src} alt={photo.title} />
                  <div>
                    <span>{photo.category}</span>
                    <strong>{photo.title}</strong>
                    {photo.date && <p>{photo.date}</p>}
                    {coverPhotoId === photo.id && <p className="cover-note">Обложка альбома</p>}
                  </div>
                  <div className="admin-photo-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={coverPhotoId === photo.id}
                      onClick={() => makeCoverPhoto(photo.id)}
                    >
                      {coverPhotoId === photo.id ? "На обложке" : "Сделать обложкой"}
                    </button>
                    <button type="button" className="danger-button" onClick={() => deletePhoto(photo.id)}>
                      Удалить
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state compact">
              <h3>Фотографий пока нет</h3>
              <p>Создайте папку или выберите существующую и загрузите первый кадр.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

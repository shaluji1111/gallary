'use client';
import { useState, useEffect, useCallback } from 'react';

interface Photo {
  folder: string;
  file: string;
  public_id: string;
  url: string;
}

interface GalleryProps {
  onLockOut: () => void;
}

const PAGE_SIZE = 40;
const CLOUD = 'deftovszl';

function cloudUrl(publicId: string, width: number) {
  return `https://res.cloudinary.com/${CLOUD}/image/upload/q_auto,f_auto,w_${width}/${publicId}.jpg`;
}

export default function Gallery({ onLockOut }: GalleryProps) {
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [activeFolder, setActiveFolder] = useState<'01' | '02'>('01');
  const [page, setPage] = useState(1);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/manifest.json')
      .then(r => r.json())
      .then((data: Photo[]) => {
        setAllPhotos(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const folderPhotos = allPhotos.filter(p => p.folder === activeFolder);
  const visible = folderPhotos.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < folderPhotos.length;

  const openLightbox = useCallback((idx: number) => setLightboxIdx(idx), []);
  const closeLightbox = useCallback(() => setLightboxIdx(null), []);

  const goPrev = useCallback(() => {
    setLightboxIdx(i => (i != null && i > 0 ? i - 1 : i));
  }, []);

  const goNext = useCallback(() => {
    setLightboxIdx(i => (i != null && i < visible.length - 1 ? i + 1 : i));
  }, [visible.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (lightboxIdx == null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIdx, goPrev, goNext, closeLightbox]);

  const handleFolderSwitch = (folder: '01' | '02') => {
    setActiveFolder(folder);
    setPage(1);
    setLightboxIdx(null);
  };

  const tab01Count = allPhotos.filter(p => p.folder === '01').length;
  const tab02Count = allPhotos.filter(p => p.folder === '02').length;

  const currentPhoto = lightboxIdx != null ? visible[lightboxIdx] : null;

  return (
    <div className="gallery-page">
      {/* Header */}
      <header className="gallery-header">
        <div>
          <div className="gallery-header-title">💍 Sourav&apos;s Wedding</div>
          <div className="gallery-header-meta">{allPhotos.length} memories captured</div>
        </div>
        <button className="lock-out-btn" onClick={onLockOut}>🔒 Lock</button>
      </header>

      {/* Hero */}
      <section className="gallery-hero">
        <span className="gallery-hero-emoji">🌸</span>
        <h1 className="gallery-hero-title">A Beautiful Union</h1>
        <p className="gallery-hero-subtitle">Browse through the precious moments of the celebration</p>
      </section>

      {/* Tabs */}
      <div className="gallery-tabs">
        <button
          className={`gallery-tab${activeFolder === '01' ? ' active' : ''}`}
          onClick={() => handleFolderSwitch('01')}
        >
          Session 01 · {tab01Count}
        </button>
        <button
          className={`gallery-tab${activeFolder === '02' ? ' active' : ''}`}
          onClick={() => handleFolderSwitch('02')}
        >
          Session 02 · {tab02Count}
        </button>
      </div>

      {/* Photo count */}
      <p className="photo-count">
        Showing {Math.min(visible.length, folderPhotos.length)} of {folderPhotos.length} photos
      </p>

      {/* Loading */}
      {loading && (
        <div className="loading-spinner">
          <div className="spinner" />
          <p>Loading gallery...</p>
        </div>
      )}

      {/* Masonry Grid */}
      {!loading && (
        <div className="masonry-grid">
          {visible.map((photo, idx) => (
            <div key={photo.public_id} className="masonry-item" onClick={() => openLightbox(idx)}>
              <img
                src={cloudUrl(photo.public_id, 600)}
                alt={photo.file}
                loading="lazy"
                onLoad={e => (e.currentTarget as HTMLImageElement).classList.add('loaded')}
              />
              <div className="masonry-overlay">
                <div className="masonry-actions">
                  <a
                    className="masonry-action-btn"
                    href={cloudUrl(photo.public_id, 1920)}
                    download={photo.file}
                    onClick={e => e.stopPropagation()}
                    title="Download Original"
                  >
                    ⬇
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="load-more-container">
          <button className="load-more-btn" onClick={() => setPage(p => p + 1)}>
            Load More Photos
          </button>
        </div>
      )}

      {/* Lightbox */}
      {currentPhoto && lightboxIdx != null && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <button className="lightbox-close" onClick={closeLightbox}>✕</button>

          {lightboxIdx > 0 && (
            <button className="lightbox-nav prev" onClick={e => { e.stopPropagation(); goPrev(); }}>‹</button>
          )}

          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <img
              className="lightbox-img"
              src={cloudUrl(currentPhoto.public_id, 1920)}
              alt={currentPhoto.file}
            />
          </div>

          {lightboxIdx < visible.length - 1 && (
            <button className="lightbox-nav next" onClick={e => { e.stopPropagation(); goNext(); }}>›</button>
          )}

          <div className="lightbox-meta">
            <span>{lightboxIdx + 1} / {visible.length}</span>
            <span>·</span>
            <span>{currentPhoto.file}</span>
            <a
              className="lightbox-download"
              href={cloudUrl(currentPhoto.public_id, 1920)}
              download={currentPhoto.file}
              onClick={e => e.stopPropagation()}
            >
              ⬇ Download
            </a>
          </div>
        </div>
      )}

      <footer className="gallery-footer">
        Made with ❤️ for Sourav&apos;s Wedding
      </footer>
    </div>
  );
}

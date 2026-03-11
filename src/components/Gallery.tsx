'use client';
import { useState, useEffect, useCallback } from 'react';

interface Photo {
  folder: string;
  file: string;
  public_id: string;
  url: string;
}

interface Face {
  id: number;
  name: string;
  thumbnail: string;
  photos: string[];
  hidden?: boolean;
  count?: number;
}

interface GalleryProps {
  onLockOut: () => void;
  isAdmin?: boolean;
}

const PAGE_SIZE = 40;
const CLOUD = 'deftovszl';

function cloudUrl(publicId: string, width: number) {
  return `https://res.cloudinary.com/${CLOUD}/image/upload/q_auto,f_auto,w_${width}/${publicId}.jpg`;
}

export default function Gallery({ onLockOut, isAdmin }: GalleryProps) {
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [faces, setFaces] = useState<Face[]>([]);
  const [settings, setSettings] = useState({ enableFaceFilter: false });
  const [activeFolder, setActiveFolder] = useState<'01' | '02' | 'faces'>('01');
  const [activeFaceId, setActiveFaceId] = useState<number | null>(null);
  const [mergingFaceId, setMergingFaceId] = useState<number | null>(null);
  const [isManageMode, setIsManageMode] = useState(false);
  
  const [page, setPage] = useState(1);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/manifest.json').then(r => r.json()),
      fetch('/gallery_faces/faces.json').then(r => r.json()).catch(() => []),
      fetch('/settings.json').then(r => r.json()).catch(() => ({ enableFaceFilter: false }))
    ])
    .then(([manifestData, facesData, settingsData]) => {
      setAllPhotos(manifestData);
      setFaces(facesData);
      setSettings(settingsData);
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, []);

  const folderPhotos = activeFolder === 'faces' 
    ? (activeFaceId != null 
        ? allPhotos.filter(p => {
            const face = faces.find(f => f.id === activeFaceId);
            return face?.photos.includes(p.public_id);
          }) 
        : [])
    : allPhotos.filter(p => p.folder === activeFolder);
    
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

  const handleFolderSwitch = (folder: '01' | '02' | 'faces') => {
    setActiveFolder(folder);
    setPage(1);
    setLightboxIdx(null);
    if (folder === 'faces' && activeFaceId === null) {
      const firstFace = faces.find(f => isAdmin || !f.hidden);
      if (firstFace) setActiveFaceId(firstFace.id);
    }
  };

  const handleExportFaces = () => {
    const blob = new Blob([JSON.stringify(faces, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'faces.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSettings = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'settings.json';
    a.click();
    URL.revokeObjectURL(url);
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
        {(isAdmin || settings.enableFaceFilter) && (
          <button
            className={`gallery-tab${activeFolder === 'faces' ? ' active' : ''}`}
            onClick={() => handleFolderSwitch('faces')}
          >
            Find by Face
          </button>
        )}
      </div>
      
      {/* Faces Filter Bar & Admin */}
      {activeFolder === 'faces' && (
        <div className="faces-section">
          {isAdmin && (
            <div className="admin-controls" style={{ flexWrap: 'wrap', gap: '16px' }}>
              <label className="admin-toggle">
                <input 
                  type="checkbox" 
                  checked={isManageMode} 
                  onChange={e => setIsManageMode(e.target.checked)} 
                />
                🛠️ Manage Faces
              </label>
              {isManageMode && (
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label className="admin-toggle" style={{ color: settings.enableFaceFilter ? '#10b981' : 'var(--text-muted)' }}>
                    <input 
                      type="checkbox" 
                      checked={settings.enableFaceFilter} 
                      onChange={e => setSettings({ ...settings, enableFaceFilter: e.target.checked })} 
                    />
                    {settings.enableFaceFilter ? 'Publicly Enabled' : 'Publicly Disabled'}
                  </label>
                  <button className="export-btn" onClick={handleExportSettings}>
                    💾 Export settings.json
                  </button>
                  <button className="export-btn" onClick={handleExportFaces}>
                    💾 Export faces.json
                  </button>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: '200px', lineHeight: 1.2 }}>
                    * To persist on Vercel, download these files and commit them to your repository's <code>public</code> folder.
                  </div>
                </div>
              )}
            </div>
          )}
          
          {isManageMode && mergingFaceId !== null && (
            <div className="merge-banner">
              Select another face to merge INTO <strong>{faces.find(f => f.id === mergingFaceId)?.name}</strong>, or <button onClick={() => setMergingFaceId(null)}>Cancel</button>
            </div>
          )}

          <div className="face-filter-bar">
            {faces.filter(f => isAdmin || (!f.hidden && !/^Person\s+\d+$/i.test(f.name))).map(face => {
              const isActive = activeFaceId === face.id;
              const isTarget = mergingFaceId === face.id;
              
              return (
                <div 
                  key={face.id} 
                  className={`face-thumbnail-wrapper ${isActive ? 'active' : ''} ${isTarget ? 'merge-target' : ''} ${face.hidden ? 'hidden-face' : ''}`}
                  onClick={() => {
                    if (isManageMode && mergingFaceId !== null) {
                      if (mergingFaceId === face.id) {
                        setMergingFaceId(null);
                        return;
                      }
                      if (confirm(`Merge photos of "${face.name}" into "${faces.find(f => f.id === mergingFaceId)?.name}" and delete "${face.name}"?`)) {
                        setFaces(prev => {
                          const target = prev.find(f => f.id === mergingFaceId);
                          const source = prev.find(f => f.id === face.id);
                          if (!target || !source) return prev;
                          
                          // combine unique photos
                          const mergedPhotos = Array.from(new Set([...target.photos, ...source.photos]));
                          
                          return prev.map(f => {
                            if (f.id === mergingFaceId) return { ...f, photos: mergedPhotos, count: mergedPhotos.length };
                            return f;
                          }).filter(f => f.id !== face.id); // remove source
                        });
                        if (activeFaceId === face.id) setActiveFaceId(mergingFaceId);
                        setMergingFaceId(null);
                      }
                    } else {
                      setActiveFaceId(face.id);
                    }
                  }}
                >
                  <img 
                    src={`/gallery_faces${face.thumbnail}`} 
                    alt={face.name} 
                    className="face-img" 
                    loading="lazy"
                  />
                  {!isManageMode ? (
                    <span className="face-name">{face.name}</span>
                  ) : (
                    <div className="face-manage-controls" onClick={e => e.stopPropagation()}>
                      <input 
                        type="text" 
                        value={face.name} 
                        onChange={e => {
                          const newName = e.target.value;
                          setFaces(prev => prev.map(f => f.id === face.id ? { ...f, name: newName } : f));
                        }} 
                        className="face-name-input"
                      />
                      <div className="face-actions">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setMergingFaceId(mergingFaceId === face.id ? null : face.id);
                          }}
                          title="Merge into this face"
                          className="face-action-btn"
                          style={{ background: isTarget ? 'var(--primary)' : '' }}
                        >
                          🔗
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setFaces(prev => prev.map(f => f.id === face.id ? { ...f, hidden: !f.hidden } : f));
                          }}
                          title={face.hidden ? "Unhide" : "Hide"}
                          className="face-action-btn"
                        >
                          {face.hidden ? '👁️' : '🚫'}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this face?')) {
                              setFaces(prev => prev.filter(f => f.id !== face.id));
                              if (activeFaceId === face.id) setActiveFaceId(null);
                              if (mergingFaceId === face.id) setMergingFaceId(null);
                            }
                          }}
                          title="Delete"
                          className="face-action-btn delete-btn"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {faces.filter(f => isAdmin || (!f.hidden && !/^Person\s+\d+$/i.test(f.name))).length === 0 && (
              <p className="no-faces">No faces available to show.</p>
            )}
          </div>
        </div>
      )}

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
          {visible.length === 0 && activeFolder === 'faces' && activeFaceId === null ? (
            <div className="empty-state">Please select a face above to view photos.</div>
          ) : (
            visible.map((photo, idx) => (
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
            ))
          )}
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

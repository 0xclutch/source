// A database where everyone can access the photos from the wedding and upload their own
// They will have to verify by using the email used when registering for the wedding!


// Info required to verify access (then give them session access because they wont want to login multiple times)
// Name



import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from "@supabase/supabase-js";
import imageCompression from "browser-image-compression";
import { useNavigate } from "react-router-dom";

import qrCodeUrl from "../images/QRF&G.png";

const supabase = createClient(
    "https://nyzdomoruhunmrchhslm.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55emRvbW9ydWh1bm1yY2hoc2xtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4MDI3MDksImV4cCI6MjEwNjM3ODcwOX0.MnbVqH6Sp4Umel2tfUlyZ_o536DoVynV38blDyhgE3c"
);
const bucket = supabase.storage.from("photos");

// Replace this template with the real verification request.
async function verifyAccess({ fullName }) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return { verified: Boolean(fullName) };
}

export default function EventPhotos() {
    const navigate = useNavigate();
    const [fullName, setFullName] = useState(() => window.localStorage.getItem('event-photos-name') || '');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isVerified, setIsVerified] = useState(() => Boolean(window.localStorage.getItem('event-photos-name')));
    const [showWelcome, setShowWelcome] = useState(false);
    const [photos, setPhotos] = useState([]);
    const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [galleryError, setGalleryError] = useState('');
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [likedPhotos, setLikedPhotos] = useState(() => new Set());
    const [photoLikeCounts, setPhotoLikeCounts] = useState({});
    const [photoLikers, setPhotoLikers] = useState({});
    const [sortMode, setSortMode] = useState('recent');
    const [likingPhoto, setLikingPhoto] = useState('');
    const [showLikersFor, setShowLikersFor] = useState('');
    const [loadedPhotos, setLoadedPhotos] = useState(() => new Set());
    const lightboxImageRef = useRef(null);
    const voterId = useState(() => {
        const storageKey = 'event-photos-voter-id';
        const existingId = window.localStorage.getItem(storageKey);
        if (existingId) return existingId;

        const newId = crypto.randomUUID();
        window.localStorage.setItem(storageKey, newId);
        return newId;
    })[0];

    const fileCount = selectedFiles.length;

    const loadPhotos = useCallback(async function loadPhotos() {
        setIsLoadingPhotos(true);
        setGalleryError('');

        const { data, error } = await bucket.list('', {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' },
        });

        if (error) {
            setGalleryError(error.message);
        } else {
            const nextPhotos = (data ?? [])
                    .filter((file) => file.id && file.metadata?.mimetype?.startsWith('image/'))
                    .map((file, index) => ({
                        src: bucket.getPublicUrl(file.name).data.publicUrl,
                        fileName: file.name,
                        alt: file.metadata?.['e-name'] || 'Wedding memory',
                        size: ['tall', 'wide', 'standard', 'standard'][index % 4],
                        createdAt: file.created_at,
                    }));
            setPhotos(nextPhotos);

            const { data: likes, error: likesError } = await supabase
                .from('photo_likes')
                .select('photo_path, voter_id, full_name');

            if (likesError) {
                setGalleryError(likesError.message);
            } else {
                const counts = {};
                const currentLikes = new Set();
                const likers = {};
                (likes ?? []).forEach((like) => {
                    counts[like.photo_path] = (counts[like.photo_path] || 0) + 1;
                    if (!likers[like.photo_path]) likers[like.photo_path] = [];
                    if (like.full_name) likers[like.photo_path].push(like.full_name);
                    if (like.voter_id === voterId) currentLikes.add(like.photo_path);
                });
                setPhotoLikeCounts(counts);
                setPhotoLikers(likers);
                setLikedPhotos(currentLikes);
            }
        }

        setIsLoadingPhotos(false);
    }, [voterId]);

    useEffect(() => {
        if (isVerified) loadPhotos();
    }, [isVerified, loadPhotos]);

    useEffect(() => {
        function handleEscape(event) {
            if (event.key === 'Escape') setSelectedPhoto(null);
        }

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, []);

    async function handleVerify(event) {
        event.preventDefault();
        if (isVerifying || !fullName.trim()) return;

        setIsVerifying(true);
        try {
            const result = await verifyAccess({ fullName: fullName.trim() });
            if (result?.verified) {
                const verifiedName = fullName.trim();
                window.localStorage.setItem('event-photos-name', verifiedName);
                setFullName(verifiedName);
                setIsVerified(true);
                setShowWelcome(true);
                window.setTimeout(() => setShowWelcome(false), 1400);
            }
        } finally {
            setIsVerifying(false);
        }
    }

    async function handleUpload(event) {
        event.preventDefault();
        if (isUploading || !selectedFiles.length) return;

        const form = event.currentTarget; // grab it now; it is gone after the awaits below
        setIsUploading(true);
        setGalleryError('');

        try {
            for (const file of selectedFiles) {
                const compressedFile = await imageCompression(file, {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 2400,
                    fileType: 'image/jpeg', // also converts iPhone HEIC photos
                    useWebWorker: true,
                });
                const fileName = `${Date.now()}-${crypto.randomUUID()}.jpg`;
                const { error } = await bucket.upload(fileName, compressedFile, {
                    cacheControl: '3600',
                    contentType: 'image/jpeg',
                    upsert: false,
                    metadata: { 'e-name': fullName.trim() },
                });

                if (error) throw error;
            }

            setSelectedFiles([]);
            form.reset();
            await loadPhotos();
        } catch (error) {
            setGalleryError(error.message || 'Unable to upload the selected photos.');
        } finally {
            setIsUploading(false);
        }
    }

    function toggleLike(photoFileName) {
        const photo = photos.find((item) => item.fileName === photoFileName);
        if (!photo || likingPhoto === photo.fileName) return;

        const isLiked = likedPhotos.has(photo.fileName);
        setLikingPhoto(photo.fileName);
        setGalleryError('');

        const request = isLiked
            ? supabase.from('photo_likes').delete().match({ photo_path: photo.fileName, voter_id: voterId })
            : supabase.from('photo_likes').insert({ photo_path: photo.fileName, voter_id: voterId, full_name: fullName.trim() });

        request.then(({ error }) => {
            if (error) {
                setGalleryError(error.message);
            } else {
                setPhotoLikeCounts((currentCounts) => ({
                    ...currentCounts,
                    [photo.fileName]: Math.max(0, (currentCounts[photo.fileName] || 0) + (isLiked ? -1 : 1)),
                }));
                setPhotoLikers((currentLikers) => {
                    const nextLikers = { ...currentLikers };
                    const names = [...(nextLikers[photo.fileName] || [])];
                    if (isLiked) {
                        const nameIndex = names.indexOf(fullName.trim());
                        if (nameIndex >= 0) names.splice(nameIndex, 1);
                    } else {
                        names.push(fullName.trim());
                    }
                    nextLikers[photo.fileName] = names;
                    return nextLikers;
                });
                setLikedPhotos((currentLikes) => {
                    const nextLikes = new Set(currentLikes);
                    if (isLiked) nextLikes.delete(photo.fileName);
                    else nextLikes.add(photo.fileName);
                    return nextLikes;
                });
            }
            setLikingPhoto('');
        });
    }

    const displayedPhotos = [...photos].sort((firstPhoto, secondPhoto) => {
        if (sortMode === 'liked') {
            return (photoLikeCounts[secondPhoto.fileName] || 0) - (photoLikeCounts[firstPhoto.fileName] || 0);
        }
        return new Date(secondPhoto.createdAt || 0) - new Date(firstPhoto.createdAt || 0);
    });

    async function handleDownload(photo) {
        try {
            const response = await fetch(photo.src);
            const imageBlob = await response.blob();
            const downloadUrl = URL.createObjectURL(imageBlob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `francesandgrant-${photo.fileName}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            setGalleryError('Unable to download this photo.');
        }
    }

    function handleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            lightboxImageRef.current?.requestFullscreen?.();
        }
    }

    return (
        <div style={styles.page}>
            <button
                type="button"
                style={styles.backButton}
                onClick={() => navigate(-1)}
                aria-label="Go back"
                title="Go back"
            >
                ← Back
            </button>
            <style>{`
                @keyframes verifySpin { to { transform: rotate(360deg); } }
                @keyframes photoLoadingShimmer {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(100%); }
                }

                .event-photo-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    grid-auto-rows: 160px;
                    grid-auto-flow: dense;
                }
                @media (min-width: 640px) {
                    .event-photo-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); grid-auto-rows: 200px; }
                }
                @media (min-width: 960px) {
                    .event-photo-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
                }

                .event-photo-tile img { transition: transform 0.4s ease; }
                .event-photo-tile:hover img { transform: scale(1.04); }

                .photo-loading-skin { overflow: hidden; }
                .photo-loading-skin::after {
                    content: "";
                    position: absolute;
                    inset: 0;
                    width: 55%;
                    background: linear-gradient(105deg, transparent, rgba(255, 255, 255, 0.42), transparent);
                    animation: photoLoadingShimmer 1.35s ease-in-out infinite;
                }

                button:focus-visible,
                .upload-dropzone:focus-within { outline: 2px solid #9a7f70; outline-offset: 2px; }

                @media (prefers-reduced-motion: reduce) {
                    .event-photo-tile img { transition: none; }
                    .event-photo-tile:hover img { transform: none; }
                    .photo-loading-skin::after { animation: none; }
                }
            `}</style>

            {!isVerified ? (
                <main style={styles.content}>
                    <h1 style={styles.heading}>Event Photos</h1>
                    <p style={styles.description}>
                        Welcome to the <b>Event Photos page</b>! Here, you can access and upload photos from the wedding. <br></br>To ensure privacy and security, please verify your access by providing your <b>full name</b>.
                    </p>
                    <section style={styles.verifyPanel}>
                        <p style={styles.panelKicker}>Share the day</p>
                        <p style={styles.panelCopy}>Verify your name to view and upload photos.</p>
                        <form style={styles.form} onSubmit={handleVerify}>
                            <input
                                type="text"
                                placeholder="Full Name"
                                style={styles.input}
                                maxLength={64}
                                minLength={2}
                                value={fullName}
                                onChange={(event) => setFullName(event.target.value)}
                                disabled={isVerifying}
                            />
                            <i style={styles.caution}>*This name will be tagged on all uploaded photos</i>
                            <button
                                type="submit"
                                style={{ ...styles.button, ...((isVerifying || !fullName.trim()) ? styles.buttonDisabled : {}) }}
                                disabled={isVerifying || !fullName.trim()}
                            >
                                {isVerifying ? <span style={styles.spinner} aria-label="Verifying" /> : 'Verify'}
                            </button>
                        </form>
                    </section>

                    <div style={styles.share}>
                        <i>To access the event photos, please scan this QR code</i>
                        <img src={qrCodeUrl} height="150" width="150" alt="QR Code" />
                    </div>
                </main>
            ) : showWelcome ? (
                <section style={styles.welcome} aria-live="polite">
                    <div style={styles.welcomeCard}>
                        <p style={styles.welcomeKicker}>Frances &amp; Grant</p>
                        <div style={styles.welcomeRule} />
                        <h1 style={styles.welcomeTitle}>Welcome to<br />the memories</h1>
                        <p style={styles.welcomeCopy}>A little gallery of our big day.</p>
                    </div>
                </section>
            ) : (
                <main style={styles.content}>
                    <p style={styles.eyebrow}>The gallery</p>
                    <h1 style={styles.heading}>Event Photos</h1>
                    <p style={styles.description}>
                        A place for the little moments, happy tears, and dance-floor memories.
                    </p>

                    <form style={styles.uploadPanel} onSubmit={handleUpload}>
                        <p style={styles.panelKicker}>Add to the gallery</p>

                        <label className="upload-dropzone" style={styles.dropzone}>
                            <span style={styles.dropzoneTitle}>
                                {fileCount ? `${fileCount} photo${fileCount === 1 ? '' : 's'} selected` : 'Choose photos'}
                            </span>
                            <span style={styles.dropzoneHint}>
                                {fileCount ? 'Tap to choose different photos' : 'Tap to pick from your camera roll'}
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                style={styles.visuallyHidden}
                                onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
                                disabled={isUploading}
                            />
                        </label>

                        <button
                            type="submit"
                            style={{ ...styles.button, ...((isUploading || !fileCount) ? styles.buttonDisabled : {}) }}
                            disabled={isUploading || !fileCount}
                        >
                            {isUploading ? <span style={styles.spinner} aria-label="Uploading" /> : 'Upload photos'}
                        </button>

                        <span style={styles.caution} role="status">
                            {isUploading ? 'Uploading. Please keep this page open.' : ''}
                        </span>
                    </form>

                    {galleryError && <p style={styles.error} role="alert">{galleryError}</p>}

                    <div style={styles.galleryControls}>
                        <label htmlFor="photo-sort" style={styles.sortLabel}>Sort photos</label>
                        <select
                            id="photo-sort"
                            value={sortMode}
                            onChange={(event) => setSortMode(event.target.value)}
                            style={styles.sortSelect}
                        >
                            <option value="recent">Recently uploaded</option>
                            <option value="liked">Most liked</option>
                        </select>
                    </div>

                    <div className="event-photo-grid" style={styles.grid}>
                        {isLoadingPhotos ? (
                            ["tall", "wide", "standard", "standard", "tall", "wide"].map((size, index) => (
                                <figure key={`photo-skeleton-${index}`} style={{ ...styles.tile, ...styles[size] }} aria-hidden="true">
                                    <span className="photo-loading-skin" style={styles.photoLoadingSkin} />
                                </figure>
                            ))
                        ) : displayedPhotos.length ? displayedPhotos.map((photo) => (
                            <figure key={photo.src} style={{ ...styles.tile, ...styles[photo.size] }}>
                                <button
                                    type="button"
                                    className="event-photo-tile"
                                    style={styles.photoButton}
                                    onClick={() => setSelectedPhoto(photo)}
                                    aria-label={`View ${photo.alt}`}
                                    aria-busy={!loadedPhotos.has(photo.fileName)}
                                >
                                    {!loadedPhotos.has(photo.fileName) && <span className="photo-loading-skin" style={styles.photoLoadingSkin} aria-hidden="true" />}
                                    <img
                                        src={photo.src}
                                        alt={photo.alt}
                                        style={{ ...styles.photo, opacity: loadedPhotos.has(photo.fileName) ? 1 : 0 }}
                                        loading="lazy"
                                        decoding="async"
                                        onLoad={() => setLoadedPhotos((currentLoaded) => new Set(currentLoaded).add(photo.fileName))}
                                    />
                                    <span style={{ ...styles.likeBadge, zIndex: 2 }} aria-label={`${photoLikeCounts[photo.fileName] || 0} likes`}>
                                        ♥ {photoLikeCounts[photo.fileName] || 0}
                                    </span>
                                </button>
                            </figure>
                        )) : (
                            <p style={styles.status}>No photos yet. Be the first to add one.</p>
                        )}
                    </div>

                    <div style={styles.share}>
                        <i>To access the event photos, please scan this QR code</i>
                        <img src={qrCodeUrl} height='150' width='150' alt="QR Code" />
                    </div>
                </main>
            )}

            {selectedPhoto && (
                <div
                    style={styles.lightbox}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Photo viewer"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) setSelectedPhoto(null);
                    }}
                >
                    <div style={styles.lightboxContent}>
                        <button
                            type="button"
                            style={styles.closeButton}
                            onClick={() => setSelectedPhoto(null)}
                            aria-label="Close photo viewer"
                            title="Close"
                        >
                            ×
                        </button>
                        <img
                            ref={lightboxImageRef}
                            src={selectedPhoto.src}
                            alt={selectedPhoto.alt}
                            style={styles.lightboxImage}
                        />
                        <div style={styles.lightboxToolbar}>
                            <button
                                type="button"
                                style={{ ...styles.toolButton, ...(likedPhotos.has(selectedPhoto.fileName) ? styles.likedButton : {}) }}
                                onClick={() => toggleLike(selectedPhoto.fileName)}
                                aria-label={likedPhotos.has(selectedPhoto.fileName) ? 'Unlike photo' : 'Like photo'}
                                title={likedPhotos.has(selectedPhoto.fileName) ? 'Unlike' : 'Like'}
                            >
                                {likedPhotos.has(selectedPhoto.fileName) ? '♥' : '♡'}
                            </button>
                            <button
                                type="button"
                                style={styles.likeCountButton}
                                onClick={() => setShowLikersFor(showLikersFor === selectedPhoto.fileName ? '' : selectedPhoto.fileName)}
                                aria-expanded={showLikersFor === selectedPhoto.fileName}
                                aria-label="Show who liked this photo"
                            >
                                {photoLikeCounts[selectedPhoto.fileName] || 0} likes
                            </button>
                            <button
                                type="button"
                                style={styles.toolButton}
                                onClick={() => handleDownload(selectedPhoto)}
                                aria-label="Download photo"
                                title="Download"
                            >
                                ↓
                            </button>
                            <button
                                type="button"
                                style={styles.toolButton}
                                onClick={handleFullscreen}
                                aria-label="Toggle fullscreen"
                                title="Fullscreen"
                            >
                                ⛶
                            </button>
                        </div>
                        {showLikersFor === selectedPhoto.fileName && (
                            <div style={styles.likersPopover} role="status">
                                <strong>Liked by</strong>
                                {photoLikers[selectedPhoto.fileName]?.length ? (
                                    <ul style={styles.likersList}>
                                        {photoLikers[selectedPhoto.fileName].map((name, index) => (
                                            <li key={`${name}-${index}`}>{name}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p style={styles.noLikers}>No likes yet.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    page: {
        background: "#f8f6f3",
        minHeight: "100vh",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Georgia, 'Times New Roman', serif",
        padding: "2rem",
        color: "#2d2d2d",
    },
    backButton: {
        position: "absolute",
        top: "1rem",
        left: "1rem",
        padding: "0.55rem 0.8rem",
        border: "1px solid #d7c9c0",
        borderRadius: 4,
        background: "rgba(248, 246, 243, 0.92)",
        color: "#5F5E5A",
        fontFamily: "inherit",
        fontSize: 14,
        cursor: "pointer",
    },
    welcome: {
        minHeight: "60vh",
        width: "100%",
        display: "grid",
        placeItems: "center",
    },
    welcomeCard: {
        textAlign: "center",
        padding: "2rem 1rem",
        width: "100%",
        maxWidth: 480,
    },
    welcomeKicker: {
        margin: 0,
        color: "#7b6b63",
        fontSize: 12,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
    },
    welcomeRule: {
        width: 48,
        height: 1,
        margin: "1rem auto",
        background: "#cbb7aa",
    },
    welcomeTitle: {
        margin: 0,
        color: "#2d2d2d",
        fontSize: "clamp(32px, 7vw, 56px)",
        fontWeight: 400,
        lineHeight: 1.08,
    },
    welcomeCopy: {
        margin: "0.75rem 0 0",
        color: "#5d5b59",
        fontSize: 15,
    },
    content: {
        width: "min(100%, 980px)",
        padding: "2rem 0",
    },
    eyebrow: {
        margin: 0,
        color: "#7b6b63",
        fontSize: 11,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        textAlign: "center",
    },
    heading: {
        fontSize: "clamp(28px, 6vw, 48px)",
        fontWeight: 400,
        color: "#2D2D2D",
        margin: "0 0 1rem",
        lineHeight: 1.12,
        textAlign: "center",
    },
    description: {
        fontSize: 16,
        color: "#5F5E5A",
        maxWidth: 600,
        textAlign: "center",
        margin: "0 auto 2rem",
        lineHeight: 1.6,
    },
    // Column count and row height come from the CSS in the <style> block above.
    // They used to be set here, which overrode the responsive breakpoints.
    grid: {
        display: "grid",
        gap: 12,
        marginBottom: "2rem",
    },
    galleryControls: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "0.65rem",
        margin: "0 0 1rem",
    },
    sortLabel: {
        color: "#5F5E5A",
        fontSize: 13,
    },
    sortSelect: {
        padding: "0.55rem 0.7rem",
        border: "1px solid #d7c9c0",
        borderRadius: 4,
        background: "#fff",
        color: "#2d2d2d",
        fontFamily: "inherit",
        fontSize: 14,
    },
    tile: {
        margin: 0,
        overflow: "hidden",
        borderRadius: 4,
        background: "#eee8e3",
    },
    tall: { gridRow: "span 2" },
    wide: { gridColumn: "span 2" },
    standard: {},
    photo: {
        display: "block",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transition: "opacity 0.35s ease, transform 0.4s ease",
    },
    photoLoadingSkin: {
        position: "absolute",
        inset: 0,
        zIndex: 1,
        background: "#e9e1db",
    },
    photoButton: {
        position: "relative",
        display: "block",
        width: "100%",
        height: "100%",
        padding: 0,
        border: 0,
        cursor: "zoom-in",
        background: "transparent",
    },
    likeBadge: {
        position: "absolute",
        right: 8,
        bottom: 8,
        padding: "0.3rem 0.5rem",
        borderRadius: 12,
        background: "rgba(30, 27, 25, 0.72)",
        color: "#fff",
        fontSize: 12,
        lineHeight: 1,
    },
    verifyPanel: {
        margin: "0 auto 2rem",
        padding: "1.75rem 1.5rem 1.5rem",
        maxWidth: 560,
        width: "100%",
        background: "#f3efe9",
        border: "1px solid #e5ddd5",
        borderRadius: 6,
        textAlign: "center",
    },
    panelKicker: {
        margin: 0,
        color: "#7b6b63",
        fontSize: 11,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
    },
    panelCopy: {
        margin: "1rem 0 0",
        color: "#5F5E5A",
        fontSize: 17,
        fontWeight: 550,
        lineHeight: 1.6,
    },
    form: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop: "2rem",
        gap: "0.9rem",
    },
    input: {
        padding: "0.95rem 1rem",
        fontSize: 16,
        border: "1px solid #d7c9c0",
        borderRadius: 4,
        width: "100%",
        maxWidth: 420,
        background: "#fff",
        boxSizing: "border-box",
    },
    button: {
        padding: "0.9rem 1.5rem",
        fontSize: 16,
        backgroundColor: "#2C2C2A",
        color: "#fff",
        border: "none",
        borderRadius: 4,
        cursor: "pointer",
        minWidth: 150,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        letterSpacing: "0.04em",
    },
    buttonDisabled: {
        opacity: 0.45,
        cursor: "not-allowed",
    },
    uploadPanel: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1rem",
        margin: "0 auto 2rem",
        padding: "1.75rem 1.5rem 1.5rem",
        maxWidth: 560,
        width: "100%",
        boxSizing: "border-box",
        background: "#f3efe9",
        border: "1px solid #e5ddd5",
        borderRadius: 6,
        textAlign: "center",
    },
    dropzone: {
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        width: "100%",
        boxSizing: "border-box",
        padding: "1.75rem 1rem",
        background: "#fff",
        border: "1px dashed #bfaea3",
        borderRadius: 4,
        cursor: "pointer",
    },
    dropzoneTitle: {
        fontSize: 17,
        color: "#2d2d2d",
    },
    dropzoneHint: {
        fontSize: 13,
        color: "#7b6b63",
    },
    visuallyHidden: {
        position: "absolute",
        width: 1,
        height: 1,
        margin: -1,
        padding: 0,
        overflow: "hidden",
        clip: "rect(0 0 0 0)",
        border: 0,
    },
    error: {
        maxWidth: 560,
        margin: "0 auto 1.5rem",
        padding: "0.75rem 1rem",
        background: "#f8ecea",
        border: "1px solid #e8cfcb",
        borderRadius: 4,
        color: "#8b3a32",
        fontSize: 14,
        textAlign: "center",
    },
    status: {
        gridColumn: "1 / -1",
        textAlign: "center",
        color: "#5F5E5A",
        padding: "2rem 0",
    },
    lightbox: {
        position: "fixed",
        inset: 0,
        zIndex: 10,
        display: "grid",
        placeItems: "center",
        padding: "1.5rem",
        background: "rgba(30, 27, 25, 0.9)",
    },
    lightboxContent: {
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1rem",
        width: "min(100%, 1100px)",
        maxHeight: "100%",
    },
    lightboxImage: {
        display: "block",
        width: "auto",
        maxWidth: "100%",
        height: "min(78vh, 820px)",
        objectFit: "contain",
        background: "#191716",
    },
    closeButton: {
        position: "absolute",
        top: "-0.75rem",
        right: "-0.75rem",
        zIndex: 1,
        width: 40,
        height: 40,
        border: "1px solid rgba(255, 255, 255, 0.5)",
        borderRadius: "50%",
        background: "#f8f6f3",
        color: "#2d2d2d",
        fontSize: 28,
        lineHeight: 1,
        cursor: "pointer",
    },
    lightboxToolbar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
    },
    likeCountButton: {
        color: "#fff",
        fontSize: 14,
        minWidth: 48,
        border: 0,
        background: "transparent",
        cursor: "pointer",
        textDecoration: "underline",
        textUnderlineOffset: 3,
    },
    likersPopover: {
        position: "absolute",
        bottom: 64,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(240px, 80vw)",
        maxHeight: 220,
        overflowY: "auto",
        padding: "0.9rem 1rem",
        borderRadius: 6,
        background: "#f8f6f3",
        color: "#2d2d2d",
        textAlign: "left",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.28)",
    },
    likersList: {
        margin: "0.55rem 0 0",
        paddingLeft: "1.2rem",
        lineHeight: 1.6,
    },
    noLikers: {
        margin: "0.55rem 0 0",
        color: "#5F5E5A",
    },
    toolButton: {
        width: 44,
        height: 44,
        border: "1px solid rgba(255, 255, 255, 0.45)",
        borderRadius: "50%",
        background: "rgba(255, 255, 255, 0.12)",
        color: "#fff",
        fontSize: 23,
        lineHeight: 1,
        cursor: "pointer",
    },
    likedButton: {
        color: "#f08b7c",
        borderColor: "#f08b7c",
    },
    spinner: {
        display: "inline-block",
        width: 16,
        height: 16,
        border: "2px solid rgba(255, 255, 255, 0.45)",
        borderTopColor: "#fff",
        borderRadius: "50%",
        animation: "verifySpin 0.7s linear infinite",
        verticalAlign: "middle",
    },
    caution: {
        fontSize: 12,
        marginTop: "0.1rem",
        color: "#6d6663",
        display: "block",
        lineHeight: 1.5,
    },
    share: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.75rem",
        marginBottom: "2rem",
        fontSize: 14,
        color: "#5F5E5A",
        textAlign: "center",
    }
};
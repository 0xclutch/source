// A database where everyone can access the photos from the wedding and upload their own
// They will have to verify by using the email used when registering for the wedding!


// Info required to verify access (then give them session access because they wont want to login multiple times)
// Name



import React, { useState } from 'react';

const photoTiles = [
    { src: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=85', alt: 'Couple celebrating outdoors', size: 'tall' },
    { src: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=85', alt: 'Wedding table details', size: 'wide' },
    { src: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=85', alt: 'Wedding ceremony flowers', size: 'standard' },
    { src: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=900&q=85', alt: 'Guests sharing a toast', size: 'standard' },
    { src: 'https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=900&q=85', alt: 'Bride holding a bouquet', size: 'tall' },
    { src: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=85', alt: 'Wedding reception lights', size: 'wide' },
];

// Replace this template with the real verification request.
async function verifyAccess({ fullName }) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return { verified: Boolean(fullName) };
}

export default function EventPhotos() {
    const [fullName, setFullName] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);

    async function handleVerify(event) {
        event.preventDefault();
        if (isVerifying || !fullName.trim()) return;

        setIsVerifying(true);
        try {
            const result = await verifyAccess({ fullName: fullName.trim() });
            if (result?.verified) {
                setIsVerified(true);
                setShowWelcome(true);
                window.setTimeout(() => setShowWelcome(false), 1400);
            }
        } finally {
            setIsVerifying(false);
        }
    }

    return (
        <div style={styles.page}>
            <style>{`
                @keyframes verifySpin { to { transform: rotate(360deg); } }
                .event-photo-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                @media (min-width: 720px) { .event-photo-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
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
                            <button type="submit" style={styles.button} disabled={isVerifying || !fullName.trim()}>
                                {isVerifying ? <span style={styles.spinner} aria-label="Verifying" /> : 'Verify'}
                            </button>
                        </form>
                    </section>

                    <div style={styles.share}>
                        <i>To access the event photos, please scan this QR code</i>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://photos.weddingofjamesandkatie.com" alt="QR Code" />
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

                    <div className="event-photo-grid" style={styles.grid}>
                        {photoTiles.map((photo) => (
                            <figure key={photo.src} style={{ ...styles.tile, ...styles[photo.size] }}>
                                <img src={photo.src} alt={photo.alt} style={styles.photo} />
                            </figure>
                        ))}
                    </div>

                    <div style={styles.share}>
                        <i>To access the event photos, please scan this QR code</i>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://photos.weddingofjamesandkatie.com" alt="QR Code" />
                    </div>
                </main>
            )}
        </div>
    );
}

const styles = {
    page: {
        background: "#f8f6f3",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Georgia, 'Times New Roman', serif",
        padding: "2rem",
        color: "#2d2d2d",
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
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gridAutoRows: 160,
        gap: 12,
        marginBottom: "2rem",
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


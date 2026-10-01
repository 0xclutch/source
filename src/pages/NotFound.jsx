import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.errorCode}>404</div>
        <h1 style={styles.heading}>This doesn't look right.. 🤔</h1>
        <p style={styles.subtitle}>
          This page doesn't exist (kind of like Grant's dancing skills).
        </p>
        <p style={styles.description}>
          Don't worry, we'll get you back to where you need to be. Just click the button below and you'll be back at the party in no time!
        </p>
        <Link to="/" style={styles.button}>
          Return to the homepage
        </Link>
        <p style={styles.footer}>
          ✦ Still lost? Contact us at info@grantandfrancis.com ✦
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: "#faf9f7",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Georgia, 'Times New Roman', serif",
    padding: "clamp(1rem, 4vw, 2rem)",
    boxSizing: "border-box",
    overflowX: "hidden",
    width: "100%",
  },
  container: {
    textAlign: "center",
    maxWidth: 500,
    boxSizing: "border-box",
    width: "100%",
  },
  errorCode: {
    fontSize: "clamp(80px, 20vw, 200px)",
    fontWeight: 300,
    color: "#e8d5c0",
    lineHeight: 1,
    margin: "0 0 1rem",
    fontFamily: "Georgia, serif",
    textShadow: "2px 2px 4px rgba(0,0,0,0.05)",
  },
  heading: {
    fontSize: "clamp(28px, 6vw, 48px)",
    fontWeight: 300,
    color: "#2C2C2A",
    margin: "0 0 1rem",
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 16,
    color: "#5F5E5A",
    margin: "0 0 1.5rem",
    fontFamily: "Georgia, serif",
    fontStyle: "italic",
    fontWeight: 300,
  },
  description: {
    fontSize: 14,
    color: "#5F5E5A",
    lineHeight: 1.7,
    margin: "0 0 2rem",
    fontFamily: "system-ui, sans-serif",
  },
  button: {
    display: "inline-block",
    background: "#2C2C2A",
    color: "#f5f0e8",
    padding: "14px 32px",
    fontSize: 14,
    fontFamily: "system-ui, sans-serif",
    letterSpacing: "0.05em",
    textDecoration: "none",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  footer: {
    fontSize: 12,
    color: "#888780",
    margin: "2rem 0 0",
    fontFamily: "system-ui, sans-serif",
    letterSpacing: "0.08em",
  },
};

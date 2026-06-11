import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";

export default function Home() {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("ecofarming_token");
    localStorage.removeItem("ecofarming_username");
    localStorage.removeItem("ecofarming_role");
    setUsername("");
    setRole("");
    setIsLoggedIn(false);
  };

  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem("ecofarming_token");
      const storedUser = localStorage.getItem("ecofarming_username");
      const storedRole = localStorage.getItem("ecofarming_role");
      if (storedToken) {
        setUsername(storedUser || "");
        setRole(storedRole || "");
        setIsLoggedIn(true);

        try {
          const res = await fetch("/api/auth/me", {
            headers: {
              "Authorization": `Bearer ${storedToken}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            setRole(data.role || "");
            localStorage.setItem("ecofarming_role", data.role || "");
          } else {
            handleLogout();
          }
        } catch (err) {
          console.error("Gagal verifikasi session:", err);
        }
      }
    };

    verifyAuth();
  }, []);
  // SVG Avatars for team members without uploaded photos
  const DicoAvatar = () => (
    <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ backgroundColor: "#e2f5ec" }}>
      <circle cx="50" cy="40" r="20" fill="hsl(var(--primary))" opacity="0.8"/>
      <path d="M20 80C20 63.4315 33.4315 50 50 50C66.5685 50 80 63.4315 80 80" fill="hsl(var(--secondary))" opacity="0.85"/>
      <circle cx="50" cy="50" r="48" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 4" opacity="0.4"/>
    </svg>
  );

  const KadangAvatar = () => (
    <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ backgroundColor: "#e0f2f1" }}>
      <circle cx="50" cy="40" r="20" fill="hsl(var(--secondary))" opacity="0.8"/>
      <path d="M20 80C20 63.4315 33.4315 50 50 50C66.5685 50 80 63.4315 80 80" fill="hsl(var(--primary))" opacity="0.85"/>
      <circle cx="50" cy="50" r="48" stroke="hsl(var(--secondary))" strokeWidth="2" strokeDasharray="4 4" opacity="0.4"/>
    </svg>
  );

  return (
    <>
      <Head>
        <title>EcoFarming - Sistem Rekomendasi Tanaman Presisi Kecerdasan Buatan</title>
        <meta name="description" content="Aplikasi EcoFarming membantu petani menentukan jenis tanaman terbaik berdasarkan analisis hara tanah (NPK) dan iklim menggunakan algoritma Naive Bayes." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Top Contact Bar */}
      <div style={{
        background: "hsl(var(--primary))",
        color: "white",
        fontSize: "0.8rem",
        padding: "0.6rem 2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontWeight: "500",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>🌾</span> Sistem Informasi & Rekomendasi Lahan Pertanian Cerdas
        </div>
        <div style={{ display: "flex", gap: "1.5rem" }} className="topbar-contacts">
          <span>📧 support@ecofarming.id</span>
          <span>📞 +62 813-5818-7878</span>
        </div>
      </div>

      {/* Sticky Premium Navbar */}
      <nav className="navbar" id="navbar">
        <div className="navbar-container">
          <Link href="/" className="logo" id="nav-logo" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <img src="/logoecofarm.jpeg" alt="EcoFarming Logo" style={{ height: "42px", width: "auto", borderRadius: "8px" }} />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "hsl(var(--text-dark))" }}>EcoFarming</span>
          </Link>
          <ul className="nav-menu" id="nav-menu">
            <li><a href="#fitur" className="nav-item-link" id="link-fitur">Tentang Kami</a></li>
            <li><a href="#algoritma" className="nav-item-link" id="link-algo">Algoritma AI</a></li>
            <li><a href="#tim" className="nav-item-link" id="link-tim">Tim Kami</a></li>
            {isLoggedIn ? (
              <>
                {role === "admin" && (
                  <li>
                    <Link href="/admin" className="nav-item-link" id="link-admin" style={{ color: "hsl(var(--accent))", fontWeight: "700" }}>
                      ⚙️ Dashboard Admin
                    </Link>
                  </li>
                )}
                <li style={{ fontSize: "0.95rem", fontWeight: "600", color: "hsl(var(--text-muted))" }}>
                  👤 {username}
                </li>
                <li>
                  <button onClick={handleLogout} style={{
                    background: "transparent",
                    border: "none",
                    color: "hsl(var(--danger))",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "0.95rem",
                    padding: 0
                  }} id="nav-btn-logout">
                    Keluar
                  </button>
                </li>
              </>
            ) : (
              <li>
                <Link href="/login" className="nav-item-link" id="link-login">
                  Masuk
                </Link>
              </li>
            )}
            <li>
              <Link href="/analisis" className="btn-nav" id="btn-start-nav" style={{ background: "hsl(var(--accent))", color: "hsl(var(--text-dark))", border: "none" }}>
                Mulai Analisis
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Main Container */}
      <main style={{ overflow: "hidden" }}>
        
        {/* Redesigned Hero Section */}
        <section style={{ padding: "6rem 2rem 8rem 2rem", background: "linear-gradient(180deg, hsla(45, 15%, 94%, 0.8) 0%, hsl(var(--bg-color)) 100%)" }}>
          <div className="container animate-fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "4rem", alignItems: "center" }} className="grid-split">
              {/* Left Column */}
              <div style={{ textAlign: "left" }}>
                <div className="section-badge" style={{ marginBottom: "1rem" }} id="hero-badge">
                  ⚡ Pertanian Presisi Era 5.0
                </div>
                
                <h1 style={{ 
                  fontSize: "3.25rem", 
                  fontWeight: 800, 
                  fontFamily: "var(--font-display)", 
                  lineHeight: 1.15,
                  marginBottom: "1.5rem", 
                  color: "hsl(var(--text-dark))",
                  letterSpacing: "-0.03em"
                }} id="hero-title">
                  Leading Provider of Smart Agriculture for All Farmers.
                </h1>
                
                <p style={{ 
                  fontSize: "1.1rem", 
                  color: "hsl(var(--text-muted))", 
                  marginBottom: "2.5rem", 
                  lineHeight: "1.7" 
                }} id="hero-desc">
                  EcoFarming menggabungkan analisis unsur hara tanah (NPK) dan klimatologi lingkungan secara cerdas menggunakan algoritma <strong>Naive Bayes</strong> untuk menyarankan komoditas tanaman dengan tingkat kecocokan terbaik di lahan Anda.
                </p>

                <div className="hero-cta-group" id="hero-cta-group" style={{ justifyContent: "flex-start" }}>
                  <Link href="/analisis" className="btn-primary" style={{ width: "auto", textDecoration: "none", padding: "1.1rem 2.2rem", background: "hsl(var(--primary))", color: "#ffffff" }} id="btn-hero-primary">
                    Mulai Analisis Lahan &rarr;
                  </Link>
                  <a href="#fitur" className="btn-secondary" id="btn-hero-secondary" style={{ padding: "1.1rem 2.2rem" }}>
                    Pelajari Fitur
                  </a>
                </div>
              </div>

              {/* Right Column - Smart Farming Image inside a premium framed container */}
              <div style={{ position: "relative" }} id="app-preview-container">
                <div style={{
                  position: "absolute",
                  top: "15px",
                  left: "15px",
                  right: "-15px",
                  bottom: "-15px",
                  background: "hsl(var(--accent))",
                  borderRadius: "16px",
                  zIndex: 1
                }}></div>
                <div style={{ 
                  position: "relative",
                  borderRadius: "16px", 
                  overflow: "hidden",
                  border: "1px solid hsl(var(--card-border))",
                  boxShadow: "var(--shadow-lg)",
                  zIndex: 2,
                  background: "#ffffff"
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/smart_farming_hero.png" 
                    alt="EcoFarming Precision Agriculture" 
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Overlapping Highlights Grid Section */}
        <section style={{ padding: "0 2rem", background: "transparent" }}>
          <div className="container" style={{ marginTop: "-4rem", position: "relative", zIndex: 10 }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.5rem"
            }}>
              {/* Card 1: Green Accent Card */}
              <div className="feature-card card-green" style={{ padding: "2.5rem 2rem", borderRadius: "12px" }}>
                <div className="feature-icon-box" style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>🧪</div>
                <h3 className="feature-title" style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem" }}>Hara Tanah Presisi</h3>
                <p className="feature-desc" style={{ fontSize: "0.9rem", opacity: "0.9" }}>
                  Mendeteksi kesesuaian kadar Nitrogen (N), Fosfor (P), dan Kalium (K) untuk pertumbuhan optimal tanaman budidaya.
                </p>
                <div style={{ marginTop: "1.5rem", fontWeight: "700", fontSize: "0.85rem" }}>Discover More &rarr;</div>
              </div>
              
              {/* Card 2: Yellow Accent Card */}
              <div className="feature-card card-yellow" style={{ padding: "2.5rem 2rem", borderRadius: "12px" }}>
                <div className="feature-icon-box" style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>🌤️</div>
                <h3 className="feature-title" style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem" }}>Solusi Iklim & pH</h3>
                <p className="feature-desc" style={{ fontSize: "0.9rem", opacity: "0.9" }}>
                  Memperhitungkan faktor lingkungan krusial seperti suhu rata-rata, persentase kelembaban udara, pH tanah, dan curah hujan tahunan.
                </p>
                <div style={{ marginTop: "1.5rem", fontWeight: "700", fontSize: "0.85rem" }}>Discover More &rarr;</div>
              </div>
              
              {/* Card 3: White Cream Card */}
              <div className="feature-card card-cream" style={{ padding: "2.5rem 2rem", borderRadius: "12px" }}>
                <div className="feature-icon-box" style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>🤖</div>
                <h3 className="feature-title" style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem" }}>Rekomendasi Cerdas</h3>
                <p className="feature-desc" style={{ fontSize: "0.9rem", opacity: "0.9" }}>
                  Melakukan kalkulasi klasifikasi instan menggunakan Teorema Bayes untuk menghitung peluang kesuksesan budidaya tanaman.
                </p>
                <div style={{ marginTop: "1.5rem", fontWeight: "700", fontSize: "0.85rem", color: "hsl(var(--primary))" }}>Discover More &rarr;</div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: About Us (Redesigned About Block with crop hand image) */}
        <section style={{ padding: "8rem 2rem", background: "#ffffff" }} id="fitur">
          <div className="container">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4.5rem", alignItems: "center" }} className="grid-split">
              {/* Left Column: About content */}
              <div>
                <span className="section-badge" style={{ marginBottom: "0.75rem" }}>Tentang Kami</span>
                <h2 style={{ fontSize: "2.5rem", fontWeight: "800", lineHeight: "1.2", marginBottom: "1.5rem", color: "hsl(var(--text-dark))" }}>
                  Currently We are Growing & Selling Organic Food and Best Agriculture.
                </h2>
                <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.95rem", lineHeight: "1.7", marginBottom: "2rem" }}>
                  EcoFarming berkomitmen membantu petani mengoptimalkan produktivitas tanah secara sains. Dengan sistem rekomendasi berbasis Naive Bayes, kami memetakan kondisi tanah riil ke profil agronomi tanaman ideal untuk meminimalkan risiko gagal panen.
                </p>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "hsla(42, 75%, 57%, 0.15)", display: "flex", alignItems: "center", justifyCenter: "center", color: "hsl(var(--accent))", fontWeight: "bold", fontSize: "0.85rem", flexShrink: 0, justifyContent: "center" }}>✓</div>
                    <span style={{ fontSize: "0.95rem", fontWeight: "600", color: "hsl(var(--text-dark))" }}>Analisis Unsur Hara Tanah Terpadu (NPK & pH)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "hsla(42, 75%, 57%, 0.15)", display: "flex", alignItems: "center", justifyCenter: "center", color: "hsl(var(--accent))", fontWeight: "bold", fontSize: "0.85rem", flexShrink: 0, justifyContent: "center" }}>✓</div>
                    <span style={{ fontSize: "0.95rem", fontWeight: "600", color: "hsl(var(--text-dark))" }}>Integrasi Iklim Bulanan (Curah Hujan & Suhu)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "hsla(42, 75%, 57%, 0.15)", display: "flex", alignItems: "center", justifyCenter: "center", color: "hsl(var(--accent))", fontWeight: "bold", fontSize: "0.85rem", flexShrink: 0, justifyContent: "center" }}>✓</div>
                    <span style={{ fontSize: "0.95rem", fontWeight: "600", color: "hsl(var(--text-dark))" }}>Penyimpanan Cloud Riwayat & Cetak PDF Laporan</span>
                  </div>
                </div>
                
                <div style={{ marginTop: "2.5rem" }}>
                  <Link href="/analisis" className="btn-primary" style={{ width: "auto", padding: "1.1rem 2.2rem", textDecoration: "none", background: "hsl(var(--primary))", color: "#ffffff" }}>
                    Coba Analisis Lahan &rarr;
                  </Link>
                </div>
              </div>

              {/* Right Column: Image with offset yellow border */}
              <div style={{ position: "relative" }}>
                <div style={{
                  position: "absolute",
                  top: "-15px",
                  left: "-15px",
                  right: "15px",
                  bottom: "15px",
                  border: "3px solid hsl(var(--accent))",
                  borderRadius: "16px",
                  zIndex: 1
                }}></div>
                <div style={{
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "var(--shadow-lg)",
                  position: "relative",
                  zIndex: 2,
                  background: "#ffffff"
                }}>
                  <img 
                    src="/bibit dan tanah di ataas tangan.jpg" 
                    alt="Bibit pertanian subur" 
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Machine Learning Algorithms */}
        <section className="ml-section" id="algoritma" style={{ padding: "6rem 2rem", background: "linear-gradient(180deg, transparent 0%, hsla(165, 100%, 14%, 0.03) 100%)" }}>
          <div className="container">
            <div className="ml-grid" id="ml-grid">
              
              <div className="ml-content-card" id="ml-card-info" style={{ borderRadius: "12px", border: "1px solid hsl(var(--card-border))" }}>
                <span className="section-badge">Algoritma AI</span>
                <h2 style={{ fontSize: "2.25rem", fontWeight: 800, margin: "0.5rem 0 1rem 0", color: "hsl(var(--text-dark))" }}>Engine Machine Learning</h2>
                <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.95rem", lineHeight: "1.7" }}>
                  Aplikasi EcoFarming berjalan dengan memodelkan Teorema Bayes dalam menentukan probabilitas bersyarat kesesuaian tanaman.
                </p>

                <div className="ml-card-inner">
                  <div className="ml-method" id="ml-nb-info" style={{ marginTop: "1rem", borderRadius: "8px", background: "#ffffff", border: "1px solid hsl(var(--card-border))" }}>
                    <h4 className="ml-method-title" style={{ color: "hsl(var(--text-dark))" }}><span>📊</span> Naive Bayes Classifier</h4>
                    <p className="ml-method-desc">
                      Menghitung nilai peluang posterior berdasarkan statistik data latih agronomi untuk tanaman Kopi, Jagung, dan Padi.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ padding: "1rem" }} id="ml-concept-art">
                <h3 style={{ fontSize: "1.65rem", fontWeight: 800, marginBottom: "1rem", color: "hsl(var(--text-dark))" }}>Penelitian & Pengembangan</h3>
                <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.95rem", lineHeight: "1.7", marginBottom: "1.5rem" }}>
                  Aplikasi ini dirancang sebagai tugas proyek praktis mata kuliah <strong>Kecerdasan Buatan</strong>, dengan memfokuskan implementasi pada akurasi Naive Bayes pada dataset pertanian multi-atribut.
                </p>
                <div style={{ background: "#ffffff", border: "1px solid hsl(var(--card-border))", padding: "1.75rem", borderRadius: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", fontSize: "0.9rem", fontWeight: 700 }}>
                    <span>Akurasi Model Naive Bayes</span>
                    <span style={{ color: "hsl(var(--secondary))" }}>88.89%</span>
                  </div>
                  <div style={{ width: "100%", height: "8px", backgroundColor: "hsl(var(--bg-color))", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: "88.89%", height: "100%", backgroundColor: "hsl(var(--secondary))", borderRadius: "4px" }}></div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Section: Komoditas Unggulan */}
        <section style={{ padding: "6rem 2rem", background: "#ffffff" }} id="komoditas">
          <div className="container">
            <div className="section-header">
              <span className="section-badge">Komoditas Lahan</span>
              <h2 className="section-title">Komoditas Rekomendasi Utama</h2>
              <p className="section-desc">
                EcoFarming mengklasifikasikan kesesuaian lahan untuk tiga komoditas pertanian utama berdasarkan kecocokan nutrisi tanah dan iklim mikro.
              </p>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "2rem",
              marginTop: "3rem"
            }}>
              
              {/* Card 1: Padi */}
              <div style={{
                background: "hsl(var(--bg-color))",
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid hsl(var(--card-border))",
                boxShadow: "var(--shadow-sm)"
              }} className="feature-card-hoverable">
                <div style={{ height: "220px", overflow: "hidden", position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/padi.jpg" alt="Budidaya Padi" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }} className="img-hover" />
                  <div style={{ position: "absolute", bottom: "12px", left: "12px", background: "hsl(var(--primary))", color: "white", padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "700" }}>Pangan Utama</div>
                </div>
                <div style={{ padding: "2rem" }}>
                  <h3 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "0.75rem", color: "hsl(var(--text-dark))" }}>Budidaya Tanaman Padi</h3>
                  <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.9rem", lineHeight: "1.6", marginBottom: "1.5rem" }}>
                    Tanaman padi sangat cocok di lahan dengan curah hujan tinggi (&gt;200 mm), pH netral (5.5 - 7.0), kelembaban tinggi, dan persediaan irigasi teratur untuk menggenangi petak sawah.
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ background: "#ffffff", border: "1px solid hsl(var(--card-border))", color: "hsl(var(--text-dark))", padding: "0.25rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600" }}>💧 Air Tinggi</span>
                    <span style={{ background: "#ffffff", border: "1px solid hsl(var(--card-border))", color: "hsl(var(--text-dark))", padding: "0.25rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600" }}>🧪 pH Netral</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Jagung */}
              <div style={{
                background: "hsl(var(--bg-color))",
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid hsl(var(--card-border))",
                boxShadow: "var(--shadow-sm)"
              }} className="feature-card-hoverable">
                <div style={{ height: "220px", overflow: "hidden", position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/jagung.jpg" alt="Budidaya Jagung" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }} className="img-hover" />
                  <div style={{ position: "absolute", bottom: "12px", left: "12px", background: "hsl(var(--accent))", color: "hsl(var(--text-dark))", padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "700" }}>Pangan & Pakan</div>
                </div>
                <div style={{ padding: "2rem" }}>
                  <h3 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "0.75rem", color: "hsl(var(--text-dark))" }}>Budidaya Tanaman Jagung</h3>
                  <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.9rem", lineHeight: "1.6", marginBottom: "1.5rem" }}>
                    Jagung membutuhkan hara Nitrogen (N) tinggi untuk pembentukan daun, drainase tanah yang baik, pH optimal 5.5 - 7.0, serta pasokan curah hujan sedang (100 - 200 mm).
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ background: "#ffffff", border: "1px solid hsl(var(--card-border))", color: "hsl(var(--text-dark))", padding: "0.25rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600" }}>⚡ Nitrogen Tinggi</span>
                    <span style={{ background: "#ffffff", border: "1px solid hsl(var(--card-border))", color: "hsl(var(--text-dark))", padding: "0.25rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600" }}>🌤️ Air Sedang</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Kopi */}
              <div style={{
                background: "hsl(var(--bg-color))",
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid hsl(var(--card-border))",
                boxShadow: "var(--shadow-sm)"
              }} className="feature-card-hoverable">
                <div style={{ height: "220px", overflow: "hidden", position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/petani kopi.jpg" alt="Perkebunan Kopi" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }} className="img-hover" />
                  <div style={{ position: "absolute", bottom: "12px", left: "12px", background: "hsl(var(--secondary))", color: "white", padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "700" }}>Perkebunan</div>
                </div>
                <div style={{ padding: "2rem" }}>
                  <h3 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "0.75rem", color: "hsl(var(--text-dark))" }}>Budidaya Tanaman Kopi</h3>
                  <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.9rem", lineHeight: "1.6", marginBottom: "1.5rem" }}>
                    Kopi memerlukan temperatur relatif sejuk, pH tanah agak masam hingga netral (5.0 - 6.5), unsur hara Kalium (K) tinggi untuk pengisian buah, dan curah hujan cukup.
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ background: "#ffffff", border: "1px solid hsl(var(--card-border))", color: "hsl(var(--text-dark))", padding: "0.25rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600" }}>☕ Iklim Sejuk</span>
                    <span style={{ background: "#ffffff", border: "1px solid hsl(var(--card-border))", color: "hsl(var(--text-dark))", padding: "0.25rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "600" }}>🍂 Kalium Tinggi</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Section: Academic Team */}
        <section className="team-section" id="tim" style={{ padding: "7rem 2rem" }}>
          <div className="container">
            <div className="section-header">
              <span className="section-badge" id="team-badge">Tim Akademik</span>
              <h2 className="section-title" id="team-title">Dosen Pengampu & Pengembang</h2>
              <p className="section-desc" id="team-desc">
                Dirancang dan dibangun untuk memenuhi tugas besar mata kuliah Kecerdasan Buatan di Universitas Janabadra Yogyakarta.
              </p>
            </div>

            {/* Dosen Pengampu Card */}
            <div className="dosen-leader-container" id="dosen-leader-container">
              <div className="dosen-card" id="dosen-card" style={{ borderLeft: "5px solid hsl(var(--accent))" }}>
                <div className="avatar-wrapper" style={{ width: "110px", height: "110px", flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/dosen_yumarlin.jpg" 
                    alt="Yumarlin MZ, S.Kom., M.Pd., M.Kom" 
                    className="avatar-image"
                  />
                </div>
                <div className="dosen-info">
                  <span className="dosen-title-tag" style={{ color: "hsl(var(--primary))" }}>Dosen Pengampu</span>
                  <h3 className="dosen-name">Yumarlin MZ, S.Kom., M.Pd., M.Kom</h3>
                  <p className="team-univ">
                    Staf Pengajar Program Studi Informatika<br/>
                    <strong>Universitas Janabadra Yogyakarta</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Nama Kelompok Mahasiswa */}
            <h3 style={{ textAlign: "center", fontFamily: "var(--font-display)", fontSize: "1.65rem", fontWeight: 800, marginBottom: "3rem", color: "hsl(var(--text-dark))" }}>
              Kelompok Mahasiswa Pembuat
            </h3>
            
            <div className="team-grid" id="students-grid">
              
              {/* Mahasiswa 1: Yusuf Mustofa */}
              <div className="team-card" id="student-yusuf">
                <div className="avatar-wrapper">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/yusuf_mustof.jpg" 
                    alt="Yusuf Mustofa" 
                    className="avatar-image"
                  />
                </div>
                <h4 className="team-name">Yusuf Mustofa</h4>
                <span className="team-role">Frontend & Backend Dev</span>
                <p style={{ fontSize: "0.85rem", fontWeight: "700", color: "hsl(var(--text-muted))", marginBottom: "0.5rem" }}>NIM. 22330004</p>
                <p className="team-univ">Program Studi Informatika<br/>Universitas Janabadra</p>
              </div>

              {/* Mahasiswa 2: Dicko Ramadhan */}
              <div className="team-card" id="student-dico">
                <div className="avatar-wrapper">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/dico_ramadhan.jpg" 
                    alt="Dicko Ramadhan" 
                    className="avatar-image"
                  />
                </div>
                <h4 className="team-name">Dicko Ramadhan</h4>
                <span className="team-role">Dokumen/Laporan</span>
                <p style={{ fontSize: "0.85rem", fontWeight: "700", color: "hsl(var(--text-muted))", marginBottom: "0.5rem" }}>NIM. 23330042</p>
                <p className="team-univ">Program Studi Informatika<br/>Universitas Janabadra</p>
              </div>

              {/* Mahasiswa 3: Kadang Katon */}
              <div className="team-card" id="student-kadang">
                <div className="avatar-wrapper">
                  <KadangAvatar />
                </div>
                <h4 className="team-name">Kadang Katon</h4>
                <span className="team-role">Dataset</span>
                <p style={{ fontSize: "0.85rem", fontWeight: "700", color: "hsl(var(--text-muted))", marginBottom: "0.5rem" }}>NIM. 23330033</p>
                <p className="team-univ">Program Studi Informatika<br/>Universitas Janabadra</p>
              </div>

            </div>
          </div>
        </section>

        {/* Call to Action Banner */}
        <section style={{ padding: "6rem 2rem", background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)", color: "white", textAlign: "center" }}>
          <div className="container">
            <h2 style={{ fontSize: "2.75rem", fontFamily: "var(--font-display)", fontWeight: 800, color: "white", marginBottom: "1.25rem" }}>
              Siap Menguji Kesuburan Tanah Lahan Anda?
            </h2>
            <p style={{ fontSize: "1.15rem", maxWidth: "650px", margin: "0 auto 2.5rem auto", opacity: 0.9, lineHeight: "1.7" }}>
              Analisis secara instan kandungan hara NPK, pH, serta iklim mikro lahan pertanian Anda sekarang demi hasil panen yang melimpah.
            </p>
            <Link href="/analisis" className="btn-primary" style={{ 
              width: "auto", 
              background: "hsl(var(--accent))", 
              color: "hsl(var(--text-dark))", 
              fontWeight: 800,
              padding: "1.2rem 2.8rem",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.12)",
              border: "none"
            }} id="cta-btn-bottom">
              Mulai Analisis Lahan &rarr;
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ background: "hsl(var(--text-dark))", color: "hsla(0, 0%, 100%, 0.65)", padding: "5rem 2rem 3rem 2rem", fontSize: "0.9rem", borderTop: "4px solid hsl(var(--accent))" }}>
          <div className="container" style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "3rem" }}>
              <div>
                <h4 style={{ color: "white", fontSize: "1.35rem", fontWeight: 800, marginBottom: "1.25rem", fontFamily: "var(--font-display)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <img src="/logoecofarm.jpeg" alt="Logo" style={{ height: "30px", borderRadius: "4px" }} /> EcoFarming
                </h4>
                <p style={{ maxWidth: "320px", lineHeight: "1.7" }}>
                  Sistem pakar analisis pertanian cerdas berbasis web untuk merekomendasikan kecocokan jenis komoditas tanaman.
                </p>
              </div>
              <div>
                <h5 style={{ color: "white", fontWeight: 700, marginBottom: "1.25rem", fontSize: "1rem" }}>Navigasi</h5>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <li><a href="#fitur" style={{ color: "inherit", textDecoration: "none" }}>Tentang Kami</a></li>
                  <li><a href="#algoritma" style={{ color: "inherit", textDecoration: "none" }}>Algoritma AI</a></li>
                  <li><a href="#tim" style={{ color: "inherit", textDecoration: "none" }}>Tim Pembuat</a></li>
                  <li><Link href="/analisis" style={{ color: "inherit", textDecoration: "none" }}>Alat Prediksi</Link></li>
                </ul>
              </div>
              <div>
                <h5 style={{ color: "white", fontWeight: 700, marginBottom: "1.25rem", fontSize: "1rem" }}>Akademik</h5>
                <p style={{ lineHeight: "1.7", maxWidth: "280px" }}>
                  Mata Kuliah Kecerdasan Buatan<br/>
                  Program Studi Informatika<br/>
                  Fakultas Teknologi Informasi<br/>
                  <strong>Universitas Janabadra Yogyakarta</strong>
                </p>
              </div>
            </div>
            <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)", paddingTop: "2.5rem", textAlign: "center", fontSize: "0.85rem", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
              <p>© {new Date().getFullYear()} EcoFarming. Hak Cipta Dilindungi.</p>
              <p>Dibuat oleh Kelompok Yusuf Mustofa, Dicko Ramadhan & Kadang Katon.</p>
            </div>
          </div>
        </footer>

      </main>
    </>
  );
}

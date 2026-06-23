import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import ResultComparison from "../components/ResultComparison";

const CROP_IMAGES = {
  Padi: "/padi.jpg",
  Jagung: "/jagung.jpg",
  Kopi: "/petani kopi.jpg"
};


const N_LABEL = { 1: "Rendah (<60)", 2: "Sedang (60-90)", 3: "Tinggi (>90)" };
const P_LABEL = { 1: "Rendah (<35)", 2: "Sedang (35-55)", 3: "Tinggi (>55)" };
const K_LABEL = { 1: "Rendah (<20)", 2: "Sedang (20-35)", 3: "Tinggi (>35)" };
const TEMP_LABEL = { 1: "Rendah (<20°C)", 2: "Sedang (20-25°C)", 3: "Tinggi (>25°C)" };
const HUMID_LABEL = { 1: "Rendah (<55%)", 2: "Sedang (55-70%)", 3: "Tinggi (>70%)" };
const PH_LABEL = { 1: "Masam (<5.5)", 2: "Netral (5.5-7.0)", 3: "Basa (>7.0)" };
const RAIN_LABEL = { 1: "Rendah (<100 mm)", 2: "Sedang (100-200 mm)", 3: "Tinggi (>200 mm)" };
const IRIGASI_LABEL = { 0: "Tidak Ada", 1: "Ada" };

export default function Analisis() {
  const router = useRouter();
  
  const [values, setValues] = useState({
    N: 2,
    P: 2,
    K: 2,
    temperature: 2,
    humidity: 2,
    ph: 2,
    rainfall: 2,
    irigasi: 1
  });

  const [selectedModel, setSelectedModel] = useState("Naive Bayes");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("user");
  const [isReady, setIsReady] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem("ecofarming_token");
      const storedUser = localStorage.getItem("ecofarming_username");
      const storedRole = localStorage.getItem("ecofarming_role");

      if (!storedToken) {
        router.push("/login?unauthorized=true");
        return;
      }

      // Set values from localStorage for fast render path
      setToken(storedToken);
      setUsername(storedUser || "");
      setRole(storedRole || "user");
      setIsReady(true);

      try {
        // Verify securely with backend
        const res = await fetch("/api/auth/me", {
          headers: {
            "Authorization": `Bearer ${storedToken}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setRole(data.role || "user");
          localStorage.setItem("ecofarming_role", data.role || "user");
        } else {
          handleLogoutDirectly();
        }
      } catch (err) {
        console.error("Gagal memverifikasi akun:", err);
      }
    };

    verifyAuth();
  }, [router]);

  useEffect(() => {
    if (token) {
      fetchHistory(token);
    }
  }, [token]);

  const handleLogoutDirectly = () => {
    localStorage.removeItem("ecofarming_token");
    localStorage.removeItem("ecofarming_username");
    localStorage.removeItem("ecofarming_role");
    router.push("/login?session_expired=true");
  };

  const fetchHistory = async (authToken) => {
    const activeToken = authToken || token;
    if (!activeToken) return;

    setLoadingHistory(true);
    try {
      const res = await fetch("/api/history", {
        headers: {
          "Authorization": `Bearer ${activeToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      } else if (res.status === 401) {
        handleLogoutDirectly();
      }
    } catch (err) {
      console.error("Gagal mengambil data riwayat:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleValueChange = (name, val) => {
    setValues((prev) => ({
      ...prev,
      [name]: val
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...values,
          selected_model: selectedModel
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleLogoutDirectly();
          return;
        }
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Terjadi kesalahan saat memproses prediksi.");
        } else {
          const errorText = await response.text();
          throw new Error(errorText || `Error ${response.status}: Gagal memproses prediksi.`);
        }
      }

      const data = await response.json();
      setResults(data);
      // Reload history to show new predictions
      fetchHistory(token);
    } catch (err) {
      console.error(err);
      setError(err.message || "Gagal menghubungi server API. Pastikan backend FastAPI Anda sudah berjalan.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!history || history.length === 0) {
      alert("Belum ada riwayat untuk diunduh!");
      return;
    }
    try {
      // Dynamic import to prevent SSR window reference error
      const { default: jsPDF } = await import("jspdf");
      await import("jspdf-autotable");

      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.text("Laporan Riwayat Prediksi Lahan - EcoFarming", 14, 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Dicetak pada: ${new Date().toLocaleString("id-ID")}`, 14, 22);

      const tableHeaders = [
        ["Nitrogen", "Fosfor", "Kalium", "pH", "Suhu", "Kelembaban", "Curah Hujan", "Irigasi", "Tanaman"]
      ];

      const tableRows = history.map((item) => {
        const predCrop = item.nb_prediction;
        return [
          N_LABEL[item.inputs.N] || item.inputs.N,
          P_LABEL[item.inputs.P] || item.inputs.P,
          K_LABEL[item.inputs.K] || item.inputs.K,
          PH_LABEL[item.inputs.ph] || item.inputs.ph,
          TEMP_LABEL[item.inputs.temperature] || item.inputs.temperature,
          HUMID_LABEL[item.inputs.humidity] || item.inputs.humidity,
          RAIN_LABEL[item.inputs.rainfall] || item.inputs.rainfall,
          IRIGASI_LABEL[item.inputs.irigasi] || (item.inputs.irigasi === 0 ? "Tidak Ada" : "Ada"),
          predCrop
        ];
      });

      doc.autoTable({
        head: tableHeaders,
        body: tableRows,
        startY: 28,
        theme: "striped",
        headStyles: { fillColor: [46, 125, 50] } // Green accent color
      });

      doc.save("riwayat-prediksi-ecofarming.pdf");
    } catch (err) {
      console.error("Gagal membuat PDF:", err);
      alert("Terjadi kesalahan saat mengunduh berkas PDF.");
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus semua riwayat prediksi? Tindakan ini tidak dapat dibatalkan.")) {
      return;
    }

    try {
      const response = await fetch("/api/history", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert("Semua riwayat berhasil dibersihkan.");
        setHistory([]);
      } else {
        if (response.status === 401) {
          handleLogoutDirectly();
          return;
        }
        const errorData = await response.json();
        alert(errorData.detail || "Gagal menghapus riwayat.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan koneksi.");
    }
  };

  const predictedCrop = results ? results.nb.prediction : null;
  const cropImgSrc = predictedCrop ? CROP_IMAGES[predictedCrop] : null;

  if (!isReady) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, hsla(135, 20%, 95%, 0.8) 0%, hsla(152, 30%, 90%, 0.8) 100%)",
        color: "hsl(var(--text-muted))",
        fontSize: "1rem",
        fontWeight: "600",
        fontFamily: "var(--font-sans)"
      }}>
        🔄 Memuat Halaman...
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>EcoFarming - Alat Analisis Lahan Cerdas</title>
        <meta name="description" content="Masukkan data tanah untuk merekomendasikan kesesuaian tanaman menggunakan model Naive Bayes." />
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

          {/* Backdrop for mobile drawer */}
          <div className={`nav-backdrop ${isMenuOpen ? "open" : ""}`} onClick={() => setIsMenuOpen(false)}></div>

          {/* Hamburger Toggle Button */}
          <button className="nav-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu" aria-expanded={isMenuOpen}>
            <span className={`hamburger ${isMenuOpen ? "open" : ""}`}></span>
          </button>

          {/* Desktop & Mobile Navigation Wrapper */}
          <div className={`nav-menu-wrapper ${isMenuOpen ? "open" : ""}`} id="nav-menu-wrapper">
            <ul className="nav-links">
              <li>
                <Link href="/" className="nav-item-link" id="link-beranda" onClick={() => setIsMenuOpen(false)}>
                  Beranda
                </Link>
              </li>
            </ul>
            <ul className="nav-actions">
              {role === "admin" && (
                <li>
                  <Link href="/admin" className="nav-item-link" id="link-admin" onClick={() => setIsMenuOpen(false)} style={{ color: "hsl(var(--accent))", fontWeight: "700" }}>
                    ⚙️ Dashboard Admin
                  </Link>
                </li>
              )}
              {username && (
                <li className="user-badge-nav" style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  background: "hsl(var(--bg-color))",
                  border: "1px solid hsl(var(--card-border))",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "20px",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  whiteSpace: "nowrap"
                }}>
                  <span style={{ color: "hsl(var(--text-muted))" }}>👤 {username}</span>
                  {token && (
                    <>
                      <span style={{ color: "hsl(var(--card-border))" }}>|</span>
                      <button onClick={() => { handleLogoutDirectly(); setIsMenuOpen(false); }} style={{
                        background: "transparent",
                        border: "none",
                        color: "hsl(var(--danger))",
                        fontWeight: "600",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        padding: 0
                      }} id="nav-btn-logout">
                        Keluar
                      </button>
                    </>
                  )}
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "2.5rem 2rem 5rem 2rem" }}>
        
        {router.query.unauthorized === "true" && (
          <div style={{
            padding: "1rem 1.5rem",
            background: "hsla(350, 80%, 48%, 0.08)",
            border: "1px solid hsla(350, 80%, 48%, 0.15)",
            borderRadius: "12px",
            color: "hsl(var(--danger))",
            fontSize: "0.9rem",
            fontWeight: "600",
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            ⚠️ Anda tidak memiliki hak akses (role administrator) untuk mengakses Dashboard Admin. Halaman tersebut khusus untuk Administrator sistem.
          </div>
        )}
        
        {/* Page Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <span className="section-badge" style={{ marginBottom: "0.75rem" }}>Analisis Lahan Cerdas</span>
          <h1 style={{ 
            fontSize: "2.5rem", 
            fontWeight: 800, 
            fontFamily: "var(--font-sans)", 
            color: "hsl(var(--text-dark))", 
            letterSpacing: "-0.03em", 
            margin: 0,
            lineHeight: 1.2
          }}>
            Rekomendasi Tanaman Komoditas Pertanian
          </h1>
          <p style={{ fontSize: "0.95rem", color: "hsl(var(--text-muted))", marginTop: "0.5rem" }}>
            Masukkan data unsur hara tanah (NPK), pH, serta iklim mikro lahan pertanian Anda di bawah ini untuk memprediksi kesesuaian tanaman menggunakan Naive Bayes.
          </p>
        </div>

        {/* Prediction Form & Inputs */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "2rem" }} className="glass-panel" id="analisis-form">
          <div style={{ padding: "2.5rem 2rem 1.5rem 2rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem" }} className="grid-split">
              
              {/* Left Column - V1 to V4 Dropdowns */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                
                {/* Nitrogen Input */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "0.9rem", fontWeight: "600", color: "hsl(var(--text-dark))" }}>
                      Nitrogen (N) - V1
                    </label>
                    <span style={{ cursor: "help", fontSize: "0.85rem", color: "hsl(var(--text-muted))" }} title="Kandungan senyawa Nitrogen tanah">❔</span>
                  </div>
                  <select
                    value={values.N}
                    onChange={(e) => handleValueChange("N", parseInt(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--card-border))",
                      background: "hsl(var(--bg-color))",
                      color: "hsl(var(--text-dark))",
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      outline: "none",
                      cursor: "pointer",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "hsl(var(--primary))"}
                    onBlur={(e) => e.target.style.borderColor = "hsl(var(--card-border))"}
                  >
                    <option value={1}>Rendah (&lt;60 mg/kg)</option>
                    <option value={2}>Sedang (60-90 mg/kg)</option>
                    <option value={3}>Tinggi (&gt;90 mg/kg)</option>
                  </select>
                </div>

                {/* Fosfor Input */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "0.9rem", fontWeight: "600", color: "hsl(var(--text-dark))" }}>
                      Fosfor (P) - V2
                    </label>
                    <span style={{ cursor: "help", fontSize: "0.85rem", color: "hsl(var(--text-muted))" }} title="Kandungan senyawa Fosfor tanah">❔</span>
                  </div>
                  <select
                    value={values.P}
                    onChange={(e) => handleValueChange("P", parseInt(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--card-border))",
                      background: "hsl(var(--bg-color))",
                      color: "hsl(var(--text-dark))",
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      outline: "none",
                      cursor: "pointer",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "hsl(var(--primary))"}
                    onBlur={(e) => e.target.style.borderColor = "hsl(var(--card-border))"}
                  >
                    <option value={1}>Rendah (&lt;35 mg/kg)</option>
                    <option value={2}>Sedang (35-55 mg/kg)</option>
                    <option value={3}>Tinggi (&gt;55 mg/kg)</option>
                  </select>
                </div>

                {/* Kalium Input */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "0.9rem", fontWeight: "600", color: "hsl(var(--text-dark))" }}>
                      Kalium (K) - V3
                    </label>
                    <span style={{ cursor: "help", fontSize: "0.85rem", color: "hsl(var(--text-muted))" }} title="Kandungan senyawa Kalium tanah">❔</span>
                  </div>
                  <select
                    value={values.K}
                    onChange={(e) => handleValueChange("K", parseInt(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--card-border))",
                      background: "hsl(var(--bg-color))",
                      color: "hsl(var(--text-dark))",
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      outline: "none",
                      cursor: "pointer",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "hsl(var(--primary))"}
                    onBlur={(e) => e.target.style.borderColor = "hsl(var(--card-border))"}
                  >
                    <option value={1}>Rendah (&lt;20 mg/kg)</option>
                    <option value={2}>Sedang (20-35 mg/kg)</option>
                    <option value={3}>Tinggi (&gt;35 mg/kg)</option>
                  </select>
                </div>

                {/* Suhu Input */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "0.9rem", fontWeight: "600", color: "hsl(var(--text-dark))" }}>
                      Temperatur - V4
                    </label>
                    <span style={{ cursor: "help", fontSize: "0.85rem", color: "hsl(var(--text-muted))" }} title="Temperatur lingkungan lahan">❔</span>
                  </div>
                  <select
                    value={values.temperature}
                    onChange={(e) => handleValueChange("temperature", parseInt(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--card-border))",
                      background: "hsl(var(--bg-color))",
                      color: "hsl(var(--text-dark))",
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      outline: "none",
                      cursor: "pointer",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "hsl(var(--primary))"}
                    onBlur={(e) => e.target.style.borderColor = "hsl(var(--card-border))"}
                  >
                    <option value={1}>Rendah (&lt;20°C)</option>
                    <option value={2}>Sedang (20-25°C)</option>
                    <option value={3}>Tinggi (&gt;25°C)</option>
                  </select>
                </div>

              </div>

              {/* Right Column - V5 to V8 Dropdowns */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                
                {/* Kelembaban Input */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "0.9rem", fontWeight: "600", color: "hsl(var(--text-dark))" }}>
                      Kelembaban (%) - V5
                    </label>
                    <span style={{ cursor: "help", fontSize: "0.85rem", color: "hsl(var(--text-muted))" }} title="Kelembaban udara sekitar lahan">❔</span>
                  </div>
                  <select
                    value={values.humidity}
                    onChange={(e) => handleValueChange("humidity", parseInt(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--card-border))",
                      background: "hsl(var(--bg-color))",
                      color: "hsl(var(--text-dark))",
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      outline: "none",
                      cursor: "pointer",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "hsl(var(--primary))"}
                    onBlur={(e) => e.target.style.borderColor = "hsl(var(--card-border))"}
                  >
                    <option value={1}>Rendah (&lt;55%)</option>
                    <option value={2}>Sedang (55-70%)</option>
                    <option value={3}>Tinggi (&gt;70%)</option>
                  </select>
                </div>

                {/* pH Tanah Input */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "0.9rem", fontWeight: "600", color: "hsl(var(--text-dark))" }}>
                      pH Tanah - V6
                    </label>
                    <span style={{ cursor: "help", fontSize: "0.85rem", color: "hsl(var(--text-muted))" }} title="Tingkat keasaman tanah">❔</span>
                  </div>
                  <select
                    value={values.ph}
                    onChange={(e) => handleValueChange("ph", parseInt(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--card-border))",
                      background: "hsl(var(--bg-color))",
                      color: "hsl(var(--text-dark))",
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      outline: "none",
                      cursor: "pointer",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "hsl(var(--primary))"}
                    onBlur={(e) => e.target.style.borderColor = "hsl(var(--card-border))"}
                  >
                    <option value={1}>Masam (&lt;5.5)</option>
                    <option value={2}>Netral (5.5-7.0)</option>
                    <option value={3}>Basa (&gt;7.0)</option>
                  </select>
                </div>

                {/* Curah Hujan Input */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "0.9rem", fontWeight: "600", color: "hsl(var(--text-dark))" }}>
                      Curah Hujan (mm) - V7
                    </label>
                    <span style={{ cursor: "help", fontSize: "0.85rem", color: "hsl(var(--text-muted))" }} title="Curah hujan rata-rata bulanan">❔</span>
                  </div>
                  <select
                    value={values.rainfall}
                    onChange={(e) => handleValueChange("rainfall", parseInt(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--card-border))",
                      background: "hsl(var(--bg-color))",
                      color: "hsl(var(--text-dark))",
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      outline: "none",
                      cursor: "pointer",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "hsl(var(--primary))"}
                    onBlur={(e) => e.target.style.borderColor = "hsl(var(--card-border))"}
                  >
                    <option value={1}>Rendah (&lt;100 mm)</option>
                    <option value={2}>Sedang (100-200 mm)</option>
                    <option value={3}>Tinggi (&gt;200 mm)</option>
                  </select>
                </div>

                {/* Irigasi Input */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "0.9rem", fontWeight: "600", color: "hsl(var(--text-dark))" }}>
                      Irigasi - V8
                    </label>
                    <span style={{ cursor: "help", fontSize: "0.85rem", color: "hsl(var(--text-muted))" }} title="Ketersediaan infrastruktur irigasi lahan">❔</span>
                  </div>
                  <select
                    value={values.irigasi}
                    onChange={(e) => handleValueChange("irigasi", parseInt(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--card-border))",
                      background: "hsl(var(--bg-color))",
                      color: "hsl(var(--text-dark))",
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      outline: "none",
                      cursor: "pointer",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "hsl(var(--primary))"}
                    onBlur={(e) => e.target.style.borderColor = "hsl(var(--card-border))"}
                  >
                    <option value={1}>Ada Irigasi</option>
                    <option value={0}>Tidak Ada Irigasi</option>
                  </select>
                </div>

              </div>

            </div>

            {/* Submit Button */}
            <div style={{ marginTop: "2.5rem" }}>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  width: "auto",
                  padding: "1rem 3rem",
                  background: "hsl(var(--primary))",
                  color: "#ffffff",
                  fontSize: "1rem",
                  borderRadius: "8px",
                  border: "none"
                }}
              >
                {loading ? "Menganalisis..." : "Prediksi Tanaman →"}
              </button>
            </div>
            
          </div>

          {error && (
            <div style={{ padding: "1rem 2rem", background: "hsla(350, 80%, 55%, 0.1)", borderTop: "1px solid hsla(350, 80%, 55%, 0.2)", color: "hsl(var(--danger))", fontSize: "0.9rem" }}>
              ⚠️ {error}
            </div>
          )}

          {/* Result Block - Box showing recommended crop and its illustration */}
          {predictedCrop && (
            <div style={{
              padding: "2rem",
              background: "#ffffff",
              borderTop: "1px solid hsl(var(--card-border))",
              display: "flex",
              flexDirection: "column",
              gap: "2rem"
            }} id="result-box-section">
              
              {/* Green check notification box */}
              <div style={{
                background: "hsla(142, 70%, 36%, 0.1)",
                border: "1px solid hsla(142, 70%, 36%, 0.2)",
                borderRadius: "12px",
                padding: "1.25rem 1.5rem",
                color: "hsl(var(--success))",
                fontWeight: "600",
                fontSize: "1.1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem"
              }}>
                <span style={{ fontSize: "1.4rem" }}>🌾</span> Rekomendasi Tanaman Terbaik: <strong style={{ color: "hsl(var(--primary))" }}>{predictedCrop}</strong>
              </div>

              {/* Crop image container with offset gold frame */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.75rem" }}>
                {cropImgSrc ? (
                  <div style={{ position: "relative", marginTop: "0.5rem", marginLeft: "10px", marginBottom: "10px" }}>
                    <div style={{
                      position: "absolute",
                      top: "8px",
                      left: "8px",
                      right: "-8px",
                      bottom: "-8px",
                      background: "hsl(var(--accent))",
                      borderRadius: "12px",
                      zIndex: 1
                    }}></div>
                    <div style={{
                      width: "180px",
                      height: "180px",
                      borderRadius: "12px",
                      overflow: "hidden",
                      border: "1px solid hsl(var(--card-border))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#ffffff",
                      boxShadow: "var(--shadow-md)",
                      position: "relative",
                      zIndex: 2
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cropImgSrc}
                        alt={predictedCrop}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ width: "180px", height: "180px", border: "1px dashed hsl(var(--card-border))", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(var(--text-muted))" }}>
                    Tanpa Gambar
                  </div>
                )}
                <span style={{ fontSize: "0.85rem", color: "hsl(var(--text-muted))", fontStyle: "italic", marginTop: "0.5rem" }}>
                  Ilustrasi Komoditas: {predictedCrop}
                </span>
              </div>

            </div>
          )}

        </form>

        {/* Result Comparison Block */}
        {results && <ResultComparison data={results} />}

        {/* Prediction History Section */}
        <section style={{ marginTop: "4rem" }} id="history-section">
          <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "hsl(var(--text-dark))", marginBottom: "1.5rem", fontFamily: "var(--font-display)" }}>
            Riwayat Prediksi Lahan
          </h2>

          <div className="glass-panel" style={{ overflowX: "auto", border: "1px solid hsl(var(--card-border))", borderRadius: "12px", background: "#ffffff" }}>
            {loadingHistory ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "hsl(var(--text-muted))" }}>
                Memuat riwayat...
              </div>
            ) : !history || history.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "hsl(var(--text-muted))", fontSize: "0.95rem" }}>
                Belum ada riwayat prediksi. Masukkan parameter di atas untuk memulai!
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ background: "hsl(var(--primary))", borderBottom: "2px solid hsl(var(--card-border))" }}>
                    <th style={{ padding: "1.2rem 1rem", color: "#ffffff", fontWeight: "600", fontSize: "0.85rem", textAlign: "center" }}>Nitrogen</th>
                    <th style={{ padding: "1.2rem 1rem", color: "#ffffff", fontWeight: "600", fontSize: "0.85rem", textAlign: "center" }}>Fosfor</th>
                    <th style={{ padding: "1.2rem 1rem", color: "#ffffff", fontWeight: "600", fontSize: "0.85rem", textAlign: "center" }}>Kalium</th>
                    <th style={{ padding: "1.2rem 1rem", color: "#ffffff", fontWeight: "600", fontSize: "0.85rem", textAlign: "center" }}>pH</th>
                    <th style={{ padding: "1.2rem 1rem", color: "#ffffff", fontWeight: "600", fontSize: "0.85rem", textAlign: "center" }}>Suhu</th>
                    <th style={{ padding: "1.2rem 1rem", color: "#ffffff", fontWeight: "600", fontSize: "0.85rem", textAlign: "center" }}>Kelembaban</th>
                    <th style={{ padding: "1.2rem 1rem", color: "#ffffff", fontWeight: "600", fontSize: "0.85rem", textAlign: "center" }}>Curah Hujan</th>
                    <th style={{ padding: "1.2rem 1rem", color: "#ffffff", fontWeight: "600", fontSize: "0.85rem", textAlign: "center" }}>Irigasi</th>
                    <th style={{ padding: "1.2rem 1rem", color: "#ffffff", fontWeight: "600", fontSize: "0.85rem", textAlign: "center" }}>Rekomendasi Tanaman</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => {
                    const isKNN = item.selected_model === "K-Nearest Neighbors (KNN)";
                    const predCrop = isKNN ? item.knn_prediction : item.nb_prediction;
                    const irigasiText = item.inputs && item.inputs.irigasi === 0 ? "❌ Tidak" : "✅ Ada";
                    return (
                      <tr key={item.id} style={{ borderBottom: "1px solid hsl(var(--card-border))", transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "hsla(165, 100%, 14%, 0.02)"} onMouseOut={(e) => e.currentTarget.style.background = "none"}>
                        <td style={{ padding: "1rem", color: "hsl(var(--text-dark))", textAlign: "center", fontWeight: "500" }}>{N_LABEL[item.inputs.N] || item.inputs.N}</td>
                        <td style={{ padding: "1rem", color: "hsl(var(--text-dark))", textAlign: "center", fontWeight: "500" }}>{P_LABEL[item.inputs.P] || item.inputs.P}</td>
                        <td style={{ padding: "1rem", color: "hsl(var(--text-dark))", textAlign: "center", fontWeight: "500" }}>{K_LABEL[item.inputs.K] || item.inputs.K}</td>
                        <td style={{ padding: "1rem", color: "hsl(var(--text-dark))", textAlign: "center", fontWeight: "500" }}>{PH_LABEL[item.inputs.ph] || item.inputs.ph}</td>
                        <td style={{ padding: "1rem", color: "hsl(var(--text-dark))", textAlign: "center", fontWeight: "500" }}>{TEMP_LABEL[item.inputs.temperature] || item.inputs.temperature}</td>
                        <td style={{ padding: "1rem", color: "hsl(var(--text-dark))", textAlign: "center", fontWeight: "500" }}>{HUMID_LABEL[item.inputs.humidity] || item.inputs.humidity}</td>
                        <td style={{ padding: "1rem", color: "hsl(var(--text-dark))", textAlign: "center", fontWeight: "500" }}>{RAIN_LABEL[item.inputs.rainfall] || item.inputs.rainfall}</td>
                        <td style={{ padding: "1rem", color: "hsl(var(--text-dark))", textAlign: "center", fontWeight: "600" }}>{irigasiText}</td>
                        <td style={{ padding: "1rem", color: "hsl(var(--success))", textAlign: "center", fontWeight: "800" }}>{predCrop}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Action Buttons */}
          {history && history.length > 0 && (
            <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <button
                onClick={handleDownloadPDF}
                style={{
                  padding: "0.75rem 1.75rem",
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  borderRadius: "8px",
                  background: "hsl(var(--accent))",
                  border: "none",
                  color: "hsl(var(--text-dark))",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-sm)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  transition: "var(--transition)"
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                📥 Unduh Riwayat Prediksi (PDF)
              </button>

              {role === "admin" && (
                <button
                  onClick={handleClearHistory}
                  style={{
                    padding: "0.75rem 1.75rem",
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    borderRadius: "8px",
                    background: "hsla(350, 80%, 48%, 0.1)",
                    border: "1px solid hsla(350, 80%, 48%, 0.2)",
                    color: "hsl(var(--danger))",
                    cursor: "pointer",
                    boxShadow: "var(--shadow-sm)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    transition: "var(--transition)"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "hsla(350, 80%, 48%, 0.15)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "hsla(350, 80%, 48%, 0.1)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  🗑️ Hapus Semua Riwayat (Admin)
                </button>
              )}
            </div>
          )}

        </section>

      </main>
    </>
  );
}

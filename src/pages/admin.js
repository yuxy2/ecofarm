import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dataset"); // dataset, pemakai
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Data states
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [dataset, setDataset] = useState([]);
  const [history, setHistory] = useState([]);

  // Modal states for calculation details
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [calculationDetails, setCalculationDetails] = useState(null);
  const [loadingCalculation, setLoadingCalculation] = useState(false);
  const [calculationError, setCalculationError] = useState("");
  const [modalActiveTab, setModalActiveTab] = useState("ringkasan");
  const [activeLikelihoodClass, setActiveLikelihoodClass] = useState("Padi");
  
  // Tab local filter states
  const [cropFilter, setCropFilter] = useState("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Local storage credentials
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem("ecofarming_token");
      const storedUser = localStorage.getItem("ecofarming_username");
      const storedRole = localStorage.getItem("ecofarming_role");

      if (!storedToken) {
        router.push("/login?unauthorized=true");
        return;
      }

      // Cepat kembalikan jika role lokal sudah bukan admin
      if (storedRole !== "admin") {
        router.push("/analisis?unauthorized=true");
        return;
      }

      try {
        // Validasi secara aman ke backend
        const res = await fetch("/api/auth/me", {
          headers: {
            "Authorization": `Bearer ${storedToken}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem("ecofarming_role", data.role);
          if (data.role !== "admin") {
            router.push("/analisis?unauthorized=true");
          } else {
            setToken(storedToken);
            setUsername(storedUser || "");
            setRole(data.role);
            setIsReady(true);
          }
        } else {
          handleLogoutDirectly();
        }
      } catch (err) {
        console.error("Gagal verifikasi autentikasi:", err);
        router.push("/login?unauthorized=true");
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (isReady && token) {
      fetchAdminData();
    }
  }, [isReady, token]);

  const fetchAdminData = async () => {
    setLoading(true);
    setError("");
    try {
      const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      };

      const [statsRes, usersRes, datasetRes, historyRes] = await Promise.all([
        fetch("/api/admin/stats", { headers }),
        fetch("/api/admin/users", { headers }),
        fetch("/api/admin/dataset", { headers }),
        fetch("/api/history", { headers })
      ]);

      if (statsRes.status === 403 || usersRes.status === 403 || datasetRes.status === 403 || historyRes.status === 403) {
        router.push("/analisis?unauthorized=true");
        return;
      }

      if (statsRes.status === 401 || usersRes.status === 401 || datasetRes.status === 401 || historyRes.status === 401) {
        handleLogoutDirectly();
        return;
      }

      if (!statsRes.ok) {
        throw new Error(`Gagal mengambil statistik admin (${statsRes.status})`);
      }
      if (!usersRes.ok) {
        throw new Error(`Gagal mengambil data pemakai (${usersRes.status})`);
      }
      if (!datasetRes.ok) {
        throw new Error(`Gagal mengambil data dataset (${datasetRes.status})`);
      }
      if (!historyRes.ok) {
        throw new Error(`Gagal mengambil riwayat analisis (${historyRes.status})`);
      }

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();
      const datasetData = await datasetRes.json();
      const historyData = await historyRes.json();

      setStats(statsData);
      setUsers(usersData);
      setDataset(datasetData);
      setHistory(historyData);
    } catch (err) {
      console.error(err);
      setError(err.message || "Gagal menghubungi server API Admin.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutDirectly = () => {
    localStorage.removeItem("ecofarming_token");
    localStorage.removeItem("ecofarming_username");
    localStorage.removeItem("ecofarming_role");
    router.push("/login?session_expired=true");
  };

  const formatShortDate = (isoString) => {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch (e) {
      return isoString;
    }
  };

  const handleOpenCalculation = async (item) => {
    setSelectedHistoryItem(item);
    setIsModalOpen(true);
    setLoadingCalculation(true);
    setCalculationError("");
    setCalculationDetails(null);
    setModalActiveTab("ringkasan");
    setActiveLikelihoodClass("Padi");
    try {
      const inputs = item.inputs || {};
      const url = `/api/admin/calculate-nb?N=${inputs.N || 0}&P=${inputs.P || 0}&K=${inputs.K || 0}&ph=${inputs.ph || 0}&temperature=${inputs.temperature || 0}&humidity=${inputs.humidity || 0}&rainfall=${inputs.rainfall || 0}&irigasi=${inputs.irigasi || 0}`;
      
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (!res.ok) {
        throw new Error(`Gagal memuat perhitungan (${res.status})`);
      }
      const data = await res.json();
      setCalculationDetails(data);
    } catch (err) {
      console.error(err);
      setCalculationError(err.message || "Gagal menghubungi server untuk memuat perhitungan.");
    } finally {
      setLoadingCalculation(false);
    }
  };

  const handleDeleteSingleHistory = async (itemId) => {
    if (!confirm("Apakah Anda yakin ingin menghapus riwayat analisis ini?")) return;
    try {
      const res = await fetch(`/api/history/${itemId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error(`Gagal menghapus riwayat (${res.status})`);
      }
      // Refresh data
      fetchAdminData();
    } catch (err) {
      console.error(err);
      alert(err.message || "Gagal menghapus riwayat.");
    }
  };

  const handleAddToTraining = async (item) => {
    const inputs = item.inputs || {};
    const prediction = item.nb_prediction;
    if (!prediction) {
      alert("Hasil prediksi tidak valid.");
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menyimpan hasil analisis ini (${prediction}) sebagai tambahan data training baru? Sistem akan melatih ulang model secara otomatis.`)) {
      return;
    }

    try {
      const res = await fetch("/api/admin/add-to-training", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          N: parseInt(inputs.N),
          P: parseInt(inputs.P),
          K: parseInt(inputs.K),
          temperature: parseInt(inputs.temperature),
          humidity: parseInt(inputs.humidity),
          ph: parseInt(inputs.ph),
          rainfall: parseInt(inputs.rainfall),
          irigasi: parseInt(inputs.irigasi),
          label: prediction
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Gagal menambahkan data training.");
      }

      const result = await res.json();
      alert(`Berhasil! ${result.message}\nTotal data latih sekarang: ${result.total_rows} baris.\nAkurasi model baru: ${result.accuracy}%.`);
      
      // Refresh admin data to show updated stats and dataset
      fetchAdminData();
    } catch (err) {
      console.error(err);
      alert(err.message || "Terjadi kesalahan saat menyimpan data training.");
    }
  };

  if (!isReady || loading) {
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
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🔄</div>
          <div>Memuat Panel Admin...</div>
        </div>
      </div>
    );
  }

  // Indonesian date formatter helper
  const formatDate = (isoString) => {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return isoString;
    }
  };

  const filteredDataset = dataset.filter((row) => {
    if (cropFilter === "Semua") return true;
    return row.label === cropFilter;
  });

  const totalPages = Math.ceil(filteredDataset.length / 10);
  const startIndex = (currentPage - 1) * 10;
  const paginatedDataset = filteredDataset.slice(startIndex, startIndex + 10);

  return (
    <>
      <Head>
        <title>EcoFarming - Dashboard Admin</title>
        <meta name="description" content="Dashboard khusus admin untuk melihat data pemakai dan data klasifikasi Naive Bayes." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Main Sidebar Layout Container */}
      <div style={{
        display: "flex",
        minHeight: "100vh",
        background: "hsl(var(--bg-color))",
        color: "hsl(var(--text-main))",
        fontFamily: "var(--font-sans)"
      }}>
        
        {/* Mobile Responsive Style Injections */}
        <style>{`
          @media (max-width: 992px) {
            .admin-sidebar {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              bottom: 0 !important;
              transform: ${sidebarOpen ? "translateX(0)" : "translateX(-100%)"} !important;
              transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1) !important;
              z-index: 1000 !important;
            }
            .admin-sidebar-overlay {
              display: ${sidebarOpen ? "block" : "none"} !important;
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              background: rgba(15, 64, 49, 0.5) !important;
              backdrop-filter: blur(6px) !important;
              z-index: 999 !important;
              animation: fadeIn 0.2s ease-out;
            }
            .mobile-hamburger {
              display: flex !important;
            }
            .mobile-sidebar-close {
              display: block !important;
            }
            .main-content-wrapper {
              padding: 1.5rem 1.5rem !important;
            }
            .header-wrapper {
              padding: 1rem 1.5rem !important;
            }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>

        {/* Sidebar Backdrop Overlay for Mobile */}
        <div 
          className="admin-sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar */}
        <aside style={{
          width: "280px",
          background: "linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
          boxShadow: "var(--shadow-lg)",
          zIndex: 10,
          borderRight: "1px solid rgba(255, 255, 255, 0.05)",
          flexShrink: 0
        }} className="admin-sidebar">
          
          {/* Close Button on Mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="mobile-sidebar-close"
            style={{
              display: "none",
              position: "absolute",
              top: "1.5rem",
              right: "1.5rem",
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "#ffffff",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: "1.1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "var(--transition)"
            }}
          >
            ✕
          </button>

          {/* Logo & Brand */}
          <div style={{
            padding: "2.5rem 1.5rem 2rem 1.5rem",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.85rem"
          }}>
            <img 
              src="/logoecofarm.jpeg" 
              alt="EcoFarming Logo" 
              style={{ 
                height: "64px", 
                width: "64px", 
                borderRadius: "16px", 
                border: "2.5px solid hsl(var(--accent))",
                boxShadow: "0 8px 20px rgba(0, 0, 0, 0.25)" 
              }} 
            />
            <div style={{ textAlign: "center" }}>
              <span style={{ 
                fontFamily: "var(--font-display)", 
                fontWeight: 800, 
                fontSize: "1.45rem", 
                display: "block", 
                color: "#ffffff", 
                letterSpacing: "0.02em" 
              }}>EcoFarming</span>
              <span style={{
                fontSize: "0.7rem",
                background: "hsl(var(--accent))",
                color: "hsl(var(--text-dark))",
                padding: "0.2rem 0.6rem",
                borderRadius: "6px",
                fontWeight: 800,
                display: "inline-block",
                marginTop: "0.35rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}>Admin Portal</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ padding: "2rem 1rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            
            {/* Tab: Data Latih */}
            <button
              onClick={() => {
                setActiveTab("dataset");
                setCurrentPage(1);
                setSidebarOpen(false); // Close on mobile navigation
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                width: "100%",
                padding: "0.85rem 1.25rem",
                borderRadius: "8px",
                border: "none",
                borderLeft: activeTab === "dataset" ? "4px solid hsl(var(--accent))" : "4px solid transparent",
                background: activeTab === "dataset" ? "rgba(255, 255, 255, 0.08)" : "transparent",
                color: activeTab === "dataset" ? "#ffffff" : "rgba(255, 255, 255, 0.75)",
                fontSize: "0.95rem",
                fontWeight: activeTab === "dataset" ? "700" : "600",
                cursor: "pointer",
                textAlign: "left",
                transition: "var(--transition)"
              }}
              onMouseOver={(e) => {
                if (activeTab !== "dataset") {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.color = "#ffffff";
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== "dataset") {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.75)";
                }
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
              </svg>
              Data Latih (Dataset)
            </button>

            {/* Tab: Data Pemakai */}
            <button
              onClick={() => {
                setActiveTab("pemakai");
                setCurrentPage(1);
                setSidebarOpen(false); // Close on mobile navigation
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                width: "100%",
                padding: "0.85rem 1.25rem",
                borderRadius: "8px",
                border: "none",
                borderLeft: activeTab === "pemakai" ? "4px solid hsl(var(--accent))" : "4px solid transparent",
                background: activeTab === "pemakai" ? "rgba(255, 255, 255, 0.08)" : "transparent",
                color: activeTab === "pemakai" ? "#ffffff" : "rgba(255, 255, 255, 0.75)",
                fontSize: "0.95rem",
                fontWeight: activeTab === "pemakai" ? "700" : "600",
                cursor: "pointer",
                textAlign: "left",
                transition: "var(--transition)"
              }}
              onMouseOver={(e) => {
                if (activeTab !== "pemakai") {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.color = "#ffffff";
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== "pemakai") {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.75)";
                }
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Data Pemakai (Users)
            </button>

            <hr style={{ border: "none", borderTop: "1px solid rgba(255, 255, 255, 0.08)", margin: "1.5rem 0" }} />

            {/* Link: Alat Analisis */}
            <Link href="/analisis" style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.85rem 1.25rem",
              borderRadius: "8px",
              color: "rgba(255, 255, 255, 0.8)",
              fontSize: "0.95rem",
              fontWeight: "600",
              textDecoration: "none",
              transition: "var(--transition)",
              borderLeft: "4px solid transparent"
            }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
              }}
            >
              <span>🌾</span> Alat Analisis Lahan
            </Link>

            {/* Link: Kembali ke Beranda */}
            <Link href="/" style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.85rem 1.25rem",
              borderRadius: "8px",
              color: "rgba(255, 255, 255, 0.8)",
              fontSize: "0.95rem",
              fontWeight: "600",
              textDecoration: "none",
              transition: "var(--transition)",
              borderLeft: "4px solid transparent"
            }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
              }}
            >
              <span>🏠</span> Beranda App
            </Link>
          </nav>

          {/* Sidebar Footer (Profile & Logout) */}
          <div style={{
            padding: "1.5rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(0, 0, 0, 0.12)",
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "hsl(var(--accent))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "800",
                color: "hsl(var(--text-dark))",
                fontSize: "1.1rem",
                boxShadow: "0 4px 10px rgba(226, 179, 67, 0.25)"
              }}>
                {username ? username.charAt(0).toUpperCase() : "A"}
              </div>
              <div style={{ overflow: "hidden" }}>
                <span style={{ 
                  fontWeight: "700", 
                  display: "block", 
                  fontSize: "0.95rem", 
                  color: "#ffffff", 
                  whiteSpace: "nowrap", 
                  textOverflow: "ellipsis", 
                  overflow: "hidden" 
                }}>{username}</span>
                <span style={{ 
                  fontSize: "0.75rem", 
                  color: "rgba(255, 255, 255, 0.5)", 
                  display: "block",
                  fontWeight: "500" 
                }}>Administrator</span>
              </div>
            </div>
            <button
              onClick={handleLogoutDirectly}
              style={{
                width: "100%",
                padding: "0.7rem",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "rgba(255, 139, 148, 0.08)",
                color: "#ff8b94",
                fontWeight: "700",
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "var(--transition)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.35rem"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#ff8b94";
                e.currentTarget.style.color = "hsl(var(--text-dark))";
                e.currentTarget.style.borderColor = "#ff8b94";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "rgba(255, 139, 148, 0.08)";
                e.currentTarget.style.color = "#ff8b94";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
              }}
            >
              <span>🚪</span> Keluar Panel
            </button>
          </div>
        </aside>

        {/* Right Content Column */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflowY: "auto"
        }}>
          
          {/* Header Dashboard */}
          <header className="header-wrapper" style={{
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(12px)",
            padding: "1.5rem 3rem",
            borderBottom: "1px solid hsl(var(--card-border))",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 5
          }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <button 
                className="mobile-hamburger"
                onClick={() => setSidebarOpen(true)}
                style={{
                  display: "none",
                  background: "transparent",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  marginRight: "1rem",
                  color: "hsl(var(--text-dark))",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.25rem"
                }}
              >
                ☰
              </button>
              <div>
                <h1 style={{ fontSize: "1.85rem", fontWeight: 800, color: "hsl(var(--text-dark))", letterSpacing: "-0.02em", margin: 0 }}>
                  {activeTab === "dataset" ? "Dataset Naive Bayes" : "Data Pemakai & Riwayat"}
                </h1>
                <p style={{ fontSize: "0.85rem", color: "hsl(var(--text-muted))", margin: 0 }}>
                  {activeTab === "dataset" ? "Monitoring data latih klasifikasi tanah" : "Kelola sesi dan log analisis real-time"}
                </p>
              </div>
            </div>
            
            <button 
              onClick={fetchAdminData}
              style={{
                padding: "0.6rem 1.25rem",
                fontSize: "0.875rem",
                fontWeight: "600",
                borderRadius: "8px",
                background: "hsl(var(--bg-color))",
                border: "1px solid hsl(var(--card-border))",
                color: "hsl(var(--text-dark))",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                transition: "var(--transition)"
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = "hsl(var(--primary))"}
              onMouseOut={(e) => e.currentTarget.style.borderColor = "hsl(var(--card-border))"}
            >
              🔄 Segarkan Data
            </button>
          </header>

          <main style={{ padding: "2.5rem 3rem", flexGrow: 1 }}>
            
            {error && (
              <div style={{
                padding: "1rem",
                background: "hsla(350, 80%, 55%, 0.1)",
                border: "1px solid hsla(350, 80%, 55%, 0.2)",
                borderRadius: "8px",
                color: "hsl(var(--danger))",
                marginBottom: "1.5rem",
                fontSize: "0.9rem"
              }}>
                ⚠️ <strong>Galat:</strong> {error}
              </div>
            )}

        {/* Tab Content 1: Dataset Naive Bayes (Default Active) */}
        {activeTab === "dataset" && dataset && (
          <div>
            {/* Stats Cards Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1.5rem",
              marginBottom: "2.5rem"
            }}>
              {/* Card 1: Total Data */}
              <div 
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                }}
                style={{
                  background: "#ffffff",
                  border: "1px solid hsl(var(--card-border))",
                  borderLeft: "5px solid hsl(var(--primary))",
                  borderRadius: "16px",
                  padding: "1.5rem 1.75rem",
                  textAlign: "left",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "var(--transition)",
                  cursor: "default"
                }}
              >
                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "hsl(var(--text-muted))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Total Data Latih
                  </span>
                  <span style={{ display: "block", fontSize: "2.25rem", fontWeight: "800", lineHeight: "1.1", marginTop: "0.35rem", color: "hsl(var(--primary))", fontFamily: "var(--font-display)" }}>
                    {dataset.length}
                  </span>
                </div>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "hsla(165, 100%, 14%, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "hsl(var(--primary))",
                  fontSize: "1.5rem"
                }}>
                  📊
                </div>
              </div>

              {/* Card 2: Padi (K1) */}
              <div 
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                }}
                style={{
                  background: "#ffffff",
                  border: "1px solid hsl(var(--card-border))",
                  borderLeft: "5px solid hsl(var(--secondary))",
                  borderRadius: "16px",
                  padding: "1.5rem 1.75rem",
                  textAlign: "left",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "var(--transition)",
                  cursor: "default"
                }}
              >
                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "hsl(var(--text-muted))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Padi (K1)
                  </span>
                  <span style={{ display: "block", fontSize: "2.25rem", fontWeight: "800", lineHeight: "1.1", marginTop: "0.35rem", color: "hsl(var(--secondary))", fontFamily: "var(--font-display)" }}>
                    {dataset.filter(row => row.label === "Padi").length}
                  </span>
                </div>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "rgba(35, 78, 64, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "hsl(var(--secondary))",
                  fontSize: "1.5rem"
                }}>
                  🌾
                </div>
              </div>

              {/* Card 3: Jagung (K2) */}
              <div 
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                }}
                style={{
                  background: "#ffffff",
                  border: "1px solid hsl(var(--card-border))",
                  borderLeft: "5px solid hsl(var(--accent))",
                  borderRadius: "16px",
                  padding: "1.5rem 1.75rem",
                  textAlign: "left",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "var(--transition)",
                  cursor: "default"
                }}
              >
                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "hsl(var(--text-muted))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Jagung (K2)
                  </span>
                  <span style={{ display: "block", fontSize: "2.25rem", fontWeight: "800", lineHeight: "1.1", marginTop: "0.35rem", color: "hsl(var(--accent))", fontFamily: "var(--font-display)" }}>
                    {dataset.filter(row => row.label === "Jagung").length}
                  </span>
                </div>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "hsla(42, 75%, 57%, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "hsl(var(--accent))",
                  fontSize: "1.5rem"
                }}>
                  🌽
                </div>
              </div>

              {/* Card 4: Kopi (K3) */}
              <div 
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                }}
                style={{
                  background: "#ffffff",
                  border: "1px solid hsl(var(--card-border))",
                  borderLeft: "5px solid hsl(var(--danger))",
                  borderRadius: "16px",
                  padding: "1.5rem 1.75rem",
                  textAlign: "left",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "var(--transition)",
                  cursor: "default"
                }}
              >
                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "hsl(var(--text-muted))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Kopi (K3)
                  </span>
                  <span style={{ display: "block", fontSize: "2.25rem", fontWeight: "800", lineHeight: "1.1", marginTop: "0.35rem", color: "hsl(var(--danger))", fontFamily: "var(--font-display)" }}>
                    {dataset.filter(row => row.label === "Kopi").length}
                  </span>
                </div>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "hsla(350, 80%, 48%, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "hsl(var(--danger))",
                  fontSize: "1.5rem"
                }}>
                  ☕
                </div>
              </div>

              {/* Card 5: Data Baru (Runtime) */}
              <div 
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                }}
                style={{
                  background: "#ffffff",
                  border: "1px solid hsl(var(--card-border))",
                  borderLeft: "5px solid #00acc1",
                  borderRadius: "16px",
                  padding: "1.5rem 1.75rem",
                  textAlign: "left",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "var(--transition)",
                  cursor: "default"
                }}
              >
                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "hsl(var(--text-muted))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Data Baru (Runtime)
                  </span>
                  <span style={{ display: "block", fontSize: "2.25rem", fontWeight: "800", lineHeight: "1.1", marginTop: "0.35rem", color: "#00acc1", fontFamily: "var(--font-display)" }}>
                    {stats ? stats.total_predictions : 0}
                  </span>
                </div>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "rgba(0, 172, 193, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#00acc1",
                  fontSize: "1.5rem"
                }}>
                  ✨
                </div>
              </div>
            </div>

            {/* Table Container Card */}
            <div style={{
              background: "#ffffff",
              border: "1px solid hsl(var(--card-border))",
              borderRadius: "16px",
              boxShadow: "var(--shadow-sm)",
              overflow: "hidden",
              animation: "fadeInUp 0.5s ease-out"
            }}>
              {/* Header Controls */}
              <div className="main-content-wrapper" style={{
                padding: "2rem 2.5rem 1.5rem 2.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1.25rem",
                borderBottom: "1px solid hsl(var(--card-border))"
              }}>
                <h3 style={{ fontSize: "1.45rem", fontWeight: 800, color: "hsl(var(--text-dark))", margin: 0, fontFamily: "var(--font-display)" }}>
                  Data Latih Naive Bayes
                </h3>

                {/* Crop Filter Dropdown */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "hsl(var(--text-muted))" }}>Filter Tanaman:</span>
                  <select
                    value={cropFilter}
                    onChange={(e) => {
                      setCropFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: "0.6rem 1.5rem",
                      borderRadius: "10px",
                      border: "1px solid hsl(var(--card-border))",
                      background: "hsl(var(--bg-color))",
                      fontWeight: "700",
                      fontSize: "0.875rem",
                      color: "hsl(var(--text-dark))",
                      cursor: "pointer",
                      outline: "none",
                      boxShadow: "var(--shadow-sm)",
                      transition: "var(--transition)"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "hsl(var(--primary))"}
                    onBlur={(e) => e.target.style.borderColor = "hsl(var(--card-border))"}
                  >
                    <option value="Semua">Semua Tanaman</option>
                    <option value="Padi">🌾 Padi</option>
                    <option value="Jagung">🌽 Jagung</option>
                    <option value="Kopi">☕ Kopi</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
                  <thead>
                    <tr style={{ background: "hsl(var(--primary))", borderBottom: "2px solid hsl(var(--card-border))" }}>
                      <th style={{ padding: "1.2rem 1rem", color: "#ffffff", fontWeight: "700", textAlign: "center", width: "70px", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>No</th>
                      <th style={{ padding: "1.2rem 1rem", color: "#ffffff", fontWeight: "700", textAlign: "center", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>V1 (N)</th>
                      <th style={{ padding: "1.2rem 1rem", color: "#ffffff", fontWeight: "700", textAlign: "center", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>V2 (P)</th>
                      <th style={{ padding: "1.2rem 1rem", color: "#ffffff", fontWeight: "700", textAlign: "center", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>V3 (K)</th>
                      <th style={{ padding: "1.2rem 1rem", color: "#ffffff", fontWeight: "700", textAlign: "center", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>V4 (Suhu)</th>
                      <th style={{ padding: "1.2rem 1rem", color: "#ffffff", fontWeight: "700", textAlign: "center", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>V5 (Kelembaban)</th>
                      <th style={{ padding: "1.2rem 1rem", color: "#ffffff", fontWeight: "700", textAlign: "center", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>V6 (pH)</th>
                      <th style={{ padding: "1.2rem 1rem", color: "#ffffff", fontWeight: "700", textAlign: "center", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>V7 (Curah Hujan)</th>
                      <th style={{ padding: "1.2rem 1rem", color: "#ffffff", fontWeight: "700", textAlign: "center", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>V8 (Irigasi)</th>
                      <th style={{ padding: "1.2rem 1.5rem", color: "#ffffff", fontWeight: "700", textAlign: "center", width: "120px", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>Label</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDataset.length === 0 ? (
                      <tr>
                        <td colSpan="10" style={{ padding: "4rem", textAlign: "center", color: "hsl(var(--text-muted))", fontWeight: "600" }}>
                          📭 Tidak ada data yang cocok dengan kriteria filter.
                        </td>
                      </tr>
                    ) : (
                      paginatedDataset.map((row, idx) => {
                        const globalIndex = startIndex + idx + 1;
                        
                        // Badges for Label
                        let labelBg = "hsla(142, 70%, 36%, 0.1)";
                        let labelColor = "hsl(142, 70%, 28%)";
                        let labelBorder = "1px solid hsla(142, 70%, 36%, 0.2)";
                        if (row.label === "Jagung") {
                          labelBg = "hsla(42, 75%, 57%, 0.12)";
                          labelColor = "hsl(38, 70%, 30%)";
                          labelBorder = "1px solid hsla(42, 75%, 57%, 0.2)";
                        } else if (row.label === "Kopi") {
                          labelBg = "hsla(25, 40%, 35%, 0.1)";
                          labelColor = "hsl(25, 40%, 25%)";
                          labelBorder = "1px solid hsla(25, 40%, 35%, 0.2)";
                        }

                        const isNewData = globalIndex > 45;
                        const rowBg = isNewData ? "hsla(42, 75%, 57%, 0.07)" : "transparent";
                        const rowHoverBg = isNewData ? "hsla(42, 75%, 57%, 0.12)" : "hsla(165, 100%, 14%, 0.02)";

                        return (
                          <tr 
                            key={idx} 
                            style={{ borderBottom: "1px solid hsl(var(--card-border))", backgroundColor: rowBg, transition: "background 0.2s" }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = rowHoverBg}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = rowBg}
                          >
                            <td style={{ padding: "1rem 1.25rem", color: isNewData ? "hsl(var(--accent))" : "hsl(var(--text-muted))", textAlign: "center", fontWeight: "600" }}>
                              {globalIndex}
                              {isNewData && (
                                <span style={{ 
                                  fontSize: "0.65rem", 
                                  background: "hsl(var(--accent))", 
                                  color: "hsl(var(--text-dark))", 
                                  padding: "0.15rem 0.4rem", 
                                  borderRadius: "4px", 
                                  marginLeft: "0.5rem", 
                                  display: "inline-block",
                                  verticalAlign: "middle",
                                  fontWeight: "800"
                                }}>
                                  BARU
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "1rem", textAlign: "center", color: "hsl(var(--text-main))", fontWeight: "500" }}>{row.N}</td>
                            <td style={{ padding: "1rem", textAlign: "center", color: "hsl(var(--text-main))", fontWeight: "500" }}>{row.P}</td>
                            <td style={{ padding: "1rem", textAlign: "center", color: "hsl(var(--text-main))", fontWeight: "500" }}>{row.K}</td>
                            <td style={{ padding: "1rem", textAlign: "center", color: "hsl(var(--text-main))", fontWeight: "500" }}>{row.temperature}</td>
                            <td style={{ padding: "1rem", textAlign: "center", color: "hsl(var(--text-main))", fontWeight: "500" }}>{row.humidity}</td>
                            <td style={{ padding: "1rem", textAlign: "center", color: "hsl(var(--text-main))", fontWeight: "500" }}>{row.ph}</td>
                            <td style={{ padding: "1rem", textAlign: "center", color: "hsl(var(--text-main))", fontWeight: "500" }}>{row.rainfall}</td>
                            <td style={{ padding: "1rem", textAlign: "center", color: "hsl(var(--text-main))", fontWeight: "500" }}>{row.irigasi}</td>
                            <td style={{ padding: "1rem 1.5rem", textAlign: "center" }}>
                              <span style={{
                                display: "inline-block",
                                padding: "0.35rem 0.75rem",
                                borderRadius: "8px",
                                fontSize: "0.85rem",
                                fontWeight: "800",
                                background: labelBg,
                                color: labelColor,
                                border: labelBorder,
                                minWidth: "85px",
                                textAlign: "center",
                                letterSpacing: "0.02em"
                              }}>
                                {row.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{
                  padding: "1.25rem 2.5rem",
                  borderTop: "1px solid hsl(var(--card-border))",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem"
                }}>
                  <span style={{ fontSize: "0.85rem", color: "hsl(var(--text-muted))", fontWeight: "600" }}>
                    Menampilkan {startIndex + 1} - {Math.min(startIndex + 10, filteredDataset.length)} dari {filteredDataset.length} data latih
                  </span>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--card-border))",
                        background: currentPage === 1 ? "hsl(var(--bg-color))" : "#ffffff",
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                        fontSize: "0.85rem",
                        fontWeight: "700",
                        color: currentPage === 1 ? "hsl(var(--text-muted))" : "hsl(var(--text-dark))",
                        transition: "var(--transition)"
                      }}
                      onMouseOver={(e) => {
                        if (currentPage !== 1) {
                          e.currentTarget.style.borderColor = "hsl(var(--primary))";
                          e.currentTarget.style.background = "hsl(var(--primary-glow))";
                        }
                      }}
                      onMouseOut={(e) => {
                        if (currentPage !== 1) {
                          e.currentTarget.style.borderColor = "hsl(var(--card-border))";
                          e.currentTarget.style.background = "#ffffff";
                        }
                      }}
                    >
                      Sebelumnya
                    </button>

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      style={{
                        padding: "0.5rem 1rem",
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--card-border))",
                        background: currentPage === totalPages ? "hsl(var(--bg-color))" : "#ffffff",
                        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                        fontSize: "0.85rem",
                        fontWeight: "700",
                        color: currentPage === totalPages ? "hsl(var(--text-muted))" : "hsl(var(--text-dark))",
                        transition: "var(--transition)"
                      }}
                      onMouseOver={(e) => {
                        if (currentPage !== totalPages) {
                          e.currentTarget.style.borderColor = "hsl(var(--primary))";
                          e.currentTarget.style.background = "hsl(var(--primary-glow))";
                        }
                      }}
                      onMouseOut={(e) => {
                        if (currentPage !== totalPages) {
                          e.currentTarget.style.borderColor = "hsl(var(--card-border))";
                          e.currentTarget.style.background = "#ffffff";
                        }
                      }}
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content 2: Data Pemakai */}
        {activeTab === "pemakai" && (
          <div>
            {/* Stats Cards Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1.5rem",
              marginBottom: "2.5rem"
            }}>
              {/* Card 1: Total Pemakai */}
              <div 
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                }}
                style={{
                  background: "#ffffff",
                  border: "1px solid hsl(var(--card-border))",
                  borderLeft: "5px solid hsl(var(--primary))",
                  borderRadius: "16px",
                  padding: "1.5rem 1.75rem",
                  textAlign: "left",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "var(--transition)",
                  cursor: "default"
                }}
              >
                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "hsl(var(--text-muted))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Total Pemakai
                  </span>
                  <span style={{ display: "block", fontSize: "2.25rem", fontWeight: "800", lineHeight: "1.1", marginTop: "0.35rem", color: "hsl(var(--primary))", fontFamily: "var(--font-display)" }}>
                    {users.length}
                  </span>
                </div>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "hsla(165, 100%, 14%, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "hsl(var(--primary))",
                  fontSize: "1.5rem"
                }}>
                  👥
                </div>
              </div>

              {/* Card 2: Petani / User */}
              <div 
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                }}
                style={{
                  background: "#ffffff",
                  border: "1px solid hsl(var(--card-border))",
                  borderLeft: "5px solid hsl(var(--secondary))",
                  borderRadius: "16px",
                  padding: "1.5rem 1.75rem",
                  textAlign: "left",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "var(--transition)",
                  cursor: "default"
                }}
              >
                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "hsl(var(--text-muted))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Petani / User
                  </span>
                  <span style={{ display: "block", fontSize: "2.25rem", fontWeight: "800", lineHeight: "1.1", marginTop: "0.35rem", color: "hsl(var(--secondary))", fontFamily: "var(--font-display)" }}>
                    {users.filter(u => u.role === "user").length}
                  </span>
                </div>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "rgba(35, 78, 64, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "hsl(var(--secondary))",
                  fontSize: "1.5rem"
                }}>
                  🚜
                </div>
              </div>

              {/* Card 3: Administrator */}
              <div 
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                }}
                style={{
                  background: "#ffffff",
                  border: "1px solid hsl(var(--card-border))",
                  borderLeft: "5px solid hsl(var(--accent))",
                  borderRadius: "16px",
                  padding: "1.5rem 1.75rem",
                  textAlign: "left",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "var(--transition)",
                  cursor: "default"
                }}
              >
                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "hsl(var(--text-muted))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Administrator
                  </span>
                  <span style={{ display: "block", fontSize: "2.25rem", fontWeight: "800", lineHeight: "1.1", marginTop: "0.35rem", color: "hsl(var(--accent))", fontFamily: "var(--font-display)" }}>
                    {users.filter(u => u.role === "admin").length}
                  </span>
                </div>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "hsla(42, 75%, 57%, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "hsl(var(--accent))",
                  fontSize: "1.5rem"
                }}>
                  🛡️
                </div>
              </div>

              {/* Card 4: Sesi Aktif (Runtime) */}
              <div 
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                }}
                style={{
                  background: "#ffffff",
                  border: "1px solid hsl(var(--card-border))",
                  borderLeft: "5px solid #00acc1",
                  borderRadius: "16px",
                  padding: "1.5rem 1.75rem",
                  textAlign: "left",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "var(--transition)",
                  cursor: "default"
                }}
              >
                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "hsl(var(--text-muted))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Sesi Aktif (Runtime)
                  </span>
                  <span style={{ display: "block", fontSize: "2.25rem", fontWeight: "800", lineHeight: "1.1", marginTop: "0.35rem", color: "#00acc1", fontFamily: "var(--font-display)" }}>
                    1
                  </span>
                </div>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "rgba(0, 172, 193, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#00acc1",
                  fontSize: "1.5rem"
                }}>
                  🟢
                </div>
              </div>
            </div>

            {/* Table Container Card: Daftar Pemakai */}
            <div style={{
              background: "#ffffff",
              border: "1px solid hsl(var(--card-border))",
              borderRadius: "16px",
              boxShadow: "var(--shadow-sm)",
              overflow: "hidden",
              animation: "fadeInUp 0.5s ease-out"
            }}>
              {/* Header */}
              <div className="main-content-wrapper" style={{ 
                padding: "2rem 2.5rem 1.5rem 2.5rem",
                borderBottom: "1px solid hsl(var(--card-border))" 
              }}>
                <h3 style={{ fontSize: "1.45rem", fontWeight: 800, color: "hsl(var(--text-dark))", margin: 0, fontFamily: "var(--font-display)" }}>
                  Daftar Pemakai Terdaftar
                </h3>
              </div>
              
              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
                  <thead>
                    <tr style={{ background: "hsl(var(--primary))", borderBottom: "2px solid hsl(var(--card-border))" }}>
                      <th style={{ padding: "1.2rem 1.5rem", color: "#ffffff", fontWeight: "700", textAlign: "center", width: "70px", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>No</th>
                      <th style={{ padding: "1.2rem 1.5rem", color: "#ffffff", fontWeight: "700", textAlign: "left", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>Nama Pengguna</th>
                      <th style={{ padding: "1.2rem 1.5rem", color: "#ffffff", fontWeight: "700", textAlign: "center", width: "220px", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>Peran (Role)</th>
                      <th style={{ padding: "1.2rem 1.5rem", color: "#ffffff", fontWeight: "700", textAlign: "left", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>Tanggal Bergabung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ padding: "4rem", textAlign: "center", color: "hsl(var(--text-muted))", fontWeight: "600" }}>
                          📭 Tidak ada pengguna terdaftar.
                        </td>
                      </tr>
                    ) : (
                      users.map((user, idx) => {
                        // Badges for Role
                        let roleBg = "hsla(142, 70%, 36%, 0.1)";
                        let roleColor = "hsl(142, 70%, 28%)";
                        let roleBorder = "1px solid hsla(142, 70%, 36%, 0.15)";
                        let roleText = "PETANI / USER";
                        if (user.role === "admin") {
                          roleBg = "hsla(350, 80%, 48%, 0.08)";
                          roleColor = "hsl(350, 80%, 38%)";
                          roleBorder = "1px solid hsla(350, 80%, 48%, 0.15)";
                          roleText = "ADMINISTRATOR";
                        }

                        return (
                          <tr 
                            key={idx} 
                            style={{ borderBottom: "1px solid hsl(var(--card-border))", transition: "background 0.2s" }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "hsla(165, 100%, 14%, 0.02)"}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                          >
                            <td style={{ padding: "1.1rem 1.5rem", color: "hsl(var(--text-muted))", textAlign: "center", fontWeight: "600" }}>{idx + 1}</td>
                            <td style={{ padding: "1.1rem 1.5rem", fontWeight: "700", color: "hsl(var(--text-dark))" }}>
                              👤 {user.username}
                            </td>
                            <td style={{ padding: "1.1rem 1.5rem", textAlign: "center" }}>
                              <span style={{
                                display: "inline-block",
                                padding: "0.35rem 0.75rem",
                                borderRadius: "8px",
                                fontSize: "0.8rem",
                                fontWeight: "800",
                                background: roleBg,
                                color: roleColor,
                                border: roleBorder,
                                minWidth: "130px",
                                textAlign: "center",
                                letterSpacing: "0.03em"
                              }}>
                                {roleText}
                              </span>
                            </td>
                            <td style={{ padding: "1.1rem 1.5rem", color: "hsl(var(--text-muted))", fontWeight: "500" }}>
                              {formatDate(user.created_at)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table Container Card: Riwayat Analisis Pengguna */}
            <div style={{
              background: "#ffffff",
              border: "1px solid hsl(var(--card-border))",
              borderRadius: "16px",
              boxShadow: "var(--shadow-sm)",
              overflow: "hidden",
              marginTop: "2.5rem",
              animation: "fadeInUp 0.5s ease-out"
            }}>
              {/* Header */}
              <div className="main-content-wrapper" style={{ 
                padding: "2rem 2.5rem 1.5rem 2.5rem",
                borderBottom: "1px solid hsl(var(--card-border))"
              }}>
                <h3 style={{ fontSize: "1.45rem", fontWeight: 800, color: "hsl(var(--text-dark))", margin: 0, fontFamily: "var(--font-display)" }}>
                  Riwayat Analisis Pengguna
                </h3>
                <p style={{ fontSize: "0.85rem", color: "hsl(var(--text-muted))", marginTop: "0.35rem", fontWeight: "500" }}>
                  Catatan rekomendasi real-time yang diakses oleh para pemakai terdaftar.
                </p>
              </div>
              
              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
                  <thead>
                    <tr style={{ background: "hsl(var(--primary))", borderBottom: "2px solid hsl(var(--card-border))" }}>
                      <th style={{ padding: "1.2rem 1.25rem", color: "#ffffff", fontWeight: "700", textAlign: "center", width: "70px", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>No.</th>
                      <th style={{ padding: "1.2rem 1.25rem", color: "#ffffff", fontWeight: "700", textAlign: "left", width: "130px", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>Waktu</th>
                      <th style={{ padding: "1.2rem 1.25rem", color: "#ffffff", fontWeight: "700", textAlign: "left", width: "130px", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>User ID</th>
                      <th style={{ padding: "1.2rem 1.25rem", color: "#ffffff", fontWeight: "700", textAlign: "center", width: "120px", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>Hara (N, P, K)</th>
                      <th style={{ padding: "1.2rem 1.25rem", color: "#ffffff", fontWeight: "700", textAlign: "center", width: "180px", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>Iklim (pH, T, H, R, I)</th>
                      <th style={{ padding: "1.2rem 1.25rem", color: "#ffffff", fontWeight: "700", textAlign: "center", width: "150px", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>Perhitungan</th>
                      <th style={{ padding: "1.2rem 1.5rem", color: "#ffffff", fontWeight: "700", textAlign: "center", width: "130px", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>Keputusan</th>
                      <th style={{ padding: "1.2rem 1.25rem", color: "#ffffff", fontWeight: "700", textAlign: "center", width: "120px", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ padding: "4rem", textAlign: "center", color: "hsl(var(--text-muted))", fontWeight: "600" }}>
                          📭 Belum ada riwayat analisis dari pengguna.
                        </td>
                      </tr>
                    ) : (
                      history.map((item, idx) => {
                        const inputs = item.inputs || {};
                        const nVal = inputs.N || "0";
                        const pVal = inputs.P || "0";
                        const kVal = inputs.K || "0";
                        const phVal = inputs.ph || "0";
                        const tempVal = inputs.temperature || "0";
                        const humidVal = inputs.humidity || "0";
                        const rainVal = inputs.rainfall || "0";
                        const irigasiVal = inputs.irigasi || "0";

                        // Badges for Label
                        const prediction = item.nb_prediction || "-";
                        let labelBg = "hsla(142, 70%, 36%, 0.1)";
                        let labelColor = "hsl(142, 70%, 28%)";
                        let labelBorder = "1px solid hsla(142, 70%, 36%, 0.2)";
                        if (prediction === "Jagung") {
                          labelBg = "hsla(42, 75%, 57%, 0.12)";
                          labelColor = "hsl(38, 70%, 30%)";
                          labelBorder = "1px solid hsla(42, 75%, 57%, 0.2)";
                        } else if (prediction === "Kopi") {
                          labelBg = "hsla(25, 40%, 35%, 0.1)";
                          labelColor = "hsl(25, 40%, 25%)";
                          labelBorder = "1px solid hsla(25, 40%, 35%, 0.2)";
                        }

                        return (
                          <tr 
                            key={idx} 
                            style={{ borderBottom: "1px solid hsl(var(--card-border))", transition: "background 0.2s" }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "hsla(165, 100%, 14%, 0.02)"}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                          >
                            <td style={{ padding: "1.1rem 1.25rem", color: "hsl(var(--text-muted))", textAlign: "center", fontWeight: "600" }}>{idx + 1}</td>
                            <td style={{ padding: "1.1rem 1.25rem", color: "hsl(var(--text-main))", fontWeight: "500" }}>{formatShortDate(item.timestamp)}</td>
                            <td style={{ padding: "1.1rem 1.25rem", fontWeight: "700", color: "hsl(var(--text-dark))" }}>
                              👤 {item.user || "anonim"}
                            </td>
                            <td style={{ padding: "1.1rem 1.25rem", color: "hsl(var(--text-dark))", textAlign: "center", fontFamily: "monospace", fontSize: "0.9rem", fontWeight: "600" }}>
                              {nVal}, {pVal}, {kVal}
                            </td>
                            <td style={{ padding: "1.1rem 1.25rem", color: "hsl(var(--text-dark))", textAlign: "center", fontFamily: "monospace", fontSize: "0.9rem", fontWeight: "600" }}>
                              {phVal}, {tempVal}, {humidVal}, {rainVal}, {irigasiVal}
                            </td>
                            <td style={{ padding: "1.1rem 1.25rem", textAlign: "center" }}>
                              <button
                                onClick={() => handleOpenCalculation(item)}
                                style={{
                                  padding: "0.45rem 1.1rem",
                                  borderRadius: "20px",
                                  border: "1px solid hsla(165, 100%, 14%, 0.15)",
                                  background: "hsla(165, 100%, 14%, 0.06)",
                                  color: "hsl(var(--primary))",
                                  fontSize: "0.75rem",
                                  fontWeight: "800",
                                  cursor: "pointer",
                                  transition: "var(--transition)",
                                  letterSpacing: "0.03em"
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.background = "hsl(var(--primary))";
                                  e.currentTarget.style.color = "#ffffff";
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.background = "hsla(165, 100%, 14%, 0.06)";
                                  e.currentTarget.style.color = "hsl(var(--primary))";
                                }}
                              >
                                LIHAT DETAIL
                              </button>
                            </td>
                            <td style={{ padding: "1.1rem 1.5rem", textAlign: "center" }}>
                              <span style={{
                                display: "inline-block",
                                padding: "0.35rem 0.75rem",
                                borderRadius: "8px",
                                fontSize: "0.85rem",
                                fontWeight: "800",
                                background: labelBg,
                                color: labelColor,
                                border: labelBorder,
                                minWidth: "85px",
                                textAlign: "center",
                                letterSpacing: "0.02em"
                              }}>
                                {prediction}
                              </span>
                            </td>
                            <td style={{ padding: "1.1rem 1.25rem", textAlign: "center" }}>
                               <button
                                 onClick={() => handleAddToTraining(item)}
                                 title="Simpan sebagai Data Latih & Latih Ulang"
                                 style={{
                                   background: "transparent",
                                   border: "none",
                                   cursor: "pointer",
                                   fontSize: "1.25rem",
                                   padding: "0.25rem",
                                   marginRight: "0.85rem",
                                   transition: "transform 0.15s",
                                   display: "inline-flex",
                                   alignItems: "center",
                                   justifyContent: "center"
                                 }}
                                 onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.2)"}
                                 onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                               >
                                 💾
                               </button>
                               <button
                                 onClick={() => handleDeleteSingleHistory(item.id)}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "hsl(var(--danger))",
                                  cursor: "pointer",
                                  fontSize: "1.2rem",
                                  padding: "0.25rem 0.5rem",
                                  transition: "transform 0.15s",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                                onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.2) rotate(8deg)"}
                                onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Detail Perhitungan Naive Bayes Modal */}
      {isModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 64, 49, 0.4)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1rem"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "24px",
            width: "100%",
            maxWidth: "1000px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "var(--shadow-lg), 0 0 0 1px rgba(0, 0, 0, 0.05)",
            overflow: "hidden",
            fontFamily: "var(--font-sans)",
            animation: "fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "1.5rem 2.5rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid hsl(var(--card-border))"
            }}>
              <h3 style={{ fontSize: "1.5rem", fontWeight: "800", color: "hsl(var(--text-dark))", margin: 0, fontFamily: "var(--font-display)" }}>
                🧮 Detail Perhitungan Naive Bayes
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "hsl(var(--bg-color))",
                  border: "none",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  color: "hsl(var(--text-muted))",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "var(--transition)"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "hsl(var(--danger))";
                  e.currentTarget.style.color = "#ffffff";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "hsl(var(--bg-color))";
                  e.currentTarget.style.color = "hsl(var(--text-muted))";
                }}
              >
                ✕
              </button>
            </div>
            
            {/* Modal Body */}
            <div style={{
              padding: "2.5rem",
              overflowY: "auto",
              flex: 1,
              background: "hsl(var(--bg-color))"
            }}>
              {loadingCalculation ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifycontent: "center", padding: "5rem 0" }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    border: "4px solid hsl(var(--card-border))",
                    borderTopColor: "hsl(var(--primary))",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    marginBottom: "1.5rem"
                  }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <div style={{ fontWeight: "800", color: "hsl(var(--text-dark))", fontSize: "1.15rem", fontFamily: "var(--font-display)" }}>Menghitung Persamaan Bayes...</div>
                  <div style={{ color: "hsl(var(--text-muted))", fontSize: "0.875rem", marginTop: "0.25rem", fontWeight: "500" }}>Memproses data dan parameter model...</div>
                </div>
              ) : calculationError ? (
                <div style={{
                  padding: "1.5rem",
                  background: "hsla(350, 80%, 48%, 0.08)",
                  border: "1px solid hsla(350, 80%, 48%, 0.15)",
                  borderRadius: "16px",
                  color: "hsl(var(--danger))",
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "center"
                }}>
                  <span style={{ fontSize: "1.5rem" }}>⚠️</span>
                  <div>
                    <strong style={{ fontSize: "1rem" }}>Gagal memuat rincian:</strong> 
                    <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", fontWeight: "500" }}>{calculationError}</p>
                  </div>
                </div>
              ) : calculationDetails ? (() => {
                const clsPadi = calculationDetails.classes.find(c => c.class_name === "Padi") || { count: 0, total_count: 0, prior: 0, numerator: 0, posterior: 0, features: [] };
                const clsJagung = calculationDetails.classes.find(c => c.class_name === "Jagung") || { count: 0, total_count: 0, prior: 0, numerator: 0, posterior: 0, features: [] };
                const clsKopi = calculationDetails.classes.find(c => c.class_name === "Kopi") || { count: 0, total_count: 0, prior: 0, numerator: 0, posterior: 0, features: [] };
                
                const featuresList = ["N", "P", "K", "ph", "temperature", "humidity", "rainfall", "irigasi"];
                const shortKeys = {
                  N: "N",
                  P: "P",
                  K: "K",
                  ph: "pH",
                  temperature: "Temp",
                  humidity: "Hum",
                  rainfall: "Rain",
                  irigasi: "Irr"
                };
                const featureDisplayNames = {
                  N: "Nitrogen",
                  P: "Fosfor",
                  K: "Kalium",
                  ph: "pH Tanah",
                  temperature: "Suhu",
                  humidity: "Kelembaban",
                  rainfall: "Curah Hujan",
                  irigasi: "Irigasi"
                };
                
                const getFeatLikelihood = (cls, featName) => {
                  const fObj = cls.features.find(f => f.feature === featName);
                  return fObj ? fObj.likelihood : 0;
                };
                
                const formatProb = (val) => {
                  if (val === 0) return "0.00000000";
                  if (val < 0.00000001 || val > 1000) {
                    return val.toExponential(8);
                  }
                  return val.toFixed(8);
                };
                
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                    
                    {/* Row 1: Prior Probabilities & Posterior Scores */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "1.5rem" }}>
                      
                      {/* 1. Prior Probabilities */}
                      <div style={{
                        background: "#ffffff",
                        border: "1px solid hsl(var(--card-border))",
                        borderRadius: "16px",
                        padding: "1.5rem 1.75rem",
                        boxShadow: "var(--shadow-sm)"
                      }}>
                        <h4 style={{ fontSize: "1.1rem", fontWeight: "800", color: "hsl(var(--text-dark))", margin: "0 0 1.25rem 0", borderBottom: "1px solid hsl(var(--card-border))", paddingBottom: "0.75rem", fontFamily: "var(--font-display)" }}>
                          1. Prior Probabilities P(C)
                        </h4>
                        <div style={{ fontFamily: "monospace", fontSize: "0.95rem", color: "hsl(var(--text-main))", lineHeight: "2.2", fontWeight: "600" }}>
                          <div>P(Padi) = {clsPadi.count} / {clsPadi.total_count} = <span style={{ color: "hsl(var(--secondary))" }}>{clsPadi.prior.toFixed(8)}</span></div>
                          <div>P(Jagung) = {clsJagung.count} / {clsJagung.total_count} = <span style={{ color: "hsl(var(--accent))" }}>{clsJagung.prior.toFixed(8)}</span></div>
                          <div>P(Kopi) = {clsKopi.count} / {clsKopi.total_count} = <span style={{ color: "hsl(var(--danger))" }}>{clsKopi.prior.toFixed(8)}</span></div>
                        </div>
                      </div>
                      
                      {/* 3. Posterior Probabilities (Skor Un-normalized) */}
                      <div style={{
                        background: "#ffffff",
                        border: "1px solid hsl(var(--card-border))",
                        borderRadius: "16px",
                        padding: "1.5rem 1.75rem",
                        boxShadow: "var(--shadow-sm)"
                      }}>
                        <h4 style={{ fontSize: "1.1rem", fontWeight: "800", color: "hsl(var(--text-dark))", margin: "0 0 1.25rem 0", borderBottom: "1px solid hsl(var(--card-border))", paddingBottom: "0.75rem", fontFamily: "var(--font-display)" }}>
                          3. Un-normalized Posterior Scores
                        </h4>
                        <div style={{ fontFamily: "monospace", fontSize: "0.95rem", color: "hsl(var(--text-main))", lineHeight: "2.2", fontWeight: "600" }}>
                          <div>Score(Padi) = P(Padi) × P(x|Padi) = <span style={{ color: "hsl(var(--secondary))" }}>{clsPadi.numerator.toExponential(8)}</span></div>
                          <div>Score(Jagung) = P(Jagung) × P(x|Jagung) = <span style={{ color: "hsl(var(--accent))" }}>{clsJagung.numerator.toExponential(8)}</span></div>
                          <div>Score(Kopi) = P(Kopi) × P(x|Kopi) = <span style={{ color: "hsl(var(--danger))" }}>{clsKopi.numerator.toExponential(8)}</span></div>
                        </div>
                      </div>
                      
                    </div>
                    
                    {/* Row 2: Conditional Probabilities (Likelihoods) */}
                    <div style={{
                      background: "#ffffff",
                      border: "1px solid hsl(var(--card-border))",
                      borderRadius: "16px",
                      padding: "1.75rem",
                      boxShadow: "var(--shadow-sm)"
                    }}>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: "800", color: "hsl(var(--text-dark))", margin: "0 0 1.5rem 0", borderBottom: "1px solid hsl(var(--card-border))", paddingBottom: "0.75rem", fontFamily: "var(--font-display)" }}>
                        2. Conditional Probabilities (Likelihoods) P(x_i | C)
                      </h4>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                        gap: "1.25rem"
                      }}>
                        {featuresList.map((featKey) => {
                          const padiL = getFeatLikelihood(clsPadi, featKey);
                          const jagungL = getFeatLikelihood(clsJagung, featKey);
                          const kopiL = getFeatLikelihood(clsKopi, featKey);
                          
                          return (
                            <div key={featKey} style={{
                              background: "hsl(var(--bg-color))",
                              border: "1px solid hsl(var(--card-border))",
                              borderRadius: "12px",
                              padding: "1.25rem",
                              boxShadow: "var(--shadow-sm)"
                            }}>
                              <div style={{ 
                                fontWeight: "800", 
                                fontSize: "0.85rem", 
                                color: "hsl(var(--text-dark))", 
                                marginBottom: "0.75rem", 
                                borderBottom: "1px solid rgba(0, 0, 0, 0.05)", 
                                paddingBottom: "0.35rem",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                              }}>
                                <span>{featureDisplayNames[featKey]}</span>
                                <span style={{ background: "hsl(var(--primary))", color: "#ffffff", fontSize: "0.7rem", padding: "0.1rem 0.35rem", borderRadius: "4px" }}>
                                  {shortKeys[featKey]}
                                </span>
                              </div>
                              <div style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "hsl(var(--text-main))", lineHeight: "1.8", fontWeight: "600" }}>
                                <div>Padi: <span style={{ color: "hsl(var(--secondary))" }}>{formatProb(padiL)}</span></div>
                                <div>Jagung: <span style={{ color: "hsl(var(--accent))" }}>{formatProb(jagungL)}</span></div>
                                <div>Kopi: <span style={{ color: "hsl(var(--danger))" }}>{formatProb(kopiL)}</span></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Row 3: Hasil Normalisasi (%) */}
                    <div style={{
                      background: "#ffffff",
                      border: "1px solid hsl(var(--card-border))",
                      borderRadius: "16px",
                      padding: "1.75rem",
                      boxShadow: "var(--shadow-sm)"
                    }}>
                      <h4 style={{ fontSize: "1.1rem", fontWeight: "800", color: "hsl(var(--text-dark))", margin: "0 0 1.5rem 0", borderBottom: "1px solid hsl(var(--card-border))", paddingBottom: "0.75rem", fontFamily: "var(--font-display)" }}>
                        4. Hasil Normalisasi Keputusan Bayes (%)
                      </h4>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                        gap: "1.5rem",
                        marginTop: "0.5rem"
                      }}>
                        {/* Padi */}
                        <div style={{
                          background: "#ffffff",
                          border: "1px solid hsl(var(--card-border))",
                          borderTop: "4px solid hsl(var(--success))",
                          borderRadius: "16px",
                          padding: "1.5rem",
                          boxShadow: "var(--shadow-sm)"
                        }}>
                          <div style={{ color: "hsl(var(--success))", fontSize: "0.8rem", fontWeight: "800", letterSpacing: "0.05em", marginBottom: "0.25rem", textTransform: "uppercase" }}>
                            🌾 Rekomendasi Padi (K1)
                          </div>
                          <div style={{ color: "hsl(var(--text-dark))", fontSize: "2.25rem", fontWeight: "800", fontFamily: "var(--font-display)" }}>
                            {(clsPadi.posterior * 100).toFixed(2)}%
                          </div>
                          {/* Progress bar */}
                          <div style={{ width: "100%", height: "8px", background: "hsl(var(--bg-color))", borderRadius: "10px", marginTop: "1rem", overflow: "hidden" }}>
                            <div style={{ width: `${(clsPadi.posterior * 100).toFixed(2)}%`, height: "100%", background: "hsl(var(--success))", borderRadius: "10px", transition: "width 1s ease-out" }} />
                          </div>
                        </div>
                        
                        {/* Jagung */}
                        <div style={{
                          background: "#ffffff",
                          border: "1px solid hsl(var(--card-border))",
                          borderTop: "4px solid hsl(var(--accent))",
                          borderRadius: "16px",
                          padding: "1.5rem",
                          boxShadow: "var(--shadow-sm)"
                        }}>
                          <div style={{ color: "hsl(var(--accent))", fontSize: "0.8rem", fontWeight: "800", letterSpacing: "0.05em", marginBottom: "0.25rem", textTransform: "uppercase" }}>
                            🌽 Rekomendasi Jagung (K2)
                          </div>
                          <div style={{ color: "hsl(var(--text-dark))", fontSize: "2.25rem", fontWeight: "800", fontFamily: "var(--font-display)" }}>
                            {(clsJagung.posterior * 100).toFixed(2)}%
                          </div>
                          {/* Progress bar */}
                          <div style={{ width: "100%", height: "8px", background: "hsl(var(--bg-color))", borderRadius: "10px", marginTop: "1rem", overflow: "hidden" }}>
                            <div style={{ width: `${(clsJagung.posterior * 100).toFixed(2)}%`, height: "100%", background: "hsl(var(--accent))", borderRadius: "10px", transition: "width 1s ease-out" }} />
                          </div>
                        </div>
                        
                        {/* Kopi */}
                        <div style={{
                          background: "#ffffff",
                          border: "1px solid hsl(var(--card-border))",
                          borderTop: "4px solid hsl(var(--danger))",
                          borderRadius: "16px",
                          padding: "1.5rem",
                          boxShadow: "var(--shadow-sm)"
                        }}>
                          <div style={{ color: "hsl(var(--danger))", fontSize: "0.8rem", fontWeight: "800", letterSpacing: "0.05em", marginBottom: "0.25rem", textTransform: "uppercase" }}>
                            ☕ Rekomendasi Kopi (K3)
                          </div>
                          <div style={{ color: "hsl(var(--text-dark))", fontSize: "2.25rem", fontWeight: "800", fontFamily: "var(--font-display)" }}>
                            {(clsKopi.posterior * 100).toFixed(2)}%
                          </div>
                          {/* Progress bar */}
                          <div style={{ width: "100%", height: "8px", background: "hsl(var(--bg-color))", borderRadius: "10px", marginTop: "1rem", overflow: "hidden" }}>
                            <div style={{ width: `${(clsKopi.posterior * 100).toFixed(2)}%`, height: "100%", background: "hsl(var(--danger))", borderRadius: "10px", transition: "width 1s ease-out" }} />
                          </div>
                        </div>
                        
                      </div>
                    </div>
                    
                  </div>
                );
              })() : null}
            </div>
            
            {/* Modal Footer */}
            <div style={{
              padding: "1.25rem 2.5rem",
              borderTop: "1px solid hsl(var(--card-border))",
              display: "flex",
              justifyContent: "flex-end",
              background: "#ffffff"
            }}>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: "0.7rem 2.5rem",
                  background: "hsl(var(--primary))",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "0.95rem",
                  fontWeight: "800",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-sm)",
                  transition: "var(--transition)"
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "hsl(var(--primary-hover))"}
                onMouseOut={(e) => e.currentTarget.style.background = "hsl(var(--primary))"}
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}

          {/* Main Footer inside column */}
          <footer style={{
            borderTop: "1px solid hsl(var(--card-border))",
            padding: "1.5rem 3rem",
            background: "#ffffff",
            color: "hsl(var(--text-muted))",
            fontSize: "0.85rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
              <p>© {new Date().getFullYear()} EcoFarming. Hak Cipta Dilindungi.</p>
              <p>Panel Kontrol Admin • Dibuat oleh Kelompok Mahasiswa Universitas Janabadra</p>
            </div>
          </footer>

        </div>
      </div>
    </>
  );
}

import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

export default function Register() {
  const router = useRouter();
  const [values, setValues] = useState({ username: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (values.password.length < 6) {
      setError("Kata sandi harus minimal 6 karakter.");
      setLoading(false);
      return;
    }

    if (values.password !== values.confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: values.username,
          password: values.password
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Gagal melakukan pendaftaran.");
      }

      setSuccess("Pendaftaran berhasil! Mengarahkan ke halaman login...");
      setTimeout(() => {
        router.push("/login?registered=true");
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan saat pendaftaran.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>EcoFarming - Daftar Akun Baru</title>
        <meta name="description" content="Pendaftaran akun pengguna baru sistem EcoFarming." />
      </Head>

      <main style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, hsla(135, 20%, 95%, 0.8) 0%, hsla(152, 30%, 90%, 0.8) 100%)",
        padding: "2rem"
      }}>
        <div style={{
          width: "100%",
          maxWidth: "420px",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem"
        }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
            <Link href="/" style={{
              textDecoration: "none",
              color: "hsl(var(--text-dark))",
              fontWeight: 800,
              fontSize: "1.75rem",
              fontFamily: "var(--font-display)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.75rem"
            }}>
              <img src="/logoecofarm.jpeg" alt="EcoFarming Logo" style={{ height: "40px", width: "auto", borderRadius: "8px" }} />
              EcoFarming
            </Link>
            <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.85rem", marginTop: "0.5rem" }}>
              Sistem Klasifikasi Rekomendasi Tanaman
            </p>
          </div>

          {/* Form Container */}
          <div className="glass-panel" style={{ padding: "2.5rem 2rem", background: "#ffffff", borderRadius: "16px" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem", textAlign: "center" }}>
              Daftar Akun Baru
            </h2>
            <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.85rem", textAlign: "center", marginBottom: "2rem" }}>
              Lengkapi data di bawah ini untuk membuat akun baru Anda.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              
              {/* Username Input */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#495057" }}>Username</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#adb5bd" }}>👤</span>
                  <input
                    type="text"
                    name="username"
                    value={values.username}
                    onChange={handleChange}
                    required
                    placeholder="Minimal 3 karakter"
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem 0.75rem 2.25rem",
                      borderRadius: "8px",
                      border: "1px solid #dee2e6",
                      fontSize: "0.95rem",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => e.target.style.borderColor = "hsl(var(--primary))"}
                    onBlur={(e) => e.target.style.borderColor = "#dee2e6"}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#495057" }}>Password</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#adb5bd" }}>🔑</span>
                  <input
                    type="password"
                    name="password"
                    value={values.password}
                    onChange={handleChange}
                    required
                    placeholder="Minimal 6 karakter"
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem 0.75rem 2.25rem",
                      borderRadius: "8px",
                      border: "1px solid #dee2e6",
                      fontSize: "0.95rem",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => e.target.style.borderColor = "hsl(var(--primary))"}
                    onBlur={(e) => e.target.style.borderColor = "#dee2e6"}
                  />
                </div>
              </div>

              {/* Confirm Password Input */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#495057" }}>Konfirmasi Password</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#adb5bd" }}>🔑</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={values.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Ulangi password Anda"
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem 0.75rem 2.25rem",
                      borderRadius: "8px",
                      border: "1px solid #dee2e6",
                      fontSize: "0.95rem",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => e.target.style.borderColor = "hsl(var(--primary))"}
                    onBlur={(e) => e.target.style.borderColor = "#dee2e6"}
                  />
                </div>
              </div>

              {error && (
                <div style={{
                  padding: "0.75rem 1rem",
                  background: "hsla(350, 80%, 55%, 0.1)",
                  border: "1px solid hsla(350, 80%, 55%, 0.2)",
                  borderRadius: "6px",
                  color: "hsl(var(--danger))",
                  fontSize: "0.8rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  ⚠️ {error}
                </div>
              )}

              {success && (
                <div style={{
                  padding: "0.75rem 1rem",
                  background: "hsla(142, 70%, 36%, 0.1)",
                  border: "1px solid hsla(142, 70%, 36%, 0.2)",
                  borderRadius: "6px",
                  color: "hsl(var(--success))",
                  fontSize: "0.8rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  ✅ {success}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  marginTop: "0.5rem",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  border: "none",
                  boxShadow: "var(--shadow-sm)"
                }}
              >
                {loading ? "Mendaftar..." : "Daftar Akun"}
              </button>

            </form>

            <div style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.85rem", color: "hsl(var(--text-muted))" }}>
              Sudah punya akun?{" "}
              <Link href="/login" style={{ color: "hsl(var(--primary))", fontWeight: "600", textDecoration: "none" }}>
                Masuk Di Sini
              </Link>
            </div>
          </div>

          {/* Back link */}
          <div style={{ textAlign: "center" }}>
            <Link href="/" style={{ fontSize: "0.85rem", color: "hsl(var(--text-muted))", textDecoration: "none", fontWeight: "600" }}>
              ← Kembali ke Beranda
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

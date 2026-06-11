import React from "react";

const CROP_EMOJIS = {
  Padi: "🌾",
  Jagung: "🌽",
  Kopi: "☕"
};

export default function ResultComparison({ data }) {
  if (!data) return null;

  const { nb } = data;

  const renderAdviceList = (customAdvice) => {
    return (
      <div className="advice-list">
        {customAdvice.map((item, index) => {
          let statusClass = "info";
          if (item.status === "Rendah" || item.status === "Kekurangan Air" || item.status === "Terlalu Asam") {
            statusClass = "warning";
          } else if (item.status === "Terlalu Basa/Alkali" || item.status === "Kelebihan Air") {
            statusClass = "warning";
          } else if (item.status === "Sangat Baik") {
            statusClass = "success";
          }

          return (
            <div key={index} className={`advice-item ${statusClass}`}>
              <div className="advice-header">
                <span>{item.parameter} - <strong style={{ textTransform: "uppercase" }}>{item.status}</strong></span>
              </div>
              <div className="advice-desc">{item.keterangan}</div>
              <div className="advice-action">👉 {item.saran}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderModelResult = (modelData) => {
    const cropName = modelData.prediction;
    const emoji = CROP_EMOJIS[cropName] || "🌱";
    const confidencePct = Math.round(modelData.confidence * 100);

    return (
      <div className="comparison-card nb" style={{ width: "100%", maxWidth: "600px", margin: "0 auto" }}>
        <span className="algorithm-badge">
          Naive Bayes Classifier
        </span>

        <h3 className="result-crop">
          <span>{emoji}</span> {cropName}
        </h3>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "hsl(var(--text-muted))", marginTop: "0.5rem" }}>
          <span>Tingkat Keyakinan (Confidence)</span>
          <span style={{ fontWeight: 600, color: "hsl(var(--text-dark))" }}>{confidencePct}%</span>
        </div>
        
        <div className="confidence-bar-container">
          <div className="confidence-bar" style={{ width: `${confidencePct}%`, backgroundColor: "hsl(var(--secondary))" }} />
        </div>

        {/* Probabilitas Data Mentah (Class Probabilities Breakdown) */}
        {modelData.probabilities && (
          <div style={{
            margin: "0.75rem 0 1.5rem 0",
            padding: "0.75rem",
            background: "hsla(135, 10%, 94%, 0.6)",
            border: "1px solid hsl(var(--card-border))",
            borderRadius: "var(--radius-sm)"
          }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "0.5rem", color: "hsl(var(--text-muted))" }}>
              Probabilitas Kategori Tanaman:
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {Object.entries(modelData.probabilities).map(([crop, prob]) => {
                const pct = Math.round(prob * 100);
                const emoji = CROP_EMOJIS[crop] || "🌱";
                return (
                  <div key={crop} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.85rem", minWidth: "18px" }}>{emoji}</span>
                    <span style={{ fontSize: "0.8rem", flex: 1, color: "hsl(var(--text-dark))", fontWeight: 500 }}>{crop}</span>
                    <div style={{ flex: 2, height: "6px", background: "rgba(0,0,0,0.06)", borderRadius: "3px", overflow: "hidden", margin: "0 0.5rem" }}>
                      <div style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: "hsl(var(--secondary))",
                        borderRadius: "3px"
                      }} />
                    </div>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, minWidth: "35px", textAlign: "right", color: "hsl(var(--text-dark))" }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Crop Profile Info */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h4 className="advice-section-title" style={{ fontSize: "1rem" }}>📘 Detail Budidaya</h4>
          <p style={{ fontSize: "0.85rem", color: "hsl(var(--text-muted))", marginBottom: "0.75rem", fontStyle: "italic" }}>
            "{modelData.advice.deskripsi}"
          </p>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Jarak Tanam</div>
              <div className="info-value">{modelData.advice.jarak_tanam}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Waktu Panen</div>
              <div className="info-value">{modelData.advice.waktu_panen}</div>
            </div>
          </div>
          <div className="info-item" style={{ marginBottom: "0.5rem" }}>
            <div className="info-label">Pupuk Rekomendasi</div>
            <div className="info-value" style={{ color: "hsl(var(--primary))" }}>{modelData.advice.pupuk_utama}</div>
          </div>
          <div className="info-item">
            <div className="info-label">Tips Utama</div>
            <div className="info-value" style={{ fontWeight: "normal", fontSize: "0.85rem" }}>{modelData.advice.tips_sukses}</div>
          </div>
        </div>

        {/* Dynamic Soil Advice */}
        <div>
          <h4 className="advice-section-title" style={{ fontSize: "1rem" }}>🛠️ Tindakan Perbaikan Tanah</h4>
          {renderAdviceList(modelData.custom_advice)}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ marginTop: "2rem" }}>
      <h2 style={{ fontSize: "1.5rem", fontFamily: "var(--font-display)", marginBottom: "1.5rem", textAlign: "center" }}>
        🔍 Hasil Analisis & Rekomendasi
      </h2>

      <div style={{ display: "flex", justifyContent: "center" }}>
        {renderModelResult(nb)}
      </div>
    </div>
  );
}

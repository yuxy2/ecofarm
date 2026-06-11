import React from "react";

const CROP_EMOJIS = {
  Padi: "🌾",
  Jagung: "🌽",
  Kopi: "☕"
};

export default function PredictionHistory({ history, onSelect, onClear, loadingHistory }) {
  const formatTime = (isoString) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit"
      }) + " - " + date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="glass-panel" style={{ padding: "2rem", marginTop: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "1px solid hsl(var(--card-border))", paddingBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontFamily: "var(--font-display)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          📜 Riwayat Analisis Lahan (MongoDB)
        </h2>
        {history && history.length > 0 && (
          <button
            onClick={onClear}
            className="btn-danger-outline"
            style={{
              padding: "0.4rem 1rem",
              background: "transparent",
              border: "1px solid hsl(var(--danger))",
              borderRadius: "var(--radius-sm)",
              color: "hsl(var(--danger))",
              fontSize: "0.8rem",
              cursor: "pointer",
              fontWeight: 600,
              transition: "var(--transition)"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "hsla(350, 80%, 55%, 0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            🗑️ Bersihkan Riwayat
          </button>
        )}
      </div>

      {loadingHistory ? (
        <div style={{ textAlign: "center", color: "hsl(var(--text-muted))", padding: "2rem 0" }}>
          🔄 Memuat data riwayat...
        </div>
      ) : !history || history.length === 0 ? (
        <div style={{ textAlign: "center", color: "hsl(var(--text-muted))", padding: "2rem 0", fontSize: "0.9rem" }}>
          📭 Belum ada riwayat analisis tanah. Lakukan analisis pertama Anda di atas!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "400px", overflowY: "auto", paddingRight: "0.5rem" }}>
          {history.map((item) => {
            const isMatch = item.agreement;
            const knnEmoji = CROP_EMOJIS[item.knn_prediction] || "🌱";
            const nbEmoji = CROP_EMOJIS[item.nb_prediction] || "🌱";
            
            return (
              <div
                key={item.id}
                style={{
                  padding: "1rem",
                  borderRadius: "var(--radius-md)",
                  background: "hsla(135, 15%, 95%, 0.5)",
                  border: "1px solid hsl(var(--card-border))",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  transition: "var(--transition)"
                }}
              >
                {/* Top Row: Timestamp */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                  <span style={{ color: "hsl(var(--text-muted))", fontWeight: 500 }}>
                    📅 {formatTime(item.timestamp)}
                  </span>
                  <span
                    style={{
                      padding: "0.2rem 0.5rem",
                      borderRadius: "12px",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      background: "hsla(165, 70%, 30%, 0.1)",
                      color: "hsl(var(--secondary))"
                    }}
                  >
                    Naive Bayes
                  </span>
                </div>

                {/* Middle Row: Predictions */}
                <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-muted))", display: "block" }}>Rekomendasi Tanaman</span>
                    <strong style={{ fontSize: "1.1rem", color: "hsl(var(--primary))", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.15rem" }}>
                      <span>{nbEmoji}</span> {item.nb_prediction} 
                      <span style={{ fontSize: "0.85rem", fontWeight: "normal", color: "hsl(var(--text-muted))", marginLeft: "0.25rem" }}>
                        ({Math.round(item.nb_confidence * 100)}% keyakinan)
                      </span>
                    </strong>
                  </div>
                </div>

                {/* Bottom Row: Parameters & Reload Button */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px solid hsl(var(--card-border))",
                    paddingTop: "0.75rem",
                    marginTop: "0.25rem",
                    flexWrap: "wrap",
                    gap: "0.75rem"
                  }}
                >
                  <div style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))" }}>
                    🧪 <strong>N:</strong> {item.inputs.N} | <strong>P:</strong> {item.inputs.P} | <strong>K:</strong> {item.inputs.K} | <strong>pH:</strong> {item.inputs.ph} | <strong>Suhu:</strong> {item.inputs.temperature}°C | <strong>Hujan:</strong> {item.inputs.rainfall}mm
                  </div>
                  <button
                    onClick={() => onSelect(item.inputs)}
                    style={{
                      padding: "0.3rem 0.8rem",
                      background: "hsl(var(--primary))",
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      color: "white",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "var(--transition)"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.filter = "brightness(1.1)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.filter = "brightness(1)";
                    }}
                  >
                    🔄 Muat Ulang Parameter
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

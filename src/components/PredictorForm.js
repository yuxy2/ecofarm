import React from "react";

const PRESETS = [
  {
    id: "padi",
    name: "Sawah Padi (Lembab & Basah)",
    icon: "🌾",
    values: { N: 82, P: 42, K: 38, temperature: 26, humidity: 85, ph: 6.5, rainfall: 230 }
  },
  {
    id: "jagung",
    name: "Lahan Jagung (Kering & Hangat)",
    icon: "🌽",
    values: { N: 72, P: 48, K: 32, temperature: 23, humidity: 68, ph: 6.1, rainfall: 85 }
  },
  {
    id: "kopi",
    name: "Dataran Tinggi Kopi (Sejuk Basah)",
    icon: "☕",
    values: { N: 58, P: 38, K: 42, temperature: 19, humidity: 58, ph: 5.9, rainfall: 175 }
  }
];

export default function PredictorForm({ values, onChange, onSubmit, loading }) {
  const handlePresetClick = (presetValues) => {
    Object.keys(presetValues).forEach((key) => {
      onChange(key, presetValues[key]);
    });
  };

  const handleSliderChange = (e) => {
    const { name, value } = e.target;
    onChange(name, parseFloat(value));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    let numVal = parseFloat(value);
    if (isNaN(numVal)) numVal = 0;
    onChange(name, numVal);
  };

  return (
    <form onSubmit={onSubmit} className="glass-panel" style={{ padding: "2rem" }}>
      <h2 style={{ marginBottom: "1.5rem", fontFamily: "var(--font-display)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        🌱 Parameter Tanah & Lingkungan
      </h2>

      {/* Preset Section */}
      <div style={{ marginBottom: "2rem" }}>
        <p className="form-label" style={{ marginBottom: "0.75rem" }}>Pilih Preset Lingkungan (Opsional):</p>
        <div className="presets-grid">
          {PRESETS.map((preset) => {
            // Cek apakah values saat ini cocok dengan preset (toleransi kecil)
            const isActive = Object.keys(preset.values).every(
              (key) => Math.abs(values[key] - preset.values[key]) < 2
            );

            return (
              <button
                key={preset.id}
                type="button"
                className={`preset-card ${isActive ? "active" : ""}`}
                onClick={() => handlePresetClick(preset.values)}
              >
                <div className="preset-icon">{preset.icon}</div>
                <div className="preset-title">{preset.name.split(" (")[0]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inputs Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        
        {/* Left Column: Nutrients */}
        <div>
          <h3 style={{ fontSize: "1rem", color: "hsl(var(--primary))", marginBottom: "1rem", borderBottom: "1px solid hsl(var(--card-border))", paddingBottom: "0.25rem" }}>
            Unsur Hara Makro (NPK)
          </h3>
          
          {/* Nitrogen */}
          <div className="form-group">
            <label htmlFor="N" className="form-label">
              Nitrogen (N) <span className="value">{values.N} mg/kg</span>
            </label>
            <input
              type="range"
              id="N_range"
              name="N"
              min="0"
              max="150"
              value={values.N}
              onChange={handleSliderChange}
              className="input-slider"
            />
            <div className="form-control-wrapper">
              <input
                type="number"
                id="N"
                name="N"
                min="0"
                max="150"
                step="1"
                value={values.N}
                onChange={handleNumberChange}
                className="input-number"
              />
              <span className="form-control-unit">mg/kg</span>
            </div>
          </div>

          {/* Phosphorus */}
          <div className="form-group">
            <label htmlFor="P" className="form-label">
              Fosfor (P) <span className="value">{values.P} mg/kg</span>
            </label>
            <input
              type="range"
              id="P_range"
              name="P"
              min="0"
              max="150"
              value={values.P}
              onChange={handleSliderChange}
              className="input-slider"
            />
            <div className="form-control-wrapper">
              <input
                type="number"
                id="P"
                name="P"
                min="0"
                max="150"
                step="1"
                value={values.P}
                onChange={handleNumberChange}
                className="input-number"
              />
              <span className="form-control-unit">mg/kg</span>
            </div>
          </div>

          {/* Potassium */}
          <div className="form-group">
            <label htmlFor="K" className="form-label">
              Kalium (K) <span className="value">{values.K} mg/kg</span>
            </label>
            <input
              type="range"
              id="K_range"
              name="K"
              min="0"
              max="200"
              value={values.K}
              onChange={handleSliderChange}
              className="input-slider"
            />
            <div className="form-control-wrapper">
              <input
                type="number"
                id="K"
                name="K"
                min="0"
                max="200"
                step="1"
                value={values.K}
                onChange={handleNumberChange}
                className="input-number"
              />
              <span className="form-control-unit">mg/kg</span>
            </div>
          </div>
        </div>

        {/* Right Column: Climate & pH */}
        <div>
          <h3 style={{ fontSize: "1rem", color: "hsl(var(--primary))", marginBottom: "1rem", borderBottom: "1px solid hsl(var(--card-border))", paddingBottom: "0.25rem" }}>
            Klimatologi & pH Tanah
          </h3>

          {/* pH */}
          <div className="form-group">
            <label htmlFor="ph" className="form-label">
              Keasaman Tanah (pH) <span className="value">{values.ph}</span>
            </label>
            <input
              type="range"
              id="ph_range"
              name="ph"
              min="3.5"
              max="10.0"
              step="0.1"
              value={values.ph}
              onChange={handleSliderChange}
              className="input-slider"
            />
            <div className="form-control-wrapper">
              <input
                type="number"
                id="ph"
                name="ph"
                min="3.5"
                max="10.0"
                step="0.1"
                value={values.ph}
                onChange={handleNumberChange}
                className="input-number"
              />
              <span className="form-control-unit">pH</span>
            </div>
          </div>

          {/* Temperature */}
          <div className="form-group">
            <label htmlFor="temperature" className="form-label">
              Suhu Rata-rata <span className="value">{values.temperature} °C</span>
            </label>
            <input
              type="range"
              id="temp_range"
              name="temperature"
              min="10"
              max="45"
              value={values.temperature}
              onChange={handleSliderChange}
              className="input-slider"
            />
            <div className="form-control-wrapper">
              <input
                type="number"
                id="temperature"
                name="temperature"
                min="10"
                max="45"
                step="0.5"
                value={values.temperature}
                onChange={handleNumberChange}
                className="input-number"
              />
              <span className="form-control-unit">°C</span>
            </div>
          </div>

          {/* Humidity */}
          <div className="form-group">
            <label htmlFor="humidity" className="form-label">
              Kelembaban Relatif <span className="value">{values.humidity} %</span>
            </label>
            <input
              type="range"
              id="humidity_range"
              name="humidity"
              min="15"
              max="100"
              value={values.humidity}
              onChange={handleSliderChange}
              className="input-slider"
            />
            <div className="form-control-wrapper">
              <input
                type="number"
                id="humidity"
                name="humidity"
                min="15"
                max="100"
                step="1"
                value={values.humidity}
                onChange={handleNumberChange}
                className="input-number"
              />
              <span className="form-control-unit">%</span>
            </div>
          </div>

          {/* Rainfall */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="rainfall" className="form-label">
              Curah Hujan Tahunan <span className="value">{values.rainfall} mm</span>
            </label>
            <input
              type="range"
              id="rainfall_range"
              name="rainfall"
              min="20"
              max="300"
              value={values.rainfall}
              onChange={handleSliderChange}
              className="input-slider"
            />
            <div className="form-control-wrapper">
              <input
                type="number"
                id="rainfall"
                name="rainfall"
                min="20"
                max="300"
                step="1"
                value={values.rainfall}
                onChange={handleNumberChange}
                className="input-number"
              />
              <span className="form-control-unit">mm</span>
            </div>
          </div>
        </div>

      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? (
          <>
            <span style={{ marginRight: "0.5rem" }}>🔄</span> Menganalisis Tanah...
          </>
        ) : (
          <>
            <span style={{ marginRight: "0.5rem" }}>🚀</span> Dapatkan Rekomendasi Tanaman
          </>
        )}
      </button>
    </form>
  );
}

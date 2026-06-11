import React, { useState } from "react";

export default function EducationalInfo() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const sections = [
    {
      title: "🌱 Apa itu N-P-K dan Mengapa Parameter Tanah Sangat Penting?",
      content: (
        <div>
          <p style={{ marginBottom: "1rem" }}>
            Tanaman membutuhkan nutrisi dan lingkungan mikro yang tepat untuk tumbuh secara optimal. Berikut adalah peran penting dari setiap parameter yang diukur:
          </p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li>
              <strong>Nitrogen (N):</strong> Merangsang pertumbuhan vegetatif keseluruhan tanaman, khususnya pembentukan daun, batang, dan hijau daun (klorofil).
            </li>
            <li>
              <strong>Fosfor (P):</strong> Esensial untuk perkembangan sistem perakaran yang kuat, pembelahan sel, merangsang pembungaan, serta pembentukan biji dan buah.
            </li>
            <li>
              <strong>Kalium (K):</strong> Membantu memperkuat struktur tanaman (anti-rebah), mengatur regulasi air (membuka-tutup stomata), dan meningkatkan ketahanan tanaman terhadap penyakit serta cekaman kekeringan.
            </li>
            <li>
              <strong>pH Tanah:</strong> Menentukan tingkat keasaman atau kebasaan tanah. pH tanah memengaruhi kelarutan dan ketersediaan unsur hara untuk diserap akar tanaman. Mayoritas tanaman menyukai pH netral hingga sedikit asam (6.0 - 6.8).
            </li>
            <li>
              <strong>Suhu & Kelembaban:</strong> Memengaruhi laju respirasi, fotosintesis, serta penguapan air (transpirasi) pada tanaman. Setiap jenis tanaman memiliki rentang suhu optimalnya masing-masing.
            </li>
            <li>
              <strong>Curah Hujan:</strong> Merupakan sumber air utama bagi lahan non-irigasi. Kekurangan air menghambat pertumbuhan, sedangkan kelebihan air menyebabkan tanah jenuh air yang memicu pembusukan akar akibat kekurangan oksigen.
            </li>
          </ul>
        </div>
      )
    },
    {
      title: "📊 Bagaimana Algoritma Naive Bayes Bekerja?",
      content: (
        <div>
          <p style={{ marginBottom: "0.75rem" }}>
            <strong>Naive Bayes</strong> adalah algoritma klasifikasi probabilistik berdasarkan Teorema Bayes.
          </p>
          <p style={{ marginBottom: "0.75rem" }}>
            <strong>Cara Kerja:</strong>
          </p>
          <ol style={{ paddingLeft: "1.5rem", marginBottom: "0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <li>Algoritma mengasumsikan bahwa setiap parameter tanah bersifat independen satu sama lain (asumsi "Naive" / naif).</li>
            <li>Berdasarkan data latih, model mempelajari fungsi distribusi peluang normal (Gaussian) untuk setiap fitur pada masing-masing tanaman.</li>
            <li>Ketika Anda memasukkan data baru, model menghitung probabilitas bersyarat (probabilitas posterior) untuk setiap jenis tanaman.</li>
            <li>Tanaman dengan probabilitas posterior tertinggi dipilih sebagai rekomendasi akhir.</li>
          </ol>
          <p>
            <em>Kelebihan:</em> Sangat cepat, efisien, dan bekerja dengan baik pada sampel data yang lebih kecil serta stabil dalam menghitung probabilitas keyakinan kelas.
          </p>
        </div>
      )
    }
  ];

  return (
    <div className="accordion">
      {sections.map((section, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div key={idx} className="accordion-item">
            <div className="accordion-header" onClick={() => toggleAccordion(idx)}>
              <span>{section.title}</span>
              <span style={{ fontSize: "1.2rem", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                ▼
              </span>
            </div>
            {isOpen && (
              <div className="accordion-content">
                {section.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

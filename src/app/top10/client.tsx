"use client";
import { useState, useEffect } from "react";

interface RankingEntry {
  date: string;
  title: string;
  type: "person" | "exact";
  position: number;
  answer: string;
  hint: string;
  aliases: string[];
}

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMGf38fV6wwEdb-U2q_1hE8PwydH-WaSScFTBjW9BL1FBWw6sPQ8eNlx0lu9Q4I85qggrGJKcBzan5/pub?gid=731242113&single=true&output=csv";
const BLOCKED = ["junior","jr","filho","neto","da","de","do","dos","das"];
const MAX_LIVES = 5;

const KOFI_URL = "https://ko-fi.com/futjogos";
const SITE_URL = "https://futjogos.com.br/top10";

// ── REDES SOCIAIS DESATIVADAS ──
// Quando criar os perfis, mude para true e preencha as URLs
const SHOW_SOCIAL = false;
const SOCIAL_LINKS = [
  { label: "📸 Instagram", bg: "#E1306C", url: "" },
  { label: "🎵 TikTok",    bg: "#000000", url: "" },
  { label: "▶️ YouTube",   bg: "#FF0000", url: "" },
];

const NAV_JOGOS = [
  { href: "/", emoji: "🏠", nome: "Hub" },
  { href: "/escalacoes", emoji: "⚽", nome: "Escalações" },
  { href: "/bingo", emoji: "🎯", nome: "Bingo" },
];

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  const months = ["","Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${day} ${months[+m]} ${y}`;
}
function getTodayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}

export default function Top10Client({ data }: { data: RankingEntry[] }) {
  const [allData, setAllData] = useState<RankingEntry[]>(data);
  const [loading, setLoading] = useState(data.length === 0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (data.length > 0) return;
    fetch(CSV_URL, { redirect: "follow" })
      .then(r => r.text())
      .then(text => {
        const lines = text.trim().split("\n").filter(l => l.trim() !== "").slice(1);
        const parsed: RankingEntry[] = lines.map(line => {
          const cols = line.split(",");
          return {
            date: cols[0]?.trim() || "",
            title: cols[1]?.trim() || "",
            type: (cols[2]?.trim() || "exact") as "person" | "exact",
            position: parseInt(cols[3]) || 0,
            answer: cols[4]?.trim() || "",
            hint: cols[5]?.trim() || "",
            aliases: cols[6] ? cols[6].trim().split(/[|;/]/).map(a => a.trim()) : [],
          };
        }).filter(d => d.date && d.answer);
        setAllData(parsed);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Apenas datas até hoje — sem futuras
  const today = getTodayStr();
  const dates = Array.from(new Set(allData.map(d => d.date))).filter(d => d <= today).sort();
  const todayIdx = dates.indexOf(today);
  const initialIdx = todayIdx >= 0 ? todayIdx : dates.length - 1;

  const [dateIdx, setDateIdx] = useState(initialIdx);
  const [guessed, setGuessed] = useState<Record<number, boolean>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [lives, setLives] = useState(MAX_LIVES);
  const [gameOver, setGameOver] = useState(false);
  const [input, setInput] = useState("");
  const [toast, setToast] = useState({ msg: "", type: "", show: false });
  const [showModal, setShowModal] = useState(false);

  // Garante índice válido após o fetch carregar
  useEffect(() => {
    if (dates.length > 0 && (dateIdx < 0 || dateIdx >= dates.length)) {
      const tIdx = dates.indexOf(today);
      setDateIdx(tIdx >= 0 ? tIdx : dates.length - 1);
    }
  }, [dates.length]);

  const ranking = allData.filter(d => d.date === dates[dateIdx]).sort((a, b) => a.position - b.position);
  const hits = Object.keys(guessed).length;

  function showToast(msg: string, type: string) {
    setToast({ msg, type, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 2200);
  }

  function validate(val: string) {
    const inp = norm(val.trim());
    if (!inp || inp.length < 2) return [];
    if (BLOCKED.includes(inp)) return [];
    const matched: number[] = [];
    ranking.forEach((entry, i) => {
      if (guessed[i]) return;
      if (entry.type === "exact") {
        if (inp === norm(entry.answer) || entry.aliases.map(norm).includes(inp)) matched.push(i);
      } else {
        const words = norm(entry.answer).split(" ").filter(w => w.length > 3);
        const aliases = entry.aliases.map(norm);
        if (norm(entry.answer) === inp || aliases.some(a => inp === a) || words.some(w => inp === w)) matched.push(i);
      }
    });
    return matched;
  }

  // ── EVENTO: JOGO COMPLETO ──
  function fireGameComplete(finalHits: number, finalAttempts: number) {
    (window as any).gtag?.('event', 'jogo_completo', {
      jogo: 'top10',
      acertos: finalHits,
      total: ranking.length,
      tentativas: finalAttempts,
    });
  }

  function submit() {
    if (gameOver || !input.trim()) return;
    const matched = validate(input);
    if (matched.length > 0) {
      const newGuessed = { ...guessed };
      matched.forEach(i => { newGuessed[i] = true; });
      setGuessed(newGuessed);
      showToast(matched.length > 1 ? `+${matched.length} acertos! ⚽` : "Acertou! ⚽", "success");
      if (Object.keys(newGuessed).length >= ranking.length) {
        setGameOver(true);
        fireGameComplete(Object.keys(newGuessed).length, MAX_LIVES - lives + 1);
        setTimeout(() => setShowModal(true), 600);
      }
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      showToast("Errado! ❌  Vidas: " + newLives, "error");
      if (newLives <= 0) {
        const newRevealed: Record<number, boolean> = {};
        ranking.forEach((_, i) => { if (!guessed[i]) newRevealed[i] = true; });
        setRevealed(newRevealed);
        setGameOver(true);
        fireGameComplete(hits, MAX_LIVES - newLives + hits);
        setTimeout(() => setShowModal(true), 700);
      }
    }
    setInput("");
  }

  function giveUp() {
    if (gameOver || !confirm("Deseja realmente desistir?")) return;
    const newRevealed: Record<number, boolean> = {};
    ranking.forEach((_, i) => { if (!guessed[i]) newRevealed[i] = true; });
    setRevealed(newRevealed);
    setGameOver(true);
    fireGameComplete(hits, MAX_LIVES - lives + hits);
    setShowModal(true);
  }

  function changeDate(dir: number) {
    const newIdx = dateIdx + dir;
    if (newIdx < 0 || newIdx >= dates.length) return;
    setDateIdx(newIdx);
    setGuessed({});
    setRevealed({});
    setLives(MAX_LIVES);
    setGameOver(false);
    setShowModal(false);
    setInput("");
  }

  // ── TEXTO DE COMPARTILHAMENTO — com https:// para virar link clicável ──
  function buildShareText() {
    return `🏆 Fiz ${hits}/${ranking.length} no Top 10 de ${ranking[0]?.title}!\nSerá que você vai melhor?\n👉 ${SITE_URL}`;
  }

  function shareWhatsApp() {
    (window as any).gtag?.('event', 'compartilhamento', { canal: 'whatsapp', origem: 'top10' });
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(buildShareText())}`, "_blank");
  }
  function shareX() {
    (window as any).gtag?.('event', 'compartilhamento', { canal: 'x', origem: 'top10' });
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(buildShareText())}`, "_blank");
  }
  function shareCopy() {
    (window as any).gtag?.('event', 'compartilhamento', { canal: 'copiar_link', origem: 'top10' });
    navigator.clipboard?.writeText(buildShareText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) return (
    <div style={{ background: "#FFD700", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "#002776", letterSpacing: 2 }}>Carregando... ⚽</div>
    </div>
  );

  if (!ranking.length) return (
    <div style={{ background: "#FFD700", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: "#002776" }}>Nenhum ranking para hoje — volte amanhã! ⚽</div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}

        .t10-ad{position:fixed;top:0;width:160px;height:100vh;display:flex;align-items:center;justify-content:center;z-index:50;pointer-events:none;}
        .t10-ad-left{left:0;}
        .t10-ad-right{right:0;}
        .t10-main{padding-left:160px;padding-right:160px;}

        /* MOBILE */
        @media (max-width: 1080px) {
          .t10-ad{display:none;}
          .t10-main{padding-left:0;padding-right:0;}
        }
        @media (max-width: 480px) {
          .t10-header-title{font-size:26px !important;}
          .t10-title{font-size:18px !important;}
        }
      `}</style>

      {/* ANÚNCIO ESQUERDO FIXO */}
      <div className="t10-ad t10-ad-left">
        <div style={{ width: 160, height: 600, background: "rgba(0,39,118,0.08)", border: "1px dashed rgba(0,39,118,0.25)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, pointerEvents: "auto" }}>
          <div style={{ fontSize: 9, color: "rgba(0,39,118,0.4)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Anúncio</div>
          <div style={{ fontSize: 10, color: "rgba(0,39,118,0.3)", fontWeight: 600 }}>160×600</div>
        </div>
      </div>

      {/* ANÚNCIO DIREITO FIXO */}
      <div className="t10-ad t10-ad-right">
        <div style={{ width: 160, height: 600, background: "rgba(0,39,118,0.08)", border: "1px dashed rgba(0,39,118,0.25)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, pointerEvents: "auto" }}>
          <div style={{ fontSize: 9, color: "rgba(0,39,118,0.4)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Anúncio</div>
          <div style={{ fontSize: 10, color: "rgba(0,39,118,0.3)", fontWeight: 600 }}>160×600</div>
        </div>
      </div>

      {/* CONTEÚDO CENTRAL */}
      <div className="t10-main" style={{ fontFamily: "'Nunito', sans-serif", background: "#FFD700", minHeight: "100vh", paddingBottom: 40 }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>

          {/* HEADER */}
          <div style={{ background: "#002776", padding: "12px 16px 10px", textAlign: "center" }}>
            <a href="/" style={{ textDecoration: "none" }}>
              <div className="t10-header-title" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: "#FFD700", letterSpacing: 2, lineHeight: 1 }}>🏆 Top 10 do Futebol</div>
              <div style={{ fontSize: 10, color: "#9EC8FF", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>Descubra quem está no Top 10 · FutJogos</div>
            </a>
          </div>

          {/* NAV JOGOS */}
          <div style={{ background: "#001a55", padding: "8px 12px", display: "flex", gap: 8 }}>
            {NAV_JOGOS.map(j => (
              <a key={j.href} href={j.href} style={{ flex: 1, textDecoration: "none", background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.2)", color: "#FFD700", fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, letterSpacing: 1, padding: "7px 8px", borderRadius: 8, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <span>{j.emoji}</span><span>{j.nome}</span>
              </a>
            ))}
          </div>

          {/* DATE NAV — bloqueado avançar além de hoje */}
          <div style={{ background: "#009C3B", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "7px 16px" }}>
            <button onClick={() => changeDate(-1)} disabled={dateIdx <= 0} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", fontSize: 18, width: 26, height: 26, borderRadius: "50%", cursor: dateIdx > 0 ? "pointer" : "default", opacity: dateIdx <= 0 ? 0.3 : 1 }}>‹</button>
            <span style={{ color: "white", fontWeight: 700, fontSize: 13 }}>{formatDate(dates[dateIdx])}</span>
            {dateIdx < dates.length - 1 ? (
              <button onClick={() => changeDate(1)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", fontSize: 18, width: 26, height: 26, borderRadius: "50%", cursor: "pointer" }}>›</button>
            ) : (
              <div style={{ width: 26, height: 26 }} />
            )}
          </div>

          {/* TÍTULO */}
          <div className="t10-title" style={{ textAlign: "center", padding: "14px 16px 6px", fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "#002776", letterSpacing: 1 }}>{ranking[0]?.title}</div>

          {/* INPUT */}
          <div style={{ padding: "0 12px 8px", display: "flex", gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Digite um nome ou país..." autoComplete="off" disabled={gameOver}
              style={{ flex: 1, padding: "11px 14px", fontSize: 15, fontFamily: "'Nunito', sans-serif", fontWeight: 700, border: "3px solid #009C3B", borderRadius: 10, background: "white", color: "#002776", outline: "none", minWidth: 0 }} />
            <button onClick={submit} disabled={gameOver} style={{ padding: "11px 16px", background: "#009C3B", color: "white", fontWeight: 800, fontSize: 14, border: "none", borderRadius: 10, cursor: "pointer" }}>OK</button>
          </div>

          {/* STATUS */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px 8px", gap: 10, flexWrap: "wrap" }}>
            <div style={{ background: "#002776", color: "#FFD700", fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, padding: "4px 14px", borderRadius: 20 }}>{hits}/{ranking.length}</div>
            <div style={{ display: "flex", gap: 3 }}>
              {Array.from({ length: MAX_LIVES }).map((_, i) => (
                <div key={i} style={{ width: 22, height: 22, borderRadius: "50%", background: i < lives ? "white" : "rgba(255,255,255,0.18)", border: "1.5px solid #555", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>⚽</div>
              ))}
            </div>
            <button onClick={giveUp} disabled={gameOver} style={{ background: "transparent", border: "2px solid #cc0000", color: "#cc0000", fontWeight: 700, fontSize: 12, padding: "5px 10px", borderRadius: 8, cursor: "pointer" }}>Desistir</button>
          </div>

          {/* RANKING — o gabarito aparece aqui via revealed */}
          <div style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: 5 }}>
            {ranking.map((entry, i) => {
              const isCorrect = guessed[i];
              const isRevealed = revealed[i];
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: isCorrect ? "rgba(0,156,59,0.9)" : isRevealed ? "rgba(120,0,0,0.8)" : "rgba(0,39,118,0.88)", borderRadius: 10, padding: "9px 14px", border: `2px solid ${isCorrect ? "#FFD700" : "rgba(255,215,0,0.15)"}` }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "#FFD700", minWidth: 26, textAlign: "center" }}>{entry.position}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "white", opacity: isCorrect || isRevealed ? 1 : 0.4, fontStyle: isCorrect || isRevealed ? "normal" : "italic" }}>
                      {isCorrect || isRevealed ? entry.answer : "???"}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, marginTop: 1 }}>Dica: {entry.hint}</div>
                  </div>
                  <div style={{ fontSize: 16, minWidth: 20, textAlign: "center" }}>{isCorrect ? "✅" : isRevealed ? "❌" : ""}</div>
                </div>
              );
            })}
          </div>

          {/* FOOTER */}
          <div style={{ padding: "20px 14px 0", textAlign: "center" }}>
            {SHOW_SOCIAL && (
              <>
                <div style={{ fontSize: 11, color: "#003a99", fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Siga a gente</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                  {SOCIAL_LINKS.map(({ label, bg, url }) => (
                    <a key={label} href={url} target="_blank" rel="noreferrer" style={{ textDecoration: "none", background: bg, color: "white", fontWeight: 800, fontSize: 12, padding: "8px 14px", borderRadius: 10, cursor: "pointer" }}>{label}</a>
                  ))}
                </div>
              </>
            )}
            <a href={KOFI_URL} target="_blank" rel="noreferrer" style={{ textDecoration: "none", display: "block", background: "#FF5E5B", color: "white", fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 1, padding: "12px", borderRadius: 10, textAlign: "center", marginBottom: 10 }}>
              ☕ Apoie o FutJogos no Ko-fi
            </a>
            <div style={{ fontSize: 10, color: "#003a99", fontWeight: 700 }}>© 2026 FutJogos · futjogos.com.br · Gratuito para sempre ⚽</div>
          </div>

        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#002776", borderRadius: 16, padding: "26px 22px", maxWidth: 360, width: "100%", textAlign: "center", border: "3px solid #FFD700", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 34, color: "#FFD700", letterSpacing: 2, marginBottom: 6 }}>
              {hits === ranking.length ? "Perfeito! 🏆" : hits >= 7 ? "Muito bem! 🌟" : "Tente amanhã! 💪"}
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 60, color: "white", lineHeight: 1 }}>{hits}/{ranking.length}</div>
            <div style={{ fontSize: 20, margin: "10px 0", lineHeight: 1.8 }}>{ranking.map((_, i) => guessed[i] ? "✅" : "❌").join("")}</div>

            {/* ── GABARITO COMPLETO ── */}
            <div style={{ background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 10, padding: "10px 12px", marginBottom: 14, textAlign: "left" }}>
              <div style={{ fontSize: 10, color: "rgba(255,215,0,0.7)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, textAlign: "center" }}>Ranking completo</div>
              {ranking.map((entry, i) => {
                const ok = guessed[i];
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: "#FFD700", width: 20, textAlign: "center" }}>{entry.position}</span>
                    <span style={{ fontSize: 11, width: 16, textAlign: "center" }}>{ok ? "✅" : "❌"}</span>
                    <span style={{ fontSize: 12, color: ok ? "#4ade80" : "#ff8888", fontWeight: 800, fontFamily: "'Nunito', sans-serif" }}>{entry.answer}</span>
                  </div>
                );
              })}
            </div>

            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, margin: "8px 0 16px", fontWeight: 600 }}>
              {hits === ranking.length ? "Você conhece demais o futebol! 🔥" : "Volte amanhã para um novo desafio."}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
              <button onClick={shareWhatsApp} style={{ background: "#25D366", color: "white", border: "none", padding: "10px", borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>WhatsApp</button>
              <button onClick={shareX} style={{ background: "#000", color: "white", border: "none", padding: "10px", borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>X / Twitter</button>
              <button onClick={shareCopy} style={{ background: "#555", color: "white", border: "none", padding: "10px", borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>{copied ? "✓ Copiado!" : "Copiar"}</button>
            </div>
            <button onClick={() => setShowModal(false)} style={{ background: "transparent", border: "2px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.55)", padding: "9px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%" }}>Fechar</button>
          </div>
        </div>
      )}

      {toast.show && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: toast.type === "error" ? "#8B0000" : "#002776", color: toast.type === "error" ? "#FFD0D0" : "#FFD700", padding: "9px 18px", borderRadius: 8, fontWeight: 700, fontSize: 13, zIndex: 200, whiteSpace: "nowrap" }}>
          {toast.msg}
        </div>
      )}
    </>
  );
}

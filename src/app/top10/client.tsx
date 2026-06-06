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

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMGf38fV6wwEdb-U2q_1hE8PwydH-WaSScFTBjW9BL1FBWw6sPQ8eNlx0lu9Q4I85qggrGJKcBzan5/pub?output=csv";
const BLOCKED = ["junior","jr","filho","neto","da","de","do","dos","das"];
const MAX_LIVES = 5;

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

  useEffect(() => {
    if (data.length > 0) return;
    fetch(CSV_URL, { redirect: "follow" })
      .then(r => r.text())
      .then(text => {
        const lines = text.trim().split("\n").filter(line => line.trim() !== "").slice(1);
        const parsed: RankingEntry[] = lines.map(line => {
          const cols = line.split(",");
          return {
            date: cols[0]?.trim() || "",
            title: cols[1]?.trim() || "",
            type: (cols[2]?.trim() || "exact") as "person" | "exact",
            position: parseInt(cols[3]) || 0,
            answer: cols[4]?.trim() || "",
            hint: cols[5]?.trim() || "",
            aliases: cols[6] ? cols[6].trim().split("|").map(a => a.trim()) : [],
          };
        }).filter(d => d.date && d.answer);
        setAllData(parsed);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const dates = Array.from(new Set(allData.map(d => d.date))).sort();
  const today = getTodayStr();
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

  function shareResult() {
    let emojis = "";
    ranking.forEach((_, i) => { emojis += guessed[i] ? "✅" : "❌"; if ((i+1)%5===0) emojis+="\n"; });
    const hearts = "⚽".repeat(lives) + "🔘".repeat(MAX_LIVES - lives);
    const text = `🏆 Top 10 do Futebol\n${ranking[0]?.title}\n${formatDate(dates[dateIdx])}\n\nResultado: ${hits}/10\nVidas: ${hearts}\n${emojis}\nJogue em: futjogos.vercel.app/top10`;
    navigator.clipboard?.writeText(text).then(() => showToast("Copiado! Cole no WhatsApp 📋", "success"));
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
    <div style={{ fontFamily: "'Nunito', sans-serif", background: "#FFD700", minHeight: "100vh", paddingBottom: 40 }}>
      <div style={{ background: "#002776", padding: "12px 16px 10px", textAlign: "center" }}>
        <a href="/" style={{ textDecoration: "none" }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: "#FFD700", letterSpacing: 2, lineHeight: 1 }}>🏆 Top 10 do Futebol</div>
          <div style={{ fontSize: 10, color: "#9EC8FF", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>Descubra quem está no Top 10 · FutJogos</div>
        </a>
      </div>
      <div style={{ background: "#009C3B", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "7px 16px" }}>
        <button onClick={() => changeDate(-1)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", fontSize: 18, width: 26, height: 26, borderRadius: "50%", cursor: "pointer" }}>‹</button>
        <span style={{ color: "white", fontWeight: 700, fontSize: 13 }}>{formatDate(dates[dateIdx])}</span>
        <button onClick={() => changeDate(1)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", fontSize: 18, width: 26, height: 26, borderRadius: "50%", cursor: "pointer" }}>›</button>
      </div>
      <div style={{ textAlign: "center", padding: "14px 16px 6px", fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "#002776", letterSpacing: 1 }}>{ranking[0]?.title}</div>
      <div style={{ padding: "0 12px 8px", display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Digite um nome ou país..." autoComplete="off" disabled={gameOver}
          style={{ flex: 1, padding: "11px 14px", fontSize: 15, fontFamily: "'Nunito', sans-serif", fontWeight: 700, border: "3px solid #009C3B", borderRadius: 10, background: "white", color: "#002776", outline: "none" }} />
        <button onClick={submit} disabled={gameOver} style={{ padding: "11px 16px", background: "#009C3B", color: "white", fontWeight: 800, fontSize: 14, border: "none", borderRadius: 10, cursor: "pointer" }}>OK</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px 8px", gap: 10 }}>
        <div style={{ background: "#002776", color: "#FFD700", fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, padding: "4px 14px", borderRadius: 20 }}>{hits}/{ranking.length}</div>
        <div style={{ display: "flex", gap: 3 }}>
          {Array.from({ length: MAX_LIVES }).map((_, i) => (
            <div key={i} style={{ width: 22, height: 22, borderRadius: "50%", background: i < lives ? "white" : "rgba(255,255,255,0.18)", border: "1.5px solid #555", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>⚽</div>
          ))}
        </div>
        <button onClick={giveUp} disabled={gameOver} style={{ background: "transparent", border: "2px solid #cc0000", color: "#cc0000", fontWeight: 700, fontSize: 12, padding: "5px 10px", borderRadius: 8, cursor: "pointer" }}>Desistir</button>
      </div>
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
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#002776", borderRadius: 16, padding: "26px 22px", maxWidth: 340, width: "100%", textAlign: "center", border: "3px solid #FFD700" }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 34, color: "#FFD700", letterSpacing: 2, marginBottom: 6 }}>
              {hits === ranking.length ? "Perfeito! 🏆" : hits >= 7 ? "Muito bem! 🌟" : "Tente amanhã! 💪"}
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 60, color: "white", lineHeight: 1 }}>{hits}/{ranking.length}</div>
            <div style={{ fontSize: 20, margin: "10px 0", lineHeight: 1.8 }}>{ranking.map((_, i) => guessed[i] ? "✅" : "❌").join("")}</div>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, margin: "8px 0 18px", fontWeight: 600 }}>
              {hits === ranking.length ? "Você conhece demais o futebol! 🔥" : "Volte amanhã para um novo desafio."}
            </p>
            <button onClick={shareResult} style={{ background: "#009C3B", color: "white", border: "none", padding: "13px 24px", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer", width: "100%", marginBottom: 8 }}>📤 Compartilhar resultado</button>
            <button onClick={() => setShowModal(false)} style={{ background: "transparent", border: "2px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.55)", padding: "9px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%" }}>Fechar</button>
          </div>
        </div>
      )}
      {toast.show && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: toast.type === "error" ? "#8B0000" : "#002776", color: toast.type === "error" ? "#FFD0D0" : "#FFD700", padding: "9px 18px", borderRadius: 8, fontWeight: 700, fontSize: 13, zIndex: 200, whiteSpace: "nowrap" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

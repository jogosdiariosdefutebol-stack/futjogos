"use client";
import { useState, useEffect } from "react";

export default function Hub() {
  const [timeLeft, setTimeLeft] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    function update() {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
      const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
      setDateStr(`${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`);
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", background: "#FFD700", minHeight: "100vh", paddingBottom: 40, position: "relative", overflow: "hidden" }}>

      {/* HEADER */}
      <div style={{ background: "#002776", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: "#FFD700", letterSpacing: 2, lineHeight: 1 }}>FutJogos</div>
            <div style={{ fontSize: 9, color: "#9EC8FF", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>O hub dos jogos de futebol</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 20, cursor: "pointer" }}>🏆 Ranking</div>
          <div style={{ background: "#FFD700", color: "#002776", fontSize: 10, fontWeight: 800, padding: "5px 12px", borderRadius: 20, cursor: "pointer" }}>Entrar</div>
        </div>
      </div>

      {/* HERO */}
      <div style={{ textAlign: "center", padding: "20px 16px 14px" }}>
        <div style={{ display: "inline-block", background: "#009C3B", color: "white", fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", padding: "3px 12px", borderRadius: 20, marginBottom: 10 }}>⚽ Jogos diários de futebol</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: "#002776", letterSpacing: 2, lineHeight: 1.1, marginBottom: 6 }}>Teste seu conhecimento<br />do futebol brasileiro</div>
        <div style={{ fontSize: 13, color: "#003a99", fontWeight: 700, maxWidth: 340, margin: "0 auto" }}>Um novo desafio todo dia. Compete com amigos e descubra quem manda no futebol.</div>
      </div>

      {/* STATS */}
      <div style={{ display: "flex", margin: "0 14px 16px", background: "#002776", borderRadius: 12, overflow: "hidden" }}>
        {[["3","Jogos"],["Diário","Atualização"],["100%","Gratuito"],["🇧🇷","Foco no Brasil"]].map(([num, label]) => (
          <div key={label} style={{ flex: 1, textAlign: "center", padding: "10px 6px", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "#FFD700", lineHeight: 1 }}>{num}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: 700, textTransform: "uppercase", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* PROGRESSO */}
      <div style={{ margin: "0 14px 16px", background: "#002776", borderRadius: 12, padding: "10px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, color: "#FFD700", letterSpacing: 1 }}>DESAFIOS DE HOJE</div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>{dateStr}</div>
            <div style={{ fontSize: 10, color: "#FFD700", fontWeight: 800 }}>⏱ {timeLeft} para novos desafios</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {[true, false, false].map((done, i) => (
            <div key={i} style={{ flex: 1, height: 8, borderRadius: 4, background: done ? "#009C3B" : "rgba(255,255,255,0.15)" }} />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#4ade80" }}>▲ 1 vitória</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#f87171" }}>▼ 0 derrota</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginLeft: "auto" }}>Jogados: 1/3</div>
        </div>
      </div>

      {/* JOGOS */}

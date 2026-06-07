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

  const s: React.CSSProperties & Record<string, any> = {};

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", background: "#FFD700", minHeight: "100vh", paddingBottom: 40 }}>

      {/* LAYOUT WRAPPER COM ANÚNCIOS */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", minHeight: "100vh" }}>

        {/* ANÚNCIO ESQUERDO */}
        <div style={{ width: 160, minHeight: "100vh", flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80 }}>
          <div style={{ width: 160, height: 600, background: "rgba(0,39,118,0.08)", border: "1px dashed rgba(0,39,118,0.2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 9, color: "rgba(0,39,118,0.4)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Anúncio</div>
            <div style={{ fontSize: 10, color: "rgba(0,39,118,0.3)", fontWeight: 600 }}>160×600</div>
          </div>
        </div>

        {/* CONTEÚDO CENTRAL */}
        <div style={{ width: 700, flexShrink: 0 }}>

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
            <div style={{ fontSize: 13, color: "#003a99", fontWeight: 700 }}>Um novo desafio todo dia. Compete com amigos e descubra quem manda no futebol.</div>
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
          <div style={{ padding: "0 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: "#002776", letterSpacing: 1 }}>Jogos de hoje</div>
              <div style={{ fontSize: 11, color: "#003a99", fontWeight: 800 }}>{dateStr}</div>
            </div>

            {/* TOP 10 */}
            <a href="/top10" style={{ textDecoration: "none" }}>
              <div style={{ background: "#002776", borderRadius: 12, marginBottom: 10, border: "2px solid #FFD700", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px 8px" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: "#009C3B", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 24 }}>🏆</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "inline-block", background: "#009C3B", color: "white", fontSize: 9, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", padding: "2px 7px", borderRadius: 10, marginBottom: 3 }}>● Disponível</div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "#FFD700", letterSpacing: 1, lineHeight: 1 }}>Top 10 do Futebol</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600, marginTop: 2 }}>Descubra quem está no Top 10 do ranking</div>
                  </div>
                  <div style={{ color: "#FFD700", fontSize: 18, fontWeight: 900 }}>›</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 14px 10px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>Vidas: <span style={{ color: "rgba(255,255,255,0.8)" }}>5</span></div>
                  <div style={{ background: "#009C3B", color: "white", fontWeight: 800, fontSize: 11, padding: "6px 14px", borderRadius: 8 }}>Jogar agora</div>
                </div>
              </div>
            </a>

            {/* ESCALAÇÕES */}
            <div style={{ background: "#002776", borderRadius: 12, marginBottom: 10, border: "2px solid rgba(255,215,0,0.2)", opacity: 0.7 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px 8px" }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: "#1a4fa0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 24 }}>⚽</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "inline-block", background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", padding: "2px 7px", borderRadius: 10, marginBottom: 3 }}>Em breve</div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "#FFD700", letterSpacing: 1, lineHeight: 1 }}>Escalações do Futebol</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600, marginTop: 2 }}>Complete a escalação histórica do time</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 14px 10px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>Lançamento: Jul 2026</div>
                <div style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)", fontWeight: 800, fontSize: 11, padding: "6px 14px", borderRadius: 8 }}>Em breve</div>
              </div>
            </div>

            {/* BINGO */}
            <div style={{ background: "#002776", borderRadius: 12, marginBottom: 10, border: "2px solid rgba(255,215,0,0.2)", opacity: 0.7 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px 8px" }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: "#b8860b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 24 }}>🎯</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "inline-block", background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", padding: "2px 7px", borderRadius: 10, marginBottom: 3 }}>Em breve</div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "#FFD700", letterSpacing: 1, lineHeight: 1 }}>Bingo do Futebol</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600, marginTop: 2 }}>Preencha a grade e marque Bingo!</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 14px 10px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>Lançamento: Ago 2026</div>
                <div style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)", fontWeight: 800, fontSize: 11, padding: "6px 14px", borderRadius: 8 }}>Em breve</div>
              </div>
            </div>
          </div>

          {/* REDES SOCIAIS */}
          <div style={{ padding: "14px 14px 0", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#003a99", fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Siga a gente</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              {[["📸 Instagram","#E1306C"],["🎵 TikTok","#000000"],["▶️ YouTube","#FF0000"]].map(([label, bg]) => (
                <div key={label} style={{ background: bg as string, color: "white", fontWeight: 800, fontSize: 12, padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>{label}</div>
              ))}
            </div>
          </div>

          {/* APOIE */}
          <div style={{ padding: "12px 14px 0" }}>
            <a href="SEU_LINK_KOFI" target="_blank" rel="noreferrer" style={{ textDecoration: "none", display: "block", width: "100%", background: "#FF5E5B", color: "white", fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 1, padding: "12px", borderRadius: 10, textAlign: "center" }}>
              ☕ Apoie o FutJogos no Ko-fi
            </a>
          </div>

          {/* FEEDBACK */}
          <div style={{ padding: "10px 14px 0" }}>
            <div style={{ width: "100%", background: "transparent", border: "2px solid #002776", color: "#002776", fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 1, padding: 12, borderRadius: 10, cursor: "pointer", textAlign: "center" }}>
              💬 Dê sua opinião — ajude a melhorar!
            </div>
          </div>

          {/* FOOTER */}
          <div style={{ textAlign: "center", padding: "16px 14px 0", fontSize: 10, color: "#003a99", fontWeight: 700 }}>
            © 2026 FutJogos · futjogos.vercel.app · Gratuito para sempre ⚽
          </div>

        </div>

        {/* ANÚNCIO DIREITO */}
        <div style={{ width: 160, minHeight: "100vh", flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80 }}>
          <div style={{ width: 160, height: 600, background: "rgba(0,39,118,0.08)", border: "1px dashed rgba(0,39,118,0.2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 9, color: "rgba(0,39,118,0.4)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Anúncio</div>
            <div style={{ fontSize: 10, color: "rgba(0,39,118,0.3)", fontWeight: 600 }}>160×600</div>
          </div>
        </div>

      </div>
    </div>
  );
}

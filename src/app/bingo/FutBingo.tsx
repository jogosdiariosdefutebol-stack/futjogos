"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";

const TURN_TIME = 10;
const TODAY = new Date().toISOString().split("T")[0];
const STATS_KEY = "futbingo_stats_v1";
const SITE_URL = "https://futjogos.com.br/bingo";
const KOFI_URL = "https://ko-fi.com/futjogos";

const CSV_CATS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMGf38fV6wwEdb-U2q_1hE8PwydH-WaSScFTBjW9BL1FBWw6sPQ8eNlx0lu9Q4I85qggrGJKcBzan5/pub?gid=1798478588&single=true&output=csv";
const CSV_PLAYERS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMGf38fV6wwEdb-U2q_1hE8PwydH-WaSScFTBjW9BL1FBWw6sPQ8eNlx0lu9Q4I85qggrGJKcBzan5/pub?gid=883931017&single=true&output=csv";

// ── REDES SOCIAIS DESATIVADAS ──
const SHOW_SOCIAL = false;
const SOCIAL_LINKS = [
  { label: "Instagram", bg: "#E1306C", url: "" },
  { label: "TikTok",    bg: "#000000", url: "" },
  { label: "YouTube",   bg: "#FF0000", url: "" },
];

const NAV_JOGOS = [
  { href: "/", emoji: "🏠", nome: "Hub" },
  { href: "/top10", emoji: "🏆", nome: "Top 10" },
  { href: "/escalacoes", emoji: "⚽", nome: "Escalações" },
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function dateToSeed(dateStr: string): number {
  return dateStr.split("-").reduce((acc, n) => acc * 1000 + parseInt(n), 0);
}

function pickN<T>(arr: T[], n: number, rng: () => number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = Math.floor(rng() * (copy.length - i));
    result.push(copy[idx]);
    copy[idx] = copy[copy.length - i - 1];
  }
  return result;
}

// Parser de CSV que respeita aspas (vírgula dentro de campo)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

function loadStats() {
  try {
    const r = localStorage.getItem(STATS_KEY);
    return r ? JSON.parse(r) : { jogos: 0, acertos: 0, totalPos: 0, tentativas: 0, streak: 0, lastDate: null };
  } catch { return { jogos: 0, acertos: 0, totalPos: 0, tentativas: 0, streak: 0, lastDate: null }; }
}
function saveStats(s: any) { try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch {} }
function recordResult(acertos: number, totalPos: number, tentativas: number) {
  const s = loadStats();
  s.jogos++; s.acertos += acertos; s.totalPos += totalPos; s.tentativas += tentativas;
  if (s.lastDate) {
    const diff = (new Date(TODAY).getTime() - new Date(s.lastDate).getTime()) / 86400000;
    if (diff === 1) s.streak++;
    else if (diff !== 0) s.streak = 1;
  } else s.streak = 1;
  s.lastDate = TODAY;
  saveStats(s);
}

interface Category { id: string; pre: string; main: string; }
interface Player { id: string; name: string; position: string; categoryIds: string[]; }

export default function FutBingo() {
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<{categoryId:string;filledBy:string|null;attempted:boolean}[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [status, setStatus] = useState("idle"); // idle → playing → won/lost
  const [feedback, setFeedback] = useState<{type:string;text:string}|null>(null);
  const [timeLeft, setTimeLeft] = useState(TURN_TIME);
  const [showStats, setShowStats] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [countdown, setCountdown] = useState("--:--:--");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  // Guarda a resposta correta de cada categoria não preenchida (para revelar ao fim)
  const [revealMap, setRevealMap] = useState<Record<string,string>>({});

  // Seleciona categorias e jogadores do dia — determinístico por data
  useEffect(() => {
     if (allCategories.length === 0 || allPlayers.length === 0) return;
  const rng = seededRandom(dateToSeed(TODAY));

  // Filtra categorias que têm pelo menos 1 jogador no banco completo
  const allCatIdsWithPlayers = new Set<string>();
  allPlayers.forEach(p => p.categoryIds.forEach(id => allCatIdsWithPlayers.add(id)));
  const validCategories = allCategories.filter(c => allCatIdsWithPlayers.has(c.id));

  const dailyCats = pickN(validCategories, 16, rng);
  const catIds = new Set(dailyCats.map(c => c.id));
  const eligiblePlayers = allPlayers.filter(p => p.categoryIds.some(id => catIds.has(id)));
  const dailyPlayers = pickN(eligiblePlayers, 40, rng);
  setCategories(dailyCats);
  setPlayers(dailyPlayers);
  setBoard(dailyCats.map(c => ({ categoryId: c.id, filledBy: null, attempted: false })));
}, [allCategories, allPlayers]);
  
  useEffect(() => {
    Promise.all([
      fetch(CSV_CATS, { redirect: "follow" }).then(r => r.text()),
      fetch(CSV_PLAYERS, { redirect: "follow" }).then(r => r.text()),
    ]).then(([catsText, playersText]) => {
      const cats: Category[] = catsText.trim().split("\n").filter(l => l.trim()).slice(1).map(line => {
        const cols = parseCSVLine(line);
        return { id: cols[0]?.trim() || "", pre: cols[1]?.trim() || "", main: cols[2]?.trim() || "" };
      }).filter(c => c.id);

      const pls: Player[] = playersText.trim().split("\n").filter(l => l.trim()).slice(1).map((line, idx) => {
        const cols = parseCSVLine(line);
        const rawCats = cols[2]?.trim() || "";
        return {
          id: `player_${idx}`,
          name: cols[0]?.trim() || "",
          position: cols[1]?.trim() || "",
          categoryIds: rawCats ? rawCats.split(/[|;/]/).map((c: string) => c.trim()).filter(Boolean) : [],
        };
      }).filter(p => p.name);

      setAllCategories(cats);
      setAllPlayers(pls);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const currentPlayer = players[currentIndex] ?? null;
  const filledCount = useMemo(() => board.filter(c => c.filledBy).length, [board]);
  const remaining = Math.max(0, players.length - currentIndex);

  const getCat = (id: string) => categories.find(c => c.id === id);
  const getPlayer = (id: string) => players.find(p => p.id === id);

  // Constrói o mapa de respostas corretas para revelar ao fim
  function buildRevealMap(boardSnapshot: any[]) {
    const map: Record<string,string> = {};
    boardSnapshot.forEach(cell => {
      if (cell.filledBy) return; // já preenchida, não precisa revelar
      // acha um jogador (dentre os do dia) que pertence a essa categoria
      const match = players.find(p => p.categoryIds.includes(cell.categoryId));
      if (match) map[cell.categoryId] = match.name;
    });
    return map;
  }

  // Timer só roda quando status === playing
  useEffect(() => {
    if (status !== "playing" || !currentPlayer) return;
    setTimeLeft(TURN_TIME);
  }, [currentIndex, status]);

  useEffect(() => {
    if (status !== "playing" || !currentPlayer) return;
    if (timeLeft <= 0) {
      setFeedback({ type: "timeout", text: `Tempo esgotado! ${currentPlayer.name} foi perdido.` });
      advanceTurn();
      return;
    }
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, status, currentPlayer]);

  useEffect(() => {
    if (!showResult) return;
    const tick = () => {
      const now = new Date(), mid = new Date();
      mid.setHours(24, 0, 0, 0);
      const d = Math.max(0, mid.getTime() - now.getTime());
      const h = String(Math.floor(d / 3600000)).padStart(2, "0");
      const m = String(Math.floor((d % 3600000) / 60000)).padStart(2, "0");
      const s = String(Math.floor((d % 60000) / 1000)).padStart(2, "0");
      setCountdown(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [showResult]);

  const endGame = useCallback((won: boolean, boardSnapshot: any[], index: number) => {
    setStatus(won ? "won" : "lost");
    // Revela as respostas das células não preenchidas
    const reveal = buildRevealMap(boardSnapshot);
    setRevealMap(reveal);
    if (!saved) {
      setSaved(true);
      const ac = boardSnapshot.filter(c => c.filledBy).length;
      recordResult(ac, 16, index + 1);
      // ── EVENTO: JOGO COMPLETO ──
      (window as any).gtag?.('event', 'jogo_completo', {
        jogo: 'bingo',
        acertos: ac,
        total: 16,
        tentativas: index + 1,
      });
      const cellResults = boardSnapshot.map(c => c.filledBy ? "hit" : c.attempted ? "miss" : "empty");
      setTimeout(() => {
        setResultData({ won, acertos: ac, total: 16, tentativas: index + 1, cellResults });
        setShowResult(true);
      }, won ? 600 : 800);
    }
  }, [saved, players]);

  const advanceTurn = useCallback(() => {
    setBoard(prev => {
      const filled = prev.filter(c => c.filledBy).length;
      if (filled === 16) { endGame(true, prev, currentIndex); return prev; }
      return prev;
    });
    setCurrentIndex(prev => {
      const next = prev + 1;
      if (next >= players.length) {
        setBoard(b => { endGame(false, b, prev); return b; });
      }
      return next;
    });
  }, [currentIndex, endGame, players.length]);

  const handleCell = (categoryId: string) => {
    if (status !== "playing" || !currentPlayer) return;
    const cell = board.find(c => c.categoryId === categoryId);
    if (!cell || cell.filledBy) return;
    const correct = currentPlayer.categoryIds.includes(categoryId);
    if (correct) {
      setFeedback({ type: "success", text: `✓ ${currentPlayer.name} - ${getCat(categoryId)?.main}` });
      const nextBoard = board.map(c =>
        c.categoryId === categoryId ? { ...c, filledBy: currentPlayer.id, attempted: true } : c
      );
      setBoard(nextBoard);
      if (nextBoard.filter(c => c.filledBy).length === 16) { endGame(true, nextBoard, currentIndex); return; }
      setCurrentIndex(i => i + 1);
    } else {
      setMistakes(m => m + 1);
      setFeedback({ type: "error", text: `✗ ${currentPlayer.name} nao e "${getCat(categoryId)?.main}"` });
      setBoard(prev => prev.map(c => c.categoryId === categoryId ? { ...c, attempted: true } : c));
      advanceTurn();
    }
  };

  const handleSkip = () => {
    if (status !== "playing" || !currentPlayer) return;
    setFeedback({ type: "skip", text: `${currentPlayer.name} pulado.` });
    advanceTurn();
  };

  // ── BOTÃO COMEÇAR ──
  function startGame() {
    setStatus("playing");
    setTimeLeft(TURN_TIME);
    setFeedback(null);
  }

  const buildShareText = (data: any) => {
    const emojis = data.cellResults.map((r: string) => r === "hit" ? "✅" : "❌");
    const rows: string[] = [];
    for (let i = 0; i < emojis.length; i += 4) rows.push(emojis.slice(i, i + 4).join(""));
    return `🎯 Completei ${data.acertos}/${data.total} categorias no Bingo do Futebol!\nVocê manja mais de futebol que eu?\n${rows.join("\n")}\n👉 ${SITE_URL}`;
  };

  const shareText = resultData ? buildShareText(resultData) : "";
  function shareWhatsApp() {
    (window as any).gtag?.('event', 'compartilhamento', { canal: 'whatsapp', origem: 'bingo' });
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank");
  }
  function shareX() {
    (window as any).gtag?.('event', 'compartilhamento', { canal: 'x', origem: 'bingo' });
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank");
  }
  function shareCopy() {
    (window as any).gtag?.('event', 'compartilhamento', { canal: 'copiar_link', origem: 'bingo' });
    navigator.clipboard?.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const timerPct = (timeLeft / TURN_TIME) * 100;
  const danger = timeLeft <= 3;
  const stats = loadStats();
  const statPct = stats.totalPos > 0 ? Math.round((stats.acertos / stats.totalPos) * 100) : 0;
  const statMedia = stats.jogos > 0 ? (stats.tentativas / stats.jogos).toFixed(1) : 0;

  if (loading) return (
    <div style={{ background: "#FFD700", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "#002776", letterSpacing: 2 }}>Carregando... ⚽</div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@700;800;900&display=swap');
        *{box-sizing:border-box;}
        .fb-root{background:#FFD700;font-family:'Nunito',sans-serif;min-height:100vh;}

        .fb-ad{position:fixed;top:0;width:160px;height:100vh;display:flex;align-items:center;justify-content:center;z-index:50;pointer-events:none;}
        .fb-ad-left{left:0;}
        .fb-ad-right{right:0;}
        .fb-ad-box{width:160px;height:600px;background:rgba(0,39,118,0.08);border:1px dashed rgba(0,39,118,0.25);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;pointer-events:auto;}
        .fb-ad-label{font-size:9px;color:rgba(0,39,118,0.4);font-weight:700;letter-spacing:1px;text-transform:uppercase;}
        .fb-ad-size{font-size:10px;color:rgba(0,39,118,0.3);font-weight:600;}

        .fb-main{padding-left:160px;padding-right:160px;}
        .fb-center{max-width:700px;margin:0 auto;}

        .fb-header{background:#002776;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;}
        .fb-logo{font-family:'Bebas Neue',sans-serif;font-size:28px;color:#FFD700;letter-spacing:2px;text-decoration:none;}
        .fb-subtitle{font-size:10px;color:#9EC8FF;letter-spacing:2px;text-transform:uppercase;}
        .fb-stats-btn{background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);border-radius:8px;padding:8px 14px;color:#FFD700;font-family:'Nunito',sans-serif;font-weight:800;font-size:13px;cursor:pointer;}
        .fb-nav{background:#001a55;padding:8px 12px;display:flex;gap:8px;}
        .fb-nav-btn{flex:1;text-decoration:none;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.2);color:#FFD700;font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:1px;padding:7px 8px;border-radius:8px;text-align:center;display:flex;align-items:center;justify-content:center;gap:5px;}
        .fb-datebar{background:#009C3B;padding:7px 20px;display:flex;align-items:center;justify-content:center;gap:16px;}
        .fb-datebar span{color:#fff;font-weight:800;font-size:13px;letter-spacing:1px;}
        .fb-datenav{width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,0.2);border:none;color:#fff;font-size:15px;cursor:pointer;font-weight:800;}
        .fb-datenav:disabled{opacity:0.3;cursor:default;}
        .fb-body{padding:12px 16px;}

        .fb-start-card{background:#002776;border-radius:16px;padding:28px 20px;text-align:center;margin-bottom:10px;}
        .fb-start-title{font-family:'Bebas Neue',sans-serif;font-size:30px;color:#FFD700;letter-spacing:1px;line-height:1.05;margin-bottom:8px;}
        .fb-start-desc{font-size:13px;color:#9EC8FF;font-weight:700;margin-bottom:18px;line-height:1.4;}
        .fb-start-btn{background:#009C3B;border:none;color:#fff;border-radius:12px;padding:14px 40px;font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:2px;cursor:pointer;}

        .fb-player-card{background:#002776;border-radius:16px;padding:14px 16px;margin-bottom:10px;}
        .fb-player-label{font-size:10px;color:#9EC8FF;letter-spacing:1px;text-transform:uppercase;font-weight:800;margin-bottom:6px;}
        .fb-player-row{display:flex;align-items:center;justify-content:space-between;gap:10px;}
        .fb-player-name{font-family:'Bebas Neue',sans-serif;font-size:32px;color:#fff;letter-spacing:1px;line-height:1;}
        .fb-player-pos{font-size:12px;color:#9EC8FF;font-weight:700;margin-top:2px;}
        .fb-right{display:flex;align-items:center;gap:10px;flex-shrink:0;}
        .fb-timer-num{font-family:'Bebas Neue',sans-serif;font-size:30px;color:#FFD700;}
        .fb-timer-num.danger{color:#CC0000;}
        .fb-btn-skip{background:#FFD700;border:none;color:#002776;border-radius:8px;padding:8px 16px;font-family:'Nunito',sans-serif;font-weight:800;font-size:13px;cursor:pointer;}
        .fb-timer-bar{height:4px;background:rgba(255,255,255,0.2);border-radius:99px;margin-top:10px;overflow:hidden;}
        .fb-timer-fill{height:100%;border-radius:99px;transition:width 1s linear,background 0.3s;}
        .fb-feedback{border-radius:12px;padding:10px 13px;font-size:12px;font-weight:800;margin-bottom:8px;color:#fff;}
        .fb-feedback.success{background:#009C3B;}
        .fb-feedback.error{background:#CC0000;}
        .fb-feedback.skip{background:#B8860B;}
        .fb-feedback.timeout{background:#CC0000;}
        .fb-feedback.neutral{background:#002776;color:#9EC8FF;}
        .fb-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:10px;}
        .fb-cell{background:#FFD700;border-radius:20px;border:4px solid #002776;padding:12px 8px;min-height:96px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;width:100%;transition:background 0.15s;}
        .fb-cell:hover:not(:disabled){background:#FFE033;}
        .fb-cell:disabled:not(.filled):not(.revealed){cursor:default;opacity:0.65;}
        .fb-cell.filled{background:#009C3B!important;border:4px solid #006828!important;cursor:default;}
        .fb-cell.revealed{background:#CC0000!important;border:4px solid #800000!important;cursor:default;opacity:1;}
        .fb-cell-pre{font-size:9px;font-weight:900;color:#002776;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px;}
        .fb-cell-main{font-family:'Bebas Neue',sans-serif;font-size:18px;color:#002776;letter-spacing:0.5px;line-height:1.15;}
        .fb-cell.filled .fb-cell-pre,.fb-cell.revealed .fb-cell-pre{color:rgba(255,255,255,0.8);}
        .fb-cell.filled .fb-cell-main,.fb-cell.revealed .fb-cell-main{color:#FFD700;font-size:14px;}
        .fb-cell.revealed .fb-cell-main{color:#fff;}
        .fb-cell-player{font-family:'Bebas Neue',sans-serif;font-size:22px;color:#fff;margin-top:4px;letter-spacing:0.5px;line-height:1.1;}
        .fb-statsbar{display:flex;gap:7px;margin-top:2px;}
        .fb-stat{background:#002776;border-radius:12px;padding:8px 4px;color:#fff;font-size:10px;font-weight:800;text-align:center;flex:1;}
        .fb-stat span{display:block;font-family:'Bebas Neue',sans-serif;font-size:22px;color:#FFD700;}
        .fb-result-box{background:#002776;border-radius:16px;padding:28px;text-align:center;margin-bottom:10px;}
        .fb-result-title{font-family:'Bebas Neue',sans-serif;font-size:40px;color:#FFD700;letter-spacing:2px;}
        .fb-result-sub{color:#9EC8FF;font-size:13px;font-weight:700;margin-top:6px;}
        .fb-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;}
        .fb-modal{background:#002776;border:3px solid #FFD700;border-radius:16px;padding:24px 20px;width:100%;max-width:400px;max-height:90vh;overflow-y:auto;}
        .fb-modal-title{font-family:'Bebas Neue',sans-serif;font-size:32px;color:#FFD700;letter-spacing:2px;margin-bottom:16px;text-align:center;}
        .fb-modal-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;}
        .fb-modal-stat{background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);border-radius:10px;padding:12px 6px;text-align:center;}
        .fb-modal-stat-val{font-family:'Bebas Neue',sans-serif;font-size:30px;color:#FFD700;line-height:1;}
        .fb-modal-stat-lbl{font-size:10px;color:#9EC8FF;font-weight:800;text-transform:uppercase;margin-top:4px;}
        .fb-streak{background:#009C3B;border-radius:10px;padding:12px;text-align:center;color:#fff;font-weight:900;font-size:14px;margin-bottom:16px;}
        .fb-modal-close{width:100%;background:transparent;border:1px solid rgba(255,215,0,0.3);border-radius:8px;color:#FFD700;font-family:'Nunito',sans-serif;font-weight:800;font-size:13px;padding:10px;cursor:pointer;margin-top:8px;}
        .res-score{font-family:'Bebas Neue',sans-serif;font-size:56px;color:#fff;line-height:1;text-align:center;margin:8px 0;}
        .res-sub{font-size:12px;color:#9EC8FF;font-weight:700;text-align:center;margin-bottom:14px;}
        .res-emojis{font-size:18px;line-height:1.8;text-align:center;background:rgba(255,255,255,0.05);border-radius:10px;padding:10px;margin-bottom:14px;}
        .res-cd-lbl{font-size:10px;color:#9EC8FF;font-weight:800;text-transform:uppercase;letter-spacing:1px;text-align:center;margin-bottom:4px;}
        .res-cd{font-family:'Bebas Neue',sans-serif;font-size:28px;color:#FFD700;text-align:center;margin-bottom:16px;}
        .res-share-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px;}
        .res-share-btn{border:none;border-radius:10px;padding:10px 6px;font-family:'Nunito',sans-serif;font-weight:800;font-size:12px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;gap:6px;}
        .fb-footer{padding:20px 14px 30px;text-align:center;}
        .fb-social{display:flex;justify-content:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;}
        .fb-social-btn{color:white;font-weight:800;font-size:12px;padding:8px 14px;border-radius:10px;cursor:pointer;font-family:'Nunito',sans-serif;border:none;text-decoration:none;}
        .fb-kofi{display:block;background:#FF5E5B;color:white;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:1px;padding:12px;border-radius:10px;text-align:center;margin-bottom:10px;text-decoration:none;}
        .fb-copyright{text-align:center;font-size:10px;color:#003a99;font-weight:700;}

        /* ── MOBILE ── */
        @media (max-width: 1080px) {
          .fb-ad{display:none;}
          .fb-main{padding-left:0;padding-right:0;}
        }
        @media (max-width: 560px) {
          .fb-player-name{font-size:24px;}
          .fb-grid{gap:5px;}
          .fb-cell{min-height:78px;border-width:3px;padding:8px 4px;border-radius:14px;}
          .fb-cell-main{font-size:13px;}
          .fb-cell.filled .fb-cell-main,.fb-cell.revealed .fb-cell-main{font-size:11px;}
          .fb-cell-pre{font-size:7px;}
          .fb-cell-player{font-size:14px;}
          .fb-stat span{font-size:18px;}
          .fb-stat{font-size:9px;}
          .res-share-grid{grid-template-columns:1fr 1fr;}
        }
      `}</style>

      <div className="fb-root">

        {/* ANÚNCIOS FIXOS */}
        <div className="fb-ad fb-ad-left"><div className="fb-ad-box"><div className="fb-ad-label">Anuncio</div><div className="fb-ad-size">160x600</div></div></div>
        <div className="fb-ad fb-ad-right"><div className="fb-ad-box"><div className="fb-ad-label">Anuncio</div><div className="fb-ad-size">160x600</div></div></div>

        <div className="fb-main">
          <div className="fb-center">
            <div className="fb-header">
              <div>
                <a href="/" className="fb-logo">Bingo do Futebol</a>
                <div className="fb-subtitle">Desafio Diario de Futebol</div>
              </div>
              <button className="fb-stats-btn" onClick={() => setShowStats(true)}>Estatisticas</button>
            </div>

            <div className="fb-nav">
              {NAV_JOGOS.map(j => (
                <a key={j.href} href={j.href} className="fb-nav-btn">
                  <span>{j.emoji}</span><span>{j.nome}</span>
                </a>
              ))}
            </div>

            {/* DATE BAR — sem navegação (rotação é fixa por data, sem futuras) */}
            <div className="fb-datebar">
              <span>RODADA · {TODAY}</span>
            </div>

            <div className="fb-body">

              {/* ── TELA INICIAL COM BOTÃO COMEÇAR ── */}
              {status === "idle" && (
                <div className="fb-start-card">
                  <div className="fb-start-title">Bingo do Futebol</div>
                  <div className="fb-start-desc">
                    Você terá {TURN_TIME} segundos por jogador.<br/>
                    Associe cada jogador a uma categoria correta.<br/>
                    Complete as 16 células para vencer!
                  </div>
                  <button className="fb-start-btn" onClick={startGame}>▶ COMEÇAR</button>
                </div>
              )}

              {status === "playing" && currentPlayer && (
                <div className="fb-player-card">
                  <div className="fb-player-label">Jogador atual · {remaining} restantes</div>
                  <div className="fb-player-row">
                    <div>
                      <div className="fb-player-name">{currentPlayer.name}</div>
                      <div className="fb-player-pos">{currentPlayer.position}</div>
                    </div>
                    <div className="fb-right">
                      <div className={`fb-timer-num${danger ? " danger" : ""}`}>{timeLeft}s</div>
                      <button className="fb-btn-skip" onClick={handleSkip}>Pular</button>
                    </div>
                  </div>
                  <div className="fb-timer-bar">
                    <div className="fb-timer-fill" style={{ width: `${timerPct}%`, background: danger ? "#CC0000" : timeLeft <= 6 ? "#FFD700" : "#fff" }} />
                  </div>
                </div>
              )}

              {(status === "won" || status === "lost") && (
                <div className="fb-result-box">
                  <div className="fb-result-title">{status === "won" ? "VITORIA!" : "FIM DE JOGO"}</div>
                  <div className="fb-result-sub">{status === "won" ? `Cartela completa · ${mistakes} erro(s)` : `Voce preencheu ${filledCount} de 16 celulas`}</div>
                </div>
              )}

              {status === "playing" && (
                <div className={`fb-feedback ${feedback?.type ?? "neutral"}`}>
                  {feedback?.text ?? "Clique numa categoria para o jogador atual."}
                </div>
              )}

              <div className="fb-grid">
                {board.map(cell => {
                  const cat = getCat(cell.categoryId);
                  const fp = cell.filledBy ? getPlayer(cell.filledBy) : null;
                  const revealedName = !fp && (status === "won" || status === "lost") ? revealMap[cell.categoryId] : null;
                  return (
                    <button
                      key={cell.categoryId}
                      className={`fb-cell${fp ? " filled" : revealedName ? " revealed" : ""}`}
                      disabled={!!fp || status !== "playing"}
                      onClick={() => handleCell(cell.categoryId)}
                    >
                      <div className="fb-cell-pre">{cat?.pre}</div>
                      <div className="fb-cell-main">{cat?.main}</div>
                      {fp && <div className="fb-cell-player">{fp.name}</div>}
                      {revealedName && <div className="fb-cell-player">{revealedName}</div>}
                    </button>
                  );
                })}
              </div>

              <div className="fb-statsbar">
                <div className="fb-stat"><span>{filledCount}/16</span>celulas</div>
                <div className="fb-stat"><span>{mistakes}</span>erros</div>
                <div className="fb-stat"><span>{Math.round((filledCount / 16) * 100)}%</span>progresso</div>
                <div className="fb-stat"><span>{remaining}</span>restantes</div>
              </div>

            </div>

            <div className="fb-footer">
              {SHOW_SOCIAL && (
                <>
                  <div style={{ fontSize: 11, color: "#003a99", fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Siga a gente</div>
                  <div className="fb-social">
                    {SOCIAL_LINKS.map(({ label, bg, url }) => (
                      <a key={label} href={url} target="_blank" rel="noreferrer" className="fb-social-btn" style={{ background: bg }}>{label}</a>
                    ))}
                  </div>
                </>
              )}
              <a href={KOFI_URL} target="_blank" rel="noreferrer" className="fb-kofi">☕ Apoie o FutJogos no Ko-fi</a>
              <div className="fb-copyright">© 2026 FutJogos · futjogos.com.br</div>
            </div>
          </div>
        </div>
      </div>

      {showStats && (
        <div className="fb-overlay" onClick={e => e.target === e.currentTarget && setShowStats(false)}>
          <div className="fb-modal">
            <div className="fb-modal-title">Estatisticas</div>
            {stats.streak > 0 && <div className="fb-streak">{stats.streak} dia(s) consecutivo(s)!</div>}
            <div className="fb-modal-grid">
              {[{ val: stats.jogos, lbl: "Jogos" }, { val: `${statPct}%`, lbl: "Acertos" }, { val: stats.streak, lbl: "Streak" }, { val: statMedia, lbl: "Media" }].map(({ val, lbl }) => (
                <div key={lbl} className="fb-modal-stat">
                  <div className="fb-modal-stat-val">{val}</div>
                  <div className="fb-modal-stat-lbl">{lbl}</div>
                </div>
              ))}
            </div>
            <button className="fb-modal-close" onClick={() => setShowStats(false)}>Fechar</button>
          </div>
        </div>
      )}

      {showResult && resultData && (
        <div className="fb-overlay" onClick={e => e.target === e.currentTarget && setShowResult(false)}>
          <div className="fb-modal">
            <div className="fb-modal-title">{resultData.won && resultData.acertos === resultData.total ? "Perfeito!" : "Desafio Encerrado"}</div>
            <div className="res-score">{resultData.acertos}/{resultData.total}</div>
            <div className="res-sub">{resultData.tentativas} tentativas · Desafio {TODAY}</div>
            <div className="res-emojis">
              {Array.from({ length: Math.ceil(resultData.cellResults.length / 4) }, (_, i) =>
                <div key={i}>{resultData.cellResults.slice(i * 4, i * 4 + 4).map((r: string, j: number) => (
                  <span key={j}>{r === "hit" ? "✅" : "❌"}</span>
                ))}</div>
              )}
            </div>
            <div className="res-cd-lbl">Proximo desafio em</div>
            <div className="res-cd">{countdown}</div>
            <div className="res-share-grid">
              <button className="res-share-btn" style={{ background: "#25D366" }} onClick={shareWhatsApp}>WhatsApp</button>
              <button className="res-share-btn" style={{ background: "#000" }} onClick={shareX}>X / Twitter</button>
              <button className="res-share-btn" style={{ background: "#555" }} onClick={shareCopy}>{copied ? "✓ Copiado!" : "Copiar"}</button>
            </div>
            <button className="fb-modal-close" onClick={() => setShowResult(false)}>Fechar</button>
          </div>
        </div>
      )}
    </>
  );
}

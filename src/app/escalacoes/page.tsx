"use client";
import { useEffect, useCallback, useState, useRef } from "react";

const CSV_JOGOS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMGf38fV6wwEdb-U2q_1hE8PwydH-WaSScFTBjW9BL1FBWw6sPQ8eNlx0lu9Q4I85qggrGJKcBzan5/pub?gid=605040019&single=true&output=csv";
const CSV_JOGADORES = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMGf38fV6wwEdb-U2q_1hE8PwydH-WaSScFTBjW9BL1FBWw6sPQ8eNlx0lu9Q4I85qggrGJKcBzan5/pub?gid=2003933001&single=true&output=csv";
const CSV_CONFIG = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMGf38fV6wwEdb-U2q_1hE8PwydH-WaSScFTBjW9BL1FBWw6sPQ8eNlx0lu9Q4I85qggrGJKcBzan5/pub?gid=2018787597&single=true&output=csv";

const MAX_ATTEMPTS = 5;
const STORAGE_KEY = "futescalacao_v3";
const STATS_KEY = "futescalacao_stats_v1";

const KOFI_URL = "https://ko-fi.com/futjogos";
const SITE_URL = "https://futjogos.com.br";

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
  { href: "/bingo", emoji: "🎯", nome: "Bingo" },
];

const KEYBOARD_ROWS = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["DEL","Z","X","C","V","B","N","M","OK"],
];

const POS_XY: Record<string, {x:number, y:number}> = {
  GOL: {x:50,y:85}, LB: {x:50,y:75},
  LE:  {x:8, y:63}, ZE:  {x:28,y:63}, ZC:  {x:50,y:63}, ZD:  {x:72,y:63}, LD:  {x:92,y:63},
  ALE: {x:8, y:52}, VE:  {x:28,y:52}, VC:  {x:50,y:52}, VD:  {x:72,y:52}, ALD: {x:92,y:52},
  ME:  {x:8, y:42}, MCE: {x:28,y:42}, MCC: {x:50,y:42}, MCD: {x:72,y:42}, MD:  {x:92,y:42},
  MOE: {x:28,y:32}, MOC: {x:50,y:32}, MOD: {x:72,y:32},
  SE:  {x:28,y:22}, SC:  {x:50,y:22}, SD:  {x:72,y:22},
  AE:  {x:28,y:12}, AC:  {x:50,y:12}, AD:  {x:72,y:12},
  PE:  {x:8, y:22}, PD:  {x:92,y:22},
};

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

function normalize(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z ]/g,"").replace(/\s+/g," ").trim();
}
function getLettersOnly(answer: string) { return normalize(answer).replace(/ /g,""); }
function getWordLengths(answer: string) { return normalize(answer).split(" ").map(w => w.length); }

function evaluateGuess(guess: string, answer: string) {
  const target = getLettersOnly(answer);
  const input = getLettersOnly(guess);
  const result = Array(target.length).fill("absent");
  const remaining: Record<string,number> = {};
  for(let i=0;i<target.length;i++){
    if(input[i]===target[i]) result[i]="correct";
    else remaining[target[i]]=(remaining[target[i]]||0)+1;
  }
  for(let i=0;i<target.length;i++){
    if(result[i]==="correct") continue;
    const ch=input[i];
    if(ch&&remaining[ch]>0){result[i]="present";remaining[ch]--;}
  }
  return result;
}

function buildKeyStatuses(attempts: any[], answer: string) {
  const map: Record<string,string> = {};
  for(const att of attempts){
    const letters=getLettersOnly(att.value).split("");
    att.statuses.forEach((st:string,i:number)=>{
      const ch=letters[i]; if(!ch) return;
      const prev=map[ch];
      if(st==="correct") map[ch]="correct";
      else if(st==="present"&&prev!=="correct") map[ch]="present";
      else if(st==="absent"&&!prev) map[ch]="absent";
    });
  }
  return map;
}

function getToday() { return new Date().toISOString().split("T")[0]; }

function loadSavedStates() {
  if(typeof window==="undefined") return {};
  try{const r=localStorage.getItem(STORAGE_KEY);return r?JSON.parse(r):{};}catch{return {};}
}
function saveStates(id:string,states:any){
  if(typeof window==="undefined") return;
  try{const all=loadSavedStates();all[id]=states;localStorage.setItem(STORAGE_KEY,JSON.stringify(all));}catch{}
}
function loadStats(){
  if(typeof window==="undefined") return {played:0,totalSolved:0,totalAttempts:0,streak:0,lastPlayedDate:null};
  try{const r=localStorage.getItem(STATS_KEY);return r?JSON.parse(r):{played:0,totalSolved:0,totalAttempts:0,streak:0,lastPlayedDate:null};}
  catch{return {played:0,totalSolved:0,totalAttempts:0,streak:0,lastPlayedDate:null};}
}
function saveStatsFn(s:any){
  if(typeof window==="undefined") return;
  try{localStorage.setItem(STATS_KEY,JSON.stringify(s));}catch{}
}

interface ChallengePlayer{id:string;position:string;shirt:number;answer:string;x:number;y:number;collarColor:string;}
interface Challenge{id:string;date:string;title:string;subtitle:string;team:string;formation:string;shirtColors:{body:string;sleeve:string;};players:ChallengePlayer[];}

function PlayerTile({player,state,isSelected,shirtColors,onClick}:{player:ChallengePlayer;state:any;isSelected:boolean;shirtColors:any;onClick:()=>void}){
  const solved=state?.solved||false;
  const failed=state?.failed||false;
  const totalLetters=getLettersOnly(player.answer).length;

  return(
    <div onClick={onClick} style={{position:"absolute",left:`${player.x}%`,top:`${player.y}%`,transform:"translate(-50%,-50%)",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:1,zIndex:10,userSelect:"none"}}>
      <div style={{width:32,height:38,filter:isSelected&&!solved&&!failed?"drop-shadow(0 0 5px #FFD700)":"none",transition:"filter 0.2s"}}>
        <svg viewBox="0 0 36 42" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="38">
          <path d="M18 2 L34 10 L34 32 Q18 42 2 32 L2 10 Z"
            fill={solved?"#009C3B":failed?"#5a0000":shirtColors.body}
            stroke={isSelected&&!solved&&!failed?"#FFD700":solved?"#FFD700":"rgba(0,0,0,0.4)"}
            strokeWidth={isSelected||solved?"2":"1"}/>
          <path d="M2 10 L8 14 L8 32 Q5 31 2 29 Z" fill={solved?"#007A2F":failed?"#400000":shirtColors.sleeve}/>
          <path d="M34 10 L28 14 L28 32 Q31 31 34 29 Z" fill={solved?"#007A2F":failed?"#400000":shirtColors.sleeve}/>
          <path d="M12 2 Q18 6 24 2" fill="none" stroke={player.collarColor||"rgba(0,0,0,0.3)"} strokeWidth="3"/>
          <text x="18" y="26" textAnchor="middle" fill={player.collarColor||"#fff"} fontSize="11" fontWeight="bold" fontFamily="Arial">{player.shirt}</text>
        </svg>
      </div>

      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1,marginTop:1}}>
        {solved ? (
          <div style={{fontSize:8,color:"#FFD700",fontWeight:900,fontFamily:"Bebas Neue,sans-serif",letterSpacing:0.5,textShadow:"0 1px 3px rgba(0,0,0,0.8)",whiteSpace:"nowrap",maxWidth:64,overflow:"hidden",textOverflow:"ellipsis",textAlign:"center"}}>
            {normalize(player.answer).toUpperCase()}
          </div>
        ) : failed ? (
          <div style={{fontSize:8,color:"#ff8888",fontWeight:800,fontFamily:"Bebas Neue,sans-serif",letterSpacing:0.5,textShadow:"0 1px 3px rgba(0,0,0,0.8)",whiteSpace:"nowrap",maxWidth:64,overflow:"hidden",textOverflow:"ellipsis",textAlign:"center"}}>
            {normalize(player.answer).toUpperCase()}
          </div>
        ) : (
          <div style={{display:"flex",gap:2,justifyContent:"center",flexWrap:"wrap",maxWidth:60}}>
            {Array.from({length: totalLetters}).map((_,li)=>(
              <div key={li} style={{width:3,height:3,background:"rgba(255,255,255,0.9)",borderRadius:"50%",flexShrink:0}}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GuessGrid({answer,attempts,currentInput}:{answer:string;attempts:any[];currentInput:string}){
  const wordLengths=getWordLengths(answer);
  const rows=[];
  for(let r=0;r<MAX_ATTEMPTS;r++){
    const att=attempts[r];
    const isCurrentRow=!att&&r===attempts.length;
    const letters=att?getLettersOnly(att.value).split(""):isCurrentRow?currentInput.split(""):[];
    const statuses=att?att.statuses:[];
    const cells=[];
    let ci=0;
    for(let w=0;w<wordLengths.length;w++){
      if(w>0) cells.push(<div key={`sp-${r}-${w}`} style={{width:5}}/>);
      for(let l=0;l<wordLengths[w];l++){
        const ch=letters[ci]||"";const st=statuses[ci]||"";
        const bg=st==="correct"?"#009C3B":st==="present"?"#B8860B":st==="absent"?"#1e293b":"rgba(255,255,255,0.08)";
        cells.push(
          <div key={`${r}-${w}-${l}`} style={{width:22,height:22,borderRadius:3,background:bg,border:`1px solid ${st?"transparent":"rgba(255,215,0,0.25)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"white",fontFamily:"Arial",textTransform:"uppercase"}}>
            {ch}
          </div>
        );
        ci++;
      }
    }
    rows.push(<div key={r} style={{display:"flex",alignItems:"center",gap:2,justifyContent:"center"}}>{cells}</div>);
  }
  return <div style={{display:"flex",flexDirection:"column",gap:3}}>{rows}</div>;
}

function VirtualKeyboard({onKey,keyStatuses,disabled}:{onKey:(k:string)=>void;keyStatuses:Record<string,string>;disabled:boolean}){
  return(
    <div className="esc-kb" style={{display:"flex",flexDirection:"column",gap:4}}>
      {KEYBOARD_ROWS.map((row,ri)=>(
        <div key={ri} style={{display:"flex",gap:3,justifyContent:"center"}}>
          {row.map(k=>{
            const st=keyStatuses[k.toLowerCase()]||"";
            const bg=k==="OK"?"#009C3B":k==="DEL"?"#CC0000":st==="correct"?"#009C3B":st==="present"?"#B8860B":st==="absent"?"#1e293b":"rgba(255,255,255,0.12)";
            const isWide=k==="OK"||k==="DEL";
            return(
              <button key={k} className={`esc-key${isWide?" esc-key-wide":""}`} onClick={()=>!disabled&&onKey(k)} disabled={disabled}
                style={{background:bg,border:"none",borderRadius:4,color:"white",fontWeight:800,cursor:disabled?"default":"pointer",fontFamily:"Arial",opacity:disabled?0.4:1,transition:"background 0.15s"}}>
                {k}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Toast({message,type}:{message:string;type:string}){
  if(!message) return null;
  const bg=type==="error"?"#CC0000":type==="success"?"#009C3B":"#002776";
  return(
    <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:bg,color:"white",padding:"10px 20px",borderRadius:8,fontWeight:700,fontSize:13,zIndex:9999,whiteSpace:"nowrap",fontFamily:"Nunito,sans-serif",boxShadow:"0 4px 12px rgba(0,0,0,0.4)"}}>
      {message}
    </div>
  );
}

function StatsModal({challenge,playerStates,solvedCount,totalAttempts,finished,onClose}:{challenge:Challenge;playerStates:any;solvedCount:number;totalAttempts:number;finished:boolean;onClose:()=>void}){
  const stats=loadStats();
  const [copied,setCopied]=useState(false);
  const avgSolved=stats.played>0?(stats.totalSolved/stats.played).toFixed(1):"-";
  const avgAttempts=stats.played>0?(stats.totalAttempts/stats.played).toFixed(1):"-";

  // ── TEXTO OPÇÃO A — com https:// para virar link clicável ──
  const shareText=`⚽ Acertei ${solvedCount}/${challenge.players.length} na escalação do ${challenge.title}.\nAposto que você não chega perto. 👇\n${SITE_URL}/escalacoes`;

  function shareWhatsApp(){window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`,"_blank");}
  function shareX(){window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,"_blank");}
  function shareCopy(){
    navigator.clipboard?.writeText(shareText).then(()=>{
      setCopied(true);
      setTimeout(()=>setCopied(false),2000);
    });
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#002776",border:"3px solid #FFD700",borderRadius:16,padding:"24px 20px",maxWidth:380,width:"100%",textAlign:"center",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{fontFamily:"Bebas Neue,sans-serif",fontSize:28,color:"#FFD700",letterSpacing:2,marginBottom:12}}>{finished?"Resultado":"Estatisticas"}</div>
        {finished&&(
          <>
            <div style={{fontFamily:"Bebas Neue,sans-serif",fontSize:52,color:"white",lineHeight:1}}>{solvedCount}/{challenge.players.length}</div>
            <div style={{fontSize:12,color:"#9EC8FF",fontWeight:700,margin:"6px 0 16px"}}>{totalAttempts} tentativas · {challenge.title}</div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
              <button onClick={shareWhatsApp} style={{background:"#25D366",color:"white",border:"none",padding:10,borderRadius:10,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>WhatsApp</button>
              <button onClick={shareX} style={{background:"#000",color:"white",border:"none",padding:10,borderRadius:10,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>X / Twitter</button>
              <button onClick={shareCopy} style={{background:"#555",color:"white",border:"none",padding:10,borderRadius:10,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"Nunito,sans-serif"}}>{copied?"✓ Copiado!":"Copiar"}</button>
            </div>

            {/* GABARITO */}
            <div style={{background:"rgba(255,215,0,0.06)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:10,padding:"10px 12px",marginBottom:16,textAlign:"left"}}>
              <div style={{fontSize:10,color:"rgba(255,215,0,0.7)",fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:8,textAlign:"center"}}>Escalação completa</div>
              {challenge.players.map(p=>{
                const st=playerStates[p.id]||{};
                const ok=st.solved===true;
                return(
                  <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"3px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                    <span style={{fontSize:11,width:16,textAlign:"center"}}>{ok?"✅":"❌"}</span>
                    <span style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:700,width:30}}>{p.position}</span>
                    <span style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:700,width:18,textAlign:"center"}}>{p.shirt}</span>
                    <span style={{fontSize:12,color:ok?"#4ade80":"#ff8888",fontWeight:800,fontFamily:"Nunito,sans-serif"}}>{p.answer}</span>
                  </div>
                );
              })}
            </div>

            <div style={{borderTop:"1px solid rgba(255,215,0,0.2)",paddingTop:14,marginBottom:12}}/>
          </>
        )}
        {stats.streak>0&&<div style={{background:"#009C3B",borderRadius:10,padding:"8px 12px",color:"white",fontWeight:900,fontSize:13,marginBottom:12}}>🔥 {stats.streak} dia(s) consecutivo(s)!</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          {[{val:stats.played,lbl:"Jogos"},{val:avgSolved,lbl:"Media acertos"},{val:avgAttempts,lbl:"Media tent."},{val:stats.streak,lbl:"Streak"}].map(({val,lbl})=>(
            <div key={lbl} style={{background:"rgba(255,215,0,0.08)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:10,padding:"10px 6px"}}>
              <div style={{fontFamily:"Bebas Neue,sans-serif",fontSize:28,color:"#FFD700",lineHeight:1}}>{val}</div>
              <div style={{fontSize:10,color:"#9EC8FF",fontWeight:800,textTransform:"uppercase",marginTop:4}}>{lbl}</div>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{background:"transparent",border:"1px solid rgba(255,215,0,0.3)",borderRadius:8,padding:"10px 24px",color:"#FFD700",fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:13,cursor:"pointer",width:"100%"}}>Fechar</button>
      </div>
    </div>
  );
}

export default function FutEscalacao(){
  const [challenges,setChallenges]=useState<Challenge[]>([]);
  const [loading,setLoading]=useState(true);
  const [selectedDate,setSelectedDate]=useState("");
  const [playerStates,setPlayerStates]=useState<Record<string,any>>({});
  const [selectedId,setSelectedId]=useState("");
  const [inputLetters,setInputLetters]=useState<string[]>([]);
  const [toast,setToast]=useState({message:"",type:""});
  const [showStats,setShowStats]=useState(false);
  const toastTimer=useRef<any>(null);
  const today=getToday();

  function showToast(msg:string,type:string){
    setToast({message:msg,type});
    if(toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current=setTimeout(()=>setToast({message:"",type:""}),2200);
  }

  useEffect(()=>{
    Promise.all([
      fetch(CSV_JOGOS,{redirect:"follow"}).then(r=>r.text()),
      fetch(CSV_JOGADORES,{redirect:"follow"}).then(r=>r.text()),
      fetch(CSV_CONFIG,{redirect:"follow"}).then(r=>r.text()),
    ]).then(([jogosText,jogadoresText,configText])=>{
      const cmap:Record<string,string>={};
      configText.trim().split("\n").filter(l=>l.trim()).slice(1).forEach(line=>{
        const cols=parseCSVLine(line);
        const nome=cols[4]?.trim().replace(/\r/g,"");
        const hex=cols[5]?.trim().replace("#","").replace(/[^a-fA-F0-9]/g,"");
        if(nome&&hex) cmap[nome]=`#${hex}`;
      });
      const jogosMap:Record<string,any>={};
      jogosText.trim().split("\n").filter(l=>l.trim()).slice(1).forEach(line=>{
        const cols=parseCSVLine(line);
        const code=cols[0]?.trim().replace(/\r/g,"");
        if(!code) return;
        jogosMap[code]={id:code,date:cols[1]?.trim().replace(/\r/g,"")||"",title:cols[2]?.trim()||"",subtitle:cols[3]?.trim()||"",team:cols[4]?.trim()||"",formation:cols[5]?.trim()||"",corCamisa:cols[6]?.trim().replace(/\r/g,"")||"branco",corMangaGola:cols[7]?.trim().replace(/\r/g,"")||"branco",players:[]};
      });
      jogadoresText.trim().split("\n").filter(l=>l.trim()).slice(1).forEach(line=>{
        const cols=parseCSVLine(line);
        const code=cols[0]?.trim().replace(/\r/g,"");
        if(!code||!jogosMap[code]) return;
        const pos=cols[1]?.trim().replace(/\r/g,"")||"";
        const posXY=POS_XY[pos];
        const x=posXY?posXY.x:parseFloat(cols[4])||50;
        const y=posXY?posXY.y:parseFloat(cols[5])||50;
        jogosMap[code].players.push({id:`${code}_${pos}_${cols[2]?.trim()}`,position:pos,shirt:parseInt(cols[2])||0,answer:cols[3]?.trim().replace(/\r/g,"")||"",x,y,collarColor:""});
      });
      const allChallenges:Challenge[]=Object.values(jogosMap).map((j:any)=>{
        const body=cmap[j.corCamisa]||"#FFFFFF";
        const sleeve=cmap[j.corMangaGola]||"#FFFFFF";
        return{...j,shirtColors:{body,sleeve},players:j.players.map((p:any)=>({...p,collarColor:sleeve}))};
      }).filter((c:Challenge)=>c.players.length>0);
      allChallenges.sort((a,b)=>a.date.localeCompare(b.date));
      setChallenges(allChallenges);
      const pastAndToday=allChallenges.filter(c=>c.date<=today);
      const selected=pastAndToday.length>0?pastAndToday[pastAndToday.length-1]:null;
      if(selected) setSelectedDate(selected.date);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  const challenge=challenges.find(c=>c.date===selectedDate);

  useEffect(()=>{
    if(!challenge) return;
    const saved=loadSavedStates()[challenge.id];
    if(saved){setPlayerStates(saved);}
    else{
      const obj:Record<string,any>={};
      challenge.players.forEach(p=>{obj[p.id]={attempts:[],solved:false,failed:false};});
      setPlayerStates(obj);
    }
    setSelectedId(challenge.players[0]?.id||"");
    setInputLetters([]);
  },[challenge?.id]);

  const selectedPlayer=challenge?.players.find(p=>p.id===selectedId)||challenge?.players[0];
  const selectedState=selectedPlayer?playerStates[selectedPlayer.id]||{attempts:[],solved:false,failed:false}:{attempts:[],solved:false,failed:false};
  const solvedCount=Object.values(playerStates).filter((s:any)=>s.solved).length;
  const totalAttempts=Object.values(playerStates).reduce((sum:number,s:any)=>sum+(s.attempts?.length||0),0);
  const finished=challenge && Object.keys(playerStates).length>0
  ? Object.values(playerStates).every((s:any)=>s.solved||s.failed)
  : false;
  const inputAsString=inputLetters.join("");
  const keyStatuses=selectedPlayer?buildKeyStatuses(selectedState.attempts,selectedPlayer.answer):{};

  useEffect(()=>{
    if(!finished||!challenge) return;
    const stats=loadStats();
    if(stats.lastPlayedDate!==challenge.date){
      stats.played++;stats.totalSolved+=solvedCount;stats.totalAttempts+=totalAttempts;
      const yesterday=new Date(today);yesterday.setDate(yesterday.getDate()-1);
      const yStr=yesterday.toISOString().split("T")[0];
      if(stats.lastPlayedDate===yStr) stats.streak++;
      else if(stats.lastPlayedDate!==today) stats.streak=1;
      stats.lastPlayedDate=challenge.date;
      saveStatsFn(stats);
      setTimeout(()=>setShowStats(true),800);
    }
  },[finished]);

  // ── FINALIZAR E VER RESULTADO ──
  function finalizarJogo(){
    if(!challenge||finished) return;
    if(!confirm("Finalizar o jogo? As respostas que faltam serão reveladas.")) return;
    const newStates={...playerStates};
    challenge.players.forEach(p=>{
      const st=newStates[p.id]||{attempts:[],solved:false,failed:false};
      if(!st.solved&&!st.failed){
        newStates[p.id]={...st,failed:true};
      }
    });
    setPlayerStates(newStates);
    saveStates(challenge.id,newStates);
    setInputLetters([]);
    // modal abre via useEffect[finished]; reforço caso o stats já tenha sido salvo hoje
    setTimeout(()=>setShowStats(true),300);
  }

  const handleKey=useCallback((key:string)=>{
    if(!selectedPlayer||selectedState.solved||selectedState.failed||finished) return;
    const maxLen=getLettersOnly(selectedPlayer.answer).length;
    if(key==="DEL"){setInputLetters(p=>p.slice(0,-1));return;}
    if(key==="OK"){
      if(inputLetters.length<maxLen){showToast("Complete o nome!","error");return;}
      const guess=inputLetters.join("");
      const statuses=evaluateGuess(guess,selectedPlayer.answer);
      const isCorrect=statuses.every(s=>s==="correct");
      const newAttempts=[...selectedState.attempts,{value:guess,statuses}];
      const failed=!isCorrect&&newAttempts.length>=MAX_ATTEMPTS;
      const newState={...selectedState,attempts:newAttempts,solved:isCorrect,failed};
      const newStates={...playerStates,[selectedPlayer.id]:newState};
      setPlayerStates(newStates);saveStates(challenge!.id,newStates);setInputLetters([]);
      if(isCorrect) showToast(`✓ ${normalize(selectedPlayer.answer).toUpperCase()}!`,"success");
      else if(failed) showToast(`Era: ${normalize(selectedPlayer.answer).toUpperCase()}`,"error");
      return;
    }
    if(inputLetters.length<maxLen) setInputLetters(p=>[...p,key.toLowerCase()]);
  },[selectedPlayer,selectedState,inputLetters,playerStates,challenge,finished]);

  useEffect(()=>{
    const handler=(e:KeyboardEvent)=>{
      const k=e.key.toUpperCase();
      if(k==="BACKSPACE") handleKey("DEL");
      else if(k==="ENTER") handleKey("OK");
      else if(/^[A-Z]$/.test(k)) handleKey(k);
    };
    window.addEventListener("keydown",handler);
    return()=>window.removeEventListener("keydown",handler);
  },[handleKey]);

  const dates=challenges.filter(c=>c.date<=today).map(c=>c.date).sort();
  const currentDateIdx=dates.indexOf(selectedDate);
  const canGoPrev=currentDateIdx>0;
  const dateLabel=selectedDate?new Date(selectedDate+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}):"";

  if(loading) return(
    <div style={{background:"#FFD700",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontFamily:"Bebas Neue,sans-serif",fontSize:28,color:"#002776",letterSpacing:2}}>Carregando... ⚽</div>
    </div>
  );
  if(!challenge) return(
    <div style={{background:"#FFD700",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <div style={{fontFamily:"Bebas Neue,sans-serif",fontSize:24,color:"#002776"}}>Nenhuma escalacao disponivel ⚽</div>
      <a href="/" style={{background:"#002776",color:"#FFD700",padding:"10px 24px",borderRadius:10,textDecoration:"none",fontWeight:800}}>← Voltar ao Hub</a>
    </div>
  );

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}

        .esc-ad{position:fixed;top:0;width:160px;height:100vh;display:flex;align-items:center;justify-content:center;z-index:50;pointer-events:none;}
        .esc-ad-left{left:0;}
        .esc-ad-right{right:0;}
        .esc-main{padding-left:160px;padding-right:160px;}
        .esc-grid{display:grid;grid-template-columns:1fr 260px;gap:10px;padding:0 12px 16px;}

        /* Teclado: tamanho padrão (desktop) */
        .esc-key{font-size:9px;padding:5px 3px;min-width:20px;}
        .esc-key-wide{font-size:9px;padding:5px 7px;min-width:34px;}

        /* MOBILE */
        @media (max-width: 1080px) {
          .esc-ad{display:none;}
          .esc-main{padding-left:0;padding-right:0;}
        }
        @media (max-width: 720px) {
          .esc-grid{grid-template-columns:1fr;}
          .esc-title{font-size:22px !important;}
          /* Teclado ocupa a largura da tela com teclas maiores */
          .esc-kb .esc-key{flex:1;font-size:15px;padding:14px 0;min-width:0;}
          .esc-kb .esc-key-wide{flex:1.5;font-size:13px;padding:14px 0;min-width:0;}
        }
      `}</style>

      {/* ANÚNCIO ESQUERDO FIXO */}
      <div className="esc-ad esc-ad-left">
        <div style={{width:160,height:600,background:"rgba(0,39,118,0.5)",border:"1px dashed rgba(255,215,0,0.2)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:6,pointerEvents:"auto"}}>
          <div style={{fontSize:9,color:"rgba(255,215,0,0.3)",fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Anuncio</div>
          <div style={{fontSize:10,color:"rgba(255,215,0,0.2)",fontWeight:600}}>160×600</div>
        </div>
      </div>

      {/* ANÚNCIO DIREITO FIXO */}
      <div className="esc-ad esc-ad-right">
        <div style={{width:160,height:600,background:"rgba(0,39,118,0.5)",border:"1px dashed rgba(255,215,0,0.2)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:6,pointerEvents:"auto"}}>
          <div style={{fontSize:9,color:"rgba(255,215,0,0.3)",fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Anuncio</div>
          <div style={{fontSize:10,color:"rgba(255,215,0,0.2)",fontWeight:600}}>160×600</div>
        </div>
      </div>

      {/* CONTEÚDO CENTRAL */}
      <div className="esc-main" style={{fontFamily:"Nunito,sans-serif",background:"#FFD700",minHeight:"100vh"}}>
        <div style={{maxWidth:700,margin:"0 auto"}}>

          {/* HEADER */}
          <div style={{background:"#002776",borderBottom:"1px solid rgba(255,215,0,0.2)",padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <a href="/" style={{textDecoration:"none"}}>
                <div style={{fontFamily:"Bebas Neue,sans-serif",fontSize:26,color:"#FFD700",letterSpacing:2,lineHeight:1}}>Escalacoes do Futebol</div>
                <div style={{fontSize:10,color:"#9EC8FF",fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Complete a escalacao historica · FutJogos</div>
              </a>
            </div>
            <button onClick={()=>setShowStats(true)} style={{background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.3)",borderRadius:8,padding:"6px 12px",color:"#FFD700",fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:12,cursor:"pointer"}}>Stats</button>
          </div>

          {/* NAV JOGOS */}
          <div style={{background:"#001a55",padding:"8px 12px",display:"flex",gap:8}}>
            {NAV_JOGOS.map(j=>(
              <a key={j.href} href={j.href} style={{flex:1,textDecoration:"none",background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.2)",color:"#FFD700",fontFamily:"Bebas Neue,sans-serif",fontSize:13,letterSpacing:1,padding:"7px 8px",borderRadius:8,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                <span>{j.emoji}</span><span>{j.nome}</span>
              </a>
            ))}
          </div>

          {/* DATE NAV */}
          <div style={{background:"#009C3B",padding:"9px 24px",display:"flex",alignItems:"center",justifyContent:"center",gap:16}}>
            <button
              onClick={()=>{if(canGoPrev)setSelectedDate(dates[currentDateIdx-1]);}}
              disabled={!canGoPrev}
              style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:"50%",width:30,height:30,color:"#fff",fontSize:18,cursor:canGoPrev?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,opacity:canGoPrev?1:0.3}}>‹</button>
            <span style={{color:"#fff",fontWeight:800,fontSize:13,textTransform:"capitalize",flex:1,textAlign:"center"}}>{dateLabel}</span>
            {currentDateIdx<dates.length-1?(
              <button onClick={()=>setSelectedDate(dates[currentDateIdx+1])} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:"50%",width:30,height:30,color:"#fff",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900}}>›</button>
            ):(
              <div style={{width:30,height:30}}/>
            )}
          </div>

          {/* TÍTULO */}
          <div style={{textAlign:"center",padding:"12px 12px 6px"}}>
            <div className="esc-title" style={{fontFamily:"Bebas Neue,sans-serif",fontSize:26,color:"#002776",letterSpacing:3}}>{challenge.title}</div>
            <div style={{fontSize:11,color:"#003a99",fontWeight:700}}>{challenge.subtitle} · {challenge.team} · {challenge.formation}</div>
          </div>

          {/* ÁREA DO JOGO */}
          <div className="esc-grid">

            {/* CAMPO */}
            <div style={{background:"rgba(0,39,118,0.08)",border:"1px solid rgba(0,39,118,0.15)",borderRadius:10,padding:8}}>

              {/* Placar */}
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{background:"#002776",borderRadius:6,padding:"2px 10px",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:8,color:"rgba(255,215,0,0.7)",textTransform:"uppercase",letterSpacing:1}}>Acertos</span>
                  <span style={{fontFamily:"Bebas Neue,sans-serif",fontSize:16,color:"#FFD700"}}>{solvedCount}/{challenge.players.length}</span>
                </div>
                <div style={{background:"#002776",borderRadius:6,padding:"2px 10px",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:8,color:"rgba(255,215,0,0.7)",textTransform:"uppercase",letterSpacing:1}}>Tentativas</span>
                  <span style={{fontFamily:"Bebas Neue,sans-serif",fontSize:16,color:"#FFD700"}}>{totalAttempts}</span>
                </div>
                <div style={{flex:1}}/>
                {finished&&<button onClick={()=>setShowStats(true)} style={{background:"#009C3B",border:"none",borderRadius:6,padding:"3px 10px",color:"#fff",fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:11,cursor:"pointer"}}>Ver resultado</button>}
              </div>

              {/* TOPO: 2 placas */}
              <div style={{display:"flex",gap:2,marginBottom:2}}>
                <div style={{flex:1,height:14,background:"#111",borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:6,color:"rgba(255,255,255,0.5)",letterSpacing:2,fontWeight:700}}>ANUNCIE AQUI</span>
                </div>
                <div style={{flex:1,height:14,background:"#111",borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:6,color:"rgba(255,255,255,0.5)",letterSpacing:2,fontWeight:700}}>ANUNCIE AQUI</span>
                </div>
              </div>

              <div style={{display:"flex",gap:2}}>
                {/* LATERAL ESQUERDA */}
                <div style={{width:14,display:"flex",flexDirection:"column",gap:2}}>
                  <div style={{flex:1,minHeight:60,background:"#111",borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:5,color:"rgba(255,255,255,0.4)",writingMode:"vertical-lr",transform:"rotate(180deg)",letterSpacing:2}}>ANUNCIE AQUI</span>
                  </div>
                  <div style={{flex:1,minHeight:60,background:"#111",borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:5,color:"rgba(255,255,255,0.4)",writingMode:"vertical-lr",transform:"rotate(180deg)",letterSpacing:2}}>ANUNCIE AQUI</span>
                  </div>
                </div>

                {/* CAMPO */}
                <div style={{flex:1,position:"relative",aspectRatio:"3/4",borderRadius:4,overflow:"hidden",border:"2px solid #4ade80",background:"linear-gradient(180deg,#15803d 0%,#166534 50%,#15803d 100%)"}}>
                  <div style={{position:"absolute",inset:6,border:"1.5px solid rgba(134,239,172,0.35)",borderRadius:1,pointerEvents:"none"}}/>
                  <div style={{position:"absolute",left:"15%",right:"15%",top:"3%",height:"18%",border:"1.5px solid rgba(134,239,172,0.35)",borderTop:"none",pointerEvents:"none"}}/>
                  <div style={{position:"absolute",left:"30%",right:"30%",top:"3%",height:"8%",border:"1.5px solid rgba(134,239,172,0.25)",borderTop:"none",pointerEvents:"none"}}/>
                  <div style={{position:"absolute",left:"15%",right:"15%",bottom:"3%",height:"18%",border:"1.5px solid rgba(134,239,172,0.35)",borderBottom:"none",pointerEvents:"none"}}/>
                  <div style={{position:"absolute",left:"30%",right:"30%",bottom:"3%",height:"8%",border:"1.5px solid rgba(134,239,172,0.25)",borderBottom:"none",pointerEvents:"none"}}/>
                  <div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:56,height:56,borderRadius:"50%",border:"1.5px solid rgba(134,239,172,0.35)",pointerEvents:"none"}}/>
                  <div style={{position:"absolute",left:"3%",right:"3%",top:"50%",borderTop:"1.5px solid rgba(134,239,172,0.35)",pointerEvents:"none"}}/>
                  <div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:4,height:4,borderRadius:"50%",background:"rgba(134,239,172,0.5)",pointerEvents:"none"}}/>

                  {challenge.players.map(player=>(
                    <PlayerTile key={player.id} player={player} state={playerStates[player.id]||{attempts:[],solved:false,failed:false}} isSelected={player.id===selectedId} shirtColors={challenge.shirtColors} onClick={()=>{setSelectedId(player.id);setInputLetters([]);}}/>
                  ))}
                </div>

                {/* LATERAL DIREITA */}
                <div style={{width:14,display:"flex",flexDirection:"column",gap:2}}>
                  <div style={{flex:1,minHeight:60,background:"#111",borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:5,color:"rgba(255,255,255,0.4)",writingMode:"vertical-lr",letterSpacing:2}}>ANUNCIE AQUI</span>
                  </div>
                  <div style={{flex:1,minHeight:60,background:"#111",borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:5,color:"rgba(255,255,255,0.4)",writingMode:"vertical-lr",letterSpacing:2}}>ANUNCIE AQUI</span>
                  </div>
                </div>
              </div>

              {/* BASE: 2 placas */}
              <div style={{display:"flex",gap:2,marginTop:2}}>
                <div style={{flex:1,height:14,background:"#111",borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:6,color:"rgba(255,255,255,0.5)",letterSpacing:2,fontWeight:700}}>ANUNCIE AQUI</span>
                </div>
                <div style={{flex:1,height:14,background:"#111",borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:6,color:"rgba(255,255,255,0.5)",letterSpacing:2,fontWeight:700}}>ANUNCIE AQUI</span>
                </div>
              </div>
            </div>

            {/* PAINEL LATERAL */}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{background:"#002776",border:"1px solid rgba(255,215,0,0.15)",borderRadius:10,padding:"10px 12px"}}>
                <GuessGrid answer={selectedPlayer?.answer||""} attempts={selectedState.attempts} currentInput={inputAsString}/>
              </div>
              <div style={{background:"#002776",border:"1px solid rgba(255,215,0,0.15)",borderRadius:10,padding:"8px 10px"}}>
                <VirtualKeyboard onKey={handleKey} keyStatuses={keyStatuses} disabled={selectedState.solved||selectedState.failed||finished}/>
              </div>
              <button onClick={()=>{
                if(selectedState.solved||selectedState.failed||finished||!selectedPlayer) return;
                const newStates={...playerStates,[selectedPlayer.id]:{...playerStates[selectedPlayer.id],failed:true}};
                setPlayerStates(newStates);saveStates(challenge!.id,newStates);
                showToast(`Era: ${normalize(selectedPlayer.answer).toUpperCase()}`,"error");setInputLetters([]);
              }} disabled={selectedState.solved||selectedState.failed||finished}
                style={{background:"transparent",color:"#CC0000",border:"1.5px solid #CC0000",borderRadius:8,padding:"7px 0",fontFamily:"Nunito,sans-serif",fontWeight:700,fontSize:11,cursor:"pointer",opacity:(selectedState.solved||selectedState.failed||finished)?0.4:1}}>
                Desistir desta posicao
              </button>

              {/* ── FINALIZAR E VER RESULTADO ── */}
              {!finished && (
                <button onClick={finalizarJogo}
                  style={{background:"#FFD700",color:"#002776",border:"none",borderRadius:8,padding:"9px 0",fontFamily:"Bebas Neue,sans-serif",fontSize:15,letterSpacing:1,cursor:"pointer"}}>
                  Finalizar e ver resultado
                </button>
              )}

              <div style={{background:"#002776",border:"1px solid rgba(0,39,118,0.2)",borderRadius:10,padding:"8px 12px",fontSize:10,color:"rgba(255,255,255,0.5)"}}>
                <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:"rgba(255,215,0,0.6)",marginBottom:5}}>Como jogar</div>
                {[["#009C3B","letra certa no lugar certo"],["#B8860B","letra certa no lugar errado"],["#1e293b","letra nao existe no nome"]].map(([color,label])=>(
                  <div key={label} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                    <div style={{width:11,height:11,background:color,borderRadius:2,flexShrink:0}}/>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div style={{padding:"14px 14px 20px",textAlign:"center"}}>
            {SHOW_SOCIAL && (
              <>
                <div style={{fontSize:11,color:"#003a99",fontWeight:800,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Siga a gente</div>
                <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
                  {SOCIAL_LINKS.map(({label,bg,url})=>(
                    <a key={label} href={url} target="_blank" rel="noreferrer" style={{textDecoration:"none",background:bg,color:"white",fontWeight:800,fontSize:12,padding:"8px 14px",borderRadius:10,cursor:"pointer"}}>{label}</a>
                  ))}
                </div>
              </>
            )}
            <a href={KOFI_URL} target="_blank" rel="noreferrer" style={{textDecoration:"none",display:"block",background:"#FF5E5B",color:"white",fontFamily:"Bebas Neue,sans-serif",fontSize:18,letterSpacing:1,padding:"12px",borderRadius:10,textAlign:"center",marginBottom:10}}>
              ☕ Apoie o FutJogos no Ko-fi
            </a>
            <div style={{fontSize:10,color:"#003a99",fontWeight:700}}>© 2026 FutJogos · futjogos.com.br</div>
          </div>

        </div>
      </div>

      <Toast message={toast.message} type={toast.type}/>
      {showStats&&challenge&&(
        <StatsModal challenge={challenge} playerStates={playerStates} solvedCount={solvedCount} totalAttempts={totalAttempts} finished={finished} onClose={()=>setShowStats(false)}/>
      )}
    </>
  );
}

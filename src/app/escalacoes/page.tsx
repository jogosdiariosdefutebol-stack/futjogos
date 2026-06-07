"use client";
import { useEffect, useCallback, useState, useRef } from "react";

const CSV_JOGOS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMGf38fV6wwEdb-U2q_1hE8PwydH-WaSScFTBjW9BL1FBWw6sPQ8eNlx0lu9Q4I85qggrGJKcBzan5/pub?gid=605040019&single=true&output=csv";
const CSV_JOGADORES = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMGf38fV6wwEdb-U2q_1hE8PwydH-WaSScFTBjW9BL1FBWw6sPQ8eNlx0lu9Q4I85qggrGJKcBzan5/pub?gid=2003933001&single=true&output=csv";
const CSV_CONFIG = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMGf38fV6wwEdb-U2q_1hE8PwydH-WaSScFTBjW9BL1FBWw6sPQ8eNlx0lu9Q4I85qggrGJKcBzan5/pub?gid=2018787597&single=true&output=csv";

const MAX_ATTEMPTS = 5;
const KEYBOARD_ROWS = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["DEL","Z","X","C","V","B","N","M","OK"],
];
const STORAGE_KEY = "futescalacao_v2";
const STATS_KEY = "futescalacao_stats_v1";
const NAV_JOGOS = [
  { href: "/", emoji: "🏠", nome: "Hub" },
  { href: "/top10", emoji: "🏆", nome: "Top 10" },
  { href: "/bingo", emoji: "🎯", nome: "Bingo" },
];

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
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

function loadSavedStates() {
  if(typeof window==="undefined") return {};
  try{const r=localStorage.getItem(STORAGE_KEY);return r?JSON.parse(r):{};}catch{return {};}
}
function saveStates(id:string,states:any){
  if(typeof window==="undefined") return;
  try{const all=loadSavedStates();all[id]=states;localStorage.setItem(STORAGE_KEY,JSON.stringify(all));}catch{}
}
function loadStats(){
  if(typeof window==="undefined") return {played:0,totalSolved:0,totalAttempts:0,streak:0,lastPlayedDate:null,history:[]};
  try{const r=localStorage.getItem(STATS_KEY);return r?JSON.parse(r):{played:0,totalSolved:0,totalAttempts:0,streak:0,lastPlayedDate:null,history:[]};}
  catch{return {played:0,totalSolved:0,totalAttempts:0,streak:0,lastPlayedDate:null,history:[]};}
}

interface ChallengePlayer{id:string;position:string;shirt:number;answer:string;x:number;y:number;}
interface Challenge{id:string;date:string;title:string;subtitle:string;team:string;formation:string;shirtColors:{body:string;sleeve:string;collar:string};players:ChallengePlayer[];}

function PlayerTile({player,state,isSelected,shirtColors,onClick}:{player:ChallengePlayer;state:any;isSelected:boolean;shirtColors:any;onClick:()=>void}){
  const solved=state.solved;const failed=state.failed;
  const wordLengths=getWordLengths(player.answer);
  return(
    <div onClick={onClick} style={{position:"absolute",left:`${player.x}%`,top:`${player.y}%`,transform:"translate(-50%,-50%)",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,zIndex:10}}>
      <div style={{width:36,height:42,position:"relative",filter:isSelected?"drop-shadow(0 0 6px #FFD700)":"none"}}>
        <svg viewBox="0 0 36 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 2 L34 10 L34 32 Q18 42 2 32 L2 10 Z" fill={solved?"#009C3B":failed?"#8B0000":shirtColors.body} stroke={isSelected?"#FFD700":"rgba(0,0,0,0.3)"} strokeWidth={isSelected?"2":"1"}/>
          <path d="M2 10 L8 14 L8 32 Q5 31 2 29 Z" fill={solved?"#007A2F":failed?"#6B0000":shirtColors.sleeve}/>
          <path d="M34 10 L28 14 L28 32 Q31 31 34 29 Z" fill={solved?"#007A2F":failed?"#6B0000":shirtColors.sleeve}/>
          <path d="M12 2 Q18 6 24 2" fill="none" stroke={shirtColors.collar} strokeWidth="3"/>
          <text x="18" y="26" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="Arial">{player.shirt}</text>
        </svg>
      </div>
      <div style={{background:solved?"#009C3B":failed?"#8B0000":"rgba(0,0,0,0.75)",borderRadius:4,padding:"1px 5px",maxWidth:70,textAlign:"center"}}>
        {solved?(
          <div style={{fontSize:9,color:"#FFD700",fontWeight:800,fontFamily:"Bebas Neue,sans-serif",letterSpacing:0.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{normalize(player.answer).toUpperCase()}</div>
        ):failed?(
          <div style={{fontSize:9,color:"#ffaaaa",fontWeight:800,fontFamily:"Bebas Neue,sans-serif",letterSpacing:0.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>✗ {normalize(player.answer).toUpperCase()}</div>
        ):(
          <div style={{display:"flex",gap:2,justifyContent:"center",flexWrap:"wrap"}}>
            {wordLengths.map((len:number,wi:number)=>(
              <div key={wi} style={{display:"flex",gap:1}}>
                {Array(len).fill(0).map((_:any,li:number)=>(
                  <div key={li} style={{width:5,height:5,borderRadius:1,background:"rgba(255,255,255,0.4)"}}/>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{fontSize:8,color:"rgba(255,255,255,0.6)",fontWeight:600}}>{player.position}</div>
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
      if(w>0) cells.push(<div key={`sp-${r}-${w}`} style={{width:4}}/>);
      for(let l=0;l<wordLengths[w];l++){
        const ch=letters[ci]||"";const st=statuses[ci]||"";
        const bg=st==="correct"?"#009C3B":st==="present"?"#B8860B":st==="absent"?"#1e293b":"rgba(255,255,255,0.1)";
        cells.push(<div key={`${r}-${w}-${l}`} style={{width:24,height:24,borderRadius:4,background:bg,border:`1px solid ${st?"transparent":"rgba(255,215,0,0.3)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"white",fontFamily:"Arial",textTransform:"uppercase"}}>{ch}</div>);
        ci++;
      }
    }
    rows.push(<div key={r} style={{display:"flex",alignItems:"center",gap:2,justifyContent:"center"}}>{cells}</div>);
  }
  return <div style={{display:"flex",flexDirection:"column",gap:4}}>{rows}</div>;
}

function VirtualKeyboard({onKey,keyStatuses,disabled}:{onKey:(k:string)=>void;keyStatuses:Record<string,string>;disabled:boolean}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      {KEYBOARD_ROWS.map((row,ri)=>(
        <div key={ri} style={{display:"flex",gap:3,justifyContent:"center"}}>
          {row.map(k=>{
            const st=keyStatuses[k.toLowerCase()]||"";
            const bg=k==="OK"?"#009C3B":k==="DEL"?"#CC0000":st==="correct"?"#009C3B":st==="present"?"#B8860B":st==="absent"?"#1e293b":"rgba(255,255,255,0.15)";
            const isWide=k==="OK"||k==="DEL";
            return(
              <button key={k} onClick={()=>!disabled&&onKey(k)} disabled={disabled}
                style={{background:bg,border:"none",borderRadius:4,padding:isWide?"6px 8px":"6px 4px",minWidth:isWide?36:22,color:"white",fontSize:10,fontWeight:800,cursor:disabled?"default":"pointer",fontFamily:"Arial",opacity:disabled?0.5:1}}>
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
    <div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:bg,color:"white",padding:"10px 20px",borderRadius:8,fontWeight:700,fontSize:13,zIndex:9999,whiteSpace:"nowrap",fontFamily:"Nunito,sans-serif"}}>
      {message}
    </div>
  );
}

function ResultModal({challenge,playerStates,solvedCount,totalAttempts,onClose}:{challenge:Challenge;playerStates:any;solvedCount:number;totalAttempts:number;onClose:()=>void}){
  const shareText=`⚽ Escalações do Futebol\n${challenge.title}\n\nAcertei ${solvedCount}/${challenge.players.length} jogadores em ${totalAttempts} tentativas!\n\nfutjogos.vercel.app/escalacoes`;
  function shareWhatsApp(){window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`,"_blank");}
  function shareX(){window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,"_blank");}
  function shareInstagram(){navigator.clipboard?.writeText(shareText).then(()=>alert("Copiado! Cole no Instagram 📋"));}
  function shareCopy(){navigator.clipboard?.writeText(shareText).then(()=>alert("Copiado! 📋"));}
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#002776",border:"3px solid #FFD700",borderRadius:16,padding:"24px 20px",maxWidth:380,width:"100%",textAlign:"center"}}>
        <div style={{fontFamily:"Bebas Neue,sans-serif",fontSize:32,color:"#FFD700",letterSpacing:2,marginBottom:8}}>Resultado!</div>
        <div style={{fontFamily:"Bebas Neue,sans-serif",fontSize:56,color:"white",lineHeight:1}}>{solvedCount}/{challenge.players.length}</div>
        <div style={{fontSize:12,color:"#9EC8FF",fontWeight:700,margin:"6px 0 16px"}}>{totalAttempts} tentativas · {challenge.title}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
          <button onClick={shareWhatsApp} style={{background:"#25D366",color:"white",border:"none",padding:10,borderRadius:10,fontSize:13,fontWeight:800,cursor:"pointer"}}>💬 WhatsApp</button>
          <button onClick={shareX} style={{background:"#000",color:"white",border:"none",padding:10,borderRadius:10,fontSize:13,fontWeight:800,cursor:"pointer"}}>𝕏 Twitter/X</button>
          <button onClick={shareInstagram} style={{background:"#E1306C",color:"white",border:"none",padding:10,borderRadius:10,fontSize:13,fontWeight:800,cursor:"pointer"}}>📸 Instagram</button>
          <button onClick={shareCopy} style={{background:"#555",color:"white",border:"none",padding:10,borderRadius:10,fontSize:13,fontWeight:800,cursor:"pointer"}}>📋 Copiar</button>
        </div>
        <button onClick={onClose} style={{background:"transparent",border:"1px solid rgba(255,215,0,0.3)",borderRadius:8,padding:"10px 24px",color:"#FFD700",fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:13,cursor:"pointer",width:"100%"}}>Fechar</button>
      </div>
    </div>
  );
}

function StatsModal({onClose}:{onClose:()=>void}){
  const stats=loadStats();
  const avgSolved=stats.played>0?(stats.totalSolved/stats.played).toFixed(1):0;
  const avgAttempts=stats.played>0?(stats.totalAttempts/stats.played).toFixed(1):0;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#002776",border:"3px solid #FFD700",borderRadius:16,padding:"24px 20px",maxWidth:340,width:"100%",textAlign:"center"}}>
        <div style={{fontFamily:"Bebas Neue,sans-serif",fontSize:32,color:"#FFD700",letterSpacing:2,marginBottom:16}}>Estatísticas</div>
        {stats.streak>0&&<div style={{background:"#009C3B",borderRadius:10,padding:12,color:"white",fontWeight:900,fontSize:14,marginBottom:16}}>🔥 {stats.streak} dia(s) consecutivo(s)!</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {[{val:stats.played,lbl:"Jogos"},{val:avgSolved,lbl:"Média acertos"},{val:avgAttempts,lbl:"Média tent."},{val:stats.streak,lbl:"Streak"}].map(({val,lbl})=>(
            <div key={lbl} style={{background:"rgba(255,215,0,0.08)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:10,padding:"12px 6px"}}>
              <div style={{fontFamily:"Bebas Neue,sans-serif",fontSize:30,color:"#FFD700",lineHeight:1}}>{val}</div>
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
  const [showModal,setShowModal]=useState(false);
  const [showStats,setShowStats]=useState(false);
  const toastTimer=useRef<any>(null);

  function showToast(msg:string,type:string){
    setToast({message:msg,type});
    if(toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current=setTimeout(()=>setToast({message:"",type:""}),2000);
  }

  useEffect(()=>{
    Promise.all([
      fetch(CSV_JOGOS,{redirect:"follow"}).then(r=>r.text()),
      fetch(CSV_JOGADORES,{redirect:"follow"}).then(r=>r.text()),
      fetch(CSV_CONFIG,{redirect:"follow"}).then(r=>r.text()),
    ]).then(([jogosText,jogadoresText,configText])=>{

      // parse config cores
      const cmap:Record<string,string>={};
      configText.trim().split("\n").filter(l=>l.trim()).slice(1).forEach(line=>{
        const cols=parseCSVLine(line);
        const nome=cols[4]?.trim();
        const hex=cols[5]?.trim().replace("#","").replace(/"/g,"");
        if(nome&&hex) cmap[nome]=`#${hex}`;
      });

      // parse jogos
      const jogosMap:Record<string,any>={};
      jogosText.trim().split("\n").filter(l=>l.trim()).slice(1).forEach(line=>{
        const cols=parseCSVLine(line);
        const code=cols[0]?.trim();
        if(!code) return;
        jogosMap[code]={
          id:code,
          date:cols[1]?.trim()||"",
          title:cols[2]?.trim()||"",
          subtitle:cols[3]?.trim()||"",
          team:cols[4]?.trim()||"",
          formation:cols[5]?.trim()||"",
          corCamisa:cols[6]?.trim()||"branco",
          corMangaGola:cols[7]?.trim()||"branco",
          players:[],
        };
      });

      // parse jogadores
      jogadoresText.trim().split("\n").filter(l=>l.trim()).slice(1).forEach(line=>{
        const cols=parseCSVLine(line);
        const code=cols[0]?.trim();
        if(!code||!jogosMap[code]) return;
        jogosMap[code].players.push({
          id:`${code}_${cols[1]?.trim()}_${cols[2]?.trim()}`,
          position:cols[1]?.trim()||"",
          shirt:parseInt(cols[2])||0,
          answer:cols[3]?.trim()||"",
          x:parseFloat(cols[4])||50,
          y:parseFloat(cols[5])||50,
        });
      });

      const allChallenges:Challenge[]=Object.values(jogosMap).map((j:any)=>({
        ...j,
        shirtColors:{
          body:cmap[j.corCamisa]||"#FFFFFF",
          sleeve:cmap[j.corMangaGola]||"#FFFFFF",
          collar:cmap[j.corMangaGola]||"#FFFFFF",
        }
      })).filter((c:Challenge)=>c.players.length>0);

      allChallenges.sort((a,b)=>a.date.localeCompare(b.date));
      setChallenges(allChallenges);

      const today=new Date().toISOString().split("T")[0];
      const todayChallenge=allChallenges.find(c=>c.date===today);
      const selected=todayChallenge||allChallenges[allChallenges.length-1];
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
  const finished=challenge?Object.values(playerStates).every((s:any)=>s.solved||s.failed):false;
  const inputAsString=inputLetters.join("");
  const keyStatuses=selectedPlayer?buildKeyStatuses(selectedState.attempts,selectedPlayer.answer):{};

  const handleKey=useCallback((key:string)=>{
    if(!selectedPlayer||selectedState.solved||selectedState.failed||finished) return;
    const maxLen=getLettersOnly(selectedPlayer.answer).length;
    if(key==="DEL"){setInputLetters(p=>p.slice(0,-1));return;}
    if(key==="OK"){
      if(inputLetters.length<maxLen){showToast("Complete o nome!","error");return;}
      const guess=inputLetters.join("");
      const statuses=evaluateGuess(guess,selectedPlayer.answer);
      const isCorrect=statuses.every(s=>s==="correct");
      const newAttempt={value:guess,statuses};
      const newAttempts=[...selectedState.attempts,newAttempt];
      const failed=!isCorrect&&newAttempts.length>=MAX_ATTEMPTS;
      const newState={...selectedState,attempts:newAttempts,solved:isCorrect,failed};
      const newStates={...playerStates,[selectedPlayer.id]:newState};
      setPlayerStates(newStates);
      saveStates(challenge!.id,newStates);
      setInputLetters([]);
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

  const dates=challenges.map(c=>c.date).sort();
  const currentDateIdx=dates.indexOf(selectedDate);
  const dateLabel=selectedDate?new Date(selectedDate+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}):"";

  if(loading) return(
    <div style={{background:"#FFD700",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontFamily:"Bebas Neue,sans-serif",fontSize:28,color:"#002776",letterSpacing:2}}>Carregando... ⚽</div>
    </div>
  );

  if(!challenge) return(
    <div style={{background:"#FFD700",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <div style={{fontFamily:"Bebas Neue,sans-serif",fontSize:24,color:"#002776"}}>Nenhuma escalação disponível ⚽</div>
      <a href="/" style={{background:"#002776",color:"#FFD700",padding:"10px 24px",borderRadius:10,textDecoration:"none",fontWeight:800}}>← Voltar ao Hub</a>
    </div>
  );

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
      `}</style>

      <div style={{fontFamily:"Nunito,sans-serif",background:"#002776",minHeight:"100vh"}}>
        <div style={{display:"flex",justifyContent:"center",alignItems:"flex-start"}}>

          <div style={{width:160,minHeight:"100vh",flexShrink:0,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:80}}>
            <div style={{width:160,height:600,background:"rgba(255,215,0,0.05)",border:"1px dashed rgba(255,215,0,0.2)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:6}}>
              <div style={{fontSize:9,color:"rgba(255,215,0,0.3)",fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Anúncio</div>
              <div style={{fontSize:10,color:"rgba(255,215,0,0.2)",fontWeight:600}}>160×600</div>
            </div>
          </div>

          <div style={{width:700,flexShrink:0}}>

            <div style={{background:"#002776",borderBottom:"1px solid rgba(255,215,0,0.2)",padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <a href="/" style={{textDecoration:"none"}}>
                  <div style={{fontFamily:"Bebas Neue,sans-serif",fontSize:26,color:"#FFD700",letterSpacing:2,lineHeight:1}}>Escalações do Futebol</div>
                  <div style={{fontSize:10,color:"#9EC8FF",fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Complete a escalação histórica · FutJogos</div>
                </a>
              </div>
              <button onClick={()=>setShowStats(true)} style={{background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.3)",borderRadius:8,padding:"6px 12px",color:"#FFD700",fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:12,cursor:"pointer"}}>📊 Stats</button>
            </div>

            <div style={{background:"#001a55",padding:"8px 12px",display:"flex",gap:8}}>
              {NAV_JOGOS.map(j=>(
                <a key={j.href} href={j.href} style={{flex:1,textDecoration:"none",background:"rgba(255,215,0,0.1)",border:"1px solid rgba(255,215,0,0.2)",color:"#FFD700",fontFamily:"Bebas Neue,sans-serif",fontSize:13,letterSpacing:1,padding:"7px 8px",borderRadius:8,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                  <span>{j.emoji}</span><span>{j.nome}</span>
                </a>
              ))}
            </div>

            <div style={{background:"#009C3B",padding:"9px 24px",display:"flex",alignItems:"center",justifyContent:"center",gap:16}}>
              <button onClick={()=>{if(currentDateIdx>0)setSelectedDate(dates[currentDateIdx-1]);}} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:"50%",width:30,height:30,color:"#fff",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900}}>‹</button>
              <span style={{color:"#fff",fontWeight:800,fontSize:13,textTransform:"capitalize"}}>{dateLabel}</span>
              <button onClick={()=>{if(currentDateIdx<dates.length-1)setSelectedDate(dates[currentDateIdx+1]);}} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:"50%",width:30,height:30,color:"#fff",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900}}>›</button>
            </div>

            <main style={{padding:"16px 12px"}}>
              <div style={{textAlign:"center",marginBottom:12}}>
                <div style={{fontFamily:"Bebas Neue,sans-serif",fontSize:28,color:"#FFD700",letterSpacing:3}}>{challenge.title}</div>
                <div style={{fontSize:12,color:"rgba(255,215,0,0.7)",fontWeight:700}}>{challenge.subtitle} · {challenge.team} · {challenge.formation}</div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:12,alignItems:"start"}}>
                <div style={{background:"rgba(0,39,118,0.5)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:10,padding:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <div style={{background:"rgba(0,0,0,0.3)",borderRadius:6,padding:"3px 10px",display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:8,color:"rgba(255,215,0,0.7)",textTransform:"uppercase",letterSpacing:1}}>Acertos</span>
                      <span style={{fontFamily:"Bebas Neue,sans-serif",fontSize:18,color:"#FFD700"}}>{solvedCount}<span style={{fontSize:11,opacity:0.5}}>/{challenge.players.length}</span></span>
                    </div>
                    <div style={{background:"rgba(0,0,0,0.3)",borderRadius:6,padding:"3px 10px",display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:8,color:"rgba(255,215,0,0.7)",textTransform:"uppercase",letterSpacing:1}}>Tentativas</span>
                      <span style={{fontFamily:"Bebas Neue,sans-serif",fontSize:18,color:"#FFD700"}}>{totalAttempts}</span>
                    </div>
                    <div style={{flex:1}}/>
                    {finished&&(
                      <button onClick={()=>setShowModal(true)} style={{background:"#009C3B",border:"none",borderRadius:6,padding:"4px 12px",color:"#fff",fontFamily:"Nunito,sans-serif",fontWeight:800,fontSize:11,cursor:"pointer"}}>Ver resultado →</button>
                    )}
                  </div>
                  <div style={{position:"relative",aspectRatio:"3/4",borderRadius:8,overflow:"hidden",border:"3px solid #4ade80",background:"linear-gradient(180deg,#15803d 0%,#16a34a 100%)"}}>
                    <div style={{position:"absolute",inset:8,border:"2px solid rgba(134,239,172,0.4)",borderRadius:2,pointerEvents:"none"}}/>
                    <div style={{position:"absolute",left:"25%",right:"25%",top:0,height:"15%",borderLeft:"2px solid rgba(134,239,172,0.4)",borderRight:"2px solid rgba(134,239,172,0.4)",borderBottom:"2px solid rgba(134,239,172,0.4)",pointerEvents:"none"}}/>
                    <div style={{position:"absolute",left:"25%",right:"25%",bottom:0,height:"15%",borderLeft:"2px solid rgba(134,239,172,0.4)",borderRight:"2px solid rgba(134,239,172,0.4)",borderTop:"2px solid rgba(134,239,172,0.4)",pointerEvents:"none"}}/>
                    <div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:80,height:80,borderRadius:"50%",border:"2px solid rgba(134,239,172,0.4)",pointerEvents:"none"}}/>
                    <div style={{position:"absolute",left:8,right:8,top:"50%",borderTop:"2px solid rgba(134,239,172,0.4)",pointerEvents:"none"}}/>
                    {challenge.players.map(player=>(
                      <PlayerTile key={player.id} player={player} state={playerStates[player.id]||{attempts:[],solved:false,failed:false}} isSelected={player.id===selectedId} shirtColors={challenge.shirtColors} onClick={()=>setSelectedId(player.id)}/>
                    ))}
                  </div>
                </div>

                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <div style={{background:"rgba(0,39,118,0.5)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                    <div style={{fontSize:8,color:"rgba(255,215,0,0.5)",textTransform:"uppercase",letterSpacing:1}}>Posição</div>
                    <div style={{fontFamily:"Bebas Neue,sans-serif",fontSize:18,color:"#FFD700",letterSpacing:2}}>{selectedPlayer?.position} · {selectedPlayer?.shirt}</div>
                    <div style={{flex:1}}/>
                    <div style={{background:selectedState.solved?"rgba(0,156,59,0.9)":selectedState.failed?"rgba(120,0,0,0.8)":"rgba(0,0,0,0.3)",border:`1px solid ${selectedState.solved?"#FFD700":selectedState.failed?"#CC0000":"rgba(255,255,255,0.15)"}`,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:800,color:selectedState.solved?"#FFD700":selectedState.failed?"#ffaaaa":"rgba(255,255,255,0.6)"}}>
                      {selectedState.solved?"✓ Resolvida":selectedState.failed?"✗ Falhou":`${MAX_ATTEMPTS-selectedState.attempts.length} tent.`}
                    </div>
                  </div>
                  <div style={{background:"rgba(0,39,118,0.5)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:10,padding:"10px 14px"}}>
                    <GuessGrid answer={selectedPlayer?.answer||""} attempts={selectedState.attempts} currentInput={inputAsString}/>
                  </div>
                  <div style={{background:"rgba(0,39,118,0.5)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:10,padding:"10px"}}>
                    <VirtualKeyboard onKey={handleKey} keyStatuses={keyStatuses} disabled={selectedState.solved||selectedState.failed||finished}/>
                  </div>
                  <button onClick={()=>{
                    if(selectedState.solved||selectedState.failed||finished) return;
                    setPlayerStates(prev=>({...prev,[selectedPlayer!.id]:{...prev[selectedPlayer!.id],failed:true}}));
                    showToast(`Desistiu. Era: ${normalize(selectedPlayer!.answer).toUpperCase()}`,"error");
                    setInputLetters([]);
                  }} disabled={selectedState.solved||selectedState.failed||finished}
                    style={{background:"transparent",color:"#CC0000",border:"2px solid #CC0000",borderRadius:10,padding:"9px 0",fontFamily:"Nunito,sans-serif",fontWeight:700,fontSize:12,cursor:"pointer",opacity:(selectedState.solved||selectedState.failed||finished)?0.4:1}}>
                    Desistir desta posição
                  </button>
                  <div style={{background:"rgba(0,39,118,0.5)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:10,padding:"10px 14px",fontSize:11,color:"rgba(255,255,255,0.5)"}}>
                    <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:"rgba(255,215,0,0.4)",marginBottom:6}}>Como jogar</div>
                    {[["#009C3B","letra certa no lugar certo"],["#B8860B","letra certa no lugar errado"],["#1e293b","letra não existe no nome"]].map(([color,label])=>(
                      <div key={label} style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
                        <div style={{width:13,height:13,background:color,borderRadius:3,flexShrink:0}}/>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </main>

            <div style={{padding:"20px 14px",textAlign:"center"}}>
              <div style={{fontSize:11,color:"rgba(255,215,0,0.7)",fontWeight:800,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Siga a gente</div>
              <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:12}}>
                {[["📸 Instagram","#E1306C"],["🎵 TikTok","#000000"],["▶️ YouTube","#FF0000"]].map(([label,bg])=>(
                  <div key={label} style={{background:bg as string,color:"white",fontWeight:800,fontSize:12,padding:"8px 14px",borderRadius:10,cursor:"pointer"}}>{label}</div>
                ))}
              </div>
              <a href="SEU_LINK_KOFI" target="_blank" rel="noreferrer" style={{textDecoration:"none",display:"block",background:"#FF5E5B",color:"white",fontFamily:"Bebas Neue,sans-serif",fontSize:18,letterSpacing:1,padding:"12px",borderRadius:10,textAlign:"center",marginBottom:10}}>
                ☕ Apoie o FutJogos no Ko-fi
              </a>
              <div style={{fontSize:10,color:"rgba(255,215,0,0.5)",fontWeight:700}}>© 2026 FutJogos · futjogos.vercel.app · Gratuito para sempre ⚽</div>
            </div>

          </div>

          <div style={{width:160,minHeight:"100vh",flexShrink:0,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:80}}>
            <div style={{width:160,height:600,background:"rgba(255,215,0,0.05)",border:"1px dashed rgba(255,215,0,0.2)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:6}}>
              <div style={{fontSize:9,color:"rgba(255,215,0,0.3)",fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Anúncio</div>
              <div style={{fontSize:10,color:"rgba(255,215,0,0.2)",fontWeight:600}}>160×600</div>
            </div>
          </div>

        </div>

        <Toast message={toast.message} type={toast.type}/>
        {showModal&&challenge&&<ResultModal challenge={challenge} playerStates={playerStates} solvedCount={solvedCount} totalAttempts={totalAttempts} onClose={()=>setShowModal(false)}/>}
        {showStats&&<StatsModal onClose={()=>setShowStats(false)}/>}
      </div>
    </>
  );
}

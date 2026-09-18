import { useState, useReducer, useEffect, useRef } from "react";

// ── Design Tokens ──────────────────────────────────────────────────────────
const C = {
  primary: "#1A2F6E", accent: "#E8B84B", success: "#27AE60",
  danger: "#E74C3C", warning: "#F39C12", purple: "#8E44AD",
  orange: "#E67E22", bg: "#F2F5FF", card: "#FFFFFF",
  muted: "#8898AA", text: "#1A2F6E", border: "#E0E7FF",
};

// ── Data ───────────────────────────────────────────────────────────────────
const CONTACTS = [
  { id: "c1", name: "Amara Osei",    phone: "+254712345678", av: "AO" },
  { id: "c2", name: "Kofi Mensah",   phone: "+254723456789", av: "KM" },
  { id: "c3", name: "Fatima Diallo", phone: "+254734567890", av: "FD" },
  { id: "c4", name: "Jomo Waweru",   phone: "+254745678901", av: "JW" },
];

const EMERGENCY_REASONS = [
  { id: "accident",   icon: "🚑", label: "Accident",             color: C.danger,   fields: ["Date of accident","Location / Hospital","Estimated cost (KES)"] },
  { id: "sick",       icon: "🏥", label: "Sick",                 color: C.purple,   fields: ["Condition / Diagnosis","Healthcare facility","Estimated cost (KES)"] },
  { id: "utilities",  icon: "💡", label: "Unable to Pay Utilities", color: C.orange, fields: ["Utility type","Provider / Landlord","Amount owed (KES)"] },
];

const ONBOARDING = [
  { icon: "💸", title: "Send & Receive Instantly", body: "Transfer money to anyone with a phone number — no bank account needed. Fast, private, community-powered.", color: C.primary },
  { icon: "🔒", title: "Savings Vault", body: "Lock away savings that can only be unlocked by the VerifyMe partner app. Your future self will thank you.", color: "#2B4DB5" },
  { icon: "⚡", title: "Emergency Fund", body: "Build a personal emergency buffer. When life happens — accident, illness, or bills — access funds fast.", color: C.danger },
  { icon: "🛡️", title: "VerifyMe Protection", body: "Withdrawals from your vault require VerifyMe authorization. Select your reason, verify identity, and unlock.", color: C.success },
];

const INIT = {
  user: { name: "Zawadi Njeri", phone: "+254700000000", av: "ZN", kycLevel: 2 },
  balance: 12450, savingsBalance: 8200, emergencyBalance: 1500,
  savingsVerified: false, verifierToken: null,
  transactions: [
    { id:"t1", type:"receive",   party:"Kofi Mensah",   amount:2000, date:"Apr 1",  note:"Rent split",       status:"completed" },
    { id:"t2", type:"send",      party:"Fatima Diallo", amount:500,  date:"Mar 31", note:"Groceries",        status:"completed" },
    { id:"t3", type:"save",      party:"Savings Vault", amount:1000, date:"Mar 30", note:"Monthly saving",   status:"completed" },
    { id:"t4", type:"emergency", party:"Emergency Fund",amount:300,  date:"Mar 28", note:"Top-up",           status:"completed" },
    { id:"t5", type:"receive",   party:"Amara Osei",    amount:750,  date:"Mar 27", note:"Work contribution",status:"completed" },
  ],
};

function reducer(s, a) {
  switch (a.type) {
    case "SEND":      return { ...s, balance: s.balance - a.amount, transactions: [{ id:`t${Date.now()}`, type:"send",      party:a.to,           amount:a.amount, date:"Today", note:a.note||"",      status:"completed" }, ...s.transactions] };
    case "SAVE":      return { ...s, balance: s.balance - a.amount, savingsBalance: s.savingsBalance + a.amount, transactions: [{ id:`t${Date.now()}`, type:"save",      party:"Savings Vault", amount:a.amount, date:"Today", note:"Savings deposit",status:"completed" }, ...s.transactions] };
    case "WITHDRAW":  return { ...s, balance: s.balance + a.amount, savingsBalance: s.savingsBalance - a.amount, savingsVerified:false, verifierToken:null, transactions: [{ id:`t${Date.now()}`, type:"withdraw",   party:"Savings Vault", amount:a.amount, date:"Today", note:"Withdrawal",     status:"completed" }, ...s.transactions] };
    case "TOP_EMG":   return { ...s, balance: s.balance - a.amount, emergencyBalance: s.emergencyBalance + a.amount, transactions: [{ id:`t${Date.now()}`, type:"emergency",  party:"Emergency Fund",amount:a.amount, date:"Today", note:"Top-up",          status:"completed" }, ...s.transactions] };
    case "VERIFY":    return { ...s, savingsVerified:true, verifierToken:a.token };
    default: return s;
  }
}

// ── Micro-helpers ──────────────────────────────────────────────────────────
const fmt = n => `KES ${Number(n).toLocaleString("en-KE",{minimumFractionDigits:2})}`;
const txColor = t => ({receive:C.success,send:C.danger,save:"#5B6FD4",withdraw:C.warning,emergency:C.warning,emergency_out:C.danger}[t]||C.muted);
const txIcon  = t => ({receive:"↓",send:"↑",save:"🔒",withdraw:"🔓",emergency:"⚡",emergency_out:"🚨"}[t]||"•");

// ── Primitives ─────────────────────────────────────────────────────────────
const Av = ({ lbl, size=40, bg=C.primary, fg="#fff" }) => (
  <div style={{width:size,height:size,borderRadius:"50%",background:bg,color:fg,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:size*.35,flexShrink:0}}>{lbl}</div>
);

const Btn = ({ children, onClick, variant="primary", disabled, full, small, style:sx }) => {
  const [pressed, setPressed] = useState(false);
  const map = { primary:{bg:C.primary,fg:"#fff"}, accent:{bg:C.accent,fg:C.primary}, danger:{bg:C.danger,fg:"#fff"}, ghost:{bg:"transparent",fg:C.primary,border:`1.5px solid ${C.primary}`}, success:{bg:C.success,fg:"#fff"}, muted:{bg:C.border,fg:C.muted} };
  const v = map[variant]||map.primary;
  return (
    <button onPointerDown={()=>setPressed(true)} onPointerUp={()=>setPressed(false)} onPointerLeave={()=>setPressed(false)} onClick={onClick} disabled={disabled}
      style={{background:v.bg,color:v.fg,border:v.border||"none",borderRadius:12,padding:small?"8px 16px":"12px 22px",fontWeight:700,fontSize:small?12:14,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.45:1,transform:pressed?"scale(0.97)":"scale(1)",transition:"transform 0.1s, opacity 0.2s",width:full?"100%":"auto",...sx}}>
      {children}
    </button>
  );
};

const Field = ({ label, value, onChange, type="text", placeholder, prefix, autoFocus }) => (
  <div style={{marginBottom:14}}>
    {label && <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>{label}</div>}
    <div style={{display:"flex",alignItems:"center",border:`1.5px solid ${C.border}`,borderRadius:12,overflow:"hidden",background:"#fff",transition:"border-color 0.2s"}}
      onFocus={e=>e.currentTarget.style.borderColor=C.primary} onBlur={e=>e.currentTarget.style.borderColor=C.border}>
      {prefix && <span style={{padding:"0 12px",color:C.muted,fontSize:13,borderRight:`1px solid ${C.border}`,alignSelf:"stretch",display:"flex",alignItems:"center"}}>{prefix}</span>}
      <input value={value} onChange={e=>onChange(e.target.value)} type={type} placeholder={placeholder} autoFocus={autoFocus}
        style={{flex:1,border:"none",outline:"none",padding:"12px 14px",fontSize:14,color:C.text,background:"transparent"}} />
    </div>
  </div>
);

const Card = ({ children, style:sx, onClick }) => (
  <div onClick={onClick} style={{background:C.card,borderRadius:16,padding:"16px 18px",boxShadow:"0 2px 12px #1A2F6E0D",marginBottom:14,...sx,cursor:onClick?"pointer":"default"}}>{children}</div>
);

const Toast = ({ msg, color=C.success, onDone }) => {
  useEffect(()=>{ const t=setTimeout(onDone,2200); return()=>clearTimeout(t); },[]);
  return (
    <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:color,color:"#fff",borderRadius:14,padding:"12px 22px",fontWeight:700,fontSize:14,zIndex:9999,boxShadow:"0 4px 20px #0004",animation:"slideDown .3s ease",whiteSpace:"nowrap"}}>
      {msg}
    </div>
  );
};

const Modal = ({ title, onClose, children }) => (
  <div style={{position:"fixed",inset:0,background:"#00000070",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div style={{background:"#fff",borderRadius:"22px 22px 0 0",width:"100%",maxWidth:480,padding:"22px 20px 36px",maxHeight:"88vh",overflowY:"auto",animation:"slideUp .25s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontWeight:800,fontSize:18,color:C.primary}}>{title}</div>
        <button onClick={onClose} style={{background:C.border,border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const PinDots = ({ value, max=4 }) => (
  <div style={{display:"flex",gap:14,justifyContent:"center",margin:"16px 0"}}>
    {Array.from({length:max}).map((_,i)=>(
      <div key={i} style={{width:16,height:16,borderRadius:"50%",background:i<value.length?C.primary:C.border,transition:"background .2s,transform .15s",transform:i<value.length?"scale(1.15)":"scale(1)"}} />
    ))}
  </div>
);

const Numpad = ({ onPress, onDelete }) => {
  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:8}}>
      {keys.map((k,i)=>(
        <button key={i} onClick={()=>k==="⌫"?onDelete():k?onPress(k):null} disabled={!k&&k!=="⌫"}
          style={{padding:"14px 0",fontSize:k==="⌫"?20:18,fontWeight:700,color:k?C.primary:"transparent",background:k?C.bg:"transparent",border:"none",borderRadius:12,cursor:k?"pointer":"default",transition:"background .15s",opacity:k?1:0}}
          onPointerDown={e=>k&&(e.currentTarget.style.background="#D8E0F8")} onPointerUp={e=>k&&(e.currentTarget.style.background=C.bg)}>
          {k}
        </button>
      ))}
    </div>
  );
};

// ── Onboarding ─────────────────────────────────────────────────────────────
function Onboarding({ onDone }) {
  const [idx, setIdx] = useState(0);
  const slide = ONBOARDING[idx];
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",background:`linear-gradient(160deg,${slide.color} 0%,${slide.color}CC 100%)`,padding:"40px 28px 48px",transition:"background .4s"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center"}}>
        <div style={{fontSize:80,marginBottom:24,animation:"pop .4s ease"}}>{slide.icon}</div>
        <div style={{fontWeight:900,fontSize:26,color:"#fff",marginBottom:14,lineHeight:1.2}}>{slide.title}</div>
        <div style={{fontSize:15,color:"#ffffff99",lineHeight:1.7,maxWidth:300}}>{slide.body}</div>
      </div>
      <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:32}}>
        {ONBOARDING.map((_,i)=>(
          <div key={i} onClick={()=>setIdx(i)} style={{height:6,borderRadius:3,background:i===idx?"#fff":"#ffffff44",width:i===idx?28:8,transition:"all .3s",cursor:"pointer"}} />
        ))}
      </div>
      <div style={{display:"flex",gap:12}}>
        {idx < ONBOARDING.length-1
          ? <><Btn onClick={()=>onDone()} variant="ghost" full sx={{color:"#fff",borderColor:"#ffffff44"}}>Skip</Btn><Btn onClick={()=>setIdx(i=>i+1)} variant="accent" full>Next →</Btn></>
          : <Btn onClick={()=>onDone()} variant="accent" full style={{fontSize:16,padding:"16px"}}>Get Started 🚀</Btn>
        }
      </div>
    </div>
  );
}

// ── Home ───────────────────────────────────────────────────────────────────
function Home({ s, dispatch, nav }) {
  const [balVis, setBalVis] = useState(true);
  return (
    <div>
      <div style={{background:`linear-gradient(135deg,${C.primary} 0%,#2B4DB5 100%)`,borderRadius:"0 0 30px 30px",padding:"18px 20px 32px",marginBottom:-14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Av lbl={s.user.av} bg={C.accent} fg={C.primary} size={44}/>
            <div>
              <div style={{color:"#ffffff77",fontSize:11}}>Good day 👋</div>
              <div style={{color:"#fff",fontWeight:800,fontSize:17}}>{s.user.name}</div>
            </div>
          </div>
          <button onClick={()=>nav("howto")} style={{background:"#ffffff20",border:"none",borderRadius:10,padding:"8px 12px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>How it works ❓</button>
        </div>
        <div style={{background:"#ffffff12",borderRadius:18,padding:"18px 20px",backdropFilter:"blur(12px)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{color:"#ffffff77",fontSize:12}}>Available Balance</div>
            <button onClick={()=>setBalVis(v=>!v)} style={{background:"none",border:"none",color:"#ffffff77",fontSize:18,cursor:"pointer"}}>{balVis?"👁":"👁‍🗨"}</button>
          </div>
          <div style={{color:"#fff",fontSize:34,fontWeight:900,margin:"4px 0 14px",transition:"filter .3s",filter:balVis?"none":"blur(10px)"}}>{fmt(s.balance)}</div>
          <div style={{display:"flex",gap:10}}>
            <div onClick={()=>nav("savings")} style={{flex:1,background:"#ffffff10",borderRadius:12,padding:"10px 14px",cursor:"pointer"}}>
              <div style={{color:"#ffffff66",fontSize:10,marginBottom:2}}>🔒 Savings</div>
              <div style={{color:"#fff",fontWeight:800,fontSize:15,filter:balVis?"none":"blur(8px)"}}>{fmt(s.savingsBalance)}</div>
            </div>
            <div onClick={()=>nav("emergency")} style={{flex:1,background:"#ffffff10",borderRadius:12,padding:"10px 14px",cursor:"pointer"}}>
              <div style={{color:"#ffffff66",fontSize:10,marginBottom:2}}>⚡ Emergency</div>
              <div style={{color:C.accent,fontWeight:800,fontSize:15,filter:balVis?"none":"blur(8px)"}}>{fmt(s.emergencyBalance)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{padding:"28px 20px 0"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:24}}>
          {[
            {icon:"↑",label:"Send Money",  screen:"send",  bg:"#EAF2FF",ic:C.primary},
            {icon:"↓",label:"Receive",     screen:"receive",bg:"#E8FFF0",ic:C.success},
            {icon:"🔒",label:"Savings",    screen:"savings",bg:"#FFF3E0",ic:C.warning},
            {icon:"⚡",label:"Emergency",  screen:"emergency",bg:"#FFECEC",ic:C.danger},
          ].map(a=>(
            <button key={a.screen} onClick={()=>nav(a.screen)}
              style={{background:a.bg,border:"none",borderRadius:16,padding:"14px 6px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,transition:"transform .15s,box-shadow .15s"}}
              onPointerDown={e=>{e.currentTarget.style.transform="scale(.95)";e.currentTarget.style.boxShadow=`0 4px 16px ${a.ic}33`;}}
              onPointerUp={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="none";}}
              onPointerLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="none";}}>
              <div style={{width:44,height:44,background:"#fff",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:`0 2px 8px ${a.ic}22`}}>{a.icon}</div>
              <span style={{fontSize:10,fontWeight:700,color:a.ic,textAlign:"center",lineHeight:1.2}}>{a.label}</span>
            </button>
          ))}
        </div>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontWeight:800,fontSize:16,color:C.primary}}>Recent Activity</div>
          <button onClick={()=>nav("history")} style={{background:"none",border:"none",color:C.accent,fontWeight:700,fontSize:13,cursor:"pointer"}}>See all →</button>
        </div>
        {s.transactions.length === 0
          ? <div style={{textAlign:"center",padding:"32px 0",color:C.muted,fontSize:14}}>No transactions yet.<br/>Send or receive money to get started.</div>
          : s.transactions.slice(0,5).map(tx=>(
            <div key={tx.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{width:40,height:40,borderRadius:12,background:txColor(tx.type)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{txIcon(tx.type)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tx.party}</div>
                <div style={{fontSize:11,color:C.muted}}>{tx.note} · {tx.date}</div>
              </div>
              <div style={{fontWeight:800,fontSize:14,color:tx.type==="receive"?C.success:C.danger,flexShrink:0}}>
                {tx.type==="receive"?"+":"-"}{fmt(tx.amount)}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── Send (2 steps) ─────────────────────────────────────────────────────────
function Send({ s, dispatch, nav }) {
  const [step,setStep] = useState(1);
  const [recipient,setRecipient] = useState(null);
  const [phone,setPhone] = useState("");
  const [amount,setAmount] = useState("");
  const [note,setNote] = useState("");
  const [pin,setPin] = useState("");
  const [done,setDone] = useState(false);
  const [err,setErr] = useState("");

  const confirm = () => {
    if(pin==="1234"){
      dispatch({type:"SEND",to:recipient?.name||phone,amount:parseFloat(amount),note});
      setDone(true);
    } else { setErr("Incorrect PIN. Try again."); setPin(""); }
  };

  if(done) return (
    <div style={{textAlign:"center",padding:"48px 24px"}}>
      <div style={{fontSize:72,marginBottom:16,animation:"pop .4s ease"}}>✅</div>
      <div style={{fontWeight:900,fontSize:22,color:C.primary,marginBottom:6}}>Money Sent!</div>
      <div style={{color:C.muted,marginBottom:4}}>You sent</div>
      <div style={{fontWeight:800,fontSize:28,color:C.success,marginBottom:4}}>{fmt(amount)}</div>
      <div style={{color:C.muted,marginBottom:32}}>to <strong>{recipient?.name||phone}</strong></div>
      <Btn onClick={()=>nav("home")} variant="accent" full>Back to Home</Btn>
    </div>
  );

  return (
    <div style={{padding:"0 20px"}}>
      <h2 style={{color:C.primary,marginBottom:4}}>Send Money</h2>
      <div style={{fontSize:13,color:C.muted,marginBottom:20}}>Step {step} of 2</div>
      <div style={{display:"flex",gap:6,marginBottom:20}}>
        {["Recipient & Amount","Confirm with PIN"].map((l,i)=>(
          <div key={i} style={{flex:1,textAlign:"center"}}>
            <div style={{height:4,borderRadius:2,background:step>i?C.primary:C.border,marginBottom:4,transition:"background .3s"}}/>
            <div style={{fontSize:10,color:step===i+1?C.primary:C.muted,fontWeight:step===i+1?700:400}}>{l}</div>
          </div>
        ))}
      </div>

      {step===1 && (
        <>
          <div style={{fontWeight:700,fontSize:12,color:C.muted,marginBottom:10,textTransform:"uppercase",letterSpacing:.5}}>Quick Contacts</div>
          <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:12,marginBottom:16}}>
            {CONTACTS.map(c=>(
              <button key={c.id} onClick={()=>setRecipient(c)}
                style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"10px 14px",borderRadius:14,border:`2px solid ${recipient?.id===c.id?C.primary:C.border}`,background:recipient?.id===c.id?"#EAF2FF":"#fff",cursor:"pointer",transition:"all .2s"}}>
                <Av lbl={c.av} size={40} bg={recipient?.id===c.id?C.primary:C.border} fg={recipient?.id===c.id?"#fff":C.muted}/>
                <span style={{fontSize:11,fontWeight:700,color:C.text,whiteSpace:"nowrap"}}>{c.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
          <Field label="Or enter phone number" value={phone} onChange={v=>{setPhone(v);setRecipient(null);}} placeholder="+254 7XX XXX XXX"/>
          <Field label="Amount (KES)" value={amount} onChange={setAmount} type="number" prefix="KES" placeholder="0.00"/>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
            {[100,500,1000,2000,5000].map(q=>(
              <button key={q} onClick={()=>setAmount(String(q))} style={{padding:"7px 14px",borderRadius:10,border:`1.5px solid ${amount==q?C.primary:C.border}`,background:amount==q?"#EAF2FF":"#fff",fontWeight:700,fontSize:13,cursor:"pointer",transition:"all .15s"}}>
                {fmt(q)}
              </button>
            ))}
          </div>
          <Field label="Note (optional)" value={note} onChange={setNote} placeholder="What's this for?"/>
          <Btn onClick={()=>setStep(2)} disabled={!(recipient||phone)||!amount||parseFloat(amount)<=0} full>Review & Confirm →</Btn>
        </>
      )}

      {step===2 && (
        <>
          <Card style={{borderLeft:`4px solid ${C.success}`}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <Av lbl={recipient?.av||"?"} size={46}/>
              <div>
                <div style={{fontWeight:800,fontSize:16}}>{recipient?.name||phone}</div>
                <div style={{color:C.muted,fontSize:13}}>{recipient?.phone||phone}</div>
              </div>
            </div>
            {[["Sending",fmt(parseFloat(amount))],["Fee","KES 10.00"],["Total",fmt(parseFloat(amount)+10)],["Note",note||"—"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderTop:`1px solid ${C.border}`,fontSize:14}}>
                <span style={{color:C.muted}}>{k}</span><span style={{fontWeight:700}}>{v}</span>
              </div>
            ))}
          </Card>
          <div style={{textAlign:"center",marginBottom:4}}>
            <div style={{fontWeight:700,color:C.primary,fontSize:15}}>Enter your 4-digit PIN</div>
            <div style={{fontSize:12,color:C.muted}}>Demo PIN: 1234</div>
          </div>
          <PinDots value={pin}/>
          {err && <div style={{color:C.danger,fontSize:13,textAlign:"center",marginBottom:8,fontWeight:600}}>{err}</div>}
          <Numpad onPress={k=>pin.length<4&&setPin(p=>p+k)} onDelete={()=>{setPin(p=>p.slice(0,-1));setErr("");}}/>
          <div style={{display:"flex",gap:10,marginTop:14}}>
            <Btn onClick={()=>{setStep(1);setPin("");setErr("");}} variant="ghost" full>← Back</Btn>
            <Btn onClick={confirm} disabled={pin.length<4} variant="primary" full>Send Now ✓</Btn>
          </div>
        </>
      )}
    </div>
  );
}

// ── Receive ────────────────────────────────────────────────────────────────
function Receive({ s }) {
  const [copied,setCopied] = useState(false);
  return (
    <div style={{padding:"0 20px",textAlign:"center"}}>
      <h2 style={{color:C.primary,marginBottom:4}}>Receive Money</h2>
      <p style={{color:C.muted,fontSize:13,marginBottom:24}}>Share your QR code or number to receive payments.</p>
      <div style={{background:"#fff",borderRadius:22,padding:24,boxShadow:"0 4px 24px #1A2F6E12",display:"inline-block",marginBottom:20,position:"relative"}}>
        <svg width="160" height="160" viewBox="0 0 10 10">
          {[...Array(10)].map((_,r)=>[...Array(10)].map((__,c)=>(
            <rect key={`${r}-${c}`} x={c} y={r} width={.9} height={.9} fill={Math.abs(Math.sin(r*7+c*13+42))>.5||(r<3&&c<3)||(r<3&&c>6)||(r>6&&c<3)?C.primary:"transparent"}/>
          )))}
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:C.accent,borderRadius:8,padding:"4px 8px",fontWeight:900,fontSize:11,color:C.primary}}>CP</div>
        </div>
      </div>
      <Card>
        <div style={{fontWeight:800,fontSize:18,color:C.primary,marginBottom:4}}>{s.user.name}</div>
        <div style={{fontSize:15,color:C.muted,marginBottom:14}}>{s.user.phone}</div>
        <Btn onClick={()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);}} variant={copied?"success":"ghost"} full>
          {copied?"✓ Copied!":"📋 Copy Phone Number"}
        </Btn>
      </Card>
      <div style={{background:"#E8FFF0",borderRadius:12,padding:12,fontSize:13,color:C.success,fontWeight:600}}>
        🔒 End-to-end encrypted · No personal data exposed
      </div>
    </div>
  );
}

// ── Savings ────────────────────────────────────────────────────────────────
function Savings({ s, dispatch }) {
  const [view,setView] = useState("main"); // main | deposit | withdraw | verifier
  const [depositAmt,setDepositAmt] = useState("");
  const [withdrawAmt,setWithdrawAmt] = useState("");
  const [toast,setToast] = useState(null);

  const doDeposit = () => {
    const amt = parseFloat(depositAmt);
    if(!amt||amt<=0) return;
    dispatch({type:"SAVE",amount:amt});
    setDepositAmt(""); setView("main");
    setToast({msg:`🔒 ${fmt(amt)} locked in Savings Vault`,color:C.primary});
  };
  const doWithdraw = () => {
    const amt = parseFloat(withdrawAmt);
    if(!amt||amt<=0||amt>s.savingsBalance) return;
    dispatch({type:"WITHDRAW",amount:amt});
    setWithdrawAmt(""); setView("main");
    setToast({msg:`✅ ${fmt(amt)} moved to balance`,color:C.success});
  };

  return (
    <div style={{padding:"0 20px"}}>
      {toast && <Toast msg={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}

      {view==="main" && (
        <>
          <h2 style={{color:C.primary,marginBottom:4}}>Savings Vault</h2>
          <p style={{color:C.muted,fontSize:13,marginBottom:16}}>Funds here are locked until VerifyMe authorizes withdrawal.</p>
          <div style={{background:`linear-gradient(135deg,#1A2F6E,#2B4DB5)`,borderRadius:18,padding:"22px 20px",marginBottom:18,textAlign:"center"}}>
            <div style={{color:"#ffffff77",fontSize:12,marginBottom:4}}>Vault Balance</div>
            <div style={{color:"#fff",fontSize:38,fontWeight:900}}>{fmt(s.savingsBalance)}</div>
            <div style={{marginTop:10}}>
              {s.savingsVerified
                ? <span style={{background:C.success+"33",color:C.success,borderRadius:20,padding:"4px 14px",fontSize:12,fontWeight:700,border:`1px solid ${C.success}55`}}>✅ VerifyMe Authorized</span>
                : <span style={{background:"#ffffff18",color:"#ffffff99",borderRadius:20,padding:"4px 14px",fontSize:12,fontWeight:700}}>🔒 Locked</span>}
            </div>
          </div>

          {/* Goals */}
          <Card>
            <div style={{fontWeight:700,marginBottom:12,color:C.primary}}>📊 Savings Goals</div>
            {[{label:"Emergency Buffer",target:10000,pct:41},{label:"Annual Vacation",target:50000,pct:16}].map(g=>(
              <div key={g.label} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}>
                  <span style={{fontWeight:600}}>{g.label}</span>
                  <span style={{color:C.muted}}>{g.pct}%</span>
                </div>
                <div style={{background:C.bg,borderRadius:6,height:8,overflow:"hidden"}}>
                  <div style={{background:C.primary,borderRadius:6,height:8,width:`${g.pct}%`,transition:"width 1s ease"}}/>
                </div>
              </div>
            ))}
          </Card>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Btn onClick={()=>setView("deposit")} variant="accent" full>＋ Deposit</Btn>
            <Btn onClick={()=>s.savingsVerified?setView("withdraw"):setView("verifier")} variant={s.savingsVerified?"success":"ghost"} full>
              {s.savingsVerified?"🔓 Withdraw":"🔐 Unlock & Withdraw"}
            </Btn>
          </div>
        </>
      )}

      {view==="deposit" && (
        <>
          <button onClick={()=>setView("main")} style={{background:"none",border:"none",color:C.primary,fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:16,padding:0}}>← Back</button>
          <h3 style={{color:C.primary,marginBottom:4}}>Add to Vault</h3>
          <p style={{color:C.muted,fontSize:13,marginBottom:18}}>Once deposited, funds are locked until VerifyMe authorizes withdrawal.</p>
          <Field label="Amount (KES)" value={depositAmt} onChange={setDepositAmt} type="number" prefix="KES" placeholder="0.00" autoFocus/>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:18}}>
            {[500,1000,2500,5000].map(q=>(
              <button key={q} onClick={()=>setDepositAmt(String(q))} style={{padding:"7px 14px",borderRadius:10,border:`1.5px solid ${depositAmt==q?C.primary:C.border}`,background:depositAmt==q?"#EAF2FF":"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>+{fmt(q)}</button>
            ))}
          </div>
          <div style={{background:"#FFF8E6",borderRadius:12,padding:12,marginBottom:18,fontSize:13,color:C.warning}}>
            ⚠️ Deposited funds require VerifyMe authorization to withdraw.
          </div>
          <Btn onClick={doDeposit} disabled={!depositAmt||parseFloat(depositAmt)<=0} variant="accent" full>Lock into Vault 🔒</Btn>
        </>
      )}

      {view==="withdraw" && s.savingsVerified && (
        <>
          <button onClick={()=>setView("main")} style={{background:"none",border:"none",color:C.primary,fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:16,padding:0}}>← Back</button>
          <h3 style={{color:C.primary,marginBottom:4}}>Withdraw from Vault</h3>
          <div style={{background:"#E8FFF0",borderRadius:12,padding:12,marginBottom:18,fontSize:13,color:C.success,fontWeight:600}}>✅ VerifyMe authorized this session.</div>
          <Field label="Amount (KES)" value={withdrawAmt} onChange={setWithdrawAmt} type="number" prefix="KES" placeholder="0.00" autoFocus/>
          <Btn onClick={doWithdraw} disabled={!withdrawAmt||parseFloat(withdrawAmt)<=0||parseFloat(withdrawAmt)>s.savingsBalance} variant="success" full>Withdraw to Balance</Btn>
        </>
      )}

      {view==="verifier" && (
        <VerifyMe onClose={()=>setView("main")} onApprove={token=>{dispatch({type:"VERIFY",token});setView("withdraw");setToast({msg:"🛡️ VerifyMe authorized!",color:C.success});}}/>
      )}
    </div>
  );
}

// ── Emergency (single flow) ────────────────────────────────────────────────
function Emergency({ s, dispatch }) {
  const [mode,setMode] = useState("home"); // home | request | topup
  const [step,setStep] = useState(1);
  const [reason,setReason] = useState(null);
  const [fields,setFields] = useState({});
  const [amount,setAmount] = useState("");
  const [topupAmt,setTopupAmt] = useState("");
  const [done,setDone] = useState(false);
  const [toast,setToast] = useState(null);
  const r = EMERGENCY_REASONS.find(x=>x.id===reason);
  const allFilled = r && r.fields.every(f=>(fields[f]||"").trim());

  if(mode==="home") return (
    <div style={{padding:"0 20px"}}>
      {toast && <Toast msg={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      <h2 style={{color:C.primary,marginBottom:4}}>Emergency Fund</h2>
      <p style={{color:C.muted,fontSize:13,marginBottom:16}}>Community-backed access for urgent needs.</p>
      <div style={{background:`linear-gradient(135deg,#C0392B,#E74C3C)`,borderRadius:18,padding:"20px",marginBottom:18,textAlign:"center"}}>
        <div style={{color:"#ffffff88",fontSize:12,marginBottom:4}}>Emergency Balance</div>
        <div style={{color:"#fff",fontSize:36,fontWeight:900}}>{fmt(s.emergencyBalance)}</div>
        <div style={{color:"#ffffff77",fontSize:12,marginTop:4}}>Standard Tier · Limit KES 2,000</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
        <button onClick={()=>{setMode("request");setStep(1);setDone(false);}} style={{background:"#FFECEC",borderRadius:16,padding:"18px 12px",border:`2px solid ${C.danger}22`,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
          <span style={{fontSize:28}}>🚨</span>
          <span style={{fontWeight:700,fontSize:13,color:C.danger}}>Request Funds</span>
          <span style={{fontSize:11,color:C.muted,textAlign:"center"}}>Accident, illness, utilities</span>
        </button>
        <button onClick={()=>setMode("topup")} style={{background:"#FFF3E0",borderRadius:16,padding:"18px 12px",border:`2px solid ${C.warning}22`,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
          <span style={{fontSize:28}}>💰</span>
          <span style={{fontWeight:700,fontSize:13,color:C.warning}}>Top Up Fund</span>
          <span style={{fontSize:11,color:C.muted,textAlign:"center"}}>Add money for emergencies</span>
        </button>
      </div>
      <Card>
        <div style={{fontWeight:700,color:C.primary,marginBottom:10}}>ℹ️ How Emergency Requests Work</div>
        {["Select your emergency reason","Fill in basic details","Submit — reviewed within minutes","Funds disbursed to your balance"].map((t,i)=>(
          <div key={i} style={{display:"flex",gap:10,marginBottom:8,alignItems:"flex-start"}}>
            <div style={{background:C.danger,borderRadius:"50%",width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff",flexShrink:0}}>{i+1}</div>
            <div style={{fontSize:13,color:C.muted}}>{t}</div>
          </div>
        ))}
      </Card>
    </div>
  );

  if(mode==="topup") return (
    <div style={{padding:"0 20px"}}>
      {toast && <Toast msg={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}
      <button onClick={()=>setMode("home")} style={{background:"none",border:"none",color:C.primary,fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:16,padding:0}}>← Back</button>
      <h3 style={{color:C.primary,marginBottom:18}}>Top Up Emergency Fund</h3>
      <Field label="Amount (KES)" value={topupAmt} onChange={setTopupAmt} type="number" prefix="KES" autoFocus/>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:18}}>
        {[200,500,1000,2000].map(q=>(
          <button key={q} onClick={()=>setTopupAmt(String(q))} style={{padding:"7px 14px",borderRadius:10,border:`1.5px solid ${topupAmt==q?C.danger:C.border}`,background:topupAmt==q?"#FFECEC":"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>+{fmt(q)}</button>
        ))}
      </div>
      <Btn onClick={()=>{dispatch({type:"TOP_EMG",amount:parseFloat(topupAmt)});setTopupAmt("");setMode("home");setToast({msg:`⚡ Emergency fund topped up`,color:C.warning});}} disabled={!topupAmt||parseFloat(topupAmt)<=0} variant="danger" full>Add to Emergency Fund</Btn>
    </div>
  );

  // Request flow
  if(done) return (
    <div style={{padding:"24px 20px",textAlign:"center"}}>
      <div style={{fontSize:72,marginBottom:16,animation:"pop .4s ease"}}>📨</div>
      <div style={{fontWeight:900,fontSize:22,color:C.primary,marginBottom:8}}>Request Submitted!</div>
      <div style={{color:C.muted,fontSize:14,marginBottom:6}}>Your emergency request for</div>
      <div style={{fontWeight:800,fontSize:24,color:C.danger,marginBottom:6}}>{fmt(amount)}</div>
      <div style={{color:C.muted,fontSize:14,marginBottom:8}}>is under review. You'll be notified shortly.</div>
      <div style={{background:"#FFF8E6",borderRadius:12,padding:12,fontSize:13,color:C.warning,marginBottom:28}}>Reason: {r?.icon} {r?.label}</div>
      <Btn onClick={()=>{setMode("home");setStep(1);setReason(null);setFields({});setAmount("");}} variant="accent" full>Back to Emergency Fund</Btn>
    </div>
  );

  return (
    <div style={{padding:"0 20px"}}>
      <button onClick={()=>{if(step>1)setStep(s=>s-1);else setMode("home");}} style={{background:"none",border:"none",color:C.primary,fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:14,padding:0}}>← Back</button>
      <div style={{display:"flex",gap:6,marginBottom:20}}>
        {["Reason","Details","Amount"].map((l,i)=>(
          <div key={i} style={{flex:1}}>
            <div style={{height:4,borderRadius:2,background:step>i?C.danger:C.border,marginBottom:4,transition:"background .3s"}}/>
            <div style={{fontSize:10,color:step===i+1?C.danger:C.muted,fontWeight:step===i+1?700:400,textAlign:"center"}}>{l}</div>
          </div>
        ))}
      </div>

      {step===1 && (
        <>
          <div style={{fontWeight:700,fontSize:15,color:C.primary,marginBottom:14}}>What is your emergency?</div>
          {EMERGENCY_REASONS.map(re=>(
            <div key={re.id} onClick={()=>setReason(re.id)}
              style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:14,border:`2px solid ${reason===re.id?re.color:C.border}`,background:reason===re.id?re.color+"0E":"#fff",cursor:"pointer",marginBottom:10,transition:"all .2s"}}>
              <div style={{fontSize:28,width:46,height:46,background:re.color+"15",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{re.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:15,color:reason===re.id?re.color:C.text}}>{re.label}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:2}}>{re.fields.slice(0,2).join(" · ")}</div>
              </div>
              <div style={{width:20,height:20,borderRadius:"50%",border:`2px solid ${reason===re.id?re.color:"#C0CCDF"}`,background:reason===re.id?re.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {reason===re.id&&<div style={{width:8,height:8,borderRadius:"50%",background:"#fff"}}/>}
              </div>
            </div>
          ))}
          <Btn onClick={()=>setStep(2)} disabled={!reason} variant="danger" full style={{marginTop:4}}>Continue →</Btn>
        </>
      )}

      {step===2 && r && (
        <>
          <div style={{display:"flex",alignItems:"center",gap:10,background:r.color+"12",borderRadius:12,padding:"12px 14px",marginBottom:18}}>
            <span style={{fontSize:26}}>{r.icon}</span>
            <div><div style={{fontWeight:800,color:r.color}}>{r.label}</div><div style={{fontSize:12,color:C.muted}}>Fill in the details below</div></div>
          </div>
          {r.fields.map(f=>(
            <Field key={f} label={f} value={fields[f]||""} onChange={v=>setFields(p=>({...p,[f]:v}))} placeholder={`Enter ${f.toLowerCase()}…`}/>
          ))}
          <div style={{background:"#F8F9FF",borderRadius:10,padding:12,marginBottom:16,fontSize:12,color:C.muted}}>🔒 Your information is encrypted and used only for verification.</div>
          <Btn onClick={()=>setStep(3)} disabled={!allFilled} variant="danger" full>Continue →</Btn>
        </>
      )}

      {step===3 && (
        <>
          <div style={{display:"flex",alignItems:"center",gap:10,background:r.color+"12",borderRadius:12,padding:"12px 14px",marginBottom:18}}>
            <span style={{fontSize:26}}>{r.icon}</span>
            <div style={{fontWeight:800,color:r.color}}>{r.label}</div>
          </div>
          <Field label="Amount needed (KES)" value={amount} onChange={setAmount} type="number" prefix="KES" placeholder="0.00" autoFocus/>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
            {[500,1000,1500,2000].map(q=>(
              <button key={q} onClick={()=>setAmount(String(q))} style={{padding:"7px 14px",borderRadius:10,border:`1.5px solid ${amount==q?C.danger:C.border}`,background:amount==q?"#FFECEC":"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>+{fmt(q)}</button>
            ))}
          </div>
          <Card style={{background:"#FFF8E6",borderLeft:`4px solid ${C.warning}`}}>
            <div style={{fontSize:13,color:C.warning,fontWeight:600}}>⚡ Requests are reviewed within minutes. Community moderators may follow up for amounts above KES 1,500.</div>
          </Card>
          <Btn onClick={()=>setDone(true)} disabled={!amount||parseFloat(amount)<=0} variant="danger" full>Submit Request 🚨</Btn>
        </>
      )}
    </div>
  );
}

// ── VerifyMe ───────────────────────────────────────────────────────────────
function VerifyMe({ onClose, onApprove }) {
  const [step,setStep] = useState(1);
  const [reason,setReason] = useState(null);
  const [fields,setFields] = useState({});
  const [pin,setPin] = useState("");
  const [scanning,setScanning] = useState(false);
  const [token] = useState(`VM-${Math.random().toString(36).slice(2,10).toUpperCase()}`);
  const r = EMERGENCY_REASONS.find(x=>x.id===reason);
  const allFilled = r && r.fields.every(f=>(fields[f]||"").trim());

  const doVerify = () => {
    if(pin==="9999"){ setScanning(true); setTimeout(()=>{ setScanning(false); setStep(4); },2200); }
  };

  return (
    <div style={{padding:"0 0 20px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:22,padding:"0 0 16px",borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontSize:28}}>🛡️</div>
        <div><div style={{fontWeight:900,fontSize:17,color:C.primary}}>VerifyMe</div><div style={{fontSize:12,color:C.muted}}>Partner authorization for CommUnity Pay</div></div>
      </div>

      {/* Step dots */}
      <div style={{display:"flex",gap:6,marginBottom:22}}>
        {["Reason","Details","Verify","Done"].map((l,i)=>(
          <div key={i} style={{flex:1}}>
            <div style={{height:4,borderRadius:2,background:step>i?C.success:C.border,marginBottom:4,transition:"background .3s"}}/>
            <div style={{fontSize:9,textAlign:"center",color:step===i+1?C.success:C.muted,fontWeight:step===i+1?700:400}}>{l}</div>
          </div>
        ))}
      </div>

      {step===1 && (
        <>
          <div style={{fontWeight:700,fontSize:15,color:C.primary,marginBottom:14}}>Why are you withdrawing?</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:14}}>This is confidential and used only for authorization.</div>
          {EMERGENCY_REASONS.map(re=>(
            <div key={re.id} onClick={()=>setReason(re.id)}
              style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",borderRadius:14,border:`2px solid ${reason===re.id?re.color:C.border}`,background:reason===re.id?re.color+"0D":"#fff",cursor:"pointer",marginBottom:10,transition:"all .2s"}}>
              <span style={{fontSize:24}}>{re.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,color:reason===re.id?re.color:C.text,fontSize:14}}>{re.label}</div>
                <div style={{fontSize:11,color:C.muted}}>{re.desc}</div>
              </div>
              <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${reason===re.id?re.color:"#C0CCDF"}`,background:reason===re.id?re.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {reason===re.id&&<div style={{width:7,height:7,borderRadius:"50%",background:"#fff"}}/>}
              </div>
            </div>
          ))}
          <div style={{display:"flex",gap:10,marginTop:4}}>
            <Btn onClick={onClose} variant="ghost" full>Cancel</Btn>
            <Btn onClick={()=>setStep(2)} disabled={!reason} variant="success" full>Next →</Btn>
          </div>
        </>
      )}

      {step===2 && r && (
        <>
          <div style={{display:"flex",alignItems:"center",gap:10,background:r.color+"12",borderRadius:12,padding:"12px",marginBottom:16}}>
            <span style={{fontSize:22}}>{r.icon}</span>
            <div style={{fontWeight:800,color:r.color}}>{r.label}</div>
          </div>
          {r.fields.map(f=>(
            <Field key={f} label={f} value={fields[f]||""} onChange={v=>setFields(p=>({...p,[f]:v}))} placeholder={`Enter ${f.toLowerCase()}…`}/>
          ))}
          <div style={{background:"#F8F9FF",borderRadius:10,padding:10,marginBottom:14,fontSize:11,color:C.muted}}>🔒 Encrypted · Shared only with CommUnity Pay verification team</div>
          <div style={{display:"flex",gap:10}}>
            <Btn onClick={()=>setStep(1)} variant="ghost" full>← Back</Btn>
            <Btn onClick={()=>setStep(3)} disabled={!allFilled} variant="success" full>Continue →</Btn>
          </div>
        </>
      )}

      {step===3 && (
        <div style={{textAlign:"center"}}>
          <div style={{fontWeight:700,fontSize:15,color:C.primary,marginBottom:4}}>Enter VerifyMe PIN</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:2}}>Demo PIN: 9999</div>
          <PinDots value={pin}/>
          {scanning && (
            <div style={{marginBottom:12}}>
              <div style={{background:C.bg,borderRadius:8,height:8,overflow:"hidden"}}>
                <div style={{background:C.success,height:8,animation:"progress 2.2s linear",width:"100%"}}/>
              </div>
              <div style={{fontSize:12,color:C.muted,marginTop:6}}>Verifying with VerifyMe servers…</div>
            </div>
          )}
          <Numpad onPress={k=>!scanning&&pin.length<4&&setPin(p=>p+k)} onDelete={()=>!scanning&&setPin(p=>p.slice(0,-1))}/>
          <div style={{display:"flex",gap:10,marginTop:14}}>
            <Btn onClick={()=>setStep(2)} variant="ghost" full disabled={scanning}>← Back</Btn>
            <Btn onClick={doVerify} disabled={pin.length<4||scanning} variant="success" full>{scanning?"Verifying…":"Authorize ✓"}</Btn>
          </div>
        </div>
      )}

      {step===4 && (
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:64,marginBottom:14,animation:"pop .4s ease"}}>✅</div>
          <div style={{fontWeight:900,fontSize:20,color:C.success,marginBottom:6}}>Authorized!</div>
          <div style={{color:C.muted,fontSize:13,marginBottom:4}}>Reason: <strong style={{color:r?.color}}>{r?.icon} {r?.label}</strong></div>
          <div style={{background:C.bg,borderRadius:10,padding:10,margin:"14px 0",fontFamily:"monospace",fontSize:11,color:C.primary,wordBreak:"break-all",textAlign:"left"}}>
            <div style={{color:C.muted,fontSize:10,marginBottom:3}}>AUTH TOKEN</div>{token}
          </div>
          <Btn onClick={()=>onApprove(token)} variant="success" full>Return to CommUnity Pay →</Btn>
        </div>
      )}
    </div>
  );
}

// ── History ────────────────────────────────────────────────────────────────
function History({ s }) {
  const filters = ["all","send","receive","save","emergency"];
  const [f,setF] = useState("all");
  const list = f==="all" ? s.transactions : s.transactions.filter(t=>t.type===f||t.type.startsWith(f));
  return (
    <div style={{padding:"0 20px"}}>
      <h2 style={{color:C.primary,marginBottom:14}}>Transaction History</h2>
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:10,marginBottom:16}}>
        {filters.map(t=>(
          <button key={t} onClick={()=>setF(t)} style={{flexShrink:0,padding:"7px 16px",borderRadius:20,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,background:f===t?C.primary:C.bg,color:f===t?"#fff":C.muted,transition:"all .2s"}}>
            {t[0].toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>
      {list.length===0
        ? <div style={{textAlign:"center",padding:"40px 0",color:C.muted}}><div style={{fontSize:40,marginBottom:8}}>📭</div>No transactions yet.</div>
        : list.map(tx=>(
          <div key={tx.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{width:42,height:42,borderRadius:13,background:txColor(tx.type)+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{txIcon(tx.type)}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tx.party}</div>
              <div style={{fontSize:11,color:C.muted}}>{tx.note} · {tx.date}</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontWeight:800,fontSize:14,color:tx.type==="receive"?C.success:C.danger}}>{tx.type==="receive"?"+":"-"}{fmt(tx.amount)}</div>
              <div style={{fontSize:10,color:C.success,fontWeight:600}}>{tx.status}</div>
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ── Profile ────────────────────────────────────────────────────────────────
function Profile({ s }) {
  return (
    <div style={{padding:"0 20px"}}>
      <div style={{textAlign:"center",padding:"20px 0 22px"}}>
        <Av lbl={s.user.av} size={74} bg={C.accent} fg={C.primary}/>
        <div style={{fontWeight:900,fontSize:20,color:C.primary,marginTop:12}}>{s.user.name}</div>
        <div style={{color:C.muted,marginBottom:10}}>{s.user.phone}</div>
        <span style={{background:C.success+"22",color:C.success,borderRadius:20,padding:"4px 14px",fontSize:12,fontWeight:700,border:`1px solid ${C.success}55`}}>Full KYC ✓</span>
      </div>
      <Card>
        <div style={{fontWeight:700,marginBottom:12,color:C.primary}}>🛡️ Privacy & Security</div>
        {[["End-to-End Encryption","Enabled ✓",C.success],["Biometric Lock","Enabled ✓",C.success],["Data Sharing","None",C.success],["Transaction Privacy","Local-first",C.success]].map(([k,v,col])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderTop:`1px solid ${C.border}`,fontSize:14}}>
            <span style={{color:C.muted}}>{k}</span><span style={{fontWeight:700,color:col}}>{v}</span>
          </div>
        ))}
      </Card>
      <Card>
        <div style={{fontWeight:700,marginBottom:10,color:C.primary}}>🌍 Open Source</div>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.7}}>CommUnity Pay is open source under the MIT License. No ads, no data selling. Community-governed via DAO proposals.</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:12}}>
          {["MIT License","DAO Governed","No KYC Leaks","Privacy-first"].map(tag=>(
            <span key={tag} style={{background:C.bg,color:C.primary,borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:700}}>{tag}</span>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── How It Works ───────────────────────────────────────────────────────────
function HowItWorks({ nav }) {
  const items = [
    { icon:"↑↓", title:"Send & Receive", body:"Tap Send to transfer money to any contact or phone number in 2 quick steps. Tap Receive to share your QR code or phone number.", color:C.primary },
    { icon:"🔒", title:"Savings Vault", body:"Move money into your locked Savings Vault. Withdrawals only work after VerifyMe authorizes them — keeping you protected from impulse spending.", color:"#2B4DB5" },
    { icon:"🛡️", title:"VerifyMe Authorization", body:"VerifyMe is a partner app that verifies your identity and reason before unlocking a savings withdrawal. Select Accident, Sick, or Utilities, fill in details, and enter your VerifyMe PIN (9999 in demo).", color:C.success },
    { icon:"⚡", title:"Emergency Fund", body:"Build a personal emergency pool. When you need urgent funds, submit a request in 3 steps: pick your reason, add details, and enter the amount. Reviewed within minutes.", color:C.danger },
    { icon:"🔢", title:"PINs in this demo", body:"CommUnity Pay PIN: 1234\nVerifyMe PIN: 9999", color:C.accent },
  ];
  return (
    <div style={{padding:"0 20px"}}>
      <h2 style={{color:C.primary,marginBottom:4}}>How It Works</h2>
      <p style={{color:C.muted,fontSize:13,marginBottom:20}}>A quick guide to CommUnity Pay.</p>
      {items.map((it,i)=>(
        <Card key={i} style={{borderLeft:`4px solid ${it.color}`}}>
          <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
            <div style={{width:42,height:42,borderRadius:12,background:it.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{it.icon}</div>
            <div>
              <div style={{fontWeight:800,fontSize:15,color:it.color,marginBottom:4}}>{it.title}</div>
              <div style={{fontSize:13,color:C.muted,lineHeight:1.6,whiteSpace:"pre-line"}}>{it.body}</div>
            </div>
          </div>
        </Card>
      ))}
      <Btn onClick={()=>nav("home")} variant="accent" full>Got it — Back to Home 🏠</Btn>
    </div>
  );
}

// ── Nav ────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id:"home",      icon:"🏠", label:"Home"      },
  { id:"send",      icon:"↑",  label:"Send"      },
  { id:"savings",   icon:"🔒", label:"Savings"   },
  { id:"emergency", icon:"⚡", label:"Emergency" },
  { id:"profile",   icon:"👤", label:"Profile"   },
];

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [showOnboard, setShowOnboard] = useState(true);
  const [screen, setScreen] = useState("home");
  const [state, dispatch] = useReducer(reducer, INIT);
  const nav = s => setScreen(s);

  const SCREENS = { home:Home, send:Send, receive:Receive, savings:Savings, emergency:Emergency, history:History, profile:Profile, howto:HowItWorks };
  const Screen = SCREENS[screen]||Home;
  const mainScreens = NAV_ITEMS.map(n=>n.id);

  if(showOnboard) return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",maxWidth:480,margin:"0 auto"}}>
      <style>{`*{box-sizing:border-box;margin:0;}@keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}@keyframes pop{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}@keyframes progress{from{width:0}to{width:100%}}`}</style>
      <Onboarding onDone={()=>setShowOnboard(false)}/>
    </div>
  );

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",background:C.bg,minHeight:"100vh",maxWidth:480,margin:"0 auto",paddingBottom:76,color:C.text}}>
      <style>{`*{box-sizing:border-box;margin:0;}@keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}@keyframes pop{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}@keyframes progress{from{width:0}to{width:100%}}`}</style>

      {/* Header */}
      <div style={{background:C.primary,padding:"12px 20px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:50}}>
        <div style={{color:C.accent,fontWeight:900,fontSize:18,letterSpacing:.3}}>CommUnity Pay</div>
        <div style={{color:"#ffffff55",fontSize:11}}>🌐 Open · Private</div>
      </div>

      {/* Sub-screen back */}
      {!mainScreens.includes(screen) && screen!=="howto" && (
        <button onClick={()=>nav("home")} style={{background:"none",border:"none",color:C.primary,fontWeight:700,padding:"12px 20px 4px",cursor:"pointer",fontSize:14}}>← Home</button>
      )}

      <div style={{paddingTop:screen==="home"?0:14}}>
        <Screen s={state} dispatch={dispatch} nav={nav}/>
      </div>

      {/* Bottom Nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"#fff",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-around",padding:"8px 0 14px",zIndex:100,boxShadow:"0 -4px 20px #1A2F6E0A"}}>
        {NAV_ITEMS.map(n=>(
          <button key={n.id} onClick={()=>nav(n.id)}
            style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",cursor:"pointer",padding:"4px 14px",borderRadius:12,transition:"transform .15s",minWidth:52}}
            onPointerDown={e=>e.currentTarget.style.transform="scale(.9)"} onPointerUp={e=>e.currentTarget.style.transform="scale(1)"} onPointerLeave={e=>e.currentTarget.style.transform="scale(1)"}>
            <span style={{fontSize:n.id==="send"?22:20,filter:screen===n.id?"none":"grayscale(40%)",transition:"filter .2s"}}>{n.icon}</span>
            <span style={{fontSize:10,fontWeight:screen===n.id?800:500,color:screen===n.id?C.primary:C.muted,transition:"color .2s"}}>{n.label}</span>
            {screen===n.id && <div style={{width:18,height:3,background:C.accent,borderRadius:2}}/>}
          </button>
        ))}
      </div>
    </div>
  );
}
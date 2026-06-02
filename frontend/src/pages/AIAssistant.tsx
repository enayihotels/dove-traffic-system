import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Loader2, User, Sparkles, Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import api from "../api/client";

interface Msg { role: "user"|"assistant"; content: string; }

const QUICK = [
  "How many children still need collecting?",
  "Predict today's peak arrival time",
  "Are there any safeguarding flags?",
  "Generate a session summary",
  "How can I speed up the queue?",
];

export default function AIAssistant() {
  const [msgs, setMsgs] = useState<Msg[]>([{
    role:"assistant",
    content:"Hello! I'm the Doveland AI assistant, powered by Claude.\n\nI can analyse the queue, predict peak times, check safeguarding flags, and write session reports. How can I help?",
  }]);
  const [input, setInput] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  const chat = useMutation({
    mutationFn: (message:string) => api.post("/ai/chat/", { message }),
    onSuccess: r => setMsgs(p=>[...p,{role:"assistant",content:r.data.reply}]),
    onError:   () => setMsgs(p=>[...p,{role:"assistant",content:"AI error â€” check ANTHROPIC_API_KEY in backend\\.env"}]),
  });

  const send = (text?:string) => {
    const m = (text??input).trim();
    if (!m || chat.isPending) return;
    setMsgs(p=>[...p,{role:"user",content:m}]);
    setInput("");
    chat.mutate(m);
  };

  useEffect(() => { bottom.current?.scrollIntoView({behavior:"smooth"}); }, [msgs, chat.isPending]);

  return (
    <div className="max-w-2xl mx-auto flex flex-col" style={{height:"calc(100vh - 8rem)"}}>
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-jade/12 border border-jade/35 rounded-xl flex items-center justify-center shadow-glow-jade">
            <Bot size={19} className="text-jade"/>
          </div>
          <div>
            <h1 className="page-title">AI Assistant</h1>
            <p className="muted text-xs flex items-center gap-1"><Sparkles size={10} className="text-amber"/> Powered by Claude Â· Safeguarding-aware</p>
          </div>
        </div>
        <button onClick={()=>setMsgs([{role:"assistant",content:"Conversation cleared. How can I help?"}])} className="btn-ghost btn-sm rounded-xl"><Trash2 size={13}/> Clear</button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-3 pr-1">
        <AnimatePresence initial={false}>
          {msgs.map((m,i) => (
            <motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.2}}
              className={`flex gap-3 ${m.role==="user"?"flex-row-reverse":""}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role==="assistant"?"bg-jade/18 border border-jade/35":"bg-night-100 border border-white/14"}`}>
                {m.role==="assistant"?<Bot size={13} className="text-jade"/>:<User size={13} className="text-white/65"/>}
              </div>
              <div className={`max-w-[84%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${m.role==="assistant"?"bg-night-100/80 border border-white/8 text-white/90 rounded-tl-sm":"bg-jade/18 border border-jade/28 text-white rounded-tr-sm"}`}>
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {chat.isPending && (
          <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} className="flex gap-3">
            <div className="w-8 h-8 bg-jade/18 border border-jade/35 rounded-full flex items-center justify-center"><Loader2 size={13} className="text-jade animate-spin"/></div>
            <div className="bg-night-100/80 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5">
                {[0,1,2].map(i=>(
                  <motion.div key={i} className="w-1.5 h-1.5 bg-jade rounded-full"
                    animate={{opacity:[0.3,1,0.3],scale:[1,1.3,1]}} transition={{duration:1,repeat:Infinity,delay:i*0.22}}/>
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={bottom}/>
      </div>

      {msgs.length<=1 && (
        <div className="flex flex-wrap gap-2 mb-3 shrink-0">
          {QUICK.map(q=>(
            <button key={q} onClick={()=>send(q)} className="text-xs bg-night-100/50 border border-white/10 rounded-full px-3 py-1.5 text-slate hover:text-white hover:border-jade/32 transition-all">
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 shrink-0">
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
          className="input flex-1" placeholder="Ask about queue, children, safeguardingâ€¦" disabled={chat.isPending}/>
        <button onClick={()=>send()} disabled={!input.trim()||chat.isPending} className="btn-primary btn-md px-4"><Send size={15}/></button>
      </div>
    </div>
  );
}
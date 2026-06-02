import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Loader2, GraduationCap } from "lucide-react";
import api from "../api/client";
import type { Student, YearGroup } from "../types";

export default function Students() {
  const [q, setQ]   = useState("");
  const [yg, setYG] = useState("all");

  const { data:students=[], isLoading } = useQuery<Student[]>({
    queryKey:["students"],
    queryFn: () => api.get("/students/").then(r=>Array.isArray(r.data)?r.data:(r.data.results??[])),
  });
  const { data:ygs=[] } = useQuery<YearGroup[]>({
    queryKey:["year-groups"],
    queryFn: () => api.get("/students/year-groups/").then(r=>Array.isArray(r.data)?r.data:(r.data.results??[])),
  });

  const filtered = students.filter(s => {
    const ms = q===""||s.full_name.toLowerCase().includes(q.toLowerCase())||s.pupil_reference.toLowerCase().includes(q.toLowerCase());
    return ms && (yg==="all"||s.year_group_name===yg);
  });

  return (
    <div className="space-y-5 max-w-5xl">
      <div><h1 className="page-title">Students</h1><p className="muted mt-1">{students.length} enrolled</p></div>
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate"/>
          <input value={q} onChange={e=>setQ(e.target.value)} className="input pl-10 text-sm" placeholder="Search name or referenceâ€¦"/>
        </div>
        <select value={yg} onChange={e=>setYG(e.target.value)} className="input w-auto text-sm">
          <option value="all">All year groups</option>
          {ygs.map(g=><option key={g.id} value={g.display_name}>{g.display_name}</option>)}
        </select>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={26} className="animate-spin text-jade"/></div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((s,i) => (
            <motion.div key={s.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.022}} className="card flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                   style={{backgroundColor:s.year_group_colour+"1F",border:`1px solid ${s.year_group_colour}3D`,color:s.year_group_colour}}>
                {s.first_name[0]}{s.last_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{s.full_name}</p>
                <p className="muted text-xs">{s.year_group_name} Â· {s.class_name}</p>
                <p className="text-slate/45 text-xs font-mono">{s.pupil_reference}</p>
              </div>
              <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor:s.year_group_colour}}/>
            </motion.div>
          ))}
          {filtered.length===0&&!isLoading&&(
            <div className="col-span-2 text-center py-12"><GraduationCap size={34} className="text-slate/22 mx-auto mb-3"/><p className="muted">No students match</p></div>
          )}
        </div>
      )}
    </div>
  );
}
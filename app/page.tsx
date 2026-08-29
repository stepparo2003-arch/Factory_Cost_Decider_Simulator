'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Axes = [number, number, number, number, number];
type Option = { id: string; label: string; points: number; axes: Axes; correct?: boolean };
type Question = { kicker: string; title: string; context: string; signal: string; weight: number; seconds: number; multiple?: boolean; instruction?: string; options: Option[] };

const AXES = ['成本判断', '定价韧性', '资源配置', '治理纪律', '风险意识'];
const AXIS_MAX: Axes = [20, 20, 20, 20, 20];
const QUESTIONS: Question[] = [
  { kicker:'01 · PRICE SIGNAL', title:'大客户要求按旧报价续约，你签吗？', context:'核心原料市场价刚上涨 60%，但加权平均法（WA）报告的单位成本只上升 22%。客户希望锁定旧价三个月。', signal:'成本流经期初 WIP 的速度，慢于市场价格变化。', weight:15, seconds:20, options:[
    {id:'a',label:'签。报告成本仍支持现有毛利',points:0,axes:[1,0,0,0,0]},
    {id:'b',label:'直接把售价同步上调 60%',points:6,axes:[1,2,0,0,3]},
    {id:'c',label:'先把 WA 与当前／重置成本对账，再测试市场上限与成本传导空间',points:15,axes:[4,5,0,4,2]},
    {id:'d',label:'改用 FIFO，并把 FIFO 当作未来成本',points:7,axes:[3,1,0,1,2]},
  ]},
  { kicker:'02 · VOLUME RESPONSE', title:'原料降价了，产量也要跟着砍吗？', context:'原料现货价连续下跌，但期初 WIP 让报告单位成本仍偏高。销售团队说需求只是短期放缓。', signal:'滞后的高成本，可能把盈利产品误判为“不再有竞争力”。', weight:20, seconds:25, options:[
    {id:'a',label:'全面减产，先保住账面毛利率',points:1,axes:[0,0,1,0,0]},
    {id:'b',label:'维持原计划，等报告成本自然下降',points:5,axes:[1,0,2,1,1]},
    {id:'c',label:'更新当期贡献毛利与需求情景，再按产品选择性调整产量',points:20,axes:[4,3,5,3,5]},
    {id:'d',label:'全线降价换销量，不再看成本',points:4,axes:[0,2,1,0,1]},
  ]},
  { kicker:'03 · CONSTRAINED MIX', title:'瓶颈工时，只能优先给一款产品', context:'核心款账面单位毛利 $100，需 4 小时瓶颈工时；轻量款账面单位毛利 $55，需 2 小时。按当前重置成本重算，两者贡献分别为 $80 与 $70。', signal:'核心款：$80 ÷ 4h = $20/h　·　轻量款：$70 ÷ 2h = $35/h', weight:25, seconds:35, options:[
    {id:'a',label:'核心款：单位毛利更高',points:4,axes:[1,0,1,0,2]},
    {id:'b',label:'轻量款：每瓶颈工时贡献更高',points:25,axes:[4,2,10,3,6]},
    {id:'c',label:'平均分配：避免选错',points:8,axes:[1,0,3,2,2]},
    {id:'d',label:'只看销量最高的产品',points:2,axes:[0,1,1,0,0]},
  ]},
  { kicker:'04 · GOVERNANCE DESIGN', title:'最后一关：批准哪些管理规则？', context:'WA 继续作为法定报告口径。你需要为每周经营会建立一套能应对价格波动的决策协议。', signal:'选择所有应该批准的规则；错选会扣分。', weight:40, seconds:45, multiple:true, instruction:'多选题 · 选出全部正确规则', options:[
    {id:'a',label:'财务报告继续使用既定 WA，并保留一致性、对账和审计轨迹',points:10,axes:[2,0,0,6,2],correct:true},
    {id:'b',label:'短期定价采用当前／重置成本，并设置市场上限与成本传导测试',points:10,axes:[3,5,0,1,1],correct:true},
    {id:'c',label:'受限产品组合使用增量相关成本，并按稀缺资源贡献排序',points:10,axes:[2,0,6,1,1],correct:true},
    {id:'d',label:'绩效复盘建立“报告成本→经济成本”桥梁，分离时间差与经营表现',points:10,axes:[1,1,1,5,2],correct:true},
    {id:'e',label:'全公司只保留一个单位成本，避免口径争议',points:-6,axes:[-1,-1,-1,-2,-1]},
    {id:'f',label:'原料价格每次波动都立刻切换会计方法',points:-6,axes:[-1,0,0,-3,-2]},
  ]},
];

const clamp = (n:number,min=0,max=100) => Math.min(max,Math.max(min,n));

function Radar({values}:{values:number[]}) {
  const points = values.map((value,index) => { const angle=-Math.PI/2+index*Math.PI*2/values.length; const radius=48*clamp(value)/100; return `${50+Math.cos(angle)*radius}% ${50+Math.sin(angle)*radius}%`; }).join(',');
  return <div className="radar" aria-label={AXES.map((name,i)=>`${name} ${values[i]}分`).join('，')}>
    <div className="radar-grid grid-outer"/><div className="radar-grid grid-mid"/><div className="radar-grid grid-inner"/>
    {AXES.map((axis,i)=><span className={`axis-label axis-${i}`} key={axis}>{axis}<b>{values[i]}</b></span>)}
    <div className="radar-fill" style={{clipPath:`polygon(${points})`}}/><div className="radar-core"/>
  </div>;
}

export default function Home() {
  const [stage,setStage]=useState<'intro'|'quiz'|'result'>('intro');
  const [index,setIndex]=useState(0); const [selected,setSelected]=useState<string[]>([]);
  const [seconds,setSeconds]=useState(QUESTIONS[0].seconds); const [earned,setEarned]=useState<number[]>([]);
  const [axisTotals,setAxisTotals]=useState<Axes>([0,0,0,0,0]); const advancing=useRef(false); const question=QUESTIONS[index];
  const start=()=>{setStage('quiz');setIndex(0);setSelected([]);setEarned([]);setAxisTotals([0,0,0,0,0]);setSeconds(QUESTIONS[0].seconds);advancing.current=false;};
  const advance=useCallback((timedOut=false)=>{
    if(advancing.current)return; advancing.current=true;
    const picks=timedOut?[]:question.options.filter(o=>selected.includes(o.id));
    const points=clamp(picks.reduce((sum,o)=>sum+o.points,0),0,question.weight);
    const delta=picks.reduce<Axes>((sum,o)=>sum.map((n,i)=>n+o.axes[i]) as Axes,[0,0,0,0,0]);
    setEarned(prev=>[...prev,points]); setAxisTotals(prev=>prev.map((n,i)=>clamp(n+delta[i],0,AXIS_MAX[i])) as Axes);
    window.setTimeout(()=>{if(index===QUESTIONS.length-1)setStage('result');else{const next=index+1;setIndex(next);setSelected([]);setSeconds(QUESTIONS[next].seconds);advancing.current=false;}},240);
  },[index,question,selected]);
  useEffect(()=>{if(stage!=='quiz')return;const timer=window.setInterval(()=>setSeconds(value=>{if(value<=1){window.clearInterval(timer);window.setTimeout(()=>advance(true),0);return 0;}return value-1;}),1000);return()=>window.clearInterval(timer);},[stage,index,advance]);
  const toggle=(id:string)=>{if(advancing.current)return;setSelected(current=>question.multiple?(current.includes(id)?current.filter(item=>item!==id):[...current,id]):[id]);};
  const total=earned.reduce((sum,n)=>sum+n,0); const radarValues=axisTotals.map((n,i)=>Math.round(n/AXIS_MAX[i]*100));
  const result=useMemo(()=>total>=85?{grade:'S',title:'逆周期经营者',copy:'你能区分报告口径与决策口径，并把成本信号转化为可执行的管理规则。'}:total>=70?{grade:'A',title:'稳健型厂长',copy:'大多数关键取舍准确；再强化瓶颈资源排序与报告—经济桥接即可。'}:total>=50?{grade:'B',title:'经验型经营者',copy:'你能识别风险，但偶尔仍会让单一成本数字替你做决定。'}:{grade:'C',title:'成本信号追随者',copy:'工厂正被滞后成本牵着走。先问清成本期间、重置成本和决策用途。'},[total]);
  const factory={profit:Math.round(clamp(38+total*.55)),cash:Math.round(clamp(36+radarValues[0]*.28+radarValues[4]*.24)),resilience:Math.round(clamp(30+radarValues[3]*.42+radarValues[2]*.26))};
  return <main className={`sim-shell stage-${stage}`}>
    <header className="topbar"><div className="brand"><span className="brand-mark"/>NORTHSTAR WORKS</div><div className="status"><span className="status-dot"/> FACTORY ONLINE</div></header>
    {stage==='intro'&&<><section className="hero enter"><div className="eyebrow">POV DECISION SIMULATOR · ACCT90009</div><h1>制造商老板<br/><span>决策模拟器</span></h1><p className="lead">成本数字可能是对的，经营决策仍可能出错。<br/>四次限时决策，检验你能否在成本波动中守住工厂。</p><button className="start-button" type="button" onClick={start}><span>进入厂长办公室</span><span aria-hidden="true">↗</span></button></section>
      <aside className="briefing enter" aria-label="任务简报"><div className="briefing-head"><span>SHIFT BRIEFING</span><span>08:00</span></div><div className="pulse-card"><span className="pulse-label">原料价格指数</span><strong>160</strong><span className="risk">▲ 60%</span><div className="sparkline"><i/><i/><i/><i/><i/><i/></div></div><dl><div><dt>决策任务</dt><dd>4</dd></div><div><dt>预计耗时</dt><dd>≈ 2 分钟</dd></div><div><dt>最终输出</dt><dd>决策雷达图</dd></div></dl></aside><footer className="hero-footer"><span>00</span><span>价格</span><span>产量</span><span>产品组合</span><span>成本治理</span></footer></>}
    {stage==='quiz'&&<section className="quiz enter" aria-live="polite"><div className="quiz-rail"><div className="question-count"><strong>0{index+1}</strong><span>/ 04</span></div><div className="rail-line">{QUESTIONS.map((_,i)=><i key={i} className={i<index?'done':i===index?'active':''}/>)}</div><div className={`timer ${seconds<=8?'urgent':''}`} style={{background:`conic-gradient(var(--timer-color) ${seconds/question.seconds*360}deg, rgba(255,255,255,.08) 0deg)`}}><div><strong>{seconds}</strong><span>SEC</span></div></div><div className="weight"><span>本题权重</span><strong>{question.weight}</strong><small>PTS</small></div></div>
      <div className="question-main"><div className="question-kicker">{question.kicker}</div><h2>{question.title}</h2><p className="context">{question.context}</p><div className="signal"><span>SIGNAL</span>{question.signal}</div>{question.instruction&&<div className="multi-note">{question.instruction}</div>}<div className={`options ${question.options.length>4?'options-dense':''}`}>{question.options.map((option,optionIndex)=>{const active=selected.includes(option.id);return <button key={option.id} type="button" className={`option ${active?'selected':''}`} onClick={()=>toggle(option.id)} aria-pressed={active}><span className="option-key">{question.multiple?(active?'✓':'□'):String.fromCharCode(65+optionIndex)}</span><span>{option.label}</span><span className="option-arrow">{active?'SELECTED':'↗'}</span></button>;})}</div><div className="quiz-actions"><span>倒计时结束将自动提交并进入下一题</span><button type="button" disabled={!selected.length} onClick={()=>advance(false)}>确认决策 <b>→</b></button></div></div></section>}
    {stage==='result'&&<section className="results enter"><div className="result-heading"><div className="eyebrow">FINAL OPERATING REVIEW</div><h2>你的工厂，交出了这份成绩单</h2></div><div className="result-grid"><article className="score-panel"><div className="score-lockup"><span>DECISION SCORE</span><strong>{total}</strong><small>/ 100</small><em>{result.grade}</em></div><h3>{result.title}</h3><p>{result.copy}</p><div className="question-strip">{QUESTIONS.map((q,i)=><div key={q.kicker}><span>Q{i+1}</span><b>{earned[i]??0}</b><small>/{q.weight}</small></div>)}</div></article><article className="radar-panel"><div className="panel-label">MANAGEMENT RADAR</div><Radar values={radarValues}/></article><article className="factory-panel"><div className="panel-label">FACTORY OUTCOME</div>{([['盈利能力',factory.profit],['现金安全',factory.cash],['运营韧性',factory.resilience]] as [string,number][]).map(([label,value])=><div className="metric" key={label}><div><span>{label}</span><strong>{value}</strong></div><div className="metric-track"><i style={{width:`${value}%`}}/></div></div>)}<div className="operating-result"><span>经营结论</span><strong>{total>=70?'工厂稳住了增长与现金':total>=50?'工厂继续运转，但暴露在成本滞后中':'利润与现金被错误信号侵蚀'}</strong></div></article></div><div className="result-footer"><p>记住：<b>一种会计口径 · 多种决策视角 · 一次明确对账</b></p><button type="button" onClick={start}>重新挑战 ↻</button></div></section>}
  </main>;
}

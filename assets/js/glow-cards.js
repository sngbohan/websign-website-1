import{a as n,b as _,c as C,d as p}from"./chunks/chunk-DVEBMV5P.js";var f=n(C(),1);var i=n(_(),1),a=n(p(),1),S={blue:{base:220,spread:200},purple:{base:280,spread:300},green:{base:120,spread:200},red:{base:0,spread:200},orange:{base:30,spread:200},websign:{base:219,spread:0},chrome:{base:216,spread:0}},P={sm:"w-48 h-64",md:"w-64 h-80",lg:"w-80 h-96"},m=({children:l,className:e="",glowColor:s="blue",size:r="md",width:c,height:d,customSize:g=!1})=>{let t=(0,i.useRef)(null),h=(0,i.useRef)(null);(0,i.useEffect)(()=>{let o=z=>{let{clientX:u,clientY:v}=z;t.current&&(t.current.style.setProperty("--x",u.toFixed(2)),t.current.style.setProperty("--xp",(u/window.innerWidth).toFixed(2)),t.current.style.setProperty("--y",v.toFixed(2)),t.current.style.setProperty("--yp",(v/window.innerHeight).toFixed(2)))};return document.addEventListener("pointermove",o),()=>document.removeEventListener("pointermove",o)},[]);let{base:y,spread:x}=S[s],k=()=>g?"":P[r];return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)("style",{dangerouslySetInnerHTML:{__html:`
    [data-glow]::before,
    [data-glow]::after {
      pointer-events: none;
      content: "";
      position: absolute;
      inset: calc(var(--border-size) * -1);
      border: var(--border-size) solid transparent;
      border-radius: calc(var(--radius) * 1px);
      background-attachment: fixed;
      background-size: calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)));
      background-repeat: no-repeat;
      background-position: 50% 50%;
      mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
      mask-clip: padding-box, border-box;
      mask-composite: intersect;
    }

    [data-glow]::before {
      background-image: radial-gradient(
        calc(var(--spotlight-size) * 0.75) calc(var(--spotlight-size) * 0.75) at
        calc(var(--x, 0) * 1px)
        calc(var(--y, 0) * 1px),
        hsl(var(--hue, 210) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 50) * 1%) / var(--border-spot-opacity, 1)), transparent 100%
      );
      filter: brightness(2);
    }

    [data-glow]::after {
      background-image: radial-gradient(
        calc(var(--spotlight-size) * 0.5) calc(var(--spotlight-size) * 0.5) at
        calc(var(--x, 0) * 1px)
        calc(var(--y, 0) * 1px),
        hsl(0 100% 100% / var(--border-light-opacity, 1)), transparent 100%
      );
    }

    [data-glow] [data-glow] {
      position: absolute;
      inset: 0;
      will-change: filter;
      opacity: var(--outer, 1);
      border-radius: calc(var(--radius) * 1px);
      border-width: calc(var(--border-size) * 20);
      filter: blur(calc(var(--border-size) * 10));
      background: none;
      pointer-events: none;
      border: none;
    }

    [data-glow] > [data-glow]::before {
      inset: -10px;
      border-width: 10px;
    }
  `}}),(0,a.jsxs)("div",{ref:t,"data-glow":!0,style:(()=>{let o={"--base":y,"--spread":x,"--radius":"14","--border":"3","--backdrop":"hsl(0 0% 60% / 0.12)","--backup-border":"var(--backdrop)","--size":"200","--outer":"1","--border-size":"calc(var(--border, 2) * 1px)","--spotlight-size":"calc(var(--size, 150) * 1px)","--hue":"calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))",backgroundImage:`radial-gradient(
        var(--spotlight-size) var(--spotlight-size) at
        calc(var(--x, 0) * 1px)
        calc(var(--y, 0) * 1px),
        hsl(var(--hue, 210) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 70) * 1%) / var(--bg-spot-opacity, 0.1)), transparent
      )`,backgroundColor:"var(--backdrop, transparent)",backgroundSize:"calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)))",backgroundPosition:"50% 50%",backgroundAttachment:"fixed",border:"var(--border-size) solid var(--backup-border)",position:"relative",touchAction:"none"};return c!==void 0&&(o.width=typeof c=="number"?`${c}px`:c),d!==void 0&&(o.height=typeof d=="number"?`${d}px`:d),o})(),className:`
          ${k()}
          ${g?"":"aspect-[3/4]"}
          rounded-2xl
          relative
          grid
          grid-rows-[1fr_auto]
          shadow-[0_1rem_2rem_-1rem_black]
          p-4
          gap-4
          backdrop-blur-[5px]
          ${e}
        `,children:[(0,a.jsx)("div",{ref:h,"data-glow":!0}),l]})]})};var b=n(p(),1),w="websign",L=new URL("../css/glow-cards.css",import.meta.url).href;function E(){return document.querySelector("link[data-glow-css]")?Promise.resolve():new Promise((e,s)=>{let r=document.createElement("link");r.rel="stylesheet",r.href=L,r.dataset.glowCss="",r.onload=()=>e(),r.onerror=()=>s(new Error("glow-cards.css fehlt")),document.head.append(r)})}async function F(l){await E(),l.querySelectorAll(".option__box").forEach(e=>{if(e.classList.contains("option__box--glow"))return;let s=e.innerHTML;e.classList.add("option__box--glow"),(0,f.createRoot)(e).render((0,b.jsx)(m,{customSize:!0,glowColor:w,className:`option__glow option__glow--${w}`,children:(0,b.jsx)("span",{className:"option__inner",dangerouslySetInnerHTML:{__html:s}})}))})}export{F as mountGlowCards};

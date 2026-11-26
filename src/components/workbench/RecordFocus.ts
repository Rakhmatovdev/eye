export function recordAnchor(kind:string,id:string){return `${kind}-${encodeURIComponent(id)}`;}
let watching=false;
function reveal(node:HTMLElement){let parent=node.parentElement;while(parent){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}requestAnimationFrame(()=>{node.scrollIntoView({block:'center'});node.setAttribute('tabindex','-1');node.focus({preventScroll:true});});}
export function focusRecord(node:HTMLElement|null,kind:string,id:string){
 if(node&&!watching&&typeof window!=='undefined'){watching=true;window.addEventListener('hashchange',()=>{const target=document.getElementById(window.location.hash.slice(1));if(target)reveal(target);});document.addEventListener('click',e=>{const link=(e.target as Element)?.closest?.('a');if(!link)return;const url=new URL(link.href,window.location.href);if(url.pathname!==window.location.pathname||!url.hash)return;const target=document.getElementById(url.hash.slice(1));if(target)setTimeout(()=>reveal(target),0);});}
 if(!node||node.dataset.recordFocused==='true'||typeof window==='undefined'||window.location.hash!==`#${recordAnchor(kind,id)}`)return;
 node.dataset.recordFocused='true';reveal(node);
}

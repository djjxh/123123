(function(){
  function esc(v){return String(v==null?'':v).replace(/[&<>'"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]})}
  window.safeText=esc;
  function cleanId(v){return String(v==null?'':v).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,' ')}
  function patchProjectCard(){
    if(typeof cardProject!=='function')return;
    const old=cardProject;
    window.cardProject=cardProject=function(p,mode){
      try{
        const q=Object.assign({},p,{name:esc(p.name),deliverable:esc(p.deliverable),access:esc(p.access),opening:esc(p.opening),stage:esc(p.stage),deliveryLabel:esc(p.deliveryLabel)});
        q.id=cleanId(p.id);return old(q,mode);
      }catch(e){return old(p,mode)}
    }
  }
  function patchPersonCard(){
    if(typeof personCard!=='function')return;
    const old=personCard;
    window.personCard=personCard=function(p,compact){
      try{
        const q=Object.assign({},p,{name:esc(p.name),role:esc(p.role)});
        q.id=cleanId(p.id||p.name);
        q.items=(p.items||[]).map(function(i){
          if(Array.isArray(i))return i.map(esc);
          return Object.assign({},i,{project:esc(i.project),stage:esc(i.stage),date:esc(i.date),projectStatus:esc(i.projectStatus)});
        });
        return old(q,compact);
      }catch(e){return old(p,compact)}
    }
  }
  function patchRenderGuards(){
    ['renderToday','renderDelivery','renderPeople','renderMore'].forEach(function(n){
      if(typeof window[n]==='function'&&!window[n].__guarded){
        const old=window[n];
        window[n]=function(){try{return old.apply(this,arguments)}catch(e){console.error(n,e);var box=document.getElementById(n==='renderPeople'?'peopleList':n==='renderDelivery'?'deliveryList':n==='renderMore'?'moreList':'todayList');if(box)box.innerHTML='<div class="note">页面数据加载异常，请点击“更多-刷新真实数据”。</div>'}};
        window[n].__guarded=true;
      }
    });
  }
  patchProjectCard();patchPersonCard();patchRenderGuards();
})();

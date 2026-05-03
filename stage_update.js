(function(){
  const 地址='https://bgjvuszufqbbialkyeiq.supabase.co';
  const 密钥='sb_publishable_2yQgdIPmNnxQRTswLSLSwQ_KFaIuUjv';
  let 客户端=null;
  function 取文本(v){return v==null?'':String(v)}
  function 读本地阶段(){try{return JSON.parse(localStorage.getItem('project_stage_overrides')||'{}')}catch(e){return {}}}
  function 写本地阶段(id,阶段){const m=读本地阶段();m[String(id)]=阶段;localStorage.setItem('project_stage_overrides',JSON.stringify(m))}
  function 应用本地阶段(){const d=当前数据();const m=读本地阶段();(d.projects||[]).forEach(function(p){const v=m[String(p.id)];if(v){p.stage=v;p.isCompleted=(v==='已完工'||v==='暂停')}})}
  function 是否其他项目(p){
    const s=[p&&p.stage,p&&p.status,p&&p.project_status,p&&p.state,p&&p.raw&&p.raw.status,p&&p.raw&&p.raw.stage,p&&p.raw&&p.raw.project_status,p&&p.raw&&p.raw.state].map(取文本).join(' ');
    return /已完成|已完工|完工|完结|已完结|结束|已结束|结案|已结案|归档|已归档|暂停|已暂停|停滞|取消|已取消|作废|关闭/.test(s);
  }
  function 当前数据(){return window.DATA||DATA}
  function 获取客户端(){
    if(客户端)return 客户端;
    if(window.supabase)客户端=window.supabase.createClient(地址,密钥,{auth:{storage:window.sessionStorage,persistSession:true,detectSessionInUrl:false}});
    return 客户端;
  }
  function 重画交付筛选(){
    const box=document.getElementById('deliveryFilters');
    if(!box||box.dataset.stageReady==='1')return;
    box.dataset.stageReady='1';
    box.innerHTML='<button class="pill active" data-filter="all">进行中</button><button class="pill" data-filter="contract">合同内</button><button class="pill" data-filter="pre">预排</button><button class="pill" data-filter="risk">逾期风险</button><button class="pill" data-filter="other">其他</button>';
    Array.from(box.querySelectorAll('.pill')).forEach(function(b){
      b.onclick=function(){Array.from(box.querySelectorAll('.pill')).forEach(x=>x.classList.remove('active'));b.classList.add('active');deliveryFilter=b.dataset.filter;renderDelivery();};
    });
  }
  async function 尝试数据库保存(p,阶段){
    const c=获取客户端();
    if(!c)return false;
    const id=p&&p.id;
    if(!id)return false;
    const 尝试=[
      {stage:阶段,status:阶段},
      {current_stage:阶段,status:阶段},
      {project_status:阶段,status:阶段},
      {status:阶段},
      {stage:阶段},
      {current_stage:阶段},
      {project_status:阶段}
    ];
    for(const payload of 尝试){
      try{
        const r=await c.from('projects').update(payload).eq('id',id).select('id').maybeSingle();
        if(!r.error)return true;
      }catch(e){}
    }
    return false;
  }
  const 原渲染交付=window.renderDelivery||renderDelivery;
  window.renderDelivery=renderDelivery=function(){
    应用本地阶段();
    重画交付筛选();
    const d=当前数据();
    const q=(document.getElementById('projectSearch').value||'').trim().toLowerCase();
    let a=(d.projects||[]).filter(p=>!q||[p.name,p.stage,p.ownerPlan,p.ownerTech,p.owner].join(' ').toLowerCase().includes(q));
    if(deliveryFilter==='other')a=a.filter(是否其他项目);
    else a=a.filter(p=>!是否其他项目(p));
    if(deliveryFilter==='contract')a=a.filter(p=>p.kind==='contract');
    if(deliveryFilter==='pre')a=a.filter(p=>p.kind==='pre');
    if(deliveryFilter==='risk')a=a.filter(p=>p.risk!=='normal');
    a.sort((x,y)=>leftDays(x.delivery)-leftDays(y.delivery));
    const list=document.getElementById('deliveryList');
    if(list)list.innerHTML=a.length?a.map(p=>cardProject(p)).join(''):(deliveryFilter==='other'?empty('暂无已完成、暂停或取消项目。'):empty('暂无正在进行中的项目。'));
  };
  const 原打开项目=window.openProject||openProject;
  window.openProject=openProject=function(id){
    应用本地阶段();
    const d=当前数据();
    const p=(d.projects||[]).find(x=>String(x.id)===String(id));
    if(!p)return 原打开项目(id);
    const rc=riskClass(p.risk);
    const 阶段=['方案阶段','施工图阶段','施工阶段','已完工','暂停'];
    openSheet(`<h2>${p.name}</h2><p class="sub">查看交付节点，并更新项目当前阶段。</p><div class="big-date"><b>${p.deliveryLabel}</b><span>${p.kind==='contract'?'合同约定':'预排节点'}：${p.deliverable}</span></div><article class="card ${rc}"><h3>当前阶段：${p.stage||'未填'}</h3><p>${p.issue}\n方案负责人：${p.ownerPlan||p.owner||'未填'}｜深化负责人：${p.ownerTech||'未填'}\n已完成、暂停、取消项目会进入“其他”，默认不显示在进行中看板。</p></article><div class="note">更新阶段</div><div class="actions" style="grid-template-columns:1fr 1fr;">${阶段.map(s=>`<button class="btn ${s==='已完工'?'green':s==='暂停'?'light':'blue'}" onclick="更新项目阶段('${p.id}','${s}')">${s}</button>`).join('')}</div><div class="actions"><button class="btn" onclick="copyBrief('${p.id}')">复制项目口径</button><button class="btn light" onclick="closeSheet()">关闭</button></div>`);
  };
  window.更新项目阶段=async function(id,阶段){
    const d=当前数据();
    const p=(d.projects||[]).find(x=>String(x.id)===String(id));
    if(!p){toast('未找到项目');return}
    p.stage=阶段;
    p.status=阶段;
    if(p.raw){p.raw.stage=阶段;p.raw.status=阶段;p.raw.current_stage=阶段;p.raw.project_status=阶段}
    p.isCompleted=(阶段==='已完工'||阶段==='暂停');
    写本地阶段(id,阶段);
    renderAll();
    toast('阶段已更新');
    closeSheet();
    const ok=await 尝试数据库保存(p,阶段);
    if(ok){toast('阶段已保存');setTimeout(function(){if(typeof loadRemote==='function')loadRemote();},500)}
    else{toast('已在本机更新，数据库保存失败')}
  };
  const 原渲染全部=window.renderAll||renderAll;
  window.renderAll=renderAll=function(){应用本地阶段();原渲染全部();setTimeout(renderDelivery,0);};
  const 原加载=window.loadRemote;
  if(typeof 原加载==='function'){
    window.loadRemote=loadRemote=async function(){await 原加载();应用本地阶段();renderAll();};
  }
  setTimeout(function(){应用本地阶段();重画交付筛选();renderDelivery();},500);
})();

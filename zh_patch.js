(function(){
  function mapText(value){
    if(value==null)return value;
    var s=String(value).trim();
    if(!s)return s;
    var exact={
      employee:'员工',employees:'员工',user:'用户',users:'用户',staff:'员工',
      construction:'施工中',design:'设计中',drawing:'图纸中',draft:'草稿',review:'审核中',
      pending:'待处理',active:'进行中',inactive:'已停用',disabled:'已停用',
      done:'已完成',completed:'已完成',closed:'已关闭',cancelled:'已取消',canceled:'已取消',
      manager:'管理人员',director:'总监',owner:'负责人',admin:'管理员',administrator:'管理员',
      concept:'方案',technical:'深化',handover:'交接',delivery:'交付',open:'开放',new:'新建'
    };
    var lower=s.toLowerCase();
    if(exact[lower])return exact[lower];
    return s
      .replace(/\bemployee(s)?\b/gi,'员工')
      .replace(/\buser(s)?\b/gi,'用户')
      .replace(/\bstaff\b/gi,'员工')
      .replace(/\bconstruction\b/gi,'施工中')
      .replace(/\bdesign\b/gi,'设计中')
      .replace(/\bdrawing\b/gi,'图纸中')
      .replace(/\bdraft\b/gi,'草稿')
      .replace(/\breview\b/gi,'审核中')
      .replace(/\bpending\b/gi,'待处理')
      .replace(/\bactive\b/gi,'进行中')
      .replace(/\binactive\b/gi,'已停用')
      .replace(/\bdisabled\b/gi,'已停用')
      .replace(/\bdone\b/gi,'已完成')
      .replace(/\bcompleted\b/gi,'已完成')
      .replace(/\bclosed\b/gi,'已关闭')
      .replace(/\bcancell?ed\b/gi,'已取消')
      .replace(/\bmanager\b/gi,'管理人员')
      .replace(/\bdirector\b/gi,'总监')
      .replace(/\bowner\b/gi,'负责人')
      .replace(/\badmin(istrator)?\b/gi,'管理员')
      .replace(/\bconcept\b/gi,'方案')
      .replace(/\btechnical\b/gi,'深化')
      .replace(/\bhandover\b/gi,'交接')
      .replace(/\bdelivery\b/gi,'交付')
      .replace(/\bopen\b/gi,'开放')
      .replace(/\bnew\b/gi,'新建');
  }
  window.zhDisplay=mapText;
  function normalizeData(d){
    if(!d)return d;
    (d.projects||[]).forEach(function(p){
      p.stage=mapText(p.stage);p.deliverable=mapText(p.deliverable);p.issue=mapText(p.issue);
      p.ownerPlan=mapText(p.ownerPlan);p.ownerTech=mapText(p.ownerTech);p.owner=mapText(p.owner);
    });
    (d.people||[]).forEach(function(p){
      p.role=mapText(p.role);
      (p.items||[]).forEach(function(i){i.stage=mapText(i.stage);i.projectStatus=mapText(i.projectStatus);});
    });
    return d;
  }
  if(typeof normalPerson==='function'){
    var oldNormalPerson=normalPerson;
    normalPerson=function(o){var p=oldNormalPerson(o);p.role=mapText(p.role);return p;};
  }
  if(typeof normalProject==='function'){
    var oldNormalProject=normalProject;
    normalProject=function(o,members,peopleMap){var p=oldNormalProject(o,members,peopleMap);p.stage=mapText(p.stage);p.deliverable=mapText(p.deliverable);p.issue=mapText(p.issue);return p;};
  }
  if(typeof addProjectItem==='function'){
    var oldAddProjectItem=addProjectItem;
    addProjectItem=function(person,project,role){return oldAddProjectItem(person,project,mapText(role));};
  }
  if(typeof buildData==='function'){
    var oldBuildData=buildData;
    buildData=function(projectRows,userRows,logRows,memberRows,preplanRows){return normalizeData(oldBuildData(projectRows,userRows,logRows,memberRows,preplanRows));};
  }
  function polishDom(){
    document.querySelectorAll('h1,h2,h3,p,small,span,button,textarea,.note,.sub').forEach(function(el){
      if(el.children&&el.children.length&&el.tagName!=='TEXTAREA')return;
      var t=el.value!=null?el.value:el.textContent;
      if(!t)return;
      var n=t.replace(/黑盒\s*AI/g,'黑盒智能').replace(/\bAI\b/g,'智能').replace(/CSV/g,'表格').replace(/Supabase/g,'数据库');
      if(el.value!=null)el.value=n;else el.textContent=n;
    });
  }
  if(typeof openSheet==='function'){
    var oldOpenSheet=openSheet;
    openSheet=function(html){oldOpenSheet(html.replace(/黑盒\s*AI/g,'黑盒智能').replace(/\bAI\b/g,'智能').replace(/CSV/g,'表格').replace(/Supabase/g,'数据库'));setTimeout(polishDom,0);};
  }
  if(typeof renderAll==='function'){
    var oldRenderAll=renderAll;
    renderAll=function(){normalizeData(window.DATA||DATA);oldRenderAll();setTimeout(polishDom,0);};
  }
  setInterval(polishDom,800);
  setTimeout(polishDom,0);
})();

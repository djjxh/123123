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
      concept:'方案',technical:'深化',handover:'交接',delivery:'交付',new:'新建'
    };
    var lower=s.toLowerCase();
    if(exact[lower])return exact[lower];
    return s;
  }
  window.zhDisplay=mapText;
  function normalizeData(d){
    if(!d)return d;
    (d.projects||[]).forEach(function(p){
      p.stage=mapText(p.stage);
      p.deliverable=mapText(p.deliverable);
    });
    (d.people||[]).forEach(function(p){
      p.role=mapText(p.role);
      (p.items||[]).forEach(function(i){
        i.stage=mapText(i.stage);
        i.projectStatus=mapText(i.projectStatus);
      });
      (p._allItems||[]).forEach(function(i){
        i.stage=mapText(i.stage);
        i.projectStatus=mapText(i.projectStatus);
      });
    });
    return d;
  }
  if(typeof normalPerson==='function'){
    var oldNormalPerson=normalPerson;
    normalPerson=function(o){var p=oldNormalPerson(o);p.role=mapText(p.role);return p;};
  }
  if(typeof normalProject==='function'){
    var oldNormalProject=normalProject;
    normalProject=function(o,members,peopleMap){var p=oldNormalProject(o,members,peopleMap);p.stage=mapText(p.stage);p.deliverable=mapText(p.deliverable);return p;};
  }
  if(typeof addProjectItem==='function'){
    var oldAddProjectItem=addProjectItem;
    addProjectItem=function(person,project,role){return oldAddProjectItem(person,project,mapText(role));};
  }
  if(typeof buildData==='function'){
    var oldBuildData=buildData;
    buildData=function(projectRows,userRows,logRows,memberRows,preplanRows){return normalizeData(oldBuildData(projectRows,userRows,logRows,memberRows,preplanRows));};
  }
  function polishSystemCopy(html){
    return String(html)
      .replace(/黑盒\s*AI/g,'黑盒智能')
      .replace(/\bAI\b/g,'智能')
      .replace(/CSV/g,'表格')
      .replace(/Supabase/g,'数据库');
  }
  if(typeof openSheet==='function'){
    var oldOpenSheet=openSheet;
    openSheet=function(html){oldOpenSheet(polishSystemCopy(html));};
  }
  if(typeof renderAll==='function'){
    var oldRenderAll=renderAll;
    renderAll=function(){normalizeData(window.DATA||DATA);oldRenderAll();};
  }
})();

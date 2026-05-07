/* desktop_interop_patch.js · 手机/电脑数据互通补丁 2026-05-07 */
(function(){
  const TERMINAL_STATUS_RE = /(done|completed|complete|finished|closed|cancelled|canceled|cancel|archived|paused|已完成|完成|已完工|完工|已完结|完结|已结束|结束|结案|已结案|归档|已归档|暂停|已暂停|停滞|取消|已取消|作废|关闭)/i;
  const ACTIVE_STATUS_RE = /(active|ongoing|construction|risk|进行中|施工跟踪|施工中|方案阶段|施工图阶段|深化阶段|施工阶段|预排|预排中|已确认|未完成|未完工|未完结)/i;
  const STATUS_MAP = {
    '方案阶段':'active','施工图阶段':'active','深化阶段':'active','施工阶段':'construction','施工中':'construction',
    '进行中':'active','预排中':'active','已确认':'active',
    '已完工':'done','已完成':'done','完成':'done','已完结':'done','完结':'done',
    '暂停':'paused','已暂停':'paused','取消':'cancelled','已取消':'cancelled','归档':'done'
  };
  const STATUS_LABEL = {active:'进行中',construction:'施工跟踪',risk:'风险',paused:'已暂停',done:'已完结',cancelled:'已取消'};
  let stageOverrides = {};
  let stageOverridesLoadedAt = 0;

  function E(name){
    try { return (0,eval)(name); } catch(e) { return window[name]; }
  }
  function A(name){
    const v = E(name);
    return Array.isArray(v) ? v : [];
  }
  function normText(v){ return String(v == null ? '' : v).trim(); }
  function safe(v){
    if(typeof window.escapeHtml === 'function') return window.escapeHtml(v);
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function normStatus(v){
    const s = normText(v);
    return STATUS_MAP[s] || s || 'active';
  }
  function labelStatus(v){
    const s = normStatus(v);
    return STATUS_LABEL[s] || v || '进行中';
  }
  function rawProject(p){ return p && (p.raw || p.project || p); }
  function getProjectStatus(p){
    const r = rawProject(p) || {};
    return normText(
      stageOverrides[String(p && p.id)] ||
      p?.stage || p?.current_stage || p?.project_status || p?.status || p?.state ||
      r.stage || r.current_stage || r.project_status || r.status || r.state || ''
    );
  }
  window.isTerminalProjectStatus = function(projectOrStatus){
    const s = typeof projectOrStatus === 'string' ? projectOrStatus : getProjectStatus(projectOrStatus);
    if(ACTIVE_STATUS_RE.test(s)) return false;
    return TERMINAL_STATUS_RE.test(s);
  };
  window.isActiveForWorkload = function(project){
    return !window.isTerminalProjectStatus(project);
  };
  function applyStageOverridesToProjects(){
    A('allProjects').forEach(function(p){
      const v = stageOverrides[String(p && p.id)];
      if(!v) return;
      p.stage = v;
      p.current_stage = v;
      p.project_status = v;
      p.status = normStatus(v);
    });
  }
  async function loadStageOverrides(force){
    if(!window.sb || (!force && Date.now() - stageOverridesLoadedAt < 800)) return stageOverrides;
    try{
      const res = await sb.from('project_stage_updates').select('project_id,stage,updated_at');
      if(!res.error){
        stageOverrides = {};
        (res.data || []).forEach(function(row){
          if(row && row.project_id) stageOverrides[String(row.project_id)] = row.stage;
        });
        stageOverridesLoadedAt = Date.now();
        applyStageOverridesToProjects();
      }
    }catch(e){
      console.warn('project_stage_updates 暂不可用，回退到 projects.status', e);
    }
    return stageOverrides;
  }
  async function syncProjectStatus(projectId, statusOrStage){
    if(!window.sb || !projectId || !statusOrStage) return false;
    const stage = normText(statusOrStage);
    const canonical = normStatus(stage);
    let ok = false;
    try{
      const uid = E('currentUser')?.id || E('userProfile')?.id || null;
      const res = await sb.from('project_stage_updates').upsert({
        project_id: projectId,
        stage: stage,
        updated_by: uid,
        updated_at: new Date().toISOString()
      }, { onConflict: 'project_id' });
      if(!res.error){ ok = true; stageOverrides[String(projectId)] = stage; }
    }catch(e){
      console.warn('阶段同步表写入失败，继续写 projects 表', e);
    }
    try{
      const attempts = [
        {status: canonical, stage: stage, current_stage: stage, project_status: stage},
        {status: canonical, stage: stage},
        {status: canonical},
        {stage: stage}
      ];
      for(const payload of attempts){
        const res = await sb.from('projects').update(payload).eq('id', projectId);
        if(!res.error){ ok = true; break; }
      }
    }catch(e){
      console.warn('projects 状态写入失败', e);
    }
    const p = A('allProjects').find(x=>String(x.id)===String(projectId));
    if(p){
      p.status = canonical;
      p.stage = stage;
      p.current_stage = stage;
      p.project_status = stage;
    }
    return ok;
  }
  window.syncProjectStatusForAllClients = syncProjectStatus;

  function patchAsyncFunction(name, wrapperFactory){
    const fn = E(name);
    if(typeof fn !== 'function' || fn.__interopPatched) return;
    const wrapped = wrapperFactory(fn);
    wrapped.__interopPatched = true;
    try { (0,eval)(name + ' = wrapped'); } catch(e) { window[name] = wrapped; }
  }

  patchAsyncFunction('loadProjects', function(base){
    return async function(){
      const r = await base.apply(this, arguments);
      await loadStageOverrides(true);
      applyStageOverridesToProjects();
      return r;
    };
  });

  patchAsyncFunction('saveEditProject', function(base){
    return async function(){
      const id = document.getElementById('npEditId')?.value;
      const rawStatus = document.getElementById('npStatus')?.value;
      const stage = rawStatus ? labelStatus(rawStatus) : '';
      const r = await base.apply(this, arguments);
      if(id && stage){
        await syncProjectStatus(id, stage);
        const lp = E('loadProjects');
        if(typeof lp === 'function') await lp();
        const ra = E('renderAll');
        if(typeof ra === 'function') ra();
      }
      return r;
    };
  });

  function isExcludedPersonForWorkload(person){
    if(!person) return true;
    const roleText = [person.role, person.job_title, person.title, person.position, person.employee_title, person.name].map(normText).join(' ');
    if(person.is_active === false || person.active === false || person.enabled === false) return true;
    if(/离职|已离职|离任|停用|禁用|不在职|inactive|resigned|departed|disabled|terminated/i.test(roleText)) return true;
    if(/设计总监|总监|老板|设计主管|主管|admin|administrator|owner|manager|director|系统管理员/i.test(roleText)) return true;
    return false;
  }
  function getWorkloadProjectLimit(person){
    const s = [person?.job_title,person?.role,person?.title,person?.position].map(normText).join(' ');
    if(/高级深化|深化|施工图|technical/i.test(s)) return 4;
    if(/方案|执行|主案|concept|designer/i.test(s)) return 3;
    return 3;
  }
  window.getWorkloadProjectLimit = getWorkloadProjectLimit;

  window.getWorkloadEmployees = function(){
    return A('allEmployees').filter(e => !isExcludedPersonForWorkload(e));
  };
  try { (0,eval)('getWorkloadEmployees = window.getWorkloadEmployees'); } catch(e){}

  function collectProjectsForEmployee(emp){
    const eid = String(emp?.id || emp?.user_id || emp?.employee_id || '');
    const ename = normText(emp?.name || emp?.employee_name || emp?.full_name || emp?.email);
    const rows = [];
    function push(project, role, source){
      if(!project || !window.isActiveForWorkload(project)) return;
      const id = String(project.id || project.project_id || project.name || project.project_name || '');
      const name = project.name || project.project_name || project.title || '未命名项目';
      const key = id || name;
      if(rows.some(x=>x.key===key)) return;
      rows.push({key,id,name,role:role || project.stage || project.current_stage || project.project_status || labelStatus(project.status),status:labelStatus(getProjectStatus(project)),source:source||'项目'});
    }
    A('allMembers').forEach(function(m){
      const mid = String(m.employee_id || m.user_id || m.member_id || m.designer_id || '');
      if(mid && mid === eid){
        const p = A('allProjects').find(x=>String(x.id)===String(m.project_id));
        push(p || {id:m.project_id,name:m.project_name,status:m.status}, m.job_role || m.role || m.member_role, '项目成员');
      }
    });
    A('allProjects').forEach(function(p){
      const ids = [p.owner_id,p.employee_id,p.assignee_id,p.designer_id,p.concept_assignee_id,p.technical_assignee_id,p.manager_id,p.responsible_id]
        .filter(v=>v!==undefined && v!==null).map(String);
      const names = [p.owner_name,p.employee_name,p.assignee_name,p.designer_name,p.concept_assignee_name,p.technical_assignee_name,p.responsible_name,p.owner,p.manager]
        .filter(Boolean).map(normText);
      if(ids.includes(eid) || names.includes(ename)) push(p, p.stage || p.current_stage, '项目字段');
    });
    A('preplanItems').forEach(function(pp){
      const ids = [pp.employee_id,pp.user_id,pp.assignee_id,pp.concept_assignee_id,pp.technical_assignee_id,pp.conceptAssignee,pp.technicalAssignee]
        .filter(v=>v!==undefined && v!==null).map(String);
      const names = [pp.employee_name,pp.assignee_name,pp.concept_assignee_name,pp.technical_assignee_name].filter(Boolean).map(normText);
      if(ids.includes(eid) || names.includes(ename)){
        push({id:pp.id,name:pp.name||pp.project_name,status:pp.status||'预排中',stage:pp.phase}, pp.phase || '预排', '人员安排');
      }
    });
    return rows;
  }
  window.collectProjectsForEmployee = collectProjectsForEmployee;

  window.buildPeopleLoadRows = function(){
    return (window.getWorkloadEmployees() || []).map(function(p){
      const projectsNow = collectProjectsForEmployee(p);
      const limit = getWorkloadProjectLimit(p);
      const count = projectsNow.length;
      const overload = count > limit;
      const near = !overload && count >= Math.max(1, limit - 1);
      let suggestion = '可正常安排';
      if(overload) suggestion = '已超载 ' + (count - limit) + ' 个：建议暂停新增完整项目，优先转派或拆分新项目。';
      else if(near) suggestion = '接近上限：只安排短任务/低风险任务，避免再加完整项目。';
      return {person:p,name:p.name||p.email||'未命名',role:p.job_title||p.role||'未设置岗位',count,limit,overload,near,projects:projectsNow,suggestion};
    }).sort(function(a,b){
      return (Number(b.overload)-Number(a.overload)) || (b.count-a.count) || String(a.name).localeCompare(String(b.name),'zh');
    });
  };
  try { (0,eval)('buildPeopleLoadRows = window.buildPeopleLoadRows'); } catch(e){}

  function renderProjectCountBars(){
    const el = document.getElementById('empLoadBars');
    if(!el) return false;
    const rows = window.buildPeopleLoadRows ? window.buildPeopleLoadRows() : [];
    if(!rows.length){
      el.innerHTML = '<div class="empty">暂无需要统计负荷的执行层员工</div>';
      return true;
    }
    el.innerHTML = rows.map(function(r){
      const pct = r.limit ? Math.round(r.count / r.limit * 100) : 0;
      const cls = r.overload ? 'pf-red' : r.near ? 'pf-gold' : 'pf-green';
      const color = r.overload ? 'var(--accent)' : r.near ? 'var(--gold)' : 'var(--green)';
      const detail = r.projects.length ? r.projects.slice(0,4).map(function(p){
        return '<div style="font-size:11px;color:var(--text-sub);line-height:1.7;margin-left:32px">· '+safe(p.name)+'｜'+safe(p.role || p.status)+'</div>';
      }).join('') : '<div style="font-size:11px;color:var(--text-sub);margin-left:32px">暂无未完结参与项目</div>';
      return '<div class="prog-wrap" onclick="openPeopleLoadAnalysis()" style="cursor:pointer">' +
        '<div class="prog-hd"><span style="display:flex;align-items:center;gap:8px">' +
        '<div class="emp-av" style="background:'+(r.person.avatar_color||'#888')+';width:24px;height:24px;font-size:10px">'+safe((r.name||'?').slice(0,1))+'</div>' +
        safe(r.name)+' <span style="font-size:11px;color:var(--text-sub)">'+safe(r.role||'')+'</span></span>' +
        '<span class="mono" style="color:'+color+'">'+r.count+' / '+r.limit+' 个项目</span></div>' +
        '<div class="prog-track"><div class="prog-fill '+cls+'" style="width:'+Math.min(pct,100)+'%"></div></div>' +
        detail + '</div>';
    }).join('');
    return true;
  }

  patchAsyncFunction('renderEmpLoadBars', function(base){
    return function(){
      if(renderProjectCountBars()) return;
      return base.apply(this, arguments);
    };
  });

  window.renderPeopleLoadAnalysis = function(){
    const rows = window.buildPeopleLoadRows ? window.buildPeopleLoadRows() : [];
    const overloaded = rows.filter(r=>r.overload).length;
    const near = rows.filter(r=>r.near).length;
    const totalActive = rows.reduce((s,r)=>s+r.count,0);
    const summary = document.getElementById('peopleLoadSummary');
    if(summary){
      summary.innerHTML =
        '<div class="stat-card '+(overloaded?'red':'green')+'"><div class="s-label">超载人员</div><div class="s-val">'+overloaded+'</div><div class="s-change">'+(overloaded?'需要立即调整':'暂无明显超载')+'</div></div>' +
        '<div class="stat-card '+(near?'gold':'green')+'"><div class="s-label">接近上限</div><div class="s-val">'+near+'</div><div class="s-change">建议谨慎加任务</div></div>' +
        '<div class="stat-card blue"><div class="s-label">未完结项目占用</div><div class="s-val">'+totalActive+'</div><div class="s-change">不含已完工/暂停/取消</div></div>';
    }
    const box = document.getElementById('peopleLoadTable');
    if(!box) return;
    if(!rows.length){ box.innerHTML = '<div class="empty">暂无人员数据。请先确认 users / project_members 已加载。</div>'; return; }
    box.innerHTML = '<div class="card"><table class="data-table"><thead><tr><th>人员</th><th>岗位</th><th>未完结项目</th><th>建议上限</th><th>判断</th><th>建议</th></tr></thead><tbody>' +
      rows.map(function(r){
        const status = r.overload ? '<span class="badge badge-risk">过载</span>' : r.near ? '<span class="badge badge-warn">接近上限</span>' : '<span class="badge badge-active">正常</span>';
        const projectText = r.projects.length ? r.projects.map(p=>safe(p.name)+'<br><span style="font-size:10px;color:var(--text-sub)">'+safe(p.role || p.status)+'</span>').join('<hr style="border:none;border-top:1px solid var(--cream);margin:6px 0">') : '—';
        return '<tr><td class="fw6">'+safe(r.name)+'</td><td>'+safe(r.role)+'</td><td>'+projectText+'</td><td class="mono">'+r.count+' / '+r.limit+'</td><td>'+status+'</td><td style="max-width:260px">'+safe(r.suggestion)+'</td></tr>';
      }).join('') + '</tbody></table></div>';
  };
  try { (0,eval)('renderPeopleLoadAnalysis = window.renderPeopleLoadAnalysis'); } catch(e){}

  function hideQuoteEntrances(){
    document.querySelectorAll('button,[onclick]').forEach(function(el){
      const t = (el.textContent || '') + ' ' + (el.getAttribute('onclick') || '') + ' ' + (el.dataset?.page || '');
      if(/报价|quote/.test(t)) el.style.display = 'none';
    });
  }
  hideQuoteEntrances();
  setInterval(hideQuoteEntrances, 1500);

  if(typeof E('nav') === 'function'){
    const oldNav = E('nav');
    if(!oldNav.__noQuotePatched){
      const wrappedNav = function(page, el, source){
        if(page === 'quote'){
          if(typeof E('toast') === 'function') E('toast')('报价测算已下线，电脑端保留项目管理、人员安排、绩效和审图。');
          return false;
        }
        return oldNav.apply(this, arguments);
      };
      wrappedNav.__noQuotePatched = true;
      try { (0,eval)('nav = wrappedNav'); } catch(e) { window.nav = wrappedNav; }
    }
  }

  setTimeout(async function(){
    await loadStageOverrides(true);
    applyStageOverridesToProjects();
    const ra = E('renderAll');
    if(typeof ra === 'function') ra();
    renderProjectCountBars();
  }, 1200);

  window.__desktopInteropPatchReady = true;
})();

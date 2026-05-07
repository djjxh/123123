/* login_hotfix.js · 修复 index_full 登录函数缺失 */
(function(){
  window.SUPABASE_URL = window.SUPABASE_URL || 'https://bgjvuszufqbbialkyeiq.supabase.co';
  window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_2yQgdIPmNnxQRTswLSLSwQ_KFaIuUjv';
  function getClient(){
    if(window.__sbClient) return window.__sbClient;
    if(!window.supabase || !window.supabase.createClient) throw new Error('Supabase SDK 未加载');
    window.__sbClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
      auth:{ storage:window.localStorage, persistSession:true, autoRefreshToken:true, detectSessionInUrl:false, flowType:'pkce', storageKey:'design-console-auth' }
    });
    window.sb = window.__sbClient;
    return window.__sbClient;
  }
  function showError(msg){
    var el=document.getElementById('loginError');
    if(el){ el.textContent=msg; el.style.display='block'; }
    else alert(msg);
  }
  window.loginWithPassword = async function(){
    var email=(document.getElementById('loginEmail')?.value||'').trim();
    var password=document.getElementById('loginPassword')?.value||'';
    if(!email){ showError('请输入邮箱'); return; }
    if(!password){ showError('请输入密码'); return; }
    var btn=document.getElementById('loginBtn');
    var old=btn?btn.textContent:'登录';
    try{
      if(btn){ btn.disabled=true; btn.textContent='登录中…'; }
      var client=getClient();
      var result=await client.auth.signInWithPassword({email:email,password:password});
      if(result.error){ showError('登录失败：'+(result.error.message||'邮箱或密码错误')); return; }
      window.currentUser = result.data && result.data.user;
      if(typeof window.loadUserProfile==='function' && typeof window.showApp==='function'){
        try{ await window.loadUserProfile(); await window.showApp(); return; }catch(e){ console.warn('showApp fallback',e); }
      }
      location.replace('index_reworked.html?v=login-fallback-' + Date.now());
    }catch(e){
      console.error(e);
      showError('登录异常：'+(e.message||e));
    }finally{
      if(btn){ btn.disabled=false; btn.textContent=old||'登录'; }
    }
  };
  document.addEventListener('DOMContentLoaded', function(){
    var form=document.getElementById('loginStep1');
    var btn=document.getElementById('loginBtn');
    var pwd=document.getElementById('loginPassword');
    if(form) form.onsubmit=function(e){ e.preventDefault(); window.loginWithPassword(); };
    if(btn) btn.onclick=function(e){ e.preventDefault(); window.loginWithPassword(); };
    if(pwd) pwd.onkeydown=function(e){ if(e.key==='Enter'){ e.preventDefault(); window.loginWithPassword(); } };
  });
})();

// Phase 4 QA — non-invasive checks for the parent analytics layer.
(function(){
 function run(){
  const d=window.ParentInsights?.summary?window.ParentInsights.summary():null;
  const checks={
   parentInsights:!!d,
   childName:!!d?.child,
   level:Number.isFinite(d?.currentLevel),
   accuracy:Number.isFinite(d?.accuracy)&&d.accuracy>=0&&d.accuracy<=100,
   rules:Array.isArray(d?.rules),
   recommendation:typeof d?.next==='string'&&d.next.length>0,
   localOnly:typeof localStorage!=='undefined',
   dashboardApi:!!window.ParentAnalytics?.render
  };
  return {ok:Object.values(checks).every(Boolean),checks,summary:d};
 }
 window.Phase4ParentAnalyticsQA={run};
})();

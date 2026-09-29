window.FURNITURE_CONFIG = {
  modelUrl: "https://pub-32feef14c66c4e86b2ff3d9a6368fcca.r2.dev/tour%20config.glb",
  configurableParts: [
    { label: "Caisson", meshNames: ["tour config"], materials: MATERIALS },
    { label: "Façade", meshNames: ["tour config.001"], materials: MATERIALS }
  ]
};

function m(code,name,hex,textureUrl=null,panel=[48,96]){
  return {code,name,hex,textureUrl,previewUrl:textureUrl,panel,roughness:.68,metalness:0};
}
const MATERIALS = [
  m("L175C","Blanc","#F2F1EC"),
  m("L581K","Beauté Naturelle","#C8A77A","https://wurthbaersupply.com/_next/image?q=75&url=https%3A%2F%2Fmedia.witglobal.net%2Fstmedia%2F1800%2Fimages%2Fstd.lang.all%2Fresolutions%2Fnormal%2F800px%2FGGRKP2OUUTYY.jpg&w=2048"),
  m("L580K","Esprit Libre","#DDD5C5","https://tafisa.ca/sites/default/files/2020-10/L580%28K%29%20Free%20Spirit_Esprit%20Libre_4X8%20%28Medium%29.jpg"),
  m("L592K","Accroche-Cœur","#8B654B","https://wurthbaersupply.com/_next/image?q=75&url=https%3A%2F%2Fmedia.witglobal.net%2Fstmedia%2F1800%2Fimages%2Fstd.lang.all%2Fresolutions%2Fnormal%2F800px%2FGGRKUN4KU6MS.jpg&w=640",[60,108]),
  m("L591K","Miel d’Acacia","#C9AD72","https://assets-910e068c0a.cdn.insitecloud.net/139b78c75ab76ba_lg.jpg",[60,108]),
  m("BLC11","Noir","#181817"),
  m("L831K","Roc Solide","#777874")
];
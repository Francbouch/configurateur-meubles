// Collez ici l'URL publique Cloudflare R2 du GLB.
// Exemple: "https://assets.votredomaine.ca/models/tour-config.glb"
window.FURNITURE_CONFIG = {
  modelUrl: "",
  configurableParts: [
    { label: "Structure", meshNames: ["tour config"], colors: [
      { name: "Chêne naturel", hex: "#B58C62" },
      { name: "Noyer", hex: "#604431" },
      { name: "Noir", hex: "#292826" }
    ]},
    { label: "Façade", meshNames: ["tour config.001"], colors: [
      { name: "Sable", hex: "#D6C7AE" },
      { name: "Argile", hex: "#A77860" },
      { name: "Blanc cassé", hex: "#E8E3D8" }
    ]}
  ]
};
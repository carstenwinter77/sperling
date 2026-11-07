// Vite: Datei-URL eines Moduls (z. B. pdf.js-Worker)
declare module '*?url' {
  const url: string;
  export default url;
}

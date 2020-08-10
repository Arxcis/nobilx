
function makeChargerMarker(occupied: number[], available: number[]) {
    const total = occupied.length + available.length - 1
    const outerWidthOffset = 70
    const outerWidthStep = 50
    const outerHeight = 158
    const innerWidthOffset = 60
    const innerWidthStep = 50
    const innerHeight = 135
    const arrowOffset = 30
    const arrowStep = 25
    const arrowY = 137
  
    const occupiedStart = -40
    const occupiedStep = 50
    const availableStart = occupiedStart + occupied.length*occupiedStep
    const availableStep = 50
  
    return `\
<?xml version="1.0" encoding="UTF-8"?>
<svg width="${outerWidthOffset + total*outerWidthStep}" height="${outerHeight}">
    <g transform="translate(5, 5)">
        <rect rx="20" ry="20" width="${innerWidthOffset + total*innerWidthStep}" height="${innerHeight}" style="fill:white;stroke:white;stroke-width:5;opacity:1" />
        <g transform="translate(${arrowOffset + total*arrowStep}, ${arrowY})">
            <rect x="-10" y="-10" width="20" height="20" style="fill:white;opacity:1" transform="rotate(45)" />
        </g>
${occupied.map((_, index) => `<rect x="${occupiedStart + (index+1)*occupiedStep}" y="8" rx="15" ry="15" width="40" height="120" style="fill:#f44336;stroke:#f44336;stroke-width:3;opacity:1" />`).join("\n")}
${available.map((_, index) => `<rect x="${availableStart + (index+1)*availableStep}" y="8" rx="15" ry="15" width="40" height="120" style="fill:#dfdfdf;stroke:#dfdfdf;stroke-width:3;opacity:1" />`).join("\n")}
    </g>
</svg>
  `;
  }
  
  const chargers = (function(){
    const chargers = []
    for (let MAX = 1; MAX <= 8; ++MAX) {
      for (let i = 0; i <= MAX; ++i) {
          let occupied = [...Array(i).keys()]
          let available = [...Array(MAX - i).keys()]
          chargers.push([occupied, available])
      }
    }
    return chargers
  })();



await Promise.all(chargers.map(async ([occupied, available]) => 
  await Deno.writeTextFile('./app/public/markers/station-'+occupied.length+"-"+available.length+".svg", makeChargerMarker(occupied, available))));

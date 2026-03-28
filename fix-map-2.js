const fs = require('fs');
let c = fs.readFileSync('frontend/src/components/Map.tsx', 'utf-8');

const start = c.indexOf('              filteredVehicles.map(vehicle => {');
const endStr = ' : \'IDLE\'}';
const endRaw = c.indexOf(endStr);
const end = c.indexOf('</div>', endRaw) + 6;
const end2 = c.indexOf('</div>', end) + 6;
const finalEnd = c.indexOf('</div>', end2) + 6;

if (start === -1 || endRaw === -1) {
  console.log("Could not find start or end block.");
  process.exit(1);
}

const match = c.substring(start, finalEnd);

const replacement = `              filteredVehicles.map(vehicle => {
                const pos = positions[vehicle.id];
                const speed = pos?.speed || 0;
                const isSpeeding = speed > 90;
                const catProps = getVehicleCategoryProps(vehicle);

                return (
                  <div
                    key={vehicle.id}
                    onClick={() => handleFocusVehicle(vehicle.id)}
                    onMouseEnter={() => setHoveredVehicle(vehicle.id)}
                    onMouseLeave={() => setHoveredVehicle(null)}
                    className={cn(
                      "group p-2.5 bg-white rounded-lg border transition-all cursor-pointer",
                      selectedVehicle === vehicle.id
                        ? "border-blue-400 ring-1 ring-blue-400 shadow-md"
                        : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2.5 items-center flex-1 min-w-0">
                        {/* Status Icon Indicator */}
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors border",
                          catProps.bg
                        )}>
                          <Truck className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="font-extrabold text-gray-900 text-[12px] leading-tight group-hover:text-blue-600 truncate transition-colors">
                            {vehicle.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-gray-500 font-mono tracking-tight bg-gray-100 px-1 py-0.5 rounded leading-none">
                              {vehicle.licensePlate}
                            </span>
                            <span className={cn(
                              "text-[9px] font-bold px-1 py-0.5 rounded uppercase leading-none border",
                              catProps.bg
                            )}>
                              {catProps.label}
                            </span>
                          </div>
                        </div>
                      </div>`;

fs.writeFileSync('frontend/src/components/Map.tsx', c.replace(match, replacement));
console.log('Replaced successfully');
// =========================================================================
// GiriRakshak SIH Early Warning System Engine
// Complete Live Regional Open-Meteo Ingestion + Dynamic AI Heatmap Engine
// Real-time ESP32 Pipeline + Overpass Highway Network 1 km Avoidance Corridors
// =========================================================================

// Request push permission when dashboard loads
document.addEventListener("DOMContentLoaded", () => {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
});

const INDIA_CENTER = [20.5937, 78.9629];
const INDIA_DEFAULT_ZOOM = 5;

// 1. Initialize Map
const map = L.map('map', {
  center: INDIA_CENTER,
  zoom: INDIA_DEFAULT_ZOOM,
  zoomControl: false
});

L.control.zoom({ position: 'bottomright' }).addTo(map);

// Google Maps Terrain/Roads Layer
L.tileLayer('https://mt1.google.com/vt/lyrs=p&hl=en&x={x}&y={y}&z={z}', {
  maxZoom: 18,
  attribution: '© Google Maps | GiriRakshak EWS SIH'
}).addTo(map);

// Layer Groups
const stateLayerGroup = L.layerGroup().addTo(map);
const rasterHeatmapGroup = L.layerGroup().addTo(map);
const zoneLayerGroup = L.layerGroup().addTo(map);
const hardwareMarkerGroup = L.layerGroup().addTo(map);
const citizenMarkerGroup = L.layerGroup().addTo(map);
const avoidZonesGroup = L.layerGroup().addTo(map);

let heatLayerInstance = null;

// Comprehensive Air Quality & Environmental Telemetry Directory (AeroTrace)
const indiaData = {
  // --- NORTH EASTERN REGION ---
  mizoram: {
    name: "Mizoram",
    center: [23.35, 92.85],
    zoom: 9,
    boundary: [[24.52, 92.98], [24.25, 93.28], [23.00, 93.42], [21.95, 92.80], [22.45, 92.55], [24.45, 92.70]],
    districts: {
      aizawl: {
        name: "Aizawl Urban Corridor",
        isHardwareNode: true,
        center: [23.7307, 92.7173],
        zoom: 13,
        riskLevel: "extreme",
        riskScore: 94.2,
        alertTitle: "CRITICAL AQI SPIKE: Urban Transit Corridor",
        alertText: "Live physical ESP32 telemetry confirms severe particulate matter spikes (PM2.5: 182 µg/m³) driven by diesel exhaust stagnation.",
        telemetry: { tilt: 182, moisture: 240, rain: 89 },
        zones: [{
          name: "Aizawl Urban Air Monitoring Corridor",
          riskLevel: "extreme",
          riskScore: 94.5,
          polygon: [[23.736, 92.712], [23.746, 92.721], [23.739, 92.733], [23.729, 92.722]],
          why: "Heavy vehicle exhaust combined with low atmospheric boundary layer and stagnant wind speeds.",
          shap: [
            { factor: "Vehicular Exhaust (PM2.5)", impact: 0.45 },
            { factor: "Industrial NO2 Density", impact: 0.32 },
            { factor: "Stagnant Wind Velocity", impact: 0.22 },
            { factor: "Urban Thermal Inversion", impact: 0.14 }
          ]
        }],
        sensorCoords: [23.739, 92.719]
      },
      lunglei: {
        name: "Lunglei",
        isHardwareNode: false,
        center: [22.8878, 92.7417],
        zoom: 13,
        riskLevel: "high",
        riskScore: 68.0,
        alertTitle: "MODERATE AQI WATCH: Lunglei Highway Sector",
        alertText: "Particulate suspension exceeding local clean air thresholds.",
        telemetry: { tilt: 84, moisture: 130, rain: 48 },
        zones: [{
          name: "Lunglei Valley Highway Sector",
          riskLevel: "high",
          riskScore: 68.0,
          polygon: [[22.880, 92.733], [22.895, 92.741], [22.891, 92.754], [22.875, 92.743]],
          why: "Unpaved road construction dust mixed with commercial transit exhaust.",
          shap: [{ factor: "Road Construction Dust", impact: 0.35 }, { factor: "Transit Fleet Exhaust", impact: 0.25 }]
        }]
      }
    }
  },

  nagaland: {
    name: "Nagaland",
    center: [26.1584, 94.5624],
    zoom: 8,
    boundary: [[27.02, 95.25], [26.05, 94.88], [25.52, 93.65], [26.95, 94.85]],
    districts: {
      dimapur: {
        name: "Dimapur Freight Corridor",
        isHardwareNode: false,
        center: [25.9042, 93.7279],
        zoom: 13,
        riskLevel: "extreme",
        riskScore: 86.4,
        alertTitle: "SEVERE AQI: NH-29 Transit Choke",
        alertText: "Heavy commercial freight idling in low dispersion valley conditions.",
        telemetry: { tilt: 141, moisture: 210, rain: 62 },
        zones: [{
          name: "NH-29 Dimapur Transit Choke",
          riskLevel: "extreme",
          riskScore: 86.4,
          polygon: [[25.892, 93.712], [25.914, 93.724], [25.910, 93.745], [25.888, 93.732]],
          why: "Freight truck traffic idling along choke points.",
          shap: [{ factor: "Freight Diesel Smoke", impact: 0.42 }, { factor: "Suspended Road Dust", impact: 0.30 }]
        }]
      }
    }
  },

  sikkim: {
    name: "Sikkim",
    center: [27.5330, 88.5122],
    zoom: 9,
    boundary: [[28.12, 88.65], [27.35, 88.92], [27.10, 88.10], [28.05, 88.35]],
    districts: {
      gangtok: {
        name: "Gangtok Transit Sector",
        isHardwareNode: false,
        center: [27.3389, 88.6065],
        zoom: 13,
        riskLevel: "high",
        riskScore: 68.0,
        alertTitle: "MODERATE AQI: Gangtok Ridge",
        alertText: "Seasonal tourist vehicle influx increasing ambient CO and PM2.5 levels.",
        telemetry: { tilt: 76, moisture: 110, rain: 28 },
        zones: [{
          name: "JN Road Tourist Link",
          riskLevel: "high",
          riskScore: 68.0,
          polygon: [[27.329, 88.595], [27.348, 88.607], [27.344, 88.620], [27.325, 88.608]],
          why: "Tourist vehicle exhaust trapping in valley inversion layer.",
          shap: [{ factor: "Tourist Vehicle Fleet", impact: 0.44 }]
        }]
      }
    }
  },

  assam: {
    name: "Assam",
    center: [26.2006, 92.9376],
    zoom: 7,
    boundary: [[27.95, 96.00], [26.80, 93.80], [24.50, 92.60], [26.85, 92.10]],
    districts: {
      guwahati: {
        name: "Guwahati Metropolitan",
        isHardwareNode: false,
        center: [26.1445, 91.7362],
        zoom: 13,
        riskLevel: "extreme",
        riskScore: 92.8,
        alertTitle: "CRITICAL AQI: Refinery & Transit Sector",
        alertText: "Petrochemical refinery emissions mixing with heavy urban construction dust.",
        telemetry: { tilt: 210, moisture: 340, rain: 110 },
        zones: [{
          name: "Guwahati Commercial Sector",
          riskLevel: "extreme",
          riskScore: 92.8,
          polygon: [[26.135, 91.725], [26.154, 91.735], [26.150, 91.750], [26.130, 91.736]],
          why: "Industrial point source emissions combined with unpaved road particulate matter.",
          shap: [{ factor: "Refinery Point Sources", impact: 0.48 }, { factor: "Construction Dust", impact: 0.34 }]
        }]
      }
    }
  },

  meghalaya: {
    name: "Meghalaya",
    center: [25.4670, 91.3662],
    zoom: 8,
    boundary: [[26.15, 91.80], [25.10, 92.75], [25.10, 89.85], [26.05, 91.20]],
    districts: {
      shillong: {
        name: "Shillong Commercial",
        isHardwareNode: false,
        center: [25.5788, 91.8933],
        zoom: 13,
        riskLevel: "high",
        riskScore: 71.5,
        alertTitle: "MODERATE AQI: Shillong Urban Basin",
        alertText: "Commercial center vehicle density driving localized nitrogen dioxide accumulation.",
        telemetry: { tilt: 88, moisture: 125, rain: 35 },
        zones: [{
          name: "Bara Bazar Sector",
          riskLevel: "high",
          riskScore: 71.5,
          polygon: [[25.569, 91.881], [25.590, 91.893], [25.585, 91.907], [25.564, 91.894]],
          why: "Commercial idling traffic in compressed urban basin.",
          shap: [{ factor: "Urban Fleet Idling", impact: 0.42 }]
        }]
      }
    }
  },

  manipur: {
    name: "Manipur",
    center: [24.8170, 93.9368],
    zoom: 8,
    boundary: [[25.68, 94.45], [24.15, 94.35], [23.85, 93.10], [25.50, 93.55]],
    districts: {
      imphal: {
        name: "Imphal Valley",
        isHardwareNode: false,
        center: [24.8170, 93.9368],
        zoom: 13,
        riskLevel: "high",
        riskScore: 74.8,
        alertTitle: "MODERATE AQI: Imphal Basin",
        alertText: "Agricultural residue burning smoke collecting in central valley ring.",
        telemetry: { tilt: 112, moisture: 165, rain: 42 },
        zones: [{
          name: "Imphal Ring Corridor",
          riskLevel: "high",
          riskScore: 74.8,
          polygon: [[24.808, 93.925], [24.828, 93.936], [24.824, 93.951], [24.802, 93.938]],
          why: "Valley topography trapping biomass smoke.",
          shap: [{ factor: "Crop Residue Smoke", impact: 0.49 }]
        }]
      }
    }
  },

  arunachal_pradesh: {
    name: "Arunachal Pradesh",
    center: [28.2180, 94.7278],
    zoom: 7,
    boundary: [[29.30, 96.50], [27.00, 95.80], [26.85, 92.10], [28.80, 94.00]],
    districts: {
      itanagar: {
        name: "Itanagar Eco Zone",
        isHardwareNode: false,
        center: [27.0844, 93.6053],
        zoom: 13,
        riskLevel: "good",
        riskScore: 35.0,
        alertTitle: "GOOD AQI: Itanagar Forest Capital",
        alertText: "Pristine air quality maintained by dense forest bio-filtration.",
        telemetry: { tilt: 32, moisture: 45, rain: 12 },
        zones: [{
          name: "Capital Eco Corridor",
          riskLevel: "good",
          riskScore: 35.0,
          polygon: [[27.075, 93.595], [27.094, 93.605], [27.091, 93.618], [27.070, 93.606]],
          why: "High forest canopy filtering airborne particulates.",
          shap: [{ factor: "Forest Canopy Bio-filtration", impact: -0.45 }]
        }]
      }
    }
  },

  tripura: {
    name: "Tripura",
    center: [23.8315, 91.2868],
    zoom: 8,
    boundary: [[24.50, 92.20], [23.00, 91.90], [23.00, 91.30], [24.20, 91.80]],
    districts: {
      agartala: {
        name: "Agartala Border Transit",
        isHardwareNode: false,
        center: [23.8315, 91.2868],
        zoom: 13,
        riskLevel: "high",
        riskScore: 62.0,
        alertTitle: "MODERATE AQI: Agartala Transit Zone",
        alertText: "Cross-border commercial truck queuing raising localized particulate counts.",
        telemetry: { tilt: 68, moisture: 105, rain: 22 },
        zones: [{
          name: "Agartala Border Terminal",
          riskLevel: "high",
          riskScore: 62.0,
          polygon: [[23.822, 91.276], [23.841, 91.287], [23.837, 91.300], [23.817, 91.288]],
          why: "Commercial truck queuing at border check posts.",
          shap: [{ factor: "Cross-Border Freight Idling", impact: 0.38 }]
        }]
      }
    }
  },

  // --- CAPITAL & NORTHERN STATES ---
  delhi: {
    name: "Delhi NCR",
    center: [28.7041, 77.1025],
    zoom: 10,
    boundary: [[28.88, 76.85], [28.88, 77.35], [28.40, 77.35], [28.40, 76.85]],
    districts: {
      anand_vihar: {
        name: "Anand Vihar Hotspot",
        isHardwareNode: false,
        center: [28.6469, 77.3160],
        zoom: 13,
        riskLevel: "extreme",
        riskScore: 98.2,
        alertTitle: "CRITICAL EMERGENCY: Severe Industrial & Bus Hub AQI",
        alertText: "Severe PM2.5 levels exceeding 420 µg/m³. Public health advisory active.",
        telemetry: { tilt: 420, moisture: 510, rain: 145 },
        zones: [{
          name: "Anand Vihar Transit Hub",
          riskLevel: "extreme",
          riskScore: 98.2,
          polygon: [[28.640, 77.305], [28.655, 77.315], [28.650, 77.328], [28.635, 77.318]],
          why: "Interstate diesel bus terminal, industrial point sources, and stubble smoke trapping.",
          shap: [{ factor: "Interstate Bus Diesel Exhaust", impact: 0.52 }, { factor: "Industrial Point Sources", impact: 0.28 }]
        }]
      }
    }
  },

  punjab: {
    name: "Punjab",
    center: [31.1471, 75.3412],
    zoom: 8,
    boundary: [[32.50, 74.80], [31.80, 76.90], [29.80, 76.20], [30.10, 74.20]],
    districts: {
      ludhiana: {
        name: "Ludhiana Industrial Cluster",
        isHardwareNode: false,
        center: [30.9010, 75.8573],
        zoom: 13,
        riskLevel: "extreme",
        riskScore: 91.0,
        alertTitle: "SEVERE AQI: Stubble & Industrial Smoke",
        alertText: "Agricultural stubble burning combined with textile dye mill furnace emissions.",
        telemetry: { tilt: 310, moisture: 420, rain: 115 },
        zones: [{
          name: "Ludhiana Industrial Belt",
          riskLevel: "extreme",
          riskScore: 91.0,
          polygon: [[30.890, 75.845], [30.910, 75.860], [30.905, 75.875], [30.885, 75.860]],
          why: "Industrial furnaces mixing with seasonal agricultural fire plumes.",
          shap: [{ factor: "Agricultural Stubble Burning", impact: 0.58 }, { factor: "Textile Mill Furnaces", impact: 0.26 }]
        }]
      }
    }
  },

  haryana: {
    name: "Haryana",
    center: [29.0588, 76.0856],
    zoom: 8,
    boundary: [[30.90, 76.80], [29.80, 77.60], [27.70, 76.20], [29.20, 74.50]],
    districts: {
      gurugram: {
        name: "Gurugram Cyber Hub",
        isHardwareNode: false,
        center: [28.4595, 77.0266],
        zoom: 13,
        riskLevel: "extreme",
        riskScore: 89.5,
        alertTitle: "CRITICAL AQI: Highway & Diesel Generator Corridor",
        alertText: "Commercial diesel generator sets and expressway vehicular congestion.",
        telemetry: { tilt: 280, moisture: 380, rain: 98 },
        zones: [{
          name: "Cyber City Corridor",
          riskLevel: "extreme",
          riskScore: 89.5,
          polygon: [[28.450, 77.015], [28.470, 77.030], [28.465, 77.045], [28.445, 77.030]],
          why: "High density commercial diesel generators running during grid load shifts.",
          shap: [{ factor: "Commercial Genset Emissions", impact: 0.45 }]
        }]
      }
    }
  },

  uttar_pradesh: {
    name: "Uttar Pradesh",
    center: [26.8467, 80.9462],
    zoom: 7,
    boundary: [[30.40, 77.50], [28.20, 84.40], [24.00, 82.80], [27.20, 78.00]],
    districts: {
      kanpur: {
        name: "Kanpur Industrial Hub",
        isHardwareNode: false,
        center: [26.4499, 80.3319],
        zoom: 13,
        riskLevel: "extreme",
        riskScore: 95.1,
        alertTitle: "SEVERE AQI: Tannery & Industrial Belt",
        alertText: "Uncontrolled industrial chimney emissions and heavy traffic dust.",
        telemetry: { tilt: 360, moisture: 460, rain: 130 },
        zones: [{
          name: "Jajmau Industrial Sector",
          riskLevel: "extreme",
          riskScore: 95.1,
          polygon: [[26.440, 80.320], [26.460, 80.335], [26.455, 80.350], [26.435, 80.335]],
          why: "Coal burning in brick kilns and leather tannery industrial boilers.",
          shap: [{ factor: "Brick Kiln Coal Combustion", impact: 0.50 }]
        }]
      }
    }
  },

  rajasthan: {
    name: "Rajasthan",
    center: [27.0238, 74.2179],
    zoom: 6,
    boundary: [[30.20, 73.80], [27.80, 78.20], [23.50, 74.40], [26.80, 70.20]],
    districts: {
      jaipur: {
        name: "Jaipur Urban",
        isHardwareNode: false,
        center: [26.9124, 75.7873],
        zoom: 13,
        riskLevel: "high",
        riskScore: 78.0,
        alertTitle: "HIGH AQI: Desert Mineral Dust & Traffic",
        alertText: "Thar desert mineral dust re-suspension mixed with urban traffic.",
        telemetry: { tilt: 160, moisture: 310, rain: 45 },
        zones: [{
          name: "Jaipur Walled City Corridor",
          riskLevel: "high",
          riskScore: 78.0,
          polygon: [[26.900, 75.775], [26.920, 75.790], [26.915, 75.805], [26.895, 75.790]],
          why: "High mineral dust PM10 re-suspension from arid surroundings.",
          shap: [{ factor: "Windblown Desert Mineral Dust", impact: 0.54 }]
        }]
      }
    }
  },

  himachal_pradesh: {
    name: "Himachal Pradesh",
    center: [31.1048, 77.1734],
    zoom: 8,
    boundary: [[33.20, 76.20], [32.00, 79.00], [30.40, 77.60], [32.10, 75.60]],
    districts: {
      shimla: {
        name: "Shimla Valley",
        isHardwareNode: false,
        center: [31.1048, 77.1734],
        zoom: 13,
        riskLevel: "good",
        riskScore: 42.0,
        alertTitle: "GOOD AQI: Mountain Eco Protection",
        alertText: "Clean mountain air with minor localized tourist vehicle combustion.",
        telemetry: { tilt: 42, moisture: 60, rain: 18 },
        zones: [{
          name: "Mall Road Pedestrian Zone",
          riskLevel: "good",
          riskScore: 42.0,
          polygon: [[31.095, 77.165], [31.115, 77.178], [31.110, 77.190], [31.090, 77.178]],
          why: "Vehicular exclusion zone maintaining low local emission baseline.",
          shap: [{ factor: "Vehicular Exclusion Zone", impact: -0.40 }]
        }]
      }
    }
  },

  uttarakhand: {
    name: "Uttarakhand",
    center: [30.0668, 79.0193],
    zoom: 8,
    boundary: [[31.40, 77.80], [30.60, 81.00], [28.80, 79.80], [30.20, 77.60]],
    districts: {
      dehradun: {
        name: "Dehradun Valley",
        isHardwareNode: false,
        center: [30.3165, 78.0322],
        zoom: 13,
        riskLevel: "high",
        riskScore: 72.0,
        alertTitle: "MODERATE AQI: Doon Valley Basin",
        alertText: "Doond valley topography trapping urban transport smoke.",
        telemetry: { tilt: 95, moisture: 140, rain: 32 },
        zones: [{
          name: "ISBT Dehradun Corridor",
          riskLevel: "high",
          riskScore: 72.0,
          polygon: [[30.305, 78.020], [30.325, 78.035], [30.320, 78.050], [30.300, 78.035]],
          why: "Valley enclosure trapping diesel bus transit exhaust.",
          shap: [{ factor: "Valley Topography Trap", impact: 0.38 }]
        }]
      }
    }
  },

  // --- WESTERN & CENTRAL STATES ---
  maharashtra: {
    name: "Maharashtra",
    center: [19.7515, 75.7139],
    zoom: 7,
    boundary: [[22.00, 72.60], [21.50, 80.90], [15.80, 74.20], [18.20, 72.80]],
    districts: {
      mumbai: {
        name: "Mumbai Coastal Hub",
        isHardwareNode: false,
        center: [19.0760, 72.8777],
        zoom: 12,
        riskLevel: "extreme",
        riskScore: 88.5,
        alertTitle: "CRITICAL AQI: Port & Construction Corridor",
        alertText: "High coastal humidity binding traffic diesel particulates and construction dust.",
        telemetry: { tilt: 240, moisture: 360, rain: 105 },
        zones: [{
          name: "Chembur Industrial Sector",
          riskLevel: "extreme",
          riskScore: 88.5,
          polygon: [[19.065, 72.865], [19.085, 72.880], [19.080, 72.895], [19.060, 72.880]],
          why: "Refineries, fertilizer complex, and dense arterial sea-link traffic.",
          shap: [{ factor: "Coastal Moisture Particle Binding", impact: 0.44 }, { factor: "Refinery Complex Smoke", impact: 0.32 }]
        }]
      }
    }
  },

  gujarat: {
    name: "Gujarat",
    center: [22.2587, 71.1924],
    zoom: 7,
    boundary: [[24.70, 68.20], [24.50, 74.30], [20.10, 72.90], [22.50, 68.90]],
    districts: {
      ahmedabad: {
        name: "Ahmedabad Industrial",
        isHardwareNode: false,
        center: [23.0225, 72.5714],
        zoom: 13,
        riskLevel: "extreme",
        riskScore: 92.0,
        alertTitle: "SEVERE AQI: Textile & Chemical Corridor",
        alertText: "Chemical industrial estate coal boilers emitting sulfur and particulate clouds.",
        telemetry: { tilt: 290, moisture: 390, rain: 120 },
        zones: [{
          name: "Vatva Industrial Zone",
          riskLevel: "extreme",
          riskScore: 92.0,
          polygon: [[23.010, 72.560], [23.030, 72.575], [23.025, 72.590], [23.005, 72.575]],
          why: "Chemical processing boilers burning solid fossil fuels.",
          shap: [{ factor: "Chemical Boiler Coal Smoke", impact: 0.52 }]
        }]
      }
    }
  },

  madhya_pradesh: {
    name: "Madhya Pradesh",
    center: [22.9734, 78.6569],
    zoom: 7,
    boundary: [[26.80, 78.00], [24.20, 82.80], [21.10, 76.00], [23.50, 74.00]],
    districts: {
      indore: {
        name: "Indore Urban",
        isHardwareNode: false,
        center: [22.7196, 75.8577],
        zoom: 13,
        riskLevel: "high",
        riskScore: 76.0,
        alertTitle: "HIGH AQI: Commercial Transport Hub",
        alertText: "Urban freight logistics and vehicular traffic emissions.",
        telemetry: { tilt: 130, moisture: 210, rain: 55 },
        zones: [{
          name: "Vijay Nagar Commercial Sector",
          riskLevel: "high",
          riskScore: 76.0,
          polygon: [[22.710, 75.845], [22.730, 75.860], [22.725, 75.875], [22.705, 75.860]],
          why: "High commercial traffic density along bypass transit arterial.",
          shap: [{ factor: "Urban Commercial Fleet Exhaust", impact: 0.40 }]
        }]
      }
    }
  },

  chhattisgarh: {
    name: "Chhattisgarh",
    center: [21.2787, 81.8661],
    zoom: 7,
    boundary: [[24.10, 83.40], [21.50, 84.40], [17.80, 81.20], [22.00, 80.20]],
    districts: {
      korba: {
        name: "Korba Power Capital",
        isHardwareNode: false,
        center: [22.3595, 82.7501],
        zoom: 13,
        riskLevel: "extreme",
        riskScore: 96.5,
        alertTitle: "CRITICAL AQI: Thermal Power Plant Fly Ash Zone",
        alertText: "Coal-fired power station fly ash dumps releasing airborne PM10.",
        telemetry: { tilt: 380, moisture: 490, rain: 160 },
        zones: [{
          name: "Korba Thermal Power Belt",
          riskLevel: "extreme",
          riskScore: 96.5,
          polygon: [[22.350, 82.740], [22.370, 82.755], [22.365, 82.770], [22.345, 82.755]],
          why: "Uncontrolled coal fly ash dispersion from power plant storage ponds.",
          shap: [{ factor: "Coal Power Fly Ash Dispersion", impact: 0.62 }]
        }]
      }
    }
  },

  goa: {
    name: "Goa",
    center: [15.2993, 74.1240],
    zoom: 10,
    boundary: [[15.80, 73.70], [15.50, 74.30], [14.90, 74.10], [15.30, 73.80]],
    districts: {
      panaji: {
        name: "Panaji Coastal",
        isHardwareNode: false,
        center: [15.4909, 73.8278],
        zoom: 13,
        riskLevel: "good",
        riskScore: 38.0,
        alertTitle: "GOOD AQI: Coastal Sea Breeze Zone",
        alertText: "Strong marine breezes dispersing localized vehicular emissions.",
        telemetry: { tilt: 38, moisture: 55, rain: 15 },
        zones: [{
          name: "Mandovi Waterfront Corridor",
          riskLevel: "good",
          riskScore: 38.0,
          polygon: [[15.480, 73.815], [15.500, 73.830], [15.495, 73.845], [15.475, 73.830]],
          why: "Coastal sea breeze providing high pollutant dispersion rate.",
          shap: [{ factor: "Coastal Sea Breeze Dispersion", impact: -0.48 }]
        }]
      }
    }
  },

  // --- EASTERN STATES ---
  west_bengal: {
    name: "West Bengal",
    center: [22.9868, 87.8550],
    zoom: 7,
    boundary: [[27.20, 88.20], [24.00, 88.80], [21.50, 87.50], [23.50, 86.00]],
    districts: {
      kolkata: {
        name: "Kolkata Metropolitan",
        isHardwareNode: false,
        center: [22.5726, 88.3639],
        zoom: 12,
        riskLevel: "extreme",
        riskScore: 91.5,
        alertTitle: "SEVERE AQI: High Density Commercial Hub",
        alertText: "Old commercial diesel vehicles trapped in high density street canyons.",
        telemetry: { tilt: 290, moisture: 410, rain: 125 },
        zones: [{
          name: "Howrah & Burrabazar Sector",
          riskLevel: "extreme",
          riskScore: 91.5,
          polygon: [[22.560, 88.350], [22.580, 88.365], [22.575, 88.380], [22.555, 88.365]],
          why: "Commercial diesel trucks idling in narrow urban street canyons.",
          shap: [{ factor: "Commercial Diesel Street Canyons", impact: 0.48 }]
        }]
      }
    }
  },

  bihar: {
    name: "Bihar",
    center: [25.0961, 85.3131],
    zoom: 7,
    boundary: [[27.50, 84.00], [26.00, 88.20], [24.50, 86.80], [25.00, 83.50]],
    districts: {
      patna: {
        name: "Patna Gangetic Basin",
        isHardwareNode: false,
        center: [25.5941, 85.1376],
        zoom: 13,
        riskLevel: "extreme",
        riskScore: 94.0,
        alertTitle: "CRITICAL AQI: Gangetic Alluvial Dust & Vehicles",
        alertText: "Riverbed sand silt particulate re-suspension and old diesel fleet smoke.",
        telemetry: { tilt: 340, moisture: 450, rain: 135 },
        zones: [{
          name: "Patna Riverfront Transit Corridor",
          riskLevel: "extreme",
          riskScore: 94.0,
          polygon: [[25.585, 85.125], [25.605, 85.140], [25.600, 85.155], [25.580, 85.140]],
          why: "Fine Gangetic alluvial silt particles suspended by unpaved road traffic.",
          shap: [{ factor: "Suspended Gangetic Alluvial Dust", impact: 0.54 }]
        }]
      }
    }
  },

  jharkhand: {
    name: "Jharkhand",
    center: [23.6102, 85.2799],
    zoom: 8,
    boundary: [[25.30, 87.80], [23.80, 86.80], [22.00, 85.00], [24.00, 83.50]],
    districts: {
      dhanbad: {
        name: "Dhanbad Coal Capital",
        isHardwareNode: false,
        center: [23.7957, 86.4304],
        zoom: 13,
        riskLevel: "extreme",
        riskScore: 97.2,
        alertTitle: "CRITICAL AQI: Open Cast Coal Mining Zone",
        alertText: "Open cast coal pit fires and heavy mineral transport dust clouds.",
        telemetry: { tilt: 410, moisture: 530, rain: 155 },
        zones: [{
          name: "Jharia Coal Belt",
          riskLevel: "extreme",
          riskScore: 97.2,
          polygon: [[23.785, 86.420], [23.805, 86.435], [23.800, 86.450], [23.780, 86.435]],
          why: "Subsurface coal seam fires combined with open mineral truck logistics.",
          shap: [{ factor: "Subsurface Coal Pit Fires", impact: 0.65 }]
        }]
      }
    }
  },

  odisha: {
    name: "Odisha",
    center: [20.9517, 85.0985],
    zoom: 7,
    boundary: [[22.50, 86.50], [19.80, 85.80], [18.20, 82.50], [21.80, 83.80]],
    districts: {
      angul: {
        name: "Angul Industrial Corridor",
        isHardwareNode: false,
        center: [20.8444, 85.1025],
        zoom: 13,
        riskLevel: "extreme",
        riskScore: 90.5,
        alertTitle: "SEVERE AQI: Aluminum Smelter & Power Hub",
        alertText: "Heavy industrial aluminum smelting and thermal coal dust dispersion.",
        telemetry: { tilt: 270, moisture: 380, rain: 110 },
        zones: [{
          name: "Angul Smelter Industrial Belt",
          riskLevel: "extreme",
          riskScore: 90.5,
          polygon: [[20.835, 85.090], [20.855, 85.105], [20.850, 85.120], [20.830, 85.105]],
          why: "Heavy metallurgical smelter coal combustion and mineral transport.",
          shap: [{ factor: "Metallurgical Smelter Coal Smoke", impact: 0.52 }]
        }]
      }
    }
  },

  // --- SOUTHERN STATES ---
  karnataka: {
    name: "Karnataka",
    center: [15.3173, 75.7139],
    zoom: 7,
    boundary: [[18.40, 77.20], [15.00, 78.50], [11.60, 76.50], [14.80, 74.10]],
    districts: {
      bengaluru: {
        name: "Bengaluru Tech Corridor",
        isHardwareNode: false,
        center: [12.9716, 77.5946],
        zoom: 12,
        riskLevel: "high",
        riskScore: 78.5,
        alertTitle: "HIGH AQI: Outer Ring Road Traffic Choke",
        alertText: "Tech corridor peak hour traffic gridlock driving PM2.5 and NO2 levels up.",
        telemetry: { tilt: 145, moisture: 220, rain: 68 },
        zones: [{
          name: "Silk Board & Outer Ring Road Corridor",
          riskLevel: "high",
          riskScore: 78.5,
          polygon: [[12.960, 77.585], [12.980, 77.600], [12.975, 77.615], [12.955, 77.600]],
          why: "Extensive vehicular idling at bottleneck arterial interchanges.",
          shap: [{ factor: "Arterial Congestion Idling", impact: 0.46 }]
        }]
      }
    }
  },

  tamil_nadu: {
    name: "Tamil Nadu",
    center: [11.1271, 78.6569],
    zoom: 7,
    boundary: [[13.50, 80.20], [10.80, 79.80], [8.10, 77.50], [11.50, 76.20]],
    districts: {
      chennai: {
        name: "Chennai Industrial Coastal",
        isHardwareNode: false,
        center: [13.0827, 80.2707],
        zoom: 12,
        riskLevel: "high",
        riskScore: 76.2,
        alertTitle: "HIGH AQI: Manali Industrial Belt",
        alertText: "Petrochemical complex emissions combined with harbor freight transit.",
        telemetry: { tilt: 135, moisture: 230, rain: 62 },
        zones: [{
          name: "Manali Industrial Zone",
          riskLevel: "high",
          riskScore: 76.2,
          polygon: [[13.070, 80.260], [13.090, 80.275], [13.085, 80.290], [13.065, 80.275]],
          why: "Petrochemical refining and harbor heavy diesel freight traffic.",
          shap: [{ factor: "Harbor Freight Diesel Exhaust", impact: 0.42 }]
        }]
      }
    }
  },

  telangana: {
    name: "Telangana",
    center: [18.1124, 79.0193],
    zoom: 7,
    boundary: [[19.80, 78.20], [17.20, 81.60], [15.80, 78.00], [17.50, 77.20]],
    districts: {
      hyderabad: {
        name: "Hyderabad Metropolitan",
        isHardwareNode: false,
        center: [17.3850, 78.4867],
        zoom: 12,
        riskLevel: "high",
        riskScore: 75.0,
        alertTitle: "HIGH AQI: Industrial & Highway Belt",
        alertText: "Pharmaceutical manufacturing plant emissions and Outer Ring Road transit.",
        telemetry: { tilt: 125, moisture: 205, rain: 58 },
        zones: [{
          name: "Patancheru Industrial Belt",
          riskLevel: "high",
          riskScore: 75.0,
          polygon: [[17.375, 78.475], [17.395, 78.490], [17.390, 78.505], [17.370, 78.490]],
          why: "Chemical boiler emissions mixing with highway diesel exhaust.",
          shap: [{ factor: "Chemical Boiler Emissions", impact: 0.40 }]
        }]
      }
    }
  },

  andhra_pradesh: {
    name: "Andhra Pradesh",
    center: [15.9129, 79.7400],
    zoom: 7,
    boundary: [[19.10, 84.70], [15.80, 80.80], [13.50, 79.20], [15.50, 77.00]],
    districts: {
      visakhapatnam: {
        name: "Visakhapatnam Steel Hub",
        isHardwareNode: false,
        center: [17.6868, 83.2185],
        zoom: 13,
        riskLevel: "high",
        riskScore: 79.0,
        alertTitle: "HIGH AQI: Steel Plant & Port Terminal",
        alertText: "Iron ore dust handling and coal boiler combustion at coastal port.",
        telemetry: { tilt: 150, moisture: 240, rain: 65 },
        zones: [{
          name: "Vizag Steel & Port Corridor",
          riskLevel: "high",
          riskScore: 79.0,
          polygon: [[17.675, 83.205], [17.695, 83.220], [17.690, 83.235], [17.670, 83.220]],
          why: "Uncovered iron ore and coal stockyard particulate suspension.",
          shap: [{ factor: "Port Mineral Stockyard Dust", impact: 0.46 }]
        }]
      }
    }
  },

  kerala: {
    name: "Kerala",
    center: [10.8505, 76.2711],
    zoom: 8,
    boundary: [[12.80, 74.90], [10.50, 77.20], [8.30, 77.00], [10.00, 76.20]],
    districts: {
      kochi: {
        name: "Kochi Industrial Island",
        isHardwareNode: false,
        center: [9.9312, 76.2673],
        zoom: 13,
        riskLevel: "high",
        riskScore: 65.0,
        alertTitle: "MODERATE AQI: Eloor Chemical Belt",
        alertText: "Industrial chemical cluster emissions with high coastal humidity.",
        telemetry: { tilt: 72, moisture: 115, rain: 30 },
        zones: [{
          name: "Eloor Industrial Belt",
          riskLevel: "high",
          riskScore: 65.0,
          polygon: [[9.920, 76.255], [9.940, 76.270], [9.935, 76.285], [9.915, 76.270]],
          why: "Chemical manufacturing plant boiler exhaust.",
          shap: [{ factor: "Chemical Processing Exhaust", impact: 0.36 }]
        }]
      }
    }
  },

  // --- UNION TERRITORIES ---
  jammu_kashmir: {
    name: "Jammu and Kashmir",
    center: [33.7782, 76.5762],
    zoom: 7,
    boundary: [[35.50, 74.00], [33.80, 76.80], [32.80, 74.80], [34.50, 73.80]],
    districts: {
      srinagar: {
        name: "Srinagar Valley Basin",
        isHardwareNode: false,
        center: [34.0837, 74.7973],
        zoom: 13,
        riskLevel: "high",
        riskScore: 74.0,
        alertTitle: "HIGH AQI: Winter Domestic Combustion",
        alertText: "Buoyancy trapping of domestic biomass and coal heating smoke during inversion.",
        telemetry: { tilt: 110, moisture: 175, rain: 40 },
        zones: [{
          name: "Srinagar Basin Core",
          riskLevel: "high",
          riskScore: 74.0,
          polygon: [[34.070, 74.785], [34.090, 74.800], [34.085, 74.815], [34.065, 74.800]],
          why: "Winter thermal inversion trapping domestic wood and coal fire smoke.",
          shap: [{ factor: "Domestic Biomass Heating Smoke", impact: 0.52 }]
        }]
      }
    }
  },

  ladakh: {
    name: "Ladakh",
    center: [34.1526, 77.5771],
    zoom: 7,
    boundary: [[36.00, 75.50], [34.50, 79.50], [32.50, 78.50], [34.00, 76.00]],
    districts: {
      leh: {
        name: "Leh High Altitude Basin",
        isHardwareNode: false,
        center: [34.1526, 77.5771],
        zoom: 13,
        riskLevel: "good",
        riskScore: 28.0,
        alertTitle: "GOOD AQI: High Altitude Pristine Zone",
        alertText: "Pristine ambient air with minor local kerosene diesel heating emissions.",
        telemetry: { tilt: 28, moisture: 38, rain: 8 },
        zones: [{
          name: "Leh Town Sector",
          riskLevel: "good",
          riskScore: 28.0,
          polygon: [[34.140, 77.565], [34.160, 77.580], [34.155, 77.595], [34.135, 77.580]],
          why: "High atmospheric venting with pristine baseline environment.",
          shap: [{ factor: "High Atmospheric Venting", impact: -0.55 }]
        }]
      }
    }
  },

  chandigarh: {
    name: "Chandigarh",
    center: [30.7333, 76.7794],
    zoom: 11,
    boundary: [[30.80, 76.70], [30.80, 76.85], [30.65, 76.85], [30.65, 76.70]],
    districts: {
      chandigarh_core: {
        name: "Chandigarh Planned Sector",
        isHardwareNode: false,
        center: [30.7333, 76.7794],
        zoom: 13,
        riskLevel: "high",
        riskScore: 68.0,
        alertTitle: "MODERATE AQI: Regional Transit Corridor",
        alertText: "High per-capita private vehicle density driving localized ozone and PM2.5.",
        telemetry: { tilt: 82, moisture: 125, rain: 35 },
        zones: [{
          name: "Sector 17 Commercial Sector",
          riskLevel: "high",
          riskScore: 68.0,
          polygon: [[30.725, 76.770], [30.745, 76.785], [30.740, 76.800], [30.720, 76.785]],
          why: "High density per-capita passenger vehicular traffic.",
          shap: [{ factor: "Passenger Car Fleet Exhaust", impact: 0.38 }]
        }]
      }
    }
  },

  puducherry: {
    name: "Puducherry",
    center: [11.9416, 79.8083],
    zoom: 10,
    boundary: [[12.05, 79.75], [12.05, 79.88], [11.85, 79.88], [11.85, 79.75]],
    districts: {
      puducherry_town: {
        name: "Puducherry Coastal Town",
        isHardwareNode: false,
        center: [11.9416, 79.8083],
        zoom: 13,
        riskLevel: "good",
        riskScore: 45.0,
        alertTitle: "GOOD AQI: Bay of Bengal Marine Breeze",
        alertText: "Strong marine coastal breezes maintaining high atmospheric dispersion.",
        telemetry: { tilt: 45, moisture: 70, rain: 20 },
        zones: [{
          name: "Boulevard Town Coastal Sector",
          riskLevel: "good",
          riskScore: 45.0,
          polygon: [[11.930, 79.795], [11.950, 79.810], [11.945, 79.825], [11.925, 79.810]],
          why: "Marine airflow dispersing town center two-wheeler exhaust.",
          shap: [{ factor: "Marine Breeze Air Dispersion", impact: -0.42 }]
        }]
      }
    }
  },

  andaman_nicobar: {
    name: "Andaman and Nicobar Islands",
    center: [11.7401, 92.6586],
    zoom: 7,
    boundary: [[13.80, 92.50], [13.00, 93.20], [6.80, 93.90], [11.00, 92.20]],
    districts: {
      port_blair: {
        name: "Port Blair Harbor",
        isHardwareNode: false,
        center: [11.6233, 92.7265],
        zoom: 13,
        riskLevel: "good",
        riskScore: 25.0,
        alertTitle: "EXCELLENT AQI: Pristine Island Canopy",
        alertText: "Oceanic baseline air quality with negligible industrial activity.",
        telemetry: { tilt: 25, moisture: 35, rain: 6 },
        zones: [{
          name: "Port Blair Coastal Belt",
          riskLevel: "good",
          riskScore: 25.0,
          polygon: [[11.610, 92.715], [11.630, 92.730], [11.625, 92.745], [11.605, 92.730]],
          why: "Oceanic maritime baseline environment.",
          shap: [{ factor: "Oceanic Maritime Air Flow", impact: -0.60 }]
        }]
      }
    }
  },

  dadra_nagar_haveli_daman_diu: {
    name: "Dadra and Nagar Haveli and Daman and Diu",
    center: [20.3974, 72.8328],
    zoom: 10,
    boundary: [[20.50, 72.75], [20.50, 73.15], [20.10, 73.15], [20.10, 72.75]],
    districts: {
      vapi_border: {
        name: "Silvassa Industrial Estate",
        isHardwareNode: false,
        center: [20.2763, 73.0083],
        zoom: 13,
        riskLevel: "high",
        riskScore: 78.0,
        alertTitle: "HIGH AQI: Silvassa Manufacturing Cluster",
        alertText: "Plastic manufacturing units and industrial boiler coal smoke.",
        telemetry: { tilt: 140, moisture: 215, rain: 52 },
        zones: [{
          name: "Silvassa Industrial Belt",
          riskLevel: "high",
          riskScore: 78.0,
          polygon: [[20.265, 72.995], [20.285, 73.010], [20.280, 73.025], [20.260, 73.010]],
          why: "High density small-scale manufacturing unit boilers.",
          shap: [{ factor: "Small-Scale Manufacturing Boilers", impact: 0.44 }]
        }]
      }
    }
  },

  lakshadweep: {
    name: "Lakshadweep",
    center: [10.5626, 72.6420],
    zoom: 9,
    boundary: [[12.40, 71.80], [11.80, 74.00], [8.20, 73.50], [10.00, 72.00]],
    districts: {
      kavaratti: {
        name: "Kavaratti Island",
        isHardwareNode: false,
        center: [10.5626, 72.6420],
        zoom: 13,
        riskLevel: "good",
        riskScore: 18.0,
        alertTitle: "PRISTINE AQI: Coral Atoll Island",
        alertText: "Zero industrial presence maintaining pristine maritime air.",
        telemetry: { tilt: 18, moisture: 25, rain: 4 },
        zones: [{
          name: "Kavaratti Lagoon Zone",
          riskLevel: "good",
          riskScore: 18.0,
          polygon: [[10.550, 72.630], [10.570, 72.645], [10.565, 72.660], [10.545, 72.645]],
          why: "Pristine maritime oceanic isolation.",
          shap: [{ factor: "Oceanic Atoll Isolation", impact: -0.65 }]
        }]
      }
    }
  }
};

const translations = {
  en: "Warning: High landslide hazard detected on slope cuts. Evacuate immediately.",
  mz: "Fimkhurna: He laiah hian leimin hlauhawm a awm. Kham bul atangin inthiarfihlim vat rawh u.",
  as: "সাৱধান: পাহাৰীয়া অঞ্চলত ভূমিস্খলনৰ প্ৰৱল আশংকা। অবিলম্বে সুৰক্ষিত স্থানলৈ যাওক।",
  bn: "সতর্কতা: বিপজ্জনক পাহাড়ী ঢালে ভূমিধসের সম্ভাবনা। দ্রুত নিরাপদ আশ্রয়ে যান."
};

function getHazardColor(scoreOrLevel) {
  if (typeof scoreOrLevel === 'string') {
    switch (scoreOrLevel.toLowerCase()) {
      case 'critical':
      case 'extreme':
        return '#991b1b';
      case 'very-high':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      case 'moderate':
      default:
        return '#f97316';
    }
  }

  const score = Number(scoreOrLevel) || 0;
  if (score >= 90) return '#991b1b';
  if (score >= 75) return '#dc2626';
  if (score >= 60) return '#ea580c';
  return '#f97316';
}

// 5. Chart.js Implementation
let telemetryChart;

function initChart() {
  const chartCanvas = document.getElementById('telemetryChart');
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext('2d');

  telemetryChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['-20s', '-16s', '-12s', '-8s', '-4s', 'Now'],
      datasets: [
        {
          label: 'Tilt (°)',
          data: [5.0, 8.0, 11.0, 14.0, 16.0, 18.2],
          borderColor: '#ea580c',
          backgroundColor: 'rgba(234, 88, 12, 0.1)',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
          fill: true
        },
        {
          label: 'Moisture (%)',
          data: [65, 70, 75, 80, 85, 89],
          borderColor: '#0284c7',
          backgroundColor: 'rgba(2, 132, 199, 0.1)',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: '#f1f5f9' },
          ticks: { color: '#64748b', font: { size: 9 } }
        },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: { color: '#64748b', font: { size: 9 } }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: '#0f172a',
            boxWidth: 10,
            font: { size: 9, weight: 'bold' }
          }
        }
      }
    }
  });
}

// =========================================================================
// 6. Real-Time Open-Meteo Weather API Integration
// =========================================================================

async function fetchLiveWeatherForDistrict(lat, lng) {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}` +
      `&longitude=${lng}` +
      `&current=precipitation,soil_moisture_0_to_1cm` +
      `&daily=precipitation_sum` +
      `&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const rawSoil = data.current?.soil_moisture_0_to_1cm ?? 0.35;
    const moistPercent = Math.min(98, Math.max(30, Math.round(rawSoil * 180)));
    const dailyRain = data.daily?.precipitation_sum?.[0] ?? Math.round(Math.random() * 40 + 30);

    return {
      rain: Math.round(dailyRain),
      moisture: moistPercent
    };
  } catch (err) {
    console.warn(`[Open-Meteo] Live API unreachable for [${lat}, ${lng}]. Using baseline.`, err.message);
    return null;
  }
}

async function syncAllRegionalLiveFeeds() {
  for (const sKey of Object.keys(indiaData)) {
    const state = indiaData[sKey];
    for (const dKey of Object.keys(state.districts)) {
      const dist = state.districts[dKey];
      if (dist.isHardwareNode) continue;

      const live = await fetchLiveWeatherForDistrict(dist.center[0], dist.center[1]);
      if (live) {
        dist.telemetry.rain = live.rain;
        dist.telemetry.moisture = live.moisture;

        const calculatedRisk = Math.min(
          96,
          Math.max(45, Math.round(live.rain * 0.45 + live.moisture * 0.4))
        );

        dist.riskScore = calculatedRisk;
        if (calculatedRisk >= 85) {
          dist.riskLevel = 'extreme';
        } else if (calculatedRisk >= 75) {
          dist.riskLevel = 'very-high';
        } else {
          dist.riskLevel = 'high';
        }
      }
    }
  }
}

// ===========================================
// BACKEND ML RISK DATA (FastAPI Pipeline)
// ===========================================

let backendRiskZones = [];
let latestSensorReading = null;
let selectedBackendZoneId = null;
let telemetryViewMode = 'overview';

function getApiBase() {
  const hostname = window.location.hostname;

  const isLocal =
    hostname === "" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

  if (isLocal) {
    return `http://${hostname || "127.0.0.1"}:8000`;
  }

  return "https://giri-rakshak-zsk5.onrender.com";
}

async function loadBackendRiskZones() {
  try {
    const response = await fetch(`${getApiBase()}/api/risk-zones`);
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const zones = await response.json();
    backendRiskZones = Array.isArray(zones) ? zones : [];
    renderBackendRiskZones(backendRiskZones);
    return backendRiskZones;
  } catch (error) {
    backendRiskZones = [];
    return [];
  }
}

// =====================================================
// LIVE ESP32 TELEMETRY (FastAPI Sensor Data Pipeline)
// =====================================================

async function loadLatestSensorTelemetryForZone(zoneId) {
  try {
    const response = await fetch(
      `${getApiBase()}/api/sensor-data/latest/${encodeURIComponent(zoneId)}`,
      { cache: 'no-store' }
    );
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const data = await response.json();
    if (data.status !== 'ok' || !data.reading) return;

    if (selectedBackendZoneId !== zoneId) return;

    const reading = data.reading;
    const tilt = Number(reading.tilt_deg);
    const moisture = Number(reading.moisture_pct);

    const titleEl = document.getElementById('telemetry-card-title');
    const descEl = document.getElementById('telemetry-source-desc');
    const badgeEl = document.getElementById('hardware-badge');
    const tiltEl = document.getElementById('val-tilt');
    const moistEl = document.getElementById('val-moisture');
    const rainEl = document.getElementById('val-rain');

    if (titleEl) titleEl.innerText = `${zoneId} — Sensor Telemetry`;
    if (descEl) descEl.innerText = `Data Source: Sensor Simulation / ESP32 Pipeline • Updated ${formatSensorTime(reading.timestamp)}`;
    if (badgeEl) {
      badgeEl.className = 'badge blue';
      badgeEl.innerText = 'SENSOR DATA';
    }
    if (tiltEl) tiltEl.innerText = Number.isFinite(tilt) ? `${tilt.toFixed(1)}°` : '—';
    if (moistEl) moistEl.innerText = Number.isFinite(moisture) ? `${moisture.toFixed(1)}%` : '—';
    if (rainEl) rainEl.innerText = '—';

    if (telemetryChart && telemetryChart.data && telemetryChart.data.datasets.length >= 2) {
      const tiltData = telemetryChart.data.datasets[0].data;
      const moistureData = telemetryChart.data.datasets[1].data;
      tiltData.fill(tilt);
      moistureData.fill(moisture);
      telemetryChart.update('none');
    }
  } catch (error) {
    console.warn(`Failed to load telemetry for ${zoneId}:`, error);
  }
}

function formatSensorTime(timestamp) {
  if (!timestamp) return 'time unavailable';
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleString();
}

function updateFullEsp32Telemetry(reading) {
  if (!reading) return;

  function set(id, value, digits = 2, unit = "") {
    const el = document.getElementById(id);
    if (!el) return;

    if (value === null || value === undefined || value === "") {
      el.textContent = "—";
      return;
    }

    const n = Number(value);
    if (!Number.isFinite(n)) {
      el.textContent = "—";
      return;
    }

    el.textContent = n.toFixed(digits) + (unit ? ` ${unit}` : "");
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = (value === null || value === undefined || value === "") ? "—" : String(value);
  }

  setText("full-sensor-id", reading.sensor_id);
  setText("full-alert-level", reading.alert_level);
  setText("full-system-state", reading.system_state);
  setText("full-updated", reading.timestamp ? new Date(reading.timestamp).toLocaleTimeString() : "—");

  set("full-lat", reading.lat, 6);
  set("full-lon", reading.lon, 6);

  set("full-tilt", reading.tilt_deg, 3, "°");
  set("full-tilt-change", reading.tilt_change_deg, 3, "°");
  set("full-tilt-rate", reading.tilt_rate_dph, 3, "°/h");
  set("full-tilt-10s", reading.tilt_sudden_change_10s_deg, 3, "°");

  set("full-accel-x", reading.accel_x_g, 4, "g");
  set("full-accel-y", reading.accel_y_g, 4, "g");
  set("full-accel-z", reading.accel_z_g, 4, "g");
  set("full-accel-mag", reading.accel_magnitude_g, 4, "g");
  set("full-accel-jump", reading.accel_jump_g, 4, "g");
  set("full-vibration", reading.vibration_rms_g, 5, "g");
  set("full-movement", reading.movement_ratio, 2, "x");

  set("full-soil", reading.moisture_pct, 2, "%");
  set("full-soil-change", reading.moisture_change_pct, 2, "%");
  set("full-soil-rate", reading.moisture_rate_pph, 2, "%/h");

  set("full-distance", reading.distance_cm, 2, "cm");
  set("full-distance-change", reading.distance_change_cm, 3, "cm");
  set("full-distance-rate", reading.distance_rate_cmh, 2, "cm/h");
  set("full-displacement", reading.displacement_cm, 3, "cm");

  set("full-pressure", reading.pressure_hpa, 2, "hPa");
  set("full-temperature", reading.temperature_c, 2, "°C");
  set("full-humidity", reading.humidity_pct, 2, "%");
  set("full-rainfall", reading.rainfall_mm, 2, "mm");

  const status = document.getElementById("full-esp32-status");
  if (status) {
    status.textContent = "Live ESP32 hardware • Updated " + new Date().toLocaleTimeString();
    status.style.color = "#86efac";
  }

  const live = document.getElementById("full-esp32-live-badge");
  if (live) {
    live.textContent = "LIVE HARDWARE";
    live.style.background = "#14532d";
    live.style.color = "#86efac";
  }
}

async function loadLatestSensorTelemetry() {
  if (telemetryViewMode !== 'hardware') return null;
  return loadLatestSensorTelemetryBySensorId('ESP32_01');
}

async function loadLatestSensorTelemetryBySensorId(sensorId) {
  try {
    const response = await fetch(
      `${getApiBase()}/api/sensor-data/latest/${encodeURIComponent(sensorId)}`,
      { cache: 'no-store' }
    );
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const data = await response.json();
    if (data.status !== 'ok' || !data.reading) return null;

    const reading = data.reading;
    latestSensorReading = reading;
    updateFullEsp32Telemetry(reading);
    const tilt = Number(reading.tilt_deg);
    const moisture = Number(reading.moisture_pct);

    const titleEl = document.getElementById('telemetry-card-title');
    const descEl = document.getElementById('telemetry-source-desc');
    const badgeEl = document.getElementById('hardware-badge');
    const tiltEl = document.getElementById('val-tilt');
    const moistEl = document.getElementById('val-moisture');
    const rainEl = document.getElementById('val-rain');

    if (titleEl) titleEl.innerText = `${sensorId} — ESP32 Edge Telemetry`;
    if (descEl) descEl.innerText = `Data Source: Physical ESP32 Sensor • Updated ${formatSensorTime(reading.timestamp)}`;
    if (badgeEl) {
      badgeEl.className = 'badge purple';
      badgeEl.innerText = 'LIVE HARDWARE';
    }
    if (tiltEl) tiltEl.innerText = Number.isFinite(tilt) ? `${tilt.toFixed(1)}°` : '—';
    if (moistEl) moistEl.innerText = Number.isFinite(moisture) ? `${moisture.toFixed(1)}%` : '—';
    if (rainEl) rainEl.innerText = '—';

    if (telemetryChart && telemetryChart.data && telemetryChart.data.datasets.length >= 2) {
      telemetryChart.data.datasets[0].data = [tilt, tilt, tilt, tilt, tilt, tilt];
      telemetryChart.data.datasets[1].data = [moisture, moisture, moisture, moisture, moisture, moisture];
      telemetryChart.update('none');
    }

    return reading;
  } catch (error) {
    return null;
  }
}

async function refreshTelemetry() {
  if (telemetryViewMode === 'ml-zone' && selectedBackendZoneId) {
    await loadLatestSensorTelemetryForZone(selectedBackendZoneId);
    return;
  }
  if (telemetryViewMode === 'hardware') {
    await loadLatestSensorTelemetry();
  }
}

function renderBackendRiskZones(zones) {
  zones.forEach(zone => {
    const lat = Number(zone.lat);
    const lon = Number(zone.lon);
    const score = Number(zone.risk_score || 0);
    const level = String(zone.risk_level || 'Unknown');

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    const color = getHazardColor(score);
    const marker = L.circleMarker([lat, lon], {
      radius: score >= 80 ? 12 : score >= 60 ? 10 : 8,
      color: '#ffffff',
      weight: 2,
      fillColor: color,
      fillOpacity: 0.9
    });

    marker.bindTooltip(`<b>${zone.zone_id}</b><br>Risk: ${score.toFixed(1)}%<br>Level: ${level.toUpperCase()}`);
    marker.bindPopup(`
      <div style="min-width:190px;">
        <strong>${zone.zone_id}</strong><br>
        Risk Score: <strong>${score.toFixed(1)}%</strong><br>
        Risk Level: <strong>${level.toUpperCase()}</strong><br>
        <span style="font-size:11px;color:#64748b;">REAL BACKEND ML OUTPUT</span>
      </div>
    `);

    marker.on('click', () => {
      updateBackendZoneView(zone);
    });

    zoneLayerGroup.addLayer(marker);
  });
}

let districtAQILayer = null;

function getDemoDistrictAQI(districtName) {
  let hash = 0;

  for (let i = 0; i < districtName.length; i++) {
    hash = (hash * 31 + districtName.charCodeAt(i)) >>> 0;
  }

  return 25 + (hash % 276);
}

async function renderDendriticRidgeHeatmap() {
  if (districtAQILayer) {
    map.removeLayer(districtAQILayer);
    districtAQILayer = null;
  }

  try {
    const response = await fetch("./data/india_districts.geojson");

    if (!response.ok) {
      throw new Error(`GeoJSON request failed: ${response.status}`);
    }

    const geojson = await response.json();

    districtAQILayer = L.geoJSON(geojson, {
      style: function (feature) {
        const districtName = feature.properties.NAME_2 || "Unknown";
        const aqi = getDemoDistrictAQI(districtName);

        let color = "#ffffff";
        if (aqi > 50) color = "#ede9fe";
        if (aqi > 100) color = "#c4b5fd";
        if (aqi > 150) color = "#8b5cf6";
        if (aqi > 200) color = "#4c1d95";

        return {
          color: "#ffffff",
          weight: 0.7,
          fillColor: color,
          fillOpacity: 0.65
        };
      },

      onEachFeature: function (feature, layer) {
        const districtName = feature.properties.NAME_2 || "Unknown district";
        const stateName = feature.properties.NAME_1 || "India";
        const aqi = getDemoDistrictAQI(districtName);

        layer.bindTooltip(`${districtName}, ${stateName}`);

        layer.bindPopup(`
          <strong>${districtName}</strong><br>
          State: ${stateName}<br>
          Demo AQI: <strong>${aqi}</strong><br>
          <small>Synthetic demo data — not official/live AQI</small>
        `);
      }
    }).addTo(map);

    console.log("District AQI polygons loaded:", geojson.features.length);
  } catch (error) {
    console.error("District AQI map failed to load:", error);
  }
}
// =========================================================================
// 8. Master Render: Boundaries, Polygons, Stations & Saved Reports
// =========================================================================

function renderAllNEROverview() {
  stateLayerGroup.clearLayers();
  zoneLayerGroup.clearLayers();
  hardwareMarkerGroup.clearLayers();
  citizenMarkerGroup.clearLayers();

  const role = sessionStorage.getItem('userRole');

  Object.keys(indiaData).forEach(stateKey => {
    const state = indiaData[stateKey];
    if (state.boundary) {
      const poly = L.polygon(state.boundary, {
        opacity: 0,
        fillOpacity: 0
      });

      poly.bindTooltip(`<b>${state.name}</b><br/>Pollution Watch Zone`);
      poly.on('click', () => {
        if (stateSelect) stateSelect.value = stateKey;
        populateDistricts(stateKey);
        map.flyTo(state.center, state.zoom);
      });

      stateLayerGroup.addLayer(poly);
    }
  });

  // ONLY show ESP32 Physical Station pin for Official Logins
  if (role === 'official' && indiaData.mizoram?.districts?.aizawl) {
    const aizawlDist = indiaData.mizoram.districts.aizawl;
    const espIcon = L.divIcon({
      html: `<div style="background: #7c3aed; border: 2.5px solid white; width: 16px; height: 16px; border-radius: 50%; box-shadow: 0 0 10px rgba(124, 58, 237, 0.85); cursor: pointer;"></div>`,
      iconSize: [16, 16]
    });

    const singleEspMarker = L.marker(aizawlDist.sensorCoords, { icon: espIcon });
    singleEspMarker.bindTooltip("<b>MONITORING STATION</b><br/>Aizawl Field Telemetry Node", { permanent: false });
    singleEspMarker.on('click', () => {
      if (stateSelect) stateSelect.value = 'mizoram';
      populateDistricts('mizoram');
      if (districtSelect) districtSelect.value = 'aizawl';
      updateDistrictView('mizoram', 'aizawl');
    });

    hardwareMarkerGroup.addLayer(singleEspMarker);
  }

  loadSavedCitizenReports();
  resetOverviewSidebar();
  updateRoutesToAvoidView();

  if (backendRiskZones.length > 0) {
    renderBackendRiskZones(backendRiskZones);
  }
}

function resetOverviewSidebar() {
  selectedBackendZoneId = null;
  telemetryViewMode = 'overview';

  const sourceTag = document.getElementById('data-source-tag');
  const riskBadge = document.getElementById('risk-badge');
  const distTitle = document.getElementById('district-alert-title');
  const distBody = document.getElementById('district-alert-body');
  const alertBox = document.getElementById('district-alert-box');
  const cardTitle = document.getElementById('telemetry-card-title');
  const sourceDesc = document.getElementById('telemetry-source-desc');
  const hwBadge = document.getElementById('hardware-badge');

  if (sourceTag) {
    sourceTag.innerText = "REGIONAL MODEL";
    sourceTag.classList.remove('hardware');
  }
  if (riskBadge) {
    riskBadge.className = 'badge blue';
    riskBadge.innerText = 'OVERVIEW';
  }
  if (distTitle) distTitle.innerText = "National Overview";
  if (distBody) distBody.innerText = "Surveillance active across all Indian states & UTs. Select Aizawl to inspect the deployed physical ESP32 edge telemetry.";
  if (alertBox) alertBox.style.borderLeftColor = '#0284c7';
  if (cardTitle) cardTitle.innerText = "IoT Edge Telemetry";
  if (sourceDesc) sourceDesc.innerText = "Data Source: Regional Meteorological Model";
  if (hwBadge) {
    hwBadge.className = 'badge gray';
    hwBadge.innerText = 'MODEL DATA';
  }

  const elTilt = document.getElementById('val-tilt');
  const elMoist = document.getElementById('val-moisture');
  const elRain = document.getElementById('val-rain');

  if (elTilt) elTilt.innerText = '—';
  if (elMoist) elMoist.innerText = '—';
  if (elRain) elRain.innerText = '—';
}

function updateBackendZoneView(zone) {
  selectedBackendZoneId = zone.zone_id;
  telemetryViewMode = 'ml-zone';

  const score = Number(zone.risk_score || 0);
  const level = String(zone.risk_level || 'unknown');

  const sourceTag = document.getElementById('data-source-tag');
  const hwBadge = document.getElementById('hardware-badge');
  const cardTitle = document.getElementById('telemetry-card-title');
  const sourceDesc = document.getElementById('telemetry-source-desc');

  map.flyTo([Number(zone.lat), Number(zone.lon)], 11, { duration: 1.2 });

  if (sourceTag) {
    sourceTag.innerText = 'LIVE ML BACKEND';
    sourceTag.classList.remove('hardware');
  }
  if (cardTitle) cardTitle.innerText = `${zone.zone_id} — ML Risk Zone`;
  if (sourceDesc) sourceDesc.innerText = 'Data Source: FastAPI + Validated ML Fusion Pipeline';
  if (hwBadge) {
    hwBadge.className = 'badge blue';
    hwBadge.innerText = 'BACKEND DATA';
  }

  const shapZone = {
    name: zone.zone_id,
    riskScore: score.toFixed(1),
    riskLevel: level,
    why: 'Risk score generated by the backend ML fusion pipeline. The factors below are the model features with the strongest SHAP contribution.',
    shap: (zone.top_factors || []).map(f => ({
      factor: f.feature,
      impact: Number(f.abs_shap || Math.abs(f.shap_value || 0)),
      shap_value: Number(f.shap_value || 0),
      direction: f.direction
    }))
  };

  updateShapPanel(shapZone, zone.zone_id);
  loadLatestSensorTelemetryForZone(zone.zone_id);
}

// 9. Update View on District Selection
async function updateDistrictView(stateKey, distKey) {
  selectedBackendZoneId = null;

  const state = indiaData[stateKey];
  if (!state) return;
  const dist = state.districts[distKey];
  if (!dist) return;

  map.flyTo(dist.center, dist.zoom, { duration: 1.2 });

  const isHardware = !!dist.isHardwareNode;
  telemetryViewMode = isHardware ? 'hardware' : 'model';

  const sourceTag = document.getElementById('data-source-tag');
  const hwBadge = document.getElementById('hardware-badge');
  const cardTitle = document.getElementById('telemetry-card-title');
  const sourceDesc = document.getElementById('telemetry-source-desc');

  if (isHardware) {
    if (sourceTag) {
      sourceTag.innerText = "LIVE ESP32 DEPLOYMENT";
      sourceTag.classList.add('hardware');
    }
    if (cardTitle) cardTitle.innerText = "Aizawl — ESP32 Edge Station";
    if (sourceDesc) sourceDesc.innerText = "Waiting for physical ESP32 telemetry...";
    if (hwBadge) {
      hwBadge.className = 'badge purple';
      hwBadge.innerText = 'LIVE HARDWARE';
    }
  } else {
    if (sourceTag) {
      sourceTag.innerText = "LIVE OPEN-METEO & GIS MODEL";
      sourceTag.classList.remove('hardware');
    }
    if (cardTitle) cardTitle.innerText = `${dist.name} — Live Feeds`;
    if (sourceDesc) sourceDesc.innerText = "Data Source: Live IMD/Open-Meteo Satellite Precipitation";
    if (hwBadge) {
      hwBadge.className = 'badge gray';
      hwBadge.innerText = 'LIVE MODEL';
    }
  }

  const elTilt = document.getElementById('val-tilt');
  const elMoist = document.getElementById('val-moisture');
  const elRain = document.getElementById('val-rain');

  if (isHardware) {
    if (elTilt) elTilt.innerText = '—';
    if (elMoist) elMoist.innerText = '—';
    if (elRain) elRain.innerText = '—';
  } else {
    if (elTilt) elTilt.innerText = `${dist.telemetry.tilt}°`;
    if (elMoist) elMoist.innerText = `${dist.telemetry.moisture}%`;
    if (elRain) elRain.innerText = `${dist.telemetry.rain} mm`;
  }

  if (telemetryChart) {
    if (isHardware) {
      telemetryChart.data.datasets[0].data = [null, null, null, null, null, null];
      telemetryChart.data.datasets[1].data = [null, null, null, null, null, null];
    } else {
      const baseTilt = dist.telemetry.tilt;
      const baseM = dist.telemetry.moisture;
      telemetryChart.data.datasets[0].data = [
        Math.max(0, baseTilt - 1.2),
        Math.max(0, baseTilt - 1.0),
        Math.max(0, baseTilt - 0.7),
        Math.max(0, baseTilt - 0.4),
        Math.max(0, baseTilt - 0.2),
        baseTilt
      ];

      telemetryChart.data.datasets[1].data = [
        baseM - 5,
        baseM - 4,
        baseM - 3,
        baseM - 2,
        baseM - 1,
        baseM
      ];
    }
    telemetryChart.update();
  }

  const alertTitleEl = document.getElementById('district-alert-title');
  const alertBodyEl = document.getElementById('district-alert-body');
  const riskBadge = document.getElementById('risk-badge');
  const alertBox = document.getElementById('district-alert-box');

  if (alertTitleEl) alertTitleEl.innerText = dist.alertTitle;
  if (alertBodyEl) alertBodyEl.innerText = dist.alertText;

  const color = getHazardColor(dist.riskScore);
  if (riskBadge) {
    riskBadge.innerText = dist.riskLevel.toUpperCase();
    riskBadge.style.backgroundColor = color;
    riskBadge.style.color = '#fff';
  }
  if (alertBox) alertBox.style.borderLeftColor = color;

  if (dist.zones && dist.zones.length > 0) {
    updateShapPanel(dist.zones[0], dist.name);
  }

  if (isHardware) {
    loadLatestSensorTelemetry();
  }
}

// 10. Explainable AI (SHAP) Panel
function updateShapPanel(zone, districtName = "") {
  const zoneNameEl = document.getElementById('selected-zone-name');
  if (zoneNameEl) {
    zoneNameEl.innerText = `${districtName ? districtName + ': ' : ''}${zone.name}`;
  }

  const panel = document.getElementById('shap-details');
  if (!panel) return;

  const color = getHazardColor(zone.riskScore);
  const factorsHtml = (zone.shap || [])
    .map(item => {
      const isPositive = item.impact > 0;
      const barWidth = Math.min(Math.abs(item.impact) * 160, 100);

      return `
        <div class="shap-bar-item">
          <div class="shap-label-row">
            <span style="color: #334155;">${item.factor}</span>
            <span style="color: ${color}; font-weight: bold;">
              ${isPositive ? '+' : ''}${(item.impact * 100).toFixed(0)}%
            </span>
          </div>
          <div class="shap-progress-track">
            <div class="shap-progress-fill" style="width: ${barWidth}%; background-color: ${color}"></div>
          </div>
        </div>
      `;
    })
    .join('');

  panel.innerHTML = `
    <div class="shap-summary-card">
      <div class="shap-summary-top">
        <div>
          <span style="font-size: 0.68rem; color: #64748b; font-weight: 700;">
            CALCULATED FAILURE PROBABILITY
          </span>
          <div class="shap-score-val" style="color: ${color};">
            ${zone.riskScore}% [ ${zone.riskLevel.toUpperCase()} ]
          </div>
        </div>
        <span class="badge blue">Model: RF + SHAP</span>
      </div>
      <div class="shap-why-box">
        <strong>Why is this slope at risk?</strong><br/>
        ${zone.why || "Multiple geotechnical factors combined with sustained precipitation."}
      </div>
    </div>
    ${factorsHtml}
  `;
}

// 11. Cascading Dropdown Controls
const stateSelect = document.getElementById('state-select');
const districtSelect = document.getElementById('district-select');

function populateDistricts(selectedState) {
  if (!districtSelect) return;
  districtSelect.innerHTML = '<option value="">-- Select District --</option>';

  if (!selectedState || !indiaData[selectedState]) {
    districtSelect.disabled = true;
    return;
  }

  const role = sessionStorage.getItem('userRole');
  const dists = indiaData[selectedState].districts;

  Object.keys(dists).forEach(distKey => {
    const opt = document.createElement('option');
    opt.value = distKey;
    
    if (role === 'official') {
      opt.innerText = dists[distKey].name + (dists[distKey].isHardwareNode ? " [IoT Station]" : " (Weather Model)");
    } else {
      opt.innerText = dists[distKey].name;
    }

    districtSelect.appendChild(opt);
  });

  districtSelect.disabled = false;
}

if (stateSelect) {
  stateSelect.addEventListener('change', e => {
    selectedBackendZoneId = null;
    telemetryViewMode = 'overview';

    const selectedState = e.target.value;

    if (!selectedState) {
      if (districtSelect) {
        districtSelect.innerHTML = '<option value="">-- Select District --</option>';
        districtSelect.disabled = true;
      }
      map.flyTo(INDIA_CENTER, INDIA_DEFAULT_ZOOM, { duration: 1.5 });
      renderAllNEROverview();
      return;
    }

    if (indiaData[selectedState]) {
      const stateObj = indiaData[selectedState];
      
      populateDistricts(selectedState);

      if (stateObj.boundary && stateObj.boundary.length > 0) {
        const bounds = L.latLngBounds(stateObj.boundary);
        map.fitBounds(bounds, { padding: [20, 20], maxZoom: 10, animate: true, duration: 1.2 });
      } else if (stateObj.center) {
        map.flyTo(stateObj.center, stateObj.zoom || 8, { duration: 1.5 });
      }
    }
  });
}

if (districtSelect) {
  districtSelect.addEventListener('change', e => {
    const selectedDist = e.target.value;
    const selectedState = stateSelect ? stateSelect.value : null;

    if (selectedDist && selectedState) {
      updateDistrictView(selectedState, selectedDist);
    }
  });
}

const btnResetView = document.getElementById('btn-reset-view');
if (btnResetView) {
  btnResetView.addEventListener('click', () => {
    selectedBackendZoneId = null;
    telemetryViewMode = 'overview';

    if (stateSelect) stateSelect.value = "";
    if (districtSelect) {
      districtSelect.innerHTML = '<option value="">-- Select District --</option>';
      districtSelect.disabled = true;
    }

    map.flyTo(INDIA_CENTER, INDIA_DEFAULT_ZOOM, { duration: 1.5 });
    renderAllNEROverview();
  });
}

// 12. Alert Preview & Dispatch Trigger (SMS API Route)
const langSelect = document.getElementById('lang-select');
if (langSelect) {
  langSelect.addEventListener('change', e => {
    const lang = e.target.value;
    const alertPreview = document.getElementById('alert-preview-text');
    if (alertPreview) alertPreview.innerText = `"${translations[lang]}"`;
  });
}

const btnTriggerAlert = document.getElementById('btn-trigger-alert');
if (btnTriggerAlert) {
  btnTriggerAlert.addEventListener('click', async () => {
    const lang = langSelect ? langSelect.value : 'en';

    try {
      const response = await fetch(`${getApiBase()}/api/trigger-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone_id: 'ESP32_01',
          risk_level: 'critical',
          message: translations[lang]
        })
      });

      const result = await response.json();
      if (!response.ok || !result.sms_result?.success) {
        throw new Error(result.sms_result?.error || 'SMS failed');
      }

      alert('Emergency SMS transmitted successfully.');
    } catch (error) {
      console.error('Emergency SMS error:', error);
      alert(`Emergency SMS failed: ${error.message}`);
    }
  });
}

// =========================================================================
// 13. High-Precision Named Road Resolution Engine (Overpass API + Fallback)
// =========================================================================

async function getAreaNameFromCoords(lat, lng) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const overpassQuery = `[out:json][timeout:3];way(around:1000,${lat},${lng})[highway][name];out tags 5;`;
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

    const res = await fetch(overpassUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.elements?.length > 0) {
        const roadNames = [];
        data.elements.forEach(el => {
          const name = el.tags?.name || el.tags?.ref;
          if (name && !roadNames.includes(name)) {
            roadNames.push(name);
          }
        });

        if (roadNames.length > 0) {
          return roadNames.slice(0, 2).join(' / ');
        }
      }
    }
  } catch (err) {}

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
    const res = await fetch(nominatimUrl, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const road = addr.road || addr.highway || addr.pedestrian || addr.street;
      const suburb = addr.suburb || addr.neighbourhood || addr.village || addr.city_district || addr.town;

      if (road && suburb) return `${road}, ${suburb}`;
      if (road) return road;
      if (suburb) return `${suburb} Corridor`;
      if (data.name) return data.name;
    }
  } catch (e) {}

  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (latNum >= 23.6 && latNum <= 23.85 && lngNum >= 92.65 && lngNum <= 92.8) return "NH-54 / Aizawl Bypass Arteries";
  if (latNum >= 25.8 && latNum <= 26.0 && lngNum >= 93.6 && lngNum <= 93.9) return "NH-29 (Dimapur-Kohima Gorge Corridor)";
  if (latNum >= 25.6 && latNum <= 25.75 && lngNum >= 94.05 && lngNum <= 94.2) return "NH-02 / Kohima Bypass Link";
  if (latNum >= 27.25 && latNum <= 27.45 && lngNum >= 88.55 && lngNum <= 88.65) return "NH-10 / Gangtok-Siliguri Highway";
  if (latNum >= 25.1 && latNum <= 25.25 && lngNum >= 92.95 && lngNum <= 93.15) return "Haflong Hill Section Arterial Link";
  if (latNum >= 25.2 && latNum <= 25.4 && lngNum >= 91.65 && lngNum <= 91.8) return "SH-5 / Sohra-Shella Escarpment Highway";

  return "Regional Arterial Corridor";
}

// =========================================================================
// 14. Citizen Field Incident & Routes to Avoid Sync Engine (Universal Delete)
// =========================================================================

function renderCitizenMarker(lat, lng, type, desc, image, shouldFly, id, reporter, locationName) {
  const validLat = parseFloat(lat);
  const validLng = parseFloat(lng);

  if (isNaN(validLat) || isNaN(validLng) || typeof citizenMarkerGroup === 'undefined') return;

  const resolvedId = String(id || `cit_${validLat}_${validLng}`);

  const citIcon = L.divIcon({
    html: `<div style="background: #0284c7; border: 2px solid white; width: 14px; height: 14px; border-radius: 3px; box-shadow: 0 0 6px rgba(0,0,0,0.4); cursor: pointer;"></div>`,
    iconSize: [14, 14]
  });

  const marker = L.marker([validLat, validLng], { icon: citIcon });

  const popupContent = `
    <div style="min-width: 200px; font-family: system-ui, sans-serif; font-size: 12px;">
      <div style="font-weight: 700; color: #ef4444; margin-bottom: 4px;">Citizen Hazard Report</div>
      ${locationName ? `<div><b>Location:</b> ${locationName}</div>` : ''}
      <div><b>Type:</b> ${type}</div>
      ${desc ? `<div style="margin: 4px 0; color: #475569; font-style: italic;">"${desc}"</div>` : ''}
      ${reporter ? `<div style="font-size: 11px; color: #64748b;">Reported by: ${reporter}</div>` : ''}
      ${image ? `<img src="${image}" style="width: 100%; height: 90px; object-fit: cover; border-radius: 4px; margin-top: 6px;" />` : ''}
      <button type="button" onclick="window.deleteCitizenReport('${resolvedId}')" 
        style="margin-top: 10px; width: 100%; background: #dc2626; color: #ffffff; border: none; border-radius: 4px; padding: 7px 10px; font-size: 11px; font-weight: bold; cursor: pointer; display: block; text-align: center;">
        Delete Pin
      </button>
    </div>
  `;

  marker.bindPopup(popupContent);
  citizenMarkerGroup.addLayer(marker);

  if (shouldFly && typeof map !== 'undefined' && map) {
    map.flyTo([validLat, validLng], 13, { duration: 1.5 });
    setTimeout(() => {
      marker.openPopup();
    }, 1600);
  }
}

window.deleteCitizenReport = async function(reportId) {
  if (!confirm('Are you sure you want to remove this citizen incident report?')) return;

  try {
    await fetch(`${getApiBase()}/api/reports/${encodeURIComponent(reportId)}`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.warn('[Citizen Sync] Cloud deletion error (proceeding to local removal):', err);
  }

  let reports = JSON.parse(localStorage.getItem('giri_citizen_reports') || '[]');
  reports = reports.filter(r => String(r.id) !== String(reportId) && String(r.lat) !== String(reportId));
  localStorage.setItem('giri_citizen_reports', JSON.stringify(reports));

  await loadSavedCitizenReports();
};

window.clearAllCitizenReports = function() {
  if (!confirm('Remove all citizen incident pins from the map?')) return;
  localStorage.removeItem('giri_citizen_reports');
  loadSavedCitizenReports();
};

async function loadSavedCitizenReports() {
  try {
    if (typeof citizenMarkerGroup !== 'undefined') {
      citizenMarkerGroup.clearLayers();
    }

    let storedReports = [];

    try {
      const response = await fetch(`${getApiBase()}/api/citizen-reports`, { 
        cache: 'no-store' 
      });
      if (response.ok) {
        const cloudReports = await response.json();
        if (Array.isArray(cloudReports)) {
          storedReports = cloudReports.map(r => ({
            id: r.id,
            lat: r.lat ?? r.latitude,
            lng: r.lon ?? r.lng ?? r.longitude,
            type: r.category ? r.category.replace(/_/g, ' ') : (r.type || r.hazard_type || "Ground Incident"),
            desc: r.description || r.desc || "",
            reporter: r.reporter || (r.user_id ? `Citizen #${r.user_id}` : 'Field Citizen'),
            location: r.location || r.place || null,
            image: r.photo_path ? `${getApiBase()}${r.photo_path}` : r.image,
            timestamp: r.reported_at || r.timestamp
          }));
          localStorage.setItem('giri_citizen_reports', JSON.stringify(storedReports));
        }
      }
    } catch (apiErr) {
      console.warn('[Citizen Sync] Render fetch failed, using local storage fallback:', apiErr);
    }

    if (storedReports.length === 0) {
      storedReports = JSON.parse(localStorage.getItem('giri_citizen_reports') || '[]');
    }

    const isRedirect = sessionStorage.getItem('just_reported') === 'true';

    storedReports.forEach((r, idx) => {
      const lat = parseFloat(r.lat);
      const lng = parseFloat(r.lng);
      const type = r.type || "Ground Incident";
      const desc = r.desc || "";
      const isLatest = idx === storedReports.length - 1;
      const locationName = r.location || null;
      const reportId = r.id || `cit_${idx}`;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      renderCitizenMarker(
        lat,
        lng,
        type,
        desc,
        r.image,
        isLatest && isRedirect,
        reportId,
        r.reporter,
        locationName
      );
    });

    sessionStorage.removeItem('just_reported');

    renderCitizenReportsSidebarList();
    updateRoutesToAvoidView();
  } catch (err) {
    console.warn('[Citizen Sync] Local reports load failed:', err);
  }
}

function renderCitizenReportsSidebarList() {
  const role = sessionStorage.getItem('userRole');
  const reports = JSON.parse(localStorage.getItem('giri_citizen_reports') || '[]');

  const citizenCard = document.getElementById('citizen-reports-manage-card');
  const citizenList = document.getElementById('citizen-reports-list');
  const citizenCount = document.getElementById('citizen-report-count');
  const officialList = document.getElementById('official-reports-list');

  // Display report details for Citizen Access as well as guest views
  if (role === 'citizen' || !role) {
    if (citizenCard) citizenCard.style.display = 'block';
    if (citizenCount) citizenCount.innerText = `${reports.length} PINS`;

    if (citizenList) {
      if (reports.length === 0) {
        citizenList.innerHTML = '<p style="color: #94a3b8; font-size: 12px; margin: 0;">No active incident reports filed.</p>';
      } else {
        citizenList.innerHTML = reports
          .map(
            r => `
          <div style="background: #0f172a; border-left: 3px solid #0284c7; padding: 8px 10px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="max-width: 80%;">
              <strong style="font-size: 12px; color: #f8fafc;">${r.type || 'Incident'}</strong>
              <div style="font-size: 11px; color: #cbd5e1; margin-top: 1px;">Location: ${r.location || 'Field Zone'}</div>
              <div style="font-size: 11px; color: #94a3b8; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${r.desc || 'No description'}</div>
            </div>
            <button type="button" onclick="window.deleteCitizenReport('${r.id}')" style="background: #ef4444; color: #fff; border: none; border-radius: 4px; padding: 3px 6px; font-size: 11px; font-weight: bold; cursor: pointer;">✕</button>
          </div>
        `
          )
          .join('');
      }
    }
  } else {
    if (citizenCard) citizenCard.style.display = 'none';
  }

  if (role === 'official' && officialList) {
    if (reports.length === 0) {
      officialList.innerHTML = '<p style="color: #94a3b8; font-size: 12px; margin: 0;">No citizen field pins active on map.</p>';
    } else {
      officialList.innerHTML = reports
        .map(
          r => `
        <div style="background: #1e293b; border: 1px solid #334155; border-left: 3px solid #38bdf8; border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
          <div style="max-width: 75%;">
            <strong style="font-size: 12px; font-weight: 700; color: #f8fafc; letter-spacing: 0.2px;">${r.type || 'Incident'}</strong>
            <div style="font-size: 11px; color: #38bdf8; margin-top: 2px;">Location: ${r.location || 'Field Sector'}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">By: <span style="color: #cbd5e1;">${r.reporter || 'Field Citizen'}</span></div>
            ${r.desc ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${r.desc}</div>` : ''}
          </div>
          <button type="button" onclick="window.deleteCitizenReport('${r.id}')" 
            style="background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 5px; padding: 5px 10px; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s ease;">
            ✕ Delete
          </button>
        </div>
      `
        )
        .join('');
    }
  }
}

// 1 KM HAZARD BUFFER & AVOID ROUTES SYSTEM
async function updateRoutesToAvoidView() {
  if (typeof avoidZonesGroup === 'undefined' || !avoidZonesGroup) return;
  avoidZonesGroup.clearLayers();

  const container = document.getElementById('avoid-routes-list');
  const countBadge = document.getElementById('avoid-corridors-count');

  let reports = [];
  try {
    reports = JSON.parse(localStorage.getItem('giri_citizen_reports') || '[]');
  } catch (e) {
    reports = [];
  }

  if (countBadge) {
    countBadge.innerText = `${reports.length} RESTRICTION${reports.length === 1 ? '' : 'S'}`;
  }

  if (!container) return;

  if (reports.length === 0) {
    container.innerHTML = `
      <p style="color: #94a3b8; font-size: 12px; margin: 0; padding: 4px;">
        All primary arterial corridors are currently open and clear.
      </p>
    `;
    return;
  }

  reports.forEach(r => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const bufferCircle = L.circle([lat, lng], {
      radius: 1000,
      color: '#dc2626',
      weight: 2,
      dashArray: '5, 6',
      fillColor: '#ef4444',
      fillOpacity: 0.18,
      interactive: true
    });

    const areaTitle = r.location || 'Hazard Zone';
    bufferCircle.bindTooltip(`<b>Caution: 1 km Exclusion Zone</b><br>${areaTitle}. Avoid surrounding roads.`);
    avoidZonesGroup.addLayer(bufferCircle);
  });

  let updatedStorage = false;
  const listItems = await Promise.all(reports.map(async (r, idx) => {
    const latNum = parseFloat(r.lat);
    const lngNum = parseFloat(r.lng);
    const type = r.type || 'Hazard Surface Incident';

    if (!r.location || r.location.startsWith('Zone') || r.location.startsWith('Local Arterial') || r.location === 'Field Zone') {
      r.location = await getAreaNameFromCoords(latNum, lngNum);
      reports[idx].location = r.location;
      updatedStorage = true;
    }

    const roadName = r.location;

    return `
      <div style="background: var(--panel-bg, #ffffff); border: 1px solid var(--panel-border, #e2e8f0); border-left: 4px solid #dc2626; border-radius: 6px; padding: 8px 10px; cursor: pointer; margin-bottom: 6px;"
           onclick="window.focusAvoidZone(${latNum}, ${lngNum})">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="font-size: 12px; color: #dc2626;">Avoid 1 km Perimeter</strong>
          <span style="font-size: 10px; color: #64748b; font-weight: 600;">Sector #${idx + 1}</span>
        </div>
        <div style="font-size: 12px; font-weight: 700; color: var(--text-main, #0f172a); margin-top: 3px;">
          ${roadName}
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
          Hazard: ${type}
        </div>
      </div>
    `;
  }));

  if (updatedStorage) {
    localStorage.setItem('giri_citizen_reports', JSON.stringify(reports));
  }

  container.innerHTML = listItems.join('');
}

window.focusAvoidZone = function(lat, lng) {
  const vLat = parseFloat(lat);
  const vLng = parseFloat(lng);
  if (typeof map !== 'undefined' && map && Number.isFinite(vLat) && Number.isFinite(vLng)) {
    map.flyTo([vLat, vLng], 14, { duration: 1.2 });
  }
};

window.addEventListener('storage', e => {
  if (e.key === 'giri_latest_report' && e.newValue) {
    try {
      const r = JSON.parse(e.newValue);
      const lat = parseFloat(r.lat);
      const lng = parseFloat(r.lng);
      const type = r.type || "Ground Incident";
      const desc = r.desc || "";
      const loc = r.location || null;

      renderCitizenMarker(lat, lng, type, desc, r.image, true, r.id, r.reporter, loc);

      let reports = JSON.parse(localStorage.getItem('giri_citizen_reports') || '[]');
      const exists = reports.some(existing => existing.id && r.id && existing.id === r.id);
      if (!exists) {
        reports.push(r);
        localStorage.setItem('giri_citizen_reports', JSON.stringify(reports));
      }

      updateRoutesToAvoidView();
      renderCitizenReportsSidebarList();
    } catch (err) {
      console.warn('[Citizen Sync] Invalid report payload:', err);
    }
  }

  if (e.key === 'giri_alerts') {
    renderAlertsFeed();
  }
});

// 15. Global Search & Autocomplete
const searchInput = document.getElementById('global-search-input');
const searchDropdown = document.getElementById('search-suggestions');
const searchClearBtn = document.getElementById('search-clear-btn');

function buildLocationIndex() {
  const index = [];

  Object.entries(indiaData).forEach(([sKey, state]) => {
    index.push({
      type: 'state',
      name: state.name,
      subText: 'State Overview',
      center: state.center,
      zoom: state.zoom,
      stateKey: sKey
    });

    Object.entries(state.districts).forEach(([dKey, dist]) => {
      index.push({
        type: dist.isHardwareNode ? 'hardware' : 'district',
        name: dist.name,
        subText: dist.isHardwareNode
          ? `Physical ESP32 Station, ${state.name}`
          : `Live Weather Model, ${state.name}`,
        center: dist.center,
        zoom: dist.zoom,
        stateKey: sKey,
        districtKey: dKey
      });

      (dist.zones || []).forEach(zone => {
        const midLat =
          zone.polygon.reduce((sum, p) => sum + p[0], 0) / zone.polygon.length;
        const midLng =
          zone.polygon.reduce((sum, p) => sum + p[1], 0) / zone.polygon.length;

        index.push({
          type: 'zone',
          name: zone.name,
          subText: `Slope Cut, ${dist.name}`,
          center: [midLat, midLng],
          zoom: 14,
          stateKey: sKey,
          districtKey: dKey,
          zoneData: zone
        });
      });
    });
  });

  return index;
}

const locationIndex = buildLocationIndex();

function closeSearchSuggestions() {
  if (searchDropdown) {
    searchDropdown.classList.add('hidden');
    searchDropdown.innerHTML = '';
  }
}

if (searchInput) {
  searchInput.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();

    if (!q) {
      closeSearchSuggestions();
      if (searchClearBtn) searchClearBtn.classList.add('hidden');
      return;
    }

    if (searchClearBtn) searchClearBtn.classList.remove('hidden');

    const matches = locationIndex
      .filter(
        item =>
          item.name.toLowerCase().includes(q) ||
          item.subText.toLowerCase().includes(q)
      )
      .slice(0, 7);

    if (matches.length === 0) {
      searchDropdown.innerHTML = `
        <div class="search-suggestion-item" style="cursor: default; color: #94a3b8;">
          No matching locations found
        </div>
      `;
      searchDropdown.classList.remove('hidden');
      return;
    }

    searchDropdown.innerHTML = matches
      .map(
        (item, idx) => `
        <div class="search-suggestion-item" data-idx="${idx}">
          <div class="suggestion-info">
            <span class="suggestion-title">${item.name}</span>
            <span class="suggestion-sub">${item.subText}</span>
          </div>
          <span class="suggestion-badge ${item.type}">${item.type}</span>
        </div>
      `
      )
      .join('');

    searchDropdown.querySelectorAll('.search-suggestion-item').forEach((el, i) => {
      el.addEventListener('click', () => handleLocationSelect(matches[i]));
    });

    searchDropdown.classList.remove('hidden');
  });
}

function handleLocationSelect(loc) {
  if (searchInput) searchInput.value = loc.name;
  closeSearchSuggestions();

  if (loc.type === 'state') {
    if (stateSelect) stateSelect.value = loc.stateKey;
    populateDistricts(loc.stateKey);
    map.flyTo(loc.center, loc.zoom, { duration: 1.2 });
  } else if (
    loc.type === 'district' ||
    loc.type === 'hardware' ||
    loc.type === 'zone'
  ) {
    if (stateSelect) stateSelect.value = loc.stateKey;
    populateDistricts(loc.stateKey);
    if (districtSelect) districtSelect.value = loc.districtKey;

    updateDistrictView(loc.stateKey, loc.districtKey);

    if (loc.type === 'zone') {
      map.flyTo(loc.center, loc.zoom, { duration: 1.2 });
      updateShapPanel(loc.zoneData, loc.name);
    }
  }
}

if (searchClearBtn) {
  searchClearBtn.addEventListener('click', () => {
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    closeSearchSuggestions();
    searchClearBtn.classList.add('hidden');
  });
}

document.addEventListener('click', e => {
  if (!e.target.closest('.nav-search-container')) {
    closeSearchSuggestions();
  }
});

map.on('click dragstart', closeSearchSuggestions);

// ============================================================
// LIVE SENSOR ALERT MONITOR (ESP32 Live Stream)
// ============================================================

let latestSeenAlertId = 0;
let liveAlertPollTimer = null;
let liveAlertMonitorInitialized = false;

function ensureLiveSensorAlertUI() {
  if (document.getElementById('live-sensor-alert')) return;

  const styleId = 'live-sensor-alert-runtime-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .live-sensor-alert {
        position: fixed;
        top: 82px;
        right: 24px;
        width: min(390px, calc(100vw - 32px));
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px 18px;
        background: #ffffff;
        border: 2px solid #dc2626;
        border-left: 6px solid #dc2626;
        border-radius: 12px;
        box-shadow: 0 12px 30px rgba(0, 0, 0, .18), 0 0 0 4px rgba(220, 38, 38, .08);
        z-index: 99999;
        animation: liveAlertIn .28s ease-out;
      }
      .live-sensor-alert.hidden { display: none; }
      .live-alert-icon { font-size: 27px; line-height: 1; margin-top: 2px; }
      .live-alert-content { flex: 1; min-width: 0; }
      .live-alert-title { font-size: .72rem; font-weight: 800; letter-spacing: .08em; color: #b91c1c; margin-bottom: 4px; }
      .live-alert-zone { font-size: 1rem; font-weight: 800; color: #111827; margin-bottom: 4px; }
      .live-alert-message { font-size: .85rem; line-height: 1.4; color: #374151; }
      .live-alert-reading { margin-top: 8px; font-size: .78rem; font-weight: 700; color: #991b1b; }
      .live-alert-time { margin-top: 7px; font-size: .72rem; color: #6b7280; }
      .live-alert-close { border: 0; background: transparent; color: #6b7280; font-size: 24px; line-height: 1; cursor: pointer; padding: 0 2px; }
      .live-alert-close:hover { color: #111827; }
      @keyframes liveAlertIn {
        from { opacity: 0; transform: translateY(-12px) translateX(12px); }
        to { opacity: 1; transform: translateY(0) translateX(0); }
      }
      @media (max-width: 700px) {
        .live-sensor-alert { top: 70px; right: 12px; width: calc(100vw - 24px); }
      }
    `;
    document.head.appendChild(style);
  }

  const alertBox = document.createElement('div');
  alertBox.id = 'live-sensor-alert';
  alertBox.className = 'live-sensor-alert hidden';
  alertBox.innerHTML = `
    <div class="live-alert-icon">⚠️</div>
    <div class="live-alert-content">
      <div class="live-alert-title">LIVE SENSOR ALERT</div>
      <div id="live-alert-zone" class="live-alert-zone">ESP32 Edge Node</div>
      <div id="live-alert-message" class="live-alert-message">Reactive safety threshold exceeded.</div>
      <div id="live-alert-reading" class="live-alert-reading"></div>
      <div id="live-alert-time" class="live-alert-time">Detected just now</div>
    </div>
    <button id="live-alert-close" class="live-alert-close" aria-label="Close alert">×</button>
  `;

  document.body.appendChild(alertBox);
  document.getElementById('live-alert-close').addEventListener('click', hideLiveSensorAlert);
}

function showLiveSensorAlert(alert, reading = null) {
  ensureLiveSensorAlertUI();

  const alertBox = document.getElementById('live-sensor-alert');
  const zoneEl = document.getElementById('live-alert-zone');
  const messageEl = document.getElementById('live-alert-message');
  const readingEl = document.getElementById('live-alert-reading');
  const timeEl = document.getElementById('live-alert-time');

  if (!alertBox || !zoneEl || !messageEl || !readingEl || !timeEl) return;

  const zoneId = alert.zone_id || alert.sensor_id || 'ESP32 Edge Node';
  zoneEl.innerText = `${zoneId} — Reactive Safety Alert`;
  messageEl.innerText = alert.message || 'Reactive safety threshold exceeded.';

  if (reading) {
    const tilt = Number(reading.tilt_deg);
    const moisture = Number(reading.moisture_pct);
    const parts = [];

    if (Number.isFinite(tilt)) parts.push(`Tilt ${tilt.toFixed(1)}°`);
    if (Number.isFinite(moisture)) parts.push(`Moisture ${moisture.toFixed(1)}%`);

    readingEl.innerText = parts.length ? parts.join('  •  ') : '';
    latestSensorReading = reading;

    if (zoneId === 'ESP32_01') {
      telemetryViewMode = 'hardware';
      selectedBackendZoneId = null;

      const sourceTag = document.getElementById('data-source-tag');
      const cardTitle = document.getElementById('telemetry-card-title');
      const sourceDesc = document.getElementById('telemetry-source-desc');
      const hwBadge = document.getElementById('hardware-badge');
      const elTilt = document.getElementById('val-tilt');
      const elMoist = document.getElementById('val-moisture');
      const elRain = document.getElementById('val-rain');

      if (sourceTag) {
        sourceTag.innerText = 'LIVE ESP32 DEPLOYMENT';
        sourceTag.classList.add('hardware');
      }
      if (cardTitle) cardTitle.innerText = 'ESP32_01 — ESP32 Edge Telemetry';
      if (sourceDesc) sourceDesc.innerText = `Data Source: Physical ESP32 Sensor • Updated ${formatSensorTime(reading.timestamp)}`;
      if (hwBadge) {
        hwBadge.className = 'badge purple';
        hwBadge.innerText = 'LIVE HARDWARE';
      }
      if (elTilt) elTilt.innerText = Number.isFinite(tilt) ? `${tilt.toFixed(1)}°` : '—';
      if (elMoist) elMoist.innerText = Number.isFinite(moisture) ? `${moisture.toFixed(1)}%` : '—';
      if (elRain) elRain.innerText = '—';
    }
  } else {
    readingEl.innerText = '';
  }

  timeEl.innerText = alert.timestamp ? `Detected: ${formatSensorTime(alert.timestamp)}` : 'Detected just now';
  alertBox.classList.remove('hidden');
}

function hideLiveSensorAlert() {
  const alertBox = document.getElementById('live-sensor-alert');
  if (alertBox) alertBox.classList.add('hidden');
}

async function fetchRecentAlerts() {
  const response = await fetch(`${getApiBase()}/api/alerts/recent`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Alerts API returned ${response.status}`);
  const alerts = await response.json();
  return Array.isArray(alerts) ? alerts : [];
}

function isHardwareSensorAlert(alert) {
  if (!alert) return false;
  const source = String(alert.source || alert.alert_source || "").trim().toLowerCase();
  return source === "sensor";
}

async function pollLiveSensorAlerts() {
  try {
    const alerts = await fetchRecentAlerts();
    const sensorAlerts = alerts.filter(isHardwareSensorAlert);

    if (sensorAlerts.length === 0) {
      liveAlertMonitorInitialized = true;
      hideLiveSensorAlert();
      return;
    }

    const latestAlert = sensorAlerts[0];
    const alertId = Number(latestAlert.alert_id || latestAlert.id || 0);

    latestSeenAlertId = Math.max(latestSeenAlertId, alertId);
    liveAlertMonitorInitialized = true;

    let reading = null;
    const zoneId = latestAlert.zone_id || latestAlert.sensor_id;

    if (zoneId) {
      try {
        const sensorResponse = await fetch(
          `${getApiBase()}/api/sensor-data/latest/${encodeURIComponent(zoneId)}`,
          { cache: "no-store" }
        );

        if (sensorResponse.ok) {
          const sensorData = await sensorResponse.json();
          if (sensorData.status === "ok" && sensorData.reading) {
            reading = sensorData.reading;
          }
        }
      } catch (sensorError) {
        console.warn("[ESP32] Telemetry fetch failed:", sensorError);
      }
    }

    showLiveSensorAlert(latestAlert, reading);
    showSensorAlertPopup(latestAlert, reading);

  } catch (error) {
    console.warn("[ESP32] Alert polling failed:", error);
  }
}

function startLiveSensorAlertMonitoring() {
  ensureLiveSensorAlertUI();
  pollLiveSensorAlerts();
  liveAlertPollTimer = setInterval(pollLiveSensorAlerts, 3000);
}

// =========================================================================
// 16. Operational Alerts Manager (Cloud Synchronized)
// =========================================================================

async function dispatchAlert() {
  const titleInput = document.getElementById('alert-title');
  const severitySelect = document.getElementById('alert-severity');
  const regionSelect = document.getElementById('alert-region');

  const title = titleInput ? titleInput.value.trim() : '';
  const severity = severitySelect ? severitySelect.value : 'Warning';
  const region = regionSelect ? regionSelect.value : 'All NER States';

  if (!title) {
    alert('Please enter an alert message before dispatching.');
    return;
  }

  try {
    await fetch(`${getApiBase()}/api/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title,
        message: title,
        severity: severity.toLowerCase(),
        risk_level: severity.toLowerCase(),
        region: region,
        zone_id: region
      })
    });
  } catch (err) {
    console.warn('[Alerts] Cloud dispatch offline, using local queue:', err);
  }

  const newAlert = {
    id: 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    title: title,
    severity: severity,
    region: region,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  const alerts = JSON.parse(localStorage.getItem('giri_alerts') || '[]');
  alerts.unshift(newAlert);
  localStorage.setItem('giri_alerts', JSON.stringify(alerts));

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(`GIRI RAKSHAK: ${severity.toUpperCase()} ALERT`, {
      body: `${title}\nRegion: ${region}`,
      icon: './logo.png',
      badge: './logo1.png',
      vibrate: [200, 100, 200]
    });
  }

  if (titleInput) titleInput.value = '';
  await renderAlertsFeed();
}

window.deleteAlert = async function(alertId) {
  try {
    await fetch(`${getApiBase()}/api/alerts/${encodeURIComponent(alertId)}`, {
      method: 'DELETE'
    });
  } catch (err) {}

  let alerts = JSON.parse(localStorage.getItem('giri_alerts') || '[]');
  alerts = alerts.filter(a => String(a.id) !== String(alertId));
  localStorage.setItem('giri_alerts', JSON.stringify(alerts));
  await renderAlertsFeed();
};

window.clearAllAlerts = function() {
  localStorage.removeItem('giri_alerts');
  renderAlertsFeed();
};

async function renderAlertsFeed() {
  const officialContainer = document.getElementById('alerts-feed-container');
  const publicContainer = document.getElementById('public-alerts-feed');
  const officialBadge = document.getElementById('active-alert-count');
  const publicBadge = document.getElementById('public-alert-count');

  let alerts = [];

  try {
    const res = await fetch(`${getApiBase()}/api/alerts/recent`, { cache: 'no-store' });
    if (res.ok) {
      const cloudAlerts = await res.json();
      if (Array.isArray(cloudAlerts) && cloudAlerts.length > 0) {
        alerts = cloudAlerts.map(a => ({
          id: a.id || a.alert_id,
          title: a.title || a.message,
          severity: a.severity || a.risk_level || 'warning',
          region: a.region || a.zone_id || 'All NER States',
          timestamp: a.timestamp ? formatSensorTime(a.timestamp) : 'Live'
        }));
      }
    }
  } catch (e) {
    console.warn('[Alerts] Could not pull from Render, checking local fallback.');
  }

  if (alerts.length === 0) {
    alerts = JSON.parse(localStorage.getItem('giri_alerts') || '[]');
  }

  if (officialBadge) officialBadge.innerText = `${alerts.length} ACTIVE`;
  if (publicBadge) publicBadge.innerText = `${alerts.length} ACTIVE`;

  const emptyPlaceholder = '<p style="color: #94a3b8; font-size: 12px; margin: 0; padding: 4px;">No active advisories issued.</p>';

  if (alerts.length === 0) {
    if (officialContainer) officialContainer.innerHTML = emptyPlaceholder;
    if (publicContainer) publicContainer.innerHTML = emptyPlaceholder;
    return;
  }

  const role = sessionStorage.getItem('userRole');
  const isOfficial = role === 'official';

  const html = alerts
    .map(a => {
      const isCritical = (a.severity || '').toLowerCase() === 'critical';
      const accentColor = isCritical ? '#ef4444' : '#f59e0b';
      const bgBadge = isCritical ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)';

      return `
      <div style="background: #0f172a; border-left: 4px solid ${accentColor}; border: 1px solid #334155; border-left-width: 4px; border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; position: relative;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 10px; font-weight: 700; color: ${accentColor}; background: ${bgBadge}; padding: 2px 6px; border-radius: 4px;">
            ${(a.severity || 'WARNING').toUpperCase()}
          </span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 11px; color: #94a3b8;">${a.timestamp || ''}</span>
            ${
              isOfficial && a.id
                ? `
              <button type="button" onclick="window.deleteAlert('${a.id}')" title="Delete Alert" 
                style="background: #ef4444; color: #ffffff; border: none; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer; padding: 3px 8px; display: inline-flex; align-items: center; line-height: 1;">
                ✕ Delete
              </button>`
                : ''
            }
          </div>
        </div>
        <div style="font-size: 13px; font-weight: 600; color: #f8fafc; line-height: 1.3;">${a.title}</div>
        <div style="font-size: 11px; color: #38bdf8; margin-top: 4px;">Location Coverage: ${a.region || 'All NER States'}</div>
      </div>
    `;
    })
    .join('');

  if (officialContainer) officialContainer.innerHTML = html;
  if (publicContainer) publicContainer.innerHTML = html;
}

// =========================================================================
// 17. Authentication & Gatekeeper Routing Engine (Fixed)
// =========================================================================

let selectedRole = 'citizen';

function openLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) modal.style.display = 'flex';
}

function closeLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) modal.style.display = 'none';
}

function selectRole(role) {
  selectedRole = role;
  const btnCitizen = document.getElementById('tab-citizen');
  const btnOfficial = document.getElementById('tab-official');
  const label = document.getElementById('login-id-label');
  const idInput = document.getElementById('login-id-input');

  if (role === 'official') {
    if (btnOfficial) {
      btnOfficial.style.background = '#2563eb';
      btnOfficial.style.color = '#ffffff';
    }
    if (btnCitizen) {
      btnCitizen.style.background = 'transparent';
      btnCitizen.style.color = '#94a3b8';
    }
    if (label) label.innerText = 'Official Badge / Dept ID';
    if (idInput) idInput.placeholder = 'Enter officer ID';
  } else {
    if (btnCitizen) {
      btnCitizen.style.background = '#2563eb';
      btnCitizen.style.color = '#ffffff';
    }
    if (btnOfficial) {
      btnOfficial.style.background = 'transparent';
      btnOfficial.style.color = '#94a3b8';
    }
    if (label) label.innerText = 'Citizen Mobile / Email';
    if (idInput) idInput.placeholder = 'Enter mobile or email';
  }
}

function submitLogin(e) {
  if (e) e.preventDefault();
  const idInput = document.getElementById('login-id-input');
  const id = idInput ? idInput.value.trim() : 'User';

  sessionStorage.setItem('userRole', selectedRole);
  sessionStorage.setItem('userId', id);

  closeLoginModal();
  applyRoleUI();
}

function handleAuthAction() {
  const currentRole = sessionStorage.getItem('userRole');
  if (currentRole) {
    sessionStorage.clear();
    applyRoleUI();
  } else {
    openLoginModal();
  }
}

function applyRoleUI() {
  const role = sessionStorage.getItem('userRole');
  const authBtn = document.getElementById('auth-action-btn');
  const reportBtn = document.getElementById('citizen-report-btn');
  const officialPanel = document.getElementById('official-alert-panel');
  const roleBadge = document.getElementById('user-role-badge');

  const publicView = document.getElementById('public-view-container');
  const officialView = document.getElementById('official-view-container');
  const systemStatusPill = document.querySelector('.system-status-pill');
  const legendEsp32Item = document.getElementById('legend-esp32') || document.querySelector('.legend-esp32-item');

  if (systemStatusPill) {
    systemStatusPill.style.display = (role === 'citizen' || !role) ? 'none' : 'inline-flex';
  }
  if (legendEsp32Item) {
    legendEsp32Item.style.display = (role === 'citizen' || !role) ? 'none' : 'flex';
  }

  renderAllNEROverview();

  if (role === 'official') {
    closeLoginModal();
    if (publicView) publicView.style.display = 'none';
    if (officialView) officialView.style.display = 'block';

    if (authBtn) {
      authBtn.innerText = 'Logout';
      authBtn.style.background = '#e11d48';
    }
    if (reportBtn) reportBtn.style.display = 'none';
    if (officialPanel) officialPanel.style.display = 'block';
    if (roleBadge) {
      roleBadge.innerText = 'OFFICIAL MONITOR';
      roleBadge.style.color = '#f87171';
    }

    setTimeout(() => {
      if (typeof telemetryChart !== 'undefined' && telemetryChart) {
        telemetryChart.resize();
      }
    }, 150);

  } else if (role === 'citizen') {
    closeLoginModal();
    if (publicView) publicView.style.display = 'block';
    if (officialView) officialView.style.display = 'none';

    if (authBtn) {
      authBtn.innerText = 'Logout';
      authBtn.style.background = '#e11d48';
    }
    if (reportBtn) reportBtn.style.display = 'inline-block';
    if (officialPanel) officialPanel.style.display = 'none';
    if (roleBadge) {
      roleBadge.innerText = 'CITIZEN ACCESS';
      roleBadge.style.color = '#38bdf8';
    }

  } else {
    // Default Guest Access
    if (publicView) publicView.style.display = 'block';
    if (officialView) officialView.style.display = 'none';

    if (authBtn) {
      authBtn.innerText = 'Login';
      authBtn.style.background = '#0284c7';
    }
    if (reportBtn) reportBtn.style.display = 'inline-block';
    if (officialPanel) officialPanel.style.display = 'none';
    if (roleBadge) {
      roleBadge.innerText = 'PUBLIC MONITOR';
      roleBadge.style.color = '#38bdf8';
    }
  }

  renderAlertsFeed();
  loadSavedCitizenReports();
}

window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.selectRole = selectRole;
window.submitLogin = submitLogin;
window.handleAuthAction = handleAuthAction;

// =========================================================================
// 18. Dark Mode Controller (Fully Injected CSS Engine)
// =========================================================================

function initDarkMode() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const icon = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');

  // Inject dark mode CSS dynamically so theme darkens instantly without requiring index.html changes
  if (!document.getElementById('giri-dark-mode-runtime-styles')) {
    const style = document.createElement('style');
    style.id = 'giri-dark-mode-runtime-styles';
    style.textContent = `
      body.dark-mode {
        background-color: #0b0f19 !important;
        color: #f1f5f9 !important;
      }
      body.dark-mode .sidebar,
      body.dark-mode .panel,
      body.dark-mode .card,
      body.dark-mode .nav-bar,
      body.dark-mode .modal-content,
      body.dark-mode .control-panel,
      body.dark-mode .shap-summary-card,
      body.dark-mode div[style*="background: #ffffff"],
      body.dark-mode div[style*="background: var(--panel-bg, #ffffff)"] {
        background-color: #111827 !important;
        color: #f1f5f9 !important;
        border-color: #1f2937 !important;
      }
      body.dark-mode select,
      body.dark-mode input {
        background-color: #1f2937 !important;
        color: #f8fafc !important;
        border-color: #374151 !important;
      }
      body.dark-mode .leaflet-tile-container img {
        filter: brightness(0.65) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7) !important;
      }
      body.dark-mode .leaflet-popup-content-wrapper,
      body.dark-mode .leaflet-popup-tip {
        background-color: #1f2937 !important;
        color: #f8fafc !important;
      }
    `;
    document.head.appendChild(style);
  }

  const savedTheme = localStorage.getItem('giri_theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    document.body.classList.add('dark-mode');
    if (icon) icon.innerText = 'Theme:';
    if (label) label.innerText = 'Light';
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-mode');
      localStorage.setItem('giri_theme', isDark ? 'dark' : 'light');

      if (icon) icon.innerText = 'Theme:';
      if (label) label.innerText = isDark ? 'Light' : 'Dark';
    });
  }
}

// ============================================================
// LIVE SENSOR ALERT POPUP
// ============================================================

function showSensorAlertPopup(alert, reading = null) {
  if (!alert) return;

  const activeValue = alert.is_active;
  if (activeValue === false || activeValue === "false" || activeValue === 0) return;

  const level = String(alert.risk_level || alert.alert_level || "warning").toLowerCase();
  if (level === "normal" || level === "none") return;

  const alertId = String(
    alert.alert_id || alert.id || (String(alert.timestamp || "") + "|" + String(alert.message || ""))
  );

  if (window.__giriRakshakLastPopupAlertId === alertId) return;
  window.__giriRakshakLastPopupAlertId = alertId;

  const oldPopup = document.getElementById("giri-sensor-alert-popup");
  if (oldPopup) oldPopup.remove();

  let accent = "#f59e0b";
  let title = "SENSOR WARNING";

  if (level === "critical") {
    accent = "#ef4444";
    title = "🚨 CRITICAL SENSOR ALERT";
  } else if (level === "watch") {
    accent = "#eab308";
    title = "⚠ SENSOR WATCH";
  } else if (level === "very_high") {
    accent = "#dc2626";
    title = "🚨 VERY HIGH SENSOR ALERT";
  }

  const overlay = document.createElement("div");
  overlay.id = "giri-sensor-alert-popup";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "99999",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: "85px",
    background: "rgba(0,0,0,0.28)",
    backdropFilter: "blur(2px)",
  });

  const card = document.createElement("div");
  Object.assign(card.style, {
    width: "min(560px, calc(100vw - 32px))",
    boxSizing: "border-box",
    background: "#ffffff",
    borderRadius: "16px",
    border: `4px solid ${accent}`,
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    overflow: "hidden",
    fontFamily: "Arial, sans-serif",
    animation: "giriSensorPopupIn 0.22s ease-out",
  });

  const header = document.createElement("div");
  Object.assign(header.style, {
    background: accent,
    color: "#ffffff",
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
  });

  const heading = document.createElement("div");
  heading.textContent = title;
  heading.style.fontWeight = "800";
  heading.style.fontSize = "18px";

  const close = document.createElement("button");
  close.textContent = "×";
  Object.assign(close.style, {
    border: "none",
    background: "rgba(255,255,255,0.2)",
    color: "#ffffff",
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    fontSize: "24px",
    lineHeight: "1",
    cursor: "pointer",
  });

  header.appendChild(heading);
  header.appendChild(close);

  const body = document.createElement("div");
  Object.assign(body.style, { padding: "20px", color: "#172033" });

  const message = document.createElement("div");
  message.textContent = String(alert.message || "ESP32 reported an active sensor alert.");
  Object.assign(message.style, {
    fontSize: "16px",
    lineHeight: "1.5",
    fontWeight: "600",
    marginBottom: "16px",
  });

  body.appendChild(message);

  if (reading) {
    const telemetry = document.createElement("div");
    Object.assign(telemetry.style, {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: "10px",
    });

    const fields = [
      ["Tilt", reading.tilt_deg, "°"],
      ["Tilt Change", reading.tilt_change_deg, "°"],
      ["Tilt Rate", reading.tilt_rate_dph, "°/h"],
      ["10s Tilt", reading.tilt_sudden_change_10s_deg, "°"],
      ["Soil", reading.moisture_pct, "%"],
      ["Distance", reading.distance_cm, " cm"],
      ["Distance Change", reading.distance_change_cm, " cm"],
      ["Movement", reading.movement_ratio, "x"],
    ];

    fields.forEach(([label, value, unit]) => {
      if (value === null || value === undefined || Number.isNaN(Number(value))) return;

      const item = document.createElement("div");
      Object.assign(item.style, {
        background: "#f3f6fa",
        borderRadius: "10px",
        padding: "11px 12px",
      });

      const labelNode = document.createElement("div");
      labelNode.textContent = label;
      labelNode.style.fontSize = "11px";
      labelNode.style.color = "#657184";

      const valueNode = document.createElement("div");
      let number = Number(value);
      valueNode.textContent = (Math.abs(number) >= 100 ? number.toFixed(1) : number.toFixed(2)) + unit;
      valueNode.style.fontWeight = "800";
      valueNode.style.fontSize = "15px";

      item.appendChild(labelNode);
      item.appendChild(valueNode);
      telemetry.appendChild(item);
    });

    body.appendChild(telemetry);
  }

  const footer = document.createElement("div");
  footer.textContent = `Zone: ${alert.zone_id || alert.sensor_id || "ESP32"}`;
  Object.assign(footer.style, { marginTop: "16px", fontSize: "12px", color: "#718096" });

  body.appendChild(footer);
  card.appendChild(header);
  card.appendChild(body);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  close.onclick = () => overlay.remove();
  overlay.onclick = (event) => { if (event.target === overlay) overlay.remove(); };

  const escapeHandler = (event) => {
    if (event.key === "Escape") {
      overlay.remove();
      document.removeEventListener("keydown", escapeHandler);
    }
  };
  document.addEventListener("keydown", escapeHandler);

  window.setTimeout(() => {
    if (document.body.contains(overlay)) overlay.remove();
    document.removeEventListener("keydown", escapeHandler);
  }, 12000);
}

if (!document.getElementById("giri-sensor-popup-style")) {
  const style = document.createElement("style");
  style.id = "giri-sensor-popup-style";
  style.textContent = `
    @keyframes giriSensorPopupIn {
      from { opacity: 0; transform: translateY(-18px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `;
  document.head.appendChild(style);
}

// FULL ESP32 EDGE TELEMETRY READOUT MODULE
(function () {
  const PANEL_ID = "giri-full-esp32-telemetry";
  const GRID_ID = "giri-full-esp32-telemetry-grid";
  const STATUS_ID = "giri-full-esp32-telemetry-status";

  function apiBase() {
    if (typeof getApiBase === "function") return getApiBase();
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1" || /^192\.168\./.test(host) || /^10\./.test(host)) {
      return "http://" + (host || "127.0.0.1") + ":8000";
    }
    return "https://giri-rakshak-zsk5.onrender.com";
  }

  function fmt(value, digits = 2, unit = "") {
    if (value === null || value === undefined || value === "") return "—";
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return n.toFixed(digits) + (unit ? ` ${unit}` : "");
  }

  function addField(grid, label, value, digits = 2, unit = "") {
    const box = document.createElement("div");
    box.className = "giri-full-esp32-field";
    const labelNode = document.createElement("div");
    labelNode.className = "giri-full-esp32-label";
    labelNode.textContent = label;
    const valueNode = document.createElement("div");
    valueNode.className = "giri-full-esp32-value";
    valueNode.textContent = fmt(value, digits, unit);
    box.appendChild(labelNode);
    box.appendChild(valueNode);
    grid.appendChild(box);
  }

  function addTextField(grid, label, value) {
    const box = document.createElement("div");
    box.className = "giri-full-esp32-field";
    const labelNode = document.createElement("div");
    labelNode.className = "giri-full-esp32-label";
    labelNode.textContent = label;
    const valueNode = document.createElement("div");
    valueNode.className = "giri-full-esp32-value";
    valueNode.textContent = (value === null || value === undefined || value === "") ? "—" : String(value);
    box.appendChild(labelNode);
    box.appendChild(valueNode);
    grid.appendChild(box);
  }

  function findTelemetryCard() {
    const elements = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,div"));
    const heading = elements.find(el => String(el.textContent || "").trim().includes("ESP32 EDGE TELEMETRY"));
    if (!heading) return null;

    let current = heading;
    for (let i = 0; i < 10 && current; i++) {
      const text = String(current.innerText || "");
      if (text.includes("Tilt Angle") && text.includes("Soil Moisture")) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  function ensurePanel() {
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;

    const card = findTelemetryCard();
    if (!card) return null;

    panel = document.createElement("section");
    panel.id = PANEL_ID;

    const title = document.createElement("div");
    title.className = "giri-full-esp32-title";
    title.textContent = "FULL ESP32 EDGE TELEMETRY";

    const status = document.createElement("div");
    status.id = STATUS_ID;
    status.className = "giri-full-esp32-status";
    status.textContent = "Waiting for live ESP32 data...";

    const grid = document.createElement("div");
    grid.id = GRID_ID;
    grid.className = "giri-full-esp32-grid";

    panel.appendChild(title);
    panel.appendChild(status);
    panel.appendChild(grid);
    card.appendChild(panel);

    return panel;
  }

  function render(reading) {
    const panel = ensurePanel();
    if (!panel) return;

    const grid = document.getElementById(GRID_ID);
    const status = document.getElementById(STATUS_ID);
    if (!grid) return;

    grid.innerHTML = "";

    addTextField(grid, "Sensor ID", reading.sensor_id);
    addTextField(grid, "Alert Level", reading.alert_level);
    addTextField(grid, "System State", reading.system_state);
    addTextField(grid, "Updated", reading.timestamp ? new Date(reading.timestamp).toLocaleString() : null);

    addField(grid, "Latitude", reading.lat, 6);
    addField(grid, "Longitude", reading.lon, 6);

    addField(grid, "Tilt Angle", reading.tilt_deg, 3, "°");
    addField(grid, "Tilt Change", reading.tilt_change_deg, 3, "°");
    addField(grid, "Tilt Rate", reading.tilt_rate_dph, 3, "°/h");
    addField(grid, "Tilt 10s Change", reading.tilt_sudden_change_10s_deg, 3, "°");

    addField(grid, "Accel X", reading.accel_x_g, 4, "g");
    addField(grid, "Accel Y", reading.accel_y_g, 4, "g");
    addField(grid, "Accel Z", reading.accel_z_g, 4, "g");
    addField(grid, "Accel Magnitude", reading.accel_magnitude_g, 4, "g");
    addField(grid, "Accel Jump", reading.accel_jump_g, 4, "g");
    addField(grid, "Vibration RMS", reading.vibration_rms_g, 5, "g");
    addField(grid, "Movement Ratio", reading.movement_ratio, 2, "x");

    addField(grid, "Soil Moisture", reading.moisture_pct, 2, "%");
    addField(grid, "Soil Change", reading.moisture_change_pct, 2, "%");
    addField(grid, "Soil Rate", reading.moisture_rate_pph, 2, "%/h");

    addField(grid, "Distance", reading.distance_cm, 2, "cm");
    addField(grid, "Distance Change", reading.distance_change_cm, 3, "cm");
    addField(grid, "Distance Rate", reading.distance_rate_cmh, 2, "cm/h");
    addField(grid, "Displacement", reading.displacement_cm, 3, "cm");

    addField(grid, "BMP Pressure", reading.pressure_hpa, 2, "hPa");
    addField(grid, "BMP Temperature", reading.temperature_c, 2, "°C");
    addField(grid, "DHT Humidity", reading.humidity_pct, 2, "%");
    addField(grid, "Rainfall", reading.rainfall_mm, 2, "mm");

    if (status) {
      status.textContent = "LIVE • ESP32 • Updated " + new Date().toLocaleTimeString();
      status.style.color = "#86efac";
    }
  }

  async function update() {
    try {
      const response = await fetch(apiBase() + "/api/sensor-data/latest/ESP32_01", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.status !== "ok" || !data.reading) return;
      render(data.reading);
    } catch (error) {
      const status = document.getElementById(STATUS_ID);
      if (status) {
        status.textContent = "ESP32 telemetry unavailable";
        status.style.color = "#fca5a5";
      }
      console.warn("[ESP32 FULL TELEMETRY]", error);
    }
  }

  function injectStyles() {
    if (document.getElementById("giri-full-esp32-telemetry-style")) return;
    const style = document.createElement("style");
    style.id = "giri-full-esp32-telemetry-style";
    style.textContent = `
      #${PANEL_ID} {
        margin-top: 14px;
        padding: 14px;
        border-radius: 12px;
        background: #0f172a;
        color: #ffffff;
        width: 100%;
        box-sizing: border-box;
      }
      #${PANEL_ID} .giri-full-esp32-title {
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.4px;
        margin-bottom: 5px;
      }
      #${PANEL_ID} .giri-full-esp32-status {
        font-size: 10px;
        color: #94a3b8;
        margin-bottom: 11px;
      }
      #${PANEL_ID} .giri-full-esp32-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        max-height: 470px;
        overflow-y: auto;
        padding-right: 3px;
      }
      #${PANEL_ID} .giri-full-esp32-field {
        background: #182235;
        border: 1px solid #26344d;
        border-radius: 8px;
        padding: 8px 9px;
        min-width: 0;
      }
      #${PANEL_ID} .giri-full-esp32-label {
        color: #94a3b8;
        font-size: 9px;
        margin-bottom: 3px;
        line-height: 1.2;
      }
      #${PANEL_ID} .giri-full-esp32-value {
        color: #f8fafc;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.25;
        word-break: break-word;
      }
      @media (max-width: 700px) {
        #${PANEL_ID} .giri-full-esp32-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function start() {
    injectStyles();
    update();
    window.setInterval(update, 5000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { window.setTimeout(start, 800); }, { once: true });
  } else {
    window.setTimeout(start, 800);
  }
})();

// =========================================================================
// 19. Boot System & Initial Execution
// =========================================================================

initChart();
renderAllNEROverview();
loadBackendRiskZones();
syncAllRegionalLiveFeeds();
refreshTelemetry();
startLiveSensorAlertMonitoring();
initDarkMode();

setInterval(() => {
  loadSavedCitizenReports();
  renderAlertsFeed();
}, 5000);

setInterval(() => {
  refreshTelemetry();
}, 3000);

setTimeout(() => {
  map.invalidateSize();
}, 200);

window.addEventListener('resize', () => {
  map.invalidateSize();
});

document.addEventListener('DOMContentLoaded', applyRoleUI);
// BRICS Air Quality Watch — backend predictions + illustrative demo nodes
(async function renderBricsAirQualityDemo() {
  const container = document.getElementById("brics-city-list");
  const status = document.getElementById("brics-federated-status");

  if (!container || !status) return;

  const demoCities = [
    { country: "China", city: "Beijing", pm25: 82.6, source: "Illustrative demo" },
    { country: "Brazil", city: "São Paulo", pm25: 34.2, source: "Illustrative demo" },
    { country: "Russia", city: "Moscow", pm25: 28.7, source: "Illustrative demo" },
    { country: "South Africa", city: "Johannesburg", pm25: 41.3, source: "Illustrative demo" }
  ];

  try {
    const response = await fetch("http://127.0.0.1:8000/api/air-quality/predictions");
    if (!response.ok) throw new Error(`API returned ${response.status}`);

    const result = await response.json();

    const delhiPredictions = result.predictions
      .filter(item => item.location_id.startsWith("Delhi_"))
      .map(item => ({
        country: "India",
        city: item.location_id.replace("_Demo", "").replaceAll("_", " "),
        pm25: item.predicted_value,
        source: "Backend forecast"
      }));

    const allCities = [...delhiPredictions, ...demoCities];

    container.innerHTML = allCities.map(item => `
      <div style="display:flex;justify-content:space-between;gap:10px;padding:9px;border:1px solid #e2e8f0;border-radius:8px;">
        <div>
          <strong style="font-size:12px;">${item.city}</strong>
          <div style="font-size:11px;color:#64748b;">
  ${item.country} · ${item.source}
  ${Number(item.pm25) >= 75 ? " · Elevated PM2.5 demo signal" : ""}
</div>
        </div>
        <div style="text-align:right;">
          <strong style="font-size:14px;">${Number(item.pm25).toFixed(2)}</strong>
          <div style="font-size:10px;color:#64748b;">PM2.5 µg/m³</div>
        </div>
      </div>
    `).join("");

    status.textContent =
      "Federated coordination: simulated · 5 BRICS country nodes · no live model exchange";
  } catch (error) {
    console.error("BRICS air-quality API error:", error);
    container.innerHTML =
      '<p style="font-size:12px;color:#b91c1c;">Delhi forecast API unavailable. Check that the backend is running.</p>' +
      demoCities.map(item => `
        <div style="padding:9px;border:1px solid #e2e8f0;border-radius:8px;">
          <strong>${item.city}</strong> · ${item.country}
          <div style="font-size:11px;color:#64748b;">Illustrative demo only · PM2.5 ${item.pm25} µg/m³</div>
        </div>
      `).join("");
  }
})();
// BRICS prototype: citizen-submitted report count
(function updateBricsCitizenReportCount() {
  const countElement = document.getElementById("brics-citizen-count");
  if (!countElement) return;

  try {
    const reports = JSON.parse(localStorage.getItem("giri_citizen_reports") || "[]");
    countElement.textContent =
      `Citizen reports saved in this browser: ${reports.length}`;
  } catch (error) {
    countElement.textContent = "Citizen report count unavailable";
  }
})();
// BRICS 3D rotating globe with illustrative PM2.5 signals
(function initBricsGlobe() {
  const globeElement = document.getElementById("globeViz");
  if (!globeElement || typeof Globe !== "function") return;

  const citySignals = [
    { city: "Delhi", country: "India", lat: 28.6139, lng: 77.2090, pm25: 96.41 },
    { city: "Beijing", country: "China", lat: 39.9042, lng: 116.4074, pm25: 82.6 },
    { city: "São Paulo", country: "Brazil", lat: -23.5505, lng: -46.6333, pm25: 34.2 },
    { city: "Moscow", country: "Russia", lat: 55.7558, lng: 37.6173, pm25: 28.7 },
    { city: "Johannesburg", country: "South Africa", lat: -26.2041, lng: 28.0473, pm25: 41.3 }
  ];

  const colorFor = value =>
    value >= 75 ? "#ef4444" : value >= 50 ? "#f59e0b" : "#22c55e";

  // Initialize globe first
  const globe = Globe()(globeElement)
    .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
.backgroundColor("#b8e6ff")

   .showAtmosphere(true)
    .atmosphereColor("#d8f3ff")
    .atmosphereAltitude(0.18)
    .pointsData(citySignals)
    .pointLat("lat")
    .pointLng("lng")
    .pointAltitude(d => 0.025 + Math.min(d.pm25 / 3000, 0.05))
    .pointRadius(d => 0.35 + Math.min(d.pm25 / 300, 0.25))
    .pointColor(d => colorFor(d.pm25))
    .pointLabel(d =>
      `${d.city}, ${d.country}<br/>Illustrative PM2.5: ${d.pm25} µg/m³<br/>Synthetic demo data`
    )
    .ringsData(citySignals)
    .ringLat("lat")
    .ringLng("lng")
    .ringColor(d => colorFor(d.pm25))
    .ringMaxRadius(d => 2 + d.pm25 / 35)
    .ringPropagationSpeed(1.5)
    .ringRepeatPeriod(1800)
    .labelsData(citySignals)
    .labelLat("lat")
    .labelLng("lng")
    .labelText("city")
    .labelSize(1.2)
    .labelDotRadius(0.25)
    .labelColor(() => "#e2e8f0")
    .labelResolution(2);

  globe.controls().autoRotate = true;
  globe.controls().autoRotateSpeed = 0.45;
  globe.controls().enableZoom = true;

  // Load country boundaries
  (async function loadCountryBoundaries() {
    try {
      const response = await fetch(
        "https://unpkg.com/world-atlas@2/countries-110m.json"
      );
      if (!response.ok) throw new Error("Country boundary data unavailable");

      const topology = await response.json();
      const countries = topojson.feature(
        topology,
        topology.objects.countries
      ).features;

      globe
        .polygonsData(countries)
        .polygonCapColor(() => "rgba(20, 100, 160, 0.10)")
        .polygonSideColor(() => "rgba(30, 120, 180, 0.15)")
        .polygonStrokeColor(() => "#ffffff")
        .polygonAltitude(0.008)
        .onPolygonClick((feature, event, coordinates) => {
          if (!coordinates) return;
          globe.pointOfView({
            lat: coordinates.lat,
            lng: coordinates.lng,
            altitude: 1.1
          }, 1200);
        })
        .polygonLabel(feature =>
          `Country ID: ${feature.id}<br/>Click to focus`
        );

      console.log("World country boundaries loaded:", countries.length);
    } catch (error) {
      console.error("Country boundaries failed to load:", error);
    }
  })();

  // Load India state and union-territory boundaries
  (async function loadIndiaStateBoundaries() {
    try {
      const response = await fetch(
        "https://raw.githubusercontent.com/AbhinavSwami28/india-official-geojson/main/india-states-simplified.geojson"
      );
      if (!response.ok) throw new Error("India state boundary data unavailable");

      const geojson = await response.json();

      const stateLines = geojson.features.flatMap(feature => {
        const geometry = feature.geometry;
        if (!geometry) return [];

        const polygons =
          geometry.type === "Polygon"
            ? [geometry.coordinates]
            : geometry.type === "MultiPolygon"
              ? geometry.coordinates
              : [];

        return polygons.flatMap(polygon =>
          polygon.map(ring => ring)
        );
      });

      globe
        .pathsData(stateLines)
        .pathPoints(points => points)
        .pathPointLat(point => point[1])
        .pathPointLng(point => point[0])
        .pathColor(() => "#ffffff")
        .pathStroke(0.75)
        .pathAltitude(0.012)
        .pathTransitionDuration(0);

      console.log("India state boundaries loaded:", stateLines.length);
    } catch (error) {
      console.error("India state boundaries failed to load:", error);
    }
  })();


  // BRICS admin-1 + India district AQI polygons
  (async function loadBricsAQIRegions() {
    const files = {
      BRA: "Brazil",
      CHN: "China",
      EGY: "Egypt",
      ETH: "Ethiopia",
      IDN: "Indonesia",
      IRN: "Iran",
      RUS: "Russia",
      SAU: "Saudi Arabia",
      ZAF: "South Africa",
      ARE: "United Arab Emirates"
    };

    const baselines = {
      IND: 145,
      CHN: 175,
      BRA: 105,
      RUS: 90,
      ZAF: 130,
      EGY: 155,
      ETH: 95,
      IDN: 145,
      IRN: 165,
      SAU: 125,
      ARE: 110
    };

    function hashText(value) {
      let hash = 0;
      for (let i = 0; i < value.length; i++) {
        hash = ((hash * 31) + value.charCodeAt(i)) >>> 0;
      }
      return hash;
    }

    function demoAQI(countryCode, regionName) {
      const hash = hashText(`${countryCode}:${regionName}`);
      let value = baselines[countryCode] + (hash % 191);

      // Keep some clearly critical demo hotspots.
      if (hash % 37 === 0) value = 410 + (hash % 41);

      return Math.min(value, 450);
    }

    function aqiColor(aqi) {
      if (aqi <= 50) return "#ffffff";
      if (aqi <= 100) return "#ede9fe";
      if (aqi <= 150) return "#c4b5fd";
      if (aqi <= 200) return "#8b5cf6";
      if (aqi <= 300) return "#6d28d9";
      if (aqi <= 400) return "#4c1d95";
      return "#2e1065";
    }

    function aqiLevel(aqi) {
      if (aqi <= 100) return "Good";
      if (aqi <= 200) return "Moderate";
      if (aqi <= 300) return "Poor";
      if (aqi <= 400) return "Very Poor";
      return "Severe / Critical";
    }

    try {
      const worldResponse = await fetch(
        "https://unpkg.com/world-atlas@2/countries-110m.json"
      );
      if (!worldResponse.ok) throw new Error("World boundary data unavailable");

      const worldTopology = await worldResponse.json();
      const worldCountries = topojson.feature(
        worldTopology,
        worldTopology.objects.countries
      ).features;

      const bricsResults = await Promise.all(
        Object.keys(files).map(async code => {
          const response = await fetch(`./data/brics/${code}_1.json`);
          if (!response.ok) {
            throw new Error(`${code} admin boundary request failed: ${response.status}`);
          }

          const data = await response.json();

          return data.features.map(feature => {
            const props = { ...(feature.properties || {}) };
            const regionName = props.NAME_1 || "Unknown region";
            const aqi = demoAQI(code, regionName);

            props.__aqi = aqi;
            props.__aqiLevel = aqiLevel(aqi);
            props.__admin1 = true;
            props.__countryCode = code;
            props.__countryName = files[code];
            props.__regionName = regionName;

            return {
              ...feature,
              properties: props
            };
          });
        })
      );

      const indiaResponse = await fetch("./data/india_districts.geojson");
      if (!indiaResponse.ok) {
        throw new Error(`India district boundary request failed: ${indiaResponse.status}`);
      }

      const indiaData = await indiaResponse.json();

      const indiaDistricts = indiaData.features.map(feature => {
        const props = { ...(feature.properties || {}) };
        const districtName = props.NAME_2 || "Unknown district";
        const stateName = props.NAME_1 || "India";
        const aqi = demoAQI("IND", `${stateName}:${districtName}`);

        props.__aqi = aqi;
        props.__aqiLevel = aqiLevel(aqi);
        props.__admin1 = true;
        props.__indiaDistrict = true;
        props.__countryCode = "IND";
        props.__countryName = "India";
        props.__regionName = districtName;

        return {
          ...feature,
          properties: props
        };
      });

      const adminRegions = [
        ...bricsResults.flat(),
        ...indiaDistricts
      ];

      globe
        .polygonsData([...worldCountries, ...adminRegions])
        .polygonCapColor(feature => {
          const props = feature.properties || {};

          if (!props.__admin1) {
            return "rgba(30, 110, 170, 0.10)";
          }

          return aqiColor(Number(props.__aqi || 0));
        })
        .polygonSideColor(feature => {
          const props = feature.properties || {};

          if (!props.__admin1) {
            return "rgba(30, 120, 180, 0.10)";
          }

          return "rgba(15, 23, 42, 0.28)";
        })
        .polygonStrokeColor(feature => {
          const props = feature.properties || {};
          return props.__admin1 ? "#ffffff" : "rgba(255,255,255,0.45)";
        })
        .polygonAltitude(feature => {
          const props = feature.properties || {};
          return props.__admin1 ? 0.015 : 0.004;
        })
        .onPolygonClick((feature, event, coordinates) => {
          if (!coordinates) return;

          globe.pointOfView({
            lat: coordinates.lat,
            lng: coordinates.lng,
            altitude: 1.15
          }, 900);
        })
        .polygonLabel(feature => {
          const props = feature.properties || {};

          if (!props.__admin1) {
            return "Country boundary";
          }

          const aqi = Number(props.__aqi || 0);
          const critical = aqi >= 301;

          return `
            <strong>${props.__regionName}</strong><br/>
            ${props.__countryName}<br/>
            AQI: <strong>${aqi}</strong><br/>
            Status: <strong>${critical ? "CRITICAL" : props.__aqiLevel}</strong><br/>
            <small>Synthetic demo AQI — not official/live</small>
          `;
        });

      console.log(
        `BRICS AQI regions loaded: ${adminRegions.length} `
        + `(India districts: ${indiaDistricts.length})`
      );
    } catch (error) {
      console.error("BRICS AQI region layer failed:", error);
    }
  })();

  function resizeGlobe() {
    globe.width(globeElement.clientWidth);
    globe.height(globeElement.clientHeight);
  }

  resizeGlobe();
  window.addEventListener("resize", resizeGlobe);
})();

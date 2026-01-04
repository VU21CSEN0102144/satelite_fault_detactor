/* Script will go here */

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyCqg6M1cyXZgktoK8xOT17IlHHIgz-aO9o",
    authDomain: "fault-detection-66259.firebaseapp.com",
    databaseURL: "https://fault-detection-66259-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "fault-detection-66259",
    storageBucket: "fault-detection-66259.firebasestorage.app",
    messagingSenderId: "855923820910",
    appId: "1:855923820910:web:79a86ffce76d873646197f",
    measurementId: "G-MV3V54ZJDK"
};

// Initialize Firebase
let database;
try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// Check Firebase connection (will be set up after DOM loads)
function setupFirebaseStatusMonitor() {
    const firebaseStatusEl = document.getElementById('firebase-status');
    if (!database || !firebaseStatusEl) return;
    
    database.ref('.info/connected').on('value', (snapshot) => {
        if (snapshot.val() === true) {
            console.log('Firebase: Connected ✓');
            firebaseStatusEl.classList.add('connected');
            firebaseStatusEl.classList.remove('disconnected');
            
            // Test write on connection
            testFirebaseWrite();
        } else {
            console.log('Firebase: Disconnected ✗');
            firebaseStatusEl.classList.add('disconnected');
            firebaseStatusEl.classList.remove('connected');
        }
    });
}

// Test Firebase write/read
function testFirebaseWrite() {
    console.log('🧪 Testing Firebase write...');
    
    // Write test data to /test node (this will update the display)
    const testData = {
        temperature: 26,
        humidity: 66,
        voltage: 1.49,
        current: 0.01,
        temperature_status: "NORMAL",
        voltage_status: "NORMAL",
        current_status: "NORMAL",
        timestamp: new Date().toISOString()
    };
    
    const testRef = database.ref('test');
    testRef.set(testData).then(() => {
        console.log('✅ Firebase write test PASSED');
        console.log('📊 Test data written to /test:', testData);
        // Now read it back
        testRef.once('value', (snapshot) => {
            console.log('✅ Firebase read test PASSED:', snapshot.val());
        });
    }).catch(error => {
        console.error('❌ Firebase write test FAILED:', error);
    });
}

// --- Configuration ---
const CONFIG = {
    updateInterval: 2000, // ms
    maxHistory: 20, // Keep graph clean
    storageKey: 'satellite_telemetry_data',
    thresholds: {
        temperature: { min: -40, max: 85, warningHigh: 60, criticalHigh: 80, warningLow: -20, criticalLow: -35 },
        humidity: { min: 0, max: 30, warningHigh: 20, criticalHigh: 28 },
        voltage: { min: 3.3, max: 12, warningLow: 11.5, criticalLow: 11.0, warningHigh: 12.5, criticalHigh: 13.0 }
    }
};

// --- State Management ---
let state = {
    isLoggedIn: false,
    missionStartTime: null,
    selectedMetric: 'temperature', // temperature, humidity, voltage
    data: {
        temperature: 26.0,  // Firebase value
        humidity: 66.0,     // Firebase value
        voltage: 1.49       // Firebase value
    },
    history: {
        labels: [],
        temperature: [],
        humidity: [],
        voltage: []
    },
    health: 100,
    faults: [],
    faultLogHistory: [] // Store full log history
};

let simulationInterval;
let metInterval;
let chartInstance;
let healthPieChart; // New variable for pie chart

// --- DOM Elements ---
const els = {
    loginSection: document.getElementById('login-section'),
    dashboardSection: document.getElementById('dashboard-section'),
    loginForm: document.getElementById('login-form'),
    logoutBtn: document.getElementById('logout-btn'),
    missionTime: document.getElementById('mission-time'),
    healthPercentage: document.getElementById('health-percentage'),
    healthText: document.getElementById('health-text'),
    healthRing: document.querySelector('.progress-ring__circle'),
    faultLog: document.getElementById('fault-log'),
    cards: {
        temperature: document.getElementById('card-temp'),
        humidity: document.getElementById('card-humidity'),
        voltage: document.getElementById('card-voltage')
    },
    values: {
        temperature: document.getElementById('temp-value'),
        humidity: document.getElementById('humidity-value'),
        voltage: document.getElementById('voltage-value')
    },
    statuses: {
        temperature: document.getElementById('temp-status'),
        humidity: document.getElementById('humidity-status'),
        voltage: document.getElementById('voltage-status')
    },
    graphTitle: document.getElementById('graph-title'),
    simToggleBtn: document.getElementById('sim-toggle-btn'),
    simResetBtn: document.getElementById('sim-reset-btn')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    setupEventListeners();
    initChart();
    initHealthPieChart(); // Initialize pie chart
    setupFirebaseStatusMonitor(); // Set up Firebase connection monitor
    loadRecentDataFromFirebase(); // Load recent data from cloud
    
    // Check if we were already logged in (persisted session)
    if (state.isLoggedIn) {
        restoreSession();
    }
});

function setupEventListeners() {
    els.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        login();
    });

    els.logoutBtn.addEventListener('click', logout);
    
    // Simulation Controls
    els.simToggleBtn.addEventListener('click', toggleSimulation);
    els.simResetBtn.addEventListener('click', resetSimulation);
}

// --- Authentication & Session ---
function login() {
    state.isLoggedIn = true;
    state.missionStartTime = new Date(); // Reset time on new login
    saveState();
    
    // Load Firebase data FIRST, then show dashboard
    if (database) {
        database.ref('test').once('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                console.log('✅ Loading Firebase values on login:', data);
                state.data.temperature = Number(data.temperature) || 26;
                state.data.humidity = Number(data.humidity) || 66;
                state.data.voltage = Number(data.voltage) || 1.49;
            }
            transitionToDashboard();
            startSimulation();
        }).catch((error) => {
            console.error('Error loading Firebase data:', error);
            transitionToDashboard();
            startSimulation();
        });
    } else {
        transitionToDashboard();
        startSimulation();
    }
}

function restoreSession() {
    // If we have a stored start time, use it, otherwise reset
    if (typeof state.missionStartTime === 'string') {
        state.missionStartTime = new Date(state.missionStartTime);
    } else if (!state.missionStartTime) {
        state.missionStartTime = new Date();
    }
    
    transitionToDashboard();
    startSimulation();
}

function transitionToDashboard() {
    els.loginSection.classList.add('hidden-section');
    els.dashboardSection.classList.remove('hidden-section');
}

function logout() {
    state.isLoggedIn = false;
    state.missionStartTime = null;
    state.history = { labels: [], temperature: [], humidity: [], voltage: [] }; // Clear history on logout
    saveState();
    
    stopSimulation();
    
    els.dashboardSection.classList.add('hidden-section');
    els.loginSection.classList.remove('hidden-section');
    els.loginForm.reset();
}

// --- Data Persistence ---
function saveState() {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
}

function saveToFirebase() {
    if (!database) {
        console.warn('Firebase not initialized, skipping save');
        return;
    }
    
    try {
        // Save current telemetry data to Firebase
        const timestamp = new Date().toISOString();
        const key = Date.now();
        const dataRef = database.ref('telemetry/' + key);
        
        const dataToSave = {
            timestamp: timestamp,
            temperature: parseFloat(state.data.temperature.toFixed(2)),
            humidity: parseFloat(state.data.humidity.toFixed(2)),
            voltage: parseFloat(state.data.voltage.toFixed(2)),
            health: Math.round(state.health),
            missionTime: els.missionTime?.textContent || '00:00:00'
        };
        
        dataRef.set(dataToSave).then(() => {
            console.log('✓ Data saved to Firebase:', key);
            updateFirebaseDebug('Saved', dataToSave);
        }).catch(error => {
            console.error("✗ Error saving to Firebase:", error);
            updateFirebaseDebug('Error', error.message);
        });
    } catch (error) {
        console.error("✗ Firebase save exception:", error);
        updateFirebaseDebug('Exception', error.message);
    }
}

function saveFaultToFirebase(fault) {
    if (!database) {
        console.warn('Firebase not initialized, skipping fault save');
        return;
    }
    
    try {
        // Save fault logs to Firebase
        const faultRef = database.ref('faults/' + Date.now());
        
        faultRef.set({
            timestamp: new Date().toISOString(),
            message: fault.message,
            type: fault.type,
            temperature: parseFloat(state.data.temperature.toFixed(2)),
            humidity: parseFloat(state.data.humidity.toFixed(2)),
            voltage: parseFloat(state.data.voltage.toFixed(2))
        }).then(() => {
            console.log('✓ Fault saved to Firebase:', fault.type);
        }).catch(error => {
            console.error("✗ Error saving fault to Firebase:", error);
        });
    } catch (error) {
        console.error("✗ Firebase fault save exception:", error);
    }
}

function loadState() {
    const stored = localStorage.getItem(CONFIG.storageKey);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            // Merge stored state with defaults to ensure structure
            state = { ...state, ...parsed };
        } catch (e) {
            console.error("Failed to load state", e);
        }
    }
}

function loadRecentDataFromFirebase() {
    if (!database) {
        console.warn('Firebase not initialized, skipping data load');
        return;
    }
    
    try {
        // IMMEDIATELY load and display Firebase /test node values
        database.ref('test').once('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                console.log('✅ LOADING FIREBASE VALUES:', data);
                
                // Set the actual display values from Firebase
                if (data.temperature !== undefined) {
                    state.data.temperature = Number(data.temperature);
                }
                if (data.humidity !== undefined) {
                    state.data.humidity = Number(data.humidity);
                }
                if (data.voltage !== undefined) {
                    state.data.voltage = Number(data.voltage);
                }
                
                // Add to history for graphs
                addToHistory();
                
                // Update the UI immediately
                updateUI();
                
                console.log('✅ Dashboard now showing Firebase values:', {
                    temperature: state.data.temperature,
                    humidity: state.data.humidity,
                    voltage: state.data.voltage
                });
            }
        });
        
        // Set up real-time listener for /test node to display actual Firebase values
        database.ref('test').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                console.log('🔥 FIREBASE DATA UPDATE from /test:', data);
                
                // Update the actual display values with Firebase data
                if (data.temperature !== undefined) {
                    state.data.temperature = Number(data.temperature);
                }
                if (data.humidity !== undefined) {
                    state.data.humidity = Number(data.humidity);
                }
                if (data.voltage !== undefined) {
                    state.data.voltage = Number(data.voltage);
                }
                
                // Add to history for graphs
                addToHistory();
                
                // Update the UI with Firebase values
                updateUI();
                
                // Show in debug panel
                updateFirebaseDebug('FIREBASE SYNC', {
                    temperature: state.data.temperature,
                    humidity: state.data.humidity,
                    voltage: state.data.voltage,
                    health: state.health
                });
            }
        });
        
        // Also listen to telemetry for historical data
        database.ref('telemetry').limitToLast(10).once('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                console.log("✓ Loaded recent telemetry from Firebase:", Object.keys(data).length, "records");
                console.table(data); // Display in table format
            } else {
                console.log("ℹ No previous telemetry data in Firebase");
            }
        }).catch(error => {
            console.error("✗ Error loading from Firebase:", error);
        });
        
        // Set up real-time listener for new telemetry data
        database.ref('telemetry').limitToLast(1).on('child_added', (snapshot) => {
            const data = snapshot.val();
            console.log('🔥 NEW DATA ADDED TO FIREBASE:', snapshot.key);
            console.log('📊 Data:', data);
            updateFirebaseDebug('LIVE UPDATE', data);
        });
        
    } catch (error) {
        console.error("✗ Firebase load exception:", error);
    }
}

// Helper function to add current values to history
function addToHistory() {
    const now = new Date();
    const timeLabel = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    state.history.labels.push(timeLabel);
    state.history.temperature.push(state.data.temperature);
    state.history.humidity.push(state.data.humidity);
    state.history.voltage.push(state.data.voltage);

    // Maintain fixed history size
    if (state.history.labels.length > CONFIG.maxHistory) {
        state.history.labels.shift();
        state.history.temperature.shift();
        state.history.humidity.shift();
        state.history.voltage.shift();
    }
}

function updateFirebaseDebug(status, data) {
    const debugEl = document.getElementById('firebase-debug');
    if (!debugEl) return;
    
    const timestamp = new Date().toLocaleTimeString();
    let content = `<div style="margin-bottom: 5px;"><strong>${timestamp} - ${status}</strong></div>`;
    
    if (typeof data === 'object') {
        content += `<div style="margin-left: 10px; color: #00ff88;">`;
        content += `T: ${data.temperature}°C | `;
        content += `H: ${data.humidity}% | `;
        content += `V: ${data.voltage}V | `;
        content += `Health: ${data.health}%`;
        content += `</div>`;
    } else {
        content += `<div style="margin-left: 10px; color: #ff4d4d;">${data}</div>`;
    }
    
    debugEl.innerHTML = content + '<hr style="border-color: rgba(255,255,255,0.1); margin: 10px 0;">' + debugEl.innerHTML;
    
    // Keep only last 5 entries
    const entries = debugEl.querySelectorAll('hr');
    if (entries.length > 5) {
        for (let i = 5; i < entries.length; i++) {
            const hr = entries[i];
            while (hr.nextSibling) {
                hr.nextSibling.remove();
            }
            hr.remove();
        }
    }
    
    // Also update live viewer
    updateLiveViewer(status, data);
}

// Update the live Firebase data viewer
function updateLiveViewer(status, data) {
    const liveEl = document.getElementById('firebase-live-data');
    if (!liveEl) return;
    
    const timestamp = new Date().toLocaleTimeString();
    
    if (typeof data === 'object' && data.temperature !== undefined) {
        const entry = `<div style="padding: 4px; border-left: 3px solid var(--success-color); margin-bottom: 6px; background: rgba(0,255,100,0.05);">
            <span style="color: #00ff88;">⚡ ${timestamp}</span><br>
            <span style="color: #4da6ff;">🌡️ Temp: ${data.temperature}°C</span> | 
            <span style="color: #ff88ff;">💧 Hum: ${data.humidity}%</span> | 
            <span style="color: #ffaa00;">⚡ Volt: ${data.voltage}V</span><br>
            <span style="color: #00ff88;">❤️ Health: ${data.health}%</span>
        </div>`;
        
        // Add to top
        liveEl.innerHTML = entry + liveEl.innerHTML;
        
        // Keep only last 5 entries
        const entries = liveEl.querySelectorAll('div[style*="border-left"]');
        if (entries.length > 5) {
            for (let i = 5; i < entries.length; i++) {
                entries[i].remove();
            }
        }
    }
}

// --- Simulation Logic ---// --- Simulation Logic ---
let isPaused = false;

function startSimulation() {
    updateMET();
    updateUI(); 
    
    if (metInterval) clearInterval(metInterval);
    if (simulationInterval) clearInterval(simulationInterval);

    metInterval = setInterval(() => {
        if (!isPaused) updateMET();
    }, 1000);
    
    // Add Firebase values to history every 2 seconds for graph
    simulationInterval = setInterval(() => {
        if (!isPaused) {
            addToHistory(); // Add current Firebase values to graph
            saveState();
        }
    }, CONFIG.updateInterval);
    
    console.log('📊 Displaying Firebase values with live graph updates');
}

function toggleSimulation() {
    isPaused = !isPaused;
    els.simToggleBtn.textContent = isPaused ? '▶' : '⏸';
    els.simToggleBtn.title = isPaused ? 'Resume Simulation' : 'Pause Simulation';
}

function resetSimulation() {
    // Reset data to Firebase values (not simulated values)
    if (database) {
        database.ref('test').once('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                state.data = {
                    temperature: Number(data.temperature) || 26.0,
                    humidity: Number(data.humidity) || 66.0,
                    voltage: Number(data.voltage) || 1.49
                };
            } else {
                // Fallback to Firebase default values
                state.data = {
                    temperature: 26.0,
                    humidity: 66.0,
                    voltage: 1.49
                };
            }
            state.history = {
                labels: [],
                temperature: [],
                humidity: [],
                voltage: []
            };
            state.faultLogHistory = []; // Clear log on reset
            state.missionStartTime = new Date();
            
            updateUI();
            updateFaultLogUI(); // Clear UI log
            saveState();
        });
    } else {
        // Fallback if Firebase not available
        state.data = {
            temperature: 26.0,
            humidity: 66.0,
            voltage: 1.49
        };
        state.history = {
            labels: [],
            temperature: [],
            humidity: [],
            voltage: []
        };
        state.faultLogHistory = []; // Clear log on reset
        state.missionStartTime = new Date();
        
        updateUI();
        updateFaultLogUI(); // Clear UI log
        saveState();
    }
}

// --- MET Update ---
function updateMET() {
    if (!state.missionStartTime) return;
    
    const now = new Date();
    const diff = now - state.missionStartTime;
    
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    els.missionTime.textContent = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// --- Data Simulation ---
function simulateData() {
    // DISABLED - Using Firebase values only
    console.log('⚠️ Simulation disabled - displaying Firebase data only');
    return;
    
    // Simulate realistic drift and noise
    
    // Temperature: Random walk
    const tempDrift = (Math.random() - 0.5) * 1.5;
    state.data.temperature = clamp(state.data.temperature + tempDrift, -40, 90);

    // Humidity: Smoother drift (improved stability)
    // Previously too erratic. Now drifts slowly like temperature.
    const humDrift = (Math.random() - 0.5) * 0.5;
    state.data.humidity += humDrift;
    state.data.humidity = clamp(state.data.humidity, 0, 40);

    // Voltage: Stable with occasional dips
    if (Math.random() > 0.98) {
        state.data.voltage = 11.0 + Math.random(); // Dip
    } else {
        // Return to nominal 12V
        state.data.voltage = state.data.voltage * 0.9 + 12.0 * 0.1;
    }
    state.data.voltage = clamp(state.data.voltage, 0, 14);

    // Update History
    const now = new Date();
    const timeLabel = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    state.history.labels.push(timeLabel);
    state.history.temperature.push(state.data.temperature);
    state.history.humidity.push(state.data.humidity);
    state.history.voltage.push(state.data.voltage);

    // Maintain fixed history size
    if (state.history.labels.length > CONFIG.maxHistory) {
        state.history.labels.shift();
        state.history.temperature.shift();
        state.history.humidity.shift();
        state.history.voltage.shift();
    }

    updateUI();
}

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

// --- UI Updates ---
function updateUI() {
    // Update Numeric Values
    els.values.temperature.textContent = state.data.temperature.toFixed(1);
    els.values.humidity.textContent = state.data.humidity.toFixed(1);
    els.values.voltage.textContent = state.data.voltage.toFixed(2);

    // Analyze Health & Faults
    analyzeHealth();

    // Update Chart
    updateChart();
}

function analyzeHealth() {
    let healthScore = 100;
    let faults = [];
    let statusColors = {
        temperature: 'var(--success-color)',
        humidity: 'var(--success-color)',
        voltage: 'var(--success-color)'
    };

    // Voltage Rules
    if (state.data.voltage < CONFIG.thresholds.voltage.criticalLow) {
        healthScore -= 50;
        faults.push("CRITICAL: Power Loss");
        statusColors.voltage = 'critical';
    } else if (state.data.voltage < CONFIG.thresholds.voltage.warningLow) {
        healthScore -= 20;
        faults.push("WARNING: Low Voltage");
        statusColors.voltage = 'warning';
    } else {
        statusColors.voltage = 'normal';
    }

    // Temperature Rules (Refined)
    if (state.data.temperature > CONFIG.thresholds.temperature.criticalHigh) {
        healthScore -= 40;
        faults.push("CRITICAL: Overheating");
        statusColors.temperature = 'critical';
    } else if (state.data.temperature > CONFIG.thresholds.temperature.warningHigh) {
        healthScore -= 15;
        faults.push("WARNING: High Temp");
        statusColors.temperature = 'warning';
    } else {
        statusColors.temperature = 'normal';
    }

    // Humidity Rules (Refined)
    if (state.data.humidity > CONFIG.thresholds.humidity.criticalHigh) {
        healthScore -= 20;
        faults.push("CRITICAL: Moisture Detected");
        statusColors.humidity = 'critical';
    } else if (state.data.humidity > CONFIG.thresholds.humidity.warningHigh) {
        healthScore -= 10;
        faults.push("WARNING: High Humidity");
        statusColors.humidity = 'warning';
    } else {
        statusColors.humidity = 'normal';
    }

    state.health = Math.max(0, healthScore);
    state.faults = faults;

    // Update Status Indicators using Classes
    updateStatusDot(els.statuses.temperature, statusColors.temperature);
    updateStatusDot(els.statuses.humidity, statusColors.humidity);
    updateStatusDot(els.statuses.voltage, statusColors.voltage);

    // Update Health Ring
    updateHealthRing(state.health);
    updateFaultLog(faults);
    updateHealthPieChart(state.health);
    
    // Check for fault clearance
    checkFaultClearance(faults);
}

let previousFaults = [];

function checkFaultClearance(currentFaults) {
    // If we had faults before, but now we have fewer or none
    if (previousFaults.length > 0 && currentFaults.length === 0) {
        logFault("System Recovered: All faults cleared.", "success");
    }
    previousFaults = currentFaults;
}

function updateStatusDot(element, status) {
    // Reset classes
    element.classList.remove('warning', 'critical');
    
    // Remove inline styles that might interfere (from previous version)
    element.style.backgroundColor = '';
    element.style.boxShadow = '';

    if (status === 'critical') {
        element.classList.add('critical');
    } else if (status === 'warning') {
        element.classList.add('warning');
    }
    // 'normal' relies on default CSS
}

// --- Health Ring & Fault Log ---
function updateHealthRing(percent) {
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    
    els.healthRing.style.strokeDashoffset = offset;
    els.healthPercentage.textContent = Math.round(percent);

    let color = '#00ff88'; // Green
    let text = 'System Nominal';
    
    if (percent < 40) {
        color = '#ff4d4d'; // Red
        text = 'CRITICAL FAULT';
    } else if (percent < 80) {
        color = '#ffcc00'; // Yellow
        text = 'System Warning';
    }

    els.healthRing.style.stroke = color;
    els.healthText.textContent = text;
    els.healthText.style.color = color;
}

function updateFaultLog(faults) {
    // This function is now just for real-time detection logging
    // We'll integrate it with the persistent log
    
    faults.forEach(fault => {
        // Avoid duplicate spamming of the same fault in the log
        const lastLog = state.faultLogHistory[0];
        if (!lastLog || lastLog.message !== fault) {
             // Add context data to the log message
            const context = ` | T:${state.data.temperature.toFixed(1)}°C V:${state.data.voltage.toFixed(2)}V H:${state.data.humidity.toFixed(1)}%`;
            logFault(fault + context, fault.includes("CRITICAL") ? 'critical' : 'warning');
        }
    });
}

function updateFaultLogUI() {
    els.faultLog.innerHTML = '';
    
    if (state.faultLogHistory.length === 0) {
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.textContent = "System Nominal - No Events";
        div.style.color = 'var(--text-muted)';
        els.faultLog.appendChild(div);
        return;
    }

    state.faultLogHistory.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'log-entry';
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'log-timestamp';
        timeSpan.textContent = entry.timestamp;
        
        const msgSpan = document.createElement('span');
        msgSpan.textContent = entry.message;
        
        if (entry.type === 'critical') msgSpan.style.color = 'var(--danger-color)';
        else if (entry.type === 'warning') msgSpan.style.color = 'var(--warning-color)';
        else if (entry.type === 'success') msgSpan.style.color = 'var(--success-color)';
        
        div.appendChild(timeSpan);
        div.appendChild(msgSpan);
        els.faultLog.appendChild(div);
    });
}

// --- Health Pie Chart ---
function initHealthPieChart() {
    const ctx = document.getElementById('healthPieChart').getContext('2d');
    
    healthPieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Healthy', 'Warning', 'Critical'],
            datasets: [{
                data: [100, 0, 0],
                backgroundColor: [
                    '#00ff88', // Green
                    '#ffcc00', // Yellow
                    '#ff4d4d'  // Red
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#fff',
                        font: { size: 10 },
                        boxWidth: 10
                    }
                },
                tooltip: { enabled: false }
            }
        }
    });
}

function updateHealthPieChart(healthScore) {
    if (!healthPieChart) return;

    // Calculate distribution based on health score
    // This is a visual representation logic
    let healthy = 0;
    let warning = 0;
    let critical = 0;

    if (healthScore >= 80) {
        healthy = healthScore;
        warning = 100 - healthScore;
    } else if (healthScore >= 40) {
        healthy = 40;
        warning = healthScore - 40;
        critical = 100 - healthScore;
    } else {
        healthy = 0;
        warning = healthScore;
        critical = 100 - healthScore;
    }

    // Update data
    healthPieChart.data.datasets[0].data = [healthy, warning, critical];
    healthPieChart.update();
}

// --- Chart.js Integration ---
function initChart() {
    const ctx = document.getElementById('telemetryChart').getContext('2d');
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Metric',
                data: [],
                borderColor: '#00d4ff',
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(11, 13, 23, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#00d4ff',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#a0a0a0', maxTicksLimit: 6 }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#a0a0a0' }
                }
            },
            animation: false // Disable animation for performance
        }
    });
}

function updateChart() {
    if (!chartInstance) return;

    // Update Labels
    chartInstance.data.labels = state.history.labels;
    
    // Update Data based on selection
    let dataset = chartInstance.data.datasets[0];
    let data = [];
    let label = '';
    let color = '';

    switch (state.selectedMetric) {
        case 'temperature':
            data = state.history.temperature;
            label = 'Temperature (°C)';
            color = '#00d4ff';
            break;
        case 'humidity':
            data = state.history.humidity;
            label = 'Humidity (%)';
            color = '#00ff88';
            break;
        case 'voltage':
            data = state.history.voltage;
            label = 'Voltage (V)';
            color = '#ffcc00';
            break;
    }

    dataset.data = data;
    dataset.label = label;
    dataset.borderColor = color;
    
    // Dynamic Gradient
    const ctx = chartInstance.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, hexToRgba(color, 0.4));
    gradient.addColorStop(1, hexToRgba(color, 0));
    dataset.backgroundColor = gradient;

    chartInstance.update();
}

// --- Interaction ---
window.selectTelemetry = function(metric) {
    state.selectedMetric = metric;
    
    // Update active card styling
    Object.values(els.cards).forEach(card => card.classList.remove('active'));
    if(els.cards[metric]) els.cards[metric].classList.add('active');

    // Update Graph Title
    els.graphTitle.textContent = `${metric.charAt(0).toUpperCase() + metric.slice(1)} History`;

    updateChart();
}

window.setGraphMode = function(mode) {
    // Visual toggle only for now
    const buttons = document.querySelectorAll('.graph-controls .btn-mini');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

// Helper
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- Fault Injection ---
window.injectFault = function(type) {
    const now = new Date();
    let message = "";
    
    switch(type) {
        case 'solar-flare':
            // Massive temperature spike + voltage fluctuation
            state.data.temperature = 120 + (Math.random() * 20);
            state.data.voltage = 14 + (Math.random() * 2);
            message = "MANUAL INJECTION: Solar Flare Event";
            break;
        case 'power-drain':
            // Voltage drop
            state.data.voltage = 9.5 + (Math.random() * 1);
            message = "MANUAL INJECTION: Power Drain";
            break;
        case 'sensor-fault':
            // Random null/extreme values
            state.data.humidity = -50; // Impossible value
            state.data.temperature = 500; // Sensor error
            message = "MANUAL INJECTION: Sensor Malfunction";
            break;
    }
    
    logFault(message, 'critical');
    updateUI(); // Immediate update to show effect
}

window.downloadReport = function() {
    const report = {
        missionTime: els.missionTime.textContent,
        health: state.health,
        currentData: state.data,
        activeFaults: state.faults,
        logHistory: state.faultLogHistory
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "satellite_report_" + new Date().toISOString() + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

window.clearLog = function() {
    state.faultLogHistory = [];
    els.faultLog.innerHTML = '';
    saveState();
}

window.exportCSV = function() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Timestamp,Message,Type\n";
    
    state.faultLogHistory.forEach(entry => {
        csvContent += `${entry.timestamp},${entry.message},${entry.type}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "fault_log.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function logFault(message, type = 'info') {
    const now = new Date();
    const timestamp = now.toLocaleTimeString();
    
    // Add to history
    const faultEntry = { timestamp, message, type };
    state.faultLogHistory.unshift(faultEntry);
    
    // Limit history
    if (state.faultLogHistory.length > 50) state.faultLogHistory.pop();
    
    // Save to Firebase
    saveFaultToFirebase(faultEntry);
    
    updateFaultLogUI();
}

// Manual Firebase Test Function
window.testFirebaseManually = function() {
    console.log('🔬 Manual Firebase Test Started...');
    updateFirebaseDebug('TEST', { 
        temperature: 99.99, 
        humidity: 88.88, 
        voltage: 77.77, 
        health: 66 
    });
    
    if (!database) {
        alert('❌ Firebase not initialized!');
        console.error('Database object is null');
        return;
    }
    
    const testData = {
        timestamp: new Date().toISOString(),
        temperature: 99.99,
        humidity: 88.88,
        voltage: 77.77,
        health: 66,
        missionTime: 'TEST',
        testNote: 'This is a manual test entry'
    };
    
    const testKey = 'manual_test_' + Date.now();
    console.log('📤 Writing to Firebase with key:', testKey);
    console.log('📦 Data:', testData);
    
    database.ref('telemetry/' + testKey).set(testData)
        .then(() => {
            console.log('✅ Manual test write SUCCESS!');
            alert('✅ Data written successfully! Check Firebase Console.');
            
            // Read it back immediately
            return database.ref('telemetry/' + testKey).once('value');
        })
        .then((snapshot) => {
            console.log('✅ Manual test read SUCCESS!');
            console.log('📥 Read back data:', snapshot.val());
            updateFirebaseDebug('READ SUCCESS', snapshot.val());
        })
        .catch((error) => {
            console.error('❌ Manual test FAILED:', error);
            alert('❌ Firebase error: ' + error.message);
            updateFirebaseDebug('ERROR', error.message);
        });
};

// Check what's actually in Firebase right now
window.checkFirebaseData = function() {
    console.log('🔍 Checking Firebase Database...');
    
    if (!database) {
        alert('❌ Firebase not initialized!');
        return;
    }
    
    // Check all nodes
    const liveEl = document.getElementById('firebase-live-data');
    if (liveEl) {
        liveEl.innerHTML = '<div style="color: #ffaa00;">🔍 Scanning Firebase database...</div>';
    }
    
    // Check /telemetry node
    database.ref('telemetry').limitToLast(5).once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            console.log('📊 /telemetry node:', data);
            
            if (data) {
                console.log('✅ Found', Object.keys(data).length, 'entries in /telemetry');
                console.table(data);
                
                if (liveEl) {
                    let html = '<div style="color: #00ff88;"><strong>✅ /telemetry node (Last 5):</strong></div>';
                    Object.entries(data).forEach(([key, value]) => {
                        html += `<div style="padding: 4px; border-left: 3px solid #00ff88; margin: 4px 0; background: rgba(0,255,100,0.05);">
                            <strong>${key}</strong><br>
                            Temp: ${value.temperature}°C | Hum: ${value.humidity}% | Volt: ${value.voltage}V<br>
                            Health: ${value.health}% | Time: ${value.missionTime}
                        </div>`;
                    });
                    liveEl.innerHTML = html;
                }
                
                alert(`✅ Found ${Object.keys(data).length} entries in /telemetry!\nCheck console for details.`);
            } else {
                console.warn('⚠️ /telemetry node is EMPTY!');
                if (liveEl) {
                    liveEl.innerHTML = '<div style="color: #ff4d4d;">⚠️ No data in /telemetry node!</div>';
                }
                alert('⚠️ No data found in /telemetry node!\nIs the simulation running?');
            }
        })
        .catch((error) => {
            console.error('❌ Error reading /telemetry:', error);
            alert('❌ Error: ' + error.message);
        });
    
    // Also check /test node
    database.ref('test').once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            if (data) {
                console.log('📊 /test node:', data);
            }
        })
        .catch((error) => {
            console.error('❌ Error reading /test:', error);
        });
};

// Sync current display values from Firebase /test node
window.syncFromFirebase = function() {
    console.log('🔄 Syncing from Firebase...');
    
    if (!database) {
        alert('❌ Firebase not initialized!');
        return;
    }
    
    database.ref('test').once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            if (data) {
                console.log('✅ Synced data from Firebase:', data);
                
                // Update state with Firebase values
                if (data.temperature !== undefined) {
                    state.data.temperature = Number(data.temperature);
                }
                if (data.humidity !== undefined) {
                    state.data.humidity = Number(data.humidity);
                }
                if (data.voltage !== undefined) {
                    state.data.voltage = Number(data.voltage);
                }
                
                // Update UI
                updateUI();
                
                alert(`✅ Synced from Firebase!\n\nTemperature: ${data.temperature}°C\nHumidity: ${data.humidity}%\nVoltage: ${data.voltage}V`);
            } else {
                alert('⚠️ No data in /test node!');
            }
        })
        .catch((error) => {
            console.error('❌ Error syncing from Firebase:', error);
            alert('❌ Error: ' + error.message);
        });
};

// Push current simulated values to Firebase /test node
window.pushToFirebase = function() {
    console.log('📤 Pushing current values to Firebase...');
    
    if (!database) {
        alert('❌ Firebase not initialized!');
        return;
    }
    
    const currentData = {
        temperature: state.data.temperature,
        humidity: state.data.humidity,
        voltage: state.data.voltage,
        current: 0.01,
        temperature_status: state.data.temperature > 60 ? "HIGH" : state.data.temperature < 0 ? "LOW" : "NORMAL",
        voltage_status: state.data.voltage < 3.5 ? "LOW" : "NORMAL",
        current_status: "NORMAL",
        timestamp: new Date().toISOString()
    };
    
    database.ref('test').set(currentData)
        .then(() => {
            console.log('✅ Pushed to Firebase:', currentData);
            alert(`✅ Data pushed to Firebase!\n\nTemperature: ${currentData.temperature.toFixed(2)}°C\nHumidity: ${currentData.humidity.toFixed(2)}%\nVoltage: ${currentData.voltage.toFixed(2)}V`);
            updateFirebaseDebug('PUSHED', currentData);
        })
        .catch((error) => {
            console.error('❌ Error pushing to Firebase:', error);
            alert('❌ Error: ' + error.message);
        });
};

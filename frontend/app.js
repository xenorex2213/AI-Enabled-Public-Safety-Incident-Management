

const INCIDENT_API = "http://localhost:8081/api";
const ANALYSIS_API = "http://localhost:8082/api";


let allIncidents = [];

document.addEventListener("DOMContentLoaded", () => {
    initDateTime();
    checkServicesHealth();
    loadIncidents();
    loadHistoricalStats();

   
    document.getElementById("incidentForm").addEventListener("submit", handleIncidentSubmit);
    document.getElementById("btnRefreshAll").addEventListener("click", () => {
        checkServicesHealth();
        loadIncidents();
        loadHistoricalStats();
    });

  
    document.getElementById("searchLocation").addEventListener("input", debounce(filterIncidents, 250));
    document.getElementById("filterType").addEventListener("change", filterIncidents);
    document.getElementById("filterPriority").addEventListener("change", filterIncidents);
    document.getElementById("btnResetFilters").addEventListener("click", resetFilters);

  
    document.getElementById("btnModalClose").addEventListener("click", () => {
        document.getElementById("detailModal").classList.remove("active");
    });
    document.getElementById("btnPersonnelModalClose").addEventListener("click", () => {
        document.getElementById("personnelModal").classList.remove("active");
    });
    document.getElementById("btnViewPersonnel").addEventListener("click", openPersonnelModal);

    
    window.addEventListener("click", (e) => {
        if (e.target.classList.contains("modal")) {
            e.target.classList.remove("active");
        }
    });
});


function initDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const formatted = `${year}-${month}-${day}T${hours}:${minutes}`;
    document.getElementById("dateTime").value = formatted;
}


async function checkServicesHealth() {
    const incDot = document.getElementById("statusIncidentDot");
    const anaDot = document.getElementById("statusAnalysisDot");


    try {
        const res = await fetch(`${INCIDENT_API}/health`, { method: "GET" });
        if (res.ok) {
            incDot.className = "status-dot active";
            incDot.title = "Incident Service is running on port 8081";
        } else {
            incDot.className = "status-dot error";
        }
    } catch {
        incDot.className = "status-dot error";
        incDot.title = "Unable to reach Incident Service (port 8081)";
    }

    
    try {
        const res = await fetch(`${ANALYSIS_API}/health`, { method: "GET" });
        if (res.ok) {
            anaDot.className = "status-dot active";
            anaDot.title = "Analysis Service is running on port 8082";
        } else {
            anaDot.className = "status-dot error";
        }
    } catch {
        anaDot.className = "status-dot error";
        anaDot.title = "Unable to reach Analysis Service (port 8082)";
    }
}


async function handleIncidentSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById("btnSubmitIncident");
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = "Evaluating &amp; Persisting...";

    const payload = {
        incidentType: document.getElementById("incidentType").value,
        location: document.getElementById("location").value,
        dateTime: document.getElementById("dateTime").value,
        reportedSeverity: document.getElementById("reportedSeverity").value,
        injuryReported: document.getElementById("injuryReported").checked,
        trafficBlocked: document.getElementById("trafficBlocked").checked,
        description: document.getElementById("description").value,
        status: document.getElementById("status").value
    };

    try {
        const response = await fetch(`${INCIDENT_API}/incidents`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Failed to save incident: ${err}`);
        }

        const data = await response.json();

       
        renderAnalysisCard(data.analysis || {
            incidentClassification: data.incident.incidentClassification,
            recommendedPriority: data.incident.recommendedPriority,
            priorityScore: data.incident.priorityScore,
            recommendedAction: data.incident.recommendedAction,
            factors: data.incident.analysisFactors ? data.incident.analysisFactors.split(" | ") : []
        });

        
        document.getElementById("incidentForm").reset();
        initDateTime();

        
        await loadIncidents();
        await loadHistoricalStats();

    } catch (err) {
        alert("Error submitting incident: " + err.message + "\nEnsure both Spring Boot microservices are running on ports 8081 and 8082.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}


function renderAnalysisCard(analysis) {
    document.getElementById("analysisEmptyState").style.display = "none";
    const resContent = document.getElementById("analysisResultContent");
    resContent.style.display = "block";

    const banner = document.getElementById("priorityBanner");
    const priority = analysis.recommendedPriority || "P3 - MEDIUM";

    banner.className = "priority-banner";
    if (priority.includes("P1")) banner.classList.add("banner-p1");
    else if (priority.includes("P2")) banner.classList.add("banner-p2");
    else if (priority.includes("P3")) banner.classList.add("banner-p3");
    else if (priority.includes("P4")) banner.classList.add("banner-p4");

    document.getElementById("resPriority").textContent = priority;
    document.getElementById("resClassification").textContent = analysis.incidentClassification || "Evaluated Public Safety Incident";
    document.getElementById("resScore").textContent = analysis.priorityScore ?? "--";
    document.getElementById("resAction").textContent = analysis.recommendedAction || "Follow standard department operating procedures.";

  
    const factorsList = document.getElementById("resFactorsList");
    factorsList.innerHTML = "";
    if (analysis.factors && analysis.factors.length > 0) {
        analysis.factors.forEach(f => {
            const li = document.createElement("li");
            li.textContent = f;
            factorsList.appendChild(li);
        });
    } else {
        const li = document.createElement("li");
        li.textContent = "Standard evaluation criteria applied.";
        factorsList.appendChild(li);
    }

  
    const personnelArea = document.getElementById("resPersonnelTags");
    personnelArea.innerHTML = "";
    if (analysis.recommendedPersonnel && analysis.recommendedPersonnel.length > 0) {
        analysis.recommendedPersonnel.forEach(p => {
            const span = document.createElement("span");
            span.className = "personnel-tag";
            span.textContent = `${p.name} (${p.role} - ${p.department})`;
            personnelArea.appendChild(span);
        });
    } else {
        const span = document.createElement("span");
        span.className = "text-muted";
        span.textContent = "Standard patrol dispatch queue.";
        personnelArea.appendChild(span);
    }

    document.getElementById("analysisCard").scrollIntoView({ behavior: "smooth", block: "nearest" });
}


async function loadIncidents() {
    try {
        const res = await fetch(`${INCIDENT_API}/incidents`);
        if (!res.ok) throw new Error("Status " + res.status);
        allIncidents = await res.json();
        filterIncidents();
    } catch (err) {
        document.getElementById("incidentTableBody").innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-4 text-danger">
                    Unable to load incidents from http://localhost:8081/api/incidents.<br>
                    Make sure the Incident Service is started.
                </td>
            </tr>
        `;
    }
}


function filterIncidents() {
    const locQuery = document.getElementById("searchLocation").value.trim().toLowerCase();
    const typeQuery = document.getElementById("filterType").value.trim().toLowerCase();
    const prioQuery = document.getElementById("filterPriority").value.trim().toUpperCase();

    const filtered = allIncidents.filter(inc => {
        const matchLoc = !locQuery || (inc.location && inc.location.toLowerCase().includes(locQuery));
        const matchType = !typeQuery || (inc.incidentType && inc.incidentType.toLowerCase() === typeQuery);
        const matchPrio = !prioQuery || (inc.recommendedPriority && inc.recommendedPriority.toUpperCase().includes(prioQuery));
        return matchLoc && matchType && matchPrio;
    });

    renderTable(filtered);
}


function resetFilters() {
    document.getElementById("searchLocation").value = "";
    document.getElementById("filterType").value = "";
    document.getElementById("filterPriority").value = "";
    filterIncidents();
}


function renderTable(incidents) {
    const tbody = document.getElementById("incidentTableBody");
    const countBadge = document.getElementById("tableCountBadge");
    countBadge.textContent = `Showing ${incidents.length} of ${allIncidents.length} incidents`;

    if (incidents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">No incidents match the selected criteria.</td></tr>`;
        return;
    }

    tbody.innerHTML = incidents.map(inc => {
        const prio = inc.recommendedPriority || "P3 - MEDIUM";
        let prioClass = "badge-p3";
        if (prio.includes("P1")) prioClass = "badge-p1";
        else if (prio.includes("P2")) prioClass = "badge-p2";
        else if (prio.includes("P4")) prioClass = "badge-p4";

        const sourceBadge = inc.simulated 
            ? `<span class="badge badge-simulated" title="Seeded simulated record for demonstration">Simulated</span>` 
            : `<span class="badge badge-live" title="User-registered live incident">Live</span>`;

        return `
            <tr>
                <td><strong>#${inc.id}</strong></td>
                <td>${formatDateTime(inc.dateTime)}</td>
                <td><strong>${escapeHtml(inc.incidentType)}</strong></td>
                <td>${escapeHtml(inc.location)}</td>
                <td><span class="badge">${escapeHtml(inc.reportedSeverity)}</span></td>
                <td><span class="badge ${prioClass}">${escapeHtml(prio)}</span></td>
                <td><strong>${inc.priorityScore ?? '--'}</strong></td>
                <td><span class="status-pill">${escapeHtml(inc.status)}</span></td>
                <td>${sourceBadge}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="viewIncidentDetail(${inc.id})">Details</button>
                </td>
            </tr>
        `;
    }).join("");
}


async function loadHistoricalStats() {
    try {
        const res = await fetch(`${INCIDENT_API}/incidents/stats`);
        if (!res.ok) throw new Error("Status " + res.status);
        const stats = await res.json();

        
        document.getElementById("kpiTotal").textContent = stats.totalIncidents;
        document.getElementById("kpiDataBreakdown").textContent = `${stats.userReportedIncidents} live, ${stats.simulatedIncidents} simulated`;
        
        const p1Count = stats.incidentsByPriority["P1 - CRITICAL"] || 0;
        document.getElementById("kpiP1").textContent = p1Count;
        document.getElementById("kpiInjuries").textContent = stats.totalInjuries;
        document.getElementById("kpiTraffic").textContent = stats.totalTrafficBlocked;

        document.getElementById("statsSourceBadge").textContent = "Data Source: " + stats.dataSourceDescription;

       
        renderBarChart("chartCategory", stats.incidentsByCategory, stats.totalIncidents);

       
        renderBarChart("chartPriority", stats.incidentsByPriority, stats.totalIncidents, true);

        
        renderHotspots(stats.frequentlyReportedLocations);

       
        renderBarChart("chartTime", stats.timeBasedTrends, stats.totalIncidents);

    } catch (err) {
        console.error("Failed to load statistics:", err);
    }
}


function renderBarChart(containerId, dataMap, total, isPriority = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!dataMap || Object.keys(dataMap).length === 0 || total === 0) {
        container.innerHTML = `<p class="text-muted text-center py-2">No data available</p>`;
        return;
    }

    const rows = Object.entries(dataMap).map(([label, count]) => {
        const pct = Math.round((count / total) * 100);
        let fillClass = "";
        if (isPriority) {
            if (label.includes("P1")) fillClass = "fill-p1";
            else if (label.includes("P2")) fillClass = "fill-p2";
            else if (label.includes("P3")) fillClass = "fill-p3";
            else if (label.includes("P4")) fillClass = "fill-p4";
        }

        return `
            <div class="chart-bar-row">
                <div class="bar-label-area">
                    <span>${escapeHtml(label)}</span>
                    <span><strong>${count}</strong> (${pct}%)</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill ${fillClass}" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    }).join("");

    container.innerHTML = rows;
}


function renderHotspots(hotspots) {
    const container = document.getElementById("hotspotsList");
    if (!container) return;

    if (!hotspots || hotspots.length === 0) {
        container.innerHTML = `<p class="text-muted text-center py-2">No hotspot data</p>`;
        return;
    }

    container.innerHTML = hotspots.map(h => `
        <div class="hotspot-item">
            <span>${escapeHtml(h.location)}</span>
            <span class="hotspot-count">${h.count} incidents</span>
        </div>
    `).join("");
}


window.viewIncidentDetail = function(id) {
    const inc = allIncidents.find(i => i.id === id);
    if (!inc) return;

    document.getElementById("modalTitle").textContent = `Incident Record #${inc.id} - ${inc.incidentType}`;
    const modalBody = document.getElementById("modalBody");

    const factors = inc.analysisFactors ? inc.analysisFactors.split(" | ") : ["Standard evaluation rules applied."];

    modalBody.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <div class="detail-label">Location</div>
                <div class="detail-val">${escapeHtml(inc.location)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Date &amp; Time</div>
                <div class="detail-val">${formatDateTime(inc.dateTime)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Reported Severity</div>
                <div class="detail-val">${escapeHtml(inc.reportedSeverity)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Recommended Priority</div>
                <div class="detail-val"><strong>${escapeHtml(inc.recommendedPriority || 'P3 - MEDIUM')} (Score: ${inc.priorityScore ?? '--'})</strong></div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Injury Reported?</div>
                <div class="detail-val">${inc.injuryReported ? 'YES (+25 pts)' : 'NO'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Traffic Blocked?</div>
                <div class="detail-val">${inc.trafficBlocked ? 'YES (+15 pts)' : 'NO'}</div>
            </div>
        </div>

        <div class="analysis-section">
            <h4>Description:</h4>
            <p class="action-box">${escapeHtml(inc.description || 'No description provided.')}</p>
        </div>

        <div class="analysis-section">
            <h4>Recommended Response Action:</h4>
            <p class="action-box">${escapeHtml(inc.recommendedAction || 'Dispatch nearest response unit.')}</p>
        </div>

        <div class="analysis-section">
            <h4>Evaluation Factors (Why this priority was assigned):</h4>
            <ul class="factors-list">
                ${factors.map(f => `<li>${escapeHtml(f)}</li>`).join("")}
            </ul>
        </div>

        <div class="analysis-section">
            <h4>Assigned / Recommended Personnel:</h4>
            <p class="personnel-tag">${escapeHtml(inc.assignedPersonnel || 'Standard municipal patrol queue')}</p>
        </div>
    `;

    document.getElementById("detailModal").classList.add("active");
};


async function openPersonnelModal() {
    const tbody = document.getElementById("personnelTableBody");
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3">Fetching roster from Analysis Service (Port 8082)...</td></tr>`;
    document.getElementById("personnelModal").classList.add("active");

    try {
        const res = await fetch(`${ANALYSIS_API}/personnel`);
        if (!res.ok) throw new Error("Status " + res.status);
        const list = await res.json();

        tbody.innerHTML = list.map(p => `
            <tr>
                <td><strong>${escapeHtml(p.id)}</strong></td>
                <td>${escapeHtml(p.name)}</td>
                <td>${escapeHtml(p.role)}</td>
                <td>${escapeHtml(p.department)}</td>
                <td><span class="badge ${p.status === 'AVAILABLE' ? 'badge-accent' : 'badge-info'}">${escapeHtml(p.status)}</span></td>
                <td>${escapeHtml(p.contactNumber)}</td>
            </tr>
        `).join("");
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3 text-danger">Unable to fetch personnel from Analysis Service.</td></tr>`;
    }
}


function formatDateTime(str) {
    if (!str) return "--";
    return str.replace("T", " ");
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

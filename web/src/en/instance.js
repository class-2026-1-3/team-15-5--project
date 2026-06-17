// API URL Config
const API_BASE_URL = 'http://localhost:6974';

// Extract user_id from token
function getUserId() {
    const token = sessionStorage.getItem('token');
    if (!token) return null;
    const parts = token.split('-');
    return parseInt(parts[parts.length - 1], 10);
}

document.addEventListener('DOMContentLoaded', () => {
    const userId = getUserId();
    if (!userId) {
        alert("Login is required.");
        window.location.href = "/index";
        return;
    }

    // Initial load
    loadInstances(userId);
    loadSpecs();

    // Bind form submit event
    const createForm = document.getElementById('createInstanceForm');
    createForm.addEventListener('submit', (e) => handleCreateInstance(e, userId));
});

// Fetch instances list
async function loadInstances(userId) {
    const instanceList = document.getElementById('instanceList');
    try {
        const response = await fetch(`${API_BASE_URL}/instances?user_id=${userId}`);
        const result = await response.json();

        if (response.ok && result.success) {
            renderInstances(result.instances);
            updateSummary(result.instances);
        } else {
            instanceList.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Failed to load instance list.</td></tr>`;
        }
    } catch (e) {
        console.error(e);
        instanceList.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Failed to connect to the server.</td></tr>`;
    }
}

// Fetch server specs for select options
async function loadSpecs() {
    const specSelect = document.getElementById('serverSpecSelect');
    try {
        const response = await fetch(`${API_BASE_URL}/specs`);
        const result = await response.json();

        if (response.ok && result.success) {
            specSelect.innerHTML = '<option value="" disabled selected>Please select a spec</option>';
            result.specs.forEach(spec => {
                const option = document.createElement('option');
                option.value = spec.id;
                option.textContent = `${spec.name} (${spec.pr_name}, ${spec.pr_core} Cores, ${spec.ram_gb}GB RAM, ${spec.storage_gb}GB SSD) - $${spec.cost.toFixed(4)}/h`;
                specSelect.appendChild(option);
            });
        }
    } catch (e) {
        console.error("Failed to load specs:", e);
    }
}

// Render instances table
function renderInstances(instances) {
    const instanceList = document.getElementById('instanceList');
    if (instances.length === 0) {
        instanceList.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted"><i class="fa-solid fa-circle-info me-2 fs-4"></i>No instances found. Try creating a new one!</td></tr>`;
        return;
    }

    instanceList.innerHTML = '';
    instances.forEach(inst => {
        const tr = document.createElement('tr');

        // Status badge
        let statusBadge = '';
        if (inst.status === 1) {
            statusBadge = `<span class="badge bg-success"><i class="fa-solid fa-circle-play me-1"></i>Running</span>`;
        } else if (inst.status === 2) {
            statusBadge = `<span class="badge bg-warning text-dark"><i class="fa-solid fa-circle-pause me-1"></i>Stopped</span>`;
        } else {
            statusBadge = `<span class="badge bg-danger"><i class="fa-solid fa-circle-stop me-1"></i>Down</span>`;
        }

        // Control buttons
        let actionButtons = '';
        if (inst.status === 1) {
            // Running: can 'Stop(2)' or 'Terminate(3)'
            actionButtons = `
                <button class="btn btn-sm btn-action-control me-1" onclick="changeStatus(${inst.id}, 2, 'stop')">
                    <i class="fa-solid fa-stop me-1"></i> Stop
                </button>
                <button class="btn btn-sm btn-action-terminate" onclick="changeStatus(${inst.id}, 3, 'terminate')">
                    <i class="fa-solid fa-trash me-1"></i> Terminate
                </button>
            `;
        } else {
            // Down/Stopped: can 'Start(1)' or 'Terminate(3)'
            actionButtons = `
                <button class="btn btn-sm btn-action-control me-1 text-success" onclick="changeStatus(${inst.id}, 1, 'start')">
                    <i class="fa-solid fa-play me-1"></i> Start
                </button>
                <button class="btn btn-sm btn-action-terminate" onclick="changeStatus(${inst.id}, 3, 'terminate')">
                    <i class="fa-solid fa-trash me-1"></i> Terminate
                </button>
            `;
        }

        tr.innerHTML = `
            <td class="fw-bold">${escapeHtml(inst.instance_name)}</td>
            <td><code>${inst.ip_address}</code></td>
            <td>
                <div class="fw-semibold">${inst.server_name}</div>
                <small class="text-white-50">${inst.pr_name} / ${inst.ram_gb}GB RAM</small>
            </td>
            <td>$${inst.cost.toFixed(4)}</td>
            <td>${statusBadge}</td>
            <td class="text-white-50"><small>${inst.created_at}</small></td>
            <td class="text-end">${actionButtons}</td>
        `;
        instanceList.appendChild(tr);
    });
}

// Update widgets summary
function updateSummary(instances) {
    const runningCount = instances.filter(inst => inst.status === 1).length;
    const totalRam = instances.reduce((sum, inst) => sum + inst.ram_gb, 0);
    const totalCost = instances.reduce((sum, inst) => sum + inst.cost, 0);

    document.getElementById('runningCount').textContent = runningCount;
    document.getElementById('totalRam').textContent = `${totalRam} GB`;
    document.getElementById('totalCost').textContent = `$${totalCost.toFixed(4)}`;
}

// Create instance
async function handleCreateInstance(e, userId) {
    e.preventDefault();
    const nameInput = document.getElementById('instanceName');
    const specSelect = document.getElementById('serverSpecSelect');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const instanceName = nameInput.value.trim();
    const serverId = parseInt(specSelect.value, 10);

    if (!instanceName || !serverId) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Creating...';

    try {
        const response = await fetch(`${API_BASE_URL}/instances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                server_id: serverId,
                instance_name: instanceName
            })
        });

        const result = await response.json();
        if (response.ok && result.success) {
            // Hide modal
            const modalEl = document.getElementById('createInstanceModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();

            // Reset form
            createForm.reset();

            // Refresh list
            await loadInstances(userId);
        } else {
            alert("Failed to create instance: " + (result.detail || "Unknown error"));
        }
    } catch (err) {
        console.error(err);
        alert("A server communication error occurred.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create';
    }
}

// Change status
async function changeStatus(instanceId, nextStatus, actionName) {
    if (nextStatus === 3 && !confirm(`Are you sure you want to ${actionName} this instance? This action cannot be undone.`)) {
        return;
    }

    const userId = getUserId();
    try {
        const response = await fetch(`${API_BASE_URL}/instances/${instanceId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus })
        });

        const result = await response.json();
        if (response.ok && result.success) {
            await loadInstances(userId);
        } else {
            alert(`Failed to ${actionName} the instance.`);
        }
    } catch (e) {
        console.error(e);
        alert("A server communication error occurred.");
    }
}

// HTML Escape helper
function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

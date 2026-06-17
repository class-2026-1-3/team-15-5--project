const API_BASE_URL = 'http://localhost:6974';

function logout(event) {
    event.preventDefault();
    sessionStorage.removeItem('token');
    window.location.href = " /index";
}

document.addEventListener("DOMContentLoaded", () => {
    const username = sessionStorage.getItem('username');
    if (username) {
        document.querySelector('.username-display').textContent = username;
    }

    const specsGrid = document.getElementById('specsGrid');
    if (specsGrid) {
        loadAllSpecs(specsGrid);
    }
});

async function loadAllSpecs(container) {
    try {
        const response = await fetch(`${API_BASE_URL}/specs`);
        const result = await response.json();

        if (response.ok && result.success) {
            container.innerHTML = '';
            result.specs.forEach(spec => {
                let networkText = 'Basic Network';
                if (spec.name.includes('p3') || spec.name.includes('c193') || spec.name.includes('c323')) {
                    networkText = '10 Gbps High-Performance Network';
                } else if (spec.name.includes('medium') || spec.name.includes('large') || spec.name.includes('xlarge')) {
                    networkText = '5 Gbps Network';
                }

                const card = document.createElement('div');
                card.className = 'more-cards';
                card.innerHTML = `
                    <div class="icn-case">
                        <i class="fa-solid fa-server more-cards-icon"></i>
                    </div>
                    <div class="anothor-case" style="flex-grow: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                            <h2 class="introduce-cards-header" style="margin: 0;">${escapeHtml(spec.name)}</h2>
                            <span class="more-cards-price" style="font-weight: 700; font-size: 1.25rem; color: #034f84;">
                                $${spec.cost.toFixed(4)} <span style="font-size: 0.8rem; font-weight: 500; color: #64748b;">/ hour</span>
                            </span>
                        </div>
                        <hr class="line" style="margin: 8px 0; background-color: #cbd5e1; height: 1px; border: 0;">
                        <span class="introduce-cards-paragraph"><i class="fa-solid fa-cpu me-2 text-success"></i> ${spec.pr_core} vCPUs (${escapeHtml(spec.pr_name)})</span>
                        <span class="introduce-cards-paragraph"><i class="fa-solid fa-memory me-2 text-success"></i> ${spec.ram_gb} GB RAM</span>
                        <span class="introduce-cards-paragraph"><i class="fa-solid fa-hard-drive me-2 text-success"></i> ${spec.storage_gb} GB SSD</span>
                        <span class="introduce-cards-paragraph"><i class="fa-solid fa-network-wired me-2 text-success"></i> ${networkText}</span>
                        <span class="introduce-cards-paragraph" style="margin-top: 5px; color: #034f84; font-weight: 600; display: block;">All Ready. Let's Deploy!</span>
                    </div>
                `;
                container.appendChild(card);
            });
        } else {
            container.innerHTML = `<p class="text-danger text-center w-100 py-4">Failed to load the server spec list.</p>`;
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = `<p class="text-danger text-center w-100 py-4">Failed to connect to the server.</p>`;
    }
}

function escapeHtml(str) {
    if (!str) return '';
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
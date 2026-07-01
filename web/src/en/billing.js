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

    loadBillings(userId);
});

let billingData = []; // Store raw billing list

async function loadBillings(userId) {
    const billingList = document.getElementById('billingList');
    try {
        const response = await fetch(`${API_BASE_URL}/billings?user_id=${userId}`);
        const result = await response.json();

        if (response.ok && result.success) {
            billingData = result.billings;
            renderBillingSummary(billingData);
            renderBillingTable(billingData);
        } else {
            billingList.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to load billing history.</td></tr>`;
        }
    } catch (e) {
        console.error(e);
        billingList.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to connect to the server.</td></tr>`;
    }
}

function renderBillingSummary(billings) {
    if (billings.length === 0) return;

    // 1. Calculate PENDING & PAID amounts
    let pendingSum = 0;
    let paidSum = 0;
    
    billings.forEach(bill => {
        if (bill.status === 1) {
            pendingSum += bill.amount;
        } else if (bill.status === 2) {
            paidSum += bill.amount;
        }
    });

    document.getElementById('pendingAmount').textContent = `$${pendingSum.toFixed(2)}`;
    document.getElementById('paidAmount').textContent = `$${paidSum.toFixed(2)}`;

    // 2. Group by month to calculate total monthly amounts and find the latest month
    const monthlyGroups = {};
    billings.forEach(bill => {
        const monthStr = bill.start_at.substring(0, 7); // "YYYY-MM"
        if (!monthlyGroups[monthStr]) {
            monthlyGroups[monthStr] = {
                amount: 0,
                start: bill.start_at.substring(5, 10).replace('-', '/'),
                end: bill.end_at.substring(5, 10).replace('-', '/')
            };
        }
        monthlyGroups[monthStr].amount += bill.amount;
    });

    const months = Object.keys(monthlyGroups).sort().reverse(); // Sort descending
    if (months.length > 0) {
        const latestMonth = months[0];
        const group = monthlyGroups[latestMonth];
        document.getElementById('monthlyTotalValue').textContent = `$${group.amount.toFixed(2)}`;
        
        const formattedMonthName = new Date(latestMonth + "-02").toLocaleString('en-US', { month: 'long', year: 'numeric' });
        document.getElementById('monthlyPeriodValue').textContent = `Latest Month (${formattedMonthName}) Total Sum`;
    }
}

function renderBillingTable(billings) {
    const billingList = document.getElementById('billingList');
    if (billings.length === 0) {
        billingList.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted"><i class="fa-solid fa-receipt me-2 fs-4"></i>No billing records found.</td></tr>`;
        return;
    }

    billingList.innerHTML = '';
    billings.forEach(bill => {
        const tr = document.createElement('tr');

        // Period formatting: "MM/DD - MM/DD"
        const start = bill.start_at.substring(5, 10).replace('-', '/');
        const end = bill.end_at.substring(5, 10).replace('-', '/');
        const periodText = `${bill.start_at.substring(0, 4)}/${start} - ${end}`;

        // Status Badge
        let badgeHtml = '';
        if (bill.status === 1) {
            badgeHtml = `<span class="badge-status badge-pending"><i class="fa-solid fa-hourglass-half me-1"></i>Pending</span>`;
        } else if (bill.status === 2) {
            badgeHtml = `<span class="badge-status badge-paid"><i class="fa-solid fa-circle-check me-1"></i>Paid</span>`;
        } else {
            badgeHtml = `<span class="badge-status badge-fail"><i class="fa-solid fa-circle-xmark me-1"></i>Failed</span>`;
        }

        const payDate = bill.pay_at ? bill.pay_at.substring(0, 10) : '-';

        tr.innerHTML = `
            <td class="fw-semibold">${periodText}</td>
            <td><code class="text-info">${escapeHtml(bill.instance_name || 'Deleted Instance')}</code></td>
            <td class="fw-bold text-light">$${bill.amount.toFixed(2)}</td>
            <td>${badgeHtml}</td>
            <td><small class="text-muted">${payDate}</small></td>
            <td class="text-end">
                <button class="btn btn-view-invoice" onclick="showInvoiceDetails(${bill.id})">
                    <i class="fa-solid fa-file-invoice-dollar me-1"></i>View Invoice
                </button>
            </td>
        `;
        billingList.appendChild(tr);
    });
}

function showInvoiceDetails(billingId) {
    const bill = billingData.find(b => b.id === billingId);
    if (!bill) return;

    // Fill modal fields
    document.getElementById('modalInvoiceId').textContent = `#SRN-${bill.id.toString().padStart(5, '0')}`;
    document.getElementById('modalInstanceName').textContent = bill.instance_name || 'N/A';
    document.getElementById('modalInstanceId').textContent = bill.instance_id;
    document.getElementById('modalPeriod').textContent = `${bill.start_at} to ${bill.end_at}`;
    document.getElementById('modalPayTime').textContent = bill.pay_at ? bill.pay_at : 'Payment Outstanding';
    document.getElementById('modalTotalAmount').textContent = `$${bill.amount.toFixed(2)}`;

    // Status Badge inside modal
    const badgeEl = document.getElementById('modalStatusBadge');
    badgeEl.className = 'badge';
    if (bill.status === 1) {
        badgeEl.textContent = 'Pending';
        badgeEl.classList.add('bg-warning', 'text-dark');
    } else if (bill.status === 2) {
        badgeEl.textContent = 'Paid';
        badgeEl.classList.add('bg-success');
    } else {
        badgeEl.textContent = 'Failed';
        badgeEl.classList.add('bg-danger');
    }

    // Open Bootstrap Modal
    const modalEl = document.getElementById('billingDetailModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
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

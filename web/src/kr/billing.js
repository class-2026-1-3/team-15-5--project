// token에서 user_id 추출
function getUserId() {
    const token = sessionStorage.getItem('token');
    if (!token) return null;
    const parts = token.split('-');
    return parseInt(parts[parts.length - 1], 10);
}

document.addEventListener('DOMContentLoaded', () => {
    const userId = getUserId();
    if (!userId) {
        alert("로그인이 필요합니다.");
        window.location.href = "/index";
        return;
    }

    loadBillings(userId);
});

let billingData = []; // 빌링 데이터 백업용

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
            billingList.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">청구 내역을 불러오는 데 실패했습니다.</td></tr>`;
        }
    } catch (e) {
        console.error(e);
        billingList.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">서버와의 연결에 실패했습니다.</td></tr>`;
    }
}

function renderBillingSummary(billings) {
    if (billings.length === 0) return;

    // 1. 미결제 및 결제 완료 총합 계산
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

    // 2. 달별 총액 합산을 위해 월 단위로 그룹핑
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

    const months = Object.keys(monthlyGroups).sort().reverse(); // 최근 월이 앞으로 오도록 정렬
    if (months.length > 0) {
        const latestMonth = months[0];
        const group = monthlyGroups[latestMonth];
        document.getElementById('monthlyTotalValue').textContent = `$${group.amount.toFixed(2)}`;
        
        // "YYYY년 MM월" 형식으로 표기
        const parts = latestMonth.split('-');
        const formattedMonthName = `${parts[0]}년 ${parseInt(parts[1], 10)}월`;
        document.getElementById('monthlyPeriodValue').textContent = `최근 월 (${formattedMonthName}) 총 합산 요금`;
    }
}

function renderBillingTable(billings) {
    const billingList = document.getElementById('billingList');
    if (billings.length === 0) {
        billingList.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted"><i class="fa-solid fa-receipt me-2 fs-4"></i>청구 내역이 존재하지 않습니다.</td></tr>`;
        return;
    }

    billingList.innerHTML = '';
    billings.forEach(bill => {
        const tr = document.createElement('tr');

        // 이용 기간 포맷팅: "YYYY/MM/DD - MM/DD"
        const start = bill.start_at.substring(5, 10).replace('-', '/');
        const end = bill.end_at.substring(5, 10).replace('-', '/');
        const periodText = `${bill.start_at.substring(0, 4)}/${start} ~ ${end}`;

        // 상태 배지 생성
        let badgeHtml = '';
        if (bill.status === 1) {
            badgeHtml = `<span class="badge-status badge-pending"><i class="fa-solid fa-hourglass-half me-1"></i>결제 대기</span>`;
        } else if (bill.status === 2) {
            badgeHtml = `<span class="badge-status badge-paid"><i class="fa-solid fa-circle-check me-1"></i>결제 완료</span>`;
        } else {
            badgeHtml = `<span class="badge-status badge-fail"><i class="fa-solid fa-circle-xmark me-1"></i>결제 실패</span>`;
        }

        const payDate = bill.pay_at ? bill.pay_at.substring(0, 10) : '-';

        tr.innerHTML = `
            <td class="fw-semibold">${periodText}</td>
            <td><code class="text-info">${escapeHtml(bill.instance_name || '삭제된 인스턴스')}</code></td>
            <td class="fw-bold text-light">$${bill.amount.toFixed(2)}</td>
            <td>${badgeHtml}</td>
            <td><small class="text-muted">${payDate}</small></td>
            <td class="text-end">
                <button class="btn btn-view-invoice" onclick="showInvoiceDetails(${bill.id})">
                    <i class="fa-solid fa-file-invoice-dollar me-1"></i>세부 내역
                </button>
            </td>
        `;
        billingList.appendChild(tr);
    });
}

function showInvoiceDetails(billingId) {
    const bill = billingData.find(b => b.id === billingId);
    if (!bill) return;

    // 모달 데이터 채우기
    document.getElementById('modalInvoiceId').textContent = `#SRN-${bill.id.toString().padStart(5, '0')}`;
    document.getElementById('modalInstanceName').textContent = bill.instance_name || 'N/A';
    document.getElementById('modalInstanceId').textContent = bill.instance_id;
    document.getElementById('modalPeriod').textContent = `${bill.start_at} ~ ${bill.end_at}`;
    document.getElementById('modalPayTime').textContent = bill.pay_at ? bill.pay_at : '미결제 상태 (당월 합산 청구 예정)';
    document.getElementById('modalTotalAmount').textContent = `$${bill.amount.toFixed(2)}`;

    // 모달 내부 결제 상태 배지 세팅
    const badgeEl = document.getElementById('modalStatusBadge');
    badgeEl.className = 'badge';
    if (bill.status === 1) {
        badgeEl.textContent = '결제 대기';
        badgeEl.classList.add('bg-warning', 'text-dark');
    } else if (bill.status === 2) {
        badgeEl.textContent = '결제 완료';
        badgeEl.classList.add('bg-success');
    } else {
        badgeEl.textContent = '결제 실패';
        badgeEl.classList.add('bg-danger');
    }

    // 부트스트랩 모달 표시
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

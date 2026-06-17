// API URL 설정
const API_BASE_URL = 'http://localhost:6974';

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

    // 초기 데이터 로드
    loadInstances(userId);
    loadSpecs();

    // 폼 제출 이벤트 바인딩
    const createForm = document.getElementById('createInstanceForm');
    createForm.addEventListener('submit', (e) => handleCreateInstance(e, userId));
});

// 인스턴스 목록 조회
async function loadInstances(userId) {
    const instanceList = document.getElementById('instanceList');
    try {
        const response = await fetch(`${API_BASE_URL}/instances?user_id=${userId}`);
        const result = await response.json();

        if (response.ok && result.success) {
            renderInstances(result.instances);
            updateSummary(result.instances);
        } else {
            instanceList.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">인스턴스 목록을 불러오는 데 실패했습니다.</td></tr>`;
        }
    } catch (e) {
        console.error(e);
        instanceList.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">서버와의 연결에 실패했습니다.</td></tr>`;
    }
}

// 스펙 목록 조회 (모달 dropdown용)
async function loadSpecs() {
    const specSelect = document.getElementById('serverSpecSelect');
    try {
        const response = await fetch(`${API_BASE_URL}/specs`);
        const result = await response.json();

        if (response.ok && result.success) {
            specSelect.innerHTML = '<option value="" disabled selected>스펙을 선택해주세요</option>';
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

// 인스턴스 목록 렌더링
function renderInstances(instances) {
    const instanceList = document.getElementById('instanceList');
    if (instances.length === 0) {
        instanceList.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted"><i class="fa-solid fa-circle-info me-2 fs-4"></i>생성된 인스턴스가 없습니다. 새 인스턴스를 추가해보세요!</td></tr>`;
        return;
    }

    instanceList.innerHTML = '';
    instances.forEach(inst => {
        const tr = document.createElement('tr');

        // 상태 배지 생성
        let statusBadge = '';
        if (inst.status === 1) {
            statusBadge = `<span class="badge bg-success"><i class="fa-solid fa-circle-play me-1"></i>작동 중</span>`;
        } else if (inst.status === 2) {
            statusBadge = `<span class="badge bg-warning text-dark"><i class="fa-solid fa-circle-pause me-1"></i>중지됨</span>`;
        } else {
            statusBadge = `<span class="badge bg-danger"><i class="fa-solid fa-circle-stop me-1"></i>꺼짐</span>`;
        }

        // 제어 버튼들 생성
        let actionButtons = '';
        if (inst.status === 1) {
            // 작동 중일 때는 '중지(2)'와 '종료(3)'만 가능
            actionButtons = `
                <button class="btn btn-sm btn-action-control me-1" onclick="changeStatus(${inst.id}, 2, '중지')">
                    <i class="fa-solid fa-stop me-1"></i> 중지
                </button>
                <button class="btn btn-sm btn-action-terminate" onclick="changeStatus(${inst.id}, 3, '영구 종료')">
                    <i class="fa-solid fa-trash me-1"></i> 종료
                </button>
            `;
        } else {
            // 꺼짐/중지 상태일 때는 '시작(1)'과 '종료(3)' 가능
            actionButtons = `
                <button class="btn btn-sm btn-action-control me-1 text-success" onclick="changeStatus(${inst.id}, 1, '시작')">
                    <i class="fa-solid fa-play me-1"></i> 시작
                </button>
                <button class="btn btn-sm btn-action-terminate" onclick="changeStatus(${inst.id}, 3, '영구 종료')">
                    <i class="fa-solid fa-trash me-1"></i> 종료
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

// 요약 카드 정보 갱신
function updateSummary(instances) {
    const runningCount = instances.filter(inst => inst.status === 1).length;
    const totalRam = instances.reduce((sum, inst) => sum + inst.ram_gb, 0);
    const totalCost = instances.reduce((sum, inst) => sum + inst.cost, 0);

    document.getElementById('runningCount').textContent = runningCount;
    document.getElementById('totalRam').textContent = `${totalRam} GB`;
    document.getElementById('totalCost').textContent = `$${totalCost.toFixed(4)}`;
}

// 인스턴스 생성 처리
async function handleCreateInstance(e, userId) {
    e.preventDefault();
    const nameInput = document.getElementById('instanceName');
    const specSelect = document.getElementById('serverSpecSelect');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const instanceName = nameInput.value.trim();
    const serverId = parseInt(specSelect.value, 10);

    if (!instanceName || !serverId) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>생성 중...';

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
            // 모달 닫기
            const modalEl = document.getElementById('createInstanceModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();

            // 폼 초기화
            createForm.reset();

            // 목록 리프레시
            await loadInstances(userId);
        } else {
            alert("인스턴스 생성에 실패했습니다: " + (result.detail || "알 수 없는 오류"));
        }
    } catch (err) {
        console.error(err);
        alert("서버 통신 오류가 발생했습니다.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '생성하기';
    }
}

// 인스턴스 상태 변경 처리
async function changeStatus(instanceId, nextStatus, actionName) {
    if (nextStatus === 3 && !confirm(`정말로 이 인스턴스를 ${actionName}하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
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
            alert(`인스턴스 ${actionName}에 실패했습니다.`);
        }
    } catch (e) {
        console.error(e);
        alert("서버 통신 오류가 발생했습니다.");
    }
}

// HTML Escape 헬퍼 함수
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

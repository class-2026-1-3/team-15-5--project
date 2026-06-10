document.getElementById('username').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        document.getElementById('password').focus();
    }
})

// 입력창 값 변경 시 에러 경고 상태(!) 초기화
document.getElementById('username').addEventListener('input', (e) => {
    e.target.setCustomValidity("");
    e.target.nextElementSibling.textContent = "아이디를 입력해주세요.";
});

document.getElementById('password').addEventListener('input', (e) => {
    e.target.setCustomValidity("");
    e.target.nextElementSibling.textContent = "비밀번호를 입력해주세요.";
});

document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault(); // 폼 제출 시 브라우저가 새로고침되는 기본 동작을 막음

    const form = event.currentTarget;
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    // 새로운 제출 시 기존 커스텀 에러 상태(!) 초기화
    usernameInput.setCustomValidity("");
    passwordInput.setCustomValidity("");
    usernameInput.nextElementSibling.textContent = "아이디를 입력해주세요.";
    passwordInput.nextElementSibling.textContent = "비밀번호를 입력해주세요.";

    // Bootstrap 검증 클래스 추가 (색상 강조)
    form.classList.add('was-validated');

    // 입력 폼 유효성 검사 실패 시 중단
    if (!form.checkValidity()) {
        event.stopPropagation();
        return;
    }

    const usernameVal = document.getElementById('username').value;
    const passwordVal = document.getElementById('password').value;

    try {
        const response = await fetch('http://localhost:6974/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "username": usernameVal,
                "password": passwordVal
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // 로그인 성공 시 sessionStorage에 토큰 저장
            sessionStorage.setItem('token', 'dummy-token-' + result.user_id);
            sessionStorage.setItem('username', usernameVal);
            window.location.href = "/kr/main";
        } else {
            // 로그인 실패 시 input창을 경고 상태(!)로 변환
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');

            usernameInput.setCustomValidity("Invalid");
            passwordInput.setCustomValidity("Invalid");
            usernameInput.nextElementSibling.textContent = "아이디를 확인해주세요.";
            passwordInput.nextElementSibling.textContent = "비밀번호를 확인해주세요.";
        }

    } catch (e) {
        console.error("Error:", e);
        alert("error occurred.");
    }
});
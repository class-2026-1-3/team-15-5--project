function logout(event) {
    event.preventDefault();
    sessionStorage.removeItem('token');
    window.location.href = " /index";
} document.addEventListener("DOMContentLoaded", () => {
    const username = sessionStorage.getItem('username');
    if (username) {
        document.querySelector('.username-display').textContent = username;
    }
});